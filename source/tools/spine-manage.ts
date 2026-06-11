// @ts-nocheck
/**
 * Spine动画管理工具 (spine_manage)
 * 统一管理 Spine 骨骼动画组件的添加、移除、属性设置、动画播放等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class SpineManage extends UnifiedToolBase {
    name = 'spine_manage';
    description = 'Spine动画管理工具。支持操作: add(添加Spine组件), remove(移除Spine组件), get(获取Spine信息), set-data(设置骨骼数据), set-animation(设置动画), set-skin(设置皮肤), set-mix(设置混合), pause(暂停), get-info(获取详细信息)';
    actions = ['add', 'remove', 'get', 'set-data', 'set-animation', 'set-skin', 'set-mix', 'pause', 'get-info'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                },
                skeletonDataPath: {
                    type: 'string',
                    description: '骨骼数据资源路径 (用于 set-data)'
                },
                animationName: {
                    type: 'string',
                    description: '动画名称 (用于 set-animation)'
                },
                loop: {
                    type: 'boolean',
                    description: '是否循环播放 (用于 set-animation)',
                    default: false
                },
                trackIndex: {
                    type: 'number',
                    description: '轨道索引 (用于 set-animation)',
                    default: 0
                },
                skinName: {
                    type: 'string',
                    description: '皮肤名称 (用于 set-skin)'
                },
                fromAnimation: {
                    type: 'string',
                    description: '混合起始动画名 (用于 set-mix)'
                },
                toAnimation: {
                    type: 'string',
                    description: '混合目标动画名 (用于 set-mix)'
                },
                duration: {
                    type: 'number',
                    description: '混合持续时间/秒 (用于 set-mix)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addSpine(args);
            case 'remove': return await this.removeSpine(args);
            case 'get': return await this.getSpine(args);
            case 'set-data': return await this.setData(args);
            case 'set-animation': return await this.setAnimation(args);
            case 'set-skin': return await this.setSkin(args);
            case 'set-mix': return await this.setMix(args);
            case 'pause': return await this.pauseSpine(args);
            case 'get-info': return await this.getSpineInfo(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addSpine(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: 'sp.Skeleton'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: 'Spine Skeleton component added',
            data: { uuid: args.uuid, componentUuid: result.data }
        };
    }

    private async removeSpine(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, 'sp.Skeleton');
        if (!('comp' in found)) return found;

        return await this.execMsg('Spine Skeleton component removed', 'scene', 'remove-component', { uuid: found.comp.uuid });
    }

    private async getSpine(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const comp = (result.data?.__comps__ || []).find((c: any) => c.__type__ === 'sp.Skeleton');
        if (!comp) return { success: false, error: 'No sp.Skeleton component found on node' };

        return {
            success: true,
            data: {
                uuid: args.uuid,
                componentUuid: comp.uuid,
                skeletonData: comp.skeletonData,
                defaultSkin: comp.defaultSkin,
                defaultAnimation: comp.defaultAnimation,
                loop: comp.loop,
                premultipliedAlpha: comp.premultipliedAlpha
            }
        };
    }

    private async setData(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'skeletonDataPath');
        if (missing) return missing;

        const dataUuid = await this.resolveAssetUuid(args.skeletonDataPath);
        if (!dataUuid) return { success: false, error: `Skeleton data not found: ${args.skeletonDataPath}` };

        return await this.setSceneProperty(args.uuid, '__comps__.sp.Skeleton.skeletonData', dataUuid, 'spSkeletonData');
    }

    private async setAnimation(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'animationName');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'setSpineAnimation',
            args: [args.uuid, args.animationName, args.loop ?? false, args.trackIndex ?? 0]
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Spine animation set: ${args.animationName}`,
            data: { uuid: args.uuid, animationName: args.animationName, loop: args.loop, trackIndex: args.trackIndex }
        };
    }

    private async setSkin(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'skinName');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.sp.Skeleton.defaultSkin', args.skinName);
    }

    private async setMix(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'fromAnimation', 'toAnimation', 'duration');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'setSpineMix',
            args: [args.uuid, args.fromAnimation, args.toAnimation, args.duration]
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Spine mix set: ${args.fromAnimation} -> ${args.toAnimation} (${args.duration}s)`,
            data: { uuid: args.uuid, fromAnimation: args.fromAnimation, toAnimation: args.toAnimation, duration: args.duration }
        };
    }

    private async pauseSpine(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'pauseSpine',
            args: [args.uuid]
        });
        if (!result.success) return result;

        return { success: true, message: 'Spine animation paused', data: { uuid: args.uuid } };
    }

    private async getSpineInfo(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'getSpineInfo',
            args: [args.uuid]
        });
        if (!result.success) return result;

        return { success: true, data: result.data };
    }
}
