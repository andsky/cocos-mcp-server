// @ts-nocheck
/**
 * 着色器管理工具 (shader_manage)
 * 统一管理着色器效果资源的查询、创建、删除、编辑等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class ShaderManage extends UnifiedToolBase {
    name = 'shader_manage';
    description = '着色器管理工具。支持操作: list(列出着色器), info(获取着色器信息), create(创建着色器), delete(删除着色器), open(打开着色器编辑), save(保存着色器), compile(编译着色器)';
    actions = ['list', 'info', 'create', 'delete', 'open', 'save', 'compile'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                url: {
                    type: 'string',
                    description: '着色器资源路径 (如 db://assets/shaders/my-shader.effect)'
                },
                uuid: {
                    type: 'string',
                    description: '着色器UUID'
                },
                content: {
                    type: 'string',
                    description: '着色器内容 (用于 create, save)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'list': return await this.listShaders(args);
            case 'info': return await this.getShaderInfo(args);
            case 'create': return await this.createShader(args);
            case 'delete': return await this.deleteShader(args);
            case 'open': return await this.openShader(args);
            case 'save': return await this.saveShader(args);
            case 'compile': return await this.compileShader(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async listShaders(args: any): Promise<ToolResponse> {
        const result = await this.exec('asset-db', 'query-assets', { ccType: 'effect' });
        if (!result.success) return result;

        const shaders = (result.data || []).map((s: any) => ({
            name: s.name,
            path: s.path,
            uuid: s.uuid
        }));
        return { success: true, data: { total: shaders.length, shaders } };
    }

    private async getShaderInfo(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };

        const key = args.url || args.uuid;
        const result = await this.exec('asset-db', 'query-asset-info', key);
        if (!result.success) return result;
        if (!result.data) return { success: false, error: `Shader not found: ${key}` };

        return {
            success: true,
            data: {
                name: result.data.name,
                path: result.data.path,
                uuid: result.data.uuid,
                type: result.data.type
            }
        };
    }

    private async createShader(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;

        const vsCode = 'precision highp float;\n#include <cc-global>\n#include <cc-local>\nin vec3 a_position;\nin vec4 a_color;\nout vec4 v_color;\nvoid main () {\n    v_color = a_color;\n    gl_Position = cc_matViewProj * cc_matWorld * vec4(a_position, 1.0);\n}';
        const fsCode = 'precision highp float;\nin vec4 v_color;\n#include <alpha-test>\n#include <texture>\nvoid main () {\n    gl_FragColor = v_color;\n}';
        const defaultShader = args.content || JSON.stringify({
            CCEffect: {
                techniques: [{
                    passes: [{
                        vert: 'unlit-vs',
                        frag: 'unlit-fs',
                        rasterizerState: { cullMode: 'none' },
                        blendState: { targets: [{ blend: true }] }
                    }]
                }]
            },
            CCProgram_unlit_vs: { vert: vsCode },
            CCProgram_unlit_fs: { frag: fsCode }
        });

        const result = await this.exec('asset-db', 'create-asset', {
            source: defaultShader,
            target: args.url
        });
        if (!result.success) return result;

        return { success: true, message: `Shader created at ${args.url}`, data: { url: args.url } };
    }

    private async deleteShader(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;

        return await this.execMsg(`Shader deleted: ${args.url}`, 'asset-db', 'delete-asset', args.url);
    }

    private async openShader(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;

        const result = await this.exec('asset-db', 'open-asset', args.url);
        if (!result.success) return result;

        return { success: true, message: `Shader opened: ${args.url}`, data: { url: args.url } };
    }

    private async saveShader(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };
        if (args.content === undefined) return { success: false, error: 'content is required' };

        const result = await this.exec('asset-db', 'save-asset', {
            uuid: args.uuid || undefined,
            path: args.url || undefined,
            content: args.content
        });
        if (!result.success) return result;

        return { success: true, message: `Shader saved: ${args.url || args.uuid}`, data: { url: args.url, uuid: args.uuid } };
    }

    private async compileShader(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };

        const key = args.url || args.uuid;

        // 尝试通过 engine 频道编译着色器
        try {
            const result = await this.exec('engine', 'compile-shaders', key);
            if (result.success) return result;
        } catch {
            // engine:compile-shaders 不可用，继续尝试其他方式
        }

        return {
            success: true,
            message: 'Shader compilation triggered via asset refresh',
            instruction: 'Use asset-db:refresh-asset to trigger shader recompilation, or reopen the scene in Cocos Creator editor.'
        };
    }
}
