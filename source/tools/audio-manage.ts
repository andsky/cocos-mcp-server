// @ts-nocheck
/**
 * 音频管理工具 (audio_manage)
 * 统一管理 Cocos Creator 的音频源组件：添加、移除、属性设置、播放控制、音频资源列表
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class AudioManage extends UnifiedToolBase {
    name = 'audio_manage';
    description = '音频管理工具。支持操作: add(添加音频源), remove(移除音频源), get(获取音频信息), set-clip(设置音频片段), set-volume(设置音量), set-loop(设置循环), play(播放), pause(暂停), stop(停止), list-clips(列出音频资源)';
    actions = ['add', 'remove', 'get', 'set-clip', 'set-volume', 'set-loop', 'play', 'pause', 'stop', 'list-clips'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: { type: 'string', description: '节点UUID' },
                clipPath: { type: 'string', description: '音频资源路径 (db://assets/...)' },
                volume: { type: 'number', description: '音量 (0-1)' },
                loop: { type: 'boolean', description: '是否循环播放' },
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addAudio(args);
            case 'remove': return await this.removeAudio(args);
            case 'get': return await this.getAudio(args);
            case 'set-clip': return await this.setClip(args);
            case 'set-volume': return await this.setVolume(args);
            case 'set-loop': return await this.setLoop(args);
            case 'play': return await this.playAudio(args);
            case 'pause': return await this.pauseAudio(args);
            case 'stop': return await this.stopAudio(args);
            case 'list-clips': return await this.listClips(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addAudio(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        return await this.execMsg('AudioSource component added', 'scene', 'create-component', {
            node: args.uuid,
            type: 'cc.AudioSource'
        });
    }

    private async removeAudio(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.findComponentOnNode(args.uuid, 'cc.AudioSource');
        if (!('comp' in result)) return result as ToolResponse;
        if (!result.comp) return { success: false, error: 'No AudioSource component on node' };

        return await this.execMsg('AudioSource component removed', 'scene', 'remove-component', { uuid: result.comp.uuid });
    }

    private async getAudio(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.findComponentOnNode(args.uuid, 'cc.AudioSource');
        if (!('comp' in result)) return result as ToolResponse;
        const comp = result.comp;
        return {
            success: true,
            data: {
                clip: comp.clip || null,
                volume: comp.volume,
                loop: comp.loop,
                state: comp.state || 'stopped'
            }
        };
    }

    private async setClip(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'clipPath');
        if (missing) return missing;

        const uuid = await this.resolveAssetUuid(args.clipPath);
        if (!uuid) return { success: false, error: `AudioClip not found: ${args.clipPath}` };

        return await this.setSceneProperty(args.uuid, '__comps__.cc.AudioSource.clip', uuid, 'audioClip');
    }

    private async setVolume(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'volume');
        if (missing) return missing;

        const result = await this.setSceneProperty(args.uuid, '__comps__.cc.AudioSource.volume', args.volume);
        if (!result.success) return result;
        return { success: true, message: `Volume set to ${args.volume}`, data: { uuid: args.uuid, volume: args.volume } };
    }

    private async setLoop(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'loop');
        if (missing) return missing;

        const result = await this.setSceneProperty(args.uuid, '__comps__.cc.AudioSource.loop', args.loop);
        if (!result.success) return result;
        return { success: true, message: `Loop set to ${args.loop}`, data: { uuid: args.uuid, loop: args.loop } };
    }

    private async playAudio(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        return await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'playAudio',
            args: [args.uuid]
        });
    }

    private async pauseAudio(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        return await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'pauseAudio',
            args: [args.uuid]
        });
    }

    private async stopAudio(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        return await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'stopAudio',
            args: [args.uuid]
        });
    }

    private async listClips(_args: any): Promise<ToolResponse> {
        return await this.exec('asset-db', 'query-assets', { ccType: 'audio-clip' });
    }
}
