/**
 * Claude 工具适配器
 * 实现 Claude CLI 工具的配置管理
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ToolAdapter, UnifiedModelConfig } from './types';
import { normalizeModelIdentity } from '../cli/model-identity';
import {
  parseClaudeConfig,
  writeClaudeModelConfig,
  parseCmrmSettings,
  ensureCmrmDir,
  ensureSettingsStructure,
  loadOrCreateSettings,
  persistSettings,
  deleteModelFromSettings,
  isFieldValid,
  getRetryCountFromSettings,
} from './claude-config-helpers';
import {
  buildModelConfig,
  extractModelsFromSettings,
  findExistingIndex,
} from './claude-model-helpers';

/** Claude 配置目录名 */
const CLAUDE_CONFIG_DIR = '.claude';

/** cmrm 配置目录名 */
const CMRM_CONFIG_DIR = '.cmrm';

/** Claude 配置文件名 */
const CLAUDE_CONFIG_FILE = 'settings.json';

/** cmrm 配置文件名 */
const CMRM_CONFIG_FILE = 'settings.json';

/**
 * Claude 工具适配器类
 * 管理 ~/.claude/settings.json 配置文件
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export class ClaudeAdapter implements ToolAdapter {
  /** 工具名称 */
  name = 'claude';

  /** 工具显示名称 */
  displayName = 'Claude';

  /** 配置文件路径 */
  configPath: string;

  /** 配置文件格式 */
  configFormat = 'json' as const;

  /** cmrm 配置文件路径 */
  private cmrmSettingsPath: string;

  /**
   * 构造函数
   * 初始化配置文件路径
   *
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  constructor() {
    this.configPath = path.join(os.homedir(), CLAUDE_CONFIG_DIR, CLAUDE_CONFIG_FILE);
    this.cmrmSettingsPath = path.join(os.homedir(), CMRM_CONFIG_DIR, CMRM_CONFIG_FILE);
  }

  /**
   * 读取当前生效的模型配置
   * 从 ~/.claude/settings.json 的 env 对象读取
   *
   * @return 当前模型配置，未配置则返回 undefined
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  readCurrentModel(): UnifiedModelConfig | undefined {
    // 解析配置文件
    const config = parseClaudeConfig(this.configPath);

    // 条件：配置文件不存在或解析失败
    if (!config) {
      return undefined;
    }
    // 替代：提取 env 并构建模型配置
    else {
      const env = config.env || {};
      return buildModelConfig(env);
    }
  }

  /**
   * 写入模型配置
   * 流程：备份 → Merge → 写入
   *
   * @param config - 要写入的模型配置
   * @return 备份文件名
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  writeModelConfig(config: UnifiedModelConfig): string | undefined {
    return writeClaudeModelConfig(this.configPath, config);
  }

  /**
   * 获取用户保存的模型列表
   * 从 ~/.cmrm/settings.json 的 tools.claude.modes 读取
   *
   * @return 保存的模型配置数组
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  getSavedModels(): UnifiedModelConfig[] {
    // 解析 cmrm 配置
    const settings = parseCmrmSettings(this.cmrmSettingsPath);

    // 条件：配置文件不存在或解析失败
    if (!settings) {
      return [];
    }
    // 替代：提取模型列表
    else {
      return extractModelsFromSettings(settings);
    }
  }

  /**
   * 保存模型配置到 cmrm 存储
   * 写入到 ~/.cmrm/settings.json 的 tools.claude.modes
   *
   * @param config - 要保存的模型配置
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  saveModel(config: UnifiedModelConfig): void {
    const normalizedConfig = normalizeModelIdentity(config);
    ensureCmrmDir(this.cmrmSettingsPath);
    const settings = this.prepareSettings();
    this.updateModes(settings, normalizedConfig);
    persistSettings(this.cmrmSettingsPath, settings);
  }

  /**
   * 准备 settings 对象（读取或创建并确保结构完整）
   *
   * @return 结构完整的配置对象
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private prepareSettings(): any {
    let settings = loadOrCreateSettings(this.cmrmSettingsPath);
    return ensureSettingsStructure(settings);
  }

  /**
   * 更新 modes 数组（新增或替换）
   *
   * @param settings - 配置对象
   * @param config - 模型配置
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private updateModes(settings: any, config: UnifiedModelConfig): void {
    const existingIndex = findExistingIndex(settings.tools.claude.modes, config);

    // 条件：配置已存在，替换更新
    if (existingIndex >= 0) {
      settings.tools.claude.modes[existingIndex] = config;
    }
    // 替代：配置不存在，添加新配置
    else {
      settings.tools.claude.modes.push(config);
    }
  }

  /**
   * 删除保存的模型配置
   * 从 ~/.cmrm/settings.json 的 tools.claude.modes 中删除指定配置
   *
   * @param configName - 要删除的配置名称
   * @return 删除成功返回 true，配置不存在返回 false
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  removeModel(configName: string): boolean {
    // 条件：配置文件不存在
    if (!fs.existsSync(this.cmrmSettingsPath)) {
      return false;
    }
    // 替代：继续处理删除逻辑
    else {
      // 继续处理删除逻辑
    }

    const settings = loadOrCreateSettings(this.cmrmSettingsPath);
    return deleteModelFromSettings(this.cmrmSettingsPath, settings, configName);
  }

  /**
   * 验证配置是否有效
   * 检查必填字段是否完整
   *
   * @param config - 要验证的配置
   * @return 验证通过返回 true，否则返回 false
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  validateConfig(config: UnifiedModelConfig): boolean {
    const isModelValid = isFieldValid(config.model);
    const isApiKeyValid = isFieldValid(config.apiKey);
    const isBaseUrlValid = isFieldValid(config.baseUrl);
    return isModelValid && isApiKeyValid && isBaseUrlValid;
  }

  /**
   * 获取配置的重试次数
   * 从 ~/.cmrm/settings.json 的 retry 字段读取
   *
   * @return 重试次数，默认 3
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  getRetryCount(): number {
    return getRetryCountFromSettings(this.cmrmSettingsPath);
  }
}
