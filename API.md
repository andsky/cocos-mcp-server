# Cocos MCP Server v0.1.0 - API 文档

## 概述

20 个统一工具 + action 参数架构。每个工具采用 **"类别_功能域 + action参数"** 模式，覆盖场景、节点、组件、预制体、资源、项目、调试、动画、UI 等全部编辑器操作。

## 工具分类

| 类别 | 工具数量 | 说明 |
|------|---------|------|
| **核心工具 (Core)** | 11 | 场景、节点、组件、预制体、资源、项目、构建 |
| **编辑器工具 (Editor)** | 5 | 偏好设置、广播、场景视图、服务器、调试 |
| **功能工具 (Feature)** | 3 | 动画、UI组件、脚本 |
| **总计** | **20** | 覆盖 Cocos Creator 3.8.8 全部编辑器操作 |

---

## 核心工具 (Core Tools)

### 1. scene_management - 场景管理

**Actions**: `get`, `list`, `open`, `save`, `create`, `close`, `hierarchy`

```json
// 获取当前场景
{ "action": "get" }

// 获取场景列表
{ "action": "list" }

// 打开场景
{ "action": "open", "scenePath": "db://assets/scenes/GameScene.scene" }

// 保存场景
{ "action": "save" }

// 创建场景
{ "action": "create", "sceneName": "NewLevel", "savePath": "db://assets/scenes/NewLevel.scene" }

// 关闭场景
{ "action": "close" }

// 获取场景层级
{ "action": "hierarchy", "includeComponents": true }
```

---

### 2. node_lifecycle - 节点生命周期

**Actions**: `create`, `delete`, `duplicate`

```json
// 创建空节点
{
  "action": "create",
  "name": "PlayerNode",
  "parentUuid": "parent-uuid",
  "nodeType": "2DNode"
}

// 创建带组件的节点
{
  "action": "create",
  "name": "ButtonNode",
  "parentUuid": "parent-uuid",
  "components": ["cc.Sprite", "cc.Button"]
}

// 从预制体实例化
{
  "action": "create",
  "name": "Enemy",
  "assetPath": "db://assets/prefabs/Enemy.prefab",
  "parentUuid": "parent-uuid"
}

// 删除节点
{ "action": "delete", "uuid": "node-uuid" }

// 复制节点
{ "action": "duplicate", "uuid": "node-uuid", "includeChildren": true }
```

---

### 3. node_query - 节点查询

**Actions**: `get`, `find`, `findBy`, `all`

```json
// 获取节点信息
{ "action": "get", "uuid": "node-uuid" }

// 按模式查找节点
{ "action": "find", "pattern": "Enemy", "exactMatch": false }

// 按名称查找节点
{ "action": "findBy", "name": "Player" }

// 获取所有节点
{ "action": "all" }
```

---

### 4. node_transform - 节点变换

**Actions**: `set`, `move`, `reset`

```json
// 设置变换
{
  "action": "set",
  "uuid": "node-uuid",
  "position": { "x": 100, "y": 200, "z": 0 },
  "rotation": { "x": 0, "y": 0, "z": 45 },
  "scale": { "x": 1, "y": 1, "z": 1 }
}

// 移动节点到新父节点
{
  "action": "move",
  "uuid": "node-uuid",
  "newParentUuid": "new-parent-uuid",
  "siblingIndex": 0
}

// 重置变换
{ "action": "reset", "uuid": "node-uuid" }
```

---

### 5. component_manage - 组件管理

**Actions**: `add`, `remove`, `get`, `info`, `set`

```json
// 添加组件
{ "action": "add", "nodeUuid": "node-uuid", "componentType": "cc.Sprite" }

// 移除组件
{ "action": "remove", "nodeUuid": "node-uuid", "componentType": "cc.Sprite" }

// 获取所有组件
{ "action": "get", "nodeUuid": "node-uuid" }

// 获取组件信息
{ "action": "info", "nodeUuid": "node-uuid", "componentType": "cc.Sprite" }

// 设置组件属性
{
  "action": "set",
  "nodeUuid": "node-uuid",
  "componentType": "cc.Label",
  "property": "string",
  "value": "Hello World"
}
```

---

### 6. prefab_lifecycle - 预制体生命周期

**Actions**: `create`, `update`, `revert`, `duplicate`

```json
// 创建预制体
{
  "action": "create",
  "nodeUuid": "node-uuid",
  "savePath": "db://assets/prefabs/",
  "prefabName": "MyPrefab"
}

// 更新预制体
{ "action": "update", "prefabPath": "db://assets/prefabs/Enemy.prefab", "nodeUuid": "node-uuid" }

// 恢复预制体实例
{ "action": "revert", "nodeUuid": "prefab-instance-uuid" }

// 复制预制体
{
  "action": "duplicate",
  "sourcePrefabPath": "db://assets/prefabs/Enemy.prefab",
  "targetPrefabPath": "db://assets/prefabs/Enemy2.prefab"
}
```

---

### 7. prefab_browse - 预制体浏览

**Actions**: `list`, `load`, `info`, `instantiate`

```json
// 获取预制体列表
{ "action": "list", "folder": "db://assets/prefabs" }

// 加载预制体
{ "action": "load", "prefabPath": "db://assets/prefabs/Enemy.prefab" }

// 获取预制体信息
{ "action": "info", "prefabPath": "db://assets/prefabs/Enemy.prefab" }

// 实例化预制体
{
  "action": "instantiate",
  "prefabPath": "db://assets/prefabs/Enemy.prefab",
  "parentUuid": "parent-uuid",
  "position": { "x": 100, "y": 200, "z": 0 }
}
```

---

### 8. asset_manage - 资源管理

**Actions**: `import`, `create`, `delete`, `copy`, `move`, `info`, `query`, `list`

```json
// 导入资源
{ "action": "import", "source": "/path/to/image.png", "targetFolder": "db://assets/textures" }

// 创建资源
{ "action": "create", "url": "db://assets/scripts/NewScript.ts", "content": "// Script content" }

// 删除资源
{ "action": "delete", "url": "db://assets/textures/unused.png" }

// 复制资源
{ "action": "copy", "source": "db://assets/a.png", "target": "db://assets/b.png" }

// 移动资源
{ "action": "move", "source": "db://assets/old.png", "target": "db://assets/new.png" }

// 获取资源信息
{ "action": "info", "url": "db://assets/textures/player.png" }

// 查询资源
{ "action": "query", "uuid": "asset-uuid" }

// 获取资源列表
{ "action": "list", "type": "texture", "folder": "db://assets/textures" }
```

---

### 9. asset_analyze - 资源分析

**Actions**: `dependencies`, `unused`, `validate`, `batch`, `manifest`

```json
// 查询依赖关系
{
  "action": "dependencies",
  "urlOrUuid": "db://assets/prefabs/Enemy.prefab",
  "direction": "dependencies"
}

// 查找未使用资源
{ "action": "unused", "directory": "db://assets" }

// 验证资源引用
{ "action": "validate", "directory": "db://assets" }

// 批量导入
{
  "action": "batch",
  "batchAction": "import",
  "sourceDirectory": "/path/to/assets",
  "targetDirectory": "db://assets/imported",
  "recursive": true
}

// 导出资源清单
{ "action": "manifest", "directory": "db://assets", "format": "json" }
```

---

### 10. project_manage - 项目管理

**Actions**: `run`, `build`, `info`, `settings`, `refresh`

```json
// 运行项目
{ "action": "run", "platform": "browser" }

// 构建项目
{ "action": "build", "platform": "web-mobile", "debug": true }

// 获取项目信息
{ "action": "info" }

// 获取项目设置
{ "action": "settings", "category": "physics" }

// 刷新资源
{ "action": "refresh", "folder": "db://assets/textures" }
```

---

### 11. build_system - 构建系统

**Actions**: `build`, `preview`, `settings`, `status`, `open`, `start`, `stop`

```json
// 构建项目
{
  "action": "build",
  "platform": "web-mobile",
  "debug": true,
  "buildOptions": {
    "sourceMap": true,
    "inlineBundles": false
  }
}

// 启动预览
{ "action": "preview", "platform": "browser" }

// 获取构建设置
{ "action": "settings" }

// 检查构建状态
{ "action": "status" }

// 打开构建面板
{ "action": "open" }

// 启动预览服务器
{ "action": "start", "port": 7456 }

// 停止预览服务器
{ "action": "stop" }
```

---

## 编辑器工具 (Editor Tools)

### 12. preferences_manage - 偏好设置管理

**Actions**: `get`, `set`, `reset`, `export`, `import`, `open`, `list`

```json
// 获取设置
{ "action": "get", "name": "general", "path": "editor.theme" }

// 设置值
{ "action": "set", "name": "general", "path": "editor.theme", "value": "dark" }

// 重置设置
{ "action": "reset", "name": "general" }

// 导出设置
{ "action": "export", "exportPath": "/path/to/settings.json" }

// 导入设置
{ "action": "import", "importPath": "/path/to/settings.json" }

// 打开设置面板
{ "action": "open", "tab": "general" }

// 列出所有类别
{ "action": "list" }
```

---

### 13. broadcast_message - 广播消息

**Actions**: `listen`, `stop`, `send`, `log`, `clear`, `listeners`

```json
// 监听消息
{ "action": "listen", "messageType": "scene:change" }

// 停止监听
{ "action": "stop", "messageType": "scene:change" }

// 发送消息
{ "action": "send", "message": "custom:event", "data": { "key": "value" } }

// 获取消息日志
{ "action": "log", "limit": 100 }

// 清空日志
{ "action": "clear" }

// 获取监听器列表
{ "action": "listeners" }
```

---

### 14. scene_view - 场景视图

**Actions**: `focus`, `align`, `gizmo`, `grid`, `mode`, `camera`, `reset`, `status`

```json
// 聚焦节点
{ "action": "focus", "uuids": ["node-uuid-1", "node-uuid-2"] }

// 对齐视图
{ "action": "align" }

// 设置Gizmo工具
{ "action": "gizmo", "gizmoTool": "position", "coordinate": "local", "pivot": "center" }

// 显示/隐藏网格
{ "action": "grid", "visible": true }

// 切换2D/3D模式
{ "action": "mode", "is2D": true }

// 相机操作
{ "action": "camera", "cameraAction": "reset" }

// 重置场景视图
{ "action": "reset" }

// 获取状态
{ "action": "status" }
```

---

### 15. server_info - 服务器信息

**Actions**: `status`, `connectivity`, `network`, `port`, `ip`, `restart`, `quit`

```json
// 获取服务器状态
{ "action": "status" }

// 检查连接
{ "action": "connectivity", "timeout": 5000 }

// 获取网络接口
{ "action": "network" }

// 获取端口
{ "action": "port" }

// 获取IP列表
{ "action": "ip" }

// 重启编辑器
{ "action": "restart" }

// 退出编辑器
{ "action": "quit" }
```

---

### 16. debug_console - 调试控制台

**Actions**: `get`, `clear`, `execute`

```json
// 获取日志
{ "action": "get", "limit": 100, "filter": "error" }

// 清空日志
{ "action": "clear" }

// 执行脚本
{ "action": "execute", "script": "console.log('Hello');" }
```

---

## 功能工具 (Feature Tools)

### 17. animation_manage - 动画管理

**Actions**: `clip`, `component`, `state`, `track`, `play`, `pause`, `stop`, `record`

```json
// 获取动画剪辑
{ "action": "clip", "nodeUuid": "node-uuid", "clipName": "idle" }

// 添加动画组件
{ "action": "component", "nodeUuid": "node-uuid", "componentAction": "add" }

// 获取动画状态
{ "action": "state", "nodeUuid": "node-uuid", "stateAction": "get" }

// 获取动画轨道
{ "action": "track", "nodeUuid": "node-uuid", "trackType": "position" }

// 播放动画
{ "action": "play", "nodeUuid": "node-uuid", "clipName": "run", "loop": true }

// 暂停动画
{ "action": "pause", "nodeUuid": "node-uuid" }

// 停止动画
{ "action": "stop", "nodeUuid": "node-uuid" }

// 开始录制
{ "action": "record", "recordAction": "start", "nodeUuid": "node-uuid" }
```

---

### 18. ui_component - UI组件

**Actions**: `label`, `sprite`, `button`, `layout`, `widget`, `progress`, `editbox`, `slider`, `toggle`

```json
// 配置Label
{
  "action": "label",
  "nodeUuid": "node-uuid",
  "text": "Hello World",
  "fontSize": 24,
  "fontColor": { "r": 255, "g": 0, "b": 0, "a": 255 }
}

// 配置Sprite
{
  "action": "sprite",
  "nodeUuid": "node-uuid",
  "spriteFrame": "db://assets/textures/player.png",
  "sizeMode": "TRIMMED"
}

// 配置Button
{
  "action": "button",
  "nodeUuid": "node-uuid",
  "transition": "COLOR",
  "normalColor": { "r": 255, "g": 255, "b": 255, "a": 255 }
}

// 配置Layout
{
  "action": "layout",
  "nodeUuid": "node-uuid",
  "layoutType": "HORIZONTAL",
  "resizeMode": "CHILDREN"
}

// 配置Widget
{
  "action": "widget",
  "nodeUuid": "node-uuid",
  "isAlignTop": true,
  "top": 10
}

// 配置ProgressBar
{
  "action": "progress",
  "nodeUuid": "node-uuid",
  "progress": 0.75
}

// 配置EditBox
{
  "action": "editbox",
  "nodeUuid": "node-uuid",
  "placeholder": "Enter text...",
  "maxLength": 100
}

// 配置Slider
{
  "action": "slider",
  "nodeUuid": "node-uuid",
  "sliderValue": 0.5
}
```

---

### 19. script_manage - 脚本管理

**Actions**: `attach`, `create`, `compile`, `query`, `methods`, `execute`, `properties`

```json
// 挂载脚本
{
  "action": "attach",
  "nodeUuid": "node-uuid",
  "scriptPath": "db://assets/scripts/PlayerController.ts"
}

// 创建脚本
{
  "action": "create",
  "scriptName": "EnemyController",
  "savePath": "db://assets/scripts",
  "scriptContent": "// Custom content"
}

// 编译脚本
{ "action": "compile" }

// 查询脚本
{ "action": "query", "scriptPath": "db://assets/scripts/Player.ts" }

// 查询脚本方法
{ "action": "methods", "className": "PlayerController" }

// 执行脚本方法
{
  "action": "execute",
  "nodeUuid": "node-uuid",
  "methodName": "takeDamage",
  "methodArgs": [10]
}

// 查询脚本属性
{ "action": "properties", "className": "PlayerController" }
```

---

## 版本信息

- **版本**: 0.1.0
- **架构**: Unified Tool + Action
- **工具数量**: 20 个核心工具
- **Action 总数**: 80+ 个操作
- **兼容性**: Cocos Creator 3.8.6+
- **协议**: Model Context Protocol (MCP)