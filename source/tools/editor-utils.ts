// @ts-nocheck
/**
 * 编辑器工具集 (editor_utils)
 * 封装 Editor.Utils API：文件操作、数学工具、路径工具、URL工具、UUID工具
 */

import { ToolResponse } from '../types';
import { UnifiedToolBase } from './unified-tool-base';

export class EditorUtils extends UnifiedToolBase {
    name = 'editor_utils';
    description = '编辑器工具集。支持操作: file_copy(复制文件), file_name(获取可用文件名), unzip(解压), uuid_generate(生成UUID), uuid_compress(压缩UUID), uuid_decompress(解压UUID), uuid_check(检查UUID), path_join(拼接路径), path_parse(解析路径), doc_url(获取文档URL)';
    actions = [
        'file_copy', 'file_name', 'unzip',
        'uuid_generate', 'uuid_compress', 'uuid_decompress', 'uuid_check',
        'path_join', 'path_parse', 'doc_url',
    ];

    getUnifiedSchema(): any {
        return {
            type: 'object',
            properties: {
                action: this.generateActionSchema(this.actions),
                source: { type: 'string', description: '源路径 (file_copy/unzip)' },
                target: { type: 'string', description: '目标路径 (file_copy/unzip)' },
                uuid: { type: 'string', description: 'UUID 字符串 (uuid_compress/uuid_decompress/uuid_check)' },
                paths: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '路径片段数组 (path_join)'
                },
                path: { type: 'string', description: '路径字符串 (path_parse)' },
                url: { type: 'string', description: '文档相对URL (doc_url)' },
                docType: { type: 'string', description: "文档类型: 'manual' 或 'api' (doc_url)", enum: ['manual', 'api'] },
                peel: { type: 'boolean', description: '解压时是否剥除外层目录 (unzip)', default: false },
            },
            required: ['action']
        };
    }

    async executeAction(action: string, args: any): Promise<ToolResponse> {
        switch (action) {
            case 'file_copy': return await this.fileCopy(args);
            case 'file_name': return await this.fileName(args);
            case 'unzip': return await this.unzipFile(args);
            case 'uuid_generate': return this.uuidGenerate();
            case 'uuid_compress': return this.uuidCompress(args);
            case 'uuid_decompress': return this.uuidDecompress(args);
            case 'uuid_check': return this.uuidCheck(args);
            case 'path_join': return this.pathJoin(args);
            case 'path_parse': return this.pathParse(args);
            case 'doc_url': return this.docUrl(args);
            default: return { success: false, error: `Unknown action: ${action}` };
        }
    }

    // ── Editor.Utils.File ──

    private async fileCopy(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'source', 'target');
        if (missing) return missing;
        try {
            Editor.Utils.File.copy(args.source, args.target);
            return { success: true, message: 'File copied', data: { source: args.source, target: args.target } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async fileName(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'source');
        if (missing) return missing;
        try {
            const name = Editor.Utils.File.getName(args.source);
            return { success: true, data: { name } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private async unzipFile(args: any): Promise<ToolResponse> {
        const missing = this.requireParams(args, 'source', 'target');
        if (missing) return missing;
        try {
            await Editor.Utils.File.unzip(args.source, args.target, { peel: args.peel });
            return { success: true, message: 'File unzipped', data: { source: args.source, target: args.target } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    // ── Editor.Utils.UUID ──

    private uuidGenerate(): ToolResponse {
        try {
            const uuid = Editor.Utils.UUID.generate();
            return { success: true, data: { uuid } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private uuidCompress(args: any): ToolResponse {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;
        try {
            const compressed = Editor.Utils.UUID.compressUUID(args.uuid, true);
            return { success: true, data: { original: args.uuid, compressed } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private uuidDecompress(args: any): ToolResponse {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;
        try {
            const decompressed = Editor.Utils.UUID.decompressUUID(args.uuid);
            return { success: true, data: { original: args.uuid, decompressed } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private uuidCheck(args: any): ToolResponse {
        const missing = this.requireParams(args, 'uuid');
        if (missing) return missing;
        try {
            const result = Editor.Utils.UUID.isUUID(args.uuid);
            return { success: true, data: { input: args.uuid, isUUID: !!result } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    // ── Editor.Utils.Path ──

    private pathJoin(args: any): ToolResponse {
        const missing = this.requireParams(args, 'paths');
        if (missing) return missing;
        try {
            const joined = Editor.Utils.Path.join(...args.paths);
            return { success: true, data: { segments: args.paths, result: joined } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    private pathParse(args: any): ToolResponse {
        const missing = this.requireParams(args, 'path');
        if (missing) return missing;
        try {
            const parsed = Editor.Utils.Path.parse(args.path);
            return { success: true, data: { input: args.path, parsed } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }

    // ── Editor.Utils.Url ──

    private docUrl(args: any): ToolResponse {
        const missing = this.requireParams(args, 'url');
        if (missing) return missing;
        try {
            const fullUrl = Editor.Utils.Url.getDocUrl(args.url, args.docType || 'manual');
            return { success: true, data: { relative: args.url, type: args.docType || 'manual', fullUrl } };
        } catch (err: any) {
            return { success: false, error: err.message || String(err) };
        }
    }
}
