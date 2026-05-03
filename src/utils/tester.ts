/**
 * 模型配置测试模块（主入口）
 * 提供 HTTP API 协议测试功能，兼容 Anthropic 和 OpenAI 两种格式
 *
 * 模块拆分：
 * - 本文件：协议构建（端点/请求头/请求体）+ 测试入口
 * - tester-http.ts：HTTP 请求层
 * - tester-parser.ts：响应解析与错误分类
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { URL } from 'url';
import { ApiType } from '../adapters/types';
import { sendRequest } from './tester-http';
import {
  TestResult,
  ErrorKind,
  parseResponse,
  buildErrorResult,
} from './tester-parser';

// 重新导出供外部使用，保持原有 import 路径不变
export { TestResult, ErrorKind };

/** 默认请求超时（毫秒） */
const DEFAULT_TIMEOUT_MS = 10000;

/** 测试请求最大输出 token 数（设置为最小值，减少计费压力） */
const TEST_MAX_TOKENS = 10;

/** Anthropic API 版本（用于 anthropic-version 请求头） */
const ANTHROPIC_API_VERSION = '2023-06-01';

/**
 * 测试模型配置是否可用
 * 根据 apiType 分发到 Anthropic 或 OpenAI 格式发起测试请求
 *
 * 不会抛出异常：所有失败情形都会通过 TestResult.success=false 返回
 *
 * @param model - 模型名称（必填，不可为空字符串）
 * @param apiKey - API 密钥（必填，将放入对应协议的认证头）
 * @param baseUrl - API 基础 URL（必填，如 https://api.anthropic.com）
 * @param apiType - API 协议类型，默认 'anthropic'
 * @param timeoutMs - 请求超时毫秒数，默认 10000
 * @return Promise，resolve 测试结果（永不 reject）
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function testModelConfig(
  model: string,
  apiKey: string,
  baseUrl: string,
  apiType: ApiType = 'anthropic',
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<TestResult> {
  // 记录开始时间用于计算耗时
  const startTime = Date.now();

  try {
    // 构建协议相关的请求要素
    const endpoint = buildEndpoint(baseUrl, apiType);
    const headers = buildHeaders(apiKey, apiType);
    const body = buildRequestBody(model);

    // 发送请求并收集响应
    const response = await sendRequest(endpoint, headers, body, timeoutMs);
    const durationMs = Date.now() - startTime;

    // 委托 parser 模块解析响应
    return parseResponse(response.statusCode, response.body, durationMs, apiType);
  }
  // 捕获网络层异常或超时（由 sendRequest 抛出）
  catch (error) {
    const durationMs = Date.now() - startTime;
    return buildErrorResult(error, durationMs);
  }
}

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
 * @date 2026-05-03
 */
function buildEndpoint(baseUrl: string, apiType: ApiType): URL {
  // 标准化：去除尾部斜杠
  const trimmed = baseUrl.replace(/\/+$/, '');

  // 检查是否已包含 /v1 后缀，避免重复拼接
  const hasV1 = /\/v1$/.test(trimmed);

  // Anthropic 协议：路径 /v1/messages
  if (apiType === 'anthropic') {
    const suffix = hasV1 ? '/messages' : '/v1/messages';
    return new URL(trimmed + suffix);
  }
  // OpenAI 协议：路径 /v1/chat/completions
  else {
    const suffix = hasV1 ? '/chat/completions' : '/v1/chat/completions';
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
 * @date 2026-05-03
 */
function buildHeaders(apiKey: string, apiType: ApiType): Record<string, string> {
  // Anthropic 协议：x-api-key + anthropic-version
  if (apiType === 'anthropic') {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
    };
  }
  // OpenAI 协议：Authorization: Bearer
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
 * @date 2026-05-03
 */
function buildRequestBody(model: string): string {
  return JSON.stringify({
    model,
    max_tokens: TEST_MAX_TOKENS,
    messages: [{ role: 'user', content: 'ping' }],
  });
}
