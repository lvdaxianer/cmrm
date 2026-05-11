/**
 * 配置管理辅助模块
 * 提供 ConfigManager 使用的私有辅助方法
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import * as fs from 'fs';
import * as path from 'path';
import { Settings, OldSettings, UnifiedModelConfig } from './types';
import { getPrimaryModelName, normalizeModelIdentity } from './cli/model-identity';

/** 默认 Claude 模型名称 */
const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-5-20250514';
/** 默认 Claude Haiku 模型名称 */
const DEFAULT_HAIKU_MODEL = 'claude-haiku-4-5-20250514';
/** 默认 Claude Opus 模型名称 */
const DEFAULT_OPUS_MODEL = 'claude-opus-4-5-20250514';
/** Anthropic API 基础 URL */
const ANTHROPIC_BASE_URL = 'https://api.anthropic.com';

/**
 * 获取 Windows 平台配置文件路径
 *
 * @param home - 用户主目录
 * @return Windows 平台配置文件路径
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getWindowsSettingsPath(home: string): string {
  return home + '\\.cmrm\\settings.json';
}

/**
 * 获取 Unix 平台配置文件路径
 *
 * @param home - 用户主目录
 * @return Unix 平台配置文件路径
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getUnixSettingsPath(home: string): string {
  return path.join(home, '.cmrm', 'settings.json');
}

/**
 * 读取并解析配置文件内容
 * 文件不存在或解析失败时抛出错误
 *
 * @param settingsPath - 配置文件路径
 * @return 解析后的原始配置对象
 * @throws 文件不存在或解析失败
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function readAndParseFile(settingsPath: string): any {
  // 条件: 文件不存在，抛出错误
  if (!fs.existsSync(settingsPath)) {
    throw new Error(`Settings file not found: ${settingsPath}`);
  }
  // 替代: 文件存在，读取并解析
  else {
    const content = fs.readFileSync(settingsPath, 'utf-8');
    return JSON.parse(content);
  }
}

/**
 * 判断是否为旧格式配置
 * 旧格式特征：有 modes 字段但无 tools 字段
 *
 * @param parsed - 解析后的配置对象
 * @return 如果是旧格式返回 true
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function isOldFormat(parsed: any): boolean {
  const hasModes = !!parsed.modes;
  const hasTools = !!parsed.tools;

  // 条件: 有 modes 但无 tools，判定为旧格式
  if (hasModes && !hasTools) {
    return true;
  }
  // 替代: 有 tools 或无 modes，判定为新格式
  else {
    return false;
  }
}

/**
 * 迁移旧格式配置到新格式
 * 将 modes 字段转换为 tools.claude.modes 结构
 *
 * @param oldSettings - 旧格式配置对象
 * @return 新格式配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function migrateOldFormat(oldSettings: OldSettings): Settings {
  // 构建新格式配置
  const newSettings: Settings = {
    tools: {
      claude: {
        modes: oldSettings.modes.map((mode: any) => normalizeModelIdentity({
          name: mode.ANTHROPIC_MODEL,
          model: mode.ANTHROPIC_MODEL,
          apiKey: mode.ANTHROPIC_AUTH_TOKEN,
          baseUrl: mode.ANTHROPIC_BASE_URL,
          haikuModel: mode.ANTHROPIC_DEFAULT_HAIKU_MODEL,
          sonnetModel: mode.ANTHROPIC_DEFAULT_SONNET_MODEL,
          opusModel: mode.ANTHROPIC_DEFAULT_OPUS_MODEL,
        })),
      },
      codex: {
        modes: [],
      },
    },
  };

  return newSettings;
}

/**
 * 确保 cmrm 配置目录存在
 * 不存在则创建目录
 *
 * @param settingsPath - 配置文件路径
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function ensureCmrmDir(settingsPath: string): void {
  const cmrmDir = path.dirname(settingsPath);

  // 条件: 目录不存在，需要创建
  if (!fs.existsSync(cmrmDir)) {
    fs.mkdirSync(cmrmDir, { recursive: true });
  }
  // 替代: 目录已存在，无需操作
  else {
    // 目录已存在，无需创建
  }
}

/**
 * 读取或创建配置对象
 * 文件存在则读取，不存在则创建默认结构
 *
 * @param settingsPath - 配置文件路径
 * @return 配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function loadOrCreateSettings(settingsPath: string): Settings {
  // 条件: 配置文件存在，读取内容
  if (fs.existsSync(settingsPath)) {
    const parsed = readAndParseFile(settingsPath);

    // 条件: 旧格式配置，需要迁移
    if (isOldFormat(parsed)) {
      return migrateOldFormat(parsed as OldSettings);
    }
    // 替代: 新格式配置，直接返回
    else {
      return parsed as Settings;
    }
  }
  // 替代: 配置文件不存在，创建默认结构
  else {
    const defaultSettings: Settings = {
      tools: {
        claude: { modes: [] },
        codex: { modes: [] },
      },
    };

    return defaultSettings;
  }
}

/**
 * 确保 settings 结构完整
 * 创建缺失的 tools[toolName].modes 结构
 *
 * @param settings - 配置对象
 * @param toolName - 工具名称
 * @return 具有完整结构的配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function ensureToolStructure(settings: Settings, toolName: string): Settings {
  // 条件: tools 对象不存在，需要初始化
  if (!settings.tools) {
    settings.tools = {};
  }
  // 替代: tools 对象已存在，保持
  else {
    // tools 对象已存在
  }

  // 条件: 工具配置不存在，需要初始化
  if (!settings.tools[toolName]) {
    settings.tools[toolName] = { modes: [] };
  }
  // 替代: 工具配置已存在，保持
  else {
    // 工具配置已存在
  }

  // 条件: modes 数组不存在，需要初始化
  if (!settings.tools[toolName].modes) {
    settings.tools[toolName].modes = [];
  }
  // 替代: modes 数组已存在，保持
  else {
    // modes 数组已存在
  }

  return settings;
}

/**
 * 查找已存在的配置索引
 * 根据名称查找是否已有相同配置
 *
 * @param modes - 模型配置数组
 * @param config - 新配置
 * @return 已存在配置的索引，不存在返回 -1
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function findExistingIndex(modes: UnifiedModelConfig[], config: UnifiedModelConfig): number {
  const targetKey = getPrimaryModelName(config);
  return modes.findIndex((m: UnifiedModelConfig) => getPrimaryModelName(m) === targetKey);
}

/**
 * 更新工具的模型配置列表
 * 配置已存在则替换，不存在则添加
 *
 * @param settings - 配置对象
 * @param toolName - 工具名称
 * @param config - 新配置
 * @return 更新后的配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function updateToolModes(settings: Settings, toolName: string, config: UnifiedModelConfig): Settings {
  // 查找已存在的配置索引
  const existingIndex = findExistingIndex(settings.tools[toolName].modes, config);

  // 条件: 配置已存在，替换更新
  if (existingIndex >= 0) {
    settings.tools[toolName].modes[existingIndex] = config;
  }
  // 替代: 配置不存在，添加新配置
  else {
    settings.tools[toolName].modes.push(config);
  }

  return settings;
}

/**
 * 准备并更新配置对象
 * 读取或创建配置，确保结构完整，并更新模型列表
 *
 * @param settingsPath - 配置文件路径
 * @param toolName - 工具名称
 * @param config - 标准化后的模型配置
 * @return 更新后的配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function prepareAndUpdateSettings(settingsPath: string, toolName: string, config: UnifiedModelConfig): Settings {
  // 读取或创建配置
  let settings = loadOrCreateSettings(settingsPath);

  // 确保工具配置结构存在
  settings = ensureToolStructure(settings, toolName);

  // 更新模型配置列表
  settings = updateToolModes(settings, toolName, config);

  return settings;
}

/**
 * 创建默认 Claude 模型配置
 * 用于初始化配置文件时的示例配置
 *
 * @return 默认 Claude 模型配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function createDefaultClaudeMode(): UnifiedModelConfig {
  return {
    name: DEFAULT_CLAUDE_MODEL,
    model: DEFAULT_CLAUDE_MODEL,
    apiKey: '',
    baseUrl: ANTHROPIC_BASE_URL,
    haikuModel: DEFAULT_HAIKU_MODEL,
    sonnetModel: DEFAULT_CLAUDE_MODEL,
    opusModel: DEFAULT_OPUS_MODEL,
  };
}

/**
 * 确保配置目录存在
 *
 * @param dir - 目录路径
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function ensureConfigDir(dir: string): void {
  // 条件: 目录不存在，需要创建
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // 替代: 目录已存在，无需操作
  else {
    // 目录已存在，无需创建
  }
}

/**
 * 构建默认配置对象
 *
 * @return 默认配置
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildDefaultSettings(): Settings {
  return {
    tools: {
      claude: {
        modes: [createDefaultClaudeMode()],
      },
      codex: {
        modes: [],
      },
    },
  };
}
