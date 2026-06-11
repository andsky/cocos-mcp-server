// @ts-nocheck
/**
 * 材质管理工具 (material_manage)
 * 统一管理材质资源的查询、创建、删除、属性设置等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class MaterialManage extends UnifiedToolBase {
    name = 'material_manage';
    description = '材质管理工具。支持操作: list(列出材质), info(获取材质信息), create(创建材质), delete(删除材质), set-property(设置材质属性), set-effect(设置着色器效果), copy(复制材质), get-properties(获取材质属性)';
    actions = ['list', 'info', 'create', 'delete', 'set-property', 'set-effect', 'copy', 'get-properties'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                url: {
                    type: 'string',
                    description: '材质资源路径 (如 db://assets/materials/default.mtl)'
                },
                uuid: {
                    type: 'string',
                    description: '材质UUID'
                },
                nodeUuid: {
                    type: 'string',
                    description: '场景节点UUID (用于 set-property 绑定材质)'
                },
                property: {
                    type: 'string',
                    description: '属性名称 (用于 set-property)'
                },
                value: {
                    description: '属性值 (用于 set-property)'
                },
                propertyType: {
                    type: 'string',
                    description: '属性类型 (用于 set-property)'
                },
                effectPath: {
                    type: 'string',
                    description: '着色器效果资源路径 (用于 set-effect)'
                },
                source: {
                    type: 'string',
                    description: '源材质路径 (用于 copy)'
                },
                target: {
                    type: 'string',
                    description: '目标路径 (用于 copy)'
                },
                content: {
                    type: 'string',
                    description: '材质内容JSON (用于 create)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'list': return await this.listMaterials(args);
            case 'info': return await this.getMaterialInfo(args);
            case 'create': return await this.createMaterial(args);
            case 'delete': return await this.deleteMaterial(args);
            case 'set-property': return await this.setProperty(args);
            case 'set-effect': return await this.setEffect(args);
            case 'copy': return await this.copyMaterial(args);
            case 'get-properties': return await this.getProperties(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async listMaterials(args: any): Promise<ToolResponse> {
        const result = await this.exec('asset-db', 'query-assets', { ccType: 'material' });
        if (!result.success) return result;

        const materials = (result.data || []).map((m: any) => ({
            name: m.name,
            path: m.path,
            uuid: m.uuid
        }));
        return { success: true, data: { total: materials.length, materials } };
    }

    private async getMaterialInfo(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };

        const key = args.url || args.uuid;
        const result = await this.exec('asset-db', 'query-asset-info', key);
        if (!result.success) return result;
        if (!result.data) return { success: false, error: `Material not found: ${key}` };

        return {
            success: true,
            data: {
                name: result.data.name,
                path: result.data.path,
                uuid: result.data.uuid,
                type: result.data.type
            }
        };
    }

    private async createMaterial(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;

        const defaultContent = JSON.stringify({
            __type__: 'cc.Material',
            _effectAsset: null,
            _defines: {},
            _props: {}
        });

        const result = await this.exec('asset-db', 'create-asset', {
            source: args.content || defaultContent,
            target: args.url
        });
        if (!result.success) return result;

        return { success: true, message: `Material created at ${args.url}`, data: { url: args.url } };
    }

    private async deleteMaterial(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;

        return await this.execMsg(`Material deleted: ${args.url}`, 'asset-db', 'delete-asset', args.url);
    }

    private async setProperty(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'nodeUuid', 'property');
        if (missing) return missing;

        // 查找 MeshRenderer 或 SkinningModelRenderer 组件
        const nodeResult = await this.exec('scene', 'query-node', args.nodeUuid);
        if (!nodeResult.success) return nodeResult;

        const rendererTypes = ['cc.MeshRenderer', 'cc.SkinningModelRenderer'];
        const comps = nodeResult.data?.__comps__ || [];
        let rendererComp = null;
        for (const rt of rendererTypes) {
            rendererComp = comps.find((c: any) => c.__type__ === rt);
            if (rendererComp) break;
        }
        if (!rendererComp) return { success: false, error: 'No MeshRenderer or SkinningModelRenderer found on node' };

        const path = `__comps__.${rendererComp.__type__}.sharedMaterials.${args.property}`;
        return await this.setSceneProperty(args.nodeUuid, path, args.value, args.propertyType);
    }

    private async setEffect(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url', 'effectPath');
        if (missing) return missing;

        const effectUuid = await this.resolveAssetUuid(args.effectPath);
        if (!effectUuid) return { success: false, error: `Effect asset not found: ${args.effectPath}` };

        // 材质效果的设置通过 save-asset 更新材质文件
        const infoResult = await this.exec('asset-db', 'query-asset-info', args.url);
        if (!infoResult.success) return infoResult;

        return await this.exec('asset-db', 'save-asset', {
            uuid: infoResult.data?.uuid,
            path: args.url,
            content: JSON.stringify({ _effectAsset: { __uuid__: effectUuid } })
        });
    }

    private async copyMaterial(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'source', 'target');
        if (missing) return missing;

        const result = await this.exec('asset-db', 'copy-asset', {
            source: args.source,
            target: args.target
        });
        if (!result.success) return result;

        return { success: true, message: `Material copied to ${args.target}`, data: { source: args.source, target: args.target } };
    }

    private async getProperties(args: any): Promise<ToolResponse> {
        if (!args.url && !args.uuid) return { success: false, error: 'url or uuid is required' };

        const key = args.url || args.uuid;
        const result = await this.exec('asset-db', 'query-asset-info', key);
        if (!result.success) return result;
        if (!result.data) return { success: false, error: `Material not found: ${key}` };

        // 返回材质文件中的属性定义和参数
        const info = result.data;
        let props: any = {};
        try {
            if (typeof info.content === 'string') {
                props = JSON.parse(info.content);
            } else if (info.content) {
                props = info.content;
            }
        } catch {
            props = { raw: info.content };
        }

        return {
            success: true,
            data: {
                name: info.name,
                path: info.path,
                uuid: info.uuid,
                defines: props._defines || {},
                properties: props._props || {},
                effectAsset: props._effectAsset || null
            }
        };
    }
}
