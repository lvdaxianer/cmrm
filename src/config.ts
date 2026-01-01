/**
 * 配置管理模块
 * 负责读取和写入 ~/.cmrm/settings.json 和 ~/.claude/settings.json 配置文件
 *
 * @author lvdaxianer
 * @date 2025-01-01
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Settings, ModelConfig, ClaudeConfig, ClaudeEnvConfig } from './types';

/**
 * 配置管理类
 * 提供配置文件的读取、写入功能
 */
export class ConfigManager {
  /** settings.json 文件路径 */
  private readonly settingsPath: string;
  /** Claude 配置文件路径 */
  private readonly claudeConfigPath: string;

  /**
   * 构造函数
   * 初始化配置文件路径
   */
  constructor() {
    this.settingsPath = path.join(os.homedir(), '.cmrm', 'settings.json');
    this.claudeConfigPath = path.join(os.homedir(), '.claude', 'settings.json');
  }

  /**
   * 读取 settings.json 配置文件
   *
   * @return 配置对象，包含 modes 数组等信息
   * @throws 当文件不存在或解析失败时抛出错误
   * @author lvdaxianer
   */
  readSettings(): Settings {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(this.settingsPath)) {
        throw new Error(`Settings file not found: ${this.settingsPath}`);
      }
      const content = fs.readFileSync(this.settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取可用的模型列表
   *
   * @return 模型配置数组，如果 modes 不存在则返回空数组
   * @author lvdaxianer
   */
  getAvailableModels(): ModelConfig[] {
    const settings = this.readSettings();
    return settings.modes || [];
  }

  /**
   * 读取 Claude 当前配置
   * Claude 配置文件必须存在，否则抛出错误
   *
   * @return Claude 配置对象
   * @throws 当文件不存在或解析失败时抛出错误
   * @author lvdaxianer
   */
  readClaudeConfig(): ClaudeConfig {
    try {
      // 检查文件是否存在，不存在则直接报错
      if (!fs.existsSync(this.claudeConfigPath)) {
        throw new Error(`Claude config file not found: ${this.claudeConfigPath}`);
      }
      const content = fs.readFileSync(this.claudeConfigPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read Claude config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 写入 Claude 配置文件
   * 使用合并模式，只更新 env 对象中的指定属性，保留其他已有属性
   *
   * @param envConfig - 要写入的环境变量配置对象
   * @throws 当写入失败时抛出错误
   * @author lvdaxianer
   */
  writeClaudeConfig(envConfig: ClaudeEnvConfig): void {
    try {
      const currentConfig = this.readClaudeConfig();
      // 确保 env 对象存在
      if (!currentConfig.env) {
        currentConfig.env = {};
      }
      // 合并 env 配置，新的配置会覆盖同名属性，其他属性保持不变
      const newEnv = { ...currentConfig.env, ...envConfig };
      currentConfig.env = newEnv;

      fs.writeFileSync(this.claudeConfigPath, JSON.stringify(currentConfig, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write Claude config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 验证模型配置的必填属性
   *
   * @param config - 要验证的模型配置
   * @return 如果验证通过返回 true，否则返回 false
   * @author lvdaxianer
   */
  validateModelConfig(config: ModelConfig): boolean {
    // 验证必填属性：ANTHROPIC_MODEL、ANTHROPIC_AUTH_TOKEN、ANTHROPIC_BASE_URL
    if (!config.ANTHROPIC_MODEL || config.ANTHROPIC_MODEL.trim() === '') {
      return false;
    }
    if (!config.ANTHROPIC_AUTH_TOKEN || config.ANTHROPIC_AUTH_TOKEN.trim() === '') {
      return false;
    }
    if (!config.ANTHROPIC_BASE_URL || config.ANTHROPIC_BASE_URL.trim() === '') {
      return false;
    }
    return true;
  }

  /**
   * 获取当前配置的模型信息
   *
   * @return 当前模型配置的摘要字符串，如果未配置则返回 undefined
   * @author lvdaxianer
   */
  getCurrentModel(): string | undefined {
    const config = this.readClaudeConfig();
    const env = config.env || {};
    const model = env.ANTHROPIC_MODEL;
    const haiku = env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
    const sonnet = env.ANTHROPIC_DEFAULT_SONNET_MODEL;
    const opus = env.ANTHROPIC_DEFAULT_OPUS_MODEL;

    const parts: string[] = [];
    if (model) parts.push(`Model: ${model}`);
    if (haiku) parts.push(`Haiku: ${haiku}`);
    if (sonnet) parts.push(`Sonnet: ${sonnet}`);
    if (opus) parts.push(`Opus: ${opus}`);

    if (parts.length > 0) {
      return parts.join(' | ');
    }
    return undefined;
  }

  /**
   * 检查配置文件是否存在
   *
   * @return 如果配置文件存在返回 true，否则返回 false
   * @author lvdaxianer
   */
  hasSettingsFile(): boolean {
    return fs.existsSync(this.settingsPath);
  }

  /**
   * 初始化配置文件
   * 创建默认的 settings.json 文件
   *
   * @throws 当创建目录或写入文件失败时抛出错误
   * @author lvdaxianer
   */
  initializeSettings(): void {
    try {
      const dir = path.dirname(this.settingsPath);
      // 如果目录不存在，创建目录
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 写入默认配置
      const defaultSettings: Settings = {
        modes: [
          {
            ANTHROPIC_MODEL: 'claude-sonnet-4-5-20250514',
            ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4-5-20250514',
            ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-sonnet-4-5-20250514',
            ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-opus-4-5-20251101',
            ANTHROPIC_AUTH_TOKEN: 'sk-ant-xxx',
            ANTHROPIC_BASE_URL: 'https://api.anthropic.com'
          }
        ]
      };
      fs.writeFileSync(this.settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to initialize settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检查模型是否已存在
   * 通过 ANTHROPIC_MODEL 和 ANTHROPIC_BASE_URL 判断是否重复
   *
   * @param model - 要检查的模型配置
   * @return 如果模型已存在返回 true，否则返回 false
   * @author lvdaxianer
   */
  modelExists(model: ModelConfig): boolean {
    const models = this.getAvailableModels();
    return models.some(
      m =>
        m.ANTHROPIC_MODEL === model.ANTHROPIC_MODEL &&
        m.ANTHROPIC_BASE_URL === model.ANTHROPIC_BASE_URL
    );
  }

  /**
   * 添加新的模型配置
   *
   * @param model - 要添加的模型配置
   * @throws 当模型已存在或写入失败时抛出错误
   * @author lvdaxianer
   */
  addModel(model: ModelConfig): void {
    try {
      const settings = this.readSettings();
      if (!settings.modes) {
        settings.modes = [];
      }
      settings.modes.push(model);
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to add model: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
