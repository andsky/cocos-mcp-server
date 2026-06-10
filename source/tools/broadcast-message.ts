// @ts-nocheck
/**
 * 广播消息工具 (broadcast_message)
 * 统一管理编辑器广播消息的监听、发送、日志等操作
 *
 * 支持监听编辑器内置事件:
 * - selection:select / selection:unselect / selection:hover
 * - asset-db:assets-created / asset-db:assets-deleted / asset-db:asset-changed
 * - scene:ready / scene:reloading
 * - editor:console-log / editor:console-warn / editor:console-error
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class BroadcastMessage extends UnifiedToolBase {
    name = 'broadcast_message';
    description = '广播消息工具。支持操作: listen(监听消息), stop(停止监听), send(发送消息), log(获取日志), clear(清空日志), listeners(获取监听器列表), events(列出可用事件)';
    actions = ['listen', 'stop', 'send', 'log', 'clear', 'listeners', 'events'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                messageType: {
                    type: 'string',
                    description: '消息类型 (用于 listen, stop)。内置事件: selection:select, selection:unselect, asset-db:asset-changed, asset-db:assets-created, asset-db:assets-deleted, scene:ready, scene:reloading, editor:console-log'
                },
                message: { type: 'string', description: '消息名称 (用于 send)' },
                data: { description: '消息数据 (用于 send)' },
                limit: { type: 'number', description: '日志数量限制 (用于 log)', default: 50 }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'listen': return await this.listenBroadcast(args);
            case 'stop': return await this.stopListening(args);
            case 'send': return await this.sendBroadcast(args);
            case 'log': return await this.getBroadcastLog(args);
            case 'clear': return await this.clearBroadcastLog();
            case 'listeners': return await this.getActiveListeners();
            case 'events': return await this.listAvailableEvents();
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async listenBroadcast(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'messageType');
        if (missing) return missing;
        const result = await this.exec('broadcast', 'listen', args.messageType);
        if (!result.success) return result;
        return { success: true, message: `Now listening to '${args.messageType}' messages`, data: { messageType: args.messageType } };
    }

    private async stopListening(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'messageType');
        if (missing) return missing;
        const result = await this.exec('broadcast', 'stop-listening', args.messageType);
        if (!result.success) return result;
        return { success: true, message: `Stopped listening to '${args.messageType}' messages`, data: { messageType: args.messageType } };
    }

    private async sendBroadcast(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'message');
        if (missing) return missing;
        const result = await this.exec('broadcast', 'broadcast', args.message, args.data);
        if (!result.success) return result;
        return { success: true, message: `Broadcast '${args.message}' sent successfully`, data: { message: args.message } };
    }

    private async getBroadcastLog(args: any): Promise<ToolResponse> {
        const result = await this.exec('broadcast', 'query-log', {
            limit: args.limit || 50,
            type: args.messageType
        });
        if (!result.success) return result;
        return { success: true, data: { total: result.data?.length || 0, logs: result.data || [] } };
    }

    private async clearBroadcastLog(): Promise<ToolResponse> {
        return await this.execMsg('Broadcast log cleared', 'broadcast', 'clear-log');
    }

    private async getActiveListeners(): Promise<ToolResponse> {
        const result = await this.exec('broadcast', 'query-listeners');
        if (!result.success) return result;
        return { success: true, data: { total: result.data?.length || 0, listeners: result.data || [] } };
    }

    private async listAvailableEvents(): Promise<ToolResponse> {
        return {
            success: true,
            data: {
                categories: {
                    'Selection 事件': {
                        'selection:select': '选中节点或资源时触发',
                        'selection:unselect': '取消选中时触发',
                        'selection:hover': '悬停高亮时触发',
                    },
                    'AssetDB 事件': {
                        'asset-db:assets-created': '资源创建时触发',
                        'asset-db:assets-deleted': '资源删除时触发',
                        'asset-db:assets-moved': '资源移动时触发',
                        'asset-db:asset-changed': '资源内容变更时触发',
                        'asset-db:state-changed': '资源数据库状态变更',
                    },
                    'Scene 事件': {
                        'scene:ready': '场景加载完成',
                        'scene:reloading': '场景正在重新加载',
                        'scene:node-component-added': '节点组件被添加',
                        'scene:node-component-removed': '节点组件被移除',
                    },
                    'Editor 事件': {
                        'editor:ready': '编辑器就绪',
                        'editor:console-log': '控制台 log',
                        'editor:console-warn': '控制台 warn',
                        'editor:console-error': '控制台 error',
                        'editor:console-info': '控制台 info',
                        'editor:console-clear': '控制台清空',
                    }
                }
            }
        };
    }
}
