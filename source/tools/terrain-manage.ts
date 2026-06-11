// @ts-nocheck
/**
 * 地形系统工具 (terrain_manage)
 * 管理 cc.Terrain 组件
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class TerrainManage extends UnifiedToolBase {
    name = 'terrain_manage';
    description = '地形系统工具。支持操作: add(添加组件), remove(移除组件), get(获取信息), set-size(设置尺寸), set-height(设置高度), set-layer(设置图层), set-lighting(设置光照)';
    actions = ['add', 'remove', 'get', 'set-size', 'set-height', 'set-layer', 'set-lighting'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: { type: 'string', description: '节点UUID' },
                tileSize: { type: 'number', description: '地形块大小' },
                blockCount: { type: 'number', description: '地形块数量' },
                x: { type: 'number', description: 'X 坐标 (set-height)' },
                y: { type: 'number', description: 'Y 坐标 (set-height)' },
                height: { type: 'number', description: '高度值 (set-height)' },
                layerIndex: { type: 'number', description: '图层索引 (set-layer)' },
                texturePath: { type: 'string', description: '纹理路径 (set-layer)' },
                lightMapSize: { type: 'number', description: '光照贴图大小 (set-lighting)' }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addTerrain(args);
            case 'remove': return await this.removeTerrain(args);
            case 'get': return await this.getTerrain(args);
            case 'set-size': return await this.setSize(args);
            case 'set-height': return await this.setHeight(args);
            case 'set-layer': return await this.setLayer(args);
            case 'set-lighting': return await this.setLighting(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addTerrain(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;
        return await this.execMsg('Terrain component added', 'scene', 'create-component', { node: args.uuid, type: 'cc.Terrain' });
    }

    private async removeTerrain(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;
        const compResult = await this.findComponentOnNode(args.uuid, 'cc.Terrain');
        if (!('comp' in compResult)) return compResult as ToolResponse;
        if (!compResult.comp) return { success: false, error: 'No Terrain component on node' };
        return await this.execMsg('Terrain component removed', 'scene', 'remove-component', { uuid: compResult.comp.uuid });
    }

    private async getTerrain(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;
        const compResult = await this.findComponentOnNode(args.uuid, 'cc.Terrain');
        if (!('comp' in compResult)) return compResult as ToolResponse;
        return { success: true, data: compResult.comp };
    }

    private async setSize(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;
        const updates: string[] = [];
        if (args.tileSize !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.Terrain.tileSize', args.tileSize);
            if (r.success) updates.push('tileSize');
        }
        if (args.blockCount !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.Terrain.blockCount', args.blockCount);
            if (r.success) updates.push('blockCount');
        }
        if (updates.length === 0) return { success: false, error: 'No size params (tileSize, blockCount)' };
        return { success: true, message: `Terrain size set: ${updates.join(', ')}`, data: { updates } };
    }

    private async setHeight(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'x', 'y', 'height');
        if (missing) return missing;
        // Terrain height 在编辑器模式下通过 set-property 设置
        const propPath = `__comps__.cc.Terrain.heights.${args.y}.${args.x}`;
        return await this.setSceneProperty(args.uuid, propPath, args.height);
    }

    private async setLayer(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'layerIndex');
        if (missing) return missing;
        if (args.texturePath) {
            const textureUuid = await this.resolveAssetUuid(args.texturePath);
            if (!textureUuid) return { success: false, error: `Texture not found: ${args.texturePath}` };
            return await this.setSceneProperty(args.uuid, `__comps__.cc.Terrain.layers.${args.layerIndex}.texture`, textureUuid, 'texture');
        }
        return { success: false, error: 'texturePath is required for set-layer' };
    }

    private async setLighting(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;
        if (args.lightMapSize !== undefined) {
            return await this.setSceneProperty(args.uuid, '__comps__.cc.Terrain.lightMapSize', args.lightMapSize);
        }
        return { success: false, error: 'lightMapSize is required' };
    }
}
