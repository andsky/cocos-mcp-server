/**
 * Extension entry point.
 *
 * Exports the Cocos Creator extension lifecycle (load / unload) and the
 * `methods` map that backs every IPC message declared in package.json.
 */

import { MCPServer } from './mcp-server';
import { loadConfig, saveConfig } from './settings';
import { VERSION, ServerConfig } from './types';

let server: MCPServer | null = null;


export function load(): void {
    console.log(`[MCP] v${VERSION} loading`);
    loadConfig().then(cfg => {
        server = new MCPServer(cfg);
        if (cfg.autoStart) {
            server.start().catch(e => console.error('[MCP] auto-start failed:', e));
        }
    });
}

export function unload(): void {
    if (server) { server.stop(); server = null; }
}


export const methods: Record<string, (...args: any[]) => any> = {

    openPanel() {
        Editor.Panel.open('cocos-mcp-server');
    },

    async startServer() {
        if (server) await server.start();
    },

    stopServer() {
        if (server) server.stop();
    },

    getServerStatus() {
        if (!server) return { running: false, port: 0, clients: 0, settings: null };
        return { ...server.getStatus(), settings: server.getConfig() };
    },

    async getServerSettings() {
        return server?.getConfig() ?? (await loadConfig());
    },

    async updateSettings(cfg: ServerConfig) {
        await saveConfig(cfg);
        if (server) server.stop();
        server = new MCPServer(cfg);
        await server.start();
    },

    getToolsList() {
        return server?.getToolDefinitions() ?? [];
    },
};
