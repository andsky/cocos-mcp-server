// @ts-nocheck
/**
 * 统一工具导出
 * 所有工具采用 "类别_功能域 + action参数" 模式
 */

import { ToolExecutor } from '../types';

// 单次 import + re-export，添加新工具只需在 TOOLS 里加一行
export { UnifiedToolBase } from './unified-tool-base';

import { SceneManager } from './scene-management';
import { NodeLifecycle } from './node-lifecycle';
import { NodeQuery } from './node-query';
import { NodeTransform } from './node-transform';
import { ComponentManage } from './component-manage';
import { PrefabLifecycle } from './prefab-lifecycle';
import { PrefabBrowse } from './prefab-browse';
import { AssetManage } from './asset-manage';
import { AssetAnalyze } from './asset-analyze';
import { ProjectManage } from './project-manage';
import { BuildSystem } from './build-system';
import { PreferencesManage } from './preferences-manage';
import { BroadcastMessage } from './broadcast-message';
import { SceneView } from './scene-view';
import { ServerInfo } from './server-info';
import { DebugConsole } from './debug-console';
import { AnimationManage } from './animation-manage';
import { UIComponent } from './ui-component';
import { ScriptManage } from './script-manage';
import { SelectionManage } from './selection-manage';

export {
    SceneManager, NodeLifecycle, NodeQuery, NodeTransform,
    ComponentManage, PrefabLifecycle, PrefabBrowse,
    AssetManage, AssetAnalyze, ProjectManage, BuildSystem,
    PreferencesManage, BroadcastMessage, SceneView, ServerInfo, DebugConsole,
    AnimationManage, UIComponent, ScriptManage, SelectionManage,
};

/**
 * 工具类注册表 - 单一数据源
 * 添加新工具只需在 TOOLS 数组加一行 + 顶部加 import
 */
const TOOL_CLASSES: [string, any, string][] = [
    // [tool_name, ToolClass, category]
    ['scene_management', SceneManager, 'core'],
    ['node_lifecycle', NodeLifecycle, 'core'],
    ['node_query', NodeQuery, 'core'],
    ['node_transform', NodeTransform, 'core'],
    ['component_manage', ComponentManage, 'core'],
    ['prefab_lifecycle', PrefabLifecycle, 'core'],
    ['prefab_browse', PrefabBrowse, 'core'],
    ['asset_manage', AssetManage, 'core'],
    ['asset_analyze', AssetAnalyze, 'core'],
    ['project_manage', ProjectManage, 'core'],
    ['build_system', BuildSystem, 'core'],
    ['preferences_manage', PreferencesManage, 'editor'],
    ['broadcast_message', BroadcastMessage, 'editor'],
    ['scene_view', SceneView, 'editor'],
    ['server_info', ServerInfo, 'editor'],
    ['debug_console', DebugConsole, 'editor'],
    ['animation_manage', AnimationManage, 'feature'],
    ['ui_component', UIComponent, 'feature'],
    ['script_manage', ScriptManage, 'feature'],
    ['selection_manage', SelectionManage, 'editor'],
];

export function getUnifiedTools(): Record<string, ToolExecutor> {
    const tools: Record<string, ToolExecutor> = {};
    for (const [name, Cls, category] of TOOL_CLASSES) {
        const instance = new Cls();
        instance.category = category;
        tools[name] = instance;
    }
    return tools;
}

export const UNIFIED_TOOLS_COUNT = TOOL_CLASSES.length;

/**
 * 工具分类（从注册表自动生成）
 */
export const TOOL_CATEGORIES = {
    core: TOOL_CLASSES.filter(([, , c]) => c === 'core').map(([n]) => n),
    editor: TOOL_CLASSES.filter(([, , c]) => c === 'editor').map(([n]) => n),
    feature: TOOL_CLASSES.filter(([, , c]) => c === 'feature').map(([n]) => n),
};

export const UNIFIED_TOOLS_LIST = TOOL_CLASSES.map(([n]) => n);
