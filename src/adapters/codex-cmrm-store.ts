/**
 * Codex cmrm settings.json 存储模块
 * 负责读写 ~/.cmrm/settings.json 中的 codex 模型列表
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import * as fs from 'fs';
import * as path from 'path';
import { UnifiedModelConfig } from './types';
import { getPrimaryModelName, normalizeModelIdentity } from '../cli/model-identity';

/** 默认重试次数 */
const DEFAULT_RETRY = 3;

/** JSON 缩进空格数 */
const JSON_INDENT = 2;

/** cmrm 配置目录名 */
const CMRM_CONFIG_DIR = '.cmrm';

/** cmrm 配置文件名 */
const CMRM_CONFIG_FILE = 'settings.json';

/** Codex 工具名 */
const TOOL_NAME_CODEX = 'codex';

/** 配置字段名：工具 */
const FIELD_TOOLS = 'tools';

/** 配置字段名：模式列表 */
const FIELD_MODES = 'modes';

/** 配置不存在时的默认返回值 */
const NOT_FOUND_INDEX = -1;

/**
 * 解析 cmrm 配置文件
 *
 * @param cmrmSettingsPath - settings.json 绝对路径
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
    } catch {
      return undefined;
    }
  }
}

/**
 * 从配置对象中提取模型列表
 *
 * @param settings - 配置对象
 * @return 模型配置数组
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function extractModelsFromSettings(settings: any): UnifiedModelConfig[] {
  // 条件：存在 codex 模型配置
  if (settings[FIELD_TOOLS] && settings[FIELD_TOOLS][TOOL_NAME_CODEX] && settings[FIELD_TOOLS][TOOL_NAME_CODEX][FIELD_MODES]) {
    return settings[FIELD_TOOLS][TOOL_NAME_CODEX][FIELD_MODES];
  }
  // 替代：无模型配置，返回空数组
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
 * @date 2026-05-11
 */
export function getSavedModels(cmrmSettingsPath: string): UnifiedModelConfig[] {
  const settings = parseCmrmSettings(cmrmSettingsPath);

  // 条件：配置解析失败
  if (!settings) {
    return [];
  }
  // 替代：提取模型列表
  else {
    return extractModelsFromSettings(settings);
  }
}

/**
 * 确保 cmrm 配置目录存在
 *
 * @param cmrmSettingsPath - settings.json 绝对路径
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
    // 目录已存在，无需操作
  }
}

/**
 * 确保 settings 结构完整
 *
 * @param settings - 配置对象(可能为空)
 * @return 具有完整结构的配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function ensureToolsField(settings: any): void {
  // 条件：tools 对象不存在
  if (!settings[FIELD_TOOLS]) {
    settings[FIELD_TOOLS] = {};
  }
  // 替代：tools 已存在，保持
  else {
    // tools 对象已存在
  }
}

function ensureCodexField(settings: any): void {
  // 条件：codex 工具配置不存在
  if (!settings[FIELD_TOOLS][TOOL_NAME_CODEX]) {
    settings[FIELD_TOOLS][TOOL_NAME_CODEX] = { [FIELD_MODES]: [] };
  }
  // 替代：codex 已存在，保持
  else {
    // codex 配置已存在
  }
}

function ensureModesField(settings: any): void {
  // 条件：modes 数组不存在
  if (!settings[FIELD_TOOLS][TOOL_NAME_CODEX][FIELD_MODES]) {
    settings[FIELD_TOOLS][TOOL_NAME_CODEX][FIELD_MODES] = [];
  }
  // 替代：modes 已存在，保持
  else {
    // modes 数组已存在
  }
}

export function ensureSettingsStructure(settings: any): any {
  ensureToolsField(settings);
  ensureCodexField(settings);
  ensureModesField(settings);
  return settings;
}

/**
 * 查找已存在的配置索引
 *
 * @param modes - 模型配置数组
 * @param config - 新配置
 * @return 已存在配置的索引，不存在返回 -1
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function findExistingIndex(modes: UnifiedModelConfig[], config: UnifiedModelConfig): number {
  const targetKey = getPrimaryModelName(config);
  const foundIndex = modes.findIndex((m: UnifiedModelConfig) => getPrimaryModelName(m) === targetKey);
  return foundIndex;
}

/**
 * 读取或创建 cmrm settings
 *
 * @param cmrmSettingsPath - settings.json 绝对路径
 * @return 配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function loadOrCreateSettings(cmrmSettingsPath: string): any {
  // 条件：配置文件存在
  if (fs.existsSync(cmrmSettingsPath)) {
    const content = fs.readFileSync(cmrmSettingsPath, 'utf-8');
    return JSON.parse(content);
  }
  // 替代：配置文件不存在，返回空对象
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
 * @date 2026-05-11
 */
function updateOrAddMode(settings: any, config: UnifiedModelConfig): void {
  const existingIndex = findExistingIndex(settings[FIELD_TOOLS][TOOL_NAME_CODEX][FIELD_MODES], config);

  // 条件：配置已存在
  if (existingIndex >= NOT_FOUND_INDEX + 1) {
    settings[FIELD_TOOLS][TOOL_NAME_CODEX][FIELD_MODES][existingIndex] = config;
  }
  // 替代：配置不存在，添加新配置
  else {
    settings[FIELD_TOOLS][TOOL_NAME_CODEX][FIELD_MODES].push(config);
  }
}

export function saveModel(cmrmSettingsPath: string, config: UnifiedModelConfig): void {
  const normalizedConfig = normalizeModelIdentity(config);
  ensureCmrmDir(cmrmSettingsPath);

  let settings = loadOrCreateSettings(cmrmSettingsPath);
  settings = ensureSettingsStructure(settings);

  updateOrAddMode(settings, normalizedConfig);

  fs.writeFileSync(cmrmSettingsPath, JSON.stringify(settings, null, JSON_INDENT), 'utf-8');
}

/**
 * 删除保存的模型配置
 *
 * @param cmrmSettingsPath - settings.json 绝对路径
 * @param configName - 要删除的配置名称
 * @return 删除成功返回 true，配置不存在返回 false
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function removeModel(cmrmSettingsPath: string, configName: string): boolean {
  // 条件：配置文件不存在
  if (!fs.existsSync(cmrmSettingsPath)) {
    return false;
  }
  // 替代：继续处理删除逻辑
  else {
    // 继续处理删除逻辑
  }

  const settings = loadOrCreateSettings(cmrmSettingsPath);

  // 条件：配置结构不完整
  if (!settings[FIELD_TOOLS] || !settings[FIELD_TOOLS][TOOL_NAME_CODEX] || !settings[FIELD_TOOLS][TOOL_NAME_CODEX][FIELD_MODES]) {
    return false;
  }
  // 替代：继续查找配置
  else {
    // 继续查找配置
  }

  const index = settings[FIELD_TOOLS][TOOL_NAME_CODEX][FIELD_MODES].findIndex(
    (m: UnifiedModelConfig) => getPrimaryModelName(m) === configName
  );

  // 条件：配置不存在
  if (index < 0) {
    return false;
  }
  // 替代：删除配置
  else {
    settings[FIELD_TOOLS][TOOL_NAME_CODEX][FIELD_MODES].splice(index, 1);
    fs.writeFileSync(cmrmSettingsPath, JSON.stringify(settings, null, JSON_INDENT), 'utf-8');

    return true;
  }
}

/**
 * 获取配置的重试次数
 *
 * @param cmrmSettingsPath - settings.json 绝对路径
 * @return 重试次数，默认 3
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getRetryCount(cmrmSettingsPath: string): number {
  const settings = parseCmrmSettings(cmrmSettingsPath);
  // 条件：存在有效的重试次数配置
  if (settings && typeof settings.retry === 'number' && settings.retry > 0) {
    return settings.retry;
  }
  // 替代：使用默认重试次数
  else {
    return DEFAULT_RETRY;
  }
}
