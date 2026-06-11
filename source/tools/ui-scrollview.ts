// @ts-nocheck
/**
 * ScrollView组件工具 (ui_scrollview)
 * 统一管理 ScrollView 滚动视图组件的添加、移除、属性设置、滚动操作等
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class UIScrollView extends UnifiedToolBase {
    name = 'ui_scrollview';
    description = 'ScrollView组件工具。支持操作: add(添加ScrollView), remove(移除ScrollView), get(获取ScrollView信息), set-direction(设置滚动方向), set-bounce(设置弹性), set-indicators(设置滚动条), set-content(设置内容节点), scroll-to(滚动到指定位置)';
    actions = ['add', 'remove', 'get', 'set-direction', 'set-bounce', 'set-indicators', 'set-content', 'scroll-to'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                },
                direction: {
                    type: 'number',
                    description: '滚动方向: 0=无, 1=水平, 2=垂直, 3=双向 (用于 set-direction)'
                },
                bounceDuration: {
                    type: 'number',
                    description: '弹性回弹时长 (用于 set-bounce)'
                },
                brake: {
                    type: 'number',
                    description: '制动系数 (用于 set-bounce)'
                },
                horizontalScrollBarUuid: {
                    type: 'string',
                    description: '水平滚动条节点UUID (用于 set-indicators)'
                },
                verticalScrollBarUuid: {
                    type: 'string',
                    description: '垂直滚动条节点UUID (用于 set-indicators)'
                },
                contentUuid: {
                    type: 'string',
                    description: '内容节点UUID (用于 set-content)'
                },
                position: {
                    type: 'object',
                    properties: {
                        x: { type: 'number' },
                        y: { type: 'number' }
                    },
                    description: '目标位置 {x, y} (用于 scroll-to)'
                },
                animated: {
                    type: 'boolean',
                    description: '是否使用动画滚动 (用于 scroll-to)',
                    default: true
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addScrollView(args);
            case 'remove': return await this.removeScrollView(args);
            case 'get': return await this.getScrollView(args);
            case 'set-direction': return await this.setDirection(args);
            case 'set-bounce': return await this.setBounce(args);
            case 'set-indicators': return await this.setIndicators(args);
            case 'set-content': return await this.setContent(args);
            case 'scroll-to': return await this.scrollTo(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addScrollView(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: 'cc.ScrollView'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: 'ScrollView component added',
            data: { uuid: args.uuid, componentUuid: result.data }
        };
    }

    private async removeScrollView(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, 'cc.ScrollView');
        if (!('comp' in found)) return found;

        return await this.execMsg('ScrollView component removed', 'scene', 'remove-component', { uuid: found.comp.uuid });
    }

    private async getScrollView(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const comp = (result.data?.__comps__ || []).find((c: any) => c.__type__ === 'cc.ScrollView');
        if (!comp) return { success: false, error: 'No cc.ScrollView component found on node' };

        return {
            success: true,
            data: {
                uuid: args.uuid,
                componentUuid: comp.uuid,
                direction: comp.direction,
                bounceDuration: comp.bounceDuration,
                brake: comp.brake,
                content: comp.content,
                horizontalScrollBar: comp.horizontalScrollBar,
                verticalScrollBar: comp.verticalScrollBar,
                cancelInnerEvents: comp.cancelInnerEvents
            }
        };
    }

    private async setDirection(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'direction');
        if (missing) return missing;

        if (![0, 1, 2, 3].includes(args.direction)) {
            return { success: false, error: 'direction must be 0(none), 1(horizontal), 2(vertical), or 3(both)' };
        }

        return await this.setSceneProperty(args.uuid, '__comps__.cc.ScrollView.direction', args.direction);
    }

    private async setBounce(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const updates: string[] = [];

        if (args.bounceDuration !== undefined) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.ScrollView.bounceDuration', args.bounceDuration);
            if (result.success) updates.push('bounceDuration');
        }

        if (args.brake !== undefined) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.ScrollView.brake', args.brake);
            if (result.success) updates.push('brake');
        }

        if (updates.length === 0) return { success: false, error: 'No properties specified (bounceDuration, brake)' };
        return { success: true, message: `ScrollView bounce configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async setIndicators(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const updates: string[] = [];

        if (args.horizontalScrollBarUuid) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.ScrollView.horizontalScrollBar', args.horizontalScrollBarUuid, 'component');
            if (result.success) updates.push('horizontalScrollBar');
        }

        if (args.verticalScrollBarUuid) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.ScrollView.verticalScrollBar', args.verticalScrollBarUuid, 'component');
            if (result.success) updates.push('verticalScrollBar');
        }

        if (updates.length === 0) return { success: false, error: 'No properties specified (horizontalScrollBarUuid, verticalScrollBarUuid)' };
        return { success: true, message: `ScrollView indicators configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async setContent(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'contentUuid');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.ScrollView.content', args.contentUuid, 'node');
    }

    private async scrollTo(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'position');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'scrollScrollView',
            args: [args.uuid, args.position, args.animated ?? true]
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `ScrollView scrolled to (${args.position.x}, ${args.position.y})`,
            data: { uuid: args.uuid, position: args.position, animated: args.animated }
        };
    }
}
