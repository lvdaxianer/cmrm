/**
 * Codex cmrm settings.json 存储模块
 * 负责读写 ~/.cmrm/settings.json 中的 codex 模型列表
 *
 * @author lvdaxianerplus
 * @date 2026-05-09
 */

import * as fs from 'fs';
import * as path from 'path';
import { UnifiedModelConfig } from './types';
import { getPrimaryModelName, normalizeModelIdentity } from '../cli/model-identity';

/** 默认重试次数 */
const DEFAULT_RETRY = 3;

/**
 * 解析 cmrm 配置文件
 *
 * @param cmrmSettingsPath - settings.json 绝对路径
 * @return 配置对象，文件不存在或解析失败返回 null
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function parseCmrmSettings(cmrmSettingsPath: string): any | null {
  if (!fs.existsSync(cmrmSettingsPath)) {
    return null;
  }
  else {
    try {
      const content = fs.readFileSync(cmrmSettingsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

/**
 * 从配置对象中提取模型列表
 *
 * @param settings - 配置对象
 * @return 模型配置数组
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function extractModelsFromSettings(settings: any): UnifiedModelConfig[] {
  if (settings.tools && settings.tools.codex && settings.tools.codex.modes) {
    return settings.tools.codex.modes;
  }
  else {
    return [];
  }
}

/**
 * 获取用户保存的模型列表
 *
 * @param cmrmSettingsPath - settings.json 绝对路径
 * @return 保存的模型配置数组
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function getSavedModels(cmrmSettingsPath: string): UnifiedModelConfig[] {
  const settings = parseCmrmSettings(cmrmSettingsPath);

  if (!settings) {
    return [];
  }
  else {
    return extractModelsFromSettings(settings);
  }
}

/**
 * 确保 cmrm 配置目录存在
 *
 * @param cmrmSettingsPath - settings.json 绝对路径
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function ensureCmrmDir(cmrmSettingsPath: string): void {
  const cmrmDir = path.dirname(cmrmSettingsPath);

  if (!fs.existsSync(cmrmDir)) {
    fs.mkdirSync(cmrmDir, { recursive: true });
  }
}

/**
 * 确保 settings 结构完整
 *
 * @param settings - 配置对象(可能为空)
 * @return 具有完整结构的配置对象
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function ensureSettingsStructure(settings: any): any {
  if (!settings.tools) {
    settings.tools = {};
  }

  if (!settings.tools.codex) {
    settings.tools.codex = { modes: [] };
  }

  if (!settings.tools.codex.modes) {
    settings.tools.codex.modes = [];
  }

  return settings;
}

/**
 * 查找已存在的配置索引
 *
 * @param modes - 模型配置数组
 * @param config - 新配置
 * @return 已存在配置的索引，不存在返回 -1
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function findExistingIndex(modes: UnifiedModelConfig[], config: UnifiedModelConfig): number {
  const targetKey = getPrimaryModelName(config);
  return modes.findIndex((m: UnifiedModelConfig) => getPrimaryModelName(m) === targetKey);
}

/**
 * 读取或创建 cmrm settings
 *
 * @param cmrmSettingsPath - settings.json 绝对路径
 * @return 配置对象
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function loadOrCreateSettings(cmrmSettingsPath: string): any {
  if (fs.existsSync(cmrmSettingsPath)) {
    const content = fs.readFileSync(cmrmSettingsPath, 'utf-8');
    return JSON.parse(content);
  }
  else {
    return {};
  }
}

/**
 * 保存模型配置到 cmrm 存储
 *
 * @param cmrmSettingsPath - settings.json 绝对路径
 * @param config - 要保存的模型配置
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function saveModel(cmrmSettingsPath: string, config: UnifiedModelConfig): void {
  const normalizedConfig = normalizeModelIdentity(config);
  ensureCmrmDir(cmrmSettingsPath);

  let settings = loadOrCreateSettings(cmrmSettingsPath);
  settings = ensureSettingsStructure(settings);

  const existingIndex = findExistingIndex(settings.tools.codex.modes, normalizedConfig);

  if (existingIndex >= 0) {
    settings.tools.codex.modes[existingIndex] = normalizedConfig;
  }
  else {
    settings.tools.codex.modes.push(normalizedConfig);
  }

  fs.writeFileSync(cmrmSettingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * 删除保存的模型配置
 *
 * @param cmrmSettingsPath - settings.json 绝对路径
 * @param configName - 要删除的配置名称
 * @return 删除成功返回 true，配置不存在返回 false
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function removeModel(cmrmSettingsPath: string, configName: string): boolean {
  if (!fs.existsSync(cmrmSettingsPath)) {
    return false;
  }

  const settings = loadOrCreateSettings(cmrmSettingsPath);

  if (!settings.tools || !settings.tools.codex || !settings.tools.codex.modes) {
    return false;
  }

  const index = settings.tools.codex.modes.findIndex(
    (m: UnifiedModelConfig) => getPrimaryModelName(m) === configName
  );

  if (index < 0) {
    return false;
  }

  settings.tools.codex.modes.splice(index, 1);
  fs.writeFileSync(cmrmSettingsPath, JSON.stringify(settings, null, 2), 'utf-8');

  return true;
}

/**
 * 获取配置的重试次数
 *
 * @param cmrmSettingsPath - settings.json 绝对路径
 * @return 重试次数，默认 3
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function getRetryCount(cmrmSettingsPath: string): number {
  const settings = parseCmrmSettings(cmrmSettingsPath);
  if (settings && typeof settings.retry === 'number' && settings.retry > 0) {
    return settings.retry;
  }
  return DEFAULT_RETRY;
}
