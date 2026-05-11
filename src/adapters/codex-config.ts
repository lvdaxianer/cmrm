/**
 * Codex config.toml 管理模块
 * 负责读取、合并和写入 ~/.codex/config.toml 配置文件
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import * as fs from 'fs';
import * as path from 'path';
import * as TOML from '@iarna/toml';
import { UnifiedModelConfig } from './types';
import { backupConfig } from '../utils/backup';

/** JSON 缩进空格数（用于深拷贝） */
const JSON_INDENT = 2;

/** 默认推理强度 */
const DEFAULT_REASONING_EFFORT = 'medium';

/** Codex 配置目录名 */
const CODEX_CONFIG_DIR = '.codex';

/** Codex 配置文件名 */
const CODEX_CONFIG_FILE = 'config.toml';

/** 默认 provider 名称 */
const DEFAULT_PROVIDER_NAME = 'openai';

/** 默认 wire api */
const DEFAULT_WIRE_API = 'responses';

/** 默认禁用响应存储 */
const DEFAULT_DISABLE_RESPONSE_STORAGE = false;

/** 配置字段名：model */
const FIELD_MODEL = 'model';

/** 配置字段名：model_provider */
const FIELD_MODEL_PROVIDER = 'model_provider';

/** 配置字段名：model_reasoning_effort */
const FIELD_MODEL_REASONING_EFFORT = 'model_reasoning_effort';

/** 配置字段名：disable_response_storage */
const FIELD_DISABLE_RESPONSE_STORAGE = 'disable_response_storage';

/** 配置字段名：openai_base_url */
const FIELD_OPENAI_BASE_URL = 'openai_base_url';

/** 配置字段名：model_providers */
const FIELD_MODEL_PROVIDERS = 'model_providers';

/** 配置字段名：name */
const FIELD_NAME = 'name';

/** 配置字段名：base_url */
const FIELD_BASE_URL = 'base_url';

/** 配置字段名：env_key */
const FIELD_ENV_KEY = 'env_key';

/** 配置字段名：wire_api */
const FIELD_WIRE_API = 'wire_api';

/** 配置字段名：requires_openai_auth */
const FIELD_REQUIRES_OPENAI_AUTH = 'requires_openai_auth';

/** 默认 env_key 值 */
const DEFAULT_ENV_KEY = 'OPENAI_API_KEY';

/**
 * 解析 Codex 配置文件
 * 读取并解析 TOML 格式的 config.toml
 *
 * @param configPath - 配置文件绝对路径
 * @return 解析后的配置对象，文件不存在或解析失败返回 undefined
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function parseCodexConfig(configPath: string): any | undefined {
  // 条件：配置文件不存在
  if (!fs.existsSync(configPath)) {
    return undefined;
  }
  // 替代：读取并解析 TOML
  else {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return TOML.parse(content);
    } catch {
      return undefined;
    }
  }
}

/**
 * 读取原始 config.toml 内容
 *
 * @param configPath - 配置文件绝对路径
 * @return 原配置对象，文件不存在时返回空对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function readOriginalConfig(configPath: string): any {
  // 条件：配置文件存在
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return TOML.parse(content);
    } catch {
      return {};
    }
  }
  // 替代：配置文件不存在，返回空对象
  else {
    return {};
  }
}

/**
 * 确保配置目录存在
 *
 * @param configPath - 配置文件绝对路径
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function ensureConfigDir(configPath: string): void {
  const configDir = path.dirname(configPath);

  // 条件：目录不存在
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  // 替代：目录已存在，无需操作
  else {
    // 目录已存在，无需操作
  }
}

/**
 * Codex 默认配置值
 */
export const CODEX_DEFAULTS = {
  model_provider: DEFAULT_PROVIDER_NAME,
  wire_api: DEFAULT_WIRE_API,
  requires_openai_auth: true,
  disable_response_storage: DEFAULT_DISABLE_RESPONSE_STORAGE,
};

export const CODEX_RUNTIME_PROVIDER = DEFAULT_PROVIDER_NAME;

/**
 * 构建 provider 配置对象
 *
 * @param providerName - provider 名称
 * @param config - 模型配置
 * @return provider 配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function buildProviderConfig(providerName: string, config: UnifiedModelConfig): any {
  return {
    [FIELD_NAME]: providerName,
    [FIELD_BASE_URL]: config.baseUrl,
    [FIELD_ENV_KEY]: DEFAULT_ENV_KEY,
    [FIELD_WIRE_API]: CODEX_DEFAULTS.wire_api,
    [FIELD_REQUIRES_OPENAI_AUTH]: CODEX_DEFAULTS.requires_openai_auth,
  };
}

/**
 * 判断是否为内置 OpenAI provider
 *
 * @param providerName - provider 名称
 * @return 是内置 OpenAI provider 返回 true
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function isBuiltInOpenAIProvider(providerName: string): boolean {
  return providerName === CODEX_RUNTIME_PROVIDER;
}

/**
 * 解析运行时 provider
 *
 * @param original - 原始配置对象
 * @return 运行时 provider 名称
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function resolveRuntimeProvider(original: any): string {
  // 条件：存在有效的 model_provider 字段
  if (typeof original.model_provider === 'string' && original.model_provider.trim()) {
    return original.model_provider.trim();
  }
  // 替代：从 model_providers 中解析
  else {
    const providers = original.model_providers;
    // 条件：存在有效的 providers 配置
    if (providers && typeof providers === 'object') {
      const providerNames = Object.keys(providers).filter(Boolean);
      // 条件：有有效的 provider 名称
      if (providerNames.length > 0) {
        return providerNames[0];
      }
      // 替代：无有效 provider，使用默认值
      else {
        return CODEX_RUNTIME_PROVIDER;
      }
    }
    // 替代：无 providers 配置，使用默认值
    else {
      return CODEX_RUNTIME_PROVIDER;
    }
  }
}

/**
 * 比较两个 provider 配置是否相同
 *
 * @param a - 已有配置
 * @param b - 新配置
 * @return 相同返回 true
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function isProviderEqual(a: any, b: any): boolean {
  // 条件：任一配置为空
  if (!a || !b) {
    return false;
  }
  // 替代：逐字段比较
  else {
    return (
      a[FIELD_NAME] === b[FIELD_NAME] &&
      a[FIELD_BASE_URL] === b[FIELD_BASE_URL] &&
      a[FIELD_ENV_KEY] === b[FIELD_ENV_KEY] &&
      a[FIELD_WIRE_API] === b[FIELD_WIRE_API] &&
      a[FIELD_REQUIRES_OPENAI_AUTH] === b[FIELD_REQUIRES_OPENAI_AUTH]
    );
  }
}

/**
 * 比较顶层字段是否变化
 *
 * @param original - 当前原始配置
 * @param config - 新模型配置
 * @param runtimeProvider - 运行时 provider 名称
 * @return 变化返回 true
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function isTopLevelChanged(original: any, config: UnifiedModelConfig, runtimeProvider: string): boolean {
  const currentReasoningEffort = config.modelReasoningEffort || DEFAULT_REASONING_EFFORT;
  const currentDisableStorage = config.disableResponseStorage ?? CODEX_DEFAULTS.disable_response_storage;
  const currentBaseUrl = config.baseUrl;

  const isModelChanged = original[FIELD_MODEL] !== config.model;
  const isProviderChanged = original[FIELD_MODEL_PROVIDER] !== runtimeProvider;
  const isReasoningChanged = original[FIELD_MODEL_REASONING_EFFORT] !== currentReasoningEffort;
  const isStorageChanged = original[FIELD_DISABLE_RESPONSE_STORAGE] !== currentDisableStorage;
  const isBaseUrlChanged = (original[FIELD_OPENAI_BASE_URL] || '') !== currentBaseUrl;

  return isModelChanged || isProviderChanged || isReasoningChanged || isStorageChanged || isBaseUrlChanged;
}

/**
 * 合并 TOML 配置
 * 保留原有配置中非模型相关的字段，但只保留当前激活的 provider 配置
 * 密钥不写入 config.toml，而是通过 env_key 指向 auth.json
 * provider 名称从 config.provider 动态获取
 *
 * @param original - 原配置对象
 * @param config - 新模型配置
 * @return 合并结果，changed=false 表示无需写入
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function buildMergedConfig(
  original: any,
  config: UnifiedModelConfig,
  runtimeProvider: string,
  nextReasoningEffort: string,
  nextDisableResponseStorage: boolean,
  newProvider: any
): any {
  const merged = JSON.parse(JSON.stringify(original, null, JSON_INDENT));
  merged[FIELD_MODEL] = config.model;
  merged[FIELD_MODEL_PROVIDER] = runtimeProvider;
  merged[FIELD_MODEL_REASONING_EFFORT] = nextReasoningEffort;
  merged[FIELD_DISABLE_RESPONSE_STORAGE] = nextDisableResponseStorage;
  merged[FIELD_OPENAI_BASE_URL] = config.baseUrl;
  merged[FIELD_MODEL_PROVIDERS] = {
    [runtimeProvider]: newProvider,
  };
  return merged;
}

export function mergeTomlConfig(original: any, config: UnifiedModelConfig): { config: any; changed: boolean } {
  const merged = JSON.parse(JSON.stringify(original, null, JSON_INDENT));

  // cmrm 层可以保存任意 provider/profile，但运行态优先沿用现有 provider
  const providerName = config.provider || CODEX_DEFAULTS.model_provider;
  const runtimeProvider = resolveRuntimeProvider(original);
  const nextReasoningEffort = config.modelReasoningEffort || DEFAULT_REASONING_EFFORT;
  const nextDisableResponseStorage =
    config.disableResponseStorage ?? CODEX_DEFAULTS.disable_response_storage;
  const newProvider = buildProviderConfig(runtimeProvider, config);
  const originalProviders = original[FIELD_MODEL_PROVIDERS] || {};
  const existingProvider = originalProviders[runtimeProvider];
  const providerChanged = !isProviderEqual(existingProvider, newProvider);

  // 检查顶层字段是否变化
  const topLevelChanged = isTopLevelChanged(original, config, runtimeProvider);

  // 条件：无任何变化，直接返回
  if (!providerChanged && !topLevelChanged) {
    return { config: merged, changed: false };
  }
  // 替代：有变化，更新 merged
  else {
    // 有变化时再更新 merged，切换时只保留当前激活 provider
    const updatedMerged = buildMergedConfig(
      original,
      config,
      runtimeProvider,
      nextReasoningEffort,
      nextDisableResponseStorage,
      newProvider
    );

    return { config: updatedMerged, changed: true };
  }
}

/**
 * 写入模型配置到 config.toml
 * 流程：备份 → 合并 → 检测变化 → 写入（无变化则跳过）
 *
 * @param configPath - 配置文件绝对路径
 * @param config - 要写入的模型配置
 * @return 备份文件名，无变化返回 undefined
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function writeCodexConfig(configPath: string, config: UnifiedModelConfig): string | undefined {
  // 读取原始配置
  const originalConfig = readOriginalConfig(configPath);

  // 合并配置(只更新连接方式，不存密钥)
  const { config: mergedConfig, changed } = mergeTomlConfig(originalConfig, config);

  // 条件：配置未变化，跳过写入
  if (!changed) {
    return undefined;
  }
  // 替代：配置有变化，执行备份和写入
  else {
    // 备份当前配置
    const backupFileName = backupConfig(configPath);

    // 确保目录存在并写入 config.toml
    ensureConfigDir(configPath);
    fs.writeFileSync(configPath, TOML.stringify(mergedConfig), 'utf-8');

    return backupFileName;
  }
}
