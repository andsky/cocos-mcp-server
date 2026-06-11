// @ts-nocheck
/**
 * 预制体编辑工具 (prefab_edit)
 * 统一管理预制体的嵌套、变体、覆盖、断开连接等高级编辑操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class PrefabEdit extends UnifiedToolBase {
    name = 'prefab_edit';
    description = '预制体编辑工具。支持操作: create-nested(创建嵌套实例), create-variant(创建变体), apply-override(应用覆盖), revert-override(还原覆盖), get-override(获取覆盖差异), disconnect(断开预制体连接), get-nested(获取嵌套结构)';
    actions = ['create-nested', 'create-variant', 'apply-override', 'revert-override', 'get-override', 'disconnect', 'get-nested'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: { type: 'string', description: '节点UUID' },
                parentUuid: { type: 'string', description: '父节点UUID (用于 create-nested)' },
                prefabPath: { type: 'string', description: '预制体资源路径 (用于 create-nested)' },
                prefabUuid: { type: 'string', description: '预制体资源UUID (用于 create-nested, create-variant)' },
                name: { type: 'string', description: '节点名称 (用于 create-nested)' },
                targetPath: { type: 'string', description: '变体保存路径 (用于 create-variant)' }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'create-nested': return await this.createNested(args);
            case 'create-variant': return await this.createVariant(args);
            case 'apply-override': return await this.applyOverride(args);
            case 'revert-override': return await this.revertOverride(args);
            case 'get-override': return await this.getOverride(args);
            case 'disconnect': return await this.disconnectPrefab(args);
            case 'get-nested': return await this.getNested(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async createNested(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'parentUuid');
        if (missing) return missing;

        let assetUuid = args.prefabUuid;
        if (args.prefabPath && !assetUuid) {
            const uuid = await this.resolveAssetUuid(args.prefabPath);
            if (!uuid) return { success: false, error: `Prefab not found: ${args.prefabPath}` };
            assetUuid = uuid;
        }

        if (!assetUuid) return { success: false, error: 'prefabPath or prefabUuid is required' };

        const createOptions: any = {
            parent: args.parentUuid,
            assetUuid
        };
        if (args.name) createOptions.name = args.name;

        const result = await this.exec('scene', 'create-node', createOptions);
        if (!result.success) return result;

        const newUuid = Array.isArray(result.data) ? result.data[0] : result.data;

        return {
            success: true,
            message: `Nested prefab instance created`,
            data: { uuid: newUuid, parentUuid: args.parentUuid, prefabAsset: assetUuid }
        };
    }

    private async createVariant(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'prefabPath');
        if (missing) return missing;

        const targetPath = args.targetPath || args.prefabPath.replace('.prefab', '_variant.prefab');

        const result = await this.exec('asset-db', 'copy-asset', {
            source: args.prefabPath,
            target: targetPath
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Prefab variant created at ${targetPath}`,
            data: { source: args.prefabPath, target: targetPath }
        };
    }

    private async applyOverride(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'save-prefab', args.uuid);
        if (!result.success) return result;

        return {
            success: true,
            message: 'Prefab overrides applied successfully',
            data: { uuid: args.uuid }
        };
    }

    private async revertOverride(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'restore-prefab', args.uuid);
        if (!result.success) return result;

        return {
            success: true,
            message: 'Prefab overrides reverted successfully',
            data: { uuid: args.uuid }
        };
    }

    private async getOverride(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const node = result.data;
        const overrides: string[] = [];
        if (node.__prefab__) {
            const prefabInfo = node.__prefab__;
            if (prefabInfo.overrides) {
                for (const override of prefabInfo.overrides) {
                    overrides.push(override.propertyPath || override.path || 'unknown');
                }
            }
        }

        return {
            success: true,
            data: { uuid: args.uuid, overrides, hasOverrides: overrides.length > 0 }
        };
    }

    private async disconnectPrefab(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'unlinkPrefab',
            args: [args.uuid]
        });
        if (!result.success) return result;

        return {
            success: true,
            message: 'Prefab connection disconnected',
            data: { uuid: args.uuid }
        };
    }

    private async getNested(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node-tree', args.uuid);
        if (!result.success) return result;

        const collectNested = (node: any): any[] => {
            const nested: any[] = [];
            if (node.__prefab__ || node.prefab) {
                nested.push({
                    name: node.name,
                    uuid: node.uuid,
                    prefabUuid: node.__prefab__?.uuid || node.prefab?.uuid
                });
            }
            if (node.children) {
                for (const child of node.children) {
                    nested.push(...collectNested(child));
                }
            }
            return nested;
        };

        const nestedPrefabs = collectNested(result.data);

        return {
            success: true,
            data: { uuid: args.uuid, nestedCount: nestedPrefabs.length, nested: nestedPrefabs }
        };
    }
}
