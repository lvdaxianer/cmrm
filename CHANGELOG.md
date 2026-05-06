# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.2] - 2026-05-06

### Added
- 单工具注册时跳过「选工具」步骤，`/switch` 直接进入模型选择
- 模型选择菜单显示工具名后缀 `[idx] 模型名 [提供商] (工具名)`，提升辨识
- `cmrm` 无参数快捷方式支持 `--version` / `-v` 查看版本号

### Changed
- `test-handler.ts` 选模型列表同步显示工具名后缀，保持体验一致

### Fixed
- 首次运行 `~/.cmrm/settings.json` 不存在时 Fatal error，改为降级到默认中文
- 模块级 `t()` 调用时机早于 `i18n.initialize()`，改为运行时解析 key
- `set-lang.ts` `Locale` 类型引用路径错误 (`../manager` → `../types`)

### Test
- 新增 i18n 模块 key 验证测试（8 个 key × 3 语言 = 24 个用例）
- 补全 `settings.json` 缺失场景的 i18n 降级测试

## [0.2.1] - 2026-05-06

### Added
- 多语言支持（zh/en/ja），默认中文，通过 `/set-lang` 手动切换
- 地理位置自动检测：中国→中文，日本→日语，其他→英语
- 测试命令重试机制，默认 3 次重试，配置项 `retry` 可自定义
- `testModelConfigWithRetry` 支持重试回调，UI 显示重试进度

### Changed
- UI 文本全部迁移至 i18n 系统，移除所有硬编码中文/英文
- `tester-parser.ts` 错误消息通过 `t()` 翻译
- `commands.ts` 命令描述使用 `descriptionKey` 动态翻译
- `ui.ts` 渲染时调用 `t()` 获取翻译文本

### Fixed
- `shortcut-runner.ts` 硬编码中文消息改为 i18n 翻译
- `fuzzy-match.ts` 相似命令提示改为 i18n 翻译
- `help-printer.ts` 帮助文档改为 i18n 翻译

## [0.2.0] - 2026-05-04

### Added
- 模型模板功能，`/add` 进入后支持"基于模板添加"和"自定义添加"
- 9 个内置模型模板（DeepSeek、智谱 AI、Kimi、Minimax 国内/国际、OpenRouter、小米 MiMo、通义千问）
- 模板配置文件 `~/.cmrm/templates.json`，支持热更新和用户自定义
- 首次启动自动从 GitHub Raw 拉取远程模板，网络失败时回退内置默认并提示用户
- 模板字段预填充（model、baseUrl、apiType、可选模型），用户仅需输入 apiKey
- `TemplateManager` 模板管理器，负责模板配置的读写、热加载与远程刷新
- `TemplateFetcher` 远程拉取器，支持 3xx 重定向跟随，使用 Buffer 数组收集响应体
- `IndexPrompt` 通用索引提示器，统一索引菜单打印与输入校验逻辑

### Changed
- `/add` 命令交互流程重构：先选择添加方式（模板/自定义），再进入字段收集
- `add-questions.ts` 支持默认值注入，`buildAddModelQuestionsWithDefaults` 为模板场景预填充字段
- `add-handler.ts` 拆分为 `template-add-handler.ts`，模板选择与自定义添加职责分离
- 代码审查整改：方法行数控制（≤20 行）、if-else 强制配对、循环内字符串拼接修复

## [0.1.0] - 2026-05-03

### Added
- 模型多别名管理 `UnifiedModelConfig.aliases?: string[]`,跨工具/跨模型全局唯一
- `/alias` 交互命令(添加/删除/列出别名)
- `cmrm alias <model> <new-alias>` CLI 快捷方式
- `findModelByName` 由两级查找扩展为三级:`name` → `aliases` → `model`,支持 `cmrm switch <alias>` 直达
- `/test` 命令,支持测试已保存或自定义模型配置
- OpenAI Chat Completions API 协议兼容(除 Anthropic 外)
- `/add` 添加 API 类型选择,并在保存前自动测试配置
- 发布检查清单文档

### Changed
- CLI 模块化拆分,主程序 `src/cli.ts` 由 1182 行瘦身至 ~250 行
- 抽出 `add-handler`/`add-questions`/`argv-parser`/`shortcut-runner`/`shortcut-banner`/`bootstrap`/`operation-orchestrator`/`model-picker`/`model-actions`/`tool-selector`/`fuzzy-match`/`help-printer`/`readline-helper` 等模块
- 中英文 README 保持一致,补全所有命令文档

### Security
- 测试时错误信息脱敏,避免 API Key 泄漏

## [0.0.2]

### Added
- `/info` 命令查看模型详细信息(JSON 格式)
- 选择菜单"返回上一级"和"直接退出"选项
- `/remove` 命令删除已保存的配置
- 配置写入前备份机制
- 合并策略保留现有字段

### Changed
- 选择界面改为索引输入方式(数字代替方向键)
- 命令重命名:`/switch-model` → `/switch`,`/add-model` → `/add`
- 简化架构(单一工具专注 - 仅 Claude)

### Fixed
- `/remove` 命令错误执行 `/switch` 的问题

## [0.0.1]

### Added
- 初始版本发布
- 支持 Claude 模型切换
- 交互式模型配置
- 中英文双语命令描述
