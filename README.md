# AI Tool Model Registry Manager (cmrm)

[中文文档](README.zh-CN.md) | English

A CLI tool that manages AI tool model configurations, allowing you to quickly switch between different models for Claude CLI tool.

## Purpose

This tool provides a convenient way to **manage Claude CLI model configurations**. It allows you to save multiple model configurations, switch between them seamlessly, and view detailed model information - all without manually editing configuration files.

## Features

- 🔄 **Claude support** - Full support for Claude CLI model configuration
- 📦 **Backup mechanism** - Automatic backup before each config write
- 🔀 **Merge strategy** - Preserve existing config fields, only update model-related fields
- 🔢 **Index-based selection** - Input numbers to select, Enter to confirm
- ↩️ **Navigation options** - Return to previous level or exit directly
- ➕ **Add models** - Interactive field-by-field input with validation
- 📋 **View all configurations** - Grouped display by tool
- ℹ️ **View model details** - Display full config in JSON format
- 🔍 **Current model status** - Show active model
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
| `/add` | Add a new model configuration interactively |
| `/remove` | Remove a saved model configuration |
| `/info` | View detailed model configuration in JSON format |
| `/list` | Display all saved model configurations |
| `/current` | Display the currently configured model |
| `/exit` | Exit the CLI |

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
[4] /list           显示所有模型配置
[5] /current        显示当前模型
[6] /exit           退出程序
请输入命令索引: 0
```

### Adding New Models

Use `/add` command to enter configuration fields:

- **Config name** (optional) - Friendly name for this config
- **Model name** (required) - e.g., `claude-sonnet-4-5`
- **API Key** (required)
- **Base URL** (required) - e.g., `https://api.anthropic.com`
- **Haiku model** (optional)
- **Sonnet model** (optional)
- **Opus model** (optional)

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
  "haikuModel": "claude-haiku-4",
  "sonnetModel": "claude-sonnet-4"
}
```

## Configuration Files

| Tool | Config Path | Format | Description |
|------|-------------|--------|-------------|
| Claude | `~/.claude/settings.json` | JSON | Settings and model config |
| cmrm storage | `~/.cmrm/settings.json` | JSON | Saved model configurations |

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
