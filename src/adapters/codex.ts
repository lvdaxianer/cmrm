/**
 * Codex 工具适配器
 * 实现 OpenAI Codex CLI 的配置管理
 *
 * Codex CLI 使用双文件配置体系:
 * - ~/.codex/config.toml : 配置(模型、提供商、API 地址、连接方式)
 * - ~/.codex/auth.json   : 密钥(API Key，敏感信息)
 *
 * 分工原则:
 * - config.toml 不存密钥，只通过 env_key 告诉 Codex 密钥去哪里取
 * - auth.json 只存密钥，不存任何模型配置
 *
 * @author lvdaxianerplus
 * @date 2026-05-09
 */

import * as path from 'path';
import * as os from 'os';
import { ToolAdapter, UnifiedModelConfig } from './types';
import { readAuthConfig, writeAuthConfig } from './codex-auth';
import { parseCodexConfig, writeCodexConfig, CODEX_RUNTIME_PROVIDER } from './codex-config';
import {
  getSavedModels,
  saveModel as saveModelToCmrm,
  removeModel as removeModelFromCmrm,
  getRetryCount as getCmrmRetryCount,
} from './codex-cmrm-store';

/** JSON 缩进空格数 */
const JSON_INDENT = 2;

/** Codex 配置目录名 */
const CODEX_CONFIG_DIR = '.codex';

/** Codex 配置文件名 */
const CODEX_CONFIG_FILE = 'config.toml';

/** Codex 密钥文件名 */
const CODEX_AUTH_FILE = 'auth.json';

/** cmrm 配置目录名 */
const CMRM_CONFIG_DIR = '.cmrm';

/** cmrm 配置文件名 */
const CMRM_CONFIG_FILE = 'settings.json';

/** 默认推理强度 */
const DEFAULT_REASONING_EFFORT = 'medium';

/** 默认禁用响应存储 */
const DEFAULT_DISABLE_RESPONSE_STORAGE = false;

/** 默认环境变量密钥名 */
const DEFAULT_ENV_KEY = 'OPENAI_API_KEY';

/**
 * Codex 工具适配器类
 * 管理 ~/.codex/config.toml + ~/.codex/auth.json
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export class CodexAdapter implements ToolAdapter {
  /** 工具名称 */
  name = 'codex';

  /** 工具显示名称 */
  displayName = 'Codex';

  /** 配置文件路径(config.toml) */
  configPath: string;

  /** 密钥文件路径(auth.json) */
  private authPath: string;

  /** 配置文件格式 */
  configFormat = 'toml' as const;

  /** cmrm 配置文件路径 */
  private cmrmSettingsPath: string;

  /**
   * 构造函数
   * 初始化 config.toml 与 auth.json 路径
   *
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  constructor() {
    const codexDir = path.join(os.homedir(), CODEX_CONFIG_DIR);
    this.configPath = path.join(codexDir, CODEX_CONFIG_FILE);
    this.authPath = path.join(codexDir, CODEX_AUTH_FILE);
    this.cmrmSettingsPath = path.join(os.homedir(), CMRM_CONFIG_DIR, CMRM_CONFIG_FILE);
  }

  /**
   * 从 config.toml 解析 provider 信息
   *
   * @param config - Codex 配置对象
   * @return provider、baseUrl、envKey
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private resolveBaseUrl(config: any, provider: string): string {
    // 条件：使用内置 OpenAI provider 且存在 base_url
    if (provider === CODEX_RUNTIME_PROVIDER && config.openai_base_url) {
      return config.openai_base_url;
    }
    // 条件：存在自定义 provider 配置
    else if (config.model_providers && config.model_providers[provider]) {
      return config.model_providers[provider].base_url || '';
    }
    // 替代：无匹配 provider 配置
    else {
      // 使用默认值
      return '';
    }
  }

  private resolveEnvKey(config: any, provider: string): string {
    // 条件：存在自定义 provider 配置且包含 env_key
    if (config.model_providers && config.model_providers[provider]) {
      return config.model_providers[provider].env_key || DEFAULT_ENV_KEY;
    }
    // 替代：使用默认 env_key
    else {
      return DEFAULT_ENV_KEY;
    }
  }

  private resolveProvider(config: any): { provider: string; baseUrl: string; envKey: string } {
    const provider = config.model_provider || CODEX_RUNTIME_PROVIDER;
    const baseUrl = this.resolveBaseUrl(config, provider);
    const envKey = this.resolveEnvKey(config, provider);

    return { provider, baseUrl, envKey };
  }

  /**
   * 解析 API Key
   * 优先 auth.json，其次环境变量
   *
   * @param provider - 提供商标识
   * @param envKey - 环境变量名
   * @return API Key
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private resolveApiKey(provider: string, envKey: string): string {
    const auth = readAuthConfig(this.authPath);

    // 优先从 auth.json 的 api_keys[envKey] 获取
    // 条件：auth 中存在对应 envKey 的密钥
    if (auth?.api_keys && envKey && auth.api_keys[envKey]) {
      return auth.api_keys[envKey];
    }
    // 替代：兼容 auth.json 的 OPENAI_API_KEY 字段
    else if (auth?.OPENAI_API_KEY) {
      return auth.OPENAI_API_KEY;
    }
    // 替代：尝试环境变量
    else if (envKey && process.env[envKey]) {
      return process.env[envKey] || '';
    }
    // 替代：兜底尝试 OPENAI_API_KEY
    else {
      return process.env.OPENAI_API_KEY || '';
    }
  }

  /**
   * 从 Codex 配置构建统一模型配置
   *
   * @param config - Codex 配置对象
   * @return 模型配置对象，无模型配置时返回 undefined
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private buildModelConfig(config: any): UnifiedModelConfig | undefined {
    // 条件：无模型配置
    if (!config.model) {
      return undefined;
    }
    // 替代：有模型配置，提取字段
    else {
      const { provider, baseUrl, envKey } = this.resolveProvider(config);
      const apiKey = this.resolveApiKey(provider, envKey);

      return {
        model: config.model,
        apiKey: apiKey,
        baseUrl: baseUrl,
        provider: provider,
        modelReasoningEffort: config.model_reasoning_effort || DEFAULT_REASONING_EFFORT,
        disableResponseStorage: config.disable_response_storage ?? DEFAULT_DISABLE_RESPONSE_STORAGE,
      };
    }
  }

  /**
   * 读取当前生效的模型配置
   *
   * @return 当前模型配置，未配置则返回 undefined
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  readCurrentModel(): UnifiedModelConfig | undefined {
    const config = parseCodexConfig(this.configPath);

    // 条件：配置文件不存在或解析失败
    if (!config) {
      return undefined;
    }
    // 替代：构建模型配置
    else {
      return this.buildModelConfig(config);
    }
  }

  /**
   * 写入模型配置
   * 流程：备份 config.toml → 合并写入 config.toml → 同步写入 auth.json
   *
   * @param config - 要写入的模型配置
   * @return 备份文件名
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  writeModelConfig(config: UnifiedModelConfig): string | undefined {
    const backupFileName = writeCodexConfig(this.configPath, config);

    // 同步写入 auth.json(密钥独立存储)
    writeAuthConfig(this.authPath, config.apiKey);

    return backupFileName;
  }

  /**
   * 获取用户保存的模型列表
   *
   * @return 保存的模型配置数组
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  getSavedModels(): UnifiedModelConfig[] {
    return getSavedModels(this.cmrmSettingsPath);
  }

  /**
   * 保存模型配置到 cmrm 存储
   *
   * @param config - 要保存的模型配置
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  saveModel(config: UnifiedModelConfig): void {
    saveModelToCmrm(this.cmrmSettingsPath, config);
  }

  /**
   * 删除保存的模型配置
   *
   * @param configName - 要删除的配置名称
   * @return 删除成功返回 true，配置不存在返回 false
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  removeModel(configName: string): boolean {
    return removeModelFromCmrm(this.cmrmSettingsPath, configName);
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
    const isModelPresent = !!config.model && config.model.trim() !== '';
    const isApiKeyPresent = !!config.apiKey && config.apiKey.trim() !== '';
    const isBaseUrlPresent = !!config.baseUrl && config.baseUrl.trim() !== '';
    const isReasoningEffortPresent = !!config.modelReasoningEffort && config.modelReasoningEffort.trim() !== '';

    return isModelPresent && isApiKeyPresent && isBaseUrlPresent && isReasoningEffortPresent;
  }

  /**
   * 获取配置的重试次数
   *
   * @return 重试次数，默认 3
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  getRetryCount(): number {
    return getCmrmRetryCount(this.cmrmSettingsPath);
  }
}
