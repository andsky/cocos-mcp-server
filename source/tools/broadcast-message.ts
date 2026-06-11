// @ts-nocheck
/**
 * 广播消息工具 (broadcast_message)
 *
 * Cocos Creator 3.8 的广播机制:
 * - 发送: Editor.Message.broadcast('packageName:actionName', ...args)
 * - 接收: 在 package.json 的 contributions.messages 中声明监听
 *
 * 本工具提供: 查询可用事件、发送广播消息。
 * 监听功能需要扩展在 package.json 中静态声明，运行时无法动态添加，因此不提供。
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class BroadcastMessage extends UnifiedToolBase {
    name = 'broadcast_message';
    description = '广播消息工具。支持操作: send(发送广播消息), events(列出可用事件)';
    actions = ['send', 'events'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                message: { type: 'string', description: '广播消息名称，格式: packageName:actionName (用于 send)' },
                data: { description: '消息数据 (用于 send)' }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'send': return await this.sendBroadcast(args);
            case 'events': return await this.listAvailableEvents();
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async sendBroadcast(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'message');
        if (missing) return missing;

        try {
            Editor.Message.broadcast(args.message, args.data);
            return { success: true, message: `Broadcast '${args.message}' sent`, data: { message: args.message } };
        } catch (err: any) {
            return { success: false, error: `Failed to broadcast: ${err.message}` };
        }
    }

    private async listAvailableEvents(): Promise<ToolResponse> {
        return {
            success: true,
            data: {
                note: '监听这些广播需要在 package.json 的 contributions.messages 中声明',
                categories: {
                    'Scene 事件': {
                        'scene:ready': '场景加载完成',
                        'scene:reloading': '场景正在重新加载',
                        'scene:node-component-added': '节点组件被添加',
                        'scene:node-component-removed': '节点组件被移除',
                    },
                    'AssetDB 事件': {
                        'asset-db:assets-created': '资源创建时触发',
                        'asset-db:assets-deleted': '资源删除时触发',
                        'asset-db:assets-moved': '资源移动时触发',
                        'asset-db:asset-changed': '资源内容变更',
                        'asset-db:state-changed': '资源数据库状态变更',
                    },
                    'Editor 事件': {
                        'editor:ready': '编辑器就绪',
                        'editor:console-log': '控制台 log',
                        'editor:console-warn': '控制台 warn',
                        'editor:console-error': '控制台 error',
                    }
                }
            }
        };
    }
}
