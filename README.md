# AI Tool Model Registry Manager (cmrm)

[中文文档](README.zh-CN.md) | English

A CLI tool that liberates AI tool model registry management, allowing you to quickly switch between different models for various AI tools like Claude, OpenCode, and more.

## Purpose

This plugin is designed to **liberate AI tool model registry management**. It provides a convenient way to manage multiple model configurations across different AI tools (Claude, OpenCode, etc.) and switch between them seamlessly, without manually editing configuration files.

**Key principle**: Different AI tools have different configuration file locations and formats - this tool handles them all through a unified adapter architecture.

## Features

- 🔄 **Multi-tool support** - Support Claude and OpenCode, extensible to more AI tools
- 📦 **Backup mechanism** - Automatic backup before each config write
- 🔀 **Merge strategy** - Preserve existing config fields, only update model-related fields
- 🎯 **Interactive selection** - Two-step flow: select tool → select model
- ⌨️ **Keyboard navigation** - Arrow keys for selection, Enter to confirm, Esc to cancel
- 📝 **Add models interactively** - Field-by-field input with validation
- 📋 **View all configurations** - Grouped display by tool
- 🔍 **Current model status** - Show active model for each tool
- 💡 **Smart suggestions** - Recommend similar commands for unknown inputs

## Installation

```bash
npm install -g cmrm
# or
npm link
```

## Getting Started

The first time you run `cmrm`, it will automatically create a configuration file at `~/.cmrm/settings.json`.

To add model configurations, use the `/add-model` command (see Usage section below).

## Usage

Start the CLI:

```bash
cmrm
```

### Commands

| Command | Description |
|---------|-------------|
| `/switch-model` | Switch model (select tool → select model) |
| `/add-model` | Add a new model configuration interactively |
| `/list` | Display all saved model configurations |
| `/current` | Display the currently configured model for each tool |
| `/` | Show available commands |
| `/exit` or `exit` | Exit the CLI |

### Switching Models

Use `/switch-model` command:

1. **Step 1**: Select tool (Claude or OpenCode)
   - Use `↑`/`↓` arrow keys to navigate
   - Press `Enter` to select
   - Press `Esc` to cancel

2. **Step 2**: Select saved model configuration
   - Navigate with arrow keys
   - Press `Enter` to switch
   - Press `Esc` to cancel

The selected configuration will be:
- Merged into the tool's config file (preserving existing fields)
- Backup created in `{config-dir}/.cmrm/` directory

### Adding New Models

Use `/add-model` command:

1. Select tool (Claude or OpenCode)
2. Enter configuration fields:

**Claude fields:**
- **Model name** (required) - e.g., `claude-sonnet-4-5-20250514`
- **API Key** (required)
- **Base URL** (required) - e.g., `https://api.anthropic.com`
- **Haiku model** (optional)
- **Sonnet model** (optional)
- **Opus model** (optional)
- **Config name** (optional, auto-generated if empty)

**OpenCode fields:**
- **Model name** (required)
- **Provider** (required) - Choose from: openai, anthropic, openrouter, deepseek, google
- **API Key** (required)
- **Base URL** (required, auto-filled based on provider)
- **Config name** (optional, auto-generated if empty)

### Viewing All Models

Use `/list` command to see all saved configurations grouped by tool.

### Viewing Current Models

Use `/current` command to see the active model for each tool.

## Configuration Files

| Tool | Config Path | Format |
|------|-------------|--------|
| Claude | `~/.claude/settings.json` | JSON |
| OpenCode | `~/.config/opencode/config.toml` | TOML |
| cmrm storage | `~/.cmrm/settings.json` | JSON |

## Backup Files

Backups are stored in `{config-dir}/.cmrm/` directory:
- Naming format: `{filename}_{YYYYMMDD}{seq}`
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
- 🔄 Multi-tool support (Claude, OpenCode)
- 📦 Backup mechanism before config writes
- 🔀 Merge strategy preserving existing fields
- 🎯 Two-step selection flow (tool → model)
- ✅ Command rename: `/model` → `/switch-model`, `/input` → `/add-model`
- 🧪 Test coverage with Vitest

### 0.0.1
- Initial release
- Support for Claude model switching
- Interactive model configuration
- Bilingual command descriptions

## License

MIT

## Author

lvdaxianerplus