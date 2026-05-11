/**
 * 配置管理模块
 * 负责读取和写入 ~/.cmrm/settings.json 配置文件
 * 支持多工具配置存储和旧格式迁移
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import * as fs from 'fs';
import * as os from 'os';
import { Settings, UnifiedModelConfig } from './types';
import { normalizeModelIdentity } from './cli/model-identity';
import { ConfigBackup } from './config-backup';
import {
  getWindowsSettingsPath,
  getUnixSettingsPath,
  readAndParseFile,
  isOldFormat,
  migrateOldFormat,
  ensureCmrmDir,
  loadOrCreateSettings,
  ensureToolStructure,
  findExistingIndex,
  updateToolModes,
  prepareAndUpdateSettings,
  buildDefaultSettings,
  ensureConfigDir,
} from './config-helpers';

/** JSON 格式化缩进空格数 */
const JSON_INDENT = 2;

/**
 * 配置管理类
 * 提供配置文件的读取、写入和迁移功能
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export class ConfigManager {
  /** settings.json 文件路径 */
  private readonly settingsPath: string;

  /** 配置备份器 */
  private readonly backup: ConfigBackup;

  /**
   * 构造函数
   * 初始化配置文件路径
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  constructor() {
    const home = os.homedir();

    // 条件: Windows 平台且路径末尾无分隔符，使用 Windows 路径格式
    if (process.platform === 'win32' && !home.endsWith('\\') && !home.endsWith('/')) {
      this.settingsPath = getWindowsSettingsPath(home);
    }
    // 替代: Unix 平台或路径已有分隔符，使用 path.join 拼接
    else {
      this.settingsPath = getUnixSettingsPath(home);
    }

    this.backup = new ConfigBackup(this.settingsPath);
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
      const parsed = readAndParseFile(this.settingsPath);

      // 条件: 旧格式配置，需要迁移
      if (isOldFormat(parsed)) {
        const migrated = migrateOldFormat(parsed);
        this.saveSettings(migrated);
        return migrated;
      }
      // 替代: 新格式配置，直接返回
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
      const hasToolConfig = settings.tools && settings.tools[toolName] && settings.tools[toolName].modes;

      // 条件: 新格式结构存在且有 modes，返回模型列表
      if (hasToolConfig) {
        return settings.tools[toolName].modes;
      }
      // 替代: 无模型配置，返回空数组
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
   * 保存模型配置到指定工具
   *
   * @param toolName - 工具名称
   * @param config - 模型配置
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  saveToolModel(toolName: string, config: UnifiedModelConfig): void {
    try {
      const normalizedConfig = normalizeModelIdentity(config);
      const settings = prepareAndUpdateSettings(this.settingsPath, toolName, normalizedConfig);

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
   * 初始化配置文件
   * 创建默认的 settings.json 文件
   *
   * @throws 当创建目录或写入文件失败时抛出错误
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  initializeSettings(): void {
    try {
      const dir = require('path').dirname(this.settingsPath);
      ensureConfigDir(dir);

      // 构建默认配置结构
      const defaultSettings = buildDefaultSettings();

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
   * 确保 settings.json 存在
   * 首次启动时自动初始化默认配置，已存在时保持不变
   *
   * @return true 表示本次调用创建了新文件，false 表示文件原本已存在
   * @author lvdaxianerplus
   * @date 2026-05-10
   */
  ensureSettingsFile(): boolean {
    // 条件: 配置文件已存在，无需创建
    if (this.hasSettingsFile()) {
      return false;
    }
    // 替代: 配置文件不存在，初始化默认配置
    else {
      this.initializeSettings();
      return true;
    }
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
    ensureCmrmDir(this.settingsPath);
    this.backup.backupSettings();
    fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, JSON_INDENT), 'utf-8');
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
