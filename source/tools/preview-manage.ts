// @ts-nocheck
/**
 * 预览管理工具 (preview_manage)
 * 控制编辑器预览服务器：启动/停止预览、刷新页面、查询状态
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class PreviewManage extends UnifiedToolBase {
    name = 'preview_manage';
    description = '预览管理工具。支持操作: open(在浏览器打开预览), start(启动预览服务器), stop(停止预览服务器), status(查询预览状态), reload(刷新预览页面)';
    actions = ['open', 'start', 'stop', 'status', 'reload'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'open': return await this.openPreview(args);
            case 'start': return await this.startPreview(args);
            case 'stop': return await this.stopPreview();
            case 'status': return await this.queryStatus();
            case 'reload': return await this.reloadPreview();
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async openPreview(args: any): Promise<ToolResponse> {
        return await this.execMsg('Preview opened in browser', 'preview', 'open-preview');
    }

    private async startPreview(args: any): Promise<ToolResponse> {
        return await this.execMsg('Preview server started', 'preview', 'start');
    }

    private async stopPreview(): Promise<ToolResponse> {
        return await this.execMsg('Preview server stopped', 'preview', 'stop');
    }

    private async queryStatus(): Promise<ToolResponse> {
        return await this.exec('preview', 'query-status');
    }

    private async reloadPreview(): Promise<ToolResponse> {
        return await this.execMsg('Preview page reloaded', 'preview', 'reload');
    }
}
