/**
 * Claude 工具适配器
 * 实现 Claude CLI 工具的配置管理
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ToolAdapter, UnifiedModelConfig } from './types';
import { backupConfig, mergeJsonConfig } from '../utils/backup';

/**
 * Claude 工具适配器类
 * 管理 ~/.claude/settings.json 配置文件
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
   * @date 2026-04-27
   */
  constructor() {
    this.configPath = path.join(os.homedir(), '.claude', 'settings.json');
    this.cmrmSettingsPath = path.join(os.homedir(), '.cmrm', 'settings.json');
  }

  /**
   * 解析 Claude 配置文件内容
   * 读取并解析 JSON 配置文件
   *
   * @return 解析后的配置对象，文件不存在或解析失败返回 null
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private parseClaudeConfig(): any | null {
    // 配置文件不存在 - 返回 null
    if (!fs.existsSync(this.configPath)) {
      return null;
    }
    // 配置文件存在 - 读取解析
    else {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(content);
      }
      // 解析失败 - 返回 null
      catch (error) {
        return null;
      }
    }
  }

  /**
   * 从 env 对象构建模型配置对象
   * 提取模型相关字段到统一配置格式
   *
   * @param env - Claude 配置的 env 对象
   * @return 模型配置对象，无模型配置时返回 null
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private buildModelConfig(env: any): UnifiedModelConfig | null {
    // 无模型配置 - 返回 null
    if (!env.ANTHROPIC_MODEL) {
      return null;
    }
    // 有模型配置 - 构建对象
    else {
      const modelConfig: UnifiedModelConfig = {
        model: env.ANTHROPIC_MODEL,
        apiKey: env.ANTHROPIC_AUTH_TOKEN || '',
        baseUrl: env.ANTHROPIC_BASE_URL || '',
        haikuModel: env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
        sonnetModel: env.ANTHROPIC_DEFAULT_SONNET_MODEL,
        opusModel: env.ANTHROPIC_DEFAULT_OPUS_MODEL,
      };

      return modelConfig;
    }
  }

  /**
   * 读取当前生效的模型配置
   * 从 ~/.claude/settings.json 的 env 对象读取
   *
   * @return 当前模型配置，未配置则返回 null
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  readCurrentModel(): UnifiedModelConfig | null {
    // 解析配置文件
    const config = this.parseClaudeConfig();

    // 配置文件不存在或解析失败 - 返回 null
    if (!config) {
      return null;
    }
    // 配置文件有效 - 提取 env
    else {
      const env = config.env || {};

      // 从 env 构建模型配置
      return this.buildModelConfig(env);
    }
  }

  /**
   * 读取原始配置文件内容
   * 用于合并前保留原有配置
   *
   * @return 原配置对象，文件不存在时返回空对象
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private readOriginalConfig(): any {
    // 配置文件存在 - 读取内容
    if (fs.existsSync(this.configPath)) {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(content);
    }
    // 配置文件不存在 - 返回空对象
    else {
      return {};
    }
  }

  /**
   * 确保配置目录存在
   * 不存在则创建目录
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private ensureConfigDir(): void {
    const configDir = path.dirname(this.configPath);

    // 目录不存在 - 创建目录
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    // 目录已存在 - 无需操作
    else {
      // 目录已存在，无需创建
    }
  }

  /**
   * 写入模型配置
   * 流程：备份 → Merge → 写入
   *
   * @param config - 要写入的模型配置
   * @return 备份文件名
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  writeModelConfig(config: UnifiedModelConfig): string {
    // 备份当前配置
    const backupFileName = backupConfig(this.configPath);

    // 读取原始配置
    const originalConfig = this.readOriginalConfig();

    // 合并配置
    const mergedConfig = mergeJsonConfig(originalConfig, config);

    // 确保配置目录存在
    this.ensureConfigDir();

    // 写入合并后的配置
    fs.writeFileSync(this.configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');

    return backupFileName;
  }

  /**
   * 解析 cmrm 配置文件
   * 读取 ~/.cmrm/settings.json 内容
   *
   * @return 配置对象，文件不存在或解析失败返回 null
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private parseCmrmSettings(): any | null {
    // 配置文件不存在 - 返回 null
    if (!fs.existsSync(this.cmrmSettingsPath)) {
      return null;
    }
    // 配置文件存在 - 读取解析
    else {
      try {
        const content = fs.readFileSync(this.cmrmSettingsPath, 'utf-8');
        return JSON.parse(content);
      }
      // 解析失败 - 返回 null
      catch (error) {
        return null;
      }
    }
  }

  /**
   * 转换旧格式配置到新格式
   * 将 ModelConfig 格式转换为 UnifiedModelConfig
   *
   * @param oldConfig - 旧格式配置（ModelConfig）
   * @return 新格式配置（UnifiedModelConfig）
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private convertOldToNew(oldConfig: any): UnifiedModelConfig {
    return {
      name: oldConfig.name || oldConfig.ANTHROPIC_MODEL,
      model: oldConfig.ANTHROPIC_MODEL,
      apiKey: oldConfig.ANTHROPIC_AUTH_TOKEN,
      baseUrl: oldConfig.ANTHROPIC_BASE_URL,
      haikuModel: oldConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL,
      sonnetModel: oldConfig.ANTHROPIC_DEFAULT_SONNET_MODEL,
      opusModel: oldConfig.ANTHROPIC_DEFAULT_OPUS_MODEL,
    };
  }

  /**
   * 从配置对象中提取模型列表
   * 支持新格式和旧格式的兼容读取
   *
   * @param settings - 配置对象
   * @return 模型配置数组
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private extractModelsFromSettings(settings: any): UnifiedModelConfig[] {
    // 新格式：tools.claude.modes 存在
    if (settings.tools && settings.tools.claude && settings.tools.claude.modes) {
      return settings.tools.claude.modes;
    }
    // 旧格式：modes 字段存在（需要转换）
    else if (settings.modes) {
      return settings.modes.map((mode: any) => this.convertOldToNew(mode));
    }
    // 无模型配置 - 返回空数组
    else {
      return [];
    }
  }

  /**
   * 获取用户保存的模型列表
   * 从 ~/.cmrm/settings.json 的 tools.claude.modes 读取
   *
   * @return 保存的模型配置数组
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  getSavedModels(): UnifiedModelConfig[] {
    // 解析 cmrm 配置
    const settings = this.parseCmrmSettings();

    // 配置文件不存在或解析失败 - 返回空数组
    if (!settings) {
      return [];
    }
    // 配置文件有效 - 提取模型列表
    else {
      return this.extractModelsFromSettings(settings);
    }
  }

  /**
   * 确保 cmrm 配置目录存在
   * 不存在则创建目录
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private ensureCmrmDir(): void {
    const cmrmDir = path.dirname(this.cmrmSettingsPath);

    // 目录不存在 - 创建目录
    if (!fs.existsSync(cmrmDir)) {
      fs.mkdirSync(cmrmDir, { recursive: true });
    }
    // 目录已存在 - 无需操作
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
   * @date 2026-04-27
   */
  private ensureSettingsStructure(settings: any): any {
    // 确保 tools 对象存在
    if (!settings.tools) {
      settings.tools = {};
    }
    // tools 已存在 - 保持
    else {
      // tools 对象已存在
    }

    // 确保 claude 工具配置存在
    if (!settings.tools.claude) {
      settings.tools.claude = { modes: [] };
    }
    // claude 已存在 - 保持
    else {
      // claude 配置已存在
    }

    // 确保 modes 数组存在
    if (!settings.tools.claude.modes) {
      settings.tools.claude.modes = [];
    }
    // modes 已存在 - 保持
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
   * @date 2026-04-27
   */
  private findExistingIndex(modes: UnifiedModelConfig[], config: UnifiedModelConfig): number {
    return modes.findIndex((m: UnifiedModelConfig) => m.name === config.name);
  }

  /**
   * 读取或创建 cmrm settings
   * 文件存在则读取，不存在则创建空结构
   *
   * @return 配置对象
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private loadOrCreateSettings(): any {
    // 配置文件存在 - 读取内容
    if (fs.existsSync(this.cmrmSettingsPath)) {
      const content = fs.readFileSync(this.cmrmSettingsPath, 'utf-8');
      return JSON.parse(content);
    }
    // 配置文件不存在 - 返回空对象
    else {
      return {};
    }
  }

  /**
   * 保存模型配置到 cmrm 存储
   * 写入到 ~/.cmrm/settings.json 的 tools.claude.modes
   *
   * @param config - 要保存的模型配置
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  saveModel(config: UnifiedModelConfig): void {
    // 确保 cmrm 配置目录存在
    this.ensureCmrmDir();

    // 读取或创建配置
    let settings = this.loadOrCreateSettings();

    // 确保配置结构完整
    settings = this.ensureSettingsStructure(settings);

    // 查找已存在的配置索引
    const existingIndex = this.findExistingIndex(settings.tools.claude.modes, config);

    // 配置已存在 - 替换更新
    if (existingIndex >= 0) {
      settings.tools.claude.modes[existingIndex] = config;
    }
    // 配置不存在 - 添加新配置
    else {
      settings.tools.claude.modes.push(config);
    }

    // 写入配置文件
    fs.writeFileSync(this.cmrmSettingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  }

  /**
   * 删除保存的模型配置
   * 从 ~/.cmrm/settings.json 的 tools.claude.modes 中删除指定配置
   *
   * @param configName - 要删除的配置名称
   * @return 删除成功返回 true，配置不存在返回 false
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  removeModel(configName: string): boolean {
    // 配置文件不存在 - 无法删除
    if (!fs.existsSync(this.cmrmSettingsPath)) {
      return false;
    }

    // 读取配置
    const settings = this.loadOrCreateSettings();

    // 确保结构完整
    if (!settings.tools || !settings.tools.claude || !settings.tools.claude.modes) {
      return false;
    }

    // 查找要删除的配置索引
    const index = settings.tools.claude.modes.findIndex(
      (m: UnifiedModelConfig) => m.name === configName
    );

    // 配置不存在 - 返回 false
    if (index < 0) {
      return false;
    }

    // 删除配置
    settings.tools.claude.modes.splice(index, 1);

    // 写入配置文件
    fs.writeFileSync(this.cmrmSettingsPath, JSON.stringify(settings, null, 2), 'utf-8');

    return true;
  }

  /**
   * 验证配置是否有效
   * 检查必填字段是否完整
   *
   * @param config - 要验证的配置
   * @return 验证通过返回 true，否则返回 false
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  validateConfig(config: UnifiedModelConfig): boolean {
    // 验证 model 字段
    if (!config.model || config.model.trim() === '') {
      return false;
    }
    // model 有效 - 继续验证 apiKey
    else {
      // 验证 apiKey 字段
      if (!config.apiKey || config.apiKey.trim() === '') {
        return false;
      }
      // apiKey 有效 - 继续验证 baseUrl
      else {
        // 验证 baseUrl 字段
        if (!config.baseUrl || config.baseUrl.trim() === '') {
          return false;
        }
        // baseUrl 有效 - 验证通过
        else {
          return true;
        }
      }
    }
  }

  /**
   * 获取配置的重试次数
   * 从 ~/.cmrm/settings.json 的 retry 字段读取
   *
   * @return 重试次数，默认 3
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  getRetryCount(): number {
    const settings = this.parseCmrmSettings();
    if (settings && typeof settings.retry === 'number' && settings.retry > 0) {
      return settings.retry;
    }
    return 3;
  }
}