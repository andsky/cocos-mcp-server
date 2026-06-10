// @ts-nocheck
/**
 * 资源管理工具 (asset_manage)
 * 统一管理资源的导入、删除、移动、复制、保存、打开等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class AssetManage extends UnifiedToolBase {
    name = 'asset_manage';
    description = '资源管理工具。支持操作: import(导入资源), create(创建资源), delete(删除资源), copy(复制资源), move(移动资源), info(获取资源信息,支持url或uuid), list(列出资源), save(保存资源), open(打开资源)';
    actions = ['import', 'create', 'delete', 'copy', 'move', 'info', 'list', 'save', 'open'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                url: {
                    type: 'string',
                    description: '资源路径 (用于 create, delete, info, save, open)'
                },
                uuid: {
                    type: 'string',
                    description: '资源UUID (用于 query, save)'
                },
                source: {
                    type: 'string',
                    description: '源路径 (用于 import, copy, move)'
                },
                target: {
                    type: 'string',
                    description: '目标路径 (用于 copy, move)'
                },
                targetFolder: {
                    type: 'string',
                    description: '目标文件夹 (用于 import)'
                },
                content: {
                    type: 'string',
                    description: '资源内容 (用于 create, save)'
                },
                overwrite: {
                    type: 'boolean',
                    description: '是否覆盖',
                    default: false
                },
                type: {
                    type: 'string',
                    description: '资源类型 (用于 list, query)'
                },
                folder: {
                    type: 'string',
                    description: '搜索文件夹 (用于 list)',
                    default: 'db://assets'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'import': return await this.importAsset(args);
            case 'create': return await this.createAsset(args);
            case 'delete': return await this.deleteAsset(args);
            case 'copy': return await this.copyAsset(args);
            case 'move': return await this.moveAsset(args);
            case 'info': return await this.getAssetInfo(args);
            case 'list': return await this.listAssets(args);
            case 'save': return await this.saveAsset(args);
            case 'open': return await this.openAsset(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async importAsset(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'source', 'targetFolder');
        if (missing) return missing;
        const result = await this.exec('asset-db', 'import-asset', { source: args.source, target: args.targetFolder });
        if (!result.success) return result;
        return { success: true, message: `Asset imported to ${args.targetFolder}`, data: { source: args.source, targetFolder: args.targetFolder } };
    }

    private async createAsset(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;
        let result: ToolResponse;
        if (args.content === null || args.content === undefined) {
            result = await this.exec('asset-db', 'create-folder', args.url);
        } else {
            result = await this.exec('asset-db', 'create-asset', { source: args.content, target: args.url, overwrite: args.overwrite ?? false });
        }
        if (!result.success) return result;
        return { success: true, message: `Asset created at ${args.url}`, data: { url: args.url, isFolder: args.content === null } };
    }

    private async deleteAsset(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;
        return await this.execMsg(`Asset deleted: ${args.url}`, 'asset-db', 'delete-asset', args.url);
    }

    private async copyAsset(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'source', 'target');
        if (missing) return missing;
        const result = await this.exec('asset-db', 'copy-asset', { source: args.source, target: args.target, overwrite: args.overwrite ?? false });
        if (!result.success) return result;
        return { success: true, message: `Asset copied to ${args.target}`, data: { source: args.source, target: args.target } };
    }

    private async moveAsset(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'source', 'target');
        if (missing) return missing;
        const result = await this.exec('asset-db', 'move-asset', { source: args.source, target: args.target, overwrite: args.overwrite ?? false });
        if (!result.success) return result;
        return { success: true, message: `Asset moved to ${args.target}`, data: { source: args.source, target: args.target } };
    }

    private async getAssetInfo(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };
        const key = args.url || args.uuid;
        const result = await this.exec('asset-db', 'query-asset-info', key);
        if (!result.success) return result;
        if (!result.data) return { success: false, error: `Asset not found: ${key}` };
        return {
            success: true,
            data: { name: result.data.name, path: result.data.path, uuid: result.data.uuid, type: result.data.type, isSubAsset: result.data.isSubAsset }
        };
    }

    private async listAssets(args: any): Promise<ToolResponse> {
        const queryOptions: any = { path: args.folder || 'db://assets' };
        if (args.type && args.type !== 'all') queryOptions.type = args.type;
        const result = await this.exec('asset-db', 'query-assets', queryOptions);
        if (!result.success) return result;
        const assetList = (result.data || []).map((a: any) => ({ name: a.name, path: a.path, uuid: a.uuid, type: a.type }));
        return { success: true, data: { total: assetList.length, assets: assetList } };
    }

    private async saveAsset(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };
        if (args.content === undefined) return { success: false, error: 'content is required' };

        const key = args.uuid || args.url;
        const result = await this.exec('asset-db', 'save-asset', {
            uuid: args.uuid || undefined,
            path: args.url || undefined,
            content: args.content
        });
        if (!result.success) return result;
        return { success: true, message: `Asset saved: ${args.url || args.uuid}`, data: { url: args.url, uuid: args.uuid } };
    }

    private async openAsset(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;
        const result = await this.exec('asset-db', 'open-asset', args.url);
        if (!result.success) return result;
        return { success: true, message: `Asset opened: ${args.url}`, data: { url: args.url } };
    }
}
