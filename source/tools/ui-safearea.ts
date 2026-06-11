// @ts-nocheck
/**
 * SafeArea组件工具 (ui_safearea)
 * 统一管理 SafeArea 安全区域组件的添加、移除、查询等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class UISafeArea extends UnifiedToolBase {
    name = 'ui_safearea';
    description = 'SafeArea组件工具。支持操作: add(添加SafeArea), remove(移除SafeArea), get(获取SafeArea信息)';
    actions = ['add', 'remove', 'get'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                }
            },
            required: ['action', 'uuid']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addSafeArea(args);
            case 'remove': return await this.removeSafeArea(args);
            case 'get': return await this.getSafeArea(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addSafeArea(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: 'cc.SafeArea'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: 'SafeArea component added',
            data: { uuid: args.uuid, componentUuid: result.data }
        };
    }

    private async removeSafeArea(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, 'cc.SafeArea');
        if (!('comp' in found)) return found;

        return await this.execMsg('SafeArea component removed', 'scene', 'remove-component', { uuid: found.comp.uuid });
    }

    private async getSafeArea(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const comp = (result.data?.__comps__ || []).find((c: any) => c.__type__ === 'cc.SafeArea');
        if (!comp) return { success: false, error: 'No cc.SafeArea component found on node' };

        return {
            success: true,
            data: {
                uuid: args.uuid,
                componentUuid: comp.uuid,
                enabled: comp.enabled ?? true
            }
        };
    }
}
