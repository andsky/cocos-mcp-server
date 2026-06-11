// @ts-nocheck
/**
 * 纹理管理工具 (texture_manage)
 * 统一管理纹理资源的查询、类型设置、环绕模式、过滤模式、压缩等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class TextureManage extends UnifiedToolBase {
    name = 'texture_manage';
    description = '纹理管理工具。支持操作: list(列出纹理), info(获取纹理信息), set-type(设置纹理类型), set-wrap(设置环绕模式), set-filter(设置过滤模式), set-compress(设置压缩), batch-compress(批量压缩)';
    actions = ['list', 'info', 'set-type', 'set-wrap', 'set-filter', 'set-compress', 'batch-compress'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                url: { type: 'string', description: '纹理资源路径 (db://assets/...)' },
                uuid: { type: 'string', description: '纹理资源UUID' },
                folder: { type: 'string', description: '搜索文件夹 (用于 list)', default: 'db://assets' },
                textureType: { type: 'string', description: '纹理类型 (用于 set-type)', enum: ['raw', 'sprite-frame', 'texture'] },
                wrapMode: { type: 'string', description: '环绕模式 (用于 set-wrap)', enum: ['repeat', 'clamp-to-edge', 'mirrored-repeat'] },
                filterMode: { type: 'string', description: '过滤模式 (用于 set-filter)', enum: ['nearest', 'linear', 'bilinear', 'trilinear'] },
                compressFormat: { type: 'string', description: '压缩格式 (用于 set-compress)', enum: ['etc1', 'etc2', 'astc', 'pvrtc', 's3tc', 'no-compression'] },
                quality: { type: 'number', description: '压缩质量 0-100 (用于 set-compress)' },
                platforms: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '目标平台列表 (用于 batch-compress)',
                    default: ['android', 'ios']
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'list': return await this.listTextures(args);
            case 'info': return await this.getTextureInfo(args);
            case 'set-type': return await this.setType(args);
            case 'set-wrap': return await this.setWrap(args);
            case 'set-filter': return await this.setFilter(args);
            case 'set-compress': return await this.setCompress(args);
            case 'batch-compress': return await this.batchCompress(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async listTextures(args: any): Promise<ToolResponse> {
        const result = await this.exec('asset-db', 'query-assets', {
            type: 'cc.ImageAsset',
            path: args.folder || 'db://assets'
        });
        if (!result.success) return result;

        const textureList = (result.data || []).map((a: any) => ({
            name: a.name,
            path: a.path,
            uuid: a.uuid,
            type: a.type
        }));

        return {
            success: true,
            data: { total: textureList.length, textures: textureList }
        };
    }

    private async getTextureInfo(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };
        const key = args.url || args.uuid;

        const result = await this.exec('asset-db', 'query-asset-info', key);
        if (!result.success) return result;
        if (!result.data) return { success: false, error: `Texture not found: ${key}` };

        return {
            success: true,
            data: {
                name: result.data.name,
                path: result.data.path,
                uuid: result.data.uuid,
                type: result.data.type,
                width: result.data.width,
                height: result.data.height,
                meta: result.data.meta
            }
        };
    }

    private async setType(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'textureType');
        if (missing) return missing;
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };

        const key = args.url || args.uuid;
        const infoResult = await this.exec('asset-db', 'query-asset-info', key);
        if (!infoResult.success) return infoResult;
        if (!infoResult.data) return { success: false, error: `Texture not found: ${key}` };

        const result = await this.exec('asset-db', 'save-asset', {
            uuid: infoResult.data.uuid,
            meta: { type: args.textureType }
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Texture type set to '${args.textureType}'`,
            data: { key, textureType: args.textureType }
        };
    }

    private async setWrap(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'wrapMode');
        if (missing) return missing;
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };

        const key = args.url || args.uuid;
        const infoResult = await this.exec('asset-db', 'query-asset-info', key);
        if (!infoResult.success) return infoResult;
        if (!infoResult.data) return { success: false, error: `Texture not found: ${key}` };

        const result = await this.exec('asset-db', 'save-asset', {
            uuid: infoResult.data.uuid,
            meta: { wrapMode: args.wrapMode }
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Texture wrap mode set to '${args.wrapMode}'`,
            data: { key, wrapMode: args.wrapMode }
        };
    }

    private async setFilter(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'filterMode');
        if (missing) return missing;
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };

        const key = args.url || args.uuid;
        const infoResult = await this.exec('asset-db', 'query-asset-info', key);
        if (!infoResult.success) return infoResult;
        if (!infoResult.data) return { success: false, error: `Texture not found: ${key}` };

        const result = await this.exec('asset-db', 'save-asset', {
            uuid: infoResult.data.uuid,
            meta: { filterMode: args.filterMode }
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Texture filter mode set to '${args.filterMode}'`,
            data: { key, filterMode: args.filterMode }
        };
    }

    private async setCompress(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'compressFormat');
        if (missing) return missing;
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };

        const key = args.url || args.uuid;
        const infoResult = await this.exec('asset-db', 'query-asset-info', key);
        if (!infoResult.success) return infoResult;
        if (!infoResult.data) return { success: false, error: `Texture not found: ${key}` };

        const compressSettings: any = { format: args.compressFormat };
        if (args.quality !== undefined) compressSettings.quality = args.quality;

        const result = await this.exec('asset-db', 'save-asset', {
            uuid: infoResult.data.uuid,
            meta: { compressSettings }
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Texture compression set to '${args.compressFormat}'`,
            data: { key, compressFormat: args.compressFormat, quality: args.quality }
        };
    }

    private async batchCompress(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'compressFormat');
        if (missing) return missing;

        const listResult = await this.exec('asset-db', 'query-assets', {
            type: 'cc.ImageAsset',
            path: args.folder || 'db://assets'
        });
        if (!listResult.success) return listResult;

        const textures = listResult.data || [];
        const platforms = args.platforms || ['android', 'ios'];
        let successCount = 0;
        let failCount = 0;

        for (const tex of textures) {
            const compressSettings: any = { format: args.compressFormat, platforms };
            if (args.quality !== undefined) compressSettings.quality = args.quality;

            const result = await this.exec('asset-db', 'save-asset', {
                uuid: tex.uuid,
                meta: { compressSettings }
            });
            if (result.success) successCount++;
            else failCount++;
        }

        return {
            success: true,
            message: `Batch compress complete: ${successCount} succeeded, ${failCount} failed`,
            data: { total: textures.length, successCount, failCount, compressFormat: args.compressFormat }
        };
    }
}
