// @ts-nocheck
/**
 * 2D物理管理工具 (physics2d_manage)
 * 统一管理 Cocos Creator 的2D物理组件：刚体、碰撞体、关节
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class Physics2DManage extends UnifiedToolBase {
    name = 'physics2d_manage';
    description = '2D物理管理工具。支持操作: add-body(添加刚体), add-collider(添加碰撞体), remove(移除组件), get-body(获取刚体), get-collider(获取碰撞体), set-body(设置刚体属性), set-collider(设置碰撞体属性), set-joint(添加关节)';
    actions = ['add-body', 'add-collider', 'remove', 'get-body', 'get-collider', 'set-body', 'set-collider', 'set-joint'];

    private COLLIDER2D_TYPE_MAP: Record<string, string> = {
        box: 'cc.BoxCollider2D',
        circle: 'cc.CircleCollider2D',
        polygon: 'cc.PolygonCollider2D',
        edge: 'cc.EdgeCollider2D',
    };

    private JOINT_TYPE_MAP: Record<string, string> = {
        distance: 'cc.DistanceJoint2D',
        revolute: 'cc.RevoluteJoint2D',
        prismatic: 'cc.PrismaticJoint2D',
        weld: 'cc.WeldJoint2D',
        spring: 'cc.SpringJoint2D',
        wheel: 'cc.WheelJoint2D',
        mouse: 'cc.MouseJoint2D',
    };

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: { type: 'string', description: '节点UUID' },
                colliderType: {
                    type: 'string',
                    description: '2D碰撞体类型',
                    enum: ['box', 'circle', 'polygon', 'edge']
                },
                componentType: { type: 'string', description: '要移除的组件类型 (用于 remove)' },
                // set-body
                bodyType: {
                    type: 'string',
                    description: '刚体类型',
                    enum: ['Static', 'Dynamic', 'Kinematic']
                },
                gravityScale: { type: 'number', description: '重力缩放' },
                linearDamping: { type: 'number', description: '线性阻尼' },
                angularDamping: { type: 'number', description: '角阻尼' },
                allowSleep: { type: 'boolean', description: '是否允许休眠' },
                // set-collider
                size: {
                    type: 'object',
                    properties: { width: { type: 'number' }, height: { type: 'number' } },
                    description: '碰撞体尺寸 (BoxCollider2D)'
                },
                radius: { type: 'number', description: '半径 (CircleCollider2D)' },
                offset: {
                    type: 'object',
                    properties: { x: { type: 'number' }, y: { type: 'number' } },
                    description: '碰撞体偏移'
                },
                density: { type: 'number', description: '密度' },
                friction: { type: 'number', description: '摩擦系数' },
                restitution: { type: 'number', description: '弹性系数' },
                // set-joint
                jointType: {
                    type: 'string',
                    description: '关节类型',
                    enum: ['distance', 'revolute', 'prismatic', 'weld', 'spring', 'wheel', 'mouse']
                },
                connectedBody: { type: 'string', description: '关节连接的刚体节点UUID' },
                collideConnected: { type: 'boolean', description: '连接的两个刚体是否碰撞' },
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add-body': return await this.addBody(args);
            case 'add-collider': return await this.addCollider(args);
            case 'remove': return await this.removeComponent(args);
            case 'get-body': return await this.getBody(args);
            case 'get-collider': return await this.getCollider(args);
            case 'set-body': return await this.setBody(args);
            case 'set-collider': return await this.setCollider(args);
            case 'set-joint': return await this.setJoint(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addBody(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        return await this.execMsg('RigidBody2D component added', 'scene', 'create-component', {
            node: args.uuid,
            type: 'cc.RigidBody2D'
        });
    }

    private async addCollider(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'colliderType');
        if (missing) return missing;

        const compType = this.COLLIDER2D_TYPE_MAP[args.colliderType];
        if (!compType) {
            return { success: false, error: `Unknown collider type: ${args.colliderType}. Supported: ${Object.keys(this.COLLIDER2D_TYPE_MAP).join(', ')}` };
        }

        return await this.execMsg(`${compType} added`, 'scene', 'create-component', {
            node: args.uuid,
            type: compType
        });
    }

    private async removeComponent(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'componentType');
        if (missing) return missing;

        const result = await this.findComponentOnNode(args.uuid, args.componentType);
        if (!('comp' in result)) return result as ToolResponse;
        if (!result.comp) return { success: false, error: `Component '${args.componentType}' not found on node` };

        return await this.execMsg(`${args.componentType} removed`, 'scene', 'remove-component', { uuid: result.comp.uuid });
    }

    private async getBody(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.findComponentOnNode(args.uuid, 'cc.RigidBody2D');
        if (!('comp' in result)) return result as ToolResponse;
        return { success: true, data: { body: result.comp } };
    }

    private async getCollider(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const colliderType = args.colliderType;
        if (!colliderType) {
            return { success: false, error: 'Missing required parameter: colliderType' };
        }

        const compType = this.COLLIDER2D_TYPE_MAP[colliderType] || colliderType;
        const result = await this.findComponentOnNode(args.uuid, compType);
        if (!('comp' in result)) return result as ToolResponse;
        return { success: true, data: { collider: result.comp, type: compType } };
    }

    private async setBody(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const updates: string[] = [];
        const errors: string[] = [];

        if (args.bodyType !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.RigidBody2D.type', args.bodyType);
            (r.success ? updates : errors).push('type');
        }
        if (args.gravityScale !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.RigidBody2D.gravityScale', args.gravityScale);
            (r.success ? updates : errors).push('gravityScale');
        }
        if (args.linearDamping !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.RigidBody2D.linearDamping', args.linearDamping);
            (r.success ? updates : errors).push('linearDamping');
        }
        if (args.angularDamping !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.RigidBody2D.angularDamping', args.angularDamping);
            (r.success ? updates : errors).push('angularDamping');
        }
        if (args.allowSleep !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.RigidBody2D.allowSleep', args.allowSleep);
            (r.success ? updates : errors).push('allowSleep');
        }

        if (errors.length > 0) return { success: false, error: `Failed to set: ${errors.join(', ')}` };
        if (updates.length === 0) return { success: false, error: 'No properties specified (bodyType, gravityScale, linearDamping, angularDamping, allowSleep)' };
        return { success: true, message: `RigidBody2D configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async setCollider(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const colliderType = args.colliderType;
        if (!colliderType) {
            return { success: false, error: 'Missing required parameter: colliderType (needed to determine property path)' };
        }

        const compType = this.COLLIDER2D_TYPE_MAP[colliderType] || colliderType;
        const updates: string[] = [];
        const errors: string[] = [];

        if (args.size !== undefined) {
            const r = await this.setSceneProperty(args.uuid, `__comps__.${compType}.size`, args.size, 'size');
            (r.success ? updates : errors).push('size');
        }
        if (args.radius !== undefined) {
            const r = await this.setSceneProperty(args.uuid, `__comps__.${compType}.radius`, args.radius);
            (r.success ? updates : errors).push('radius');
        }
        if (args.offset !== undefined) {
            const r = await this.setSceneProperty(args.uuid, `__comps__.${compType}.offset`, args.offset, 'vec2');
            (r.success ? updates : errors).push('offset');
        }
        if (args.density !== undefined) {
            const r = await this.setSceneProperty(args.uuid, `__comps__.${compType}.density`, args.density);
            (r.success ? updates : errors).push('density');
        }
        if (args.friction !== undefined) {
            const r = await this.setSceneProperty(args.uuid, `__comps__.${compType}.friction`, args.friction);
            (r.success ? updates : errors).push('friction');
        }
        if (args.restitution !== undefined) {
            const r = await this.setSceneProperty(args.uuid, `__comps__.${compType}.restitution`, args.restitution);
            (r.success ? updates : errors).push('restitution');
        }

        if (errors.length > 0) return { success: false, error: `Failed to set: ${errors.join(', ')}` };
        if (updates.length === 0) return { success: false, error: 'No properties specified (size, radius, offset, density, friction, restitution)' };
        return { success: true, message: `${compType} configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async setJoint(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'jointType');
        if (missing) return missing;

        const compType = this.JOINT_TYPE_MAP[args.jointType];
        if (!compType) {
            return { success: false, error: `Unknown joint type: ${args.jointType}. Supported: ${Object.keys(this.JOINT_TYPE_MAP).join(', ')}` };
        }

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: compType
        });
        if (!result.success) return result;

        // Set connected body if provided
        if (args.connectedBody) {
            const setR = await this.setSceneProperty(args.uuid, `__comps__.${compType}.connectedBody`, args.connectedBody, 'node');
            if (!setR.success) return { success: false, error: `Joint created but failed to set connectedBody: ${setR.error}` };
        }

        if (args.collideConnected !== undefined) {
            await this.setSceneProperty(args.uuid, `__comps__.${compType}.collideConnected`, args.collideConnected);
        }

        return { success: true, message: `${compType} added`, data: { uuid: args.uuid, jointType: args.jointType } };
    }
}
