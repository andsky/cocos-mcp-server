// @ts-nocheck
/**
 * 场景管理工具 (scene_management)
 * 统一管理场景的获取、打开、保存、创建、关闭、撤销、重做等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class SceneManager extends UnifiedToolBase {
    name = 'scene_management';
    description = '场景管理工具。支持操作: get(获取当前场景), list(获取场景列表), open(打开场景), save(保存场景), create(创建场景), close(关闭场景), hierarchy(获取场景层级), undo(撤销), redo(重做)';
    actions = ['get', 'list', 'open', 'save', 'create', 'close', 'hierarchy', 'undo', 'redo'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                scenePath: {
                    type: 'string',
                    description: '场景路径 (用于 open, create)。例如: db://assets/scenes/GameScene.scene'
                },
                sceneName: {
                    type: 'string',
                    description: '场景名称 (用于 create)'
                },
                savePath: {
                    type: 'string',
                    description: '保存路径 (用于 create)'
                },
                includeComponents: {
                    type: 'boolean',
                    description: '是否包含组件信息 (用于 hierarchy)',
                    default: false
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'get': return await this.getCurrentScene();
            case 'list': return await this.getSceneList();
            case 'open': return await this.openScene(args);
            case 'save': return await this.saveScene();
            case 'create': return await this.createScene(args);
            case 'close': return await this.closeScene();
            case 'hierarchy': return await this.getSceneHierarchy(args.includeComponents);
            case 'undo': return await this.undo();
            case 'redo': return await this.redo();
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async getCurrentScene(): Promise<ToolResponse> {
        const result = await this.exec('scene', 'query-current-scene');
        if (!result.success) return result;
        const scene = result.data;
        if (!scene) return { success: false, error: 'No scene is currently open' };
        return {
            success: true,
            data: { name: scene.name, uuid: scene.uuid, path: scene.path, isDirty: scene.isDirty }
        };
    }

    private async getSceneList(): Promise<ToolResponse> {
        const result = await this.exec('asset-db', 'query-assets', { ccType: 'scene' });
        if (!result.success) return result;
        const scenes = (result.data || []).map((a: any) => ({ name: a.name, path: a.path, uuid: a.uuid }));
        return { success: true, data: { total: scenes.length, scenes } };
    }

    private async openScene(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'scenePath');
        if (missing) return missing;
        // 规范化路径：确保 db:// 前缀不重复
        const scenePath = args.scenePath.startsWith('db://')
            ? args.scenePath
            : `db://${args.scenePath.replace(/^\/+/, '')}`;
        return await this.execMsg(`Scene opened: ${scenePath}`, 'scene', 'open-scene', scenePath);
    }

    private async saveScene(): Promise<ToolResponse> {
        return await this.execMsg('Scene saved successfully', 'scene', 'save-scene');
    }

    private async createScene(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'sceneName', 'savePath');
        if (missing) return missing;
        const result = await this.exec('scene', 'create-scene', { name: args.sceneName, path: args.savePath });
        if (!result.success) return result;
        return {
            success: true,
            data: { uuid: result.data, name: args.sceneName, path: args.savePath },
            message: `Scene '${args.sceneName}' created at ${args.savePath}`
        };
    }

    private async closeScene(): Promise<ToolResponse> {
        return await this.execMsg('Scene closed successfully', 'scene', 'close-scene');
    }

    private async getSceneHierarchy(includeComponents: boolean = false): Promise<ToolResponse> {
        const result = await this.exec('scene', 'query-node-tree');
        if (!result.success) return result;
        if (!result.data) return { success: false, error: 'Failed to get scene hierarchy' };
        return { success: true, data: this.buildHierarchy(result.data, includeComponents, 0) };
    }

    private async undo(): Promise<ToolResponse> {
        return await this.execMsg('Undo executed', 'scene', 'undo');
    }

    private async redo(): Promise<ToolResponse> {
        return await this.execMsg('Redo executed', 'scene', 'redo');
    }

    private buildHierarchy(node: any, includeComponents: boolean, depth: number): any {
        const result: any = {
            uuid: node.uuid, name: node.name, type: node.type, active: node.active, depth
        };
        if (includeComponents && node.__comps__) {
            result.components = node.__comps__.map((comp: any) => ({
                type: comp.__type__, enabled: comp.enabled
            }));
        }
        if (node.children?.length > 0) {
            result.children = node.children.map((child: any) =>
                this.buildHierarchy(child, includeComponents, depth + 1)
            );
        }
        return result;
    }
}
