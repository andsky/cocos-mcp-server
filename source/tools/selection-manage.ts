// @ts-nocheck
/**
 * 选区管理工具 (selection_manage)
 * 统一管理编辑器中的节点和资源选中状态
 *
 * 注意: Selection API 是 Editor.Selection 同步方法，
 * 不是 Editor.Message.request 通道
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class SelectionManage extends UnifiedToolBase {
    name = 'selection_manage';
    description = '选区管理工具。支持操作: select(选中节点/资源), unselect(取消选中), get(获取选中项), last(获取最后选中), type(获取最后选中类型), clear(清空选中), hover(悬停高亮), focus(选中并聚焦)';
    actions = ['select', 'unselect', 'get', 'last', 'type', 'clear', 'hover', 'focus'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                selectionType: {
                    type: 'string',
                    description: '选区类型: node(场景节点) 或 asset(资源)',
                    enum: ['node', 'asset'],
                    default: 'node'
                },
                // select / unselect / hover 参数
                uuid: {
                    type: 'string',
                    description: '单个UUID (用于 select, unselect, hover, focus)'
                },
                uuids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '多个UUID (用于 select, unselect)'
                },
                // focus 附加参数
                focusCamera: {
                    type: 'boolean',
                    description: '选中节点时是否同时聚焦相机 (用于 focus)',
                    default: true
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'select': return await this.selectItems(args);
            case 'unselect': return await this.unselectItems(args);
            case 'get': return await this.getSelected(args);
            case 'last': return await this.getLastSelected(args);
            case 'type': return await this.getLastSelectedType();
            case 'clear': return await this.clearSelection(args);
            case 'hover': return await this.hoverItem(args);
            case 'focus': return await this.focusAndSelect(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    /**
     * 解析传入的 uuid 参数，支持单个 uuid 或 uuids 数组
     */
    private resolveUuids(args: any): string[] | null {
        if (args.uuids?.length > 0) return args.uuids;
        if (args.uuid) return [args.uuid];
        return null;
    }

    private async selectItems(args: any): Promise<ToolResponse> {
        const uuids = this.resolveUuids(args);
        if (!uuids) return { success: false, error: 'uuid or uuids is required' };

        const type = args.selectionType || 'node';
        try {
            Editor.Selection.select(type, uuids.length === 1 ? uuids[0] : uuids);

            return {
                success: true,
                message: `Selected ${uuids.length} ${type}(s)`,
                data: { type, uuids }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async unselectItems(args: any): Promise<ToolResponse> {
        const uuids = this.resolveUuids(args);
        if (!uuids) return { success: false, error: 'uuid or uuids is required' };

        const type = args.selectionType || 'node';
        try {
            Editor.Selection.unselect(type, uuids.length === 1 ? uuids[0] : uuids);

            return {
                success: true,
                message: `Unselected ${uuids.length} ${type}(s)`,
                data: { type, uuids }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async getSelected(args: any): Promise<ToolResponse> {
        const type = args.selectionType || 'node';
        try {
            const uuids = Editor.Selection.getSelected(type) || [];

            return {
                success: true,
                data: { type, total: uuids.length, uuids }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async getLastSelected(args: any): Promise<ToolResponse> {
        const type = args.selectionType || 'node';
        try {
            const uuid = Editor.Selection.getLastSelected(type);

            if (!uuid) {
                return {
                    success: true,
                    data: { type, uuid: null, message: `No ${type} currently selected` }
                };
            }

            let info: any = { uuid };
            if (type === 'node') {
                const result = await this.exec('scene', 'query-node', uuid);
                if (result.success && result.data) {
                    info.name = result.data.name?.value || 'Unknown';
                    info.active = result.data.active?.value ?? true;
                }
            } else if (type === 'asset') {
                const result = await this.exec('asset-db', 'query-asset-info', uuid);
                if (result.success && result.data) {
                    info.name = result.data.name;
                    info.path = result.data.path;
                    info.assetType = result.data.type;
                }
            }

            return { success: true, data: { type, ...info } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async getLastSelectedType(): Promise<ToolResponse> {
        try {
            const type = Editor.Selection.getLastSelectedType();

            return {
                success: true,
                data: {
                    type: type || null,
                    message: type ? `Last selected type: ${type}` : 'Nothing selected'
                }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async clearSelection(args: any): Promise<ToolResponse> {
        const type = args.selectionType || 'node';
        try {
            const before = Editor.Selection.getSelected(type) || [];
            Editor.Selection.clear(type);

            return {
                success: true,
                message: `Cleared ${before.length} ${type}(s) selection`,
                data: { type, cleared: before.length }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async hoverItem(args: any): Promise<ToolResponse> {
        const type = args.selectionType || 'node';
        const uuid = args.uuid || undefined;

        try {
            Editor.Selection.hover(type, uuid);

            return {
                success: true,
                message: uuid ? `Hovering over ${type}` : 'Hover cleared',
                data: { type, uuid: uuid || null }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    /**
     * 选中节点并聚焦相机 — 最常用的组合操作
     */
    private async focusAndSelect(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const type = args.selectionType || 'node';
        const uuid = args.uuid;

        try {
            Editor.Selection.select(type, uuid);

            if (type === 'node' && args.focusCamera !== false) {
                await this.exec('scene', 'focus-nodes', [uuid]);
            }

            let info: any = { uuid };
            if (type === 'node') {
                const result = await this.exec('scene', 'query-node', uuid);
                if (result.success && result.data) {
                    info.name = result.data.name?.value || 'Unknown';
                }
            }

            return {
                success: true,
                message: `Focused and selected ${type}${info.name ? ` '${info.name}'` : ''}`,
                data: { type, ...info, cameraFocused: type === 'node' && args.focusCamera !== false }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
