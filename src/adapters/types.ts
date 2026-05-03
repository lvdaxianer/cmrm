/**
 * 适配器类型定义文件
 * 定义了工具适配器接口和统一配置模型
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

/**
 * API 协议类型
 * 'anthropic' - Claude Messages API 格式（默认）
 * 'openai'    - OpenAI Chat Completions 格式（兼容代理）
 */
export type ApiType = 'anthropic' | 'openai';

/**
 * 统一配置模型接口
 * 用于标准化不同工具的模型配置
 */
export interface UnifiedModelConfig {
  // === 必填字段 ===
  /** 主模型名称 */
  model: string;
  /** API 密钥 */
  apiKey: string;
  /** API 端点 URL */
  baseUrl: string;

  // === 可选字段（工具特有）===
  /** 配置名称（用户命名） */
  name?: string;
  /** 提供商（openai, anthropic, openrouter 等） */
  provider?: string;
  /** API 协议类型，未设置时默认 'anthropic' */
  apiType?: ApiType;
  /** 别名列表（全局唯一，跨模型不可重复），用于 `cmrm switch <alias>` 快速切换 */
  aliases?: string[];

  // === Claude 特有字段 ===
  /** Haiku 模型名称 */
  haikuModel?: string;
  /** Sonnet 模型名称 */
  sonnetModel?: string;
  /** Opus 模型名称 */
  opusModel?: string;

  // === 工具特有扩展字段 ===
  [key: string]: any;
}

/**
 * 工具适配器接口
 * 定义统一的配置管理接口，每个工具实现具体适配器
 */
export interface ToolAdapter {
  // === 工具标识 ===
  /** 工具名称（kebab-case） */
  name: string;
  /** 工具显示名称 */
  displayName: string;

  // === 配置信息 ===
  /** 配置文件绝对路径 */
  configPath: string;
  /** 配置文件格式 */
  configFormat: 'json' | 'toml';

  // === 配置操作 ===
  /**
   * 读取当前生效的模型配置
   * @return 当前模型配置，未配置则返回 null
   */
  readCurrentModel(): UnifiedModelConfig | null;

  /**
   * 写入模型配置（备份 → Merge → 写入）
   * @param config - 要写入的模型配置
   * @return 备份文件名（用于显示）
   */
  writeModelConfig(config: UnifiedModelConfig): string;

  /**
   * 获取用户保存的模型列表
   * @return 保存的模型配置数组
   */
  getSavedModels(): UnifiedModelConfig[];

  /**
   * 保存模型配置到 cmrm 存储
   * @param config - 要保存的模型配置
   */
  saveModel(config: UnifiedModelConfig): void;

  /**
   * 删除保存的模型配置
   * @param configName - 要删除的配置名称
   * @return 删除成功返回 true，配置不存在返回 false
   */
  removeModel(configName: string): boolean;

  /**
   * 验证配置是否有效
   * @param config - 要验证的配置
   * @return 验证通过返回 true，否则返回 false
   */
  validateConfig(config: UnifiedModelConfig): boolean;
}

/**
 * 适配器注册表
 * 管理所有可用的工具适配器
 */
export interface AdapterRegistryInterface {
  /**
   * 注册适配器
   * @param adapter - 要注册的适配器实例
   */
  register(adapter: ToolAdapter): void;

  /**
   * 获取适配器
   * @param name - 工具名称
   * @return 适配器实例
   * @throws 工具不存在时抛出错误
   */
  getAdapter(name: string): ToolAdapter;

  /**
   * 获取所有适配器
   * @return 所有注册的适配器数组
   */
  getAllAdapters(): ToolAdapter[];

  /**
   * 获取所有工具名称
   * @return 所有注册的工具名称数组
   */
  getToolNames(): string[];
}