// @ts-nocheck
/**
 * PageView组件工具 (ui_pageview)
 * 统一管理 PageView 翻页视图组件的添加、移除、属性设置、翻页操作等
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class UIPageView extends UnifiedToolBase {
    name = 'ui_pageview';
    description = 'PageView组件工具。支持操作: add(添加PageView), remove(移除PageView), get(获取PageView信息), set-direction(设置翻页方向), set-size(设置尺寸模式), set-indicator(设置指示器), set-turn-effect(设置翻页效果), set-current-page(设置当前页)';
    actions = ['add', 'remove', 'get', 'set-direction', 'set-size', 'set-indicator', 'set-turn-effect', 'set-current-page'];

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
                    description: '翻页方向: 0=无, 1=水平, 2=垂直 (用于 set-direction)'
                },
                sizeMode: {
                    type: 'number',
                    description: '尺寸模式 (用于 set-size)'
                },
                indicatorUuid: {
                    type: 'string',
                    description: 'PageViewIndicator组件UUID (用于 set-indicator)'
                },
                pageTurningEffect: {
                    type: 'number',
                    description: '翻页效果类型 (用于 set-turn-effect)'
                },
                pageIndex: {
                    type: 'number',
                    description: '目标页面索引 (用于 set-current-page)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addPageView(args);
            case 'remove': return await this.removePageView(args);
            case 'get': return await this.getPageView(args);
            case 'set-direction': return await this.setDirection(args);
            case 'set-size': return await this.setSizeMode(args);
            case 'set-indicator': return await this.setIndicator(args);
            case 'set-turn-effect': return await this.setTurnEffect(args);
            case 'set-current-page': return await this.setCurrentPage(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addPageView(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: 'cc.PageView'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: 'PageView component added',
            data: { uuid: args.uuid, componentUuid: result.data }
        };
    }

    private async removePageView(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, 'cc.PageView');
        if (!('comp' in found)) return found;

        return await this.execMsg('PageView component removed', 'scene', 'remove-component', { uuid: found.comp.uuid });
    }

    private async getPageView(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const comp = (result.data?.__comps__ || []).find((c: any) => c.__type__ === 'cc.PageView');
        if (!comp) return { success: false, error: 'No cc.PageView component found on node' };

        return {
            success: true,
            data: {
                uuid: args.uuid,
                componentUuid: comp.uuid,
                direction: comp.direction,
                sizeMode: comp.sizeMode,
                indicator: comp.indicator,
                pageTurningEffect: comp.pageTurningEffect,
                currentPage: comp._curPageIndex
            }
        };
    }

    private async setDirection(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'direction');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.PageView.direction', args.direction);
    }

    private async setSizeMode(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'sizeMode');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.PageView.sizeMode', args.sizeMode);
    }

    private async setIndicator(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'indicatorUuid');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.PageView.indicator', args.indicatorUuid, 'component');
    }

    private async setTurnEffect(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'pageTurningEffect');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.PageView.pageTurningEffect', args.pageTurningEffect);
    }

    private async setCurrentPage(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'pageIndex');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'setPageViewIndex',
            args: [args.uuid, args.pageIndex]
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `PageView set to page ${args.pageIndex}`,
            data: { uuid: args.uuid, pageIndex: args.pageIndex }
        };
    }
}
