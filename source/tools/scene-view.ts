// @ts-nocheck
/**
 * 场景视图工具 (scene_view)
 * 统一管理场景视图的相机、Gizmo、网格、视图模式等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class SceneView extends UnifiedToolBase {
    name = 'scene_view';
    description = '场景视图工具。支持操作: focus(聚焦节点), align(对齐视图), gizmo(Gizmo工具), grid(网格设置), mode(视图模式), camera(相机操作), reset(重置), status(查询状态)';
    actions = ['focus', 'align', 'gizmo', 'grid', 'mode', 'camera', 'reset', 'status'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuids: { type: 'array', items: { type: 'string' }, description: '节点UUID列表 (用于 focus)' },
                gizmoTool: { type: 'string', description: 'Gizmo工具类型', enum: ['position', 'rotation', 'scale', 'rect'] },
                coordinate: { type: 'string', description: '坐标系', enum: ['local', 'global'] },
                pivot: { type: 'string', description: '轴心点', enum: ['pivot', 'center'] },
                visible: { type: 'boolean', description: '是否可见 (用于 grid)' },
                is2D: { type: 'boolean', description: '是否2D模式 (用于 mode)' },
                cameraAction: {
                    type: 'string',
                    description: '相机操作 (用于 camera)',
                    enum: ['align-with-view', 'align-view-with-node', 'reset']
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'focus': return await this.focusCamera(args);
            case 'align': return await this.alignView();
            case 'gizmo': return await this.setGizmo(args);
            case 'grid': return await this.setGrid(args);
            case 'mode': return await this.setViewMode(args);
            case 'camera': return await this.cameraOperation(args);
            case 'reset': return await this.resetSceneView();
            case 'status': return await this.getSceneViewStatus();
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async focusCamera(args: any): Promise<ToolResponse> {
        const result = await this.exec('scene', 'focus-nodes', args.uuids || null);
        if (!result.success) return result;
        return {
            success: true,
            message: args.uuids ? `Camera focused on ${args.uuids.length} node(s)` : 'Camera focused on scene',
            data: { uuids: args.uuids }
        };
    }

    private async alignView(): Promise<ToolResponse> {
        return await this.execMsg('View aligned with camera', 'scene', 'align-camera-with-view');
    }

    private async setGizmo(args: any): Promise<ToolResponse> {
        const updates: string[] = [];

        if (args.gizmoTool) {
            const r = await this.exec('scene', 'set-gizmo-tool', args.gizmoTool);
            if (!r.success) return r;
            updates.push(`tool: ${args.gizmoTool}`);
        }
        if (args.coordinate) {
            const r = await this.exec('scene', 'set-gizmo-coordinate', args.coordinate);
            if (!r.success) return r;
            updates.push(`coordinate: ${args.coordinate}`);
        }
        if (args.pivot) {
            const r = await this.exec('scene', 'set-gizmo-pivot', args.pivot);
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
        }
        const result = await this.exec('scene', 'query-grid-visible');
        if (!result.success) return result;
        return {
            success: true,
            message: `Grid ${args.visible !== undefined ? (args.visible ? 'shown' : 'hidden') : 'status queried'}`,
            data: { visible: result.data }
        };
    }

    private async setViewMode(args: any): Promise<ToolResponse> {
        if (args.is2D !== undefined) {
            await this.exec('scene', 'set-view-mode', args.is2D ? '2d' : '3d');
        }
        const result = await this.exec('scene', 'query-view-mode');
        if (!result.success) return result;
        return {
            success: true,
            message: `View mode ${args.is2D !== undefined ? (args.is2D ? '2D' : '3D') : 'queried'}`,
            data: { is2D: result.data === '2d', mode: result.data }
        };
    }

    private async cameraOperation(args: any): Promise<ToolResponse> {
        const map: Record<string, string> = {
            'align-with-view': 'align-camera-with-view',
            'align-view-with-node': 'align-view-with-node',
            'reset': 'reset-camera'
        };
        const method = map[args.cameraAction];
        if (!method) return { success: false, error: `Unknown camera action: ${args.cameraAction}` };

        const result = await this.exec('scene', method);
        if (!result.success) return result;
        return { success: true, message: `Camera action '${args.cameraAction}' executed`, data: { cameraAction: args.cameraAction } };
    }

    private async resetSceneView(): Promise<ToolResponse> {
        return await this.execMsg('Scene view reset to default', 'scene', 'reset-scene-view');
    }

    private async getSceneViewStatus(): Promise<ToolResponse> {
        const [gizmoTool, coordinate, pivot, gridVisible, viewMode] = await Promise.all([
            this.exec('scene', 'query-gizmo-tool'),
            this.exec('scene', 'query-gizmo-coordinate'),
            this.exec('scene', 'query-gizmo-pivot'),
            this.exec('scene', 'query-grid-visible'),
            this.exec('scene', 'query-view-mode')
        ]);

        return {
            success: true,
            data: {
                gizmoTool: gizmoTool.success ? gizmoTool.data : null,
                coordinate: coordinate.success ? coordinate.data : null,
                pivot: pivot.success ? pivot.data : null,
                gridVisible: gridVisible.success ? gridVisible.data : null,
                viewMode: viewMode.success ? viewMode.data : null,
                is2D: viewMode.success ? viewMode.data === '2d' : null
            }
        };
    }
}
