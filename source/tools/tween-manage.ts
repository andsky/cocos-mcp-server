// @ts-nocheck
/**
 * Tween动画管理工具 (tween_manage)
 * 统一管理 Cocos Creator 的 Tween 动画：创建、停止、序列、重复
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class TweenManage extends UnifiedToolBase {
    name = 'tween_manage';
    description = 'Tween动画管理工具。支持操作: create(创建tween), to(绝对值动画), by(相对值动画), stop(停止节点tween), stop-all(停止所有tween), sequence(序列动画), repeat(重复动画)';
    actions = ['create', 'to', 'by', 'stop', 'stop-all', 'sequence', 'repeat'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: { type: 'string', description: '节点UUID' },
                properties: {
                    type: 'object',
                    description: '动画属性，如 { position: {x:1,y:2,z:3}, scale: {x:2,y:2,z:2} }'
                },
                duration: { type: 'number', description: '动画时长(秒)', default: 1.0 },
                easing: {
                    type: 'string',
                    description: '缓动函数',
                    enum: ['linear', 'smooth', 'fade', 'constant',
                        'quadIn', 'quadOut', 'quadInOut',
                        'cubicIn', 'cubicOut', 'cubicInOut',
                        'quartIn', 'quartOut', 'quartInOut',
                        'quintIn', 'quintOut', 'quintInOut',
                        'sineIn', 'sineOut', 'sineInOut',
                        'expoIn', 'expoOut', 'expoInOut',
                        'circIn', 'circOut', 'circInOut',
                        'elasticIn', 'elasticOut', 'elasticInOut',
                        'backIn', 'backOut', 'backInOut',
                        'bounceIn', 'bounceOut', 'bounceInOut']
                },
                delay: { type: 'number', description: '延迟时间(秒)', default: 0 },
                repeatCount: { type: 'number', description: '重复次数 (用于 repeat)', default: 0 },
                // sequence
                steps: {
                    type: 'array',
                    description: '序列动画步骤 (用于 sequence)',
                    items: {
                        type: 'object',
                        properties: {
                            properties: { type: 'object', description: '动画属性' },
                            duration: { type: 'number', description: '时长' },
                            easing: { type: 'string', description: '缓动函数' },
                            mode: { type: 'string', enum: ['to', 'by'], description: '模式' },
                        }
                    }
                },
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'create': return await this.createTween(args, 'to');
            case 'to': return await this.createTween(args, 'to');
            case 'by': return await this.createTween(args, 'by');
            case 'stop': return await this.stopTween(args);
            case 'stop-all': return await this.stopAllTweens();
            case 'sequence': return await this.sequenceTween(args);
            case 'repeat': return await this.repeatTween(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async createTween(args: any, mode: string): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'properties');
        if (missing) return missing;

        const duration = args.duration ?? 1.0;
        const easing = args.easing ?? 'linear';
        const delay = args.delay ?? 0;

        return await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'createTween',
            args: [args.uuid, args.properties, duration, easing, mode, delay, 0]
        });
    }

    private async stopTween(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        return await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'stopTween',
            args: [args.uuid]
        });
    }

    private async stopAllTweens(): Promise<ToolResponse> {
        return await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'stopAllTweens'
        });
    }

    private async sequenceTween(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'steps');
        if (missing) return missing;

        const steps = args.steps;
        if (!Array.isArray(steps) || steps.length === 0) {
            return { success: false, error: 'steps must be a non-empty array' };
        }

        const results: any[] = [];
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if (!step.properties) {
                return { success: false, error: `Step ${i} missing 'properties'` };
            }

            const mode = step.mode ?? 'to';
            const duration = step.duration ?? 1.0;
            const easing = step.easing ?? 'linear';

            // For sequence, only delay the first step if the user specified a global delay
            const delay = (i === 0) ? (args.delay ?? 0) : 0;

            const result = await this.exec('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'createTween',
                args: [args.uuid, step.properties, duration, easing, mode, delay, 0]
            });
            results.push({ step: i, success: result.success, message: result.message || result.error });
        }

        return {
            success: true,
            message: `Sequence created: ${steps.length} steps`,
            data: { uuid: args.uuid, stepCount: steps.length, results }
        };
    }

    private async repeatTween(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'properties');
        if (missing) return missing;

        const duration = args.duration ?? 1.0;
        const easing = args.easing ?? 'linear';
        const delay = args.delay ?? 0;
        const repeatCount = args.repeatCount ?? 1;

        return await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'createTween',
            args: [args.uuid, args.properties, duration, easing, 'to', delay, repeatCount]
        });
    }
}
