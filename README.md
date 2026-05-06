# AI Tool Model Registry Manager (cmrm)

[中文文档](README.zh-CN.md) | English

A CLI tool that manages AI tool model configurations, allowing you to quickly switch between different models for Claude CLI tool.

## Purpose

This tool provides a convenient way to **manage Claude CLI model configurations**. It allows you to save multiple model configurations, switch between them seamlessly, and view detailed model information - all without manually editing configuration files.

## Features

- 🔄 **Claude support** - Full support for Claude CLI model configuration
- 🌏 **Multi-language support** - Chinese (zh), English (en), Japanese (ja) with auto geo-detection
- 🌍 **Language switching** - Use `/set-lang` command to switch language manually
- 📝 **Model templates** - 9 built-in provider templates, auto-fill model/baseUrl, only API Key needed
- 📦 **Backup mechanism** - Automatic backup before each config write
- 🔀 **Merge strategy** - Preserve existing config fields, only update model-related fields
- 🔢 **Index-based selection** - Input numbers to select, Enter to confirm
- ↩️ **Navigation options** - Return to previous level or exit directly
- ➕ **Add models** - Template-based or custom field-by-field input with validation
- 📋 **View all configurations** - Grouped display by tool
- ℹ️ **View model details** - Display full config in JSON format
- 🔍 **Current model status** - Show active model
- 🧪 **Connection testing** - Verify model configuration via real HTTP request with retry
- 🌐 **Multi-protocol support** - Compatible with both Anthropic Messages and OpenAI Chat Completions
- 💡 **Smart suggestions** - Recommend similar commands for unknown inputs

## Installation

```bash
npm install -g cmrm
# or
npm link
```

## Getting Started

The first time you run `cmrm`, it will automatically create a configuration file at `~/.cmrm/settings.json`.

To add model configurations, use the `/add` command (see Usage section below).

## Usage

Start the CLI:

```bash
cmrm
```

### Commands

| Command | Description |
|---------|-------------|
| `/switch` | Switch to a saved model configuration |
| `/add` | Add a new model configuration interactively (auto-tests before saving) |
| `/remove` | Remove a saved model configuration |
| `/info` | View detailed model configuration in JSON format |
| `/test` | Test if a model configuration works (saved or custom, with retry) |
| `/alias` | Manage model aliases (add/remove/list) |
| `/list` | Display all saved model configurations |
| `/current` | Display the currently configured model |
| `/set-lang` | Switch interface language (zh/en/ja) |
| `/exit` | Exit the CLI |

### CLI Shortcuts

For one-line workflows, the following arguments are accepted directly without entering the interactive menu:

| Shortcut | Description |
|----------|-------------|
| `cmrm switch <name>` | Quickly switch to a saved model |
| `cmrm test <name>` | Quickly test a saved model's connectivity |
| `cmrm alias <model> <new-alias>` | Add a globally-unique alias to a model |
| `cmrm set-lang <zh/en/ja>` | Set interface language directly |
| `cmrm --help` / `-h` | Show help |

`<name>` is matched in three tiers: `name` → `aliases` → `model` (first hit wins). Aliases are globally unique across all models and tools — conflicts are rejected with a clear error.

### Interactive Selection

All selections use **index-based input**:

1. Enter the number shown in brackets `[0]`, `[1]`, etc.
2. Press `Enter` to confirm
3. Most menus include:
   - `[n-2]` Return to previous level
   - `[n-1]` Exit directly

Example:
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

### Adding New Models

Use `/add` command. You'll first choose between two modes:

1. **Template-based** (recommended) - Select from 9 built-in provider templates:
   - DeepSeek, Zhipu AI (bigmodel/Z.AI), Kimi, Minimax (CN/Intl), OpenRouter, Xiaomi MiMo, Alibaba Qwen
   - Template pre-fills `model`, `baseUrl`, `apiType`, and optional models
   - You only need to enter your **API Key**

2. **Custom** - Enter all fields manually:
   - **Config name** (optional) - Friendly name for this config
   - **API type** (required) - `anthropic` or `openai`, defaults to `anthropic`
   - **Model name** (required)
   - **API Key** (required)
   - **Base URL** (required)
   - **Haiku/Sonnet/Opus model** (optional)

> 💡 After entering the configuration, cmrm will send a ping request to verify it. If the test fails, you'll be asked whether to save it anyway.

### Model Templates

Templates are stored in `~/.cmrm/templates.json` and support **hot-reload** - edit the file and changes take effect immediately without restarting.

- **First launch**: Automatically fetches the latest templates from GitHub Raw; falls back to built-in defaults if offline
- **Custom templates**: Edit `~/.cmrm/templates.json` to add your own providers
- **Refresh**: Delete `~/.cmrm/templates.json` and restart to re-fetch from remote

### Testing Model Configurations

Use `/test` command to verify a configuration:

1. Select a tool (e.g., Claude)
2. Choose a test scenario:
   - **Test saved model** - Pick from existing configurations
   - **Custom parameters** - Enter parameters ad-hoc without saving

Error classifications:

| Error kind | Description |
|------------|-------------|
| `auth` | Authentication failure (401/403), usually wrong API key |
| `not_found` | Model not found (404) |
| `rate_limit` | Rate limit exceeded (429) |
| `server` | Server error (5xx) |
| `network` | Network error (ECONNREFUSED/ENOTFOUND, usually wrong baseUrl) |
| `timeout` | Request timeout (10s by default) |
| `invalid_response` | Response format invalid |

### API Types

cmrm supports two API protocol formats:

- **anthropic** (default) - Claude Messages API format
  - Path: `/v1/messages`
  - Auth header: `x-api-key: <key>`
  - For official Claude API and Anthropic-compatible proxies

- **openai** - OpenAI Chat Completions format
  - Path: `/v1/chat/completions`
  - Auth header: `Authorization: Bearer <key>`
  - For OpenRouter, DeepSeek, Together, and other OpenAI-compatible proxies

### Switching Models

Use `/switch` command:
1. Select a tool (e.g., Claude)
2. Enter the index number of the model to switch to
3. The configuration will be merged into Claude's config file

### Viewing Model Details

Use `/info` command:
1. Select a tool
2. Select a model
3. View the complete model configuration in JSON format

Example output:
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

## Configuration Files

| Tool | Config Path | Format | Description |
|------|-------------|--------|-------------|
| Claude | `~/.claude/settings.json` | JSON | Settings and model config |
| cmrm storage | `~/.cmrm/settings.json` | JSON | Saved model configurations |
| cmrm templates | `~/.cmrm/templates.json` | JSON | Model provider templates (hot-reloadable) |

### Claude Configuration

- ✅ Full support for model switching
- Configuration is persisted in `settings.json`
- Switched model becomes the default for new sessions

## Backup Files

Backups are stored in `~/.claude/.cmrm/` directory:
- Backup naming: `{filename}_{YYYYMMDD}{seq}`
  - Example: `settings.json_2026042700`, `settings.json_2026042701`

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm run test

# Run in development mode
npm run dev

# Start the CLI
npm start
```

## Changelog

### 0.2.2
- 🆕 `cmrm set-lang <zh|en/ja>` shortcut to set language without interactive menu
- 📦 Auto-backup `settings.json` on every write with format `settings.json.backup.YYYYMMDDNN`
- ⚡ Skip tool selection when only one adapter is registered
- 🏷️ Show tool name suffix in model selection menu for clarity
- 🆕 `cmrm --version` / `-v` to display version number
- 🐛 Fix Fatal error on first run when settings.json is missing
- 🐛 Fix module-level `t()` calls resolving before i18n initialization

### 0.2.1
- 🌏 Add multi-language support (zh/en/ja) with geo-detection auto-switch
- 🌍 Add `/set-lang` command for manual language switching
- 🔄 Add test retry mechanism (3 retries by default, configurable via `settings.retry`)
- 📝 Migrate all UI text to i18n system, remove hardcoded strings

### 0.2.0
- 📝 Add model templates: 9 built-in provider templates, `/add` supports template-based or custom adding
- 📝 Templates hot-reload from `~/.cmrm/templates.json`, auto-fetch from GitHub Raw on first launch
- 📝 Template fields auto-filled (model, baseUrl, apiType), only API Key required
- 📝 Extract `TemplateManager`, `TemplateFetcher`, `IndexPrompt`, `TemplateAddHandler` modules

### 0.1.0
- ✨ Add model multi-aliases management: `UnifiedModelConfig.aliases?: string[]`, globally unique across tools/models
- ✨ Add `/alias` interactive command (add / remove / list aliases)
- ✨ Add `cmrm alias <model> <new-alias>` CLI shortcut
- 🔍 `findModelByName` extends two-tier lookup to three: `name` → `aliases` → `model`, enabling `cmrm switch <alias>`
- 🧪 Add `/test` command to test saved or custom model configurations
- 🌐 Add OpenAI Chat Completions API support (in addition to Anthropic)
- ✨ `/add` now asks for API type and auto-tests the configuration before saving
- 🔐 Sanitize error output to prevent API key leakage during testing

### 0.0.2
- ✨ Add `/info` command to view model details in JSON format
- ↩️ Add "return to previous level" and "exit" options in selection menus
- 🔢 Switch to index-based selection (input numbers instead of arrow keys)
- 🔄 Simplified architecture (single-tool focus - Claude only)
- ✅ Command rename: `/switch-model` → `/switch`, `/add-model` → `/add`
- ✅ Add `/remove` command to delete saved configurations
- 📦 Backup mechanism before config writes
- 🔀 Merge strategy preserving existing fields

### 0.0.1
- Initial release
- Support for Claude model switching
- Interactive model configuration
- Bilingual command descriptions

## License

MIT

## Author

lvdaxianerplus
