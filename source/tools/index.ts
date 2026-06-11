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
import { CameraManage } from './camera-manage';
import { LightManage } from './light-manage';
import { MaterialManage } from './material-manage';
import { ParticleManage } from './particle-manage';
import { RenderTexture } from './render-texture';
import { ShaderManage } from './shader-manage';
import { Physics3DManage } from './physics3d-manage';
import { Physics2DManage } from './physics2d-manage';
import { AudioManage } from './audio-manage';
import { TweenManage } from './tween-manage';
import { SpineManage } from './spine-manage';
import { DragonBonesManage } from './dragonbones-manage';
import { UIScrollView } from './ui-scrollview';
import { UIPageView } from './ui-pageview';
import { UIRichText } from './ui-richtext';
import { UIMask } from './ui-mask';
import { UISafeArea } from './ui-safearea';
import { UICanvas } from './ui-canvas';
import { GraphicsManage } from './graphics-manage';
import { TerrainManage } from './terrain-manage';
import { TiledMapManage } from './tiledmap-manage';
import { AtlasManage } from './atlas-manage';
import { TextureManage } from './texture-manage';
import { FontManage } from './font-manage';
import { BundleManage } from './bundle-manage';
import { PrefabEdit } from './prefab-edit';
import { PrefabTemplate } from './prefab-template';
import { PanelManage } from './panel-manage';
import { ExtensionManage } from './extension-manage';
import { SceneAnalysis } from './scene-analysis';

export {
    SceneManager, NodeLifecycle, NodeQuery, NodeTransform,
    ComponentManage, PrefabLifecycle, PrefabBrowse,
    AssetManage, AssetAnalyze, ProjectManage, BuildSystem,
    PreferencesManage, BroadcastMessage, SceneView, ServerInfo, DebugConsole,
    AnimationManage, UIComponent, ScriptManage, SelectionManage,
    CameraManage, LightManage, MaterialManage, ParticleManage,
    RenderTexture, ShaderManage,
    Physics3DManage, Physics2DManage, AudioManage, TweenManage,
    SpineManage, DragonBonesManage,
    UIScrollView, UIPageView, UIRichText, UIMask, UISafeArea, UICanvas,
    GraphicsManage, TerrainManage, TiledMapManage,
    AtlasManage, TextureManage, FontManage, BundleManage,
    PrefabEdit, PrefabTemplate,
    PanelManage, ExtensionManage, SceneAnalysis,
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
    ['camera_manage', CameraManage, 'feature'],
    ['light_manage', LightManage, 'feature'],
    ['material_manage', MaterialManage, 'feature'],
    ['particle_manage', ParticleManage, 'feature'],
    ['render_texture', RenderTexture, 'feature'],
    ['shader_manage', ShaderManage, 'feature'],
    ['physics3d_manage', Physics3DManage, 'feature'],
    ['physics2d_manage', Physics2DManage, 'feature'],
    ['audio_manage', AudioManage, 'feature'],
    ['tween_manage', TweenManage, 'feature'],
    ['spine_manage', SpineManage, 'feature'],
    ['dragonbones_manage', DragonBonesManage, 'feature'],
    ['ui_scrollview', UIScrollView, 'feature'],
    ['ui_pageview', UIPageView, 'feature'],
    ['ui_richtext', UIRichText, 'feature'],
    ['ui_mask', UIMask, 'feature'],
    ['ui_safearea', UISafeArea, 'feature'],
    ['ui_canvas', UICanvas, 'feature'],
    ['graphics_manage', GraphicsManage, 'feature'],
    ['terrain_manage', TerrainManage, 'feature'],
    ['tiledmap_manage', TiledMapManage, 'feature'],
    ['atlas_manage', AtlasManage, 'feature'],
    ['texture_manage', TextureManage, 'feature'],
    ['font_manage', FontManage, 'feature'],
    ['bundle_manage', BundleManage, 'feature'],
    ['prefab_edit', PrefabEdit, 'core'],
    ['prefab_template', PrefabTemplate, 'core'],
    ['panel_manage', PanelManage, 'editor'],
    ['extension_manage', ExtensionManage, 'editor'],
    ['scene_analysis', SceneAnalysis, 'editor'],
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
