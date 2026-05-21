# AI 工具配置注册管理器 (cmrm)

中文 | [English](README.md)

一个用于管理 AI 工具配置的命令行工具，可以快速切换 Claude CLI 的模型配置，以及 Codex 的 `provider/model` profile。

## 项目意图

这个工具提供了一种便捷的方式来管理多种 AI CLI 工具的配置。你可以保存多个 Claude 模型配置和 Codex profile，在它们之间快速切换、测试连通性、查看详细信息，而无需手动编辑配置文件。

## 功能特性

- 🔄 **多工具支持** - 同时管理 Claude CLI 配置与 Codex profile
- 🌏 **多语言支持** - 中文（zh）、英文（en）、日文（ja），自动地理位置检测切换
- 🌍 **语言切换** - 使用 `/set-lang` 命令手动切换界面语言
- 📝 **提供商模板** - 9 个内置 OpenAI 兼容提供商模板，自动填充 model/baseUrl，仅需输入 API Key
- 📦 **备份机制** - 每次配置写入前自动备份
- 🔀 **合并策略** - 保留现有配置字段，仅更新模型相关字段
- 🔢 **索引选择** - 输入数字进行选择，Enter 确认
- ↩️ **导航选项** - 可返回上一级或直接退出
- ➕ **添加配置** - 支持基于模板添加或自定义逐字段输入，自动验证
- 📋 **查看所有配置** - 按工具分组显示
- ℹ️ **查看配置详情** - 以 JSON 格式显示完整配置
- 🔍 **当前配置状态** - 按工具显示当前生效配置/profile
- 🧪 **连接测试** - 通过实际 HTTP 请求验证配置，支持重试机制
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

要添加配置，请使用 `/add` 命令（详见下方使用方法）。

## 使用方法

启动 CLI：

```bash
cmrm
```

### 命令说明

| 命令 | 功能 |
|------|------|
| `/switch` | 切换到已保存的 Claude 配置或 Codex profile |
| `/add` | 交互式添加新配置（保存前自动测试） |
| `/edit` | 编辑已保存配置的模型名称和 API Key |
| `/remove` | 删除已保存的配置 |
| `/info` | 以 JSON 格式查看配置详情 |
| `/test` | 测试配置是否可用（已保存或自定义，支持重试） |
| `/alias` | 管理配置别名（添加 / 删除 / 列出） |
| `/list` | 显示所有已保存的配置 |
| `/current` | 显示当前生效的配置/profile |
| `/set-lang` | 切换界面语言（zh/en/ja） |
| `/exit` | 退出程序 |

### CLI 快捷方式

不进入交互菜单,可直接使用以下一行式命令完成常用操作:

| 快捷方式 | 功能 |
|---------|------|
| `cmrm switch <name>` | 快速切换到已保存配置/profile |
| `cmrm edit <name>` | 直接编辑已保存配置/profile 的模型名称和 API Key |
| `cmrm test <name>` | 快速测试已保存配置/profile 的连通性 |
| `cmrm alias <name> <new-alias>` | 为配置/profile 添加全局唯一别名 |
| `cmrm <tool> import <file>` | 从文件导入 Claude 或 Codex 配置 |
| `cmrm set-lang <zh/en/ja>` | 直接设置界面语言 |
| `cmrm --help` / `-h` | 查看帮助 |

`<name>` 在所有工具里都是整体唯一的。其规范形式为：Claude 使用 `model`，Codex 使用 `provider/model`。快捷命令的匹配顺序为：规范 `name` → 历史自定义名称（仅旧数据兼容）→ `aliases` → `model`。别名同样跨配置 / 跨工具全局唯一。

`cmrm edit <name>` 命中后，会以当前值作为默认值，只允许编辑模型名称和 API Key；其他字段如 Codex 的 `provider`、`baseUrl`、`modelReasoningEffort`、`disableResponseStorage` 会保持不变。

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

[0] /switch        切换配置/profile
[1] /add           添加新配置
[2] /edit          编辑已保存配置
[3] /remove        删除配置
[4] /info          查看配置详情
[5] /test          测试配置是否可用
[6] /list          显示所有配置
[7] /current       显示当前配置
[8] /exit          退出程序
请输入命令索引: 0
```

### 添加新配置

使用 `/add` 命令，首先选择添加方式：

1. **基于模板添加**（推荐，主要用于 Claude / OpenAI 兼容配置）- 从 9 个内置提供商模板中选择：
   - DeepSeek、智谱 AI（bigmodel/Z.AI）、Kimi、Minimax（国内/国际）、OpenRouter、小米 MiMo、通义千问
   - 模板自动预填 `model`、`baseUrl`、`apiType` 及可选模型
   - 仅需输入你的 **API Key**

2. **自定义添加** - 手动输入所有字段：
   - **配置名称**（可选）- 配置的友好名称
   - **API 类型**（必选）- `anthropic` 或 `openai`，默认 `anthropic`
   - **模型名称**（必填）
   - **API Key**（必填）
   - **Base URL**（必填）
   - **Haiku/Sonnet/Opus 模型**（可选）

对于 Codex 自定义添加：

- `provider` 为必填，并参与规范 profile 标识
- 主 `name` 始终保存为规范名：Claude 为 `model`，Codex 为 `provider/model`
- 添加时输入的可选“配置名称”现在会保存为额外 alias，而不是覆盖主 `name`
- 例如：`uino/gpt-5.4`

> 💡 配置完成后，cmrm 会自动发起 ping 请求验证配置可用性。如果测试失败，会询问是否仍然保存。

### 模型模板

模板存储在 `~/.cmrm/templates.json` 中，支持**热更新**——直接编辑文件即可生效，无需重启。

- **首次启动**：自动从 GitHub Raw 拉取最新模板；离线时回退到内置默认
- **自定义模板**：编辑 `~/.cmrm/templates.json` 添加你自己的提供商
- **刷新模板**：删除 `~/.cmrm/templates.json` 后重启即可重新从远程拉取

### 测试配置

使用 `/test` 命令验证配置是否可用：

1. 选择工具（如 Claude 或 Codex）
2. 选择测试场景：
   - **测试已保存配置/profile** - 选择已存在的配置进行测试
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

### 切换配置

使用 `/switch` 命令：
1. 选择工具（如 Claude 或 Codex）
2. 输入要切换的配置/profile 索引号
3. cmrm 会写入对应工具的配置文件

Codex 补充说明：

- Codex 保存和切换的是 profile，而不是单独的裸模型名
- 其有效身份是 `provider + model`
- 例如：
  - `openrouter/gpt-5.4`
  - `uino/gpt-5.4`

### 查看配置详情

使用 `/info` 命令：
1. 选择工具
2. 选择配置/profile
3. 以 JSON 格式查看完整配置

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
| Claude | `~/.claude/settings.json` | JSON | 设置和当前模型配置 |
| Codex | `~/.codex/config.toml` | TOML | 当前 provider/model profile |
| Codex 密钥 | `~/.codex/auth.json` | JSON | Codex API Key 存储 |
| cmrm 存储 | `~/.cmrm/settings.json` | JSON | 保存的 Claude 配置和 Codex profile |
| cmrm 模板 | `~/.cmrm/templates.json` | JSON | 提供商模板（支持热更新） |

### Claude 配置说明

- ✅ 完全支持模型切换
- 配置持久化保存在 `settings.json`
- 切换后的模型将成为新会话的默认模型

### Codex 配置说明

- ✅ 完全支持 provider/model profile 切换
- 当前 profile 写入 `~/.codex/config.toml`
- API Key 同步写入 `~/.codex/auth.json`
- 默认保存身份始终是规范的 `provider/model`
- `/add` 只会把 profile 保存到 `~/.cmrm/settings.json`
- `/switch` 在 Codex 已存在 provider 时，不会主动修改这个运行时 provider
- 切换时会更新 `model`、`model_reasoning_effort`、顶级 `openai_base_url`、该 provider 对应的 `base_url`，以及 `auth.json`
- 只有当 Codex 还没有任何 provider 时，cmrm 才会补一个 `custom-openai` provider，并写入 `openai_base_url`

## 备份文件

写入配置前会自动创建备份：

- Claude 配置备份位于 `~/.claude/.cmrm/`
- cmrm 存储会在 `~/.cmrm/settings.json` 同目录生成 `settings.json.backup.YYYYMMDDNN`
- Codex 在 `config.toml` 已存在时也会创建备份

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

### 0.2.4
- 🆕 新增 `/edit` 交互命令和 `cmrm edit <name>` 快捷方式，可编辑已保存配置/profile
- 🔧 Codex 在新增、导入和运行时缺省 provider 场景统一回退为 `custom-openai`
- 🐛 修复 `cmrm edit <name>` 取消保存时仍返回成功退出码的问题
- 🔐 修复编辑流程明文显示已保存 API Key，并让 `/edit` 的退出走统一 CLI 退出路径
- 📝 同步帮助文案、快捷横幅、README 和 i18n，统一配置/profile 语义

### 0.2.3
- 🆕 完整支持 Codex：可保存 / 切换 / 测试 / 导入 Codex profile
- 🆕 新增 `cmrm <tool> import <file>` 快捷方式，支持 Claude / Codex 配置导入
- 🆕 统一规范名体系：Claude 使用 `model`，Codex 使用 `provider/model`
- 🐛 修复 Codex 运行态切换语义：保留现有 provider，同步 `openai_base_url`、provider `base_url` 与 `auth.json`
- 🐛 `/current` 对 Codex 区分运行态与已保存身份，避免混淆
- 🐛 修复 Windows 下配置不适配的问题

### 0.2.2
- 🆕 `cmrm set-lang <zh|en|ja>` 快捷方式，直接设置语言
- 📦 `settings.json` 每次写入自动备份，格式 `settings.json.backup.YYYYMMDDNN`
- ⚡ 单工具时跳过「选工具」步骤，直接选择模型
- 🏷️ 模型选择菜单显示工具名后缀，提升辨识
- 🆕 `cmrm --version` / `-v` 查看版本号
- 🐛 修复首次运行无配置文件时 Fatal error，降级为默认中文
- 🐛 修复模块级 `t()` 调用在初始化前执行导致显示 raw key

### 0.2.1
- 🌏 新增多语言支持（zh/en/ja），自动地理位置检测切换语言
- 🌍 新增 `/set-lang` 命令，支持手动切换界面语言
- 🔄 新增测试重试机制（默认 3 次，可通过 `settings.retry` 配置）
- 📝 所有 UI 文本迁移至 i18n 系统，移除硬编码字符串

### 0.2.0
- 📝 新增模型模板功能：9 个内置提供商模板，`/add` 支持基于模板添加或自定义添加
- 📝 模板配置文件 `~/.cmrm/templates.json` 支持热更新，首次启动自动从 GitHub Raw 拉取
- 📝 模板字段自动预填（model、baseUrl、apiType），仅需输入 API Key
- 📝 抽离 `TemplateManager`、`TemplateFetcher`、`IndexPrompt`、`TemplateAddHandler` 模块

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
