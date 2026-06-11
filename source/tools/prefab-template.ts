// @ts-nocheck
/**
 * 预制体模板工具 (prefab_template)
 * 统一管理预制体模板的查询、创建、实例化、保存等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class PrefabTemplate extends UnifiedToolBase {
    name = 'prefab_template';
    description = '预制体模板工具。支持操作: list(列出预制体), create(创建预制体), instantiate(实例化预制体), save-as-template(保存为模板), get-types(获取类型列表)';
    actions = ['list', 'create', 'instantiate', 'save-as-template', 'get-types'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: { type: 'string', description: '节点UUID (用于 create, save-as-template)' },
                parentUuid: { type: 'string', description: '父节点UUID (用于 instantiate)' },
                name: { type: 'string', description: '预制体名称 (用于 create, instantiate)' },
                prefabPath: { type: 'string', description: '预制体资源路径 (用于 instantiate)' },
                prefabUuid: { type: 'string', description: '预制体资源UUID (用于 instantiate)' },
                savePath: { type: 'string', description: '保存路径 (用于 create, save-as-template)' },
                folder: { type: 'string', description: '搜索文件夹 (用于 list)', default: 'db://assets' }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'list': return await this.listPrefabs(args);
            case 'create': return await this.createPrefab(args);
            case 'instantiate': return await this.instantiatePrefab(args);
            case 'save-as-template': return await this.saveAsTemplate(args);
            case 'get-types': return await this.getTypes(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async listPrefabs(args: any): Promise<ToolResponse> {
        const result = await this.exec('asset-db', 'query-assets', {
            type: 'cc.Prefab',
            path: args.folder || 'db://assets'
        });
        if (!result.success) return result;

        const prefabList = (result.data || []).map((a: any) => ({
            name: a.name,
            path: a.path,
            uuid: a.uuid
        }));

        return {
            success: true,
            data: { total: prefabList.length, prefabs: prefabList }
        };
    }

    private async createPrefab(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        if (!args.savePath) return { success: false, error: 'savePath is required for create' };

        // 直接使用编辑器主进程 API 创建预制体
        const nodeResult = await this.exec('scene', 'query-node', args.uuid);
        if (!nodeResult.success) return nodeResult;
        if (!nodeResult.data) return { success: false, error: `Node not found: ${args.uuid}` };

        const result = await this.exec('scene', 'create-prefab', {
            node: args.uuid,
            path: args.savePath
        });
        if (!result.success) return result;

        const prefabName = args.savePath.split('/').pop()?.replace('.prefab', '') || 'unknown';
        return {
            success: true,
            message: `Prefab '${prefabName}' created from node`,
            data: { nodeUuid: args.uuid, prefabPath: args.savePath, prefabUuid: result.data }
        };
    }

    private async instantiatePrefab(args: any): Promise<ToolResponse> {
        let assetUuid = args.prefabUuid;
        if (args.prefabPath && !assetUuid) {
            const uuid = await this.resolveAssetUuid(args.prefabPath);
            if (!uuid) return { success: false, error: `Prefab not found: ${args.prefabPath}` };
            assetUuid = uuid;
        }

        if (!assetUuid) return { success: false, error: 'prefabPath or prefabUuid is required' };

        let targetParentUuid = args.parentUuid;
        if (!targetParentUuid) {
            const sceneInfo = await this.exec('scene', 'query-node-tree');
            if (sceneInfo.success) {
                const tree = sceneInfo.data;
                targetParentUuid = tree?.uuid || (Array.isArray(tree) ? tree[0]?.uuid : undefined);
            }
        }

        const createOptions: any = { assetUuid };
        if (args.name) createOptions.name = args.name;
        if (targetParentUuid) createOptions.parent = targetParentUuid;

        const result = await this.exec('scene', 'create-node', createOptions);
        if (!result.success) return result;

        const newUuid = Array.isArray(result.data) ? result.data[0] : result.data;

        return {
            success: true,
            message: `Prefab instantiated: ${args.name || 'unnamed'}`,
            data: { uuid: newUuid, parentUuid: targetParentUuid, prefabAsset: assetUuid }
        };
    }

    private async saveAsTemplate(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-prefab', {
            node: args.uuid,
            path: args.savePath || undefined
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Node saved as prefab template`,
            data: { nodeUuid: args.uuid, savePath: args.savePath || result.data }
        };
    }

    private async getTypes(args: any): Promise<ToolResponse> {
        return {
            success: true,
            data: {
                types: [
                    { name: 'Node', description: '基础节点' },
                    { name: 'Sprite', description: '精灵节点 (cc.Sprite + cc.UITransform)' },
                    { name: 'Label', description: '文本节点 (cc.Label + cc.UITransform)' },
                    { name: 'Button', description: '按钮节点 (cc.Button + cc.UITransform + cc.Sprite)' },
                    { name: 'Layout', description: '布局节点 (cc.Layout + cc.UITransform)' },
                    { name: 'ScrollView', description: '滚动视图节点' },
                    { name: 'EditBox', description: '输入框节点' },
                    { name: 'ProgressBar', description: '进度条节点' },
                    { name: 'Slider', description: '滑动条节点' },
                    { name: 'Toggle', description: '开关节点' },
                    { name: 'PageView', description: '翻页节点' },
                    { name: 'Mask', description: '遮罩节点' }
                ]
            }
        };
    }
}
