// @ts-nocheck
/**
 * 3D物理管理工具 (physics3d_manage)
 * 统一管理 Cocos Creator 的3D物理组件：刚体、碰撞体、物理材质、约束
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class Physics3DManage extends UnifiedToolBase {
    name = 'physics3d_manage';
    description = '3D物理管理工具。支持操作: add-body(添加刚体), add-collider(添加碰撞体), remove(移除组件), get-body(获取刚体), get-collider(获取碰撞体), set-body(设置刚体属性), set-collider(设置碰撞体属性), set-material(设置物理材质), set-constraint(添加约束)';
    actions = ['add-body', 'add-collider', 'remove', 'get-body', 'get-collider', 'set-body', 'set-collider', 'set-material', 'set-constraint'];

    private COLLIDER_TYPE_MAP: Record<string, string> = {
        box: 'cc.BoxCollider',
        sphere: 'cc.SphereCollider',
        capsule: 'cc.CapsuleCollider',
        cylinder: 'cc.CylinderCollider',
        cone: 'cc.ConeCollider',
        mesh: 'cc.MeshCollider',
    };

    private CONSTRAINT_TYPE_MAP: Record<string, string> = {
        hinge: 'cc.HingeConstraint',
        spring: 'cc.SpringConstraint',
        fixed: 'cc.FixedConstraint',
    };

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: { type: 'string', description: '节点UUID' },
                colliderType: {
                    type: 'string',
                    description: '碰撞体类型',
                    enum: ['box', 'sphere', 'capsule', 'cylinder', 'cone', 'mesh']
                },
                componentType: { type: 'string', description: '要移除的组件类型 (用于 remove)' },
                // set-body
                mass: { type: 'number', description: '质量' },
                linearDamping: { type: 'number', description: '线性阻尼' },
                angularDamping: { type: 'number', description: '角阻尼' },
                bodyType: {
                    type: 'string',
                    description: '刚体类型',
                    enum: ['static', 'dynamic', 'kinematic']
                },
                // set-collider
                size: {
                    type: 'object',
                    properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                    description: '碰撞体尺寸 (BoxCollider)'
                },
                radius: { type: 'number', description: '半径 (SphereCollider/CapsuleCollider/CylinderCollider/ConeCollider)' },
                height: { type: 'number', description: '高度 (CapsuleCollider/CylinderCollider/ConeCollider)' },
                direction: {
                    type: 'string',
                    description: '胶囊体朝向',
                    enum: ['X', 'Y', 'Z']
                },
                // set-material
                friction: { type: 'number', description: '摩擦系数' },
                restitution: { type: 'number', description: '弹性系数 (恢复系数)' },
                // set-constraint
                constraintType: {
                    type: 'string',
                    description: '约束类型',
                    enum: ['hinge', 'spring', 'fixed']
                },
                connectedBody: { type: 'string', description: '约束连接的刚体节点UUID' },
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
            case 'set-material': return await this.setMaterial(args);
            case 'set-constraint': return await this.setConstraint(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addBody(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        return await this.execMsg('RigidBody component added', 'scene', 'create-component', {
            node: args.uuid,
            type: 'cc.RigidBody'
        });
    }

    private async addCollider(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'colliderType');
        if (missing) return missing;

        const compType = this.COLLIDER_TYPE_MAP[args.colliderType];
        if (!compType) {
            return { success: false, error: `Unknown collider type: ${args.colliderType}. Supported: ${Object.keys(this.COLLIDER_TYPE_MAP).join(', ')}` };
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

        const result = await this.findComponentOnNode(args.uuid, 'cc.RigidBody');
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

        const compType = this.COLLIDER_TYPE_MAP[colliderType] || colliderType;
        const result = await this.findComponentOnNode(args.uuid, compType);
        if (!('comp' in result)) return result as ToolResponse;
        return { success: true, data: { collider: result.comp, type: compType } };
    }

    private async setBody(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const updates: string[] = [];
        const errors: string[] = [];

        if (args.mass !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.RigidBody.mass', args.mass);
            (r.success ? updates : errors).push('mass');
        }
        if (args.linearDamping !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.RigidBody.linearDamping', args.linearDamping);
            (r.success ? updates : errors).push('linearDamping');
        }
        if (args.angularDamping !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.RigidBody.angularDamping', args.angularDamping);
            (r.success ? updates : errors).push('angularDamping');
        }
        if (args.bodyType !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.RigidBody.type', args.bodyType);
            (r.success ? updates : errors).push('type');
        }

        if (errors.length > 0) return { success: false, error: `Failed to set: ${errors.join(', ')}` };
        if (updates.length === 0) return { success: false, error: 'No properties specified (mass, linearDamping, angularDamping, bodyType)' };
        return { success: true, message: `RigidBody configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async setCollider(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const colliderType = args.colliderType;
        if (!colliderType) {
            return { success: false, error: 'Missing required parameter: colliderType (needed to determine property path)' };
        }

        const compType = this.COLLIDER_TYPE_MAP[colliderType] || colliderType;
        const updates: string[] = [];
        const errors: string[] = [];

        if (args.size !== undefined) {
            const r = await this.setSceneProperty(args.uuid, `__comps__.${compType}.size`, args.size, 'vec3');
            (r.success ? updates : errors).push('size');
        }
        if (args.radius !== undefined) {
            const r = await this.setSceneProperty(args.uuid, `__comps__.${compType}.radius`, args.radius);
            (r.success ? updates : errors).push('radius');
        }
        if (args.height !== undefined) {
            const r = await this.setSceneProperty(args.uuid, `__comps__.${compType}.height`, args.height);
            (r.success ? updates : errors).push('height');
        }
        if (args.direction !== undefined) {
            const r = await this.setSceneProperty(args.uuid, `__comps__.${compType}.direction`, args.direction);
            (r.success ? updates : errors).push('direction');
        }

        if (errors.length > 0) return { success: false, error: `Failed to set: ${errors.join(', ')}` };
        if (updates.length === 0) return { success: false, error: 'No properties specified (size, radius, height, direction)' };
        return { success: true, message: `${compType} configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async setMaterial(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const colliderType = args.colliderType;
        if (!colliderType) {
            return { success: false, error: 'Missing required parameter: colliderType (needed to determine component path)' };
        }

        const compType = this.COLLIDER_TYPE_MAP[colliderType] || colliderType;
        const updates: string[] = [];
        const errors: string[] = [];

        if (args.friction !== undefined) {
            const r = await this.setSceneProperty(args.uuid, `__comps__.${compType}.material.friction`, args.friction);
            (r.success ? updates : errors).push('friction');
        }
        if (args.restitution !== undefined) {
            const r = await this.setSceneProperty(args.uuid, `__comps__.${compType}.material.restitution`, args.restitution);
            (r.success ? updates : errors).push('restitution');
        }

        if (errors.length > 0) return { success: false, error: `Failed to set: ${errors.join(', ')}` };
        if (updates.length === 0) return { success: false, error: 'No properties specified (friction, restitution)' };
        return { success: true, message: `Physics material configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async setConstraint(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'constraintType');
        if (missing) return missing;

        const compType = this.CONSTRAINT_TYPE_MAP[args.constraintType];
        if (!compType) {
            return { success: false, error: `Unknown constraint type: ${args.constraintType}. Supported: ${Object.keys(this.CONSTRAINT_TYPE_MAP).join(', ')}` };
        }

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: compType
        });
        if (!result.success) return result;

        return { success: true, message: `${compType} added`, data: { uuid: args.uuid, constraintType: args.constraintType } };
    }
}
