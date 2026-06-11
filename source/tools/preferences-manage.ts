// @ts-nocheck
/**
 * 偏好设置管理工具 (preferences_manage)
 *
 * CC 3.8 的 preferences 频道公开消息有限。
 * 使用 Editor.Profile API 读写配置，比消息频道更可靠。
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

const KNOWN_CATEGORIES = ['general', 'external-tools', 'data-editor', 'laboratory', 'extensions'];

export class PreferencesManage extends UnifiedToolBase {
    name = 'preferences_manage';
    description = '偏好设置管理工具。支持操作: get(获取设置), set(设置值), list(列出类别), open(打开设置面板)';
    actions = ['get', 'set', 'list', 'open'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                name: { type: 'string', description: '插件或类别名称 (用于 get, set)' },
                path: { type: 'string', description: '配置路径 (用于 get, set)' },
                value: { description: '配置值 (用于 set)' },
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
            case 'list': return await this.listPreferences();
            case 'open': return await this.openSettings(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async getPreference(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'name', 'path');
        if (missing) return missing;

        try {
            const value = Editor.Profile.getConfig(args.name, args.path);
            return {
                success: true,
                data: { name: args.name, path: args.path, value }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to get preference: ${err.message}` };
        }
    }

    private async setPreference(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'name', 'path', 'value');
        if (missing) return missing;

        try {
            Editor.Profile.setConfig(args.name, args.path, args.value);
            return {
                success: true,
                message: `Preference '${args.path}' set successfully`,
                data: { name: args.name, path: args.path }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to set preference: ${err.message}` };
        }
    }

    private async listPreferences(): Promise<ToolResponse> {
        return {
            success: true,
            data: {
                categories: KNOWN_CATEGORIES,
                note: 'Use get action with name + path to read specific values'
            }
        };
    }

    private async openSettings(args: any): Promise<ToolResponse> {
        const tab = args.tab || 'general';
        try {
            Editor.Panel.open('preferences', { tab });
            return {
                success: true,
                message: `Settings panel opened (tab: ${tab})`,
                data: { tab }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to open settings: ${err.message}` };
        }
    }
}
