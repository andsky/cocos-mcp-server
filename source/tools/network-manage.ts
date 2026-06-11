// @ts-nocheck
/**
 * 网络工具 (network_manage)
 * 封装 Editor.Network API：HTTP 请求、端口检测、IP 查询、连通性测试
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class NetworkManage extends UnifiedToolBase {
    name = 'network_manage';
    description = '网络工具。支持操作: get(HTTP GET), post(HTTP POST), check_port(端口占用检查), ip_list(本机IP列表), test_connect(测试Cocos连通性), test_host(测试指定主机)';
    actions = ['get', 'post', 'check_port', 'ip_list', 'test_connect', 'test_host'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                url: { type: 'string', description: '请求 URL (get/post/test_host 必填)' },
                data: { type: 'any', description: 'POST 请求数据 (post 操作)' },
                port: { type: 'number', description: '端口号 (check_port 必填)' },
                host: { type: 'string', description: '主机地址 (test_host 操作)' },
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'get': return await this.httpGet(args);
            case 'post': return await this.httpPost(args);
            case 'check_port': return await this.checkPort(args);
            case 'ip_list': return await this.getIPList();
            case 'test_connect': return await this.testConnect();
            case 'test_host': return await this.testHost(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async httpGet(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;
        try {
            const result = await Editor.Network.get(args.url, args.data);
            const content = result ? result.toString() : '';
            return { success: true, data: { url: args.url, content } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async httpPost(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;
        try {
            const result = await Editor.Network.post(args.url, args.data);
            const content = result ? result.toString() : '';
            return { success: true, data: { url: args.url, content } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async checkPort(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'port');
        if (missing) return missing;
        try {
            const occupied = await Editor.Network.portIsOccupied(args.port);
            return { success: true, data: { port: args.port, occupied } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async getIPList(): Promise<ToolResponse> {
        try {
            const ips = Editor.Network.queryIPList();
            return { success: true, data: { ips: ips || [] } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async testConnect(): Promise<ToolResponse> {
        try {
            const connected = await Editor.Network.testConnectServer();
            return { success: true, data: { connected } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async testHost(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'host');
        if (missing) return missing;
        try {
            const reachable = await Editor.Network.testHost(args.host);
            return { success: true, data: { host: args.host, reachable } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }
}
