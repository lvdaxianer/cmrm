/**
 * OpenCode 工具适配器
 * 实现 OpenCode CLI 工具的配置管理
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as TOML from '@iarna/toml';
import { ToolAdapter, UnifiedModelConfig } from './types';
import { backupConfig, mergeTomlConfig, createDefaultTomlConfig } from '../utils/backup';

/**
 * Provider 信息结构
 * 存储从 TOML 配置中提取的 provider 数据
 */
interface ProviderInfo {
  /** Provider 名称 */
  name: string;
  /** API Key */
  apiKey: string;
  /** Base URL */
  baseUrl: string;
}

/**
 * OpenCode 工具适配器类
 * 管理 ~/.config/opencode/config.toml 配置文件
 */
export class OpenCodeAdapter implements ToolAdapter {
  /** 工具名称 */
  name = 'opencode';

  /** 工具显示名称 */
  displayName = 'OpenCode';

  /** 配置文件路径 */
  configPath: string;

  /** 配置文件格式 */
  configFormat = 'toml' as const;

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
    this.configPath = path.join(os.homedir(), '.config', 'opencode', 'config.toml');
    this.cmrmSettingsPath = path.join(os.homedir(), '.cmrm', 'settings.json');
  }

  /**
   * 解析 TOML 配置文件
   * 读取并解析 config.toml 内容
   *
   * @return 解析后的配置对象，文件不存在或解析失败返回 null
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private parseTomlConfig(): any | null {
    // 配置文件不存在 - 返回 null
    if (!fs.existsSync(this.configPath)) {
      return null;
    }
    // 配置文件存在 - 读取解析
    else {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        return TOML.parse(content);
      }
      // 解析失败 - 返回 null
      catch (error) {
        return null;
      }
    }
  }

  /**
   * 查找第一个有效的 Provider
   * 遍历 providers 对象找到有 api_key 的 provider
   *
   * @param providers - providers 配置对象
   * @return Provider 信息，无有效 provider 返回 null
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private findFirstProvider(providers: Record<string, any>): ProviderInfo | null {
    // 无 providers 配置 - 返回 null
    if (!providers) {
      return null;
    }
    // 有 providers - 遍历查找
    else {
      // 遍历所有 provider 查找有效配置
      for (const [providerName, providerConfig] of Object.entries(providers)) {
        // provider 配置有效且有 api_key - 提取信息
        if (providerConfig && providerConfig.api_key) {
          const info: ProviderInfo = {
            name: providerName,
            apiKey: providerConfig.api_key as string,
            baseUrl: providerConfig.base_url as string || '',
          };

          return info;
        }
        // provider 配置无效 - 继续查找下一个
        else {
          continue;
        }
      }

      // 未找到有效 provider - 返回 null
      return null;
    }
  }

  /**
   * 从 TOML 配置构建模型配置对象
   * 提取 default_model 和 provider 信息
   *
   * @param config - 解析后的 TOML 配置对象
   * @return 模型配置对象，无配置返回 null
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private buildModelConfigFromToml(config: any): UnifiedModelConfig | null {
    // 获取 default_model
    const defaultModel = config.default_model as string;

    // 无 default_model - 返回 null
    if (!defaultModel) {
      return null;
    }
    // 有 default_model - 提取 provider 信息
    else {
      // 从 providers 中查找配置
      const providers = config.providers as Record<string, any> || {};
      const providerInfo = this.findFirstProvider(providers);

      // 未找到 provider - 返回 null
      if (!providerInfo) {
        return null;
      }
      // 找到 provider - 构建配置对象
      else {
        const modelConfig: UnifiedModelConfig = {
          model: defaultModel,
          apiKey: providerInfo.apiKey,
          baseUrl: providerInfo.baseUrl,
          provider: providerInfo.name,
        };

        return modelConfig;
      }
    }
  }

  /**
   * 读取当前生效的模型配置
   * 从 ~/.config/opencode/config.toml 读取
   *
   * @return 当前模型配置，未配置则返回 null
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  readCurrentModel(): UnifiedModelConfig | null {
    // 解析 TOML 配置
    const config = this.parseTomlConfig();

    // 配置文件不存在或解析失败 - 返回 null
    if (!config) {
      return null;
    }
    // 配置文件有效 - 构建模型配置
    else {
      return this.buildModelConfigFromToml(config);
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
    // 确保配置目录存在
    this.ensureConfigDir();

    // 备份当前配置（如果存在）
    const backupFileName = backupConfig(this.configPath);

    // 配置文件不存在 - 创建默认配置
    if (!fs.existsSync(this.configPath)) {
      const defaultContent = createDefaultTomlConfig(config);
      fs.writeFileSync(this.configPath, defaultContent, 'utf-8');
      return backupFileName;
    }
    // 配置文件存在 - 合并配置
    else {
      // 读取当前配置
      const originalContent = fs.readFileSync(this.configPath, 'utf-8');

      // 合并配置
      const mergedContent = mergeTomlConfig(originalContent, config);

      // 写入合并后的配置
      fs.writeFileSync(this.configPath, mergedContent, 'utf-8');

      return backupFileName;
    }
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
   * 从配置对象中提取 opencode 模型列表
   * 仅支持新格式读取
   *
   * @param settings - 配置对象
   * @return 模型配置数组
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private extractModelsFromSettings(settings: any): UnifiedModelConfig[] {
    // 新格式存在 - 提取 modes
    if (settings.tools && settings.tools.opencode && settings.tools.opencode.modes) {
      return settings.tools.opencode.modes;
    }
    // 无模型配置 - 返回空数组
    else {
      return [];
    }
  }

  /**
   * 获取用户保存的模型列表
   * 从 ~/.cmrm/settings.json 的 tools.opencode.modes 读取
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
   * 创建缺失的 tools.opencode.modes 结构
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

    // 确保 opencode 工具配置存在
    if (!settings.tools.opencode) {
      settings.tools.opencode = { modes: [] };
    }
    // opencode 已存在 - 保持
    else {
      // opencode 配置已存在
    }

    // 确保 modes 数组存在
    if (!settings.tools.opencode.modes) {
      settings.tools.opencode.modes = [];
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
   * 写入到 ~/.cmrm/settings.json 的 tools.opencode.modes
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
    const existingIndex = this.findExistingIndex(settings.tools.opencode.modes, config);

    // 配置已存在 - 替换更新
    if (existingIndex >= 0) {
      settings.tools.opencode.modes[existingIndex] = config;
    }
    // 配置不存在 - 添加新配置
    else {
      settings.tools.opencode.modes.push(config);
    }

    // 写入配置文件
    fs.writeFileSync(this.cmrmSettingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  }

  /**
   * 验证配置是否有效
   * 检查必填字段是否完整（OpenCode 需要额外的 provider 字段）
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
        // baseUrl 有效 - 继续验证 provider
        else {
          // 验证 provider 字段（OpenCode 特有）
          if (!config.provider || config.provider.trim() === '') {
            return false;
          }
          // provider 有效 - 验证通过
          else {
            return true;
          }
        }
      }
    }
  }
}