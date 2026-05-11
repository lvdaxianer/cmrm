/**
 * 模型测试辅助函数
 * 封装重试机制、单次测试执行、结果处理等逻辑
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import { ApiType } from '../adapters/types';
import { sendRequest } from './tester-http';
import {
  TestResult,
  parseResponse,
  buildErrorResult,
} from './tester-parser';
import {
  buildEndpoint,
  buildHeaders,
  buildRequestBody,
} from './tester-request-builder';

// 重新导出供外部使用，保持原有 import 路径不变
export { TestResult } from './tester-parser';
export { ErrorKind } from './tester-parser';

/** 默认请求超时（毫秒） */
const DEFAULT_TIMEOUT_MS = 10000;

/** 初始重试次数 */
const INITIAL_RETRY_COUNT = 1;

/** 默认最大重试次数 */
const DEFAULT_MAX_RETRIES = 3;

/**
 * 执行单次模型配置测试
 *
 * @param model - 模型名称
 * @param apiKey - API 密钥
 * @param baseUrl - API 基础 URL
 * @param apiType - API 协议类型
 * @param timeoutMs - 请求超时毫秒数
 * @param startTime - 开始时间戳
 * @return 测试结果
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export async function executeSingleTest(
  model: string,
  apiKey: string,
  baseUrl: string,
  apiType: ApiType,
  timeoutMs: number,
  startTime: number
): Promise<TestResult> {
  const endpoint = buildEndpoint(baseUrl, apiType);
  const headers = buildHeaders(apiKey, apiType);
  const body = buildRequestBody(model);

  const response = await sendRequest(endpoint, headers, body, timeoutMs);
  const durationMs = Date.now() - startTime;

  return parseResponse(response.statusCode, response.body, durationMs, apiType);
}

/**
 * 执行测试并计算耗时
 *
 * @param model - 模型名称
 * @param apiKey - API 密钥
 * @param baseUrl - API 基础 URL
 * @param apiType - API 协议类型
 * @param timeoutMs - 请求超时毫秒数
 * @param startTime - 开始时间戳
 * @return 测试结果
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export async function runTestWithTiming(
  model: string,
  apiKey: string,
  baseUrl: string,
  apiType: ApiType,
  timeoutMs: number,
  startTime: number
): Promise<TestResult> {
  try {
    return await executeSingleTest(model, apiKey, baseUrl, apiType, timeoutMs, startTime);
  }
  // 捕获网络层异常或超时（由 sendRequest 抛出）
  catch (error) {
    const durationMs = Date.now() - startTime;
    return buildErrorResult(error, durationMs);
  }
}

/**
 * 执行单次带重试的测试尝试
 *
 * @param model - 模型名称
 * @param apiKey - API 密钥
 * @param baseUrl - API 基础 URL
 * @param apiType - API 协议类型
 * @param timeoutMs - 请求超时毫秒数
 * @param startTime - 开始时间戳
 * @return 测试结果
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export async function executeSingleAttempt(
  model: string,
  apiKey: string,
  baseUrl: string,
  apiType: ApiType,
  timeoutMs: number,
  startTime: number
): Promise<TestResult> {
  try {
    return await executeRetryTest(model, apiKey, baseUrl, apiType, timeoutMs, startTime);
  }
  // 捕获网络层异常或超时
  catch (error) {
    const durationMs = Date.now() - startTime;
    return buildErrorResult(error, durationMs);
  }
}

/**
 * 执行单次带重试的测试
 *
 * @param model - 模型名称
 * @param apiKey - API 密钥
 * @param baseUrl - API 基础 URL
 * @param apiType - API 协议类型
 * @param timeoutMs - 请求超时毫秒数
 * @param startTime - 开始时间戳
 * @return 测试结果
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
async function executeRetryTest(
  model: string,
  apiKey: string,
  baseUrl: string,
  apiType: ApiType,
  timeoutMs: number,
  startTime: number
): Promise<TestResult> {
  const endpoint = buildEndpoint(baseUrl, apiType);
  const headers = buildHeaders(apiKey, apiType);
  const body = buildRequestBody(model);

  const response = await sendRequest(endpoint, headers, body, timeoutMs);
  const durationMs = Date.now() - startTime;

  return parseResponse(response.statusCode, response.body, durationMs, apiType);
}

/**
 * 处理重试回调
 *
 * @param attempt - 当前尝试次数
 * @param maxRetries - 最大重试次数
 * @param onRetry - 重试回调
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function triggerRetry(
  attempt: number,
  maxRetries: number,
  onRetry?: (retryCount: number, maxRetries: number) => void
): void {
  // 条件：还有重试机会且存在回调
  if (attempt < maxRetries && onRetry) {
    onRetry(attempt + 1, maxRetries);
  }
  // 替代：无重试机会或无回调，不执行操作
  else {
    // 不执行重试回调
  }
}

/**
 * 处理单次测试结果
 *
 * @param result - 测试结果
 * @param attempt - 当前尝试次数
 * @param maxRetries - 最大重试次数
 * @param onRetry - 重试回调
 * @return 测试成功返回结果，否则返回 undefined
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function handleAttemptResult(
  result: TestResult,
  attempt: number,
  maxRetries: number,
  onRetry?: (retryCount: number, maxRetries: number) => void
): TestResult | undefined {
  // 条件：测试成功，直接返回
  if (result.success) {
    return result;
  }
  // 替代：测试失败，触发重试回调
  else {
    triggerRetry(attempt, maxRetries, onRetry);
    return undefined;
  }
}

/**
 * 带重试机制的测试模型配置
 * 失败时自动重试，直到成功或达到最大重试次数
 *
 * @param model - 模型名称
 * @param apiKey - API 密钥
 * @param baseUrl - API 基础 URL
 * @param apiType - API 协议类型
 * @param timeoutMs - 请求超时毫秒数
 * @param maxRetries - 最大重试次数（默认3次）
 * @param onRetry - 每次重试前的回调函数，参数为(当前重试次数, 最大重试次数)
 * @return 测试结果
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export async function testModelConfigWithRetry(
  model: string,
  apiKey: string,
  baseUrl: string,
  apiType: ApiType = 'anthropic',
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  maxRetries: number = DEFAULT_MAX_RETRIES,
  onRetry?: (retryCount: number, maxRetries: number) => void
): Promise<TestResult> {
  let lastResult: TestResult | undefined = undefined;

  for (let attempt = INITIAL_RETRY_COUNT; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    const result = await executeSingleAttempt(model, apiKey, baseUrl, apiType, timeoutMs, startTime);
    const successResult = handleAttemptResult(result, attempt, maxRetries, onRetry);

    // 条件：测试成功
    if (successResult) {
      return successResult;
    }
    // 替代：记录最后一次结果，继续重试
    else {
      lastResult = result;
    }
  }

  // 达到最大重试次数，返回最后一次结果
  return lastResult!;
}
