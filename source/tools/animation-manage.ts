// @ts-nocheck
/**
 * 动画管理工具 (animation_manage)
 * 统一管理动画剪辑、动画组件、动画状态等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class AnimationManage extends UnifiedToolBase {
    name = 'animation_manage';
    description = '动画管理工具。支持操作: clip(动画剪辑), component(动画组件), state(动画状态), track(动画轨道), play(播放), pause(暂停), stop(停止), record(录制)';
    actions = ['clip', 'component', 'state', 'track', 'play', 'pause', 'stop', 'record'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                },
                clipName: { type: 'string', description: '动画剪辑名称' },
                clipPath: { type: 'string', description: '动画剪辑资源路径' },
                componentAction: {
                    type: 'string',
                    description: '动画组件操作',
                    enum: ['add', 'remove', 'get', 'get-clips']
                },
                stateAction: {
                    type: 'string',
                    description: '动画状态操作',
                    enum: ['get', 'get-all', 'is-playing']
                },
                trackType: {
                    type: 'string',
                    description: '轨道类型',
                    enum: ['position', 'rotation', 'scale', 'color', 'opacity', 'custom']
                },
                recordAction: {
                    type: 'string',
                    description: '录制操作',
                    enum: ['start', 'stop', 'cancel']
                },
                time: { type: 'number', description: '时间点(秒)' },
                loop: { type: 'boolean', description: '是否循环播放', default: false },
                speed: { type: 'number', description: '播放速度', default: 1.0 }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'clip': return await this.manageClip(args);
            case 'component': return await this.manageComponent(args);
            case 'state': return await this.manageState(args);
            case 'track': return await this.manageTrack(args);
            case 'play': return await this.playAnimation(args);
            case 'pause': return await this.pauseAnimation(args);
            case 'stop': return await this.stopAnimation(args);
            case 'record': return await this.recordAnimation(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async getAnimComponent(uuid: string): Promise<{ comp: any } | ToolResponse> {
        const result = await this.exec('scene', 'query-node', uuid);
        if (!result.success) return result;
        const comp = (result.data?.__comps__ || []).find((c: any) => c.__type__ === 'cc.Animation');
        return { comp };
    }

    private async manageClip(args: any): Promise<ToolResponse> {
        if (args.clipPath) {
            return await this.exec('asset-db', 'query-asset-info', args.clipPath);
        }

        if (args.uuid && args.clipName) {
            const animResult = await this.getAnimComponent(args.uuid);
            if (!('comp' in animResult)) return animResult as ToolResponse;

            // 注意: _clips 是 cc.Animation 的内部属性，不同 CC 版本可能变化
            const clips = animResult.comp?._clips || animResult.comp?.clips || [];
            const clip = clips.find((c: any) => c.name === args.clipName);
            if (!clip) return { success: false, error: `Clip '${args.clipName}' not found` };
            return { success: true, data: clip };
        }

        return { success: false, error: 'clipPath or (uuid + clipName) is required' };
    }

    private async manageComponent(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'componentAction');
        if (missing) return missing;

        switch (args.componentAction) {
            case 'add': {
                const r = await this.exec('scene', 'create-component', { node: args.uuid, type: 'cc.Animation' });
                if (!r.success) return r;
                return { success: true, message: 'Animation component added' };
            }
            case 'remove': {
                const animResult = await this.getAnimComponent(args.uuid);
                if (!('comp' in animResult)) return animResult as ToolResponse;
                if (!animResult.comp) return { success: false, error: 'No Animation component on node' };
                return await this.execMsg('Animation component removed', 'scene', 'remove-component', { uuid: animResult.comp.uuid });
            }
            case 'get': {
                const animResult = await this.getAnimComponent(args.uuid);
                if (!('comp' in animResult)) return animResult as ToolResponse;
                return { success: true, data: animResult.comp || null };
            }
            case 'get-clips': {
                const animResult = await this.getAnimComponent(args.uuid);
                if (!('comp' in animResult)) return animResult as ToolResponse;
                return {
                    success: true,
                    data: {
                        clips: animResult.comp?._clips || [],
                        defaultClip: animResult.comp?._defaultClip
                    }
                };
            }
            default:
                return { success: false, error: `Unknown component action: ${args.componentAction}` };
        }
    }

    private async manageState(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'stateAction');
        if (missing) return missing;

        const animResult = await this.getAnimComponent(args.uuid);
        if (!('comp' in animResult)) return animResult as ToolResponse;
        const comp = animResult.comp;

        switch (args.stateAction) {
            case 'get':
                return { success: true, data: { playing: comp?._playing || false, currentClip: comp?._currentClip } };
            case 'get-all':
                return { success: true, data: { states: comp?._clips || [] } };
            case 'is-playing':
                return { success: true, data: { isPlaying: comp?._playing || false } };
            default:
                return { success: false, error: `Unknown state action: ${args.stateAction}` };
        }
    }

    private async manageTrack(args: any): Promise<ToolResponse> {
        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'getAnimationTracks',
            args: [args.uuid, args.clipName, args.trackType]
        });
        if (!result.success) return result;
        return { success: true, data: result.data };
    }

    private async playAnimation(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'playAnimation',
            args: [args.uuid, args.clipName, args.loop ?? false, args.speed ?? 1.0]
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Playing animation: ${args.clipName || 'default'}`,
            data: { uuid: args.uuid, clipName: args.clipName, loop: args.loop, speed: args.speed }
        };
    }

    private async pauseAnimation(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'pauseAnimation',
            args: [args.uuid]
        });
        if (!result.success) return result;
        return { success: true, message: 'Animation paused', data: { uuid: args.uuid } };
    }

    private async stopAnimation(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'stopAnimation',
            args: [args.uuid]
        });
        if (!result.success) return result;
        return { success: true, message: 'Animation stopped', data: { uuid: args.uuid } };
    }

    private async recordAnimation(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'recordAction');
        if (missing) return missing;

        const methodMap: Record<string, string> = {
            'start': 'startAnimationRecord',
            'stop': 'stopAnimationRecord',
            'cancel': 'cancelAnimationRecord'
        };
        const method = methodMap[args.recordAction];
        if (!method) return { success: false, error: `Unknown record action: ${args.recordAction}` };

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method,
            args: [args.uuid, args.clipName]
        });
        if (!result.success) return result;
        return { success: true, message: `Animation recording ${args.recordAction}ed` };
    }
}
