// @ts-nocheck
/**
 * 调试控制台工具 (debug_console)
 *
 * 日志：Editor.Logger（命名空间 API，与 Editor.Selection 同类，非消息频道）
 *   - query(): 查询所有日志
 *   - clear(): 清空所有日志
 * 脚本执行：execute-scene-script，在场景进程引擎上下文运行任意 JS。
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class DebugConsole extends UnifiedToolBase {
    name = 'debug_console';
    description = '调试控制台工具。支持操作: query-logs(查询日志), clear-logs(清空日志), execute(执行脚本)';
    actions = ['query-logs', 'clear-logs', 'execute'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                script: { type: 'string', description: '要执行的JavaScript代码 (用于 execute)' }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'query-logs': return await this.queryLogs();
            case 'clear-logs': return await this.clearLogs();
            case 'execute': return await this.executeScript(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    /** 查询编辑器日志（Editor.Logger.query 返回日志数组或对象，原样透传）。 */
    private async queryLogs(): Promise<ToolResponse> {
        try {
            const logs = await Editor.Logger.query();
            const count = Array.isArray(logs) ? logs.length : (logs ? Object.keys(logs).length : 0);
            return { success: true, data: { count, logs } };
        } catch (err: any) {
            return { success: false, error: `Failed to query logs: ${err.message || String(err)}` };
        }
    }

    /** 清空编辑器日志（Editor.Logger.clear 同步调用）。 */
    private async clearLogs(): Promise<ToolResponse> {
        try {
            Editor.Logger.clear();
            return { success: true, message: 'Logs cleared' };
        } catch (err: any) {
            return { success: false, error: `Failed to clear logs: ${err.message || String(err)}` };
        }
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
