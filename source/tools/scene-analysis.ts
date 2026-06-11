// @ts-nocheck
/**
 * 场景分析工具 (scene_analysis)
 * 统一管理场景的统计、节点计数、组件计数、渲染信息、性能分析等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class SceneAnalysis extends UnifiedToolBase {
    name = 'scene_analysis';
    description = '场景分析工具。支持操作: statistics(统计信息), node-count(节点计数), component-count(组件计数), draw-call-info(渲染信息), find-heavy(查找重型节点), find-duplicates(查找重复), optimize(优化建议), texture-memory(纹理内存)';
    actions = ['statistics', 'node-count', 'component-count', 'draw-call-info', 'find-heavy', 'find-duplicates', 'optimize', 'texture-memory'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                threshold: { type: 'number', description: '阈值 (用于 find-heavy, optimize)', default: 10 },
                folder: { type: 'string', description: '搜索文件夹 (用于 texture-memory)', default: 'db://assets' },
                includeSubAssets: { type: 'boolean', description: '是否包含子资源 (用于 texture-memory)', default: false }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'statistics': return await this.getStatistics(args);
            case 'node-count': return await this.getNodeCount(args);
            case 'component-count': return await this.getComponentCount(args);
            case 'draw-call-info': return await this.getDrawCallInfo(args);
            case 'find-heavy': return await this.findHeavy(args);
            case 'find-duplicates': return await this.findDuplicates(args);
            case 'optimize': return await this.optimize(args);
            case 'texture-memory': return await this.textureMemory(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async getStatistics(args: any): Promise<ToolResponse> {
        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'getSceneStatistics'
        });
        if (!result.success) return result;

        return {
            success: true,
            data: {
                nodeCount: result.data?.nodeCount,
                componentCount: result.data?.componentCount,
                componentTypes: result.data?.componentTypes,
                renderInfo: result.data?.renderInfo
            }
        };
    }

    private async getNodeCount(args: any): Promise<ToolResponse> {
        const result = await this.exec('scene', 'query-node-tree');
        if (!result.success) return result;

        let count = 0;
        const countNodes = (node: any) => {
            count++;
            if (node.children) node.children.forEach(countNodes);
        };
        if (result.data) countNodes(result.data);

        return {
            success: true,
            data: { nodeCount: count }
        };
    }

    private async getComponentCount(args: any): Promise<ToolResponse> {
        const statsResult = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'getSceneStatistics'
        });
        if (!statsResult.success) return statsResult;

        return {
            success: true,
            data: {
                componentCount: statsResult.data?.componentCount,
                componentTypes: statsResult.data?.componentTypes
            }
        };
    }

    private async getDrawCallInfo(args: any): Promise<ToolResponse> {
        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'getSceneStatistics'
        });
        if (!result.success) return result;

        return {
            success: true,
            data: {
                drawCalls: result.data?.drawCalls,
                triangles: result.data?.triangles,
                vertices: result.data?.vertices,
                renderInfo: result.data?.renderInfo
            }
        };
    }

    private async findHeavy(args: any): Promise<ToolResponse> {
        const threshold = args.threshold ?? 10;
        const result = await this.exec('scene', 'query-node-tree');
        if (!result.success) return result;

        const heavy: any[] = [];
        const check = (node: any) => {
            const childCount = node.children?.length || 0;
            const compCount = node.__comps__?.length || 0;
            if (childCount > threshold || compCount > threshold) {
                heavy.push({
                    name: node.name,
                    uuid: node.uuid,
                    childCount,
                    componentCount: compCount
                });
            }
            if (node.children) node.children.forEach(check);
        };
        if (result.data) check(result.data);

        return {
            success: true,
            data: { threshold, heavyNodes: heavy }
        };
    }

    private async findDuplicates(args: any): Promise<ToolResponse> {
        const result = await this.exec('scene', 'query-node-tree');
        if (!result.success) return result;

        const nameMap: Record<string, number> = {};
        const collect = (node: any) => {
            const name = node.name || 'unnamed';
            nameMap[name] = (nameMap[name] || 0) + 1;
            if (node.children) node.children.forEach(collect);
        };
        if (result.data) collect(result.data);

        const duplicates = Object.entries(nameMap)
            .filter(([, count]) => count > 1)
            .map(([name, count]) => ({ name, count }));

        return {
            success: true,
            data: { duplicateNames: duplicates }
        };
    }

    private async optimize(args: any): Promise<ToolResponse> {
        const statsResult = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'getSceneStatistics'
        });

        const suggestions: string[] = [];
        const threshold = args.threshold ?? 10;

        if (statsResult.success && statsResult.data) {
            if (statsResult.data.nodeCount > 500) {
                suggestions.push('场景节点数较多，考虑使用对象池优化');
            }
            if (statsResult.data.componentCount > 1000) {
                suggestions.push('组件数量较多，检查是否有冗余组件');
            }
        }

        suggestions.push('使用 find-heavy 查找复杂节点');
        suggestions.push('使用 find-duplicates 查找重复结构');
        suggestions.push('使用 texture-memory 估算纹理内存');

        return {
            success: true,
            data: { suggestions, statistics: statsResult.data }
        };
    }

    private async textureMemory(args: any): Promise<ToolResponse> {
        const result = await this.exec('asset-db', 'query-assets', {
            type: 'texture',
            path: args.folder || 'db://assets'
        });
        if (!result.success) return result;

        const textures = (result.data || []).map((t: any) => ({
            name: t.name,
            path: t.path,
            uuid: t.uuid,
            type: t.type,
            width: t.width,
            height: t.height
        }));

        return {
            success: true,
            data: { totalTextures: textures.length, textures }
        };
    }
}
