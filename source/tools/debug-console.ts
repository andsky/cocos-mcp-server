// @ts-nocheck
/**
 * 调试控制台工具 (debug_console)
 * 统一管理编辑器控制台的日志获取、清空、脚本执行等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class DebugConsole extends UnifiedToolBase {
    name = 'debug_console';
    description = '调试控制台工具。支持操作: get(获取日志), clear(清空日志), execute(执行脚本)';
    actions = ['get', 'clear', 'execute'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                limit: { type: 'number', description: '日志数量限制 (用于 get)', default: 100 },
                filter: {
                    type: 'string',
                    description: '日志类型过滤 (用于 get)',
                    enum: ['all', 'log', 'warn', 'error', 'info'],
                    default: 'all'
                },
                script: { type: 'string', description: '要执行的JavaScript代码 (用于 execute)' }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'get': return await this.getLogs(args);
            case 'clear': return await this.clearLogs();
            case 'execute': return await this.executeScript(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async getLogs(args: any): Promise<ToolResponse> {
        const result = await this.exec('console', 'query-logs', {
            limit: args.limit || 100,
            level: args.filter === 'all' ? undefined : args.filter
        });
        if (!result.success) return result;
        return { success: true, data: { total: result.data?.length || 0, logs: result.data || [] } };
    }

    private async clearLogs(): Promise<ToolResponse> {
        return await this.execMsg('Console cleared', 'console', 'clear');
    }

    private async executeScript(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'script');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'executeScript',
            args: [args.script]
        });
        if (!result.success) return result;

        return { success: true, data: { result: result.data }, message: 'Script executed successfully' };
    }
}
