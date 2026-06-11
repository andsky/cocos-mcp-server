// @ts-nocheck
/**
 * 渲染纹理管理工具 (render_texture)
 * 统一管理渲染纹理资源的查询、创建、删除、尺寸设置等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class RenderTexture extends UnifiedToolBase {
    name = 'render_texture';
    description = '渲染纹理管理工具。支持操作: list(列出渲染纹理), info(获取纹理信息), create(创建渲染纹理), delete(删除渲染纹理), set-size(设置纹理尺寸)';
    actions = ['list', 'info', 'create', 'delete', 'set-size'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                url: {
                    type: 'string',
                    description: '渲染纹理资源路径 (如 db://assets/textures/rt.rt)'
                },
                uuid: {
                    type: 'string',
                    description: '渲染纹理UUID'
                },
                width: {
                    type: 'number',
                    description: '纹理宽度 (用于 create, set-size)'
                },
                height: {
                    type: 'number',
                    description: '纹理高度 (用于 create, set-size)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'list': return await this.listRenderTextures(args);
            case 'info': return await this.getInfo(args);
            case 'create': return await this.createRenderTexture(args);
            case 'delete': return await this.deleteRenderTexture(args);
            case 'set-size': return await this.setSize(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async listRenderTextures(args: any): Promise<ToolResponse> {
        const result = await this.exec('asset-db', 'query-assets', { ccType: 'render-texture' });
        if (!result.success) return result;

        const textures = (result.data || []).map((t: any) => ({
            name: t.name,
            path: t.path,
            uuid: t.uuid
        }));
        return { success: true, data: { total: textures.length, renderTextures: textures } };
    }

    private async getInfo(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };

        const key = args.url || args.uuid;
        const result = await this.exec('asset-db', 'query-asset-info', key);
        if (!result.success) return result;
        if (!result.data) return { success: false, error: `Render texture not found: ${key}` };

        return {
            success: true,
            data: {
                name: result.data.name,
                path: result.data.path,
                uuid: result.data.uuid,
                type: result.data.type,
                width: result.data.width,
                height: result.data.height
            }
        };
    }

    private async createRenderTexture(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;

        const width = args.width || 256;
        const height = args.height || 256;

        const content = JSON.stringify({
            __type__: 'cc.RenderTexture',
            width,
            height
        });

        const result = await this.exec('asset-db', 'create-asset', {
            source: content,
            target: args.url
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Render texture created at ${args.url} (${width}x${height})`,
            data: { url: args.url, width, height }
        };
    }

    private async deleteRenderTexture(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;

        return await this.execMsg(`Render texture deleted: ${args.url}`, 'asset-db', 'delete-asset', args.url);
    }

    private async setSize(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };
        if (args.width === undefined && args.height === undefined) {
            return { success: false, error: 'width or height is required' };
        }

        // 查询当前信息以获取 UUID
        const key = args.url || args.uuid;
        const infoResult = await this.exec('asset-db', 'query-asset-info', key);
        if (!infoResult.success) return infoResult;
        if (!infoResult.data) return { success: false, error: `Render texture not found: ${key}` };

        const newWidth = args.width !== undefined ? args.width : infoResult.data.width || 256;
        const newHeight = args.height !== undefined ? args.height : infoResult.data.height || 256;

        const content = JSON.stringify({
            __type__: 'cc.RenderTexture',
            width: newWidth,
            height: newHeight
        });

        const result = await this.exec('asset-db', 'save-asset', {
            uuid: infoResult.data.uuid,
            content
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Render texture resized to ${newWidth}x${newHeight}`,
            data: { uuid: infoResult.data.uuid, width: newWidth, height: newHeight }
        };
    }
}
