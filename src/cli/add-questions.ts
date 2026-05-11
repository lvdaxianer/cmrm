/**
 * /add 命令问题构建器
 * 抽离自 cli.ts，集中维护添加模型流程的 inquirer 问题模板与配置组装逻辑
 *
 * 拆分原因：
 * - 问题列表与配置组装属于纯数据处理，不依赖 readline 状态
 * - 与 add-handler 解耦后便于单元测试
 * - 每个问题字段独立构建函数，符合单一职责原则
 * - 支持多工具适配器（Claude / Codex）的差异化问题
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 * @date 2026-05-09 修改: 支持 Codex 适配器差异化问题
 * @date 2026-05-11 修改: 问题构建器抽离到 question-builders.ts
 */

import { Question } from 'inquirer';
import { UnifiedModelConfig } from '../types';
import { ApiType } from '../adapters/types';
import { normalizeModelIdentity } from './model-identity';
import {
  buildConfigNameQuestion,
  buildModelQuestion,
  buildApiKeyQuestion,
  buildBaseUrlQuestion,
  buildBaseUrlQuestionForCodex,
  buildProviderQuestion,
  buildModelReasoningEffortQuestion,
  buildDisableResponseStorageQuestion,
  buildHaikuQuestion,
  buildSonnetQuestion,
  buildOpusQuestion,
} from './question-builders';

/** Codex 默认模型 */
const DEFAULT_CODEX_MODEL = 'gpt-5.4';

/** Codex 默认推理强度 */
const DEFAULT_CODEX_REASONING_EFFORT = 'high';

/** 默认禁用响应存储 */
const DEFAULT_DISABLE_RESPONSE_STORAGE = true;

/** Claude 适配器名称 */
const ADAPTER_NAME_CLAUDE = 'claude';

/** Codex 适配器名称 */
const ADAPTER_NAME_CODEX = 'codex';

/** 默认 Anthropic API 类型 */
const DEFAULT_API_TYPE_ANTHROPIC = 'anthropic';

/** 默认 OpenAI API 类型 */
const DEFAULT_API_TYPE_OPENAI = 'openai';

/**
 * 构建添加模型的 inquirer 问题列表
 * 根据适配器类型返回对应的问题列表
 *
 * @param adapterName - 适配器名称（'claude' | 'codex'）
 * @return inquirer 问题数组
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function buildAddModelQuestions(adapterName: string = ADAPTER_NAME_CLAUDE): Question[] {
  // 无默认值：调用带默认值版本，传入空对象
  return buildAddModelQuestionsWithDefaults(adapterName, {});
}

/**
 * 构建带默认值的添加模型问题列表
 * 用于模板添加场景，模板字段已预填充，用户可直接 Enter 跳过
 *
 * @param adapterName - 适配器名称（'claude' | 'codex'）
 * @param defaults - 模板预填充的默认值
 * @return inquirer 问题数组
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function buildAddModelQuestionsWithDefaults(
  adapterName: string,
  defaults: Partial<UnifiedModelConfig>
): Question[] {
  // Claude 适配器:使用 Claude 特有字段
  if (adapterName === ADAPTER_NAME_CLAUDE) {
    return buildClaudeQuestions(defaults);
  }
  // Codex 适配器:使用 Codex 特有字段
  else if (adapterName === ADAPTER_NAME_CODEX) {
    return buildCodexQuestions(defaults);
  }
  // 未知适配器:默认使用 Claude 问题列表
  else {
    return buildClaudeQuestions(defaults);
  }
}

/**
 * 构建 Claude 适配器的添加问题列表
 *
 * @param defaults - 模板默认值
 * @return inquirer 问题数组
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function buildClaudeQuestions(defaults: Partial<UnifiedModelConfig>): Question[] {
  // 按固定顺序组装所有问题字段
  return [
    buildConfigNameQuestion(defaults),
    buildModelQuestion(defaults),
    buildApiKeyQuestion(),
    buildBaseUrlQuestion(defaults),
    buildHaikuQuestion(defaults),
    buildSonnetQuestion(defaults),
    buildOpusQuestion(defaults),
  ];
}

/**
 * 构建 Codex 适配器的添加问题列表
 *
 * @param defaults - 模板默认值
 * @return inquirer 问题数组
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function buildCodexQuestions(defaults: Partial<UnifiedModelConfig>): Question[] {
  // Codex 固定默认值
  const codexDefaults: Partial<UnifiedModelConfig> = {
    ...defaults,
    model: defaults.model || DEFAULT_CODEX_MODEL,
    provider: 'codex',
    modelReasoningEffort: defaults.modelReasoningEffort || DEFAULT_CODEX_REASONING_EFFORT,
    disableResponseStorage: defaults.disableResponseStorage ?? DEFAULT_DISABLE_RESPONSE_STORAGE,
  };

  // Codex 问题列表:基础字段 + provider + 可选高级字段
  return [
    buildConfigNameQuestion(codexDefaults),
    buildModelQuestion(codexDefaults),
    buildApiKeyQuestion(),
    buildBaseUrlQuestionForCodex(codexDefaults),
    buildProviderQuestion(codexDefaults),
    buildModelReasoningEffortQuestion(codexDefaults),
    buildDisableResponseStorageQuestion(codexDefaults),
  ];
}

/**
 * 根据适配器类型和 inquirer 响应构建模型配置对象
 * 必填字段 trim 后填入，可选字段为空时不写入对象
 *
 * @param adapterName - 适配器名称（'claude' | 'codex'）
 * @param response - inquirer prompt 返回的字段映射
 * @return 标准化的 UnifiedModelConfig
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function buildModelConfig(adapterName: string, response: Record<string, any>): UnifiedModelConfig {
  // Claude 适配器:使用 Claude 配置组装逻辑
  if (adapterName === ADAPTER_NAME_CLAUDE) {
    return buildClaudeModelConfig(response);
  }
  // Codex 适配器:使用 Codex 配置组装逻辑
  else if (adapterName === ADAPTER_NAME_CODEX) {
    return buildCodexModelConfig(response);
  }
  // 未知适配器:默认使用 Claude 逻辑
  else {
    return buildClaudeModelConfig(response);
  }
}

/**
 * 构建 Claude 模型配置对象
 *
 * @param response - inquirer 响应
 * @return 模型配置对象
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function buildClaudeModelConfig(response: Record<string, any>): UnifiedModelConfig {
  // 基础字段（必填）：trim 后组装
  const config: UnifiedModelConfig = {
    name: response.configName?.trim() || response.model.trim(),
    model: response.model.trim(),
    apiKey: response.apiKey.trim(),
    baseUrl: response.baseUrl.trim(),
    apiType: (response.apiType as ApiType) ?? DEFAULT_API_TYPE_ANTHROPIC,
  };

  // 可选字段：Haiku 模型
  attachOptional(config, 'haikuModel', response.haikuModel);
  // 可选字段：Sonnet 模型
  attachOptional(config, 'sonnetModel', response.sonnetModel);
  // 可选字段：Opus 模型
  attachOptional(config, 'opusModel', response.opusModel);

  return normalizeModelIdentity(config);
}

/**
 * 构建 Codex 模型配置对象
 *
 * @param response - inquirer 响应
 * @return 模型配置对象
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function buildCodexModelConfig(response: Record<string, any>): UnifiedModelConfig {
  const provider = response.provider?.trim() || 'custom';
  const model = response.model.trim();
  const explicitName = response.configName?.trim();
  // 基础字段（必填）：trim 后组装
  const config: UnifiedModelConfig = {
    name: explicitName || `${provider}/${model}`,
    model: model,
    apiKey: response.apiKey.trim(),
    baseUrl: response.baseUrl.trim(),
    provider: provider,
    apiType: (response.apiType as ApiType) ?? DEFAULT_API_TYPE_OPENAI,
  };

  // 可选字段：Model Reasoning Effort
  attachOptional(config, 'modelReasoningEffort', response.modelReasoningEffort);
  // 可选字段：Disable Response Storage（布尔值）
  if (typeof response.disableResponseStorage === 'boolean') {
    (config as any).disableResponseStorage = response.disableResponseStorage;
  }

  return normalizeModelIdentity(config);
}

/**
 * 将可选字段附加到配置对象（trim 后非空才写入）
 * 避免配置对象中出现空字符串值
 *
 * @param config - 待修改的配置对象
 * @param key - 字段名
 * @param value - 用户输入值
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function attachOptional(config: UnifiedModelConfig, key: keyof UnifiedModelConfig, value: any): void {
  // 字符串类型：trim 后非空才写入
  if (typeof value === 'string' && value.trim()) {
    (config as any)[key] = value.trim();
  }
  // 其他类型：直接写入（如布尔值）
  else if (typeof value !== 'string' && value !== undefined && value !== null) {
    (config as any)[key] = value;
  }
  // 输入为空或仅空白：不写入，保持配置对象整洁
  else {
    // 可选字段不填则跳过，不在配置中保留空值
  }
}
