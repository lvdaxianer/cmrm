# Claude Model Registry Manager (cmrm)

A CLI tool that liberates Claude's model registry management, allowing you to quickly switch between different Claude models.

## Purpose

This plugin is designed to **liberate Claude's model registry management**. It provides a convenient way to manage multiple Claude model configurations and switch between them seamlessly, without manually editing configuration files.

## Features

- Interactive model selection menu with keyboard navigation
- Add new model configurations interactively
- View all saved model configurations
- View currently configured model
- Support for multiple model configurations
- Simple and intuitive command interface
- Intelligent command suggestions for unknown inputs
- **Bilingual command descriptions (中文/English)**
- **Auto-display command list after each command execution**

## Installation

```bash
npm install -g cmrm
# or
npm link
```

## Getting Started

The first time you run `cmrm`, it will automatically create a configuration file at `~/.cmrm/settings.json`.

To add model configurations, use the `/input` command (see Usage section below).

## Usage

Start the CLI:

```bash
cmrm
```

### Commands

| Command | Description |
|---------|-------------|
| `/model` | Show interactive model selection menu |
| `/input` | Add a new model configuration interactively |
| `/list` | Display all saved model configurations |
| `/current` | Display the currently configured model |
| `/` | Show available commands |
| `/exit` or `exit` | Exit the CLI |

### Adding New Models

Use the `/input` command to add a new model configuration. You will be prompted to enter:

1. **ANTHROPIC_MODEL** (required) - Default model name
2. **ANTHROPIC_DEFAULT_HAIKU_MODEL** (optional) - Haiku model name
3. **ANTHROPIC_DEFAULT_SONNET_MODEL** (optional) - Sonnet model name
4. **ANTHROPIC_DEFAULT_OPUS_MODEL** (optional) - Opus model name
5. **ANTHROPIC_AUTH_TOKEN** (required) - API authentication token
6. **ANTHROPIC_BASE_URL** (required) - API base URL

**Required fields:** `ANTHROPIC_MODEL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`

**Optional fields:** `ANTHROPIC_DEFAULT_HAIKU_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`

The tool will validate that:
- All required fields are filled
- The model configuration doesn't already exist (same MODEL + BASE_URL combination)

### Viewing All Models

Use the `/list` command to see all saved model configurations with their details.

### Model Selection

When using `/model` command:

- Use `↑`/`↓` arrow keys to navigate through models
- Press `Enter` to select a model
- Press `Esc` to cancel

The selected configuration will be automatically written to your Claude settings file.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Start the CLI
npm start
```

## Project Structure

```
cmrm/
├── src/
│   ├── cli.ts       # CLI interface and interaction logic
│   ├── config.ts    # Configuration file reader/writer
│   ├── types.ts     # TypeScript type definitions
│   └── index.ts     # Export entry point
├── dist/            # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Changelog

### 0.0.1
- Initial release
- Support for model switching
- Interactive model configuration via `/input` command
- Bilingual command descriptions (中文/English)
- Auto-display command list after each command execution
- Intelligent command suggestions for unknown inputs

## License

MIT

## Author

lvdaxianer
