// @ts-nocheck
/**
 * TiledMap管理工具 (tiledmap_manage)
 * 统一管理 TiledMap 组件的添加、移除、查询、TMX资源设置等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class TiledMapManage extends UnifiedToolBase {
    name = 'tiledmap_manage';
    description = 'TiledMap管理工具。支持操作: add(添加TiledMap组件), remove(移除TiledMap组件), get(获取TiledMap组件), set-tmx(设置TMX资源), set-culling(设置剔除模式), get-layers(获取图层列表), get-properties(获取地图属性)';
    actions = ['add', 'remove', 'get', 'set-tmx', 'set-culling', 'get-layers', 'get-properties'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: { type: 'string', description: '节点UUID' },
                tmxPath: { type: 'string', description: 'TMX资源路径 (用于 set-tmx)' },
                tmxUuid: { type: 'string', description: 'TMX资源UUID (用于 set-tmx)' },
                culling: { type: 'boolean', description: '是否启用剔除 (用于 set-culling)' }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addTiledMap(args);
            case 'remove': return await this.removeTiledMap(args);
            case 'get': return await this.getTiledMap(args);
            case 'set-tmx': return await this.setTmxAsset(args);
            case 'set-culling': return await this.setCulling(args);
            case 'get-layers': return await this.getLayers(args);
            case 'get-properties': return await this.getProperties(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addTiledMap(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: 'cc.TiledMap'
        });
        if (!result.success) return result;

        return {
            success: true,
            data: { uuid: args.uuid, componentType: 'cc.TiledMap' },
            message: 'TiledMap component added successfully'
        };
    }

    private async removeTiledMap(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, 'cc.TiledMap');
        if (!('comp' in found)) return found;

        return await this.execMsg(
            'TiledMap component removed successfully',
            'scene', 'remove-component', { uuid: found.comp.uuid }
        );
    }

    private async getTiledMap(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, 'cc.TiledMap');
        if (!('comp' in found)) return found;

        return {
            success: true,
            data: {
                uuid: args.uuid,
                componentUuid: found.comp.uuid,
                type: found.comp.__type__,
                enabled: found.comp.enabled ?? true,
                properties: found.comp
            }
        };
    }

    private async setTmxAsset(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        let assetUuid = args.tmxUuid;
        if (args.tmxPath && !assetUuid) {
            const uuid = await this.resolveAssetUuid(args.tmxPath);
            if (!uuid) return { success: false, error: `TMX asset not found: ${args.tmxPath}` };
            assetUuid = uuid;
        }

        if (!assetUuid) return { success: false, error: 'tmxPath or tmxUuid is required' };

        const result = await this.setSceneProperty(args.uuid, '__comps__.cc.TiledMap.tmxAsset', assetUuid, 'tiledMapAsset');
        if (!result.success) return result;

        return {
            success: true,
            message: 'TiledMap TMX asset set successfully',
            data: { uuid: args.uuid, tmxAsset: assetUuid }
        };
    }

    private async setCulling(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'culling');
        if (missing) return missing;

        const result = await this.setSceneProperty(args.uuid, '__comps__.cc.TiledMap.culling', args.culling);
        if (!result.success) return result;

        return {
            success: true,
            message: `TiledMap culling set to ${args.culling}`,
            data: { uuid: args.uuid, culling: args.culling }
        };
    }

    private async getLayers(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'getTiledMapLayers',
            args: [args.uuid]
        });
        if (!result.success) return result;

        return {
            success: true,
            data: { uuid: args.uuid, layers: result.data }
        };
    }

    private async getProperties(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'getTiledMapProperties',
            args: [args.uuid]
        });
        if (!result.success) return result;

        return {
            success: true,
            data: { uuid: args.uuid, properties: result.data }
        };
    }
}
