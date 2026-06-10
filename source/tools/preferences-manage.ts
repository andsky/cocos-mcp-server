// @ts-nocheck
/**
 * 偏好设置管理工具 (preferences_manage)
 * 统一管理编辑器偏好设置的获取、设置、重置、导入、导出等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class PreferencesManage extends UnifiedToolBase {
    name = 'preferences_manage';
    description = '偏好设置管理工具。支持操作: get(获取设置), set(设置值), reset(重置), export(导出), import(导入), open(打开设置面板), list(列出类别)';
    actions = ['get', 'set', 'reset', 'export', 'import', 'open', 'list'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                name: { type: 'string', description: '插件或类别名称 (用于 get, set, reset)' },
                path: { type: 'string', description: '配置路径 (用于 get, set)' },
                value: { description: '配置值 (用于 set)' },
                type: { type: 'string', description: '配置类型', enum: ['default', 'global', 'local'], default: 'global' },
                importPath: { type: 'string', description: '导入文件路径 (用于 import)' },
                exportPath: { type: 'string', description: '导出文件路径 (用于 export)' },
                tab: {
                    type: 'string',
                    description: '设置面板标签页 (用于 open)',
                    enum: ['general', 'external-tools', 'data-editor', 'laboratory', 'extensions']
                }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'get': return await this.getPreference(args);
            case 'set': return await this.setPreference(args);
            case 'reset': return await this.resetPreference(args);
            case 'export': return await this.exportPreferences(args);
            case 'import': return await this.importPreferences(args);
            case 'open': return await this.openSettings(args);
            case 'list': return await this.listPreferences();
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async getPreference(args: any): Promise<ToolResponse> {
        const result = await this.exec('preferences', 'query-config', {
            name: args.name || 'general',
            path: args.path,
            type: args.type || 'global'
        });
        if (!result.success) return result;
        return {
            success: true,
            data: { name: args.name || 'general', path: args.path, type: args.type || 'global', value: result.data }
        };
    }

    private async setPreference(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'name', 'path');
        if (missing) return missing;

        const result = await this.exec('preferences', 'set-config', {
            name: args.name,
            path: args.path,
            value: args.value,
            type: args.type || 'global'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Preference '${args.path}' set successfully`,
            data: { name: args.name, path: args.path, type: args.type || 'global' }
        };
    }

    private async resetPreference(args: any): Promise<ToolResponse> {
        const result = await this.exec('preferences', 'reset-config', {
            name: args.name,
            type: args.type || 'global'
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Preferences reset for '${args.name || 'all'}'`,
            data: { name: args.name, type: args.type || 'global' }
        };
    }

    private async exportPreferences(args: any): Promise<ToolResponse> {
        const result = await this.exec('preferences', 'export-config', { path: args.exportPath });
        if (!result.success) return result;
        return {
            success: true,
            message: 'Preferences exported successfully',
            data: { path: result.data || args.exportPath }
        };
    }

    private async importPreferences(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'importPath');
        if (missing) return missing;

        const result = await this.exec('preferences', 'import-config', { path: args.importPath });
        if (!result.success) return result;
        return {
            success: true,
            message: `Preferences imported from ${args.importPath}`,
            data: { path: args.importPath }
        };
    }

    private async openSettings(args: any): Promise<ToolResponse> {
        const tab = args.tab || 'general';
        const result = await this.exec('preferences', 'open-panel', { tab });
        if (!result.success) return result;
        return {
            success: true,
            message: `Settings panel opened (tab: ${tab})`,
            data: { tab }
        };
    }

    private async listPreferences(): Promise<ToolResponse> {
        const result = await this.exec('preferences', 'query-categories');
        if (!result.success) return result;
        return {
            success: true,
            data: { categories: result.data || ['general', 'external-tools', 'data-editor', 'laboratory', 'extensions'] }
        };
    }
}
