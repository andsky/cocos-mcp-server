/**
 * Unified tool base class.
 *
 * All tools follow the "category_domain + action parameter" pattern.
 * Core file — no @ts-nocheck.
 */

import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export interface UnifiedToolDefinition extends ToolDefinition {
    actions: string[];
}

export abstract class UnifiedToolBase implements ToolExecutor {
    abstract name: string;           // e.g. "node_lifecycle"
    abstract description: string;
    abstract actions: string[];      // supported action list
    category: string = 'core';

    getTools(): ToolDefinition[] {
        return [{
            name: this.name,
            description: this.description,
            inputSchema: this.getUnifiedSchema()
        }];
    }

    /** Build the unified input JSON Schema for this tool. */
    abstract getUnifiedSchema(): any;

    /**
     * Execute a tool call.
     * Dispatches to the concrete action handler via the `action` parameter.
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

    /** Dispatch to the concrete action handler. */
    abstract executeAction(action: string, args: any): Promise<ToolResponse>;


    /**
     * Wrapper around Editor.Message.request.
     * Catches errors and returns a uniform ToolResponse — callers never need try/catch.
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
            description: `Action type. Options: ${actions.join(', ')}`
        };
    }

    /**
     * Validate required parameters.
     * Uses `=== undefined` check so 0/false/'' pass through.
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
     * Build the correct dump format for set-property.
     *
     * Cocos Creator requires `__type__` on compound types and
     * `{ __uuid__, __expectedType__ }` on asset references.
     *
     * Supported propertyType values:
     *   Compound: vec2, vec3, color, size
     *   Asset ref: spriteFrame, texture, prefab, audioClip, material, effectAsset,
     *              font, spSkeletonData, dragonBonesAsset, tiledMapAsset,
     *              spriteAtlas, labelAtlas
     *   Node/ref:  node, component
     *   Primitive: string, number, boolean (pass-through)
     *
     * Without propertyType the value shape is auto-detected.
     */
    protected formatDump(value: any, propertyType?: string): any {
        if (value === undefined || value === null) {
            return { value };
        }

        // Already a uuid reference — pass through
        if (typeof value === 'object' && !Array.isArray(value) && value.__uuid__) {
            return { value };
        }

        // Compound type mapping
        const TYPE_MAP: Record<string, string> = {
            vec2: 'cc.Vec2',
            vec3: 'cc.Vec3',
            color: 'cc.Color',
            size: 'cc.Size',
        };

        // Asset reference mapping — value should be a UUID string
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

        // Explicit propertyType given → use it
        if (propertyType) {
            // Compound types
            const ccType = TYPE_MAP[propertyType];
            if (ccType) {
                return { value: { __type__: ccType, ...value } };
            }
            // Asset reference types
            const expectedType = RESOURCE_TYPE_MAP[propertyType];
            if (expectedType) {
                const uuid = typeof value === 'string' ? value : value?.uuid || value;
                const ref: any = { __uuid__: uuid };
                if (expectedType !== 'cc.Prefab') {
                    ref.__expectedType__ = expectedType;
                }
                return { value: ref };
            }
            // Node / component references
            if (propertyType === 'node' || propertyType === 'component') {
                const uuid = typeof value === 'string' ? value : value?.uuid || value;
                return { value: { __uuid__: uuid } };
            }
            // Generic asset — no expectedType constraint
            if (propertyType === 'asset') {
                const uuid = typeof value === 'string' ? value : value?.uuid || value;
                return { value: { __uuid__: uuid } };
            }
            return { value };
        }

        // No propertyType → auto-detect from value shape
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
     * Canonical set-property entry point.
     * Wraps formatDump automatically — all tools must use this, never build dumps by hand.
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

    /** Find a component of the given type on a node. Returns the component dump or null. */
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
