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

/**
 * Codex 工具适配器类
 * 管理 ~/.codex/config.toml + ~/.codex/auth.json
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
   * @date 2026-05-09
   */
  constructor() {
    const codexDir = path.join(os.homedir(), '.codex');
    this.configPath = path.join(codexDir, 'config.toml');
    this.authPath = path.join(codexDir, 'auth.json');
    this.cmrmSettingsPath = path.join(os.homedir(), '.cmrm', 'settings.json');
  }

  /**
   * 从 config.toml 解析 provider 信息
   *
   * @param config - Codex 配置对象
   * @return provider、baseUrl、envKey
   * @author lvdaxianerplus
   * @date 2026-05-09
   */
  private resolveProvider(config: any): { provider: string; baseUrl: string; envKey: string } {
    const provider = config.model_provider || CODEX_RUNTIME_PROVIDER;
    let baseUrl = '';
    let envKey = 'OPENAI_API_KEY';

    if (provider === CODEX_RUNTIME_PROVIDER && config.openai_base_url) {
      baseUrl = config.openai_base_url;
    }
    else if (config.model_providers && config.model_providers[provider]) {
      const providerConfig = config.model_providers[provider];
      baseUrl = providerConfig.base_url || '';
      envKey = providerConfig.env_key || 'OPENAI_API_KEY';
    }

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
   * @date 2026-05-09
   */
  private resolveApiKey(provider: string, envKey: string): string {
    const auth = readAuthConfig(this.authPath);

    // 优先从 auth.json 的 api_keys[envKey] 获取
    if (auth?.api_keys && envKey && auth.api_keys[envKey]) {
      return auth.api_keys[envKey];
    }

    // 兼容：auth.json 的 OPENAI_API_KEY 字段
    if (auth?.OPENAI_API_KEY) {
      return auth.OPENAI_API_KEY;
    }

    // auth.json 未命中：尝试环境变量
    if (envKey && process.env[envKey]) {
      return process.env[envKey] || '';
    }

    // 兜底：尝试 OPENAI_API_KEY
    return process.env.OPENAI_API_KEY || '';
  }

  /**
   * 从 Codex 配置构建统一模型配置
   *
   * @param config - Codex 配置对象
   * @return 模型配置对象，无模型配置时返回 null
   * @author lvdaxianerplus
   * @date 2026-05-09
   */
  private buildModelConfig(config: any): UnifiedModelConfig | null {
    // 无模型配置
    if (!config.model) {
      return null;
    }
    // 有模型配置：提取字段
    else {
      const { provider, baseUrl, envKey } = this.resolveProvider(config);
      const apiKey = this.resolveApiKey(provider, envKey);

      return {
        model: config.model,
        apiKey: apiKey,
        baseUrl: baseUrl,
        provider: provider,
        modelReasoningEffort: config.model_reasoning_effort || 'medium',
        disableResponseStorage: config.disable_response_storage ?? false,
      };
    }
  }

  /**
   * 读取当前生效的模型配置
   *
   * @return 当前模型配置，未配置则返回 null
   * @author lvdaxianerplus
   * @date 2026-05-09
   */
  readCurrentModel(): UnifiedModelConfig | null {
    const config = parseCodexConfig(this.configPath);

    // 配置文件不存在或解析失败
    if (!config) {
      return null;
    }
    // 构建模型配置
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
   * @date 2026-05-09
   */
  writeModelConfig(config: UnifiedModelConfig): string | null {
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
   * @date 2026-05-09
   */
  getSavedModels(): UnifiedModelConfig[] {
    return getSavedModels(this.cmrmSettingsPath);
  }

  /**
   * 保存模型配置到 cmrm 存储
   *
   * @param config - 要保存的模型配置
   * @author lvdaxianerplus
   * @date 2026-05-09
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
   * @date 2026-05-09
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
   * @date 2026-05-09
   */
  validateConfig(config: UnifiedModelConfig): boolean {
    const hasModel = !!config.model && config.model.trim() !== '';
    const hasApiKey = !!config.apiKey && config.apiKey.trim() !== '';
    const hasBaseUrl = !!config.baseUrl && config.baseUrl.trim() !== '';
    const hasReasoningEffort = !!config.modelReasoningEffort && config.modelReasoningEffort.trim() !== '';

    return hasModel && hasApiKey && hasBaseUrl && hasReasoningEffort;
  }

  /**
   * 获取配置的重试次数
   *
   * @return 重试次数，默认 3
   * @author lvdaxianerplus
   * @date 2026-05-09
   */
  getRetryCount(): number {
    return getCmrmRetryCount(this.cmrmSettingsPath);
  }
}
