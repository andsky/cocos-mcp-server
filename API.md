# Cocos MCP Server v0.1.0 — API 文档

## 概述

56 个统一工具 + action 参数架构。每个工具采用 **"类别_功能域 + action参数"** 模式，通过单一 `action` 字段切换操作，覆盖场景、节点、组件、预制体、资源、物理、渲染、音频、动画、UI、地形、材质、着色器、扩展、面板、调试、预览、引擎、剪贴板、对话框、网络、工具集等全部编辑器操作。

> Action 列表以 `source/tools/*.ts` 的 `actions = [...]` 为唯一事实来源；本文档与其保持一致。工具/Action 总数可由 `GET /health` 端点动态获取。

## 传输协议

| 模式 | 端点 | 说明 |
|------|------|------|
| **HTTP JSON-RPC** | `POST /mcp` | 标准 MCP 协议 |
| **SSE** | `GET /sse` | SSE 传输（客户端长连接） |
| **SSE 消息** | `POST /message?sessionId=N` | SSE 客户端发送消息 |
| **健康检查** | `GET /health` | 服务器状态 |
| **工具列表** | `GET /api/tools` | 所有工具元数据 |
| **直接调用** | `POST /api/<tool_name>` | REST 风格调用 |

## 工具分类

| 类别 | 数量 | 说明 |
|------|------|------|
| **Core** | 15 | 场景、节点、组件、预制体、资源、项目、构建、预览、引擎 |
| **Editor** | 13 | 偏好设置、广播、场景视图、服务器、调试、选区、面板、扩展、场景分析、剪贴板、对话框、网络、工具集 |
| **Feature** | 28 | 动画、UI、脚本、相机、灯光、物理、音频、粒子、材质、着色器、渲染纹理、地形、TiledMap、图集、纹理、字体、资源包、Spine、DragonBones、Tween、图形绘制 |
| **总计** | **56 工具 / 362 actions / 28 场景脚本方法** | |

---

## Core 工具 (15)

### 1. scene_management — 场景管理
**Actions**: `get`, `list`, `open`, `save`, `create`, `close`, `hierarchy`, `undo`, `redo`

```json
{ "action": "get" }
{ "action": "open", "scenePath": "db://assets/scenes/Game.scene" }
{ "action": "create", "sceneName": "Level2", "savePath": "db://assets/scenes/Level2.scene" }
{ "action": "hierarchy", "includeComponents": true }
```

### 2. node_lifecycle — 节点生命周期
**Actions**: `create`, `delete`, `duplicate`, `rename`, `activate`

```json
{ "action": "create", "name": "Player", "parentUuid": "uuid", "nodeType": "2DNode" }
{ "action": "create", "name": "Enemy", "assetPath": "db://assets/prefabs/Enemy.prefab", "parentUuid": "uuid", "unlinkPrefab": true }
{ "action": "duplicate", "uuid": "node-uuid" }
{ "action": "activate", "uuid": "node-uuid", "active": true }
```

### 3. node_query — 节点查询
**Actions**: `get`, `find`, `findBy`, `all`

```json
{ "action": "get", "uuid": "node-uuid" }
{ "action": "find", "pattern": "Enemy", "exactMatch": false }
{ "action": "findBy", "name": "Player" }
{ "action": "all" }
```

### 4. node_transform — 节点变换
**Actions**: `set`, `move`, `reorder`, `reset`

```json
{ "action": "set", "uuid": "uuid", "position": {"x":100,"y":200,"z":0}, "scale": {"x":1,"y":1,"z":1} }
{ "action": "move", "uuid": "uuid", "newParentUuid": "parent-uuid", "siblingIndex": 0 }
{ "action": "reorder", "uuid": "uuid", "siblingIndex": 2 }
{ "action": "reset", "uuid": "uuid" }
```

### 5. component_manage — 组件管理
**Actions**: `add`, `remove`, `get`, `info`, `set`

```json
{ "action": "add", "uuid": "uuid", "componentType": "cc.Sprite" }
{ "action": "get", "uuid": "uuid" }
{ "action": "set", "uuid": "uuid", "componentType": "cc.Label", "property": "string", "value": "Hello" }
{ "action": "set", "uuid": "uuid", "componentType": "cc.Sprite", "property": "spriteFrame", "value": "uuid-of-spriteframe", "propertyType": "spriteFrame" }
```

### 6. prefab_lifecycle — 预制体生命周期
**Actions**: `create`, `update`, `revert`, `duplicate`

```json
{ "action": "create", "uuid": "node-uuid", "savePath": "db://assets/prefabs/MyPrefab.prefab" }
{ "action": "update", "uuid": "instance-uuid" }
{ "action": "revert", "uuid": "instance-uuid" }
{ "action": "duplicate", "sourcePrefabPath": "db://assets/prefabs/A.prefab", "targetPrefabPath": "db://assets/prefabs/B.prefab" }
```

### 7. prefab_browse — 预制体浏览
**Actions**: `list`, `load`, `info`, `instantiate`

```json
{ "action": "list", "folder": "db://assets/prefabs" }
{ "action": "load", "prefabPath": "db://assets/prefabs/Enemy.prefab" }
{ "action": "instantiate", "prefabPath": "db://assets/prefabs/Enemy.prefab", "parentUuid": "uuid" }
```

### 8. prefab_edit — 预制体编辑（高级）
**Actions**: `create-nested`, `create-variant`, `apply-override`, `revert-override`, `get-override`, `get-nested`

```json
{ "action": "create-nested", "parentUuid": "uuid", "prefabPath": "db://assets/prefabs/Child.prefab" }
{ "action": "create-variant", "prefabPath": "db://assets/prefabs/A.prefab", "targetPath": "db://assets/prefabs/A_variant.prefab" }
{ "action": "apply-override", "uuid": "instance-uuid" }
{ "action": "get-override", "uuid": "instance-uuid" }
{ "action": "get-nested", "uuid": "uuid" }
```

### 9. prefab_template — 预制体模板
**Actions**: `list`, `create`, `instantiate`, `save-as-template`, `get-types`

```json
{ "action": "list", "folder": "db://assets" }
{ "action": "create", "uuid": "node-uuid", "savePath": "db://assets/prefabs/Template.prefab" }
{ "action": "instantiate", "prefabPath": "db://assets/prefabs/Btn.prefab", "parentUuid": "uuid" }
{ "action": "get-types" }
```

### 10. asset_manage — 资源管理
**Actions**: `import`, `create`, `delete`, `copy`, `move`, `info`, `list`, `save`, `open`

```json
{ "action": "import", "source": "/path/to/image.png", "targetFolder": "db://assets/textures" }
{ "action": "create", "url": "db://assets/scripts/New.ts", "content": "// script" }
{ "action": "list", "type": "texture", "folder": "db://assets" }
{ "action": "save", "url": "db://assets/data.json", "content": "{}" }
```

### 11. asset_analyze — 资源分析
**Actions**: `dependencies`, `scan`, `validate`

```json
{ "action": "dependencies", "urlOrUuid": "db://assets/prefabs/Enemy.prefab", "direction": "dependencies" }
{ "action": "scan", "directory": "db://assets" }
{ "action": "validate", "directory": "db://assets" }
```

### 12. project_manage — 项目管理
**Actions**: `run`, `build`, `info`, `refresh`

```json
{ "action": "run", "platform": "browser" }
{ "action": "build", "platform": "web-mobile", "debug": true }
{ "action": "info" }
{ "action": "refresh", "folder": "db://assets" }
```

### 13. build_system — 构建系统
**Actions**: `build`, `preview`, `status`, `stop`, `start-preview`, `reload-preview`

```json
{ "action": "build", "platform": "web-mobile", "debug": true, "buildOptions": { "sourceMap": true } }
{ "action": "preview", "platform": "browser" }
{ "action": "status" }
{ "action": "start-preview" }
{ "action": "reload-preview" }
{ "action": "stop" }
```

### 14. preview_manage — 预览管理
**Actions**: `open`, `start`, `stop`, `status`, `reload`

```json
{ "action": "open" }
{ "action": "start" }
{ "action": "stop" }
{ "action": "status" }
{ "action": "reload" }
```

### 15. engine_manage — 引擎管理
**Actions**: `compile_scripts`, `compile_shaders`

```json
{ "action": "compile_scripts" }
{ "action": "compile_shaders" }
```

---

## Editor 工具 (13)

### 16. selection_manage — 选区管理
**Actions**: `select`, `unselect`, `get`, `last`, `type`, `clear`, `hover`, `focus`

```json
{ "action": "select", "uuids": ["uuid1", "uuid2"], "type": "node" }
{ "action": "get", "type": "node" }
{ "action": "last" }
{ "action": "clear", "type": "node" }
{ "action": "hover", "uuid": "uuid", "type": "node" }
```

### 17. preferences_manage — 偏好设置
**Actions**: `get`, `set`, `list`, `open`

```json
{ "action": "get", "name": "general", "path": "editor.theme" }
{ "action": "set", "name": "general", "path": "editor.theme", "value": "dark" }
{ "action": "list" }
{ "action": "open", "tab": "general" }
```

### 18. broadcast_message — 广播消息
**Actions**: `send`, `events`

```json
{ "action": "send", "message": "custom:event", "data": {} }
{ "action": "events" }
```

### 19. scene_view — 场景视图
**Actions**: `focus`, `gizmo`, `grid`, `mode`, `camera`, `status`

> 通过 scene 频道公开消息直接控制编辑器视图（change-gizmo-tool / set-grid-visible / change-is2D / focus-camera / align-with-view 等），直接 `exec('scene', ...)`，不走 scene script。`gizmoTool` 合法值以编辑器为准，可用 `status` 查询。

```json
{ "action": "focus", "uuids": ["uuid"] }
{ "action": "gizmo", "gizmoTool": "move", "coordinate": "local", "pivot": "pivot" }
{ "action": "grid", "visible": true }
{ "action": "mode", "is2D": true }
{ "action": "camera", "cameraAction": "align-view-with-node" }
{ "action": "status" }
```

### 20. server_info — 服务器信息
**Actions**: `status`, `connectivity`, `network`, `port`, `ip`, `restart`, `quit`

```json
{ "action": "status" }
{ "action": "connectivity", "timeout": 5000 }
{ "action": "port" }
{ "action": "restart" }
```

### 21. debug_console — 调试控制台
**Actions**: `query-logs`, `clear-logs`, `execute`

> 日志走 `Editor.Logger`（`query`/`clear`，命名空间 API），脚本执行走 `execute-scene-script`，在场景进程引擎上下文运行。

```json
{ "action": "query-logs" }
{ "action": "clear-logs" }
{ "action": "execute", "script": "console.log('Hello');" }
```

### 22. panel_manage — 面板管理
**Actions**: `list`, `open`, `close`, `focus`, `get-active`

```json
{ "action": "list" }
{ "action": "open", "panelName": "console" }
{ "action": "close", "panelName": "console" }
{ "action": "get-active" }
```

### 23. extension_manage — 扩展管理
**Actions**: `list`, `info`, `enable`, `disable`, `reload`, `install`, `uninstall`

```json
{ "action": "list" }
{ "action": "info", "name": "cocos-mcp-server" }
{ "action": "enable", "name": "my-extension" }
{ "action": "reload", "name": "my-extension" }
{ "action": "install", "path": "/path/to/extension" }
```

### 24. scene_analysis — 场景分析
**Actions**: `statistics`, `node-count`, `component-count`, `draw-call-info`, `find-heavy`, `find-duplicates`, `optimize`, `texture-memory`

```json
{ "action": "statistics" }
{ "action": "draw-call-info" }
{ "action": "find-heavy", "threshold": 10 }
{ "action": "find-duplicates" }
{ "action": "texture-memory", "folder": "db://assets" }
```

### 25. clipboard_manage — 剪贴板
**Actions**: `read`, `write`, `has`, `clear`

```json
{ "action": "read", "type": "text" }
{ "action": "write", "type": "text", "value": "db://assets/prefabs/Player.prefab" }
{ "action": "has", "type": "text" }
{ "action": "clear" }
```

### 26. dialog_manage — 对话框
**Actions**: `info`, `warn`, `error`, `save`, `select`

```json
{ "action": "info", "message": "Operation completed", "title": "Info" }
{ "action": "warn", "message": "This will delete the node. Continue?", "buttons": ["OK", "Cancel"] }
{ "action": "save", "title": "Save Prefab", "filters": [{"name": "Prefab", "extensions": ["prefab"]}] }
{ "action": "select", "type": "file", "multi": true, "filters": [{"name": "Images", "extensions": ["png","jpg"]}] }
```

### 27. network_manage — 网络工具
**Actions**: `get`, `post`, `check_port`, `ip_list`, `test_connect`, `test_host`

```json
{ "action": "get", "url": "https://example.com/api" }
{ "action": "post", "url": "https://example.com/api", "data": {"key": "value"} }
{ "action": "check_port", "port": 3000 }
{ "action": "test_host", "host": "192.168.1.100" }
```

### 28. editor_utils — 编辑器工具集
**Actions**: `file_copy`, `file_name`, `unzip`, `uuid_generate`, `uuid_compress`, `uuid_decompress`, `uuid_check`, `path_join`, `path_parse`, `doc_url`

```json
{ "action": "uuid_generate" }
{ "action": "uuid_compress", "uuid": "15aacf58-f464-4a95-83a9-77f34d08046a" }
{ "action": "uuid_decompress", "uuid": "15aaERuyLMM91E7lVVVVVV" }
{ "action": "path_join", "paths": ["db://assets", "prefabs", "Player.prefab"] }
{ "action": "path_parse", "path": "db://assets/prefabs/Player.prefab" }
{ "action": "unzip", "source": "/tmp/pkg.zip", "target": "/tmp/out", "peel": true }
{ "action": "doc_url", "url": "editor/extension/readme.html", "docType": "manual" }
```

---

## Feature 工具 (28)

### 29. camera_manage — 相机管理
**Actions**: `add`, `remove`, `get`, `set-projection`, `set-fov`, `set-ortho-size`, `set-near-far`, `set-clear`, `set-priority`, `set-target-texture`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "set-projection", "uuid": "uuid", "projection": "perspective" }
{ "action": "set-fov", "uuid": "uuid", "fov": 60 }
{ "action": "set-clear", "uuid": "uuid", "clearColor": {"r":0,"g":0,"b":0,"a":255}, "clearFlags": 7 }
```

### 30. light_manage — 灯光管理
**Actions**: `add`, `remove`, `get`, `set-color`, `set-intensity`, `set-range`, `set-spot-angle`, `set-shadow`, `set-type`

```json
{ "action": "add", "uuid": "uuid", "lightType": "DirectionalLight" }
{ "action": "set-color", "uuid": "uuid", "color": {"r":255,"g":255,"b":255,"a":255} }
{ "action": "set-intensity", "uuid": "uuid", "intensity": 1.0 }
{ "action": "set-shadow", "uuid": "uuid", "enabled": true }
```

### 31. material_manage — 材质管理
**Actions**: `list`, `info`, `create`, `delete`, `set-property`, `set-effect`, `copy`, `get-properties`

```json
{ "action": "list" }
{ "action": "create", "savePath": "db://assets/materials/New.mtl", "effectPath": "db://assets/effects/unlit.effect" }
{ "action": "set-property", "uuid": "uuid", "propertyName": "mainColor", "value": {"r":255,"g":0,"b":0,"a":255}, "propertyType": "color" }
{ "action": "get-properties", "uuid": "uuid" }
```

### 32. particle_manage — 粒子系统
**Actions**: `add`, `remove`, `get`, `set-rate`, `set-duration`, `set-life`, `set-speed`, `set-color`, `set-size`, `set-renderer`, `set-texture`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "set-rate", "uuid": "uuid", "rate": 50 }
{ "action": "set-texture", "uuid": "uuid", "spriteFramePath": "db://assets/textures/particle.png" }
```

### 33. render_texture — 渲染纹理
**Actions**: `list`, `info`, `create`, `delete`, `set-size`

```json
{ "action": "list" }
{ "action": "create", "savePath": "db://assets/rt/CameraRT.rt" }
{ "action": "set-size", "url": "db://assets/rt/CameraRT.rt", "width": 512, "height": 512 }
```

### 34. shader_manage — 着色器管理
**Actions**: `list`, `info`, `create`, `delete`, `open`, `save`, `compile`

```json
{ "action": "list" }
{ "action": "info", "url": "db://assets/effects/unlit.effect" }
{ "action": "save", "url": "db://assets/effects/MyShader.effect", "content": "..." }
{ "action": "compile", "url": "db://assets/effects/MyShader.effect" }
```

### 35. physics3d_manage — 3D 物理
**Actions**: `add-body`, `add-collider`, `remove`, `get-body`, `get-collider`, `set-body`, `set-collider`, `set-material`, `set-constraint`

```json
{ "action": "add-body", "uuid": "uuid" }
{ "action": "add-collider", "uuid": "uuid", "colliderType": "box" }
{ "action": "set-body", "uuid": "uuid", "mass": 1, "type": "dynamic" }
{ "action": "set-collider", "uuid": "uuid", "colliderType": "box", "size": {"x":1,"y":1,"z":1} }
```

### 36. physics2d_manage — 2D 物理
**Actions**: `add-body`, `add-collider`, `remove`, `get-body`, `get-collider`, `set-body`, `set-collider`, `set-joint`

```json
{ "action": "add-body", "uuid": "uuid" }
{ "action": "add-collider", "uuid": "uuid", "colliderType": "box" }
{ "action": "set-body", "uuid": "uuid", "type": "dynamic", "gravityScale": 1 }
{ "action": "set-collider", "uuid": "uuid", "colliderType": "circle", "radius": 25 }
```

### 37. audio_manage — 音频管理
**Actions**: `add`, `remove`, `get`, `set-clip`, `set-volume`, `set-loop`, `play`, `pause`, `stop`, `list-clips`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "set-clip", "uuid": "uuid", "clipPath": "db://assets/audio/bgm.mp3" }
{ "action": "play", "uuid": "uuid" }
{ "action": "list-clips" }
```

### 38. tween_manage — Tween 动画
**Actions**: `create`, `to`, `by`, `stop`, `stop-all`, `sequence`, `repeat`

```json
{ "action": "to", "uuid": "uuid", "properties": {"x":100,"y":200}, "duration": 1, "easing": "easeOut" }
{ "action": "by", "uuid": "uuid", "properties": {"y":50}, "duration": 0.5 }
{ "action": "stop", "uuid": "uuid" }
{ "action": "stop-all" }
```

### 39. spine_manage — Spine 动画
**Actions**: `add`, `remove`, `get`, `set-data`, `set-animation`, `set-skin`, `set-mix`, `pause`, `get-info`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "set-data", "uuid": "uuid", "skeletonDataPath": "db://assets/spine/hero/skeleton.json" }
{ "action": "set-animation", "uuid": "uuid", "animationName": "run", "loop": true }
{ "action": "get-info", "uuid": "uuid" }
```

### 40. dragonbones_manage — DragonBones 动画
**Actions**: `add`, `remove`, `get`, `set-data`, `set-animation`, `set-armature`, `get-info`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "set-data", "uuid": "uuid", "dragonBonesPath": "db://assets/db/hero/hero.json" }
{ "action": "set-animation", "uuid": "uuid", "animationName": "walk", "playTimes": -1 }
{ "action": "get-info", "uuid": "uuid" }
```

### 41. ui_scrollview — ScrollView
**Actions**: `add`, `remove`, `get`, `set-direction`, `set-bounce`, `set-indicators`, `set-content`, `scroll-to`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "set-direction", "uuid": "uuid", "direction": 3 }
{ "action": "set-content", "uuid": "uuid", "contentUuid": "content-uuid" }
{ "action": "scroll-to", "uuid": "uuid", "position": {"x":0,"y":100}, "animated": true }
```

### 42. ui_pageview — PageView
**Actions**: `add`, `remove`, `get`, `set-direction`, `set-size`, `set-indicator`, `set-turn-effect`, `set-current-page`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "set-direction", "uuid": "uuid", "direction": "horizontal" }
{ "action": "set-current-page", "uuid": "uuid", "pageIndex": 2 }
```

### 43. ui_richtext — RichText
**Actions**: `add`, `remove`, `get`, `set-text`, `set-font`, `set-max-width`, `set-image-atlas`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "set-text", "uuid": "uuid", "text": "<color=#ff0000>Red</color> text" }
{ "action": "set-font", "uuid": "uuid", "fontSize": 24, "lineHeight": 30 }
```

### 44. ui_mask — Mask
**Actions**: `add`, `remove`, `get`, `set-type`, `set-sprite-frame`, `set-threshold`, `set-inverted`, `set-ellipse-segments`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "set-type", "uuid": "uuid", "maskType": 0 }
{ "action": "set-sprite-frame", "uuid": "uuid", "spriteFramePath": "db://assets/mask.png" }
{ "action": "set-inverted", "uuid": "uuid", "inverted": true }
```

### 45. ui_safearea — SafeArea
**Actions**: `add`, `remove`, `get`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "remove", "uuid": "uuid" }
{ "action": "get", "uuid": "uuid" }
```

### 46. ui_canvas — Canvas
**Actions**: `add`, `remove`, `get`, `set-design-size`, `set-fit`, `set-camera`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "set-design-size", "uuid": "uuid", "width": 640, "height": 1136 }
{ "action": "set-fit", "uuid": "uuid", "fitWidth": false, "fitHeight": true }
```

### 47. ui_component — UI 组件（基础）
**Actions**: `label`, `sprite`, `button`, `layout`, `widget`, `progress`, `editbox`, `slider`, `toggle`

```json
{ "action": "label", "uuid": "uuid", "text": "Hello", "fontSize": 24, "fontColor": {"r":255,"g":0,"b":0,"a":255} }
{ "action": "sprite", "uuid": "uuid", "spriteFrame": "db://assets/textures/player.png" }
{ "action": "button", "uuid": "uuid", "transition": "COLOR" }
{ "action": "layout", "uuid": "uuid", "layoutType": "HORIZONTAL" }
{ "action": "widget", "uuid": "uuid", "isAlignTop": true, "top": 10 }
```

### 48. animation_manage — 动画管理
**Actions**: `clip`, `component`, `state`, `track`, `play`, `pause`, `stop`, `record`

```json
{ "action": "component", "uuid": "uuid", "componentAction": "add" }
{ "action": "play", "uuid": "uuid", "clipName": "run", "loop": true, "speed": 1.0 }
{ "action": "pause", "uuid": "uuid" }
{ "action": "track", "uuid": "uuid", "clipName": "idle" }
```

### 49. script_manage — 脚本管理
**Actions**: `attach`, `create`, `compile`, `query`, `methods`, `execute`, `properties`

```json
{ "action": "attach", "uuid": "uuid", "scriptPath": "db://assets/scripts/Player.ts" }
{ "action": "create", "scriptName": "Enemy", "savePath": "db://assets/scripts" }
{ "action": "methods", "className": "Player" }
{ "action": "execute", "uuid": "uuid", "methodName": "takeDamage", "methodArgs": [10] }
{ "action": "properties", "uuid": "uuid", "className": "Player" }
```

### 50. graphics_manage — 图形绘制
**Actions**: `add`, `remove`, `get`, `set-colors`, `draw`, `clear`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "set-colors", "uuid": "uuid", "fillColor": {"r":255,"g":0,"b":0,"a":255}, "lineWidth": 2 }
{ "action": "draw", "uuid": "uuid", "commands": [{"type":"circle","params":[0,0,50]},{"type":"fill"}] }
{ "action": "clear", "uuid": "uuid" }
```

### 51. terrain_manage — 地形系统
**Actions**: `add`, `remove`, `get`, `set-size`, `set-height`, `set-layer`, `set-lighting`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "set-size", "uuid": "uuid", "tileSize": 32, "blockCount": 4 }
{ "action": "set-layer", "uuid": "uuid", "layerIndex": 0, "texturePath": "db://assets/terrain/grass.png" }
```

### 52. tiledmap_manage — TiledMap
**Actions**: `add`, `remove`, `get`, `set-tmx`, `set-culling`, `get-layers`, `get-properties`

```json
{ "action": "add", "uuid": "uuid" }
{ "action": "set-tmx", "uuid": "uuid", "tmxPath": "db://assets/maps/level1.tmx" }
{ "action": "get-layers", "uuid": "uuid" }
{ "action": "get-properties", "uuid": "uuid" }
```

### 53. atlas_manage — 图集管理
**Actions**: `list`, `info`, `create`, `delete`, `pack`, `get-sprites`, `set-settings`

```json
{ "action": "list" }
{ "action": "create", "savePath": "db://assets/atlas/UI.pac" }
{ "action": "pack", "url": "db://assets/atlas/UI.pac" }
{ "action": "get-sprites", "url": "db://assets/atlas/UI.pac" }
```

### 54. texture_manage — 纹理管理
**Actions**: `list`, `info`, `set-type`, `set-wrap`, `set-filter`, `set-compress`, `batch-compress`

```json
{ "action": "list" }
{ "action": "info", "url": "db://assets/textures/player.png" }
{ "action": "set-type", "url": "db://assets/textures/normal.png", "textureType": "normal-map" }
{ "action": "batch-compress", "folder": "db://assets/textures", "platform": "android" }
```

### 55. font_manage — 字体管理
**Actions**: `list`, `info`, `import`, `delete`, `set-font`, `set-label-atlas`

```json
{ "action": "list" }
{ "action": "import", "source": "/path/to/font.ttf", "targetFolder": "db://assets/fonts" }
{ "action": "set-font", "uuid": "uuid", "fontPath": "db://assets/fonts/Arial.ttf" }
```

### 56. bundle_manage — 资源包管理
**Actions**: `list`, `info`, `create`, `remove`, `set-priority`, `set-compression`, `set-platforms`, `get-assets`

```json
{ "action": "list" }
{ "action": "create", "folderPath": "db://assets/resources", "bundleName": "resources" }
{ "action": "set-priority", "url": "db://assets/resources", "priority": 1 }
{ "action": "get-assets", "url": "db://assets/resources" }
```

---

## 版本信息

- **版本**: 0.1.0
- **架构**: Unified Tool + Action
- **工具数量**: 56（Core 15 / Editor 13 / Feature 28）
- **Action 总数**: 362（以 `GET /health` 为准）
- **场景脚本方法**: 28
- **兼容性**: Cocos Creator 3.8.6+
- **传输协议**: HTTP JSON-RPC + SSE
- **协议**: Model Context Protocol (MCP)
