// @ts-nocheck
/**
 * 节点变换工具 (node_transform)
 * 统一管理节点的位置、旋转、缩放、锚点、层级排序等变换操作
 *
 * 所有 set-property 调用通过基类 setSceneProperty() 统一处理 dump 格式，
 * 复合类型（Vec3/Vec2）自动注入 __type__ 字段
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class NodeTransform extends UnifiedToolBase {
    name = 'node_transform';
    description = '节点变换工具。支持操作: set(设置变换), move(移动节点到新父节点), reorder(调整同级顺序), reset(重置变换)';
    actions = ['set', 'move', 'reorder', 'reset'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                },
                position: {
                    type: 'object',
                    properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                    description: '位置 (用于 set)'
                },
                rotation: {
                    type: 'object',
                    properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                    description: '旋转（欧拉角）(用于 set)'
                },
                scale: {
                    type: 'object',
                    properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                    description: '缩放 (用于 set)'
                },
                width: {
                    type: 'number',
                    description: '宽度 (用于 set, 需有 UITransform)'
                },
                height: {
                    type: 'number',
                    description: '高度 (用于 set, 需有 UITransform)'
                },
                anchorPoint: {
                    type: 'object',
                    properties: { x: { type: 'number' }, y: { type: 'number' } },
                    description: '锚点 (用于 set, 需有 UITransform)。范围 0-1，默认 {x:0.5, y:0.5}'
                },
                newParentUuid: {
                    type: 'string',
                    description: '新父节点UUID (用于 move)'
                },
                siblingIndex: {
                    type: 'number',
                    description: '同级索引位置 (用于 move, reorder)',
                    default: -1
                },
                keepWorldTransform: {
                    type: 'boolean',
                    description: '是否保持世界变换',
                    default: false
                }
            },
            required: ['action', 'uuid']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'set': return await this.setTransform(args);
            case 'move': return await this.moveNode(args);
            case 'reorder': return await this.reorderNode(args);
            case 'reset': return await this.resetTransform(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async setTransform(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const { uuid } = args;
        const updates: string[] = [];

        // 节点变换属性 — 使用 'vec3' typeHint 确保注入 __type__: 'cc.Vec3'
        if (args.position) {
            const r = await this.setSceneProperty(uuid, 'position', args.position, 'vec3');
            if (!r.success) return r;
            updates.push('position');
        }
        if (args.rotation) {
            const r = await this.setSceneProperty(uuid, 'rotation', args.rotation, 'vec3');
            if (!r.success) return r;
            updates.push('rotation');
        }
        if (args.scale) {
            const r = await this.setSceneProperty(uuid, 'scale', args.scale, 'vec3');
            if (!r.success) return r;
            updates.push('scale');
        }

        // UITransform 尺寸 — 简单数字，无需 typeHint
        if (args.width !== undefined) {
            const r = await this.setSceneProperty(uuid, '__comps__.cc.UITransform.width', args.width);
            if (!r.success) return r;
            updates.push('width');
        }
        if (args.height !== undefined) {
            const r = await this.setSceneProperty(uuid, '__comps__.cc.UITransform.height', args.height);
            if (!r.success) return r;
            updates.push('height');
        }

        // UITransform 锚点 — 使用 'vec2' typeHint 确保注入 __type__: 'cc.Vec2'
        if (args.anchorPoint !== undefined) {
            const r = await this.setSceneProperty(uuid, '__comps__.cc.UITransform.anchorPoint', args.anchorPoint, 'vec2');
            if (!r.success) return r;
            updates.push('anchorPoint');
        }

        if (updates.length === 0) {
            return { success: false, error: 'No properties specified (position, rotation, scale, width, height, anchorPoint)' };
        }

        return { success: true, message: `Transform updated: ${updates.join(', ')}`, data: { uuid, updated: updates } };
    }

    private async moveNode(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'newParentUuid');
        if (missing) return missing;

        const moveOpts: any = {
            parent: args.newParentUuid,
            uuids: [args.uuid],
            keepWorldTransform: args.keepWorldTransform ?? false
        };
        const result = await this.exec('scene', 'set-parent', moveOpts);
        if (!result.success) return result;

        if (args.siblingIndex !== undefined && args.siblingIndex >= 0) {
            await this.setSceneProperty(args.uuid, 'siblingIndex', args.siblingIndex);
        }

        return { success: true, message: 'Node moved successfully', data: { uuid: args.uuid, newParentUuid: args.newParentUuid, siblingIndex: args.siblingIndex } };
    }

    private async reorderNode(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'siblingIndex');
        if (missing) return missing;

        const result = await this.setSceneProperty(args.uuid, 'siblingIndex', args.siblingIndex);
        if (!result.success) return result;

        return { success: true, message: `Node reordered to index ${args.siblingIndex}`, data: { uuid: args.uuid, siblingIndex: args.siblingIndex } };
    }

    private async resetTransform(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const { uuid } = args;
        const r1 = await this.setSceneProperty(uuid, 'position', { x: 0, y: 0, z: 0 }, 'vec3');
        if (!r1.success) return r1;
        const r2 = await this.setSceneProperty(uuid, 'rotation', { x: 0, y: 0, z: 0 }, 'vec3');
        if (!r2.success) return r2;
        const r3 = await this.setSceneProperty(uuid, 'scale', { x: 1, y: 1, z: 1 }, 'vec3');
        if (!r3.success) return r3;

        return { success: true, message: 'Transform reset to default', data: { uuid } };
    }
}
