// @ts-nocheck
/**
 * 服务器信息工具 (server_info)
 * 统一管理编辑器服务器的状态、连接、网络等操作
 */

import { ToolResponse, VERSION } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class ServerInfo extends UnifiedToolBase {
    name = 'server_info';
    description = '服务器信息工具。支持操作: status(获取状态), connectivity(检查连接), network(网络信息), port(端口信息), ip(IP列表), restart(重启), quit(退出)';
    actions = ['status', 'connectivity', 'network', 'port', 'ip', 'restart', 'quit'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                timeout: { type: 'number', description: '超时时间(毫秒) (用于 connectivity)', default: 5000 }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'status': return await this.getServerStatus();
            case 'connectivity': return await this.checkConnectivity(args.timeout);
            case 'network': return await this.getNetworkInterfaces();
            case 'port': return await this.getServerPort();
            case 'ip': return await this.getServerIPList();
            case 'restart': return await this.restartEditor();
            case 'quit': return await this.quitEditor();
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async getServerStatus(): Promise<ToolResponse> {
        return {
            success: true,
            data: {
                running: true,
                version: VERSION,
                uptime: Date.now(),
                memoryUsage: process.memoryUsage(),
                platform: process.platform,
                nodeVersion: process.version
            }
        };
    }

    private async checkConnectivity(timeout: number = 5000): Promise<ToolResponse> {
        try {
            const startTime = Date.now();
            await Promise.race([
                Editor.Message.request('editor', 'ping'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), timeout))
            ]);
            const latency = Date.now() - startTime;
            return { success: true, data: { connected: true, latency, timeout } };
        } catch (err: any) {
            return { success: true, data: { connected: false, error: err.message, timeout } };
        }
    }

    private async getNetworkInterfaces(): Promise<ToolResponse> {
        const result = await this.exec('editor', 'query-network-interfaces');
        if (result.success && result.data) {
            return { success: true, data: { interfaces: result.data } };
        }
        try {
            const os = require('os');
            const interfaces = Object.entries(os.networkInterfaces())
                .map(([name, addrs]: [string, any]) => ({
                    name,
                    addresses: (addrs || []).map((addr: any) => ({
                        address: addr.address,
                        family: addr.family,
                        internal: addr.internal
                    }))
                }));
            return { success: true, data: { interfaces } };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    private async getServerPort(): Promise<ToolResponse> {
        const result = await this.exec('editor', 'query-port');
        return { success: true, data: { port: result.success ? result.data : 8585 } };
    }

    private async getServerIPList(): Promise<ToolResponse> {
        const result = await this.exec('editor', 'query-ip-list');
        if (result.success && result.data) {
            return { success: true, data: { ips: result.data } };
        }
        try {
            const os = require('os');
            const ips: string[] = ['127.0.0.1'];
            for (const addrs of Object.values(os.networkInterfaces()) as any[]) {
                for (const addr of (addrs || [])) {
                    if (!addr.internal && addr.family === 'IPv4') ips.push(addr.address);
                }
            }
            return { success: true, data: { ips } };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    private async restartEditor(): Promise<ToolResponse> {
        return await this.execMsg('Editor restart requested', 'editor', 'restart');
    }

    private async quitEditor(): Promise<ToolResponse> {
        return await this.execMsg('Editor quit requested', 'editor', 'quit');
    }
}
