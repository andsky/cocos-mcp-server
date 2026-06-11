// @ts-nocheck
/**
 * Bundle管理工具 (bundle_manage)
 * 统一管理资源包的查询、创建、移除、配置等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class BundleManage extends UnifiedToolBase {
    name = 'bundle_manage';
    description = 'Bundle管理工具。支持操作: list(列出Bundle), info(获取Bundle信息), create(创建Bundle), remove(移除Bundle), set-priority(设置优先级), set-compression(设置压缩), set-platforms(设置目标平台), get-assets(获取Bundle内资源)';
    actions = ['list', 'info', 'create', 'remove', 'set-priority', 'set-compression', 'set-platforms', 'get-assets'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                url: { type: 'string', description: 'Bundle路径 (db://assets/...)' },
                uuid: { type: 'string', description: 'Bundle UUID' },
                name: { type: 'string', description: 'Bundle名称 (用于 create)' },
                priority: { type: 'number', description: '优先级数值 (用于 set-priority)' },
                compressionType: { type: 'string', description: '压缩类型 (用于 set-compression)', enum: ['none', 'merge_all_json', 'merge_subpackages_json', 'mini_game_subpackages'] },
                platforms: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '目标平台列表 (用于 set-platforms)',
                    enum: ['web-mobile', 'web-desktop', 'native', 'wechatgame', 'bytedance-mini-game', 'alipay-mini-game', 'oppo-mini-game', 'huawei-quick-game']
                },
                isSceneBundle: { type: 'boolean', description: '是否为场景Bundle (用于 create)', default: false }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'list': return await this.listBundles(args);
            case 'info': return await this.getBundleInfo(args);
            case 'create': return await this.createBundle(args);
            case 'remove': return await this.removeBundle(args);
            case 'set-priority': return await this.setPriority(args);
            case 'set-compression': return await this.setCompression(args);
            case 'set-platforms': return await this.setPlatforms(args);
            case 'get-assets': return await this.getAssets(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async listBundles(args: any): Promise<ToolResponse> {
        const result = await this.exec('asset-db', 'query-assets', {
            path: args.url || 'db://assets',
            type: 'folder'
        });
        if (!result.success) return result;

        const bundles = (result.data || []).filter((a: any) =>
            a.meta && a.meta.isBundle
        ).map((a: any) => ({
            name: a.name,
            path: a.path,
            uuid: a.uuid,
            priority: a.meta?.priority || 0,
            compressionType: a.meta?.compressionType || 'none',
            platforms: a.meta?.platforms || []
        }));

        return {
            success: true,
            data: { total: bundles.length, bundles }
        };
    }

    private async getBundleInfo(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };
        const key = args.url || args.uuid;

        const result = await this.exec('asset-db', 'query-asset-info', key);
        if (!result.success) return result;
        if (!result.data) return { success: false, error: `Bundle not found: ${key}` };

        return {
            success: true,
            data: {
                name: result.data.name,
                path: result.data.path,
                uuid: result.data.uuid,
                isBundle: result.data.meta?.isBundle || false,
                priority: result.data.meta?.priority || 0,
                compressionType: result.data.meta?.compressionType || 'none',
                platforms: result.data.meta?.platforms || [],
                meta: result.data.meta
            }
        };
    }

    private async createBundle(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'name');
        if (missing) return missing;

        const targetPath = args.url || `db://assets/${args.name}`;
        const createResult = await this.exec('asset-db', 'create-folder', targetPath);
        if (!createResult.success) return createResult;

        const folderInfo = await this.exec('asset-db', 'query-asset-info', targetPath);
        if (!folderInfo.success) return folderInfo;
        if (!folderInfo.data) return { success: false, error: `Created folder not found: ${targetPath}` };

        const metaUpdate: any = {
            isBundle: true,
            priority: args.priority || 1,
            compressionType: args.compressionType || 'none'
        };
        if (args.isSceneBundle) metaUpdate.isSceneBundle = true;

        const saveResult = await this.exec('asset-db', 'save-asset', {
            uuid: folderInfo.data.uuid,
            meta: metaUpdate
        });
        if (!saveResult.success) return saveResult;

        return {
            success: true,
            message: `Bundle '${args.name}' created at ${targetPath}`,
            data: { name: args.name, path: targetPath, uuid: folderInfo.data.uuid }
        };
    }

    private async removeBundle(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };
        const key = args.url || args.uuid;

        const infoResult = await this.exec('asset-db', 'query-asset-info', key);
        if (!infoResult.success) return infoResult;
        if (!infoResult.data) return { success: false, error: `Bundle not found: ${key}` };

        const saveResult = await this.exec('asset-db', 'save-asset', {
            uuid: infoResult.data.uuid,
            meta: { isBundle: false }
        });
        if (!saveResult.success) return saveResult;

        return {
            success: true,
            message: `Bundle removed: ${key}`,
            data: { key }
        };
    }

    private async setPriority(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'priority');
        if (missing) return missing;
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };

        const key = args.url || args.uuid;
        const infoResult = await this.exec('asset-db', 'query-asset-info', key);
        if (!infoResult.success) return infoResult;
        if (!infoResult.data) return { success: false, error: `Bundle not found: ${key}` };

        const result = await this.exec('asset-db', 'save-asset', {
            uuid: infoResult.data.uuid,
            meta: { priority: args.priority }
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Bundle priority set to ${args.priority}`,
            data: { key, priority: args.priority }
        };
    }

    private async setCompression(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'compressionType');
        if (missing) return missing;
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };

        const key = args.url || args.uuid;
        const infoResult = await this.exec('asset-db', 'query-asset-info', key);
        if (!infoResult.success) return infoResult;
        if (!infoResult.data) return { success: false, error: `Bundle not found: ${key}` };

        const result = await this.exec('asset-db', 'save-asset', {
            uuid: infoResult.data.uuid,
            meta: { compressionType: args.compressionType }
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Bundle compression set to '${args.compressionType}'`,
            data: { key, compressionType: args.compressionType }
        };
    }

    private async setPlatforms(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'platforms');
        if (missing) return missing;
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };

        const key = args.url || args.uuid;
        const infoResult = await this.exec('asset-db', 'query-asset-info', key);
        if (!infoResult.success) return infoResult;
        if (!infoResult.data) return { success: false, error: `Bundle not found: ${key}` };

        const result = await this.exec('asset-db', 'save-asset', {
            uuid: infoResult.data.uuid,
            meta: { platforms: args.platforms }
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Bundle platforms set to [${args.platforms.join(', ')}]`,
            data: { key, platforms: args.platforms }
        };
    }

    private async getAssets(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };
        const key = args.url || args.uuid;

        const result = await this.exec('asset-db', 'query-assets', {
            path: key
        });
        if (!result.success) return result;

        const assets = (result.data || []).map((a: any) => ({
            name: a.name,
            path: a.path,
            uuid: a.uuid,
            type: a.type
        }));

        return {
            success: true,
            data: { total: assets.length, assets }
        };
    }
}
