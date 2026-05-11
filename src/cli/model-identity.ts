/**
 * 模型标识工具
 * 统一生成展示名、默认名与查找候选，尤其处理 Codex 的 provider/model 维度
 *
 * @author lvdaxianerplus
 * @date 2026-05-10
 */

import { UnifiedModelConfig } from '../types';

/** 空字符串长度 */
const EMPTY_STRING_LENGTH = 0;

/** 默认分隔符 */
const PROVIDER_MODEL_SEPARATOR = '/';

/**
 * 获取 Codex 模型的 profile 名称
 * 格式为 provider/model，如 codex/gpt-5.4
 *
 * @param model - 模型配置
 * @return profile 名称
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
export function getCodexProfileName(model: UnifiedModelConfig): string {
  const provider = typeof model.provider === 'string' ? model.provider.trim() : '';
  const modelName = typeof model.model === 'string' ? model.model.trim() : '';

  // provider 和 model 均存在：拼接为 provider/model 格式
  if (provider && modelName) {
    return `${provider}${PROVIDER_MODEL_SEPARATOR}${modelName}`;
  }
  // 仅 model 存在：返回裸 model 名
  else {
    return modelName;
  }
}

/**
 * 获取原始模型名称（name 字段 trim 后）
 *
 * @param model - 模型配置
 * @return 原始名称
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function getRawModelName(model: UnifiedModelConfig): string {
  return typeof model.name === 'string' ? model.name.trim() : '';
}

/**
 * 获取规范模型名称
 * Codex 使用 provider/model 格式，其他使用 model 字段
 *
 * @param model - 模型配置
 * @return 规范名称
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getCanonicalModelName(model: UnifiedModelConfig): string {
  // Codex 模型：使用 provider/model 格式
  if (model.provider) {
    return getCodexProfileName(model);
  }
  // 其他模型：使用 model 字段
  else {
    return typeof model.model === 'string' ? model.model.trim() : '';
  }
}

/**
 * 获取显式模型名称（用户自定义名）
 * 当 name 与规范名相同时视为未显式命名
 *
 * @param model - 模型配置
 * @return 显式名称，无则返回空字符串
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getExplicitModelName(model: UnifiedModelConfig): string {
  const explicitName = getRawModelName(model);
  const canonicalName = getCanonicalModelName(model);

  // 未设置 name 或与规范名相同：视为未显式命名
  if (!explicitName || explicitName === canonicalName) {
    return '';
  }
  // 兼容旧数据：Codex 历史上会把默认 name 写成裸 model，这种不应视为显式命名
  else if (model.provider && explicitName === (model.model || '').trim()) {
    return '';
  }
  // 真正的显式命名
  else {
    return explicitName;
  }
}

/**
 * 获取主显示名称
 * 优先使用规范名称
 *
 * @param model - 模型配置
 * @return 主显示名称
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getPrimaryModelName(model: UnifiedModelConfig): string {
  return getCanonicalModelName(model);
}

/**
 * 规范化别名列表
 * 去重、去空、过滤保留名
 *
 * @param aliases - 原始别名数据
 * @param reservedNames - 保留名列表（这些名称不能作为别名）
 * @return 规范化后的别名数组
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function normalizeAliases(
  aliases: unknown,
  reservedNames: string[] = []
): string[] {
  const reserved = new Set(
    reservedNames
      .filter((value): value is string => typeof value === 'string')
      .map(value => value.trim())
      .filter(Boolean)
  );
  const values = Array.isArray(aliases) ? aliases : [];
  const normalized = values
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
    .filter(value => value !== '' && !reserved.has(value));

  return Array.from(new Set(normalized));
}

/**
 * 规范化模型标识
 * 统一处理 name、provider、model、aliases 字段
 *
 * @param config - 原始模型配置
 * @return 规范化后的配置
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function normalizeModelIdentity(config: UnifiedModelConfig): UnifiedModelConfig {
  const model = typeof config.model === 'string' ? config.model.trim() : '';
  const provider = typeof config.provider === 'string' ? config.provider.trim() : config.provider;
  const baseConfig: UnifiedModelConfig = {
    ...config,
    model,
    provider,
  };
  const canonicalName = getCanonicalModelName(baseConfig);
  const explicitName = getExplicitModelName(baseConfig);
  const aliases = normalizeAliases(
    [...(Array.isArray(config.aliases) ? config.aliases : []), explicitName],
    [canonicalName, model]
  );
  const normalizedConfig: UnifiedModelConfig = {
    ...baseConfig,
    name: canonicalName,
  };

  // 有别名：写入 aliases 字段
  if (aliases.length > EMPTY_STRING_LENGTH) {
    normalizedConfig.aliases = aliases;
  }
  // 无别名：删除 aliases 字段保持整洁
  else {
    delete normalizedConfig.aliases;
  }

  return normalizedConfig;
}

/**
 * 获取模型的所有引用名
 * 用于查找和匹配
 *
 * @param model - 模型配置
 * @return 引用名数组（去重）
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getModelReferenceNames(model: UnifiedModelConfig): string[] {
  const canonicalName = getCanonicalModelName(model);
  const explicitName = getExplicitModelName(model);
  const candidates = [
    canonicalName,
    explicitName,
    ...normalizeAliases(model.aliases, [canonicalName, model.model]),
    model.model,
  ].filter((value): value is string => typeof value === 'string' && value.trim() !== '');

  return Array.from(new Set(candidates));
}

/**
 * 模型标识校验结果
 */
export interface ModelIdentityValidationResult {
  /** 校验是否通过 */
  valid: boolean;
  /** 失败原因 */
  error?: string;
}

/**
 * 校验模型标识唯一性
 * 检查规范名称是否与其他模型冲突
 *
 * @param config - 待校验的模型配置
 * @param allModels - 所有已保存模型
 * @param currentModelKey - 当前模型键（可选，用于排除自身）
 * @return 校验结果
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function validateModelIdentity(
  config: UnifiedModelConfig,
  allModels: UnifiedModelConfig[],
  currentModelKey?: string
): ModelIdentityValidationResult {
  const canonicalName = getCanonicalModelName(config);

  // 规范名称为空：校验失败
  if (!canonicalName) {
    return { valid: false, error: '规范名称不能为空' };
  }

  for (const model of allModels) {
    const modelKey = getPrimaryModelName(model);

    // 跳过自身
    if (currentModelKey && modelKey === currentModelKey) {
      continue;
    }
    // 与其他模型冲突
    else if (getModelReferenceNames(model).includes(canonicalName)) {
      return {
        valid: false,
        error: `名称已被模型 "${modelKey}" 占用: ${canonicalName}`,
      };
    }
  }

  return { valid: true };
}
