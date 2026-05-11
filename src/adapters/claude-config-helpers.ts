/**
 * Claude 配置辅助函数模块
 * 负责配置文件解析、验证、目录管理、settings 持久化等底层操作
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import * as fs from 'fs';
import * as path from 'path';
import { UnifiedModelConfig } from './types';
import { backupConfig, mergeJsonConfig } from '../utils/backup';
import { getPrimaryModelName } from '../cli/model-identity';

/** JSON 缩进空格数 */
const JSON_INDENT = 2;

/** 默认重试次数 */
const DEFAULT_RETRY_COUNT = 3;

/** 环境变量：主模型 */
const ENV_ANTHROPIC_MODEL = 'ANTHROPIC_MODEL';

/** 环境变量：认证令牌 */
const ENV_ANTHROPIC_AUTH_TOKEN = 'ANTHROPIC_AUTH_TOKEN';

/** 环境变量：基础 URL */
const ENV_ANTHROPIC_BASE_URL = 'ANTHROPIC_BASE_URL';

/** 环境变量：Haiku 模型 */
const ENV_ANTHROPIC_HAIKU = 'ANTHROPIC_DEFAULT_HAIKU_MODEL';

/** 环境变量：Sonnet 模型 */
const ENV_ANTHROPIC_SONNET = 'ANTHROPIC_DEFAULT_SONNET_MODEL';

/** 环境变量：Opus 模型 */
const ENV_ANTHROPIC_OPUS = 'ANTHROPIC_DEFAULT_OPUS_MODEL';

/**
 * 解析 Claude 配置文件内容
 * 读取并解析 JSON 配置文件
 *
 * @param configPath - 配置文件路径
 * @return 解析后的配置对象，文件不存在或解析失败返回 undefined
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function parseClaudeConfig(configPath: string): any | undefined {
  // 条件：配置文件不存在
  if (!fs.existsSync(configPath)) {
    return undefined;
  }
  // 替代：读取并解析 JSON
  else {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
    // 解析失败
    catch {
      return undefined;
    }
  }
}

/**
 * 读取原始配置文件内容
 * 用于合并前保留原有配置
 *
 * @param configPath - 配置文件路径
 * @return 原配置对象，文件不存在时返回空对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function readOriginalConfig(configPath: string): any {
  // 条件：配置文件存在
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
    // 配置为空/格式错误：回退为空对象
    catch {
      return {};
    }
  }
  // 替代：配置文件不存在，返回空对象
  else {
    return {};
  }
}

/**
 * 确保配置目录存在
 * 不存在则创建目录
 *
 * @param configPath - 配置文件路径（用于提取目录）
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function ensureConfigDir(configPath: string): void {
  const configDir = path.dirname(configPath);

  // 条件：目录不存在
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  // 替代：目录已存在，无需操作
  else {
    // 目录已存在，无需创建
  }
}

/**
 * 写入模型配置到 Claude settings.json
 * 流程：备份 → Merge → 写入
 *
 * @param configPath - Claude 配置文件路径
 * @param config - 要写入的模型配置
 * @return 备份文件名
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function writeClaudeModelConfig(configPath: string, config: UnifiedModelConfig): string | undefined {
  // 备份当前配置
  const backupFileName = backupConfig(configPath);

  // 读取原始配置
  const originalConfig = readOriginalConfig(configPath);

  // 合并配置
  const mergedConfig = mergeJsonConfig(originalConfig, config);

  // 确保配置目录存在
  ensureConfigDir(configPath);

  // 写入合并后的配置
  fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, JSON_INDENT), 'utf-8');

  return backupFileName;
}

/**
 * 解析 cmrm 配置文件
 * 读取 ~/.cmrm/settings.json 内容
 *
 * @param cmrmSettingsPath - cmrm 配置文件路径
 * @return 配置对象，文件不存在或解析失败返回 undefined
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function parseCmrmSettings(cmrmSettingsPath: string): any | undefined {
  // 条件：配置文件不存在
  if (!fs.existsSync(cmrmSettingsPath)) {
    return undefined;
  }
  // 替代：读取并解析 JSON
  else {
    try {
      const content = fs.readFileSync(cmrmSettingsPath, 'utf-8');
      return JSON.parse(content);
    }
    // 解析失败
    catch {
      return undefined;
    }
  }
}

/**
 * 确保 cmrm 配置目录存在
 * 不存在则创建目录
 *
 * @param cmrmSettingsPath - cmrm 配置文件路径
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function ensureCmrmDir(cmrmSettingsPath: string): void {
  const cmrmDir = path.dirname(cmrmSettingsPath);

  // 条件：目录不存在
  if (!fs.existsSync(cmrmDir)) {
    fs.mkdirSync(cmrmDir, { recursive: true });
  }
  // 替代：目录已存在，无需操作
  else {
    // 目录已存在，无需创建
  }
}

/**
 * 确保 settings 结构完整
 * 创建缺失的 tools.claude.modes 结构
 *
 * @param settings - 配置对象（可能为空）
 * @return 具有完整结构的配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function ensureSettingsStructure(settings: any): any {
  // 条件：tools 对象不存在
  if (!settings.tools) {
    settings.tools = {};
  }
  // 替代：tools 已存在，保持
  else {
    // tools 对象已存在
  }

  // 条件：claude 工具配置不存在
  if (!settings.tools.claude) {
    settings.tools.claude = { modes: [] };
  }
  // 替代：claude 已存在，保持
  else {
    // claude 配置已存在
  }

  // 条件：modes 数组不存在
  if (!settings.tools.claude.modes) {
    settings.tools.claude.modes = [];
  }
  // 替代：modes 已存在，保持
  else {
    // modes 数组已存在
  }

  return settings;
}

/**
 * 读取或创建 cmrm settings
 * 文件存在则读取，不存在则创建空结构
 *
 * @param cmrmSettingsPath - cmrm 配置文件路径
 * @return 配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function loadOrCreateSettings(cmrmSettingsPath: string): any {
  // 条件：配置文件存在
  if (fs.existsSync(cmrmSettingsPath)) {
    try {
      const content = fs.readFileSync(cmrmSettingsPath, 'utf-8');
      return JSON.parse(content);
    }
    // 配置为空/格式错误：回退为空对象
    catch {
      return {};
    }
  }
  // 替代：配置文件不存在，返回空对象
  else {
    return {};
  }
}

/**
 * 持久化 settings 到文件
 *
 * @param cmrmSettingsPath - cmrm 配置文件路径
 * @param settings - 配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function persistSettings(cmrmSettingsPath: string, settings: any): void {
  fs.writeFileSync(cmrmSettingsPath, JSON.stringify(settings, null, JSON_INDENT), 'utf-8');
}

/**
 * 检查 settings 是否包含有效的 modes 数组
 *
 * @param settings - 配置对象
 * @return 有效返回 true
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function hasValidModes(settings: any): boolean {
  return !!(settings.tools && settings.tools.claude && settings.tools.claude.modes);
}

/**
 * 从 settings 中删除指定模型
 *
 * @param cmrmSettingsPath - cmrm 配置文件路径
 * @param settings - 配置对象
 * @param configName - 要删除的配置名称
 * @return 删除成功返回 true
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function deleteModelFromSettings(cmrmSettingsPath: string, settings: any, configName: string): boolean {
  // 条件：配置结构不完整
  if (!hasValidModes(settings)) {
    return false;
  }
  // 替代：继续查找配置
  else {
    // 继续查找配置
  }

  const index = settings.tools.claude.modes.findIndex(
    (m: UnifiedModelConfig) => getPrimaryModelName(m) === configName
  );

  // 条件：配置不存在
  if (index < 0) {
    return false;
  }
  // 替代：删除配置并写入
  else {
    settings.tools.claude.modes.splice(index, 1);
    fs.writeFileSync(cmrmSettingsPath, JSON.stringify(settings, null, JSON_INDENT), 'utf-8');
    return true;
  }
}

/**
 * 验证字段是否有效
 *
 * @param value - 字段值
 * @return 有效返回 true
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function isFieldValid(value: string | undefined): boolean {
  return !!value && value.trim() !== '';
}

/**
 * 获取配置的重试次数
 * 从 ~/.cmrm/settings.json 的 retry 字段读取
 *
 * @param cmrmSettingsPath - cmrm 配置文件路径
 * @return 重试次数，默认 3
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getRetryCountFromSettings(cmrmSettingsPath: string): number {
  const settings = parseCmrmSettings(cmrmSettingsPath);
  // 条件：存在有效的重试次数配置
  if (settings && typeof settings.retry === 'number' && settings.retry > 0) {
    return settings.retry;
  }
  // 替代：使用默认重试次数
  else {
    return DEFAULT_RETRY_COUNT;
  }
}
