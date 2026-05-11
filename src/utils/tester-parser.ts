/**
 * 模型测试响应解析与错误分类层
 * 负责将 HTTP 响应/异常转换为 TestResult 数据结构
 *
 * 拆分自 tester.ts，以满足单文件 ≤ 350 行的代码复杂度约束
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { ApiType } from '../adapters/types';
import { t } from '../i18n';

/** HTTP 状态码：成功起始 */
const HTTP_SUCCESS_START = 200;

/** HTTP 状态码：成功结束 */
const HTTP_SUCCESS_END = 300;

/** HTTP 状态码：服务端错误起始 */
const HTTP_SERVER_ERROR_START = 500;

/** HTTP 状态码：服务端错误结束 */
const HTTP_SERVER_ERROR_END = 600;

/** 错误详情截断长度（避免响应体过大污染日志） */
const MAX_ERROR_DETAIL_LENGTH = 200;

/**
 * 错误类型分类
 * 用于精确定位测试失败原因，便于上层 UI 给出针对性提示
 */
export type ErrorKind =
  | 'timeout'           // 超时
  | 'network'           // 网络错误（DNS/连接拒绝等）
  | 'auth'              // 认证失败（401/403）
  | 'not_found'         // 资源未找到（404，通常是 model 错误）
  | 'rate_limit'        // 限流（429）
  | 'server'            // 服务端错误（5xx）
  | 'invalid_response'  // 响应格式异常（JSON 解析失败等）
  | 'unknown';          // 其他未知错误

/**
 * 测试结果数据结构
 * 仅包含必要字段，errorDetail 已脱敏，apiKey 不会出现
 */
export interface TestResult {
  /** 测试是否成功 */
  success: boolean;
  /** 主消息（一行总结） */
  message: string;
  /** 请求耗时（毫秒） */
  durationMs: number;
  /** HTTP 状态码 */
  statusCode?: number;
  /** 错误类型分类 */
  errorKind?: ErrorKind;
  /** 错误详情（脱敏，apiKey 不会出现） */
  errorDetail?: string;
}

/** HTTP 状态码分类策略映射 */
const STATUS_CLASSIFIERS: Array<{
  match: (statusCode: number) => boolean;
  kind: ErrorKind;
}> = [
  {
    match: (code) => code === 401 || code === 403,
    kind: 'auth',
  },
  {
    match: (code) => code === 404,
    kind: 'not_found',
  },
  {
    match: (code) => code === 429,
    kind: 'rate_limit',
  },
  {
    match: (code) => code >= HTTP_SERVER_ERROR_START && code < HTTP_SERVER_ERROR_END,
    kind: 'server',
  },
];

/**
 * 解析 HTTP 响应结果
 * 200~299 视为成功（再校验响应体结构），其他状态码归类错误
 *
 * @param statusCode - HTTP 状态码
 * @param body - 响应体字符串
 * @param durationMs - 请求耗时（毫秒）
 * @param apiType - API 协议类型
 * @return 测试结果
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function parseResponse(
  statusCode: number,
  body: string,
  durationMs: number,
  apiType: ApiType
): TestResult {
  // 条件：2xx 视为成功状态
  if (statusCode >= HTTP_SUCCESS_START && statusCode < HTTP_SUCCESS_END) {
    return parseSuccessResponse(body, durationMs, statusCode, apiType);
  }
  // 替代：非 2xx 视为失败状态
  else {
    return parseFailureResponse(statusCode, body, durationMs);
  }
}

/**
 * 构建网络/超时异常的测试结果
 * 用于 sendRequest 抛出异常时的兜底处理
 *
 * @param error - 捕获的异常对象（unknown 类型，需类型守卫）
 * @param durationMs - 请求耗时（毫秒）
 * @return 测试结果
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildErrorResult(error: unknown, durationMs: number): TestResult {
  // 分类错误类型并提取脱敏后的描述
  const errorKind = classifyByError(error);
  const errorDetail = extractSafeMessage(error);

  return {
    success: false,
    message: t('test.requestFailed', { errorKind }),
    durationMs,
    errorKind,
    errorDetail,
  };
}

/**
 * 解析成功响应（2xx）
 * 仅状态码为 2xx 不足以判定成功，还需校验响应体是否符合协议结构
 *
 * @param body - 响应体字符串
 * @param durationMs - 请求耗时
 * @param statusCode - HTTP 状态码
 * @param apiType - API 协议类型
 * @return 测试结果
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function parseSuccessResponse(
  body: string,
  durationMs: number,
  statusCode: number,
  apiType: ApiType
): TestResult {
  try {
    // 尝试解析 JSON 并校验结构
    const json = JSON.parse(body);
    const isValid = validateResponseShape(json, apiType);

    // 条件：响应结构合法
    if (isValid) {
      return { success: true, message: t('test.testPassed'), durationMs, statusCode };
    }
    // 替代：响应结构非法，返回 invalid_response 错误
    else {
      return buildInvalidResponseResult(durationMs, statusCode);
    }
  }
  // JSON 解析失败：归类为响应格式异常
  catch {
    return buildInvalidResponseResult(durationMs, statusCode);
  }
}

/**
 * 校验响应体结构是否符合协议预期
 * Anthropic 必须有 content 数组，OpenAI 必须有 choices 数组
 *
 * @param json - 已解析的 JSON 对象（结构未知，使用 any）
 * @param apiType - API 协议类型
 * @return 合法返回 true，否则 false
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function validateResponseShape(json: any, apiType: ApiType): boolean {
  // 条件：Anthropic 协议
  if (apiType === 'anthropic') {
    return Array.isArray(json?.content);
  }
  // 替代：OpenAI 协议
  else {
    return Array.isArray(json?.choices);
  }
}

/**
 * 构建非法响应结果
 * 状态码 2xx 但响应结构不符时使用
 *
 * @param durationMs - 请求耗时
 * @param statusCode - HTTP 状态码
 * @return 测试结果
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function buildInvalidResponseResult(durationMs: number, statusCode: number): TestResult {
  return {
    success: false,
    message: t('test.invalidResponse'),
    durationMs,
    statusCode,
    errorKind: 'invalid_response',
  };
}

/**
 * 解析失败响应（非 2xx）
 * 根据状态码归类错误，并从响应体中提取脱敏后的错误说明
 *
 * @param statusCode - HTTP 状态码
 * @param body - 响应体字符串
 * @param durationMs - 请求耗时
 * @return 测试结果
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function parseFailureResponse(
  statusCode: number,
  body: string,
  durationMs: number
): TestResult {
  const errorKind = classifyByStatus(statusCode);
  const errorDetail = extractErrorDetail(body);

  return {
    success: false,
    message: t('test.requestFailed', { errorKind }),
    durationMs,
    statusCode,
    errorKind,
    errorDetail,
  };
}

/**
 * 根据 HTTP 状态码分类错误
 * 使用策略模式替代多分支 if-else，便于扩展新的状态码分类
 *
 * @param statusCode - HTTP 状态码
 * @return 错误类型
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function classifyByStatus(statusCode: number): ErrorKind {
  for (const classifier of STATUS_CLASSIFIERS) {
    if (classifier.match(statusCode)) {
      return classifier.kind;
    }
  }
  return 'unknown';
}

/**
 * 从响应体中提取错误详情
 * 优先取标准的 error.message 字段，否则截断原文返回
 * 截断长度防止过长响应体污染日志
 *
 * @param body - 响应体字符串
 * @return 错误详情（脱敏，已截断）
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function extractErrorDetail(body: string): string {
  try {
    const json = JSON.parse(body);
    // 优先取 error.message 或 message 字段
    const msg = json?.error?.message || json?.message;

    // 条件：找到合法的错误消息
    if (typeof msg === 'string' && msg.length > 0) {
      return msg.slice(0, MAX_ERROR_DETAIL_LENGTH);
    }
    // 替代：未找到结构化错误消息，返回截断后的原文
    else {
      return body.slice(0, MAX_ERROR_DETAIL_LENGTH);
    }
  }
  // JSON 解析失败：返回截断后的原文
  catch {
    return body.slice(0, MAX_ERROR_DETAIL_LENGTH);
  }
}

/** 网络错误 code 集合 */
const NETWORK_ERROR_CODES = ['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'EHOSTUNREACH'];

/**
 * 根据 Node 错误对象分类
 * 使用 ErrnoException.code 字段做精确匹配
 *
 * @param error - 异常对象（unknown 类型，运行时类型守卫）
 * @return 错误类型
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function classifyByError(error: unknown): ErrorKind {
  const code = (error as NodeJS.ErrnoException)?.code;

  // 条件：超时（由 sendRequest 自定义抛出）
  if (code === 'ETIMEDOUT') {
    return 'timeout';
  }
  // 条件：连接被拒/DNS 解析失败/连接重置/主机不可达
  else if (code && NETWORK_ERROR_CODES.includes(code)) {
    return 'network';
  }
  // 替代：其他未知错误
  else {
    return 'unknown';
  }
}

/**
 * 提取错误对象的安全描述
 * 仅保留 code/message，避免 apiKey 等敏感信息泄漏到日志
 *
 * @param error - 异常对象（unknown 类型，运行时类型守卫）
 * @return 安全的错误描述字符串
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function extractSafeMessage(error: unknown): string {
  // 条件：Error 实例
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code ? `${code}: ${error.message}` : error.message;
  }
  // 替代：非 Error 实例，返回固定字符串避免类型不安全
  else {
    return 'unknown error';
  }
}
