# AI 工具模型注册管理器 (cmrm)

中文 | [English](README.md)

一个用于管理 AI 工具模型配置的命令行工具，可以快速切换 Claude CLI 工具的模型配置。

## 项目意图

这个工具提供了一种便捷的方式来**管理 Claude CLI 的模型配置**。它允许你保存多个模型配置、在它们之间快速切换、查看详细的模型信息——无需手动编辑配置文件。

## 功能特性

- 🔄 **Claude 支持** - 完全支持 Claude CLI 模型配置
- 📦 **备份机制** - 每次配置写入前自动备份
- 🔀 **合并策略** - 保留现有配置字段，仅更新模型相关字段
- 🔢 **索引选择** - 输入数字进行选择，Enter 确认
- ↩️ **导航选项** - 可返回上一级或直接退出
- ➕ **添加模型** - 交互式逐字段输入，自动验证
- 📋 **查看所有配置** - 按工具分组显示
- ℹ️ **查看模型详情** - 以 JSON 格式显示完整配置
- 🔍 **当前模型状态** - 显示当前生效的模型
- 🧪 **连接测试** - 通过实际 HTTP 请求验证模型配置可用性
- 🌐 **多协议兼容** - 同时支持 Anthropic Messages 与 OpenAI Chat Completions API
- 💡 **智能提示** - 未知命令时推荐相似命令

## 安装

```bash
npm install -g cmrm
# 或者
npm link
```

## 快速开始

首次运行 `cmrm` 时，它会自动在 `~/.cmrm/settings.json` 创建配置文件。

要添加模型配置，请使用 `/add` 命令（详见下方使用方法）。

## 使用方法

启动 CLI：

```bash
cmrm
```

### 命令说明

| 命令 | 功能 |
|------|------|
| `/switch` | 切换到已保存的模型配置 |
| `/add` | 交互式添加新模型配置（保存前自动测试） |
| `/remove` | 删除已保存的模型配置 |
| `/info` | 以 JSON 格式查看模型详细信息 |
| `/test` | 测试模型配置是否可用（已保存或自定义） |
| `/alias` | 管理模型别名（添加 / 删除 / 列出） |
| `/list` | 显示所有已保存的模型配置 |
| `/current` | 显示当前生效的模型 |
| `/exit` | 退出程序 |

### CLI 快捷方式

不进入交互菜单,可直接使用以下一行式命令完成常用操作:

| 快捷方式 | 功能 |
|---------|------|
| `cmrm switch <name>` | 快速切换到已保存的模型 |
| `cmrm test <name>` | 快速测试已保存模型的连通性 |
| `cmrm alias <model> <new-alias>` | 为模型添加全局唯一的别名 |
| `cmrm --help` / `-h` | 查看帮助 |

`<name>` 按三级优先级匹配: `name` → `aliases` → `model`(首项命中即返回)。别名跨模型 / 跨工具全局唯一,冲突时直接拒绝并提示原因。

### 交互式选择

所有选择都使用**索引输入方式**：

1. 输入方括号中显示的数字 `[0]`、`[1]` 等
2. 按 Enter 确认
3. 大多数菜单包含：
   - `[n-2]` 返回上一级
   - `[n-1]` 直接退出

示例：
```
=== 选择命令 ===
(输入索引号按 Enter 确认)

[0] /switch        切换模型配置
[1] /add           添加新模型配置
[2] /remove         删除模型配置
[3] /info           查看模型详细信息
[4] /test           测试模型配置是否可用
[5] /list           显示所有模型配置
[6] /current        显示当前模型
[7] /exit           退出程序
请输入命令索引: 0
```

### 添加新模型

使用 `/add` 命令输入配置字段：

- **配置名称**（可选）- 配置的友好名称
- **API 类型**（必选）- `anthropic`（Claude Messages）或 `openai`（Chat Completions），默认 `anthropic`
- **模型名称**（必填）- 如 `claude-sonnet-4-5`
- **API Key**（必填）
- **Base URL**（必填）- 如 `https://api.anthropic.com`
- **Haiku 模型**（可选）
- **Sonnet 模型**（可选）
- **Opus 模型**（可选）

> 💡 配置完成后，cmrm 会自动发起 ping 请求验证配置可用性。如果测试失败，会询问是否仍然保存。

### 测试模型配置

使用 `/test` 命令验证配置是否可用：

1. 选择工具（如 Claude）
2. 选择测试场景：
   - **测试已保存的模型** - 选择已存在的配置进行测试
   - **自定义参数测试** - 临时输入参数测试，无需保存

测试结果分类：

| 错误类型 | 说明 |
|---------|------|
| `auth` | 认证失败（401/403），通常 API Key 错误 |
| `not_found` | 模型不存在（404） |
| `rate_limit` | 限流（429） |
| `server` | 服务器错误（5xx） |
| `network` | 网络错误（ECONNREFUSED/ENOTFOUND，通常 baseUrl 错误） |
| `timeout` | 请求超时（默认 10 秒） |
| `invalid_response` | 响应格式异常 |

### API 类型

cmrm 支持两种 API 协议格式：

- **anthropic**（默认）- Claude Messages API 格式
  - 路径：`/v1/messages`
  - 认证：`x-api-key: <key>`
  - 适用于官方 Claude API 及 Anthropic 兼容代理

- **openai** - OpenAI Chat Completions 格式
  - 路径：`/v1/chat/completions`
  - 认证：`Authorization: Bearer <key>`
  - 适用于 OpenRouter、DeepSeek、Together 等 OpenAI 兼容代理

### 切换模型

使用 `/switch` 命令：
1. 选择工具（如 Claude）
2. 输入要切换的模型索引号
3. 配置将合并写入 Claude 的配置文件

### 查看模型详情

使用 `/info` 命令：
1. 选择工具
2. 选择模型
3. 以 JSON 格式查看完整的模型配置

示例输出：
```json
{
  "name": "claude-sonnet",
  "model": "claude-sonnet-4-5",
  "apiKey": "sk-xxx...",
  "baseUrl": "https://api.anthropic.com",
  "apiType": "anthropic",
  "haikuModel": "claude-haiku-4",
  "sonnetModel": "claude-sonnet-4"
}
```

## 配置文件位置

| 工具 | 配置路径 | 格式 | 说明 |
|------|----------|------|------|
| Claude | `~/.claude/settings.json` | JSON | 设置和模型配置 |
| cmrm 存储 | `~/.cmrm/settings.json` | JSON | 保存的模型配置 |

### Claude 配置说明

- ✅ 完全支持模型切换
- 配置持久化保存在 `settings.json`
- 切换后的模型将成为新会话的默认模型

## 备份文件

备份文件存储在 `~/.claude/.cmrm/` 目录：
- 备份命名：`{文件名}_{YYYYMMDD}{序号}`
  - 示例：`settings.json_2026042700`、`settings.json_2026042701`

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

### 0.1.0
- ✨ 新增模型多别名管理:`UnifiedModelConfig.aliases?: string[]`,跨工具/跨模型全局唯一
- ✨ 新增 `/alias` 交互命令(添加/删除/列出别名)
- ✨ 新增 `cmrm alias <model> <new-alias>` CLI 快捷方式
- 🔍 `findModelByName` 由两级查找扩展为三级:`name` → `aliases` → `model`,支持 `cmrm switch <alias>` 直达
- 🧪 新增 `/test` 命令,支持测试已保存或自定义模型配置
- 🌐 新增 OpenAI Chat Completions API 协议兼容(除 Anthropic 外)
- ✨ `/add` 添加 API 类型选择,并在保存前自动测试配置
- 🔐 测试时错误信息脱敏,避免 API Key 泄漏

### 0.0.2
- ✨ 新增 `/info` 命令，以 JSON 格式查看模型详细信息
- ↩️ 选择菜单添加"返回上一级"和"直接退出"选项
- 🔢 改为索引选择方式（输入数字而非方向键）
- 🔄 简化架构（单一工具专注 - 仅 Claude）
- ✅ 命令重命名：`/switch-model` → `/switch`，`/add-model` → `/add`
- ✅ 新增 `/remove` 命令删除已保存的配置
- 📦 配置写入前备份机制
- 🔀 合并策略保留现有字段

### 0.0.1
- 初始版本发布
- 支持 Claude 模型切换
- 交互式模型配置
- 中英文双语命令描述

## 许可证

MIT

## 作者

lvdaxianerplus
