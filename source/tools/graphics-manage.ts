// @ts-nocheck
/**
 * Graphics绘图工具 (graphics_manage)
 * 统一管理 Graphics 绘图组件的添加、移除、颜色设置、绘图命令执行等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class GraphicsManage extends UnifiedToolBase {
    name = 'graphics_manage';
    description = 'Graphics绘图工具。支持操作: add(添加Graphics), remove(移除Graphics), get(获取Graphics信息), set-colors(设置颜色和线宽), draw(执行绘图命令), clear(清空画布)';
    actions = ['add', 'remove', 'get', 'set-colors', 'draw', 'clear'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                },
                fillColor: {
                    type: 'object',
                    properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' }, a: { type: 'number', default: 255 } },
                    description: '填充颜色 {r,g,b,a} (用于 set-colors)'
                },
                strokeColor: {
                    type: 'object',
                    properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' }, a: { type: 'number', default: 255 } },
                    description: '描边颜色 {r,g,b,a} (用于 set-colors)'
                },
                lineWidth: {
                    type: 'number',
                    description: '线宽 (用于 set-colors)'
                },
                commands: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string' },
                            params: { type: 'array' }
                        }
                    },
                    description: '绘图命令数组 [{type, params}] (用于 draw)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addGraphics(args);
            case 'remove': return await this.removeGraphics(args);
            case 'get': return await this.getGraphics(args);
            case 'set-colors': return await this.setColors(args);
            case 'draw': return await this.draw(args);
            case 'clear': return await this.clearGraphics(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addGraphics(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: 'cc.Graphics'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: 'Graphics component added',
            data: { uuid: args.uuid, componentUuid: result.data }
        };
    }

    private async removeGraphics(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, 'cc.Graphics');
        if (!('comp' in found)) return found;

        return await this.execMsg('Graphics component removed', 'scene', 'remove-component', { uuid: found.comp.uuid });
    }

    private async getGraphics(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const comp = (result.data?.__comps__ || []).find((c: any) => c.__type__ === 'cc.Graphics');
        if (!comp) return { success: false, error: 'No cc.Graphics component found on node' };

        return {
            success: true,
            data: {
                uuid: args.uuid,
                componentUuid: comp.uuid,
                fillColor: comp.fillColor,
                strokeColor: comp.strokeColor,
                lineWidth: comp.lineWidth,
                miterLimit: comp.miterLimit
            }
        };
    }

    private async setColors(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const updates: string[] = [];

        if (args.fillColor !== undefined) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.Graphics.fillColor', args.fillColor, 'color');
            if (result.success) updates.push('fillColor');
        }

        if (args.strokeColor !== undefined) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.Graphics.strokeColor', args.strokeColor, 'color');
            if (result.success) updates.push('strokeColor');
        }

        if (args.lineWidth !== undefined) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.Graphics.lineWidth', args.lineWidth);
            if (result.success) updates.push('lineWidth');
        }

        if (updates.length === 0) return { success: false, error: 'No properties specified (fillColor, strokeColor, lineWidth)' };
        return { success: true, message: `Graphics colors configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async draw(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'commands');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'executeGraphics',
            args: [args.uuid, args.commands]
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Graphics draw executed: ${args.commands.length} commands`,
            data: { uuid: args.uuid, commandCount: args.commands.length }
        };
    }

    private async clearGraphics(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'executeGraphics',
            args: [args.uuid, [{ type: 'clear' }]]
        });
        if (!result.success) return result;

        return { success: true, message: 'Graphics cleared', data: { uuid: args.uuid } };
    }
}
