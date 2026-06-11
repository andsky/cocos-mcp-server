// @ts-nocheck
/**
 * 扩展管理工具 (extension_manage)
 * 统一管理编辑器扩展的查询、启用、禁用、重载、安装、卸载等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class ExtensionManage extends UnifiedToolBase {
    name = 'extension_manage';
    description = '扩展管理工具。支持操作: list(列出扩展), info(获取扩展信息), enable(启用扩展), disable(禁用扩展), reload(重载扩展), install(安装扩展), uninstall(卸载扩展)';
    actions = ['list', 'info', 'enable', 'disable', 'reload', 'install', 'uninstall'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                name: { type: 'string', description: '扩展名称 (用于 info, enable, disable, reload, uninstall)' },
                path: { type: 'string', description: '扩展路径 (用于 install, info)' },
                url: { type: 'string', description: '扩展下载URL (用于 install)' },
                enable: { type: 'boolean', description: '是否启用 (用于 enable/disable)', default: true }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'list': return await this.listExtensions(args);
            case 'info': return await this.getExtensionInfo(args);
            case 'enable': return await this.enableExtension(args);
            case 'disable': return await this.disableExtension(args);
            case 'reload': return await this.reloadExtension(args);
            case 'install': return await this.installExtension(args);
            case 'uninstall': return await this.uninstallExtension(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async listExtensions(args: any): Promise<ToolResponse> {
        const result = await this.exec('editor', 'query-extension-list');
        if (!result.success) {
            try {
                const packages = Editor.Package.getPackages ? Editor.Package.getPackages() : [];
                const extList = packages.map((pkg: any) => ({
                    name: pkg.name || pkg.info?.name,
                    version: pkg.version || pkg.info?.version,
                    path: pkg.path || pkg.info?.path,
                    enabled: pkg.enabled !== false
                }));
                return { success: true, data: { total: extList.length, extensions: extList } };
            } catch (err: any) {
                return { success: false, error: err.message || String(err) };
            }
        }
        return result;
    }

    private async getExtensionInfo(args: any): Promise<ToolResponse> {
        if (!args.name && !args.path) return { success: false, error: 'name or path is required' };
        const key = args.name || args.path;

        const result = await this.exec('editor', 'query-extension-info', key);
        if (!result.success) return result;
        if (!result.data) return { success: false, error: `Extension not found: ${key}` };

        return {
            success: true,
            data: {
                name: result.data.name,
                version: result.data.version,
                description: result.data.description,
                path: result.data.path,
                enabled: result.data.enabled
            }
        };
    }

    private async enableExtension(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'name');
        if (missing) return missing;

        const result = await this.exec('editor', 'enable-extension', args.name);
        if (!result.success) return result;

        return {
            success: true,
            message: `Extension '${args.name}' enabled`,
            data: { name: args.name }
        };
    }

    private async disableExtension(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'name');
        if (missing) return missing;

        const result = await this.exec('editor', 'disable-extension', args.name);
        if (!result.success) return result;

        return {
            success: true,
            message: `Extension '${args.name}' disabled`,
            data: { name: args.name }
        };
    }

    private async reloadExtension(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'name');
        if (missing) return missing;

        try {
            if (Editor.Package.reload) {
                await Editor.Package.reload(args.name);
                return {
                    success: true,
                    message: `Extension '${args.name}' reloaded`,
                    data: { name: args.name }
                };
            }
        } catch (err: any) {
            // Fallback to exec
        }

        const result = await this.exec('editor', 'reload-extension', args.name);
        if (!result.success) return result;

        return {
            success: true,
            message: `Extension '${args.name}' reloaded`,
            data: { name: args.name }
        };
    }

    private async installExtension(args: any): Promise<ToolResponse> {
        if (!args.path && !args.url) return { success: false, error: 'path or url is required' };

        const source = args.path || args.url;
        const result = await this.exec('editor', 'install-extension', source);
        if (!result.success) return result;

        return {
            success: true,
            message: `Extension installed from ${source}`,
            data: { source }
        };
    }

    private async uninstallExtension(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'name');
        if (missing) return missing;

        const result = await this.exec('editor', 'uninstall-extension', args.name);
        if (!result.success) return result;

        return {
            success: true,
            message: `Extension '${args.name}' uninstalled`,
            data: { name: args.name }
        };
    }
}
