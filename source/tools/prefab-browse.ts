// @ts-nocheck
/**
 * 预制体浏览工具 (prefab_browse)
 * 统一管理预制体的浏览、加载、实例化等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class PrefabBrowse extends UnifiedToolBase {
    name = 'prefab_browse';
    description = '预制体浏览工具。支持操作: list(获取预制体列表), load(加载预制体), info(获取预制体信息), instantiate(实例化预制体)';
    actions = ['list', 'load', 'info', 'instantiate'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                prefabPath: {
                    type: 'string',
                    description: '预制体路径 (用于 load, info, instantiate)'
                },
                folder: {
                    type: 'string',
                    description: '搜索文件夹 (用于 list)',
                    default: 'db://assets'
                },
                parentUuid: {
                    type: 'string',
                    description: '父节点UUID (用于 instantiate)'
                },
                position: {
                    type: 'object',
                    properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                    description: '实例化位置 (用于 instantiate)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'list': return await this.listPrefabs(args);
            case 'load': return await this.loadPrefab(args);
            case 'info': return await this.getPrefabInfo(args);
            case 'instantiate': return await this.instantiatePrefab(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async listPrefabs(args: any): Promise<ToolResponse> {
        const result = await this.exec('asset-db', 'query-assets', {
            type: 'prefab',
            path: args.folder || 'db://assets'
        });
        if (!result.success) return result;

        const prefabs = (result.data || []).map((a: any) => ({
            name: a.name, path: a.path, uuid: a.uuid
        }));
        return { success: true, data: { total: prefabs.length, prefabs } };
    }

    private async loadPrefab(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'prefabPath');
        if (missing) return missing;

        const result = await this.exec('asset-db', 'query-asset-info', args.prefabPath);
        if (!result.success) return result;
        if (!result.data) return { success: false, error: `Prefab not found: ${args.prefabPath}` };

        return {
            success: true,
            data: {
                name: result.data.name,
                path: result.data.path,
                uuid: result.data.uuid,
                type: result.data.type
            },
            message: `Prefab '${result.data.name}' loaded successfully`
        };
    }

    private async getPrefabInfo(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'prefabPath');
        if (missing) return missing;

        const infoResult = await this.exec('asset-db', 'query-asset-info', args.prefabPath);
        if (!infoResult.success) return infoResult;
        if (!infoResult.data) return { success: false, error: `Prefab not found: ${args.prefabPath}` };

        const metaResult = await this.exec('asset-db', 'query-asset-meta', args.prefabPath);

        return {
            success: true,
            data: {
                name: infoResult.data.name,
                path: infoResult.data.path,
                uuid: infoResult.data.uuid,
                type: infoResult.data.type,
                meta: metaResult.success ? metaResult.data : null,
                isSubAsset: infoResult.data.isSubAsset,
                subAssets: infoResult.data.subAssets || []
            }
        };
    }

    private async instantiatePrefab(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'prefabPath');
        if (missing) return missing;

        const assetUuid = await this.resolveAssetUuid(args.prefabPath);
        if (!assetUuid) return { success: false, error: `Prefab not found: ${args.prefabPath}` };

        const createOptions: any = { name: args.prefabPath.split('/').pop(), assetUuid };
        if (args.parentUuid) createOptions.parent = args.parentUuid;

        const result = await this.exec('scene', 'create-node', createOptions);
        if (!result.success) return result;

        const nodeUuid = Array.isArray(result.data) ? result.data[0] : result.data;

        // 设置位置 — 使用 setSceneProperty 确保注入 __type__: 'cc.Vec3'
        if (args.position && nodeUuid) {
            await this.setSceneProperty(nodeUuid, 'position', args.position, 'vec3');
        }

        return {
            success: true,
            data: { uuid: nodeUuid, prefabPath: args.prefabPath, prefabUuid: assetUuid, parentUuid: args.parentUuid },
            message: `Prefab instantiated successfully`
        };
    }
}
