// @ts-nocheck
/**
 * RichText组件工具 (ui_richtext)
 * 统一管理 RichText 富文本组件的添加、移除、属性设置等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class UIRichText extends UnifiedToolBase {
    name = 'ui_richtext';
    description = 'RichText组件工具。支持操作: add(添加RichText), remove(移除RichText), get(获取RichText信息), set-text(设置富文本内容), set-font(设置字体属性), set-max-width(设置最大宽度), set-image-atlas(设置图文集)';
    actions = ['add', 'remove', 'get', 'set-text', 'set-font', 'set-max-width', 'set-image-atlas'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID'
                },
                text: {
                    type: 'string',
                    description: '富文本内容 (用于 set-text)'
                },
                fontSize: {
                    type: 'number',
                    description: '字体大小 (用于 set-font)'
                },
                lineHeight: {
                    type: 'number',
                    description: '行高 (用于 set-font)'
                },
                fontFamily: {
                    type: 'string',
                    description: '字体名称 (用于 set-font)'
                },
                maxWidth: {
                    type: 'number',
                    description: '最大宽度 (用于 set-max-width)'
                },
                imageAtlasPath: {
                    type: 'string',
                    description: '图文集资源路径 (用于 set-image-atlas)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'add': return await this.addRichText(args);
            case 'remove': return await this.removeRichText(args);
            case 'get': return await this.getRichText(args);
            case 'set-text': return await this.setText(args);
            case 'set-font': return await this.setFont(args);
            case 'set-max-width': return await this.setMaxWidth(args);
            case 'set-image-atlas': return await this.setImageAtlas(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async addRichText(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: 'cc.RichText'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: 'RichText component added',
            data: { uuid: args.uuid, componentUuid: result.data }
        };
    }

    private async removeRichText(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const found = await this.findComponentOnNode(args.uuid, 'cc.RichText');
        if (!('comp' in found)) return found;

        return await this.execMsg('RichText component removed', 'scene', 'remove-component', { uuid: found.comp.uuid });
    }

    private async getRichText(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const comp = (result.data?.__comps__ || []).find((c: any) => c.__type__ === 'cc.RichText');
        if (!comp) return { success: false, error: 'No cc.RichText component found on node' };

        return {
            success: true,
            data: {
                uuid: args.uuid,
                componentUuid: comp.uuid,
                string: comp.string,
                fontSize: comp.fontSize,
                lineHeight: comp.lineHeight,
                fontFamily: comp.fontFamily,
                maxWidth: comp.maxWidth,
                imageAtlas: comp.imageAtlas,
                handleTouchEvent: comp.handleTouchEvent
            }
        };
    }

    private async setText(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'text');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.RichText.string', args.text);
    }

    private async setFont(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const updates: string[] = [];

        if (args.fontSize !== undefined) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.RichText.fontSize', args.fontSize);
            if (result.success) updates.push('fontSize');
        }

        if (args.lineHeight !== undefined) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.RichText.lineHeight', args.lineHeight);
            if (result.success) updates.push('lineHeight');
        }

        if (args.fontFamily !== undefined) {
            const result = await this.setSceneProperty(args.uuid, '__comps__.cc.RichText.fontFamily', args.fontFamily);
            if (result.success) updates.push('fontFamily');
        }

        if (updates.length === 0) return { success: false, error: 'No properties specified (fontSize, lineHeight, fontFamily)' };
        return { success: true, message: `RichText font configured: ${updates.join(', ')}`, data: { uuid: args.uuid, updates } };
    }

    private async setMaxWidth(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'maxWidth');
        if (missing) return missing;

        return await this.setSceneProperty(args.uuid, '__comps__.cc.RichText.maxWidth', args.maxWidth);
    }

    private async setImageAtlas(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'imageAtlasPath');
        if (missing) return missing;

        const atlasUuid = await this.resolveAssetUuid(args.imageAtlasPath);
        if (!atlasUuid) return { success: false, error: `SpriteAtlas not found: ${args.imageAtlasPath}` };

        return await this.setSceneProperty(args.uuid, '__comps__.cc.RichText.imageAtlas', atlasUuid, 'spriteAtlas');
    }
}
