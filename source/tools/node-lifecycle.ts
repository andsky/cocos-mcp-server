// @ts-nocheck
/**
 * 节点生命周期工具 (node_lifecycle)
 * 统一管理节点的创建、删除、复制、重命名、激活等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class NodeLifecycle extends UnifiedToolBase {
    name = 'node_lifecycle';
    description = '节点生命周期工具。支持操作: create(创建节点), delete(删除节点), duplicate(复制节点), rename(重命名), activate(激活/停用)';
    actions = ['create', 'delete', 'duplicate', 'rename', 'activate'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID (用于 delete, duplicate, rename, activate)'
                },
                name: {
                    type: 'string',
                    description: '节点名称 (用于 create, rename)'
                },
                parentUuid: {
                    type: 'string',
                    description: '父节点UUID (用于 create)'
                },
                nodeType: {
                    type: 'string',
                    enum: ['Node', '2DNode', '3DNode'],
                    description: '节点类型 (用于 create)',
                    default: 'Node'
                },
                components: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '要添加的组件列表 (用于 create)'
                },
                assetUuid: {
                    type: 'string',
                    description: '资源UUID，用于从预制体实例化 (用于 create)'
                },
                assetPath: {
                    type: 'string',
                    description: '资源路径，用于从预制体实例化 (用于 create)'
                },
                siblingIndex: {
                    type: 'number',
                    description: '同级索引 (用于 create)',
                    default: -1
                },
                unlinkPrefab: {
                    type: 'boolean',
                    description: '是否解除预制体关联 (用于 create)',
                    default: false
                },
                keepWorldTransform: {
                    type: 'boolean',
                    description: '是否保持世界变换 (用于 create)',
                    default: false
                },
                includeChildren: {
                    type: 'boolean',
                    description: '是否包含子节点 (用于 duplicate)',
                    default: true
                },
                active: {
                    type: 'boolean',
                    description: '是否激活 (用于 activate)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'create': return await this.createNode(args);
            case 'delete': return await this.deleteNode(args);
            case 'duplicate': return await this.duplicateNode(args);
            case 'rename': return await this.renameNode(args);
            case 'activate': return await this.setActive(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async createNode(args: any): Promise<ToolResponse> {
        let targetParentUuid = args.parentUuid;

        if (!targetParentUuid) {
            const sceneInfo = await this.exec('scene', 'query-node-tree');
            if (sceneInfo.success) {
                const tree = sceneInfo.data;
                targetParentUuid = tree?.uuid || (Array.isArray(tree) ? tree[0]?.uuid : undefined);
            }
        }

        let finalAssetUuid = args.assetUuid;
        if (args.assetPath && !finalAssetUuid) {
            const uuid = await this.resolveAssetUuid(args.assetPath);
            if (!uuid) return { success: false, error: `Asset not found: ${args.assetPath}` };
            finalAssetUuid = uuid;
        }

        const createOptions: any = { name: args.name };
        if (targetParentUuid) createOptions.parent = targetParentUuid;
        if (finalAssetUuid) {
            createOptions.assetUuid = finalAssetUuid;
            if (args.unlinkPrefab) createOptions.unlinkPrefab = true;
        }
        if (args.components?.length > 0) {
            createOptions.components = args.components;
        } else if (args.nodeType && args.nodeType !== 'Node' && !finalAssetUuid) {
            createOptions.components = [args.nodeType];
        }
        if (args.keepWorldTransform) createOptions.keepWorldTransform = true;
        if (args.siblingIndex !== undefined && args.siblingIndex >= 0) createOptions.siblingIndex = args.siblingIndex;

        const result = await this.exec('scene', 'create-node', createOptions);
        if (!result.success) return result;
        const uuid = Array.isArray(result.data) ? result.data[0] : result.data;

        return {
            success: true,
            data: { uuid, name: args.name, parentUuid: targetParentUuid, nodeType: args.nodeType || 'Node', fromAsset: !!finalAssetUuid },
            message: `Node '${args.name}' created successfully`
        };
    }

    private async deleteNode(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;
        return await this.execMsg('Node deleted successfully', 'scene', 'remove-node', { uuid: args.uuid });
    }

    private async duplicateNode(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;
        const result = await this.exec('scene', 'duplicate-node', args.uuid);
        if (!result.success) return result;
        const newUuid = result.data?.uuid || (Array.isArray(result.data) ? result.data[0] : result.data);
        return {
            success: true,
            data: { uuid: newUuid, sourceUuid: args.uuid, includeChildren: args.includeChildren ?? true },
            message: 'Node duplicated successfully'
        };
    }

    private async renameNode(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'name');
        if (missing) return missing;
        const result = await this.setSceneProperty(args.uuid, 'name', args.name);
        if (!result.success) return result;
        return { success: true, message: `Node renamed to '${args.name}'`, data: { uuid: args.uuid, name: args.name } };
    }

    private async setActive(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;
        const active = args.active ?? true;
        const result = await this.setSceneProperty(args.uuid, 'active', active);
        if (!result.success) return result;
        return { success: true, message: `Node ${active ? 'activated' : 'deactivated'}`, data: { uuid: args.uuid, active } };
    }
}
