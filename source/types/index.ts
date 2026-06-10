/**
 * Type definitions for cocos-mcp-server.
 *
 * Only interfaces actively consumed by tools, server, and settings are defined here.
 * Internal data shapes flow through ToolResponse.data as plain objects.
 */

/** Extension version — single source of truth. */
export const VERSION = '0.1.0';


export interface ServerConfig {
    port: number;
    autoStart: boolean;
    enableDebugLog: boolean;
    allowedOrigins: string[];
    maxConnections: number;
}

export interface ServerStatus {
    running: boolean;
    port: number;
    clients: number;
}

// ── Tool Contract (used by 20+ tool files — do NOT break) ───────

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
}

export interface ToolResponse {
    success: boolean;
    data?: any;
    message?: string;
    error?: string;
    instruction?: string;
    warning?: string;
    verificationData?: any;
    updatedProperties?: string[];
}

export interface ToolExecutor {
    getTools(): ToolDefinition[];
    execute(action: string, args: any): Promise<ToolResponse>;
}
