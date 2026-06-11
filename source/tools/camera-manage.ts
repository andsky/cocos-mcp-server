// @ts-nocheck
/**
 * 相机管理工具 (camera_manage)
 * 统一管理相机组件的添加、移除、属性设置等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class CameraManage extends UnifiedToolBase {
    name = 'camera_manage';
    description = '相机管理工具。支持操作: add(添加相机), remove(移除相机), get(获取相机信息), set-projection(设置投影模式), set-fov(设置视野角度), set-ortho-size(设置正交尺寸), set-near-far(设置近远裁面), set-clear(设置清除选项), set-priority(设置渲染优先级), set-target-texture(设置渲染目标纹理)';
    actions = ['add', 'remove', 'get', 'set-projection', 'set-fov', 'set-ortho-size', 'set-near-far', 'set-clear', 'set-priority', 'set-target-texture'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                },
                projection: {
                    type: 'string',
                    enum: ['perspective', 'ortho-3d'],
                    description: '投影模式 (用于 set-projection)'
                },
                fov: {
                    type: 'number',
                    description: '视野角度 (用于 set-fov)'
                },
                orthoHeight: {
                    type: 'number',
                    description: '正交相机高度 (用于 set-ortho-size)'
                },
                near: {
                    type: 'number',
                    description: '近裁面距离 (用于 set-near-far)'
                },
                far: {
                    type: 'number',
                    description: '远裁面距离 (用于 set-near-far)'
                },
                clearColor: {
                    type: 'object',
                    description: '清除颜色 {r,g,b,a} (用于 set-clear)'
                },
                clearFlags: {
                    type: 'number',
                    description: '清除标志位 (用于 set-clear)'
                },
                priority: {
                    type: 'number',
                    description: '渲染优先级 (用于 set-priority)'
                },
                texturePath: {
                    type: 'string',
                    description: '渲染目标纹理资源路径 (用于 set-target-texture)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addCamera(args);
            case 'remove': return await this.removeCamera(args);
            case 'get': return await this.getCamera(args);
            case 'set-projection': return await this.setProjection(args);
            case 'set-fov': return await this.setFov(args);
            case 'set-ortho-size': return await this.setOrthoSize(args);
            case 'set-near-far': return await this.setNearFar(args);
            case 'set-clear': return await this.setClear(args);
            case 'set-priority': return await this.setPriority(args);
            case 'set-target-texture': return await this.setTargetTexture(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addCamera(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: 'cc.Camera'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: 'Camera component added',
            data: { uuid: args.uuid, componentUuid: result.data }
        };
    }

    private async removeCamera(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, 'cc.Camera');
        if (!('comp' in found)) return found;

        return await this.execMsg('Camera component removed', 'scene', 'remove-component', { uuid: found.comp.uuid });
    }

    private async getCamera(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const comp = (result.data?.__comps__ || []).find((c: any) => c.__type__ === 'cc.Camera');
        if (!comp) return { success: false, error: 'No Camera component found on node' };

        return {
            success: true,
            data: {
                uuid: args.uuid,
                componentUuid: comp.uuid,
                projection: comp.projection,
                fov: comp.fov,
                orthoHeight: comp.orthoHeight,
                near: comp.near,
                far: comp.far,
                clearColor: comp.clearColor,
                clearFlags: comp.clearFlags,
                priority: comp.priority,
                targetTexture: comp.targetTexture
            }
        };
    }

    private async setProjection(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'projection');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.Camera.projection', args.projection);
    }

    private async setFov(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'fov');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.Camera.fov', args.fov);
    }

    private async setOrthoSize(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'orthoHeight');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.Camera.orthoHeight', args.orthoHeight);
    }

    private async setNearFar(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const results: string[] = [];
        if (args.near !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.Camera.near', args.near);
            if (!r.success) return r;
            results.push('near');
        }
        if (args.far !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.Camera.far', args.far);
            if (!r.success) return r;
            results.push('far');
        }
        if (results.length === 0) return { success: false, error: 'near or far is required' };

        return { success: true, message: `Camera ${results.join(' and ')} updated` };
    }

    private async setClear(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        if (args.clearColor) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.Camera.clearColor', args.clearColor, 'color');
            if (!r.success) return r;
        }
        if (args.clearFlags !== undefined) {
            const r = await this.setSceneProperty(args.uuid, '__comps__.cc.Camera.clearFlags', args.clearFlags);
            if (!r.success) return r;
        }

        return { success: true, message: 'Camera clear settings updated' };
    }

    private async setPriority(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'priority');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.Camera.priority', args.priority);
    }

    private async setTargetTexture(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'texturePath');
        if (missing) return missing;

        const textureUuid = await this.resolveAssetUuid(args.texturePath);
        if (!textureUuid) return { success: false, error: `Texture not found: ${args.texturePath}` };

        return await this.setSceneProperty(args.uuid, '__comps__.cc.Camera.targetTexture', textureUuid, 'renderTexture');
    }
}
