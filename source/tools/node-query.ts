// @ts-nocheck
/**
 * 节点查询工具 (node_query)
 * 统一管理节点的查询操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class NodeQuery extends UnifiedToolBase {
    name = 'node_query';
    description = '节点查询工具。支持操作: get(获取节点信息), find(搜索节点), findBy(按名称查找), all(获取所有节点)';
    actions = ['get', 'find', 'findBy', 'all'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: {
                    type: 'string',
                    description: '节点UUID (用于 get)'
                },
                pattern: {
                    type: 'string',
                    description: '搜索模式 (用于 find)'
                },
                exactMatch: {
                    type: 'boolean',
                    description: '是否精确匹配 (用于 find)',
                    default: false
                },
                name: {
                    type: 'string',
                    description: '节点名称 (用于 findBy)'
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'get': return await this.getNodeInfo(args);
            case 'find': return await this.findNodes(args);
            case 'findBy': return await this.findBy(args);
            case 'all': return await this.getAllNodes();
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async getNodeInfo(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;

        const result = await this.exec('scene', 'query-node', args.uuid);
        if (!result.success) return result;

        const d = result.data;
        if (!d) return { success: false, error: 'Node not found' };

        return {
            success: true,
            data: {
                uuid: d.uuid?.value || args.uuid,
                name: d.name?.value || 'Unknown',
                active: d.active?.value ?? true,
                position: d.position?.value || { x: 0, y: 0, z: 0 },
                rotation: d.rotation?.value || { x: 0, y: 0, z: 0 },
                scale: d.scale?.value || { x: 1, y: 1, z: 1 },
                parent: d.parent?.value?.uuid || null,
                children: d.children || [],
                components: (d.__comps__ || []).map((comp: any) => ({
                    type: comp.__type__ || 'Unknown',
                    enabled: comp.enabled ?? true
                }))
            }
        };
    }

    private async findNodes(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'pattern');
        if (missing) return missing;

        const treeResult = await this.exec('scene', 'query-node-tree');
        if (!treeResult.success) return treeResult;

        const nodes: any[] = [];
        const { pattern, exactMatch } = args;

        const search = (node: any, path: string = '') => {
            const nodePath = path ? `${path}/${node.name}` : node.name;
            const matches = exactMatch
                ? node.name === pattern
                : node.name.toLowerCase().includes(pattern.toLowerCase());
            if (matches) {
                nodes.push({ uuid: node.uuid, name: node.name, path: nodePath });
            }
            if (node.children) {
                for (const child of node.children) {
                    search(child, nodePath);
                }
            }
        };

        if (treeResult.data) search(treeResult.data);
        return { success: true, data: { total: nodes.length, nodes } };
    }

    private async findBy(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'name');
        if (missing) return missing;
        // 委托给 find，用精确匹配
        const result = await this.findNodes({ pattern: args.name, exactMatch: true });
        if (!result.success) return result;
        const nodes = result.data?.nodes || [];
        if (nodes.length === 0) return { success: false, error: `Node '${args.name}' not found` };
        // findBy 返回第一个精确匹配
        return { success: true, data: { uuid: nodes[0].uuid, name: nodes[0].name } };
    }

    private async getAllNodes(): Promise<ToolResponse> {
        const treeResult = await this.exec('scene', 'query-node-tree');
        if (!treeResult.success) return treeResult;

        const nodes: any[] = [];
        const traverse = (node: any) => {
            if (!node) return;
            nodes.push({ uuid: node.uuid, name: node.name, type: node.type, active: node.active });
            if (node.children) {
                for (const child of node.children) {
                    traverse(child);
                }
            }
        };

        if (treeResult.data?.children) traverse(treeResult.data);
        return { success: true, data: { total: nodes.length, nodes } };
    }
}
