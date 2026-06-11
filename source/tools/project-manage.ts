// @ts-nocheck
/**
 * 项目管理工具 (project_manage)
 * 统一管理项目的运行、构建、配置等操作
 *
 * 注意: Cocos Creator 3.8 没有 'project' 消息频道。
 * info/settings 通过 Editor.Profile 或读取项目文件实现。
 * run 走 preview 频道，build 走 builder 频道。
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class ProjectManage extends UnifiedToolBase {
    name = 'project_manage';
    description = '项目管理工具。支持操作: run(运行项目), build(构建项目), info(获取项目信息), refresh(刷新资源)';
    actions = ['run', 'build', 'info', 'refresh'];

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
            case 'refresh': return await this.refreshAssets(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async runProject(args: any): Promise<ToolResponse> {
        const platform = args.platform || 'browser';
        const result = await this.exec('preview', 'open-preview');
        if (!result.success) return result;
        return {
            success: true,
            message: `Project preview opened`,
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
            data: { platform: args.platform, debug: args.debug ?? true }
        };
    }

    private async getProjectInfo(): Promise<ToolResponse> {
        // CC 3.8 没有 project:query-project-info
        // 通过 Editor.Project API 获取项目信息
        try {
            const name = Editor.Project.name || 'Unknown';
            const path = Editor.Project.path || '';
            const uuid = Editor.Project.uuid || '';
            return {
                success: true,
                data: { name, path, uuid }
            };
        } catch {
            return {
                success: false,
                error: 'Unable to get project info. Editor.Project API may not be available.'
            };
        }
    }

    private async refreshAssets(args: any): Promise<ToolResponse> {
        if (args.folder) {
            const result = await this.exec('asset-db', 'refresh-asset', args.folder);
            if (!result.success) return result;
            return { success: true, message: `Assets refreshed in ${args.folder}`, data: { folder: args.folder } };
        }
        const result = await this.exec('asset-db', 'refresh-asset', 'db://assets');
        if (!result.success) return result;
        return { success: true, message: 'All assets refreshed' };
    }
}
