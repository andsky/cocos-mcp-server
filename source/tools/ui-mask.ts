// @ts-nocheck
/**
 * Mask组件工具 (ui_mask)
 * 统一管理 Mask 遮罩组件的添加、移除、属性设置等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class UIMask extends UnifiedToolBase {
    name = 'ui_mask';
    description = 'Mask组件工具。支持操作: add(添加Mask), remove(移除Mask), get(获取Mask信息), set-type(设置遮罩类型), set-sprite-frame(设置遮罩图片), set-threshold(设置透明阈值), set-inverted(设置反转), set-ellipse-segments(设置椭圆分段数)';
    actions = ['add', 'remove', 'get', 'set-type', 'set-sprite-frame', 'set-threshold', 'set-inverted', 'set-ellipse-segments'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                },
                maskType: {
                    type: 'number',
                    description: '遮罩类型: 0=矩形, 1=椭圆, 2=图形, 3=图片 (用于 set-type)'
                },
                spriteFramePath: {
                    type: 'string',
                    description: '遮罩图片资源路径 (用于 set-sprite-frame)'
                },
                alphaThreshold: {
                    type: 'number',
                    description: '透明度阈值 0-1 (用于 set-threshold)'
                },
                inverted: {
                    type: 'boolean',
                    description: '是否反转遮罩 (用于 set-inverted)'
                },
                segments: {
                    type: 'number',
                    description: '椭圆分段数 (用于 set-ellipse-segments)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addMask(args);
            case 'remove': return await this.removeMask(args);
            case 'get': return await this.getMask(args);
            case 'set-type': return await this.setType(args);
            case 'set-sprite-frame': return await this.setSpriteFrame(args);
            case 'set-threshold': return await this.setThreshold(args);
            case 'set-inverted': return await this.setInverted(args);
            case 'set-ellipse-segments': return await this.setEllipseSegments(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addMask(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: 'cc.Mask'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: 'Mask component added',
            data: { uuid: args.uuid, componentUuid: result.data }
        };
    }

    private async removeMask(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, 'cc.Mask');
        if (!('comp' in found)) return found;

        return await this.execMsg('Mask component removed', 'scene', 'remove-component', { uuid: found.comp.uuid });
    }

    private async getMask(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const comp = (result.data?.__comps__ || []).find((c: any) => c.__type__ === 'cc.Mask');
        if (!comp) return { success: false, error: 'No cc.Mask component found on node' };

        return {
            success: true,
            data: {
                uuid: args.uuid,
                componentUuid: comp.uuid,
                type: comp.type,
                inverted: comp.inverted,
                alphaThreshold: comp.alphaThreshold,
                spriteFrame: comp.spriteFrame,
                segments: comp.segments
            }
        };
    }

    private async setType(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'maskType');
        if (missing) return missing;

        if (![0, 1, 2, 3].includes(args.maskType)) {
            return { success: false, error: 'maskType must be 0(RECT), 1(ELLIPSE), 2(GRAPHICS), or 3(IMAGE)' };
        }

        return await this.setSceneProperty(args.uuid, '__comps__.cc.Mask.type', args.maskType);
    }

    private async setSpriteFrame(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'spriteFramePath');
        if (missing) return missing;

        const sfUuid = await this.resolveAssetUuid(args.spriteFramePath);
        if (!sfUuid) return { success: false, error: `SpriteFrame not found: ${args.spriteFramePath}` };

        return await this.setSceneProperty(args.uuid, '__comps__.cc.Mask.spriteFrame', sfUuid, 'spriteFrame');
    }

    private async setThreshold(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'alphaThreshold');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.Mask.alphaThreshold', args.alphaThreshold);
    }

    private async setInverted(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'inverted');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.Mask.inverted', args.inverted);
    }

    private async setEllipseSegments(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'segments');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.Mask.segments', args.segments);
    }
}
