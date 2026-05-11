/**
 * 模型测试 HTTP 请求层
 * 封装基于 Node 原生 https/http 模块的请求发送、超时控制与响应收集
 *
 * 拆分自 tester.ts，以满足单文件 ≤ 350 行的代码复杂度约束
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

/** HTTPS 默认端口 */
const HTTPS_DEFAULT_PORT = 443;

/** HTTP 默认端口 */
const HTTP_DEFAULT_PORT = 80;

/** HTTP 方法 POST */
const HTTP_METHOD_POST = 'POST';

/** 十进制基数 */
const DECIMAL_RADIX = 10;

/**
 * HTTP 响应数据结构
 * 仅保留测试场景下需要使用的最小字段
 */
export interface HttpResponse {
  /** HTTP 状态码（0 表示协议层未收到状态码） */
  statusCode: number;
  /** 响应体字符串（utf-8 解码） */
  body: string;
}

/**
 * 发起 HTTPS/HTTP 请求并收集响应
 * 使用 setTimeout + req.destroy 实现超时（兼容 Node < 17.3）
 *
 * @param url - 目标 URL 对象
 * @param headers - 请求头映射
 * @param body - 请求体字符串
 * @param timeoutMs - 超时毫秒数
 * @return Promise，resolve 时返回响应；reject 时返回 NodeJS.ErrnoException
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function sendRequest(
  url: URL,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    // 根据协议选择 https 或 http 模块
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    // 构建底层请求选项
    const options = buildRequestOptions(url, headers, body);

    // 发起请求并注册响应处理回调
    const req = lib.request(options, (res) => handleResponse(res, resolve));

    // 注册超时定时器（命中后销毁请求并抛出 ETIMEDOUT）
    const timer = setTimeout(() => handleTimeout(req, reject), timeoutMs);

    // 监听请求层错误（DNS/连接拒绝等）并清理定时器
    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    // 请求关闭时清理定时器，避免泄漏
    req.on('close', () => clearTimeout(timer));

    // 写入请求体并结束
    req.write(body);
    req.end();
  });
}

/**
 * 构建 https.request 的 options 对象
 * 自动计算 Content-Length，避免分块传输导致的兼容问题
 *
 * @param url - 目标 URL
 * @param headers - 调用方传入的请求头
 * @param body - 请求体字符串
 * @return Node 原生 RequestOptions
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function buildRequestOptions(
  url: URL,
  headers: Record<string, string>,
  body: string
): https.RequestOptions {
  // 端口规则：URL 显式指定优先；否则 https=443、http=80
  const port = url.port
    ? parseInt(url.port, DECIMAL_RADIX)
    : (url.protocol === 'https:' ? HTTPS_DEFAULT_PORT : HTTP_DEFAULT_PORT);

  return {
    method: HTTP_METHOD_POST,
    hostname: url.hostname,
    port,
    // 路径必须包含 search，避免丢失查询参数
    path: url.pathname + url.search,
    headers: {
      ...headers,
      'Content-Length': Buffer.byteLength(body).toString(),
    },
  };
}

/**
 * 处理响应数据收集
 * 边收边 push Buffer，end 时合并为 utf-8 字符串
 *
 * @param res - Node 响应对象
 * @param resolve - Promise resolve 回调
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function handleResponse(
  res: http.IncomingMessage,
  resolve: (value: HttpResponse) => void
): void {
  // 累积响应分片，避免在 data 事件中拼接字符串
  const chunks: Buffer[] = [];

  // 收到分片时压入缓冲数组
  res.on('data', (chunk: Buffer) => chunks.push(chunk));

  // 响应结束时合并 Buffer 并解码为字符串
  res.on('end', () => {
    const responseBody = Buffer.concat(chunks).toString('utf-8');
    resolve({ statusCode: res.statusCode || 0, body: responseBody });
  });
}

/**
 * 处理超时事件
 * 销毁底层请求并构造带 ETIMEDOUT code 的错误，便于上层归类
 *
 * @param req - 客户端请求对象
 * @param reject - Promise reject 回调
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function handleTimeout(
  req: http.ClientRequest,
  reject: (reason: Error) => void
): void {
  // 销毁请求以释放资源
  req.destroy();

  // 构造 NodeJS.ErrnoException，携带 ETIMEDOUT code 让分类器识别
  const err = new Error('Request timeout') as NodeJS.ErrnoException;
  err.code = 'ETIMEDOUT';
  reject(err);
}
