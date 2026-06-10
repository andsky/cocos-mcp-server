// @ts-nocheck
/**
 * 资源分析工具 (asset_analyze)
 * 统一管理资源的依赖分析、未使用资源查找、引用验证等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class AssetAnalyze extends UnifiedToolBase {
    name = 'asset_analyze';
    description = '资源分析工具。支持操作: dependencies(依赖分析), unused(查找未使用资源), validate(验证引用), batch(批量操作), manifest(导出清单)';
    actions = ['dependencies', 'unused', 'validate', 'batch', 'manifest'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                url: {
                    type: 'string',
                    description: '资源URL或UUID (用于 dependencies)'
                },
                direction: {
                    type: 'string',
                    description: '依赖方向 (用于 dependencies)',
                    enum: ['dependencies', 'dependents', 'both'],
                    default: 'dependencies'
                },
                directory: {
                    type: 'string',
                    description: '搜索目录 (用于 unused, validate)',
                    default: 'db://assets'
                },
                excludeDirectories: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '排除目录 (用于 unused)'
                },
                batchAction: {
                    type: 'string',
                    description: '批量操作类型 (用于 batch)',
                    enum: ['import', 'delete', 'compress']
                },
                urls: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '资源URL列表 (用于 batch)'
                },
                sourceDirectory: {
                    type: 'string',
                    description: '源目录 (用于 batch import)'
                },
                targetDirectory: {
                    type: 'string',
                    description: '目标目录 (用于 batch import)'
                },
                fileFilter: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '文件过滤器 (用于 batch import)'
                },
                overwrite: { type: 'boolean', description: '是否覆盖', default: false },
                recursive: { type: 'boolean', description: '是否递归', default: false },
                format: {
                    type: 'string',
                    description: '导出格式 (用于 manifest)',
                    enum: ['json', 'csv', 'xml'],
                    default: 'json'
                },
                includeMetadata: { type: 'boolean', description: '是否包含元数据 (用于 manifest)', default: true }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'dependencies': return await this.getAssetDependencies(args);
            case 'unused': return await this.findUnusedAssets(args);
            case 'validate': return await this.validateReferences(args);
            case 'batch': return await this.batchOperation(args);
            case 'manifest': return await this.exportManifest(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async getAssetDependencies(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;

        const result = await this.exec('asset-db', 'query-dependencies', {
            uuid: args.url,
            direction: args.direction || 'dependencies'
        });
        if (!result.success) return result;

        return {
            success: true,
            data: { source: args.url, direction: args.direction || 'dependencies', dependencies: result.data || [] }
        };
    }

    private async findUnusedAssets(args: any): Promise<ToolResponse> {
        const result = await this.exec('asset-db', 'query-unused-assets', {
            path: args.directory || 'db://assets',
            exclude: args.excludeDirectories || []
        });
        if (!result.success) return result;

        return {
            success: true,
            data: { directory: args.directory || 'db://assets', total: result.data?.length || 0, unused: result.data || [] }
        };
    }

    private async validateReferences(args: any): Promise<ToolResponse> {
        const dir = args.directory || 'db://assets';
        const result = await this.exec('asset-db', 'validate-references', dir);
        if (!result.success) return result;

        return {
            success: true,
            data: {
                directory: dir,
                valid: result.data?.valid ?? true,
                brokenReferences: result.data?.broken || [],
                warnings: result.data?.warnings || []
            }
        };
    }

    private async batchOperation(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'batchAction');
        if (missing) return missing;

        switch (args.batchAction) {
            case 'import': {
                const m = this.requireParams(args, 'sourceDirectory', 'targetDirectory');
                if (m) return m;
                return await this.execMsg(`Batch import completed`, 'asset-db', 'batch-import', {
                    source: args.sourceDirectory,
                    target: args.targetDirectory,
                    filter: args.fileFilter,
                    overwrite: args.overwrite ?? false,
                    recursive: args.recursive ?? false
                });
            }
            case 'delete': {
                if (!args.urls?.length) return { success: false, error: 'urls are required for delete' };
                return await this.execMsg('Batch delete completed', 'asset-db', 'batch-delete', args.urls);
            }
            case 'compress': {
                return await this.execMsg('Texture compression completed', 'asset-db', 'compress-textures', {
                    directory: args.sourceDirectory || 'db://assets'
                });
            }
            default:
                return { success: false, error: `Unknown batch action: ${args.batchAction}` };
        }
    }

    private async exportManifest(args: any): Promise<ToolResponse> {
        const result = await this.exec('asset-db', 'export-manifest', {
            path: args.directory || 'db://assets',
            format: args.format || 'json',
            includeMetadata: args.includeMetadata ?? true
        });
        if (!result.success) return result;
        return { success: true, data: result.data };
    }
}
