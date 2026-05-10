# AI Tool Config Registry Manager (cmrm)

[中文文档](README.zh-CN.md) | English

A CLI tool that manages AI tool configurations, allowing you to quickly switch between saved Claude model configs and Codex provider/model profiles.

## Purpose

This tool provides a convenient way to manage CLI configurations for multiple AI tools. It lets you save multiple Claude model configs and Codex profiles, switch between them, test connectivity, and inspect details without manually editing config files.

## Features

- 🔄 **Multi-tool support** - Manage both Claude CLI configs and Codex profiles
- 🌏 **Multi-language support** - Chinese (zh), English (en), Japanese (ja) with auto geo-detection
- 🌍 **Language switching** - Use `/set-lang` command to switch language manually
- 📝 **Provider templates** - 9 built-in OpenAI-compatible templates, auto-fill model/baseUrl, only API Key needed
- 📦 **Backup mechanism** - Automatic backup before each config write
- 🔀 **Merge strategy** - Preserve existing config fields, only update model-related fields
- 🔢 **Index-based selection** - Input numbers to select, Enter to confirm
- ↩️ **Navigation options** - Return to previous level or exit directly
- ➕ **Add configs** - Template-based or custom field-by-field input with validation
- 📋 **View all configurations** - Grouped display by tool
- ℹ️ **View config details** - Display full config in JSON format
- 🔍 **Current config status** - Show active config/profile per tool
- 🧪 **Connection testing** - Verify config via real HTTP request with retry
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

To add configurations, use the `/add` command (see Usage section below).

## Usage

Start the CLI:

```bash
cmrm
```

### Commands

| Command | Description |
|---------|-------------|
| `/switch` | Switch to a saved Claude model config or Codex profile |
| `/add` | Add a new configuration interactively (auto-tests before saving) |
| `/remove` | Remove a saved configuration |
| `/info` | View detailed configuration in JSON format |
| `/test` | Test if a configuration works (saved or custom, with retry) |
| `/alias` | Manage configuration aliases (add/remove/list) |
| `/list` | Display all saved configurations |
| `/current` | Display the currently configured config/profile |
| `/set-lang` | Switch interface language (zh/en/ja) |
| `/exit` | Exit the CLI |

### CLI Shortcuts

For one-line workflows, the following arguments are accepted directly without entering the interactive menu:

| Shortcut | Description |
|----------|-------------|
| `cmrm switch <name>` | Quickly switch to a saved config/profile |
| `cmrm test <name>` | Quickly test a saved config/profile |
| `cmrm alias <name> <new-alias>` | Add a globally-unique alias to a config/profile |
| `cmrm <tool> import <file>` | Import a config from a file into Claude or Codex storage |
| `cmrm set-lang <zh/en/ja>` | Set interface language directly |
| `cmrm --help` / `-h` | Show help |

`<name>` is globally unique across all tools. Its canonical form is `model` for Claude and `provider/model` for Codex. Shortcut matching follows: canonical `name` → legacy custom name (old data only) → `aliases` → `model`. Aliases are also globally unique across all configs and tools.

### Interactive Selection

All selections use **index-based input**:

1. Enter the number shown in brackets `[0]`, `[1]`, etc.
2. Press `Enter` to confirm
3. Most menus include:
   - `[n-2]` Return to previous level
   - `[n-1]` Exit directly

Example:
```
=== Select Command ===
(Enter index number to confirm)

[0] /switch        Switch saved config/profile
[1] /add           Add new config
[2] /remove        Remove saved config
[3] /info          View config details
[4] /test          Test configuration
[5] /list          Show all configs
[6] /current       Show current config
[7] /exit          Exit
Enter command index: 0
```

### Adding New Configurations

Use `/add` command. You'll first choose between two modes:

1. **Template-based** (recommended, Claude) - Select from 9 built-in provider templates:
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

For Codex custom add:

- `provider` is required and becomes part of the canonical profile identity
- The primary saved `name` is always canonical: Claude uses `model`, Codex uses `provider/model`
- The optional add prompt stores an extra alias, not a replacement primary name
- Example default name: `uino/gpt-5.4`

> 💡 After entering the configuration, cmrm will send a ping request to verify it. If the test fails, you'll be asked whether to save it anyway.

### Model Templates

Templates are stored in `~/.cmrm/templates.json` and support **hot-reload** - edit the file and changes take effect immediately without restarting.

- **First launch**: Automatically fetches the latest templates from GitHub Raw; falls back to built-in defaults if offline
- **Custom templates**: Edit `~/.cmrm/templates.json` to add your own providers
- **Refresh**: Delete `~/.cmrm/templates.json` and restart to re-fetch from remote

### Testing Configurations

Use `/test` command to verify a configuration:

1. Select a tool (e.g., Claude or Codex)
2. Choose a test scenario:
   - **Test saved config/profile** - Pick from existing configurations
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

### Switching Configurations

Use `/switch` command:
1. Select a tool (e.g., Claude or Codex)
2. Enter the index number of the config/profile to switch to
3. cmrm writes the corresponding tool config files

Codex note:

- Codex entries are treated as profiles, not just raw model names
- The effective identity is `provider + model`
- Example saved profile names:
  - `openrouter/gpt-5.4`
  - `uino/gpt-5.4`

### Viewing Configuration Details

Use `/info` command:
1. Select a tool
2. Select a config/profile
3. View the complete configuration in JSON format

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
| Claude | `~/.claude/settings.json` | JSON | Settings and active model config |
| Codex | `~/.codex/config.toml` | TOML | Active provider/model profile |
| Codex auth | `~/.codex/auth.json` | JSON | API key storage for Codex |
| cmrm storage | `~/.cmrm/settings.json` | JSON | Saved Claude configs and Codex profiles |
| cmrm templates | `~/.cmrm/templates.json` | JSON | Provider templates (hot-reloadable) |

### Claude Configuration

- ✅ Full support for model switching
- Configuration is persisted in `settings.json`
- Switched model becomes the default for new sessions

### Codex Configuration

- ✅ Full support for provider/model profile switching
- Active profile is written to `~/.codex/config.toml`
- API key is synced to `~/.codex/auth.json`
- Default saved identity is always canonical `provider/model`
- `/add` only stores profiles in `~/.cmrm/settings.json`
- `/switch` does not change the existing runtime provider in Codex when one already exists
- Switching updates `model`, `model_reasoning_effort`, top-level `openai_base_url`, that provider's `base_url`, and `auth.json`
- Only when Codex has no provider configured yet will cmrm create an `openai` provider and set `openai_base_url`

## Backup Files

Backups are created automatically before writes:

- Claude config backups are stored under `~/.claude/.cmrm/`
- cmrm storage backups use `settings.json.backup.YYYYMMDDNN` beside `~/.cmrm/settings.json`
- Codex config writes also create backups when `config.toml` already exists

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

### 0.2.3
- 🆕 Add full Codex support: save/switch/test/import Codex profiles
- 🆕 Add `cmrm <tool> import <file>` shortcut for Claude/Codex config import
- 🆕 Canonical name system: Claude uses `model`, Codex uses `provider/model`
- 🐛 Fix Codex runtime switching semantics: keep existing provider, sync `openai_base_url`, provider `base_url`, and `auth.json`
- 🐛 Clarify `/current` for Codex with runtime vs saved identity display
- 🐛 Fix Windows configuration compatibility issues

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
