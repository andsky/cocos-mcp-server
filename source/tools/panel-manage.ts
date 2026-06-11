// @ts-nocheck
/**
 * 面板管理工具 (panel_manage)
 * 统一管理编辑器面板的查询、打开、关闭、聚焦等操作
 *
 * Panel API 为同步调用，类似 Editor.Selection
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class PanelManage extends UnifiedToolBase {
    name = 'panel_manage';
    description = '面板管理工具。支持操作: list(列出面板), open(打开面板), close(关闭面板), focus(聚焦面板), get-active(获取活动面板)';
    actions = ['list', 'open', 'close', 'focus', 'get-active'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                panelName: { type: 'string', description: '面板名称 (用于 open, close, focus)' },
                args: {
                    type: 'object',
                    description: '面板参数 (用于 open)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'list': return await this.listPanels(args);
            case 'open': return await this.openPanel(args);
            case 'close': return await this.closePanel(args);
            case 'focus': return await this.focusPanel(args);
            case 'get-active': return await this.getActivePanels(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async listPanels(args: any): Promise<ToolResponse> {
        try {
            const panels = Editor.Panel.getPanels ? Editor.Panel.getPanels() : [];
            return {
                success: true,
                data: { total: panels.length, panels }
            };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async openPanel(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'panelName');
        if (missing) return missing;

        try {
            Editor.Panel.open(args.panelName, args.args || undefined);
            return {
                success: true,
                message: `Panel '${args.panelName}' opened`,
                data: { panelName: args.panelName }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to open panel: ${err.message || String(err)}` };
        }
    }

    private async closePanel(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'panelName');
        if (missing) return missing;

        try {
            Editor.Panel.close(args.panelName);
            return {
                success: true,
                message: `Panel '${args.panelName}' closed`,
                data: { panelName: args.panelName }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to close panel: ${err.message || String(err)}` };
        }
    }

    private async focusPanel(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'panelName');
        if (missing) return missing;

        try {
            Editor.Panel.focus(args.panelName);
            return {
                success: true,
                message: `Panel '${args.panelName}' focused`,
                data: { panelName: args.panelName }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to focus panel: ${err.message || String(err)}` };
        }
    }

    private async getActivePanels(args: any): Promise<ToolResponse> {
        try {
            const panels = Editor.Panel.getPanels ? Editor.Panel.getPanels() : [];
            const activePanels = panels.filter((p: any) => p.active !== false);
            return {
                success: true,
                data: { total: activePanels.length, activePanels }
            };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }
}
