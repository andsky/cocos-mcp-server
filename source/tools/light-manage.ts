// @ts-nocheck
/**
 * 灯光管理工具 (light_manage)
 * 统一管理灯光组件的添加、移除、属性设置等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class LightManage extends UnifiedToolBase {
    name = 'light_manage';
    description = '灯光管理工具。支持操作: add(添加灯光), remove(移除灯光), get(获取灯光信息), set-color(设置颜色), set-intensity(设置强度), set-range(设置范围), set-spot-angle(设置聚光灯角度), set-shadow(设置阴影), set-type(切换灯光类型)';
    actions = ['add', 'remove', 'get', 'set-color', 'set-intensity', 'set-range', 'set-spot-angle', 'set-shadow', 'set-type'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                },
                lightType: {
                    type: 'string',
                    enum: ['cc.DirectionalLight', 'cc.PointLight', 'cc.SpotLight', 'cc.SphereLight'],
                    description: '灯光类型 (用于 add, set-type)'
                },
                color: {
                    type: 'object',
                    description: '灯光颜色 {r,g,b,a} (用于 set-color)'
                },
                intensity: {
                    type: 'number',
                    description: '灯光强度 (用于 set-intensity)'
                },
                range: {
                    type: 'number',
                    description: '灯光范围 (用于 set-range)'
                },
                spotAngle: {
                    type: 'number',
                    description: '聚光灯角度 (用于 set-spot-angle)'
                },
                shadowEnabled: {
                    type: 'boolean',
                    description: '是否启用阴影 (用于 set-shadow)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addLight(args);
            case 'remove': return await this.removeLight(args);
            case 'get': return await this.getLight(args);
            case 'set-color': return await this.setColor(args);
            case 'set-intensity': return await this.setIntensity(args);
            case 'set-range': return await this.setRange(args);
            case 'set-spot-angle': return await this.setSpotAngle(args);
            case 'set-shadow': return await this.setShadow(args);
            case 'set-type': return await this.setType(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async findLightComponent(nodeUuid: string): Promise<{ comp: any; compType: string } | ToolResponse> {
        const result = await this.exec('scene', 'query-node', nodeUuid);
        if (!result.success) return result;

        const LIGHT_TYPES = ['cc.DirectionalLight', 'cc.PointLight', 'cc.SpotLight', 'cc.SphereLight'];
        const comps = result.data?.__comps__ || [];
        for (const lt of LIGHT_TYPES) {
            const comp = comps.find((c: any) => c.__type__ === lt);
            if (comp) return { comp, compType: lt };
        }
        return { success: false, error: 'No light component found on node' };
    }

    private async addLight(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const lightType = args.lightType || 'cc.DirectionalLight';
        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: lightType
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Light component '${lightType}' added`,
            data: { uuid: args.uuid, componentUuid: result.data, lightType }
        };
    }

    private async removeLight(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findLightComponent(args.uuid);
        if (!('comp' in found)) return found as ToolResponse;

        return await this.execMsg('Light component removed', 'scene', 'remove-component', { uuid: found.comp.uuid });
    }

    private async getLight(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findLightComponent(args.uuid);
        if (!('comp' in found)) return found as ToolResponse;

        return {
            success: true,
            data: {
                uuid: args.uuid,
                componentUuid: found.comp.uuid,
                type: found.compType,
                color: found.comp.color,
                intensity: found.comp.intensity,
                shadowEnabled: found.comp.shadowEnabled
            }
        };
    }

    private async setColor(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'color');
        if (missing) return missing;

        const found = await this.findLightComponent(args.uuid);
        if (!('comp' in found)) return found as ToolResponse;

        return await this.setSceneProperty(args.uuid, `__comps__.${found.compType}.color`, args.color, 'color');
    }

    private async setIntensity(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'intensity');
        if (missing) return missing;

        const found = await this.findLightComponent(args.uuid);
        if (!('comp' in found)) return found as ToolResponse;

        return await this.setSceneProperty(args.uuid, `__comps__.${found.compType}.intensity`, args.intensity);
    }

    private async setRange(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'range');
        if (missing) return missing;

        const found = await this.findLightComponent(args.uuid);
        if (!('comp' in found)) return found as ToolResponse;

        return await this.setSceneProperty(args.uuid, `__comps__.${found.compType}.range`, args.range);
    }

    private async setSpotAngle(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'spotAngle');
        if (missing) return missing;

        const found = await this.findLightComponent(args.uuid);
        if (!('comp' in found)) return found as ToolResponse;

        if (found.compType !== 'cc.SpotLight') {
            return { success: false, error: 'spotAngle is only applicable to SpotLight' };
        }

        return await this.setSceneProperty(args.uuid, '__comps__.cc.SpotLight.spotAngle', args.spotAngle);
    }

    private async setShadow(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'shadowEnabled');
        if (missing) return missing;

        const found = await this.findLightComponent(args.uuid);
        if (!('comp' in found)) return found as ToolResponse;

        return await this.setSceneProperty(args.uuid, `__comps__.${found.compType}.shadowEnabled`, args.shadowEnabled);
    }

    private async setType(args: any): Promise<ToolResponse> {
        return {
            success: false,
            error: 'Light type cannot be changed directly. Remove the current light and add a new one with the desired type.',
            instruction: `Use action 'remove' then 'add' with lightType parameter.`
        };
    }
}
