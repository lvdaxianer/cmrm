# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- 工具和模型选择添加返回/退出选项 (02b8c84)

- 统一使用索引输入方式选择命令、工具和模型 (f883d5c)

### Changed
- 所有选择界面（命令、工具、模型）统一使用索引输入方式，移除方向键导航

### Changed
- 修复 /remove 命令错误执行 /switch 的问题

### Changed
- 重命名 /switch-model 为 /switch
- 添加 /remove 命令，重命名 /add-model 为 /add
- 移除 TOML 相关代码
- 移除 OpenCode 支持，专注于 Claude CLI
- 添加命令选择菜单，支持上下键交互
- 重构为多工具架构，支持 Claude 和 OpenCode
