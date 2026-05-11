/**
 * 测试请求构建器
 * 封装 API 端点、请求头、请求体的构建逻辑
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import { URL } from 'url';
import { ApiType } from '../adapters/types';

/** 测试请求最大输出 token 数（设置为最小值，减少计费压力） */
const TEST_MAX_TOKENS = 10;

/** Anthropic API 版本（用于 anthropic-version 请求头） */
const ANTHROPIC_API_VERSION = '2023-06-01';

/** Anthropic 协议端点路径 */
const ANTHROPIC_ENDPOINT_PATH = '/messages';

/** OpenAI 协议端点路径 */
const OPENAI_ENDPOINT_PATH = '/chat/completions';

/** API 版本路径前缀 */
const API_VERSION_PREFIX = '/v1';

/** 尾部斜杠正则 */
const TRAILING_SLASHES = /\/+$/;

/** v1 后缀正则 */
const V1_SUFFIX = /\/v1$/;

/**
 * 构建 API 端点 URL
 * 根据 apiType 选择路径，并处理 baseUrl 末尾 /v1 重复问题
 *
 * 处理规则：
 * - 去除 baseUrl 末尾所有 `/`
 * - 若已以 `/v1` 结尾：仅追加协议子路径（messages / chat/completions）
 * - 若未以 `/v1` 结尾：追加 `/v1` + 协议子路径
 *
 * @param baseUrl - 原始 base URL（如 https://api.anthropic.com）
 * @param apiType - API 协议类型
 * @return 完整的 URL 对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildEndpoint(baseUrl: string, apiType: ApiType): URL {
  // 标准化：去除尾部斜杠
  const trimmed = baseUrl.replace(TRAILING_SLASHES, '');

  // 检查是否已包含 /v1 后缀，避免重复拼接
  const hasV1 = V1_SUFFIX.test(trimmed);

  // 条件：Anthropic 协议
  if (apiType === 'anthropic') {
    const suffix = hasV1 ? ANTHROPIC_ENDPOINT_PATH : `${API_VERSION_PREFIX}${ANTHROPIC_ENDPOINT_PATH}`;
    return new URL(trimmed + suffix);
  }
  // 替代：OpenAI 协议
  else {
    const suffix = hasV1 ? OPENAI_ENDPOINT_PATH : `${API_VERSION_PREFIX}${OPENAI_ENDPOINT_PATH}`;
    return new URL(trimmed + suffix);
  }
}

/**
 * 构建请求头
 * 不同协议的认证头与版本头存在差异
 *
 * @param apiKey - API 密钥
 * @param apiType - API 协议类型
 * @return HTTP 请求头映射
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildHeaders(apiKey: string, apiType: ApiType): Record<string, string> {
  // 条件：Anthropic 协议
  if (apiType === 'anthropic') {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
    };
  }
  // 替代：OpenAI 协议
  else {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
  }
}

/**
 * 构建请求体
 * Anthropic 与 OpenAI 协议均支持 messages 数组格式，因此可共用同一结构
 * 使用最小 max_tokens 减少计费消耗
 *
 * @param model - 模型名称
 * @return JSON 字符串（请求体）
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildRequestBody(model: string): string {
  return JSON.stringify({
    model,
    max_tokens: TEST_MAX_TOKENS,
    messages: [{ role: 'user', content: 'ping' }],
  });
}
