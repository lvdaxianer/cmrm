/**
 * Claude 模型辅助函数模块
 * 负责模型配置转换、提取、查找等模型相关操作
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import { UnifiedModelConfig } from './types';
import { normalizeModelIdentity } from '../cli/model-identity';

/** 环境变量：主模型 */
const ENV_ANTHROPIC_MODEL = 'ANTHROPIC_MODEL';

/** 环境变量：认证令牌 */
const ENV_ANTHROPIC_AUTH_TOKEN = 'ANTHROPIC_AUTH_TOKEN';

/** 环境变量：基础 URL */
const ENV_ANTHROPIC_BASE_URL = 'ANTHROPIC_BASE_URL';

/** 环境变量：Haiku 模型 */
const ENV_ANTHROPIC_HAIKU = 'ANTHROPIC_DEFAULT_HAIKU_MODEL';

/** 环境变量：Sonnet 模型 */
const ENV_ANTHROPIC_SONNET = 'ANTHROPIC_DEFAULT_SONNET_MODEL';

/** 环境变量：Opus 模型 */
const ENV_ANTHROPIC_OPUS = 'ANTHROPIC_DEFAULT_OPUS_MODEL';

/**
 * 转换旧格式配置到新格式
 * 将 ModelConfig 格式转换为 UnifiedModelConfig
 *
 * @param oldConfig - 旧格式配置（ModelConfig）
 * @return 新格式配置（UnifiedModelConfig）
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function convertOldToNew(oldConfig: any): UnifiedModelConfig {
  return normalizeModelIdentity({
    name: oldConfig.name || oldConfig[ENV_ANTHROPIC_MODEL],
    model: oldConfig[ENV_ANTHROPIC_MODEL],
    apiKey: oldConfig[ENV_ANTHROPIC_AUTH_TOKEN],
    baseUrl: oldConfig[ENV_ANTHROPIC_BASE_URL],
    haikuModel: oldConfig[ENV_ANTHROPIC_HAIKU],
    sonnetModel: oldConfig[ENV_ANTHROPIC_SONNET],
    opusModel: oldConfig[ENV_ANTHROPIC_OPUS],
    aliases: oldConfig.aliases,
  });
}

/**
 * 从配置对象中提取模型列表
 * 支持新格式和旧格式的兼容读取
 *
 * @param settings - 配置对象
 * @return 模型配置数组
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function extractModelsFromSettings(settings: any): UnifiedModelConfig[] {
  // 条件：新格式 tools.claude.modes 存在
  if (settings.tools && settings.tools.claude && settings.tools.claude.modes) {
    return settings.tools.claude.modes;
  }
  // 条件：旧格式 modes 字段存在（需要转换）
  else if (settings.modes) {
    return settings.modes.map((mode: any) => convertOldToNew(mode));
  }
  // 替代：无模型配置，返回空数组
  else {
    return [];
  }
}

/**
 * 查找已存在的配置索引
 * 根据名称查找是否已有相同配置
 *
 * @param modes - 模型配置数组
 * @param config - 新配置
 * @return 已存在配置的索引，不存在返回 -1
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function findExistingIndex(modes: UnifiedModelConfig[], config: UnifiedModelConfig): number {
  const targetKey = getPrimaryModelName(config);
  return modes.findIndex((m: UnifiedModelConfig) => getPrimaryModelName(m) === targetKey);
}

/**
 * 从 env 对象构建模型配置对象
 * 提取模型相关字段到统一配置格式
 *
 * @param env - Claude 配置的 env 对象
 * @return 模型配置对象，无模型配置时返回 undefined
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildModelConfig(env: any): UnifiedModelConfig | undefined {
  // 条件：无模型配置
  if (!env[ENV_ANTHROPIC_MODEL]) {
    return undefined;
  }
  // 替代：有模型配置，构建对象
  else {
    const modelConfig: UnifiedModelConfig = {
      model: env[ENV_ANTHROPIC_MODEL],
      apiKey: env[ENV_ANTHROPIC_AUTH_TOKEN] || '',
      baseUrl: env[ENV_ANTHROPIC_BASE_URL] || '',
      haikuModel: env[ENV_ANTHROPIC_HAIKU],
      sonnetModel: env[ENV_ANTHROPIC_SONNET],
      opusModel: env[ENV_ANTHROPIC_OPUS],
    };

    return modelConfig;
  }
}

/**
 * 获取主模型名称（本地实现，避免循环依赖）
 * 优先使用 name 字段，其次 model 字段
 *
 * @param config - 模型配置
 * @return 主显示名称
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function getPrimaryModelName(config: UnifiedModelConfig): string {
  return config.name || config.model || '';
}
