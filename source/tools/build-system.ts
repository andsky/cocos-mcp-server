// @ts-nocheck
/**
 * 构建系统工具 (build_system)
 * 统一管理项目构建、预览、构建设置等操作
 *
 * 注意: builder 的构建方法统一使用 'build-project'，
 * project_manage 的 build 是便捷入口，也走 build-project
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class BuildSystem extends UnifiedToolBase {
    name = 'build_system';
    description = '构建系统工具。支持操作: build(构建项目), preview(预览), settings(构建设置), status(构建状态), open(打开构建面板), start(启动预览服务器), stop(停止预览服务器)';
    actions = ['build', 'preview', 'settings', 'status', 'open', 'start', 'stop'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                platform: {
                    type: 'string',
                    description: '构建平台 (用于 build, preview)',
                    enum: ['web-mobile', 'web-desktop', 'ios', 'android', 'windows', 'mac', 'browser', 'simulator']
                },
                debug: { type: 'boolean', description: '是否调试构建', default: true },
                port: { type: 'number', description: '预览服务器端口 (用于 start)', default: 7456 },
                buildOptions: {
                    type: 'object',
                    description: '构建选项 (用于 build)',
                    properties: {
                        debug: { type: 'boolean' },
                        sourceMap: { type: 'boolean' },
                        inlineBundles: { type: 'boolean' },
                        engine: { type: 'string' }
                    }
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'build': return await this.buildProject(args);
            case 'preview': return await this.previewProject(args);
            case 'settings': return await this.getBuildSettings();
            case 'status': return await this.checkBuilderStatus();
            case 'open': return await this.openBuildPanel();
            case 'start': return await this.startPreviewServer(args);
            case 'stop': return await this.stopPreviewServer();
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
        const result = await this.exec('preview', 'open-preview', {
            platform: args.platform || 'browser'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Preview started on ${args.platform || 'browser'}`,
            data: { platform: args.platform || 'browser' }
        };
    }

    private async getBuildSettings(): Promise<ToolResponse> {
        const result = await this.exec('builder', 'query-build-settings');
        if (!result.success) return result;
        return { success: true, data: result.data || {} };
    }

    private async checkBuilderStatus(): Promise<ToolResponse> {
        const result = await this.exec('builder', 'query-status');
        if (!result.success) return result;
        return {
            success: true,
            data: {
                ready: result.data?.ready ?? true,
                building: result.data?.building ?? false,
                progress: result.data?.progress || 0
            }
        };
    }

    private async openBuildPanel(): Promise<ToolResponse> {
        return await this.execMsg('Build panel opened', 'builder', 'open-panel');
    }

    private async startPreviewServer(args: any): Promise<ToolResponse> {
        const port = args.port || 7456;
        const result = await this.exec('preview', 'start-server', { port });
        if (!result.success) return result;
        return { success: true, message: `Preview server started on port ${port}`, data: { port } };
    }

    private async stopPreviewServer(): Promise<ToolResponse> {
        return await this.execMsg('Preview server stopped', 'preview', 'stop-server');
    }
}
