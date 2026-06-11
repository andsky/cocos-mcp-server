// @ts-nocheck
/**
 * 资源分析工具 (asset_analyze)
 *
 * CC 3.8 asset-db 频道没有 query-unused-assets / validate-references / export-manifest。
 * 这些操作需要通过 query-assets + query-asset-info 手动分析实现。
 * 当前保留 dependencies (query-asset-info 可获取依赖信息)，
 * unused/validate/manifest 改为基于 query-assets 的手动扫描。
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class AssetAnalyze extends UnifiedToolBase {
    name = 'asset_analyze';
    description = '资源分析工具。支持操作: dependencies(依赖分析), scan(扫描资源), validate(验证引用)';
    actions = ['dependencies', 'scan', 'validate'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                url: { type: 'string', description: '资源URL或UUID (用于 dependencies)' },
                pattern: { type: 'string', description: 'glob匹配模式 (用于 scan)，如 db://assets/**' },
                type: { type: 'string', description: '资源类型过滤 (用于 scan)' },
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'dependencies': return await this.getAssetDependencies(args);
            case 'scan': return await this.scanAssets(args);
            case 'validate': return await this.validateReferences(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async getAssetDependencies(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;

        // query-asset-info 返回的 info 中包含依赖信息
        const result = await this.exec('asset-db', 'query-asset-info', args.url);
        if (!result.success) return result;

        const info = result.data;
        return {
            success: true,
            data: {
                source: args.url,
                path: info?.path || '',
                type: info?.type || '',
                uuid: info?.uuid || '',
                subAssets: info?.subAssets || {}
            }
        };
    }

    private async scanAssets(args: any): Promise<ToolResponse> {
        // 使用 query-assets 扫描资源
        const queryOptions: any = {};
        if (args.pattern) {
            queryOptions.pattern = args.pattern;
        }
        if (args.type) {
            queryOptions.ccType = args.type;
        }

        const result = await this.exec('asset-db', 'query-assets', queryOptions);
        if (!result.success) return result;

        const assets = result.data || [];
        return {
            success: true,
            data: {
                total: Array.isArray(assets) ? assets.length : 0,
                assets: Array.isArray(assets) ? assets.slice(0, 100) : [],
                note: assets.length > 100 ? `Showing first 100 of ${assets.length} assets` : undefined
            }
        };
    }

    private async validateReferences(args: any): Promise<ToolResponse> {
        // 先扫描所有资源，再逐个检查依赖
        const result = await this.exec('asset-db', 'query-assets', {});
        if (!result.success) return result;

        const assets = result.data || [];
        const broken: any[] = [];

        // 基本验证：检查资源信息是否完整
        for (const asset of (Array.isArray(assets) ? assets : [])) {
            if (!asset.uuid || !asset.path) {
                broken.push({
                    uuid: asset.uuid || 'unknown',
                    path: asset.path || 'unknown',
                    issue: 'Missing uuid or path'
                });
            }
        }

        return {
            success: true,
            data: {
                totalScanned: Array.isArray(assets) ? assets.length : 0,
                brokenCount: broken.length,
                broken: broken.slice(0, 50),
                note: 'Basic structural validation only. For deep dependency analysis, use dependencies action on specific assets.'
            }
        };
    }
}
