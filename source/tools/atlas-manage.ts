// @ts-nocheck
/**
 * 图集管理工具 (atlas_manage)
 * 统一管理精灵图集的查询、创建、删除、打包、精灵查询等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class AtlasManage extends UnifiedToolBase {
    name = 'atlas_manage';
    description = '图集管理工具。支持操作: list(列出图集), info(获取图集信息), create(创建图集), delete(删除图集), pack(重新打包), get-sprites(获取子精灵), set-settings(设置图集参数)';
    actions = ['list', 'info', 'create', 'delete', 'pack', 'get-sprites', 'set-settings'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                url: { type: 'string', description: '图集资源路径 (db://assets/...)' },
                uuid: { type: 'string', description: '图集资源UUID' },
                name: { type: 'string', description: '图集名称 (用于 create)' },
                targetFolder: { type: 'string', description: '创建目标文件夹 (用于 create)' },
                maxWidth: { type: 'number', description: '最大宽度 (用于 set-settings)' },
                maxHeight: { type: 'number', description: '最大高度 (用于 set-settings)' },
                padding: { type: 'number', description: '内边距 (用于 set-settings)' },
                forceSquared: { type: 'boolean', description: '强制正方形 (用于 set-settings)' },
                powerOfTwo: { type: 'boolean', description: '2的幂次 (用于 set-settings)' },
                algorithm: { type: 'string', description: '打包算法 (用于 set-settings)', enum: ['RectBestShortSideFit', 'RectBestLongSideFit', 'RectBestAreaFit', 'RectBottomLeftRule', 'RectContactPointRule'] },
                format: { type: 'string', description: '纹理格式 (用于 set-settings)', enum: ['rgba8888', 'rgb888', 'rgba4444', 'rgb565', 'alpha'] }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'list': return await this.listAtlases(args);
            case 'info': return await this.getAtlasInfo(args);
            case 'create': return await this.createAtlas(args);
            case 'delete': return await this.deleteAtlas(args);
            case 'pack': return await this.packAtlas(args);
            case 'get-sprites': return await this.getSprites(args);
            case 'set-settings': return await this.setSettings(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async listAtlases(args: any): Promise<ToolResponse> {
        const result = await this.exec('asset-db', 'query-assets', { ccType: 'sprite-atlas' });
        if (!result.success) return result;

        const atlasList = (result.data || []).map((a: any) => ({
            name: a.name,
            path: a.path,
            uuid: a.uuid,
            type: a.type
        }));

        return {
            success: true,
            data: { total: atlasList.length, atlases: atlasList }
        };
    }

    private async getAtlasInfo(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };
        const key = args.url || args.uuid;

        const result = await this.exec('asset-db', 'query-asset-info', key);
        if (!result.success) return result;
        if (!result.data) return { success: false, error: `Atlas not found: ${key}` };

        return {
            success: true,
            data: {
                name: result.data.name,
                path: result.data.path,
                uuid: result.data.uuid,
                type: result.data.type,
                subAssets: result.data.subAssets
            }
        };
    }

    private async createAtlas(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'name');
        if (missing) return missing;

        const targetFolder = args.targetFolder || 'db://assets';
        const targetPath = `${targetFolder}/${args.name}.pac`;

        const result = await this.exec('asset-db', 'create-asset', {
            source: '',
            target: targetPath
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Atlas created at ${targetPath}`,
            data: { name: args.name, path: targetPath }
        };
    }

    private async deleteAtlas(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;

        return await this.execMsg(
            `Atlas deleted: ${args.url}`,
            'asset-db', 'delete-asset', args.url
        );
    }

    private async packAtlas(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };
        const key = args.url || args.uuid;

        const result = await this.exec('asset-db', 'refresh-asset', key);
        if (!result.success) return result;

        return {
            success: true,
            message: `Atlas repacked: ${key}`,
            data: { key }
        };
    }

    private async getSprites(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };
        const key = args.url || args.uuid;

        const result = await this.exec('asset-db', 'query-asset-info', key);
        if (!result.success) return result;
        if (!result.data) return { success: false, error: `Atlas not found: ${key}` };

        const subAssets = result.data.subAssets || {};
        const sprites = Object.entries(subAssets).map(([name, info]: [string, any]) => ({
            name,
            uuid: info.uuid,
            type: info.type
        }));

        return {
            success: true,
            data: { total: sprites.length, sprites }
        };
    }

    private async setSettings(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };

        const key = args.url || args.uuid;
        const infoResult = await this.exec('asset-db', 'query-asset-info', key);
        if (!infoResult.success) return infoResult;
        if (!infoResult.data) return { success: false, error: `Atlas not found: ${key}` };

        const updates: string[] = [];
        const errors: string[] = [];
        const settings: any = {};

        const settingMap: Record<string, string> = {
            maxWidth: 'maxWidth',
            maxHeight: 'maxHeight',
            padding: 'padding',
            forceSquared: 'forceSquared',
            powerOfTwo: 'powerOfTwo',
            algorithm: 'algorithm',
            format: 'format'
        };

        for (const [argKey, metaKey] of Object.entries(settingMap)) {
            if (args[argKey] !== undefined) {
                settings[metaKey] = args[argKey];
                updates.push(argKey);
            }
        }

        if (updates.length === 0) return { success: false, error: 'No settings specified' };

        const result = await this.exec('asset-db', 'save-asset', {
            uuid: infoResult.data.uuid,
            meta: settings
        });

        if (!result.success) {
            return { success: false, error: `Failed to save settings: ${result.error}` };
        }

        return {
            success: true,
            message: `Atlas settings updated: ${updates.join(', ')}`,
            data: { key, updates }
        };
    }
}
