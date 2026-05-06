/**
 * 配置管理模块
 * 负责读取和写入 ~/.cmrm/settings.json 配置文件
 * 支持多工具配置存储和旧格式迁移
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Settings, OldSettings, ToolConfig, UnifiedModelConfig, ModelConfig } from './types';

/**
 * 配置管理类
 * 提供配置文件的读取、写入和迁移功能
 */
export class ConfigManager {
  /** settings.json 文件路径 */
  private readonly settingsPath: string;

  /**
   * 构造函数
   * 初始化配置文件路径
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  constructor() {
    this.settingsPath = path.join(os.homedir(), '.cmrm', 'settings.json');
  }

  /**
   * 检查配置文件是否存在
   *
   * @return 如果配置文件存在返回 true，否则返回 false
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  hasSettingsFile(): boolean {
    return fs.existsSync(this.settingsPath);
  }

  /**
   * 读取并解析配置文件内容
   * 文件不存在或解析失败时抛出错误
   *
   * @return 解析后的原始配置对象
   * @throws 文件不存在或解析失败
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private readAndParseFile(): any {
    // 文件不存在 - 抛出错误
    if (!fs.existsSync(this.settingsPath)) {
      throw new Error(`Settings file not found: ${this.settingsPath}`);
    }
    // 文件存在 - 读取解析
    else {
      const content = fs.readFileSync(this.settingsPath, 'utf-8');
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
   * @date 2026-04-27
   */
  private isOldFormat(parsed: any): boolean {
    // 有 modes 但无 tools - 是旧格式
    if (parsed.modes && !parsed.tools) {
      return true;
    }
    // 有 tools 或无 modes - 是新格式
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
   * @date 2026-04-27
   */
  private migrateOldFormat(oldSettings: OldSettings): Settings {
    // 构建新格式配置
    const newSettings: Settings = {
      tools: {
        claude: {
          modes: oldSettings.modes.map((mode: ModelConfig) => ({
            name: mode.ANTHROPIC_MODEL,
            model: mode.ANTHROPIC_MODEL,
            apiKey: mode.ANTHROPIC_AUTH_TOKEN,
            baseUrl: mode.ANTHROPIC_BASE_URL,
            haikuModel: mode.ANTHROPIC_DEFAULT_HAIKU_MODEL,
            sonnetModel: mode.ANTHROPIC_DEFAULT_SONNET_MODEL,
            opusModel: mode.ANTHROPIC_DEFAULT_OPUS_MODEL,
          })),
        },
        opencode: {
          modes: [],
        },
      },
    };

    // 写入新格式配置（迁移,自动备份）
    this.saveSettings(newSettings);

    return newSettings;
  }

  /**
   * 读取 settings.json 配置文件（新格式）
   * 自动迁移旧格式到新格式
   *
   * @return 配置对象
   * @throws 当文件不存在或解析失败时抛出错误
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  readSettings(): Settings {
    try {
      // 读取并解析文件
      const parsed = this.readAndParseFile();

      // 检查是否是旧格式，需要迁移
      if (this.isOldFormat(parsed)) {
        return this.migrateOldFormat(parsed as OldSettings);
      }
      // 新格式 - 直接返回
      else {
        return parsed as Settings;
      }
    }
    // 处理异常
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read settings: ${message}`);
    }
  }

  /**
   * 获取指定工具的模型列表
   *
   * @param toolName - 工具名称
   * @return 模型配置数组，不存在则返回空数组
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  getToolModels(toolName: string): UnifiedModelConfig[] {
    try {
      const settings = this.readSettings();

      // 新格式结构存在且有 modes - 返回 modes
      if (settings.tools && settings.tools[toolName] && settings.tools[toolName].modes) {
        return settings.tools[toolName].modes;
      }
      // 无模型配置 - 返回空数组
      else {
        return [];
      }
    }
    // 文件不存在返回空数组
    catch (error) {
      return [];
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
    const cmrmDir = path.dirname(this.settingsPath);

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
   * 读取或创建配置对象
   * 文件存在则读取，不存在则创建默认结构
   *
   * @return 配置对象
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private loadOrCreateSettings(): Settings {
    // 配置文件存在 - 读取内容
    if (fs.existsSync(this.settingsPath)) {
      return this.readSettings();
    }
    // 配置文件不存在 - 创建默认结构
    else {
      const defaultSettings: Settings = {
        tools: {
          claude: { modes: [] },
          opencode: { modes: [] },
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
   * @date 2026-04-27
   */
  private ensureToolStructure(settings: Settings, toolName: string): Settings {
    // 确保 tools 对象存在
    if (!settings.tools) {
      settings.tools = {};
    }
    // tools 已存在 - 保持
    else {
      // tools 对象已存在
    }

    // 确保工具配置存在
    if (!settings.tools[toolName]) {
      settings.tools[toolName] = { modes: [] };
    }
    // 工具配置已存在 - 保持
    else {
      // 工具配置已存在
    }

    // 确保 modes 数组存在
    if (!settings.tools[toolName].modes) {
      settings.tools[toolName].modes = [];
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
   * 更新工具的模型配置列表
   * 配置已存在则替换，不存在则添加
   *
   * @param settings - 配置对象
   * @param toolName - 工具名称
   * @param config - 新配置
   * @return 更新后的配置对象
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private updateToolModes(settings: Settings, toolName: string, config: UnifiedModelConfig): Settings {
    // 查找已存在的配置索引
    const existingIndex = this.findExistingIndex(settings.tools[toolName].modes, config);

    // 配置已存在 - 替换更新
    if (existingIndex >= 0) {
      settings.tools[toolName].modes[existingIndex] = config;
    }
    // 配置不存在 - 添加新配置
    else {
      settings.tools[toolName].modes.push(config);
    }

    return settings;
  }

  /**
   * 保存模型配置到指定工具
   *
   * @param toolName - 工具名称
   * @param config - 模型配置
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  saveToolModel(toolName: string, config: UnifiedModelConfig): void {
    try {
      // 读取或创建配置
      let settings = this.loadOrCreateSettings();

      // 确保工具配置结构存在
      settings = this.ensureToolStructure(settings, toolName);

      // 更新模型配置列表
      settings = this.updateToolModes(settings, toolName, config);

      // 保存配置(自动备份)
      this.saveSettings(settings);
    }
    // 处理异常
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to save tool model: ${message}`);
    }
  }

  /**
   * 创建默认 Claude 模型配置
   * 用于初始化配置文件时的示例配置
   *
   * @return 默认 Claude 模型配置对象
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private createDefaultClaudeMode(): UnifiedModelConfig {
    return {
      name: 'claude-sonnet-4-5',
      model: 'claude-sonnet-4-5-20250514',
      apiKey: 'sk-ant-xxx',
      baseUrl: 'https://api.anthropic.com',
      haikuModel: 'claude-haiku-4-5-20250514',
      sonnetModel: 'claude-sonnet-4-5-20250514',
      opusModel: 'claude-opus-4-5-20250514',
    };
  }

  /**
   * 初始化配置文件
   * 创建默认的 settings.json 文件
   *
   * @throws 当创建目录或写入文件失败时抛出错误
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  initializeSettings(): void {
    try {
      const dir = path.dirname(this.settingsPath);

      // 目录不存在 - 创建目录
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // 目录已存在 - 无需操作
      else {
        // 目录已存在，无需创建
      }

      // 构建默认配置结构
      const defaultSettings: Settings = {
        tools: {
          claude: {
            modes: [this.createDefaultClaudeMode()],
          },
          opencode: {
            modes: [],
          },
        },
      };

      // 保存配置(自动备份)
      this.saveSettings(defaultSettings);
    }
    // 处理异常
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize settings: ${message}`);
    }
  }

  /**
   * 备份当前 settings.json
   * 备份格式: settings.json.backup.YYYYMMDDNN (NN 为当天递增序号)
   *
   * @author lvdaxianerplus
   * @date 2026-05-06
   */
  private backupSettings(): void {
    // 文件不存在:无需备份
    if (!fs.existsSync(this.settingsPath)) {
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const backupDir = path.dirname(this.settingsPath);
    const baseName = `settings.json.backup.${dateStr}`;

    // 扫描当天已有备份,获取最大序号
    let maxSeq = -1;
    const pattern = new RegExp(`^settings\\.json\\.backup\\.${dateStr}(\\d{2})$`);

    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      for (const file of files) {
        const match = file.match(pattern);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    }

    const seqStr = String(maxSeq + 1).padStart(2, '0');
    const backupPath = path.join(backupDir, `${baseName}${seqStr}`);

    fs.copyFileSync(this.settingsPath, backupPath);
  }

  /**
   * 保存配置并自动备份
   * 所有写入 settings.json 的入口都应走此方法
   *
   * @param settings - 要保存的配置对象
   * @author lvdaxianerplus
   * @date 2026-05-06
   */
  saveSettings(settings: Settings): void {
    this.ensureCmrmDir();
    this.backupSettings();
    fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  }

  /**
   * 获取配置文件路径
   *
   * @return 配置文件路径
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  getSettingsPath(): string {
    return this.settingsPath;
  }
}