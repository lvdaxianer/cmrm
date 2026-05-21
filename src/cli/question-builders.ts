/**
 * Inquirer 问题构建器
 * 封装各类问题字段的构建函数
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import { Question } from 'inquirer';
import { UnifiedModelConfig } from '../types';
import { t } from '../i18n';

/** Claude 默认 Base URL */
const DEFAULT_CLAUDE_BASE_URL = 'https://api.anthropic.com';

/** Codex 默认 Base URL */
const DEFAULT_CODEX_BASE_URL = 'https://api.openai.com';

/** Codex 默认模型 */
const DEFAULT_CODEX_MODEL = 'gpt-5.4';

/** Codex 默认推理强度 */
const DEFAULT_CODEX_REASONING_EFFORT = 'high';

/** 默认禁用响应存储 */
const DEFAULT_DISABLE_RESPONSE_STORAGE = true;

/** 默认 Provider */
const DEFAULT_PROVIDER = 'custom-openai';

/**
 * 构建配置名称问题
 * 可选字段，不填则使用模型名称作为默认值
 *
 * @param defaults - 模板默认值
 * @return configName 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildConfigNameQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'configName',
    message: buildMessage(t('add.configName'), defaults.name),
    default: defaults.name || undefined,
  };
}

/**
 * 构建模型名称问题
 * 必填字段，trim 后非空校验
 *
 * @param defaults - 模板默认值
 * @return model 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildModelQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'model',
    message: buildMessage(t('add.modelName'), defaults.model),
    default: defaults.model || undefined,
    validate: (value: string) => value.trim() !== '' || t('add.modelName') + ' is required',
  };
}

/**
 * 构建 API Key 问题
 * 必填字段，用户必须输入，不提供默认值
 *
 * @return apiKey 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildApiKeyQuestion(): Question {
  return {
    type: 'input',
    name: 'apiKey',
    message: t('add.apiKey'),
    validate: (value: string) => value.trim() !== '' || t('add.apiKey') + ' is required',
  };
}

/**
 * 构建 Base URL 问题（Claude 默认）
 * 必填字段，提供兜底默认值 https://api.anthropic.com
 *
 * @param defaults - 模板默认值
 * @return baseUrl 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildBaseUrlQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'baseUrl',
    message: buildMessage(t('add.baseUrl'), defaults.baseUrl, DEFAULT_CLAUDE_BASE_URL),
    default: defaults.baseUrl || DEFAULT_CLAUDE_BASE_URL,
    validate: (value: string) => value.trim() !== '' || t('add.baseUrl') + ' is required',
  };
}

/**
 * 构建 Base URL 问题（Codex）
 * 必填字段，提供兜底默认值 https://api.openai.com
 *
 * @param defaults - 模板默认值
 * @return baseUrl 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildBaseUrlQuestionForCodex(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'baseUrl',
    message: buildMessage(t('add.baseUrl'), defaults.baseUrl, DEFAULT_CODEX_BASE_URL),
    default: defaults.baseUrl || DEFAULT_CODEX_BASE_URL,
    validate: (value: string) => value.trim() !== '' || t('add.baseUrl') + ' is required',
  };
}

/**
 * 构建 Provider 问题（Codex）
 * 必填字段，用于指定模型提供商
 *
 * @param defaults - 模板默认值
 * @return provider 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildProviderQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'provider',
    message: buildMessage(t('add.provider'), defaults.provider, DEFAULT_PROVIDER),
    default: defaults.provider || DEFAULT_PROVIDER,
    validate: (value: string) => value.trim() !== '' || t('add.provider') + ' is required',
  };
}

/**
 * 构建 Model Reasoning Effort 问题（Codex 必填）
 * 必填字段，指定推理强度
 *
 * @param defaults - 模板默认值
 * @return modelReasoningEffort 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildModelReasoningEffortQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'modelReasoningEffort',
    message: buildMessage(t('add.modelReasoningEffort'), defaults.modelReasoningEffort),
    default: defaults.modelReasoningEffort || DEFAULT_CODEX_REASONING_EFFORT,
    validate: (value: string) => value.trim() !== '' || t('add.modelReasoningEffort') + ' is required',
  };
}

/**
 * 构建 Disable Response Storage 问题（Codex 可选）
 * 可选字段，布尔值
 *
 * @param defaults - 模板默认值
 * @return disableResponseStorage 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildDisableResponseStorageQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'confirm',
    name: 'disableResponseStorage',
    message: t('add.disableResponseStorage'),
    default: defaults.disableResponseStorage || false,
  };
}

/**
 * 构建 Haiku 模型问题
 * 可选字段，用于指定轻量级模型
 *
 * @param defaults - 模板默认值
 * @return haikuModel 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildHaikuQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'haikuModel',
    message: buildMessage(t('add.haikuModel'), defaults.haikuModel),
    default: defaults.haikuModel || undefined,
  };
}

/**
 * 构建 Sonnet 模型问题
 * 可选字段，用于指定平衡型模型
 *
 * @param defaults - 模板默认值
 * @return sonnetModel 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildSonnetQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'sonnetModel',
    message: buildMessage(t('add.sonnetModel'), defaults.sonnetModel),
    default: defaults.sonnetModel || undefined,
  };
}

/**
 * 构建 Opus 模型问题
 * 可选字段，用于指定高性能模型
 *
 * @param defaults - 模板默认值
 * @return opusModel 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildOpusQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'opusModel',
    message: buildMessage(t('add.opusModel'), defaults.opusModel),
    default: defaults.opusModel || undefined,
  };
}

/**
 * 构建带默认值提示的问题文本
 * 有默认值时在括号中显示，方便用户直接回车使用
 *
 * @param label - 问题标签
 * @param defaultValue - 默认值
 * @param fallbackDefault - 兜底默认值（当 defaultValue 为空时使用）
 * @return 带默认值提示的问题文本
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildMessage(label: string, defaultValue?: string, fallbackDefault?: string): string {
  const value = defaultValue || fallbackDefault;

  // 有默认值：在括号中显示，提示用户可直接回车
  if (value) {
    return `${label} [${value}]:`;
  }
  // 无默认值：保持原样，不显示括号
  else {
    return label;
  }
}
