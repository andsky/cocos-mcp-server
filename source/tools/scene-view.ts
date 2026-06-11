// @ts-nocheck
/**
 * 场景视图工具 (scene_view)
 * 统一管理场景视图的相机、Gizmo、网格、视图模式等操作
 *
 * 注意: Cocos Creator 3.8 的 scene 频道公开消息主要是节点 CRUD 操作。
 * 视图控制（聚焦、网格、Gizmo、相机）没有公开的 Editor.Message API，
 * 所以这些操作通过 execute-scene-script 在引擎运行时中执行。
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class SceneView extends UnifiedToolBase {
    name = 'scene_view';
    description = '场景视图工具。支持操作: focus(聚焦节点), gizmo(Gizmo工具), grid(网格设置), mode(视图模式), camera(相机操作), status(查询状态)';
    actions = ['focus', 'gizmo', 'grid', 'mode', 'camera', 'status'];

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
            case 'gizmo': return await this.setGizmo(args);
            case 'grid': return await this.setGrid(args);
            case 'mode': return await this.setViewMode(args);
            case 'camera': return await this.cameraOperation(args);
            case 'status': return await this.getSceneViewStatus(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async focusCamera(args: any): Promise<ToolResponse> {
        const uuids = args.uuids || [];
        if (uuids.length === 0) {
            return { success: false, error: 'At least one node UUID is required (uuids parameter)' };
        }
        // CC 3.8 scene 频道没有 focus-nodes 消息，通过 Selection API 选中节点来聚焦
        for (const uuid of uuids) {
            Editor.Selection.select('node', uuid);
        }
        return {
            success: true,
            message: `Focused on ${uuids.length} node(s) via selection`,
            data: { uuids }
        };
    }

    private async setGizmo(args: any): Promise<ToolResponse> {
        const updates: string[] = [];

        if (args.gizmoTool) {
            const result = await this.exec('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'setGizmoTool',
                args: [args.gizmoTool]
            });
            if (!result.success) return result;
            updates.push(`tool: ${args.gizmoTool}`);
        }
        if (args.coordinate) {
            const result = await this.exec('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'setGizmoCoordinate',
                args: [args.coordinate]
            });
            if (!result.success) return result;
            updates.push(`coordinate: ${args.coordinate}`);
        }
        if (args.pivot) {
            const result = await this.exec('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'setGizmoPivot',
                args: [args.pivot]
            });
            if (!result.success) return result;
            updates.push(`pivot: ${args.pivot}`);
        }

        if (updates.length === 0) {
            return { success: false, error: 'No gizmo properties specified (gizmoTool, coordinate, pivot)' };
        }
        return { success: true, message: `Gizmo updated: ${updates.join(', ')}`, data: { updates } };
    }

    private async setGrid(args: any): Promise<ToolResponse> {
        if (args.visible !== undefined) {
            const result = await this.exec('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'setGridVisible',
                args: [args.visible]
            });
            if (!result.success) return result;
            return {
                success: true,
                message: `Grid ${args.visible ? 'shown' : 'hidden'}`,
                data: { visible: args.visible }
            };
        }
        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'queryGridVisible',
            args: []
        });
        if (!result.success) return result;
        return {
            success: true,
            message: 'Grid status queried',
            data: { visible: result.data }
        };
    }

    private async setViewMode(args: any): Promise<ToolResponse> {
        if (args.is2D !== undefined) {
            const result = await this.exec('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'setViewMode',
                args: [args.is2D ? '2d' : '3d']
            });
            if (!result.success) return result;
            return {
                success: true,
                message: `View mode set to ${args.is2D ? '2D' : '3D'}`,
                data: { is2D: args.is2D }
            };
        }
        return { success: false, error: 'is2D parameter is required' };
    }

    private async cameraOperation(args: any): Promise<ToolResponse> {
        const action = args.cameraAction;
        if (!action) return { success: false, error: 'cameraAction is required' };

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'cameraOperation',
            args: [action]
        });
        if (!result.success) return result;
        return { success: true, message: `Camera action '${action}' executed`, data: { cameraAction: action } };
    }

    private async getSceneViewStatus(args: any): Promise<ToolResponse> {
        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'querySceneViewStatus',
            args: []
        });
        if (!result.success) return result;
        return { success: true, data: result.data };
    }
}
