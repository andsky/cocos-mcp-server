/**
 * HTTP server exposing the MCP (Model Context Protocol) interface.
 *
 * Endpoints:
 *   POST /mcp            JSON-RPC 2.0 — standard MCP protocol
 *   GET  /health         Server health + version
 *   GET  /api/tools      Tool metadata (names, actions, categories)
 *   POST /api/<tool>     Direct tool invocation
 */

import * as http from 'http';
import { URL } from 'url';
import { ServerConfig, ServerStatus, ToolDefinition, VERSION } from './types';
import { getUnifiedTools, UNIFIED_TOOLS_COUNT } from './tools/index';


const MAX_BODY = 1024 * 1024; // 1 MiB

const MCP = {
    PROTOCOL: '2024-11-05',
    SERVER_NAME: 'cocos-mcp-server',
    JSONRPC: '2.0',
    ERR_PARSE: -32700,
    ERR_INTERNAL: -32603,
} as const;


export class MCPServer {
    private config: ServerConfig;
    private server: http.Server | null = null;
    private tools: Record<string, any> = {};
    private toolDefs: ToolDefinition[] = [];
    private actionCount = 0;
    // SSE 传输：每个 SSE 连接分配一个 session，通过 GET /sse 推送响应
    private sseSessions: Map<string, http.ServerResponse> = new Map();
    private sseSessionCounter = 0;

    constructor(config: ServerConfig) {
        this.config = config;
        this.initTools();
    }


    async start(): Promise<void> {
        if (this.server) return;

        this.server = http.createServer((req, res) => {
            this.dispatch(req, res).catch(err => {
                this.sendJson(res, 500, jsonrpcError(null, MCP.ERR_INTERNAL, (err as Error).message));
            });
        });

        await new Promise<void>((resolve, reject) => {
            this.server!.listen(this.config.port, '127.0.0.1', resolve);
            this.server!.on('error', reject);
        });

        this.refreshToolDefs();
        console.log(`[MCP] v${VERSION} listening on :${this.config.port} (${this.toolDefs.length} tools, ${this.actionCount} actions)`);
    }

    stop(): void {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }


    getStatus(): ServerStatus {
        return { running: !!this.server, port: this.config.port, clients: 0 };
    }

    getToolDefinitions(): ToolDefinition[] {
        return this.toolDefs;
    }

    getConfig(): ServerConfig {
        return this.config;
    }

    filterTools(enabled: Array<{ name: string }>): ToolDefinition[] {
        if (!enabled || enabled.length === 0) return this.toolDefs;
        const set = new Set(enabled.map(e => e.name));
        return this.toolDefs.filter(t => set.has(t.name));
    }

    updateToolFilter(enabled: Array<{ name: string }>): void {
        this.refreshToolDefs(enabled);
    }

    async updateConfig(cfg: ServerConfig): Promise<void> {
        this.config = cfg;
        if (this.server) { this.stop(); }
        await this.start();
    }


    async executeToolCall(name: string, args: any): Promise<any> {
        const tool = this.tools[name];
        if (!tool) throw new Error(`Unknown tool: ${name}`);

        if (!args?.action) {
            return { success: false, error: `Missing 'action'. Available: ${tool.actions?.join(', ')}` };
        }
        return tool.execute(args.action, args);
    }


    private initTools(): void {
        this.tools = getUnifiedTools();
    }

    private refreshToolDefs(enabled?: Array<{ name: string }>): void {
        const all: ToolDefinition[] = [];
        this.actionCount = 0;

        for (const [, t] of Object.entries(this.tools)) {
            for (const def of t.getTools()) {
                all.push({ name: def.name, description: def.description, inputSchema: def.inputSchema });
            }
            this.actionCount += t.actions?.length || 0;
        }

        if (enabled && enabled.length > 0) {
            const set = new Set(enabled.map(e => e.name));
            this.toolDefs = all.filter(t => set.has(t.name));
        } else {
            this.toolDefs = all;
        }
    }


    private async dispatch(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const url = new URL(req.url || '/', `http://127.0.0.1:${this.config.port}`);
        this.setCors(res);

        if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

        const route = `${req.method} ${url.pathname}`;

        // ── SSE 传输 ──
        // GET /sse → 客户端建立 SSE 连接，服务端推送 endpoint 事件
        if (route === 'GET /sse') return this.handleSSEConnect(req, res);
        // POST /message → 客户端发送 JSON-RPC 消息，通过 SSE 推送响应
        if (route === 'POST /message') return await this.handleSSEMessage(req, res);

        // ── 标准 HTTP 传输 ──
        res.setHeader('Content-Type', 'application/json');
        if (route === 'POST /mcp') return await this.handleMCP(req, res);
        if (route === 'GET /health') return this.handleHealth(res);
        if (route === 'GET /api/tools') return this.handleToolsIndex(res);
        if (route.startsWith('POST /api/')) return await this.handleDirectCall(req, res, url.pathname);
        this.sendJson(res, 404, { success: false, error: 'Not found' });
    }


    // ── SSE 传输实现 ──

    /**
     * GET /sse — 建立 SSE 长连接
     * 服务端发送 `endpoint` 事件，告知客户端 POST 消息的 URL
     */
    private handleSSEConnect(req: http.IncomingMessage, res: http.ServerResponse): void {
        const sessionId = `${++this.sseSessionCounter}`;

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': (this.config?.allowedOrigins || ['*']).includes('*') ? '*' : '',
        });

        // 存储这个 SSE 连接
        this.sseSessions.set(sessionId, res);

        // 发送 endpoint 事件，告诉客户端往哪 POST 消息
        const endpointUrl = `http://127.0.0.1:${this.config.port}/message?sessionId=${sessionId}`;
        this.sseSend(res, 'endpoint', endpointUrl);

        // 客户端断开时清理
        req.on('close', () => {
            this.sseSessions.delete(sessionId);
        });
    }

    /**
     * POST /message?sessionId=xxx — SSE 客户端发送 JSON-RPC 消息
     * 处理消息后通过对应的 SSE 连接推送响应
     */
    private async handleSSEMessage(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const url = new URL(req.url || '/', `http://127.0.0.1:${this.config.port}`);
        const sessionId = url.searchParams.get('sessionId') || '';

        // 先给 POST 一个 202 Accepted
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'accepted' }));

        // 读 body
        const body = await this.readBodyRaw(req);
        if (!body) return;

        let msg: any;
        try { msg = JSON.parse(body); } catch (e: any) {
            this.ssePushToSession(sessionId, jsonrpcError(null, MCP.ERR_PARSE, `Bad JSON: ${e.message}`));
            return;
        }

        try {
            const result = await this.processMCP(msg);
            this.ssePushToSession(sessionId, { jsonrpc: MCP.JSONRPC, id: msg.id, result });
        } catch (e: any) {
            this.ssePushToSession(sessionId, { jsonrpc: MCP.JSONRPC, id: msg.id, error: { code: MCP.ERR_INTERNAL, message: e.message } });
        }
    }

    /**
     * 通过 SSE 推送 JSON-RPC 响应到指定 session
     */
    private ssePushToSession(sessionId: string, data: any): void {
        const sseRes = this.sseSessions.get(sessionId);
        if (!sseRes || sseRes.writableEnded) return;
        this.sseSend(sseRes, 'message', JSON.stringify(data));
    }

    /**
     * 发送单个 SSE 事件
     */
    private sseSend(res: http.ServerResponse, event: string, data: string): void {
        if (res.writableEnded) return;
        res.write(`event: ${event}\ndata: ${data}\n\n`);
    }

    /**
     * 读取请求体（不依赖 ServerResponse，用于 SSE 模式）
     */
    private readBodyRaw(req: http.IncomingMessage): Promise<string | null> {
        return new Promise(resolve => {
            let buf = '';
            let size = 0;
            req.on('data', (chunk: Buffer) => {
                size += chunk.length;
                if (size > MAX_BODY) { req.destroy(); resolve(null); return; }
                buf += chunk.toString();
            });
            req.on('end', () => resolve(buf));
            req.on('error', () => resolve(null));
        });
    }


    private handleHealth(res: http.ServerResponse): void {
        this.sendJson(res, 200, {
            status: 'ok',
            version: VERSION,
            tools: this.toolDefs.length,
            actions: this.actionCount,
        });
    }

    private handleToolsIndex(res: http.ServerResponse): void {
        const detail: Record<string, any> = {};
        for (const [name, t] of Object.entries(this.tools)) {
            detail[name] = { name, actions: t.actions || [], category: t.category || 'core' };
        }
        this.sendJson(res, 200, { version: VERSION, tools: this.toolDefs.map(t => ({
            name: t.name, description: t.description, actions: detail[t.name]?.actions || [],
        }))});
    }

    private async handleMCP(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const body = await this.readBody(req, res);
        if (body === null) return; // error already sent

        let msg: any;
        try { msg = JSON.parse(body); } catch (e: any) {
            return this.sendJson(res, 400, jsonrpcError(null, MCP.ERR_PARSE, `Bad JSON: ${e.message}`));
        }

        try {
            const result = await this.processMCP(msg);
            this.sendJson(res, 200, { jsonrpc: MCP.JSONRPC, id: msg.id, result });
        } catch (e: any) {
            this.sendJson(res, 200, { jsonrpc: MCP.JSONRPC, id: msg.id, error: { code: MCP.ERR_INTERNAL, message: e.message } });
        }
    }

    private async handleDirectCall(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<void> {
        const body = await this.readBody(req, res);
        if (body === null) return;

        const toolName = pathname.replace('/api/', '').replace(/\//g, '_');
        let params: any = {};
        try { params = body ? JSON.parse(body) : {}; } catch { /* empty */ }

        try {
            const result = await this.executeToolCall(toolName, params);
            this.sendJson(res, 200, { success: true, tool: toolName, result });
        } catch (e: any) {
            this.sendJson(res, 500, { success: false, error: e.message });
        }
    }


    private async processMCP(msg: any): Promise<any> {
        switch (msg.method) {
            case 'initialize':
                return {
                    protocolVersion: MCP.PROTOCOL,
                    capabilities: { tools: {} },
                    serverInfo: { name: MCP.SERVER_NAME, version: VERSION },
                };
            case 'tools/list':
                return { tools: this.toolDefs };
            case 'tools/call': {
                const { name, arguments: args } = msg.params || {};
                const r = await this.executeToolCall(name, args || {});
                return { content: [{ type: 'text', text: JSON.stringify(r) }] };
            }
            default:
                throw new Error(`Unknown MCP method: ${msg.method}`);
        }
    }


    private setCors(res: http.ServerResponse): void {
        const origins = this.config?.allowedOrigins || ['*'];
        res.setHeader('Access-Control-Allow-Origin', origins.includes('*') ? '*' : '');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    private sendJson(res: http.ServerResponse, status: number, data: any): void {
        res.writeHead(status);
        res.end(JSON.stringify(data));
    }

    /**
     * Stream the request body with a size cap.
     * Returns null if an error was already sent to the client.
     */
    private readBody(req: http.IncomingMessage, res: http.ServerResponse): Promise<string | null> {
        return new Promise(resolve => {
            let buf = '';
            let size = 0;
            req.on('data', (chunk: Buffer) => {
                size += chunk.length;
                if (size > MAX_BODY) {
                    this.sendJson(res, 413, jsonrpcError(null, MCP.ERR_PARSE, `Body exceeds ${MAX_BODY >> 20} MiB`));
                    req.destroy();
                    resolve(null);
                    return;
                }
                buf += chunk.toString();
            });
            req.on('end', () => resolve(buf));
            req.on('error', () => { this.sendJson(res, 400, jsonrpcError(null, MCP.ERR_PARSE, 'Read error')); resolve(null); });
        });
    }
}


function jsonrpcError(id: any, code: number, message: string) {
    return { jsonrpc: MCP.JSONRPC, id, error: { code, message } };
}
