/**
 * 导入配置映射器
 * 将解析后的 JSON/TOML 对象映射为 UnifiedModelConfig
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import { UnifiedModelConfig } from '../adapters/types';
import { normalizeModelIdentity } from './model-identity';

/** Claude 适配器名称 */
const ADAPTER_NAME_CLAUDE = 'claude';

/** Codex 适配器名称 */
const ADAPTER_NAME_CODEX = 'codex';

/** 默认 Codex Provider */
const DEFAULT_CODEX_PROVIDER = 'custom-openai';

/** 默认 Anthropic API 类型 */
const DEFAULT_API_TYPE_ANTHROPIC = 'anthropic';

/** 默认 OpenAI API 类型 */
const DEFAULT_API_TYPE_OPENAI = 'openai';

/**
 * 将解析后的对象映射为 UnifiedModelConfig
 * 保留所有原始字段，确保必填字段有默认值(空字符串)
 *
 * @param toolName - 工具名称
 * @param parsed - 解析后的原始对象
 * @return UnifiedModelConfig 实例
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function mapToUnifiedConfig(toolName: string, parsed: Record<string, any>): UnifiedModelConfig {
  if (toolName === ADAPTER_NAME_CLAUDE) {
    return mapClaudeConfig(parsed);
  }
  else if (toolName === ADAPTER_NAME_CODEX) {
    return mapCodexConfig(parsed);
  }
  else {
    return finalizeUnifiedConfig({
      ...parsed,
      model: parsed.model ?? '',
      apiKey: parsed.apiKey ?? '',
      baseUrl: parsed.baseUrl ?? '',
    });
  }
}

/**
 * 将 Claude 配置映射为 UnifiedModelConfig
 * 支持统一格式和 ~/.claude/settings.json 的 env/ANTHROPIC_* 格式
 *
 * @param parsed - 解析后的原始对象
 * @return UnifiedModelConfig
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function mapClaudeConfig(parsed: Record<string, any>): UnifiedModelConfig {
  const env = parsed.env && typeof parsed.env === 'object' ? parsed.env : parsed;

  return finalizeUnifiedConfig({
    ...parsed,
    name: parsed.name,
    model: env.ANTHROPIC_MODEL ?? parsed.model ?? '',
    apiKey: env.ANTHROPIC_AUTH_TOKEN ?? parsed.apiKey ?? '',
    baseUrl: env.ANTHROPIC_BASE_URL ?? parsed.baseUrl ?? '',
    haikuModel: env.ANTHROPIC_DEFAULT_HAIKU_MODEL ?? parsed.haikuModel,
    sonnetModel: env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? parsed.sonnetModel,
    opusModel: env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? parsed.opusModel,
    apiType: parsed.apiType ?? DEFAULT_API_TYPE_ANTHROPIC,
  });
}

/**
 * 将 Codex 配置映射为 UnifiedModelConfig
 * 支持统一格式和 ~/.codex/config.toml 的 model_provider/model_providers 格式
 *
 * @param parsed - 解析后的原始对象
 * @return UnifiedModelConfig
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function mapCodexConfig(parsed: Record<string, any>): UnifiedModelConfig {
  const providerName = parsed.provider ?? parsed.model_provider ?? DEFAULT_CODEX_PROVIDER;
  const providerConfig =
    parsed.model_providers && parsed.model_providers[providerName]
      ? parsed.model_providers[providerName]
      : {};
  const runtimeBaseUrl =
    parsed.openai_base_url ??
    parsed.openaiBaseUrl ??
    providerConfig.base_url ??
    parsed.baseUrl;

  return finalizeUnifiedConfig({
    ...parsed,
    name: parsed.name,
    model: parsed.model ?? '',
    apiKey: parsed.apiKey ?? '',
    baseUrl: runtimeBaseUrl ?? '',
    provider: providerName,
    modelReasoningEffort:
      parsed.modelReasoningEffort ?? parsed.model_reasoning_effort ?? '',
    disableResponseStorage:
      parsed.disableResponseStorage ?? parsed.disable_response_storage,
    apiType: parsed.apiType ?? DEFAULT_API_TYPE_OPENAI,
  });
}

/**
 * 规范化统一配置
 * 为可选 name 提供 model 兜底，并清理基础字符串字段
 *
 * @param config - 原始统一配置
 * @return 规范化后的配置
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function finalizeUnifiedConfig(config: UnifiedModelConfig): UnifiedModelConfig {
  const model = typeof config.model === 'string' ? config.model.trim() : '';
  const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : '';
  const baseUrl = typeof config.baseUrl === 'string' ? config.baseUrl.trim() : '';
  return normalizeModelIdentity({
    ...config,
    model,
    apiKey,
    baseUrl,
  });
}
