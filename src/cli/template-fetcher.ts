/**
 * 模板远程拉取器
 * 负责从 GitHub Raw 拉取模板配置并解析为 JSON 字符串
 *
 * 拆分原因：
 * - TemplateManager 类行数超限（>350 行），需将 HTTP 拉取逻辑独立抽出
 * - 网络 I/O 与文件 I/O 职责分离，便于单独测试
 *
 * @author lvdaxianerplus
 * @date 2026-05-04
 */

import * as https from 'https';

/** GitHub Raw 远程模板地址 */
const REMOTE_TEMPLATES_URL =
  'https://raw.githubusercontent.com/lvdaxianer/cmrm/master/templates/built-in-templates.json';

/** HTTP 请求超时（毫秒） */
const FETCH_TIMEOUT = 10000;

/**
 * 从远程拉取模板 JSON 字符串
 * 优先访问 GitHub Raw，支持 3xx 重定向跟随
 *
 * @return 拉取到的原始 JSON 字符串，失败返回 null
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
export async function fetchRemoteTemplateJson(): Promise<string | null> {
  return new Promise((resolve) => {
    // 创建并发送 HTTPS 请求
    sendTemplateRequest(resolve);
  });
}

/**
 * 创建并发送模板拉取 HTTPS 请求
 * 绑定响应回调、错误回调与超时回调
 *
 * @param resolve - Promise 解决函数
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
function sendTemplateRequest(resolve: (value: string | null) => void): void {
  // 发起 HTTPS GET 请求获取远程模板
  const req = https.get(
    REMOTE_TEMPLATES_URL,
    { timeout: FETCH_TIMEOUT },
    (res) => handleFetchResponse(res, resolve)
  );

  // 请求级错误：网络不通或 DNS 解析失败
  req.on('error', () => resolve(null));
  // 请求超时：销毁连接并返回失败
  req.on('timeout', () => {
    req.destroy();
    resolve(null);
  });
}

/**
 * 处理 HTTP 拉取响应
 * 区分重定向响应与正常响应，分别处理
 *
 * @param res - HTTP 响应对象
 * @param resolve - Promise 解决函数
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
function handleFetchResponse(
  res: import('http').IncomingMessage,
  resolve: (value: string | null) => void
): void {
  // 状态码为 3xx 重定向：跟随 location 重新请求
  if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    followRedirect(res.headers.location, resolve);
  }
  // 非重定向响应：直接读取响应体
  else {
    readResponseBody(res, resolve);
  }
}

/**
 * 跟随重定向地址重新请求
 * 使用重定向响应头中的 location 作为新 URL
 *
 * @param location - 重定向目标 URL
 * @param resolve - Promise 解决函数
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
function followRedirect(
  location: string,
  resolve: (value: string | null) => void
): void {
  // 使用重定向地址重新发起 HTTPS 请求
  https
    .get(location, { timeout: FETCH_TIMEOUT }, (redirectRes) => {
      readResponseBody(redirectRes, resolve);
    })
    // 重定向请求本身失败
    .on('error', () => resolve(null));
}

/**
 * 读取响应体内容
 * 仅处理 200 状态码，其他状态码视为失败
 *
 * @param res - HTTP 响应对象
 * @param resolve - Promise 解决函数
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
function readResponseBody(
  res: import('http').IncomingMessage,
  resolve: (value: string | null) => void
): void {
  // 非 200 状态码：远程请求失败
  if (res.statusCode !== 200) {
    resolve(null);
  }
  // 200 成功：收集响应数据片段
  else {
    collectBodyChunks(res, resolve);
  }
}

/**
 * 收集响应数据片段并拼接为完整字符串
 * 使用 Buffer 数组收集，避免循环内字符串拼接（性能优化）
 *
 * @param res - HTTP 响应对象
 * @param resolve - Promise 解决函数
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
function collectBodyChunks(
  res: import('http').IncomingMessage,
  resolve: (value: string | null) => void
): void {
  // 使用 Buffer 数组收集响应数据，避免循环内字符串拼接
  const chunks: Buffer[] = [];

  // 收到数据片段时推入数组
  res.on('data', (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  // 响应结束：拼接所有片段并返回完整字符串
  res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  // 响应过程出错：返回 null
  res.on('error', () => resolve(null));
}
