// @ts-nocheck
/**
 * 对话框工具 (dialog_manage)
 * 弹出原生对话框：信息/警告/错误提示、文件保存/选择对话框
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class DialogManage extends UnifiedToolBase {
    name = 'dialog_manage';
    description = '对话框工具。支持操作: info(信息对话框), warn(警告对话框), error(错误对话框), save(保存文件对话框), select(选择文件/文件夹对话框)';
    actions = ['info', 'warn', 'error', 'save', 'select'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                message: { type: 'string', description: '对话框消息内容 (info/warn/error 必填)' },
                title: { type: 'string', description: '对话框标题' },
                detail: { type: 'string', description: '详细信息 (info/warn/error)' },
                buttons: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '自定义按钮文本列表 (info/warn/error)，如 ["确定","取消"]'
                },
                type: { type: 'string', description: "选择类型: 'file'(默认) 或 'directory' (select 操作)", enum: ['file', 'directory'] },
                multi: { type: 'boolean', description: '是否允许多选 (select 操作)', default: false },
                filters: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: '过滤器名称' },
                            extensions: { type: 'array', items: { type: 'string' }, description: '扩展名列表' }
                        }
                    },
                    description: '文件类型过滤器 (select/save)，如 [{name:"Images", extensions:["png","jpg"]}]'
                },
                path: { type: 'string', description: '默认路径 (save/select)' },
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'info': return await this.showInfo(args);
            case 'warn': return await this.showWarn(args);
            case 'error': return await this.showError(args);
            case 'save': return await this.showSave(args);
            case 'select': return await this.showSelect(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async showInfo(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'message');
        if (missing) return missing;
        try {
            const result = await Editor.Dialog.info(args.message, {
                title: args.title,
                detail: args.detail,
                buttons: args.buttons,
            });
            return { success: true, data: { response: result.response, checkboxChecked: result.checkboxChecked } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async showWarn(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'message');
        if (missing) return missing;
        try {
            const result = await Editor.Dialog.warn(args.message, {
                title: args.title,
                detail: args.detail,
                buttons: args.buttons,
            });
            return { success: true, data: { response: result.response, checkboxChecked: result.checkboxChecked } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async showError(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'message');
        if (missing) return missing;
        try {
            const result = await Editor.Dialog.error(args.message, {
                title: args.title,
                detail: args.detail,
                buttons: args.buttons,
            });
            return { success: true, data: { response: result.response, checkboxChecked: result.checkboxChecked } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async showSave(args: any): Promise<ToolResponse> {
        try {
            const result = await Editor.Dialog.save({
                title: args.title,
                path: args.path,
                filters: args.filters,
            });
            return { success: true, data: { filePath: result.filePath, canceled: result.canceled } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async showSelect(args: any): Promise<ToolResponse> {
        try {
            const result = await Editor.Dialog.select({
                title: args.title,
                path: args.path,
                type: args.type || 'file',
                multi: args.multi || false,
                filters: args.filters,
            });
            return { success: true, data: { filePaths: result.filePaths, canceled: result.canceled } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }
}
