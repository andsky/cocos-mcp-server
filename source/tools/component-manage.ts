// @ts-nocheck
/**
 * 组件管理工具 (component_manage)
 * 统一管理组件的添加、移除、获取、设置属性等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class ComponentManage extends UnifiedToolBase {
    name = 'component_manage';
    description = '组件管理工具。支持操作: add(添加组件), remove(移除组件), get(获取组件), info(获取组件信息), set(设置组件属性)';
    actions = ['add', 'remove', 'get', 'info', 'set'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                },
                componentType: {
                    type: 'string',
                    description: '组件类型 (如 cc.Sprite, cc.Label, cc.Button)'
                },
                property: {
                    type: 'string',
                    description: '属性名称 (用于 set)'
                },
                value: {
                    description: '属性值 (用于 set)'
                },
                propertyType: {
                    type: 'string',
                    enum: ['string', 'number', 'boolean', 'color', 'vec2', 'vec3', 'size', 'node', 'component', 'spriteFrame', 'prefab', 'asset'],
                    description: '属性类型 (用于 set)'
                }
            },
            required: ['action', 'uuid']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addComponent(args);
            case 'remove': return await this.removeComponent(args);
            case 'get': return await this.getComponents(args);
            case 'info': return await this.getComponentInfo(args);
            case 'set': return await this.setComponentProperty(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addComponent(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'componentType');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: args.componentType
        });
        if (!result.success) return result;

        return {
            success: true,
            data: { uuid: args.uuid, componentType: args.componentType, componentUuid: result.data },
            message: `Component '${args.componentType}' added successfully`
        };
    }

    private async removeComponent(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'componentType');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, args.componentType);
        if (!('comp' in found)) return found;

        return await this.execMsg(
            `Component '${args.componentType}' removed successfully`,
            'scene', 'remove-component', { uuid: found.comp.uuid }
        );
    }

    private async getComponents(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const components = (result.data?.__comps__ || []).map((comp: any) => ({
            type: comp.__type__ || 'Unknown',
            uuid: comp.uuid,
            enabled: comp.enabled ?? true
        }));

        return {
            success: true,
            data: { uuid: args.uuid, total: components.length, components }
        };
    }

    private async getComponentInfo(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'componentType');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, args.componentType);
        if (!('comp' in found)) return found;

        return {
            success: true,
            data: {
                uuid: args.uuid,
                type: found.comp.__type__,
                componentUuid: found.comp.uuid,
                enabled: found.comp.enabled ?? true,
                properties: found.comp
            }
        };
    }

    private async setComponentProperty(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'componentType', 'property');
        if (missing) return missing;

        const path = `__comps__.${args.componentType}.${args.property}`;
        const result = await this.setSceneProperty(args.uuid, path, args.value, args.propertyType);
        if (!result.success) return result;

        return {
            success: true,
            message: `Property '${args.property}' set successfully`,
            data: { uuid: args.uuid, componentType: args.componentType, property: args.property }
        };
    }
}
