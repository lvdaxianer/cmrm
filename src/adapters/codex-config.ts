/**
 * Codex config.toml 管理模块
 * 负责读取、合并和写入 ~/.codex/config.toml 配置文件
 *
 * @author lvdaxianerplus
 * @date 2026-05-09
 */

import * as fs from 'fs';
import * as path from 'path';
import * as TOML from '@iarna/toml';
import { UnifiedModelConfig } from './types';
import { backupConfig } from '../utils/backup';

/**
 * 解析 Codex 配置文件
 * 读取并解析 TOML 格式的 config.toml
 *
 * @param configPath - 配置文件绝对路径
 * @return 解析后的配置对象，文件不存在或解析失败返回 null
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function parseCodexConfig(configPath: string): any | null {
  // 配置文件不存在
  if (!fs.existsSync(configPath)) {
    return null;
  }
  // 读取并解析 TOML
  else {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return TOML.parse(content);
    } catch {
      return null;
    }
  }
}

/**
 * 读取原始 config.toml 内容
 *
 * @param configPath - 配置文件绝对路径
 * @return 原配置对象，文件不存在时返回空对象
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function readOriginalConfig(configPath: string): any {
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return TOML.parse(content);
    } catch {
      return {};
    }
  }
  else {
    return {};
  }
}

/**
 * 确保配置目录存在
 *
 * @param configPath - 配置文件绝对路径
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function ensureConfigDir(configPath: string): void {
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

/**
 * Codex 默认配置值
 */
export const CODEX_DEFAULTS = {
  model_provider: 'openai',
  wire_api: 'responses',
  requires_openai_auth: true,
  disable_response_storage: false,
};

export const CODEX_RUNTIME_PROVIDER = 'openai';

/**
 * 构建 provider 配置对象
 *
 * @param providerName - provider 名称
 * @param config - 模型配置
 * @return provider 配置对象
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
function buildProviderConfig(providerName: string, config: UnifiedModelConfig): any {
  return {
    name: providerName,
    base_url: config.baseUrl,
    env_key: 'OPENAI_API_KEY',
    wire_api: CODEX_DEFAULTS.wire_api,
    requires_openai_auth: CODEX_DEFAULTS.requires_openai_auth,
  };
}

function usesBuiltInOpenAIProvider(providerName: string): boolean {
  return providerName === CODEX_RUNTIME_PROVIDER;
}

function resolveRuntimeProvider(original: any): string {
  if (typeof original.model_provider === 'string' && original.model_provider.trim()) {
    return original.model_provider.trim();
  }

  const providers = original.model_providers;
  if (providers && typeof providers === 'object') {
    const providerNames = Object.keys(providers).filter(Boolean);
    if (providerNames.length > 0) {
      return providerNames[0];
    }
  }

  return CODEX_RUNTIME_PROVIDER;
}

/**
 * 比较两个 provider 配置是否相同
 *
 * @param a - 已有配置
 * @param b - 新配置
 * @return 相同返回 true
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
function isProviderEqual(a: any, b: any): boolean {
  if (!a || !b) {
    return false;
  }

  return (
    a.name === b.name &&
    a.base_url === b.base_url &&
    a.env_key === b.env_key &&
    a.wire_api === b.wire_api &&
    a.requires_openai_auth === b.requires_openai_auth
  );
}

/**
 * 比较顶层字段是否变化
 *
 * @param merged - 当前合并中的配置
 * @param config - 新模型配置
 * @param providerName - provider 名称
 * @return 变化返回 true
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
function isTopLevelChanged(merged: any, config: UnifiedModelConfig, runtimeProvider: string): boolean {
  return (
    merged.model !== config.model ||
    merged.model_provider !== runtimeProvider ||
    merged.model_reasoning_effort !== (config.modelReasoningEffort || 'medium') ||
    merged.disable_response_storage !== (config.disableResponseStorage ?? CODEX_DEFAULTS.disable_response_storage) ||
    (merged.openai_base_url || '') !== config.baseUrl
  );
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
 * @date 2026-05-09
 * @date 2026-05-10 支持动态 provider，新增变更检测
 * @date 2026-05-10 切换时仅写入当前唯一 provider
 */
export function mergeTomlConfig(original: any, config: UnifiedModelConfig): { config: any; changed: boolean } {
  const merged = JSON.parse(JSON.stringify(original));

  // cmrm 层可以保存任意 provider/profile，但运行态优先沿用现有 provider
  const providerName = config.provider || CODEX_DEFAULTS.model_provider;
  const runtimeProvider = resolveRuntimeProvider(original);
  const nextReasoningEffort = config.modelReasoningEffort || 'medium';
  const nextDisableResponseStorage =
    config.disableResponseStorage ?? CODEX_DEFAULTS.disable_response_storage;
  const newProvider = buildProviderConfig(runtimeProvider, config);
  const originalProviders = original.model_providers || {};
  const existingProvider = originalProviders[runtimeProvider];
  const providerChanged = !isProviderEqual(existingProvider, newProvider);

  // 检查顶层字段是否变化
  const topLevelChanged = isTopLevelChanged(original, config, runtimeProvider);

  // 无任何变化：直接返回，无需写入
  if (!providerChanged && !topLevelChanged) {
    return { config: merged, changed: false };
  }

  // 有变化时再更新 merged，切换时只保留当前激活 provider
  merged.model = config.model;
  merged.model_provider = runtimeProvider;
  merged.model_reasoning_effort = nextReasoningEffort;
  merged.disable_response_storage = nextDisableResponseStorage;
  merged.openai_base_url = config.baseUrl;
  merged.model_providers = {
    [runtimeProvider]: newProvider,
  };

  return { config: merged, changed: true };
}

/**
 * 写入模型配置到 config.toml
 * 流程：备份 → 合并 → 检测变化 → 写入（无变化则跳过）
 *
 * @param configPath - 配置文件绝对路径
 * @param config - 要写入的模型配置
 * @return 备份文件名，无变化返回 null
 * @author lvdaxianerplus
 * @date 2026-05-09
 * @date 2026-05-10 增加变更检测，无变化不写入
 */
export function writeCodexConfig(configPath: string, config: UnifiedModelConfig): string | null {
  // 读取原始配置
  const originalConfig = readOriginalConfig(configPath);

  // 合并配置(只更新连接方式，不存密钥)
  const { config: mergedConfig, changed } = mergeTomlConfig(originalConfig, config);

  // 配置未变化：跳过写入，不生成备份
  if (!changed) {
    return null;
  }

  // 备份当前配置
  const backupFileName = backupConfig(configPath);

  // 确保目录存在并写入 config.toml
  ensureConfigDir(configPath);
  fs.writeFileSync(configPath, TOML.stringify(mergedConfig), 'utf-8');

  return backupFileName;
}
