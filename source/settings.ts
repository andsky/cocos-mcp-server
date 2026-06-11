/**
 * Configuration persistence for the MCP server extension.
 *
 * Uses the official Cocos Creator Editor.Profile API with
 * three-tier priority: local > global > default.
 *
 * Schema is declared in package.json contributions.profile.editor.
 * All I/O is async to avoid blocking the editor main thread.
 */

import { ServerConfig } from './types';

const PKG = 'cocos-mcp-server';

export const DEFAULT_CONFIG: ServerConfig = {
    port: 3000,
    autoStart: false,
    enableDebugLog: false,
    allowedOrigins: ['*'],
    maxConnections: 10,
};

/**
 * Load config via Editor.Profile — automatically resolves
 * local → global → default priority.
 */
export async function loadConfig(): Promise<ServerConfig> {
    try {
        const port = await Editor.Profile.getConfig(PKG, 'port');
        const autoStart = await Editor.Profile.getConfig(PKG, 'autoStart');
        const enableDebugLog = await Editor.Profile.getConfig(PKG, 'enableDebugLog');
        const allowedOrigins = await Editor.Profile.getConfig(PKG, 'allowedOrigins');
        const maxConnections = await Editor.Profile.getConfig(PKG, 'maxConnections');

        // Merge with defaults so undefined fields (unset tiers) get sane values
        return {
            ...DEFAULT_CONFIG,
            ...(port !== undefined && { port }),
            ...(autoStart !== undefined && { autoStart }),
            ...(enableDebugLog !== undefined && { enableDebugLog }),
            ...(allowedOrigins !== undefined && { allowedOrigins }),
            ...(maxConnections !== undefined && { maxConnections }),
        };
    } catch {
        // Profile API unavailable (e.g. running outside editor) — fall back
        return { ...DEFAULT_CONFIG };
    }
}

/**
 * Save config to the local project layer via Editor.Profile.
 * This triggers the settings-changed broadcast message declared in package.json.
 */
export async function saveConfig(cfg: ServerConfig): Promise<void> {
    try {
        await Editor.Profile.setConfig(PKG, 'port', cfg.port, 'local');
        await Editor.Profile.setConfig(PKG, 'autoStart', cfg.autoStart, 'local');
        await Editor.Profile.setConfig(PKG, 'enableDebugLog', cfg.enableDebugLog, 'local');
        await Editor.Profile.setConfig(PKG, 'allowedOrigins', cfg.allowedOrigins, 'local');
        await Editor.Profile.setConfig(PKG, 'maxConnections', cfg.maxConnections, 'local');
    } catch (err) {
        console.error('[MCP] saveConfig via Editor.Profile failed:', err);
        throw err;
    }
}
