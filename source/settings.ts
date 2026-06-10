/**
 * Configuration persistence for the MCP server extension.
 *
 * Single JSON file under the project's settings/ directory:
 *   - cocos-mcp-server.json  →  ServerConfig (port, CORS, etc.)
 *
 * All I/O is async to avoid blocking the editor main thread.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ServerConfig } from './types';


export const DEFAULT_CONFIG: ServerConfig = {
    port: 3000,
    autoStart: false,
    enableDebugLog: false,
    allowedOrigins: ['*'],
    maxConnections: 10,
};


function configPath(): string {
    return path.join(Editor.Project.path, 'settings', 'cocos-mcp-server.json');
}

async function ensureDir(filePath: string): Promise<void> {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
}


async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
    try {
        const raw = await fs.promises.readFile(filePath, 'utf8');
        return { ...fallback, ...JSON.parse(raw) };
    } catch {
        return fallback;
    }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
    await ensureDir(filePath);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}


export async function loadConfig(): Promise<ServerConfig> {
    return readJsonFile<ServerConfig>(configPath(), DEFAULT_CONFIG);
}

export async function saveConfig(cfg: ServerConfig): Promise<void> {
    await writeJsonFile(configPath(), cfg);
}
