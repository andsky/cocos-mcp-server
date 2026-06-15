// @ts-nocheck
/**
 * 面板管理工具 (panel_manage)
 * 统一管理编辑器面板的查询、打开、关闭、聚焦等操作
 *
 * Panel API 为同步调用，类似 Editor.Selection
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

/** Editor.Panel 手册无列举已打开面板的方法时，返回给客户端的如实说明。 */
const NO_LIST_PANELS_MSG =
    'Editor.Panel 未提供列举已打开面板的方法（手册仅支持 open/close/focus/has）。可用 has 查询单个面板，或用 open 打开。';

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

    /**
     * 探测已打开的面板。
     * Editor.Panel 手册仅提供 open/close/focus/has/define，没有列举已打开面板的方法；
     * 运行时若存在非公开 getPanels 则尽力使用，否则如实返回 available:false，
     * 而不是用空数组伪装"当前没有面板"。
     */
    private collectPanels(): { available: boolean; panels: any[] } {
        const Panel: any = Editor.Panel;
        if (typeof Panel.getPanels === 'function') {
            return { available: true, panels: Panel.getPanels() || [] };
        }
        return { available: false, panels: [] };
    }

    private async listPanels(args: any): Promise<ToolResponse> {
        try {
            const { available, panels } = this.collectPanels();
            if (!available) {
                return {
                    success: true,
                    data: { total: 0, panels: [], available: false, message: NO_LIST_PANELS_MSG }
                };
            }
            return { success: true, data: { total: panels.length, panels, available: true } };
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
            const { available, panels } = this.collectPanels();
            if (!available) {
                return {
                    success: true,
                    data: { total: 0, activePanels: [], available: false, message: NO_LIST_PANELS_MSG }
                };
            }
            const activePanels = panels.filter((p: any) => p.active !== false);
            return { success: true, data: { total: activePanels.length, activePanels, available: true } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }
}
