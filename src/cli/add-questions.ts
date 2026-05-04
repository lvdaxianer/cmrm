/**
 * /add 命令问题构建器
 * 抽离自 cli.ts，集中维护添加模型流程的 inquirer 问题模板与配置组装逻辑
 *
 * 拆分原因：
 * - 问题列表与配置组装属于纯数据处理，不依赖 readline 状态
 * - 与 add-handler 解耦后便于单元测试
 * - 每个问题字段独立构建函数，符合单一职责原则
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { Question } from 'inquirer';
import { UnifiedModelConfig } from '../types';
import { ApiType } from '../adapters/types';

/**
 * 构建添加模型的 inquirer 问题列表
 * 顺序：configName → model → apiKey → baseUrl → 三类可选模型
 * 注：apiType 改用统一的索引输入菜单 askApiType，不再放在 list 问题里
 *
 * @return inquirer 问题数组
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function buildAddModelQuestions(): Question[] {
  // 无默认值：调用带默认值版本，传入空对象
  return buildAddModelQuestionsWithDefaults({});
}

/**
 * 构建带默认值的添加模型问题列表
 * 用于模板添加场景，模板字段已预填充，用户可直接 Enter 跳过
 *
 * @param defaults - 模板预填充的默认值
 * @return inquirer 问题数组
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function buildAddModelQuestionsWithDefaults(defaults: Partial<UnifiedModelConfig>): Question[] {
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
 * 构建配置名称问题
 * 可选字段，不填则使用模型名称作为默认值
 *
 * @param defaults - 模板默认值
 * @return configName 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
function buildConfigNameQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'configName',
    message: buildMessage('配置名称（可选，不填则使用模型名称）', defaults.name),
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
 * @date 2026-05-04
 */
function buildModelQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'model',
    message: buildMessage('模型名称（必填）', defaults.model),
    default: defaults.model || undefined,
    validate: (value: string) => value.trim() !== '' || '模型名称为必填字段',
  };
}

/**
 * 构建 API Key 问题
 * 必填字段，用户必须输入，不提供默认值
 *
 * @return apiKey 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
function buildApiKeyQuestion(): Question {
  return {
    type: 'input',
    name: 'apiKey',
    message: 'API Key（必填）',
    validate: (value: string) => value.trim() !== '' || 'API Key 为必填字段',
  };
}

/**
 * 构建 Base URL 问题
 * 必填字段，提供兜底默认值 https://api.anthropic.com
 *
 * @param defaults - 模板默认值
 * @return baseUrl 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
function buildBaseUrlQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'baseUrl',
    message: buildMessage('Base URL（必填）', defaults.baseUrl, 'https://api.anthropic.com'),
    default: defaults.baseUrl || 'https://api.anthropic.com',
    validate: (value: string) => value.trim() !== '' || 'Base URL 为必填字段',
  };
}

/**
 * 构建 Haiku 模型问题
 * 可选字段，用于指定轻量级模型
 *
 * @param defaults - 模板默认值
 * @return haikuModel 问题对象
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
function buildHaikuQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'haikuModel',
    message: buildMessage('Haiku 模型（可选）', defaults.haikuModel),
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
 * @date 2026-05-04
 */
function buildSonnetQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'sonnetModel',
    message: buildMessage('Sonnet 模型（可选）', defaults.sonnetModel),
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
 * @date 2026-05-04
 */
function buildOpusQuestion(defaults: Partial<UnifiedModelConfig>): Question {
  return {
    type: 'input',
    name: 'opusModel',
    message: buildMessage('Opus 模型（可选）', defaults.opusModel),
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
 * @date 2026-05-04
 */
function buildMessage(label: string, defaultValue?: string, fallbackDefault?: string): string {
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

/**
 * 根据 inquirer 响应构建模型配置对象
 * 必填字段 trim 后填入，可选字段为空时不写入对象
 *
 * @param response - inquirer prompt 返回的字段映射
 * @return 标准化的 UnifiedModelConfig
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function buildModelConfig(response: Record<string, any>): UnifiedModelConfig {
  // 基础字段（必填）：trim 后组装
  const config: UnifiedModelConfig = {
    name: response.configName?.trim() || response.model.trim(),
    model: response.model.trim(),
    apiKey: response.apiKey.trim(),
    baseUrl: response.baseUrl.trim(),
    apiType: (response.apiType as ApiType) ?? 'anthropic',
  };

  // 可选字段：Haiku 模型
  attachOptional(config, 'haikuModel', response.haikuModel);
  // 可选字段：Sonnet 模型
  attachOptional(config, 'sonnetModel', response.sonnetModel);
  // 可选字段：Opus 模型
  attachOptional(config, 'opusModel', response.opusModel);

  return config;
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
  // 输入存在且 trim 后非空：写入配置对象
  if (value?.trim()) {
    (config as any)[key] = value.trim();
  }
  // 输入为空或仅空白：不写入，保持配置对象整洁
  else {
    // 可选字段不填则跳过，不在配置中保留空值
  }
}
