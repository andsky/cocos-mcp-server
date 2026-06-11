// @ts-nocheck
/**
 * 字体管理工具 (font_manage)
 * 统一管理字体资源的查询、导入、删除、设置等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class FontManage extends UnifiedToolBase {
    name = 'font_manage';
    description = '字体管理工具。支持操作: list(列出字体), info(获取字体信息), import(导入字体), delete(删除字体), set-font(设置Label字体), set-label-atlas(设置LabelAtlas)';
    actions = ['list', 'info', 'import', 'delete', 'set-font', 'set-label-atlas'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                url: { type: 'string', description: '字体资源路径 (db://assets/...)' },
                uuid: { type: 'string', description: '字体资源UUID' },
                nodeUuid: { type: 'string', description: '节点UUID (用于 set-font, set-label-atlas)' },
                fontPath: { type: 'string', description: '字体资源路径 (用于 set-font)' },
                fontUuid: { type: 'string', description: '字体资源UUID (用于 set-font)' },
                labelAtlasPath: { type: 'string', description: 'LabelAtlas资源路径 (用于 set-label-atlas)' },
                labelAtlasUuid: { type: 'string', description: 'LabelAtlas资源UUID (用于 set-label-atlas)' },
                source: { type: 'string', description: '源文件路径 (用于 import)' },
                targetFolder: { type: 'string', description: '导入目标文件夹 (用于 import)' },
                folder: { type: 'string', description: '搜索文件夹 (用于 list)', default: 'db://assets' }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'list': return await this.listFonts(args);
            case 'info': return await this.getFontInfo(args);
            case 'import': return await this.importFont(args);
            case 'delete': return await this.deleteFont(args);
            case 'set-font': return await this.setFont(args);
            case 'set-label-atlas': return await this.setLabelAtlas(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async listFonts(args: any): Promise<ToolResponse> {
        const result = await this.exec('asset-db', 'query-assets', {
            path: args.folder || 'db://assets'
        });
        if (!result.success) return result;

        const fontList = (result.data || []).filter((a: any) =>
            a.type === 'cc.Font' || a.type === 'cc.BitmapFont' || a.type === 'cc.LabelAtlas'
        ).map((a: any) => ({
            name: a.name,
            path: a.path,
            uuid: a.uuid,
            type: a.type
        }));

        return {
            success: true,
            data: { total: fontList.length, fonts: fontList }
        };
    }

    private async getFontInfo(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };
        const key = args.url || args.uuid;

        const result = await this.exec('asset-db', 'query-asset-info', key);
        if (!result.success) return result;
        if (!result.data) return { success: false, error: `Font not found: ${key}` };

        return {
            success: true,
            data: {
                name: result.data.name,
                path: result.data.path,
                uuid: result.data.uuid,
                type: result.data.type,
                meta: result.data.meta
            }
        };
    }

    private async importFont(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'source', 'targetFolder');
        if (missing) return missing;

        const result = await this.exec('asset-db', 'import-asset', {
            source: args.source,
            target: args.targetFolder
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Font imported to ${args.targetFolder}`,
            data: { source: args.source, targetFolder: args.targetFolder }
        };
    }

    private async deleteFont(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;

        return await this.execMsg(
            `Font deleted: ${args.url}`,
            'asset-db', 'delete-asset', args.url
        );
    }

    private async setFont(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'nodeUuid');
        if (missing) return missing;

        let assetUuid = args.fontUuid;
        if (args.fontPath && !assetUuid) {
            const uuid = await this.resolveAssetUuid(args.fontPath);
            if (!uuid) return { success: false, error: `Font not found: ${args.fontPath}` };
            assetUuid = uuid;
        }

        if (!assetUuid) return { success: false, error: 'fontPath or fontUuid is required' };

        const result = await this.setSceneProperty(args.nodeUuid, '__comps__.cc.Label.font', assetUuid, 'font');
        if (!result.success) return result;

        return {
            success: true,
            message: 'Label font set successfully',
            data: { nodeUuid: args.nodeUuid, font: assetUuid }
        };
    }

    private async setLabelAtlas(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'nodeUuid');
        if (missing) return missing;

        let assetUuid = args.labelAtlasUuid;
        if (args.labelAtlasPath && !assetUuid) {
            const uuid = await this.resolveAssetUuid(args.labelAtlasPath);
            if (!uuid) return { success: false, error: `LabelAtlas not found: ${args.labelAtlasPath}` };
            assetUuid = uuid;
        }

        if (!assetUuid) return { success: false, error: 'labelAtlasPath or labelAtlasUuid is required' };

        const result = await this.setSceneProperty(args.nodeUuid, '__comps__.cc.Label.font', assetUuid, 'labelAtlas');
        if (!result.success) return result;

        return {
            success: true,
            message: 'Label LabelAtlas set successfully',
            data: { nodeUuid: args.nodeUuid, labelAtlas: assetUuid }
        };
    }
}
