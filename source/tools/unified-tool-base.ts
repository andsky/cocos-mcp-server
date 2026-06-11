// @ts-nocheck
/**
 * 统一工具基类
 * 所有工具采用 "类别_功能域" 命名，通过 action 参数切换操作
 */

import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export interface UnifiedToolDefinition extends ToolDefinition {
    actions: string[];
}

export abstract class UnifiedToolBase implements ToolExecutor {
    abstract name: string;  // 工具名称，如 "node_lifecycle"
    abstract description: string;
    abstract actions: string[];  // 支持的操作列表
    category: string = 'core';

    getTools(): ToolDefinition[] {
        return [{
            name: this.name,
            description: this.description,
            inputSchema: this.getUnifiedSchema()
        }];
    }

    /**
     * 获取统一的输入 Schema
     */
    abstract getUnifiedSchema(): any;

    /**
     * 执行工具调用
     * 根据 action 参数分发到具体的处理方法
     */
    async execute(action: string, args: any): Promise<ToolResponse> {
        if (!this.actions.includes(action)) {
            return {
                success: false,
                error: `Invalid action '${action}'. Supported actions: ${this.actions.join(', ')}`
            };
        }
        return await this.executeAction(action, args);
    }

    /**
     * 执行具体的 action
     */
    abstract executeAction(action: string, args: any): Promise<ToolResponse>;


    /**
     * 统一的 Editor.Message.request 调用封装
     * 消除每个方法重复的 try/catch + success/error 包装
     */
    protected async exec(
        channel: string,
        method: string,
        ...params: any[]
    ): Promise<ToolResponse> {
        try {
            const result = await Editor.Message.request(channel, method, ...params);
            return { success: true, data: result };
        } catch (err: any) {
            return {
                success: false,
                error: err.message || String(err),
                // 保留调试上下文：哪个 channel/method 失败了
                _debug: { tool: this.name, channel, method },
            };
        }
    }

    protected async execMsg(
        message: string,
        channel: string,
        method: string,
        ...params: any[]
    ): Promise<ToolResponse> {
        const result = await this.exec(channel, method, ...params);
        if (result.success) {
            result.message = message;
        }
        return result;
    }

    protected generateActionSchema(actions: string[]): any {
        return {
            type: 'string',
            enum: actions,
            description: `操作类型。可选值: ${actions.join(', ')}`
        };
    }

    /**
     * 通用参数校验 - 检查必填参数
     * 注意: 使用 args[p] === undefined 检查，允许 0/false/'' 等合法 falsy 值通过
     */
    protected requireParams(args: any, ...params: string[]): ToolResponse | null {
        for (const p of params) {
            if (args[p] === undefined || args[p] === null) {
                return { success: false, error: `Missing required parameter: ${p}` };
            }
        }
        return null;
    }

    /**
     * 根据 propertyType 构造正确的 dump 格式
     * Cocos Creator 的 set-property API 对复合类型需要 __type__ 字段
     * 对资源引用类型需要 { __uuid__, __expectedType__ } 格式
     *
     * 支持的 propertyType:
     * - 复合类型: vec2, vec3, color, size
     * - 资源引用: spriteFrame, texture, prefab, audioClip, material, effectAsset,
     *             font, spSkeletonData, dragonBonesAsset, tiledMapAsset, spriteAtlas, labelAtlas
     * - 节点/组件引用: node, component
     * - 简单类型: string, number, boolean (直接传值)
     *
     * 未指定 propertyType 时，自动从 value 形状推断复合类型
     */
    protected formatDump(value: any, propertyType?: string): any {
        if (value === undefined || value === null) {
            return { value };
        }

        // 如果 value 已经是带 __uuid__ 的引用对象，直接透传
        if (typeof value === 'object' && !Array.isArray(value) && value.__uuid__) {
            return { value };
        }

        // 复合类型映射
        const TYPE_MAP: Record<string, string> = {
            vec2: 'cc.Vec2',
            vec3: 'cc.Vec3',
            color: 'cc.Color',
            size: 'cc.Size',
        };

        // 资源引用类型映射 — value 应为 UUID 字符串
        const RESOURCE_TYPE_MAP: Record<string, string> = {
            spriteFrame: 'cc.SpriteFrame',
            texture: 'cc.Texture2D',
            prefab: 'cc.Prefab',
            audioClip: 'cc.AudioClip',
            material: 'cc.Material',
            effectAsset: 'cc.EffectAsset',
            font: 'cc.Font',
            spSkeletonData: 'sp.SkeletonData',
            dragonBonesAsset: 'dragonBones.DragonBonesAsset',
            tiledMapAsset: 'cc.TiledMapAsset',
            spriteAtlas: 'cc.SpriteAtlas',
            labelAtlas: 'cc.LabelAtlas',
            renderTexture: 'cc.RenderTexture',
            animationClip: 'cc.AnimationClip',
            mesh: 'cc.Mesh',
        };

        // 显式指定了 propertyType → 直接用
        if (propertyType) {
            // 复合类型
            const ccType = TYPE_MAP[propertyType];
            if (ccType) {
                return { value: { __type__: ccType, ...value } };
            }
            // 资源引用类型
            const expectedType = RESOURCE_TYPE_MAP[propertyType];
            if (expectedType) {
                const uuid = typeof value === 'string' ? value : value?.uuid || value;
                const ref: any = { __uuid__: uuid };
                if (expectedType !== 'cc.Prefab') {
                    ref.__expectedType__ = expectedType;
                }
                return { value: ref };
            }
            // 节点引用 / 组件引用
            if (propertyType === 'node' || propertyType === 'component') {
                const uuid = typeof value === 'string' ? value : value?.uuid || value;
                return { value: { __uuid__: uuid } };
            }
            // 通用 asset 类型 — 不指定 expectedType
            if (propertyType === 'asset') {
                const uuid = typeof value === 'string' ? value : value?.uuid || value;
                return { value: { __uuid__: uuid } };
            }
            return { value };
        }

        // 未指定 propertyType → 从 value 形状自动推断
        if (typeof value === 'object' && !Array.isArray(value)) {
            const keys = Object.keys(value);
            if (keys.includes('z') && keys.includes('x') && keys.includes('y')) {
                return { value: { __type__: 'cc.Vec3', ...value } };
            }
            if (keys.includes('x') && keys.includes('y') && !keys.includes('z')) {
                return { value: { __type__: 'cc.Vec2', ...value } };
            }
            if (keys.includes('r') && keys.includes('g') && keys.includes('b')) {
                return { value: { __type__: 'cc.Color', ...value } };
            }
            if (keys.includes('width') && keys.includes('height')) {
                return { value: { __type__: 'cc.Size', ...value } };
            }
        }

        return { value };
    }

    /**
     * 统一的 set-property 调用入口
     * 自动通过 formatDump 处理复合类型的 __type__ 字段
     * 所有工具的 set-property 调用应走此方法，禁止自行构造 dump
     */
    protected async setSceneProperty(
        uuid: string,
        path: string,
        value: any,
        propertyType?: string
    ): Promise<ToolResponse> {
        return await this.exec('scene', 'set-property', {
            uuid,
            path,
            dump: this.formatDump(value, propertyType)
        });
    }

    /**
     * 在节点上查找指定类型的组件
     * 返回组件 dump 对象，或 null（未找到）
     */
    protected async findComponentOnNode(
        nodeUuid: string,
        componentType: string
    ): Promise<{ comp: any } | ToolResponse> {
        const result = await this.exec('scene', 'query-node', nodeUuid);
        if (!result.success) return result;
        const comps = result.data?.__comps__ || [];
        const comp = comps.find((c: any) => c.__type__ === componentType);
        if (!comp) {
            return { success: false, error: `Component '${componentType}' not found on node` };
        }
        return { comp };
    }

    protected async resolveAssetUuid(assetPath: string): Promise<string | null> {
        const result = await this.exec('asset-db', 'query-asset-info', assetPath);
        if (!result.success) return null;
        return result.data?.uuid || null;
    }
}
