// @ts-nocheck
/**
 * 场景视图工具 (scene_view)
 *
 * 通过 scene 频道的公开消息直接控制编辑器场景视图：Gizmo 工具/坐标/轴心、
 * 网格显隐、2D/3D 模式、相机对齐、节点聚焦。
 *
 * 消息清单见 @cocos/creator-types editor/packages/scene/@types/message.d.ts：
 *   change-gizmo-tool / change-gizmo-coordinate / change-gizmo-pivot
 *   set-grid-visible / change-is2D / focus-camera / align-with-view / align-view-with-node
 *
 * 注意：这些是 scene 频道消息，直接 exec('scene', ...)，不走 execute-scene-script
 * （scene script 跑在引擎运行时进程，无法控制编辑器视图控件）。
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class SceneView extends UnifiedToolBase {
    name = 'scene_view';
    description = '场景视图工具。支持操作: focus(聚焦节点), gizmo(Gizmo工具/坐标/轴心), grid(网格显隐), mode(2D/3D视图), camera(相机对齐), status(查询视图状态)';
    actions = ['focus', 'gizmo', 'grid', 'mode', 'camera', 'status'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuids: { type: 'array', items: { type: 'string' }, description: '节点UUID列表 (用于 focus)' },
                gizmoTool: { type: 'string', description: 'Gizmo工具名称，以编辑器为准 (可用 status 查询合法值)' },
                coordinate: { type: 'string', description: '坐标系 (用于 gizmo)', enum: ['local', 'global'] },
                pivot: { type: 'string', description: '轴心点 (用于 gizmo)', enum: ['pivot', 'center'] },
                visible: { type: 'boolean', description: '是否可见 (用于 grid)' },
                is2D: { type: 'boolean', description: '是否2D模式 (用于 mode)' },
                cameraAction: {
                    type: 'string',
                    description: '相机操作 (用于 camera)',
                    enum: ['align-with-view', 'align-view-with-node']
                },
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'focus': return await this.focusCamera(args);
            case 'gizmo': return await this.setGizmo(args);
            case 'grid': return await this.setGrid(args);
            case 'mode': return await this.setViewMode(args);
            case 'camera': return await this.cameraAction(args);
            case 'status': return await this.getStatus();
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async focusCamera(args: any): Promise<ToolResponse> {
        const uuids = args.uuids || [];
        if (uuids.length === 0) {
            return { success: false, error: 'At least one node UUID is required (uuids parameter)' };
        }
        return await this.execMsg(`Focused on ${uuids.length} node(s)`, 'scene', 'focus-camera', uuids);
    }

    private async setGizmo(args: any): Promise<ToolResponse> {
        const updates: string[] = [];

        if (args.gizmoTool) {
            const r = await this.exec('scene', 'change-gizmo-tool', args.gizmoTool);
            if (!r.success) return r;
            updates.push(`tool: ${args.gizmoTool}`);
        }
        if (args.coordinate) {
            const r = await this.exec('scene', 'change-gizmo-coordinate', args.coordinate);
            if (!r.success) return r;
            updates.push(`coordinate: ${args.coordinate}`);
        }
        if (args.pivot) {
            const r = await this.exec('scene', 'change-gizmo-pivot', args.pivot);
            if (!r.success) return r;
            updates.push(`pivot: ${args.pivot}`);
        }

        if (updates.length === 0) {
            return { success: false, error: 'No gizmo properties specified (gizmoTool, coordinate, pivot)' };
        }
        return { success: true, message: `Gizmo updated: ${updates.join(', ')}`, data: { updates } };
    }

    private async setGrid(args: any): Promise<ToolResponse> {
        if (args.visible !== undefined) {
            const r = await this.exec('scene', 'set-grid-visible', args.visible);
            if (!r.success) return r;
            return {
                success: true,
                message: `Grid ${args.visible ? 'shown' : 'hidden'}`,
                data: { visible: args.visible }
            };
        }
        const r = await this.exec('scene', 'query-is-grid-visible');
        if (!r.success) return r;
        return { success: true, message: 'Grid status queried', data: { visible: r.data } };
    }

    private async setViewMode(args: any): Promise<ToolResponse> {
        if (args.is2D === undefined) {
            return { success: false, error: 'is2D parameter is required' };
        }
        const r = await this.exec('scene', 'change-is2D', args.is2D);
        if (!r.success) return r;
        return {
            success: true,
            message: `View mode set to ${args.is2D ? '2D' : '3D'}`,
            data: { is2D: args.is2D }
        };
    }

    private async cameraAction(args: any): Promise<ToolResponse> {
        const action = args.cameraAction;
        if (!action) {
            return { success: false, error: 'cameraAction is required (align-with-view / align-view-with-node)' };
        }
        if (action !== 'align-with-view' && action !== 'align-view-with-node') {
            return { success: false, error: `Unsupported cameraAction: ${action}` };
        }
        return await this.execMsg(`Camera ${action}`, 'scene', action);
    }

    private async getStatus(): Promise<ToolResponse> {
        const [tool, coordinate, pivot, is2D, grid] = await Promise.all([
            this.exec('scene', 'query-gizmo-tool-name'),
            this.exec('scene', 'query-gizmo-coordinate'),
            this.exec('scene', 'query-gizmo-pivot'),
            this.exec('scene', 'query-is2D'),
            this.exec('scene', 'query-is-grid-visible'),
        ]);
        return {
            success: true,
            data: {
                gizmoTool: tool.data,
                coordinate: coordinate.data,
                pivot: pivot.data,
                is2D: is2D.data,
                gridVisible: grid.data,
            }
        };
    }
}
