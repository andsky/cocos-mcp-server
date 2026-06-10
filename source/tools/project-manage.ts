// @ts-nocheck
/**
 * 项目管理工具 (project_manage)
 * 统一管理项目的运行、构建、配置等操作
 *
 * 注意: build/run 操作同时存在于 build_system 工具中，
 * build_system 提供更完整的构建控制（buildOptions、preview server 等）。
 * 此处保留作为便捷入口。
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class ProjectManage extends UnifiedToolBase {
    name = 'project_manage';
    description = '项目管理工具。支持操作: run(运行项目), build(构建项目), info(获取项目信息), settings(获取项目设置), refresh(刷新资源)';
    actions = ['run', 'build', 'info', 'settings', 'refresh'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                platform: {
                    type: 'string',
                    description: '目标平台 (用于 run, build)',
                    enum: ['browser', 'simulator', 'preview', 'web-mobile', 'web-desktop', 'ios', 'android', 'windows', 'mac']
                },
                debug: { type: 'boolean', description: '是否调试构建 (用于 build)', default: true },
                category: {
                    type: 'string',
                    description: '设置类别 (用于 settings)',
                    enum: ['general', 'physics', 'render', 'assets'],
                    default: 'general'
                },
                folder: { type: 'string', description: '刷新的文件夹 (用于 refresh)' }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'run': return await this.runProject(args);
            case 'build': return await this.buildProject(args);
            case 'info': return await this.getProjectInfo();
            case 'settings': return await this.getProjectSettings(args);
            case 'refresh': return await this.refreshAssets(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async runProject(args: any): Promise<ToolResponse> {
        const platform = args.platform || 'browser';
        const result = await this.exec('preview', 'open-preview', { platform });
        if (!result.success) return result;
        return {
            success: true,
            message: `Project running on ${platform}`,
            warning: 'For more preview options (start/stop server), use build_system tool with preview/start/stop actions',
            data: { platform }
        };
    }

    private async buildProject(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'platform');
        if (missing) return missing;

        const result = await this.exec('builder', 'build-project', {
            platform: args.platform,
            debug: args.debug ?? true
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Build started for ${args.platform}`,
            warning: 'For advanced build options (buildOptions), use build_system tool with build action',
            data: { platform: args.platform, debug: args.debug ?? true }
        };
    }

    private async getProjectInfo(): Promise<ToolResponse> {
        const result = await this.exec('project', 'query-project-info');
        if (!result.success) return result;
        return {
            success: true,
            data: {
                name: result.data?.name || 'Unknown',
                path: result.data?.path || '',
                uuid: result.data?.uuid || ''
            }
        };
    }

    private async getProjectSettings(args: any): Promise<ToolResponse> {
        const category = args.category || 'general';
        const result = await this.exec('project', 'query-project-settings', category);
        if (!result.success) return result;
        return { success: true, data: { category, settings: result.data } };
    }

    private async refreshAssets(args: any): Promise<ToolResponse> {
        if (args.folder) {
            const result = await this.exec('asset-db', 'refresh-asset', args.folder);
            if (!result.success) return result;
            return { success: true, message: `Assets refreshed in ${args.folder}`, data: { folder: args.folder } };
        }
        const result = await this.exec('asset-db', 'refresh-assets');
        if (!result.success) return result;
        return { success: true, message: 'All assets refreshed' };
    }
}
