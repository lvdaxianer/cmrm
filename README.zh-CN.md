# Claude 模型注册管理器 (cmrm)

一个用于解放 Claude 模型注册管理的命令行工具，可以快速切换不同的 Claude 模型。

## 项目意图

这个插件的目的是**解放 Claude 的模型注册管理**。它提供了一种便捷的方式来管理多个 Claude 模型配置，并在它们之间无缝切换，无需手动编辑配置文件。

## 功能特性

- 交互式模型选择菜单，支持键盘导航
- 交互式添加新模型配置
- 查看所有已保存的模型配置
- 查看当前配置的模型
- 支持多模型配置
- 简洁直观的命令界面
- 智能命令提示（未知命令时会建议相似命令）
- **命令描述支持中英文双语**
- **每次命令执行后自动显示命令列表**

## 安装

```bash
npm install -g claude-switch-model
# 或者
npm link
```

## 配置

在 `~/.cmrm/settings.json` 创建配置文件：

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

**必填字段：** `ANTHROPIC_MODEL`、`ANTHROPIC_AUTH_TOKEN`、`ANTHROPIC_BASE_URL`

**注意：** 前三个模型属性（Haiku、Sonnet、Opus）可以保持相同的值，表示使用统一的模型配置。

## 使用方法

启动 CLI：

```bash
cmrm
```

### 命令说明

| 命令 | 功能 |
|------|------|
| `/model` | 显示交互式模型选择菜单 |
| `/input` | 交互式添加新模型配置 |
| `/list` | 显示所有已保存的模型配置 |
| `/current` | 显示当前配置的模型 |
| `/` | 显示可用命令列表 |
| `/exit` 或 `exit` | 退出程序 |

### 添加新模型

使用 `/input` 命令添加新的模型配置，系统会依次提示输入：

1. **ANTHROPIC_MODEL**（必填）- 默认模型名称
2. **ANTHROPIC_DEFAULT_HAIKU_MODEL**（必填）- Haiku 模型名称
3. **ANTHROPIC_DEFAULT_SONNET_MODEL**（必填）- Sonnet 模型名称
4. **ANTHROPIC_DEFAULT_OPUS_MODEL**（必填）- Opus 模型名称
5. **ANTHROPIC_AUTH_TOKEN**（必填）- API 认证密钥
6. **ANTHROPIC_BASE_URL**（必填）- API 基础 URL

系统会校验：
- 所有必填字段都已填写
- 模型配置不存在重复（相同的 MODEL + BASE_URL 组合）

### 查看所有模型

使用 `/list` 命令查看所有已保存的模型配置及其详细信息。

### 模型选择

使用 `/model` 命令时：

- 使用 `↑`/`↓` 方向键在模型列表中导航
- 按 `Enter` 键选择模型
- 按 `Esc` 键取消

选中的配置将写入 `~/.claude/settings.json`，格式如下：

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

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 开发模式运行
npm run dev

# 启动 CLI
npm start
```

## 项目结构

```
claude-switch-model/
├── src/
│   ├── cli.ts       # CLI 交互界面和逻辑
│   ├── config.ts    # 配置文件读写
│   ├── types.ts     # TypeScript 类型定义
│   └── index.ts     # 导出入口
├── dist/            # 编译输出
├── package.json
├── tsconfig.json
└── README.md
```

## 许可证

MIT

## 作者

lvdaxianer
