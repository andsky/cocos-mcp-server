// @ts-nocheck
/**
 * 剪贴板工具 (clipboard_manage)
 * 读写系统剪贴板：复制 UUID/路径/JSON，粘贴内容
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class ClipboardManage extends UnifiedToolBase {
    name = 'clipboard_manage';
    description = '剪贴板工具。支持操作: read(读取剪贴板内容), write(写入剪贴板), has(检查剪贴板是否有指定类型数据), clear(清空剪贴板)';
    actions = ['read', 'write', 'has', 'clear'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                type: { type: 'string', description: "数据类型: 'text'(默认), 'image', 'files', 或自定义字符串", default: 'text' },
                value: { type: 'string', description: '要写入的内容 (write 操作必填)' },
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'read': return await this.read(args);
            case 'write': return await this.write(args);
            case 'has': return await this.has(args);
            case 'clear': return await this.clear();
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async read(args: any): Promise<ToolResponse> {
        const type = args.type || 'text';
        try {
            const data = Editor.Clipboard.read(type);
            return { success: true, data: { type, content: data } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async write(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'value');
        if (missing) return missing;

        const type = args.type || 'text';
        try {
            const result = Editor.Clipboard.write(type, args.value);
            return {
                success: true,
                message: `Copied to clipboard (${type})`,
                data: { type, length: String(args.value).length }
            };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async has(args: any): Promise<ToolResponse> {
        const type = args.type || 'text';
        try {
            const exists = Editor.Clipboard.has(type);
            return { success: true, data: { type, hasData: exists } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async clear(): Promise<ToolResponse> {
        try {
            Editor.Clipboard.clear();
            return { success: true, message: 'Clipboard cleared' };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }
}
