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
     * Cocos Creator 的 set-property API 对 vec2/vec3/color/size 等复合类型需要 __type__ 字段
     *
     * 当 propertyType 未显式指定时，自动从 value 的形状推断类型：
     * - { x, y, z } → cc.Vec3
     * - { x, y }（无 z）→ cc.Vec2
     * - { r, g, b } → cc.Color
     * - { width, height } → cc.Size
     */
    protected formatDump(value: any, propertyType?: string): any {
        if (value === undefined || value === null) {
            return { value };
        }

        const TYPE_MAP: Record<string, string> = {
            vec2: 'cc.Vec2',
            vec3: 'cc.Vec3',
            color: 'cc.Color',
            size: 'cc.Size',
        };

        // 显式指定了 propertyType → 直接用
        if (propertyType) {
            const ccType = TYPE_MAP[propertyType];
            if (ccType) {
                return { value: { __type__: ccType, ...value } };
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
        try {
            const info = await Editor.Message.request('asset-db', 'query-asset-info', assetPath);
            return info?.uuid || null;
        } catch {
            return null;
        }
    }
}
