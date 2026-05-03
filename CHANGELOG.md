# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
