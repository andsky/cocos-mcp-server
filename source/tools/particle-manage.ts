// @ts-nocheck
/**
 * 粒子系统管理工具 (particle_manage)
 * 统一管理粒子系统组件的添加、移除、属性设置等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class ParticleManage extends UnifiedToolBase {
    name = 'particle_manage';
    description = '粒子系统管理工具。支持操作: add(添加粒子系统), remove(移除粒子系统), get(获取粒子信息), set-rate(设置发射速率), set-duration(设置持续时间), set-life(设置生命周期), set-speed(设置速度), set-color(设置颜色), set-size(设置粒子大小), set-renderer(设置渲染模式), set-texture(设置粒子纹理)';
    actions = ['add', 'remove', 'get', 'set-rate', 'set-duration', 'set-life', 'set-speed', 'set-color', 'set-size', 'set-renderer', 'set-texture'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                },
                rate: {
                    type: 'number',
                    description: '发射速率 (用于 set-rate)'
                },
                duration: {
                    type: 'number',
                    description: '持续时间/秒 (用于 set-duration)'
                },
                life: {
                    type: 'number',
                    description: '粒子生命周期/秒 (用于 set-life)'
                },
                speed: {
                    type: 'number',
                    description: '粒子速度 (用于 set-speed)'
                },
                color: {
                    type: 'object',
                    description: '粒子颜色 {r,g,b,a} (用于 set-color)'
                },
                size: {
                    type: 'number',
                    description: '粒子大小 (用于 set-size)'
                },
                renderMode: {
                    type: 'number',
                    description: '渲染模式 (用于 set-renderer)'
                },
                texturePath: {
                    type: 'string',
                    description: '粒子纹理资源路径 (用于 set-texture)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addParticle(args);
            case 'remove': return await this.removeParticle(args);
            case 'get': return await this.getParticle(args);
            case 'set-rate': return await this.setRate(args);
            case 'set-duration': return await this.setDuration(args);
            case 'set-life': return await this.setLife(args);
            case 'set-speed': return await this.setSpeed(args);
            case 'set-color': return await this.setColor(args);
            case 'set-size': return await this.setSize(args);
            case 'set-renderer': return await this.setRenderer(args);
            case 'set-texture': return await this.setTexture(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addParticle(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: 'cc.ParticleSystem'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: 'ParticleSystem component added',
            data: { uuid: args.uuid, componentUuid: result.data }
        };
    }

    private async removeParticle(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, 'cc.ParticleSystem');
        if (!('comp' in found)) return found;

        return await this.execMsg('ParticleSystem component removed', 'scene', 'remove-component', { uuid: found.comp.uuid });
    }

    private async getParticle(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const comp = (result.data?.__comps__ || []).find((c: any) => c.__type__ === 'cc.ParticleSystem');
        if (!comp) return { success: false, error: 'No ParticleSystem component found on node' };

        return {
            success: true,
            data: {
                uuid: args.uuid,
                componentUuid: comp.uuid,
                rate: comp.rate,
                duration: comp.duration,
                life: comp.life,
                speed: comp.speed,
                color: comp.color,
                size: comp.size,
                renderMode: comp.renderMode,
                spriteFrame: comp.spriteFrame
            }
        };
    }

    private async setRate(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'rate');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.ParticleSystem.rate', args.rate);
    }

    private async setDuration(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'duration');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.ParticleSystem.duration', args.duration);
    }

    private async setLife(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'life');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.ParticleSystem.life', args.life);
    }

    private async setSpeed(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'speed');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.ParticleSystem.speed', args.speed);
    }

    private async setColor(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'color');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.ParticleSystem.color', args.color, 'color');
    }

    private async setSize(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'size');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.ParticleSystem.size', args.size);
    }

    private async setRenderer(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'renderMode');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.ParticleSystem.renderMode', args.renderMode);
    }

    private async setTexture(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'texturePath');
        if (missing) return missing;

        const textureUuid = await this.resolveAssetUuid(args.texturePath);
        if (!textureUuid) return { success: false, error: `Texture not found: ${args.texturePath}` };

        return await this.setSceneProperty(args.uuid, '__comps__.cc.ParticleSystem.spriteFrame', textureUuid, 'spriteFrame');
    }
}
