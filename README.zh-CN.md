# AI 工具模型注册管理器 (cmrm)

中文 | [English](README.md)

一个用于解放 AI 工具模型注册管理的命令行工具，可以快速切换不同 AI 工具（如 Claude、OpenCode 等）的模型配置。

## 项目意图

这个插件的目的是**解放 AI 工具的模型注册管理**。它提供了一种便捷的方式来管理多个 AI 工具（Claude、OpenCode 等）的模型配置，并在它们之间无缝切换，无需手动编辑配置文件。

**核心原则**：不同 AI 工具的配置文件位置和格式各不相同——本工具通过统一的适配器架构来处理所有这些差异。

## 功能特性

- 🔄 **多工具支持** - 支持 Claude 和 OpenCode，可扩展更多 AI 工具
- 📦 **备份机制** - 每次配置写入前自动备份
- 🔀 **合并策略** - 保留现有配置字段，仅更新模型相关字段
- 🎯 **交互式选择** - 两步流程：选择工具 → 选择模型
- ⌨️ **键盘导航** - 方向键选择，Enter 确认，Esc 取消
- 📝 **交互式添加** - 逐字段输入，自动验证
- 📋 **查看所有配置** - 按工具分组显示
- 🔍 **当前模型状态** - 显示各工具当前生效的模型
- 💡 **智能提示** - 未知命令时推荐相似命令

## 安装

```bash
npm install -g cmrm
# 或者
npm link
```

## 快速开始

首次运行 `cmrm` 时，它会自动在 `~/.cmrm/settings.json` 创建配置文件。

要添加模型配置，请使用 `/add-model` 命令（详见下方使用方法）。

## 使用方法

启动 CLI：

```bash
cmrm
```

### 命令说明

| 命令 | 功能 |
|------|------|
| `/switch-model` | 切换模型（选工具→选模型） |
| `/add-model` | 交互式添加新模型配置 |
| `/list` | 显示所有已保存的模型配置 |
| `/current` | 显示所有工具当前生效的模型 |
| `/` | 显示可用命令列表 |
| `/exit` 或 `exit` | 退出程序 |

### 切换模型

使用 `/switch-model` 命令：

1. **第一步**：选择工具（Claude 或 OpenCode）
   - 使用 `↑`/`↓` 方向键导航
   - 按 `Enter` 键选择
   - 按 `Esc` 键取消

2. **第二步**：选择保存的模型配置
   - 方向键导航
   - 按 `Enter` 键切换
   - 按 `Esc` 键取消

选中配置将：
- 合并写入工具配置文件（保留现有字段）
- 在 `{配置目录}/.cmrm/` 目录创建备份

### 添加新模型

使用 `/add-model` 命令：

1. 选择工具（Claude 或 OpenCode）
2. 输入配置字段：

**Claude 字段：**
- **模型名称**（必填）- 如 `claude-sonnet-4-5-20250514`
- **API Key**（必填）
- **Base URL**（必填）- 如 `https://api.anthropic.com`
- **Haiku 模型**（可选）
- **Sonnet 模型**（可选）
- **Opus 模型**（可选）
- **配置名称**（可选，不填则使用模型名称自动生成）

**OpenCode 字段：**
- **模型名称**（必填）- 如 `MiniMax-M2.7-highspeed`
- **Provider**（必填）- 选择支持的提供商：
  - **国外**：openai, anthropic, openrouter, deepseek, google
  - **国内**：zhipu（智谱GLM）、minimax、moonshot（月之暗面）、alibaba（阿里通义）、baidu（百度文心）
- **API Key**（必填）
- **Base URL**（必填，根据 Provider 选择自动填充）
- **配置名称**（可选，不填则使用模型名称自动生成）

> ⚠️ **OpenCode 限制**：切换后模型不会自动生效。需要在 OpenCode TUI 中手动选择，或使用 `opencode -m provider/model-name` 参数。

### 查看所有模型

使用 `/list` 命令查看按工具分组的所有保存配置。

### 查看当前模型

使用 `/current` 命令查看各工具当前生效的模型。

## 配置文件位置

| 工具 | 配置路径 | 格式 | 说明 |
|------|----------|------|------|
| Claude | `~/.claude/settings.json` | JSON | 设置和模型配置 |
| OpenCode | `~/.local/share/opencode/auth.json` | JSON | Provider API keys |
| cmrm 存储 | `~/.cmrm/settings.json` | JSON | 保存的模型配置 |

### 工具特殊说明

#### Claude
- ✅ 完全支持模型切换
- 配置持久化保存在 `settings.json`
- 切换后的模型将成为新会话的默认模型

#### OpenCode
- ⚠️ **重要**：OpenCode **不支持持久化默认模型**
- `auth.json` 存储不同 provider 的 API keys
- 模型选择记录在每个 session 中，而非全局
- **切换后**：需要在 OpenCode TUI 中手动选择模型，或使用 CLI 参数：
  ```bash
  opencode -m minimax/MiniMax-M2.7-highspeed
  ```
- 添加模型会在 `auth.json` 创建新的 provider 条目，使其出现在 OpenCode 的模型列表中

## 备份文件

备份文件存储在 `{配置目录}/.cmrm/` 目录：
- Claude 备份命名：`{文件名}_{YYYYMMDD}{序号}`
  - 示例：`settings.json_2026042700`、`settings.json_2026042701`
- OpenCode 备份命名：`auth-{YYYYMMDDHHmm}.json`
  - 示例：`auth-202604272030.json`（简洁时间戳格式）

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 运行测试
npm run test

# 开发模式运行
npm run dev

# 启动 CLI
npm start
```

## 更新日志

### 0.0.2
- 🔄 多工具支持（Claude、OpenCode）
- 📦 配置写入前备份机制
- 🔀 合并策略保留现有字段
- 🎯 两步选择流程（工具→模型）
- ✅ 命令重命名：`/model` → `/switch-model`，`/input` → `/add-model`
- 🧪 Vitest 测试覆盖

### 0.0.1
- 初始版本发布
- 支持 Claude 模型切换
- 交互式模型配置
- 中英文双语命令描述

## 许可证

MIT

## 作者

lvdaxianerplus