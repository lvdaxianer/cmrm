/**
 * 类型定义文件
 * 定义了项目所需的所有 TypeScript 接口和类型
 *
 * @author lvdaxianerplus
 * @date 2025-01-01
 */

// 导出适配器相关类型
export { UnifiedModelConfig, ToolAdapter, AdapterRegistryInterface, ApiType } from './adapters/types';

// 导入 UnifiedModelConfig 用于本地类型定义
import { UnifiedModelConfig } from './adapters/types';

/**
 * 模型配置项接口（旧格式，用于迁移兼容）
 * 用于描述一组模型的配置信息
 * 每个配置包含 Haiku、Sonnet、Opus 三个模型，以及认证信息和基础 URL
 * 注意：前三个属性（Haiku、Sonnet、Opus 模型）可以保持相同的值，表示使用统一的模型配置
 * 必填属性：ANTHROPIC_MODEL、ANTHROPIC_AUTH_TOKEN、ANTHROPIC_BASE_URL 必须有值
 *
 * @deprecated 请使用 UnifiedModelConfig 代替
 */
export interface ModelConfig {
  /** 默认模型名称，必填 */
  ANTHROPIC_MODEL: string;
  /** Haiku 模型名称，如 claude-haiku-4-5-20250514 */
  ANTHROPIC_DEFAULT_HAIKU_MODEL: string;
  /** Sonnet 模型名称，如 claude-sonnet-4-5-20250514 */
  ANTHROPIC_DEFAULT_SONNET_MODEL: string;
  /** Opus 模型名称，如 claude-opus-4-5-20251101 */
  ANTHROPIC_DEFAULT_OPUS_MODEL: string;
  /** API 认证密钥，必填 */
  ANTHROPIC_AUTH_TOKEN: string;
  /** API 基础 URL，必填，如 https://api.anthropic.com */
  ANTHROPIC_BASE_URL: string;
  /** 其他扩展属性 */
  [key: string]: any;
}

/**
 * 配置文件接口（旧格式，用于迁移兼容）
 * 对应 ~/.cmrm/settings.json 文件结构
 *
 * @deprecated 请使用新的 Settings 格式
 */
export interface OldSettings {
  /** 模型配置列表 */
  modes: ModelConfig[];
  /** 其他扩展属性 */
  [key: string]: any;
}

/**
 * 工具配置接口
 * 单个工具的配置存储结构
 */
export interface ToolConfig {
  /** 模型配置列表 */
  modes: UnifiedModelConfig[];
}

/**
 * 配置文件接口（新格式）
 * 对应 ~/.cmrm/settings.json 文件结构
 */
export interface Settings {
  /** 工具配置映射 */
  tools: Record<string, ToolConfig>;
  /** 测试重试次数（默认3次） */
  retry?: number;
  /** 其他扩展属性 */
  [key: string]: any;
}

/**
 * Claude 环境变量配置接口
 * 对应 ~/.claude/settings.json 中的 env 对象
 */
export interface ClaudeEnvConfig {
  /** 默认模型名称 */
  ANTHROPIC_MODEL?: string;
  /** Haiku 模型名称 */
  ANTHROPIC_DEFAULT_HAIKU_MODEL?: string;
  /** Sonnet 模型名称 */
  ANTHROPIC_DEFAULT_SONNET_MODEL?: string;
  /** Opus 模型名称 */
  ANTHROPIC_DEFAULT_OPUS_MODEL?: string;
  /** API 认证密钥 */
  ANTHROPIC_AUTH_TOKEN?: string;
  /** API 基础 URL */
  ANTHROPIC_BASE_URL?: string;
  /** 其他扩展属性 */
  [key: string]: any;
}

/**
 * Claude 配置文件接口
 * 对应 ~/.claude/settings.json 文件结构
 */
export interface ClaudeConfig {
  /** 环境变量配置 */
  env?: ClaudeEnvConfig;
  /** 其他扩展属性 */
  [key: string]: any;
}