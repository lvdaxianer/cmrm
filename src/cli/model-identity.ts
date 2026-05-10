/**
 * 模型标识工具
 * 统一生成展示名、默认名与查找候选，尤其处理 Codex 的 provider/model 维度
 *
 * @author lvdaxianerplus
 * @date 2026-05-10
 */

import { UnifiedModelConfig } from '../types';

export function getCodexProfileName(model: UnifiedModelConfig): string {
  const provider = typeof model.provider === 'string' ? model.provider.trim() : '';
  const modelName = typeof model.model === 'string' ? model.model.trim() : '';

  if (provider && modelName) {
    return `${provider}/${modelName}`;
  }
  else {
    return modelName;
  }
}

function getRawModelName(model: UnifiedModelConfig): string {
  return typeof model.name === 'string' ? model.name.trim() : '';
}

export function getCanonicalModelName(model: UnifiedModelConfig): string {
  if (model.provider) {
    return getCodexProfileName(model);
  }
  else {
    return typeof model.model === 'string' ? model.model.trim() : '';
  }
}

export function getExplicitModelName(model: UnifiedModelConfig): string {
  const explicitName = getRawModelName(model);
  const canonicalName = getCanonicalModelName(model);

  if (!explicitName || explicitName === canonicalName) {
    return '';
  }
  // 兼容旧数据：Codex 历史上会把默认 name 写成裸 model，这种不应视为显式命名
  else if (model.provider && explicitName === (model.model || '').trim()) {
    return '';
  }
  else {
    return explicitName;
  }
}

export function getPrimaryModelName(model: UnifiedModelConfig): string {
  return getCanonicalModelName(model);
}

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

  if (aliases.length > 0) {
    normalizedConfig.aliases = aliases;
  }
  else {
    delete normalizedConfig.aliases;
  }

  return normalizedConfig;
}

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

export interface ModelIdentityValidationResult {
  valid: boolean;
  error?: string;
}

export function validateModelIdentity(
  config: UnifiedModelConfig,
  allModels: UnifiedModelConfig[],
  currentModelKey?: string
): ModelIdentityValidationResult {
  const canonicalName = getCanonicalModelName(config);

  if (!canonicalName) {
    return { valid: false, error: '规范名称不能为空' };
  }

  for (const model of allModels) {
    const modelKey = getPrimaryModelName(model);

    if (currentModelKey && modelKey === currentModelKey) {
      continue;
    }
    else if (getModelReferenceNames(model).includes(canonicalName)) {
      return {
        valid: false,
        error: `名称已被模型 "${modelKey}" 占用: ${canonicalName}`,
      };
    }
  }

  return { valid: true };
}
