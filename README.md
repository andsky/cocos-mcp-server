# Cocos MCP Server

> 通过 MCP 协议让 AI 助手（Claude、Cursor 等）直接操作 Cocos Creator 编辑器。

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](./package.json)
[![Cocos Creator](https://img.shields.io/badge/Cocos%20Creator-%E2%89%A5%203.8.6-green.svg)](https://www.cocos.com/creator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## 这是什么

MCP（Model Context Protocol）是一种让 AI 助手调用外部工具的标准协议。本插件把 Cocos Creator 编辑器的操作暴露为 MCP 工具，AI 可以直接：

- 创建/删除/移动节点
- 挂载组件、设置属性
- 管理预制体和资源
- 控制场景视图
- 运行预览和构建

简单说：**你用自然语言描述需求，AI 帮你在编辑器里干活。**

## 快速开始

### 安装

把本目录放到项目的 `extensions/` 下：

```
YourProject/extensions/cocos-mcp-server/
```

安装依赖并编译：

```bash
cd extensions/cocos-mcp-server
npm install && npm run build
```

重启 Cocos Creator，菜单栏出现 **扩展 → Cocos MCP Server → Open Panel**。

### 启动服务器

打开面板后点击 **Start Server**，默认监听 `http://127.0.0.1:3000/mcp`。

### 连接 AI 助手

**Claude CLI：**

```bash
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp
```

**Claude Desktop / Cursor：**

在 MCP 配置中添加：

```json
{
  "mcpServers": {
    "cocos-creator": { "url": "http://127.0.0.1:3000/mcp" }
  }
}
```

连接成功后，AI 助手就能调用编辑器操作了。

## 工具一览

20 个统一工具，80+ 操作。每个工具通过 `action` 参数指定具体操作。

### 场景与节点

| 工具 | 操作 | 说明 |
|------|------|------|
| `scene_management` | get, list, open, save, create, close, hierarchy | 场景管理 |
| `node_lifecycle` | create, delete, duplicate | 节点增删复制 |
| `node_query` | get, find, findBy, all | 节点查找 |
| `node_transform` | set, move, reset | 位置/旋转/缩放 |
| `selection_manage` | get, set, clear | 编辑器选中状态 |

### 组件与 UI

| 工具 | 操作 | 说明 |
|------|------|------|
| `component_manage` | add, remove, get, info, set | 组件增删改查 |
| `ui_component` | label, sprite, button, layout, widget, progress, editbox, slider, toggle | UI 控件快捷操作 |
| `script_manage` | attach, create, compile, query, methods, execute, properties | 脚本管理 |

### 资源与预制体

| 工具 | 操作 | 说明 |
|------|------|------|
| `asset_manage` | import, create, delete, copy, move, info, query, list | 资源 CRUD |
| `asset_analyze` | dependencies, unused, validate, batch, manifest | 资源分析 |
| `prefab_lifecycle` | create, update, revert, duplicate | 预制体管理 |
| `prefab_browse` | list, load, info, instantiate | 预制体浏览与实例化 |

### 编辑器与调试

| 工具 | 操作 | 说明 |
|------|------|------|
| `project_manage` | run, build, info, settings, refresh | 项目控制 |
| `build_system` | build, preview, settings, status, open, start, stop | 构建流水线 |
| `scene_view` | focus, align, gizmo, grid, mode, camera, reset, status | 场景视图 |
| `preferences_manage` | get, set, reset, export, import, open, list | 编辑器偏好 |
| `debug_console` | get, clear, execute | 控制台访问 |
| `broadcast_message` | listen, stop, send, log, clear, listeners | 编辑器内部通信 |
| `server_info` | status, connectivity, network, port, ip, restart, quit | 服务器信息 |
| `animation_manage` | clip, component, state, track, play, pause, stop, record | 动画控制 |

## 使用示例

```json
{ "tool": "node_lifecycle",  "arguments": { "action": "create", "name": "Player", "parentUuid": "uuid", "nodeType": "2DNode" }}
{ "tool": "ui_component",    "arguments": { "action": "label", "nodeUuid": "uuid", "text": "Hello", "fontSize": 24 }}
{ "tool": "animation_manage", "arguments": { "action": "play", "nodeUuid": "uuid", "clipName": "run", "loop": true }}
{ "tool": "script_manage",   "arguments": { "action": "attach", "nodeUuid": "uuid", "scriptPath": "db://assets/scripts/Player.ts" }}
{ "tool": "prefab_browse",   "arguments": { "action": "instantiate", "prefabPath": "db://assets/prefabs/Enemy.prefab", "parentUuid": "uuid" }}
```

## 配置

面板中可配置：

| 项 | 默认值 | 说明 |
|----|--------|------|
| 端口 | 3000 | HTTP 监听端口 |
| 自动启动 | 关闭 | 编辑器启动时自动开启服务器 |
| 调试日志 | 关闭 | 输出详细 MCP 通信日志 |
| 允许来源 | `*` | CORS 来源限制 |
| 最大连接数 | 5 | 同时连接的 AI 客户端数 |

## 项目结构

```
source/
├── main.ts                  # 扩展入口
├── mcp-server.ts            # HTTP + MCP 协议服务
├── settings.ts              # 配置持久化（async fs）
├── scene.ts                 # 场景脚本（引擎上下文）
├── types/index.ts           # 共享类型 + VERSION
├── panels/default/          # 编辑器面板（Vue 3）
└── tools/
    ├── index.ts             # 工具注册表
    ├── unified-tool-base.ts # 抽象基类
    └── *.ts                 # 20 个工具文件
```

## 添加新工具

1. 创建 `source/tools/my-tool.ts`，继承 `UnifiedToolBase`
2. 在 `source/tools/index.ts` 的 `TOOL_CLASSES` 数组中注册
3. `npm run build` — 工具自动注册到 MCP `tools/list`

详见 [CLAUDE.md](./CLAUDE.md) 中的"添加新工具"章节。

## 常见问题

**Q: AI 连不上服务器？**
检查编辑器面板中服务器状态是否为 running，端口是否被占用。

**Q: 操作报权限错误？**
确保场景已保存且未被其他进程锁定。


## 环境

- Cocos Creator ≥ 3.8.6
- TypeScript 5.x（开发依赖）

## License

MIT
