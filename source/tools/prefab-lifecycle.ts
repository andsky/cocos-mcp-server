// @ts-nocheck
/**
 * 预制体生命周期工具 (prefab_lifecycle)
 * 统一管理预制体的创建、更新、恢复等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class PrefabLifecycle extends UnifiedToolBase {
    name = 'prefab_lifecycle';
    description = '预制体生命周期工具。支持操作: create(创建预制体), update(更新预制体), revert(恢复预制体), duplicate(复制预制体)';
    actions = ['create', 'update', 'revert', 'duplicate'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID (用于 create, update, revert)'
                },
                prefabPath: {
                    type: 'string',
                    description: '预制体保存路径 (用于 create, duplicate)'
                },
                savePath: {
                    type: 'string',
                    description: '保存路径，需包含文件名 (如 db://assets/prefabs/MyPrefab.prefab，用于 create)'
                },
                sourcePrefabPath: {
                    type: 'string',
                    description: '源预制体路径 (用于 duplicate)'
                },
                targetPrefabPath: {
                    type: 'string',
                    description: '目标预制体路径 (用于 duplicate)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'create': return await this.createPrefab(args);
            case 'update': return await this.updatePrefab(args);
            case 'revert': return await this.revertPrefab(args);
            case 'duplicate': return await this.duplicatePrefab(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async createPrefab(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'savePath');
        if (missing) return missing;

        const nodeResult = await this.exec('scene', 'query-node', args.uuid);
        if (!nodeResult.success) return nodeResult;
        if (!nodeResult.data) return { success: false, error: 'Node not found' };

        const result = await this.exec('scene', 'create-prefab', {
            node: args.uuid,
            path: args.savePath
        });
        if (!result.success) return result;

        // 从 savePath 提取文件名用于显示
        const prefabName = args.savePath.split('/').pop()?.replace('.prefab', '') || 'unknown';

        return {
            success: true,
            data: {
                prefabUuid: result.data,
                prefabName,
                savePath: args.savePath,
                sourceNode: args.uuid
            },
            message: `Prefab '${prefabName}' created successfully`
        };
    }

    private async updatePrefab(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        // save-prefab 使用节点 UUID 保存关联的预制体
        const result = await this.exec('scene', 'save-prefab', args.uuid);
        if (!result.success) return result;

        return {
            success: true,
            message: 'Prefab updated successfully',
            data: { uuid: args.uuid }
        };
    }

    private async revertPrefab(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'restore-prefab', args.uuid);
        if (!result.success) return result;

        return {
            success: true,
            message: 'Prefab instance reverted to original',
            data: { uuid: args.uuid }
        };
    }

    private async duplicatePrefab(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'sourcePrefabPath', 'targetPrefabPath');
        if (missing) return missing;

        const sourceResult = await this.exec('asset-db', 'query-asset-info', args.sourcePrefabPath);
        if (!sourceResult.success) return sourceResult;
        if (!sourceResult.data) {
            return { success: false, error: `Source prefab not found: ${args.sourcePrefabPath}` };
        }

        const result = await this.exec('asset-db', 'copy-asset', {
            source: args.sourcePrefabPath,
            target: args.targetPrefabPath
        });
        if (!result.success) return result;

        return {
            success: true,
            message: 'Prefab duplicated successfully',
            data: { sourcePrefabPath: args.sourcePrefabPath, targetPrefabPath: args.targetPrefabPath }
        };
    }
}
