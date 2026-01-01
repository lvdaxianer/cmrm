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
npm install -g claude-switch-model
# or
npm link
```

## Configuration

Create a settings file at `~/.cmrm/settings.json`:

```json
{
  "modes": [
    {
      "ANTHROPIC_MODEL": "claude-sonnet-4-5-20250514",
      "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-5-20250514",
      "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-5-20250514",
      "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-5-20251101",
      "ANTHROPIC_AUTH_TOKEN": "sk-ant-xxx",
      "ANTHROPIC_BASE_URL": "https://api.anthropic.com"
    }
  ]
}
```

**Required fields:** `ANTHROPIC_MODEL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`

**Note:** The first three model properties (Haiku, Sonnet, Opus) can have the same value if you want to use a unified model configuration.

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
2. **ANTHROPIC_DEFAULT_HAIKU_MODEL** (required) - Haiku model name
3. **ANTHROPIC_DEFAULT_SONNET_MODEL** (required) - Sonnet model name
4. **ANTHROPIC_DEFAULT_OPUS_MODEL** (required) - Opus model name
5. **ANTHROPIC_AUTH_TOKEN** (required) - API authentication token
6. **ANTHROPIC_BASE_URL** (required) - API base URL

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

The selected configuration will be written to `~/.claude/settings.json` in the following format:

```json
{
  "env": {
    "ANTHROPIC_MODEL": "claude-sonnet-4-5-20250514",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-5-20250514",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-5-20250514",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-5-20251101",
    "ANTHROPIC_AUTH_TOKEN": "sk-ant-xxx",
    "ANTHROPIC_BASE_URL": "https://api.anthropic.com"
  }
}
```

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
claude-switch-model/
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

## License

MIT

## Author

lvdaxianer
