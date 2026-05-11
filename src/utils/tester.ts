/**
 * 模型配置测试模块（主入口）
 * 提供 HTTP API 协议测试功能，兼容 Anthropic 和 OpenAI 两种格式
 *
 * 模块拆分：
 * - 本文件：测试入口与重试机制
 * - tester-http.ts：HTTP 请求层
 * - tester-parser.ts：响应解析与错误分类
 * - tester-helpers.ts：重试逻辑与请求构建辅助函数
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { ApiType } from '../adapters/types';
import { TestResult } from './tester-parser';
import {
  runTestWithTiming,
  testModelConfigWithRetry,
} from './tester-helpers';

// 重新导出供外部使用，保持原有 import 路径不变
export { TestResult } from './tester-parser';
export { ErrorKind } from './tester-parser';

/** 默认请求超时（毫秒） */
const DEFAULT_TIMEOUT_MS = 10000;

/** 默认最大重试次数 */
const DEFAULT_MAX_RETRIES = 3;

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
 * @param maxRetries - 最大重试次数，默认 3
 * @param onRetry - 重试时的回调函数，参数为当前重试次数
 * @return Promise，resolve 测试结果（永不 reject）
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export async function testModelConfig(
  model: string,
  apiKey: string,
  baseUrl: string,
  apiType: ApiType = 'anthropic',
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  maxRetries: number = DEFAULT_MAX_RETRIES,
  onRetry?: (retryCount: number) => void
): Promise<TestResult> {
  const startTime = Date.now();
  return runTestWithTiming(model, apiKey, baseUrl, apiType, timeoutMs, startTime);
}

// 重新导出带重试的测试函数，保持 API 兼容
export { testModelConfigWithRetry } from './tester-helpers';
