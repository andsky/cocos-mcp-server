// @ts-nocheck
/**
 * 脚本管理工具 (script_manage)
 * 统一管理脚本组件的挂载、创建、编译等操作
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class ScriptManage extends UnifiedToolBase {
    name = 'script_manage';
    description = '脚本管理工具。支持操作: attach(挂载脚本), create(创建脚本), compile(编译), query(查询脚本), methods(查询方法), execute(执行方法), properties(查询属性)';
    actions = ['attach', 'create', 'compile', 'query', 'methods', 'execute', 'properties'];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                uuid: { type: 'string', description: '节点UUID (用于 attach, execute)' },
                scriptPath: { type: 'string', description: '脚本资源路径 (用于 attach, create, query)' },
                scriptName: { type: 'string', description: '脚本名称 (用于 create)' },
                scriptContent: { type: 'string', description: '脚本内容 (用于 create)' },
                savePath: { type: 'string', description: '保存路径 (用于 create)' },
                methodName: { type: 'string', description: '方法名称 (用于 execute, methods)' },
                methodArgs: { type: 'array', description: '方法参数 (用于 execute)' },
                className: { type: 'string', description: '类名 (用于 query, methods)' }
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'attach': return await this.attachScript(args);
            case 'create': return await this.createScript(args);
            case 'compile': return await this.compileScripts();
            case 'query': return await this.queryScript(args);
            case 'methods': return await this.queryMethods(args);
            case 'execute': return await this.executeMethod(args);
            case 'properties': return await this.queryProperties(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async attachScript(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'scriptPath');
        if (missing) return missing;

        let scriptUuid = args.scriptPath;
        if (args.scriptPath.startsWith('db://')) {
            const uuid = await this.resolveAssetUuid(args.scriptPath);
            if (!uuid) return { success: false, error: `Script not found: ${args.scriptPath}` };
            scriptUuid = uuid;
        }

        const result = await this.exec('scene', 'create-component', {
            node: args.uuid,
            type: scriptUuid
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Script '${args.scriptPath}' attached successfully`,
            data: { uuid: args.uuid, scriptPath: args.scriptPath, componentUuid: result.data }
        };
    }

    private async createScript(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'scriptName', 'savePath');
        if (missing) return missing;

        const fullPath = `${args.savePath}/${args.scriptName}.ts`;
        const content = args.scriptContent || this.generateDefaultScriptContent(args.scriptName);

        // asset-db:create-asset 参数: url (db:// 路径), content (文件内容)
        const result = await this.exec('asset-db', 'create-asset', {
            url: fullPath,
            content: content
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Script '${args.scriptName}.ts' created successfully`,
            data: { scriptName: args.scriptName, path: fullPath }
        };
    }

    private generateDefaultScriptContent(className: string): string {
        return `import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('${className}')
export class ${className} extends Component {
    start() {
        // Your initialization code here
    }

    update(deltaTime: number) {
        // Your update code here
    }
}
`;
    }

    private async compileScripts(): Promise<ToolResponse> {
        return await this.execMsg('Script compilation started', 'engine', 'compile-scripts');
    }

    private async queryScript(args: any): Promise<ToolResponse> {
        if (args.scriptPath) {
            return await this.exec('asset-db', 'query-asset-info', args.scriptPath);
        }
        if (args.className) {
            return await this.exec('scene', 'query-class', args.className);
        }
        return { success: false, error: 'scriptPath or className is required' };
    }

    private async queryMethods(args: any): Promise<ToolResponse> {
        if (!args.className && !args.scriptPath) {
            return { success: false, error: 'className or scriptPath is required' };
        }

        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'queryScriptMethods',
            args: [args.className || args.scriptPath]
        });
        if (!result.success) return result;

        return { success: true, data: { methods: result.data || [] } };
    }

    private async executeMethod(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'uuid', 'methodName');
        if (missing) return missing;

        const result = await this.exec('scene', 'execute-component-method', {
            uuid: args.uuid,
            method: args.methodName,
            args: args.methodArgs || []
        });
        if (!result.success) return result;

        return {
            success: true,
            message: `Method '${args.methodName}' executed successfully`,
            data: { result: result.data }
        };
    }

    private async queryProperties(args: any): Promise<ToolResponse> {
        const result = await this.exec('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'queryScriptProperties',
            args: [args.uuid, args.className]
        });
        if (!result.success) return result;

        return { success: true, data: { properties: result.data || [] } };
    }
}
