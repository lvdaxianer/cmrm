/**
 * OpenCode 工具适配器
 * 实现 OpenCode CLI 工具的 API key 管理
 *
 * **重要说明：OpenCode 不支持持久化默认模型**
 *
 * OpenCode 的架构设计：
 * - `~/.local/share/opencode/auth.json`: 存储官方 provider 的 API key
 * - `~/.config/opencode/opencode.json`: MCP 配置 + 自定义 provider
 * - 模型选择在 TUI session 中临时记录，不持久化全局默认模型
 *
 * 因此 cmrm 对 OpenCode 的功能：
 * - ✅ 添加模型：写入 auth.json 添加 API key（新 provider 可在 OpenCode TUI 中选择）
 * - ⚠️ 切换模型：仅更新 auth.json，但用户需要在 OpenCode TUI 中手动选择模型
 *   或使用 CLI 参数：`opencode -m provider/model-name`
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ToolAdapter, UnifiedModelConfig } from './types';

/**
 * OpenCode auth.json 配置结构
 * 存储官方 provider 的 API key
 */
interface OpenCodeAuthConfig {
  /** provider 配置映射 */
  [providerKey: string]: {
    /** 类型（api） */
    type: 'api';
    /** API Key */
    key: string;
  };
}

/**
 * Provider 映射表
 * 将 cmrm 的 provider 名称映射到 OpenCode 的 provider 键名
 */
const PROVIDER_MAPPING: Record<string, string> = {
  // 国外提供商
  'openai': 'openai',
  'anthropic': 'anthropic',
  'openrouter': 'openrouter',
  'deepseek': 'deepseek',
  'google': 'google',
  // 国内提供商 - OpenCode 官方支持的名称
  'zhipu': 'zhipuai-coding-plan',
  'minimax': 'minimax-cn-coding-plan',
  'moonshot': 'kimi25',
  'alibaba': 'qwen',
  'baidu': 'baidu',
};

/**
 * OpenCode 工具适配器类
 * 管理 ~/.local/share/opencode/auth.json 配置文件
 */
export class OpenCodeAdapter implements ToolAdapter {
  /** 工具名称 */
  name = 'opencode';

  /** 工具显示名称 */
  displayName = 'OpenCode';

  /** 配置文件路径 */
  configPath: string;

  /** 配置文件格式 */
  configFormat = 'json' as const;

  /** cmrm 配置文件路径 */
  private cmrmSettingsPath: string;

  /** cmrm 备份目录 */
  private cmrmBackupDir: string;

  /**
   * 构造函数
   * 初始化配置文件路径
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  constructor() {
    // OpenCode 官方 provider 的 auth.json 路径
    this.configPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'auth.json');
    this.cmrmSettingsPath = path.join(os.homedir(), '.cmrm', 'settings.json');
    this.cmrmBackupDir = path.join(os.homedir(), '.local', 'share', 'opencode', '.cmrm');
  }

  /**
   * 解析 JSON 配置文件
   * 读取并解析 auth.json 内容
   *
   * @return 解析后的配置对象，文件不存在或解析失败返回 null
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private parseJsonConfig(): OpenCodeAuthConfig | null {
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
   * 从 auth.json 配置构建模型配置列表
   * 提取所有有效 provider 的配置
   *
   * @param config - 解析后的 JSON 配置对象
   * @return 模型配置数组
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private buildModelConfigsFromAuth(config: OpenCodeAuthConfig): UnifiedModelConfig[] {
    const configs: UnifiedModelConfig[] = [];

    // 无配置 - 返回空数组
    if (!config) {
      return configs;
    }
    // 有配置 - 遍历提取
    else {
      // 遍历所有 provider
      for (const [providerKey, providerConfig] of Object.entries(config)) {
        // provider 配置有效且有 key - 提取信息
        if (providerConfig && providerConfig.type === 'api' && providerConfig.key) {
          // 构建模型配置
          // OpenCode auth.json 只存储 API key，模型名称需要从 cmrm settings 中获取
          const modelConfig: UnifiedModelConfig = {
            name: providerKey,
            model: providerKey, // 使用 provider key 作为模型名称
            apiKey: providerConfig.key,
            baseUrl: '', // auth.json 不存储 baseUrl
            provider: providerKey,
          };

          configs.push(modelConfig);
        }
        // provider 配置无效 - 继续下一个
        else {
          continue;
        }
      }

      return configs;
    }
  }

  /**
   * 读取当前生效的模型配置
   * 从 ~/.local/share/opencode/auth.json 读取第一个有效配置
   *
   * @return 当前模型配置，未配置则返回 null
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  readCurrentModel(): UnifiedModelConfig | null {
    // 解析 JSON 配置
    const config = this.parseJsonConfig();

    // 配置文件不存在或解析失败 - 返回 null
    if (!config) {
      return null;
    }
    // 配置文件有效 - 提取第一个配置
    else {
      const configs = this.buildModelConfigsFromAuth(config);

      // 有配置 - 返回第一个
      if (configs.length > 0) {
        return configs[0];
      }
      // 无配置 - 返回 null
      else {
        return null;
      }
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
   * 确保 cmrm 备份目录存在
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private ensureBackupDir(): void {
    // 目录不存在 - 创建目录
    if (!fs.existsSync(this.cmrmBackupDir)) {
      fs.mkdirSync(this.cmrmBackupDir, { recursive: true });
    }
    // 目录已存在 - 无需操作
    else {
      // 目录已存在，无需创建
    }
  }

  /**
   * 备份 OpenCode 配置文件
   * 使用简洁的时间戳格式：yyyyMMddHHmm
   *
   * @return 备份文件名（无备份返回空字符串）
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private backupAuthConfig(): string {
    // 配置文件不存在 - 无需备份
    if (!fs.existsSync(this.configPath)) {
      return '';
    }
    // 配置文件存在 - 创建备份
    else {
      // 确保备份目录存在
      this.ensureBackupDir();

      // 生成备份文件名（简洁时间戳格式：yyyyMMddHHmm）
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');

      const timestamp = `${year}${month}${day}${hour}${minute}`;
      const backupFileName = `auth-${timestamp}.json`;
      const backupFilePath = path.join(this.cmrmBackupDir, backupFileName);

      // 复制配置文件到备份目录
      fs.copyFileSync(this.configPath, backupFilePath);

      return backupFileName;
    }
  }

  /**
   * 将 cmrm provider 名称映射到 OpenCode provider 键名
   *
   * @param providerName - cmrm 的 provider 名称
   * @return OpenCode 的 provider 键名
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private mapProviderKey(providerName: string): string {
    // 查找映射表
    const mappedKey = PROVIDER_MAPPING[providerName.toLowerCase()];

    // 找到映射 - 返回映射后的键名
    if (mappedKey) {
      return mappedKey;
    }
    // 未找到映射 - 返回原始名称
    else {
      return providerName;
    }
  }

  /**
   * 写入模型配置
   * 流程：备份 → 写入 auth.json
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
    const backupFileName = this.backupAuthConfig();

    // 读取现有配置或创建新配置
    let authConfig: OpenCodeAuthConfig;

    // 配置文件存在 - 读取并合并
    if (fs.existsSync(this.configPath)) {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      authConfig = JSON.parse(content);
    }
    // 配置文件不存在 - 创建空配置
    else {
      authConfig = {};
    }

    // 获取 provider 键名（映射到 OpenCode 官方名称）
    const providerKey = this.mapProviderKey(config.provider || config.name || config.model);

    // 写入/更新 provider 配置
    authConfig[providerKey] = {
      type: 'api',
      key: config.apiKey,
    };

    // 写入配置文件
    fs.writeFileSync(this.configPath, JSON.stringify(authConfig, null, 2), 'utf-8');

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