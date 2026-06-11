// @ts-nocheck
/**
 * Canvas组件工具 (ui_canvas)
 * 统一管理 Canvas 画布组件的添加、移除、设计分辨率、适配模式等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class UICanvas extends UnifiedToolBase {
    name = 'ui_canvas';
    description = 'Canvas组件工具。支持操作: add(添加Canvas), remove(移除Canvas), get(获取Canvas信息), set-design-size(设置设计分辨率), set-fit(设置适配模式), set-camera(设置关联相机)';
    actions = ['add', 'remove', 'get', 'set-design-size', 'set-fit', 'set-camera'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                },
                designResolution: {
                    type: 'object',
                    properties: {
                        width: { type: 'number' },
                        height: { type: 'number' }
                    },
                    description: '设计分辨率 {width, height} (用于 set-design-size)'
                },
                fitWidth: {
                    type: 'boolean',
                    description: '是否适配宽度 (用于 set-fit)'
                },
                fitHeight: {
                    type: 'boolean',
                    description: '是否适配高度 (用于 set-fit)'
                },
                cameraUuid: {
                    type: 'string',
                    description: '关联相机组件UUID (用于 set-camera)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addCanvas(args);
            case 'remove': return await this.removeCanvas(args);
            case 'get': return await this.getCanvas(args);
            case 'set-design-size': return await this.setDesignSize(args);
            case 'set-fit': return await this.setFit(args);
            case 'set-camera': return await this.setCamera(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addCanvas(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: 'cc.Canvas'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: 'Canvas component added',
            data: { uuid: args.uuid, componentUuid: result.data }
        };
    }

    private async removeCanvas(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, 'cc.Canvas');
        if (!('comp' in found)) return found;

        return await this.execMsg('Canvas component removed', 'scene', 'remove-component', { uuid: found.comp.uuid });
    }

    private async getCanvas(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const comp = (result.data?.__comps__ || []).find((c: any) => c.__type__ === 'cc.Canvas');
        if (!comp) return { success: false, error: 'No cc.Canvas component found on node' };

        return {
            success: true,
            data: {
                uuid: args.uuid,
                componentUuid: comp.uuid,
                designResolution: comp.designResolution,
                fitWidth: comp.fitWidth,
                fitHeight: comp.fitHeight,
                camera: comp.camera
            }
        };
    }

    private async setDesignSize(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'designResolution');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.Canvas.designResolution', args.designResolution, 'size');
    }

    private async setFit(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const updates: string[] = [];

        if (args.fitWidth !== undefined) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.Canvas.fitWidth', args.fitWidth);
            if (result.success) updates.push('fitWidth');
        }

        if (args.fitHeight !== undefined) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.Canvas.fitHeight', args.fitHeight);
            if (result.success) updates.push('fitHeight');
        }

        if (updates.length === 0) return { success: false, error: 'No properties specified (fitWidth, fitHeight)' };
        return { success: true, message: `Canvas fit mode configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async setCamera(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'cameraUuid');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.Canvas.camera', args.cameraUuid, 'component');
    }
}
