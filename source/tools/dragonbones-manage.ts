// @ts-nocheck
/**
 * DragonBones动画管理工具 (dragonbones_manage)
 * 统一管理 DragonBones 骨骼动画组件的添加、移除、属性设置、动画播放等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class DragonBonesManage extends UnifiedToolBase {
    name = 'dragonbones_manage';
    description = 'DragonBones动画管理工具。支持操作: add(添加DragonBones组件), remove(移除DragonBones组件), get(获取DragonBones信息), set-data(设置骨骼数据), set-animation(设置动画), set-armature(设置骨架名称), get-info(获取详细信息)';
    actions = ['add', 'remove', 'get', 'set-data', 'set-animation', 'set-armature', 'get-info'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                },
                dragonBonesAssetPath: {
                    type: 'string',
                    description: 'DragonBones资源路径 (用于 set-data)'
                },
                dragonBonesAtlasPath: {
                    type: 'string',
                    description: 'DragonBones图集资源路径 (用于 set-data)'
                },
                animationName: {
                    type: 'string',
                    description: '动画名称 (用于 set-animation)'
                },
                playTimes: {
                    type: 'number',
                    description: '播放次数，-1为无限循环 (用于 set-animation)',
                    default: -1
                },
                armatureName: {
                    type: 'string',
                    description: '骨架名称 (用于 set-armature)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addDragonBones(args);
            case 'remove': return await this.removeDragonBones(args);
            case 'get': return await this.getDragonBones(args);
            case 'set-data': return await this.setData(args);
            case 'set-animation': return await this.setAnimation(args);
            case 'set-armature': return await this.setArmature(args);
            case 'get-info': return await this.getDragonBonesInfo(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addDragonBones(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: 'dragonBones.ArmatureDisplay'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: 'DragonBones ArmatureDisplay component added',
            data: { uuid: args.uuid, componentUuid: result.data }
        };
    }

    private async removeDragonBones(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, 'dragonBones.ArmatureDisplay');
        if (!('comp' in found)) return found;

        return await this.execMsg('DragonBones component removed', 'scene', 'remove-component', { uuid: found.comp.uuid });
    }

    private async getDragonBones(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const comp = (result.data?.__comps__ || []).find((c: any) => c.__type__ === 'dragonBones.ArmatureDisplay');
        if (!comp) return { success: false, error: 'No dragonBones.ArmatureDisplay component found on node' };

        return {
            success: true,
            data: {
                uuid: args.uuid,
                componentUuid: comp.uuid,
                dragonBonesAsset: comp.dragonBonesAsset,
                dragonBonesAtlasAsset: comp.dragonBonesAtlasAsset,
                armatureName: comp.armatureName,
                animationName: comp.animationName,
                playTimes: comp.playTimes,
                timeScale: comp.timeScale
            }
        };
    }

    private async setData(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'dragonBonesAssetPath');
        if (missing) return missing;

        const updates: string[] = [];

        const assetUuid = await this.resolveAssetUuid(args.dragonBonesAssetPath);
        if (!assetUuid) return { success: false, error: `DragonBones asset not found: ${args.dragonBonesAssetPath}` };

        const assetResult = await this.setSceneProperty(args.uuid, '__comps__.dragonBones.ArmatureDisplay.dragonBonesAsset', assetUuid, 'dragonBonesAsset');
        if (assetResult.success) updates.push('dragonBonesAsset');

        if (args.dragonBonesAtlasPath) {
            const atlasUuid = await this.resolveAssetUuid(args.dragonBonesAtlasPath);
            if (!atlasUuid) return { success: false, error: `DragonBones atlas not found: ${args.dragonBonesAtlasPath}` };

            const atlasResult = await this.setSceneProperty(args.uuid, '__comps__.dragonBones.ArmatureDisplay.dragonBonesAtlasAsset', atlasUuid, 'dragonBonesAsset');
            if (atlasResult.success) updates.push('dragonBonesAtlasAsset');
        }

        return { success: true, message: `DragonBones data set: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async setAnimation(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'animationName');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'setDragonBonesAnimation',
            args: [args.uuid, args.animationName, args.playTimes ?? -1]
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `DragonBones animation set: ${args.animationName}`,
            data: { uuid: args.uuid, animationName: args.animationName, playTimes: args.playTimes }
        };
    }

    private async setArmature(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'armatureName');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.dragonBones.ArmatureDisplay.armatureName', args.armatureName);
    }

    private async getDragonBonesInfo(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'getDragonBonesInfo',
            args: [args.uuid]
        });
        if (!result.success) return result;

        return { success: true, data: result.data };
    }
}
