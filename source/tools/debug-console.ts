// @ts-nocheck
/**
 * 调试控制台工具 (debug_console)
 *
 * CC 3.8 没有 'console' 消息频道。console:query-logs / console:clear 不存在。
 * 日志获取无法通过 Editor.Message 实现。
 * 脚本执行通过 execute-scene-script 实现。
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class DebugConsole extends UnifiedToolBase {
    name = 'debug_console';
    description = '调试控制台工具。支持操作: execute(执行脚本)';
    actions = ['execute'];

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
            case 'execute': return await this.executeScript(args);
            default: return { success: false, error: `Unknown action: ${action}` };
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
