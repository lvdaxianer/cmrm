# AI Tool Model Registry Manager (cmrm)

[中文文档](README.zh-CN.md) | English

A CLI tool that liberates AI tool model registry management, allowing you to quickly switch between different models for Claude CLI tool.

## Purpose

This plugin is designed to **liberate AI tool model registry management**. It provides a convenient way to manage multiple model configurations for Claude CLI tool and switch between them seamlessly, without manually editing configuration files.

## Features

- 🔄 **Claude support** - Full support for Claude CLI model configuration
- 📦 **Backup mechanism** - Automatic backup before each config write
- 🔀 **Merge strategy** - Preserve existing config fields, only update model-related fields
- ⌨️ **Keyboard navigation** - Arrow keys for selection, Enter to confirm, Esc to cancel
- 📝 **Add models interactively** - Field-by-field input with validation
- 📋 **View all configurations** - Grouped display
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

To add model configurations, use the `/add-model` command (see Usage section below).

## Usage

Start the CLI:

```bash
cmrm
```

### Commands

| Command | Description |
|---------|-------------|
| `/switch` | Switch model configuration |
| `/add` | Add a new model configuration interactively |
| `/remove` | Remove a saved model configuration |
| `/list` | Display all saved model configurations |
| `/current` | Display the currently configured model |
| `/` | Show available commands |
| `/exit` or `exit` | Exit the CLI |

### Switching Models

Use `/switch` command:
- Use `↑`/`↓` arrow keys to navigate
- Press `Enter` to select
- Press `Esc` to cancel

The selected configuration will be:
- Merged into Claude's config file (preserving existing fields)
- Backup created in `~/.claude/.cmrm/` directory

### Adding New Models

Use `/add` command to enter configuration fields:

- **Model name** (required) - e.g., `claude-sonnet-4-5-20250514`
- **API Key** (required)
- **Base URL** (required) - e.g., `https://api.anthropic.com`
- **Haiku model** (optional)
- **Sonnet model** (optional)
- **Opus model** (optional)
- **Config name** (optional, auto-generated if empty)

### Viewing All Models

Use `/list` command to see all saved configurations grouped by tool.

### Viewing Current Models

Use `/current` command to see the active model for each tool.

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

### 0.0.3
- 🗑️ Removed OpenCode support (focus on Claude CLI only)
- 🔄 Simplified architecture (single-tool focus)
- ✅ Cleaner command flow (no tool selection step)

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