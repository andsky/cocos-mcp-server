// @ts-nocheck
/**
 * 构建系统工具 (build_system)
 * 统一管理项目构建、预览等操作
 *
 * CC 3.8 builder 频道可用消息:
 *   build-project, query-build-tasks, stop
 * CC 3.8 preview 频道可用消息:
 *   open-preview, start, stop, query-status, reload
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class BuildSystem extends UnifiedToolBase {
    name = 'build_system';
    description = '构建系统工具。支持操作: build(构建项目), preview(打开预览), status(构建/预览状态), stop(停止构建), start-preview(启动预览服务器), reload-preview(重载预览页)';
    actions = ['build', 'preview', 'status', 'stop', 'start-preview', 'reload-preview'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                platform: {
                    type: 'string',
                    description: '构建平台 (用于 build)',
                    enum: ['web-mobile', 'web-desktop', 'ios', 'android', 'windows', 'mac']
                },
                debug: { type: 'boolean', description: '是否调试构建', default: true },
                buildOptions: {
                    type: 'object',
                    description: '构建选项 (用于 build)',
                    properties: {
                        debug: { type: 'boolean' },
                        sourceMap: { type: 'boolean' },
                        inlineBundles: { type: 'boolean' },
                        engine: { type: 'string' }
                    }
                },
                port: { type: 'number', description: '预览服务器端口 (用于 start-preview)' }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'build': return await this.buildProject(args);
            case 'preview': return await this.previewProject(args);
            case 'status': return await this.getStatus(args);
            case 'stop': return await this.stopBuild();
            case 'start-preview': return await this.startPreview(args);
            case 'reload-preview': return await this.reloadPreview();
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async buildProject(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'platform');
        if (missing) return missing;

        const result = await this.exec('builder', 'build-project', {
            platform: args.platform,
            debug: args.debug ?? true,
            ...args.buildOptions
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Build started for platform: ${args.platform}`,
            data: { platform: args.platform, debug: args.debug ?? true }
        };
    }

    private async previewProject(args: any): Promise<ToolResponse> {
        const result = await this.exec('preview', 'open-preview');
        if (!result.success) return result;

        return {
            success: true,
            message: 'Preview opened in browser',
        };
    }

    /**
     * 查询构建任务列表或预览状态
     */
    private async getStatus(args: any): Promise<ToolResponse> {
        const buildResult = await this.exec('builder', 'query-build-tasks');
        const previewResult = await this.exec('preview', 'query-status');

        return {
            success: true,
            data: {
                buildTasks: buildResult.success ? buildResult.data : null,
                preview: previewResult.success ? previewResult.data : null,
            },
            message: 'Build and preview status queried',
        };
    }

    /**
     * 停止当前正在执行的构建任务
     */
    private async stopBuild(): Promise<ToolResponse> {
        return await this.execMsg('Build stopped', 'builder', 'stop');
    }

    /**
     * 在指定端口启动预览服务器
     */
    private async startPreview(args: any): Promise<ToolResponse> {
        const options: any = {};
        if (args.port) options.port = args.port;
        return await this.execMsg('Preview server started', 'preview', 'start', options);
    }

    /**
     * 重载预览页面（用于脚本修改后刷新）
     */
    private async reloadPreview(): Promise<ToolResponse> {
        return await this.execMsg('Preview reloaded', 'preview', 'reload');
    }
}
