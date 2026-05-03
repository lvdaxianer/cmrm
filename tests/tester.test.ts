/**
 * 模型配置测试模块的单元测试
 * 通过 mock https 模块覆盖 Anthropic / OpenAI 两种协议
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

/**
 * mock https 模块
 * 必须在 import tester 之前完成
 */
vi.mock('https', () => {
  return {
    default: { request: vi.fn() },
    request: vi.fn(),
  };
});

import * as https from 'https';
import { testModelConfig } from '../src/utils/tester';

/**
 * 模拟响应场景类型
 */
interface MockScenario {
  /** HTTP 状态码（不传表示模拟错误事件） */
  statusCode?: number;
  /** 响应体字符串 */
  body?: string;
  /** 模拟网络错误（设置后忽略 statusCode/body） */
  errorCode?: string;
  /** 模拟超时（永不响应） */
  hang?: boolean;
}

/**
 * 上次请求的捕获参数
 */
interface CapturedRequest {
  options: any;
  body: string;
}

/** 当前测试中捕获的请求 */
let captured: CapturedRequest | null = null;

/**
 * 设置 https.request 的 mock 行为
 *
 * @param scenario - 模拟场景
 */
function setupMock(scenario: MockScenario): void {
  captured = null;
  const mockedRequest = vi.mocked(https.request);

  mockedRequest.mockImplementation(((options: any, callback: any) => {
    const req = new EventEmitter() as any;
    req.write = vi.fn((chunk: string) => {
      captured = { options, body: chunk };
    });
    req.end = vi.fn();
    req.destroy = vi.fn(() => {
      req.emit('close');
    });

    // 模拟超时：永不响应
    if (scenario.hang) {
      return req;
    }

    // 模拟网络错误
    if (scenario.errorCode) {
      setImmediate(() => {
        const err = new Error(scenario.errorCode!) as NodeJS.ErrnoException;
        err.code = scenario.errorCode;
        req.emit('error', err);
      });
      return req;
    }

    // 模拟正常响应
    const res = new EventEmitter() as any;
    res.statusCode = scenario.statusCode ?? 200;
    setImmediate(() => {
      callback(res);
      setImmediate(() => {
        res.emit('data', Buffer.from(scenario.body ?? ''));
        res.emit('end');
      });
    });
    return req;
  }) as any);
}

/**
 * 重置 mock 状态
 */
beforeEach(() => {
  vi.clearAllMocks();
  captured = null;
});

/**
 * Anthropic 协议测试
 */
describe('testModelConfig - Anthropic 协议', () => {
  // 200 OK 测试通过
  it('200 响应且 content 数组合法时返回 success=true', async () => {
    setupMock({ statusCode: 200, body: '{"content":[{"text":"pong"}]}' });

    const result = await testModelConfig('claude-3-haiku', 'sk-test', 'https://api.anthropic.com', 'anthropic');

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.message).toBe('测试通过');
  });

  // 请求路径正确
  it('请求路径包含 /v1/messages', async () => {
    setupMock({ statusCode: 200, body: '{"content":[]}' });

    await testModelConfig('claude-3', 'sk-x', 'https://api.anthropic.com', 'anthropic');

    expect(captured?.options.path).toBe('/v1/messages');
  });

  // 请求头包含 x-api-key 和 anthropic-version
  it('请求头包含 x-api-key 与 anthropic-version', async () => {
    setupMock({ statusCode: 200, body: '{"content":[]}' });

    await testModelConfig('m', 'my-key', 'https://api.anthropic.com', 'anthropic');

    expect(captured?.options.headers['x-api-key']).toBe('my-key');
    expect(captured?.options.headers['anthropic-version']).toBe('2023-06-01');
  });

  // baseUrl 末尾 /v1 不重复
  it('baseUrl 末尾包含 /v1 时不重复 /v1 段', async () => {
    setupMock({ statusCode: 200, body: '{"content":[]}' });

    await testModelConfig('m', 'k', 'https://example.com/v1', 'anthropic');

    // baseUrl 已含 /v1，仅追加 /messages，最终 pathname 仍为 /v1/messages
    expect(captured?.options.path).toBe('/v1/messages');
  });

  // baseUrl 末尾斜杠被去除
  it('baseUrl 末尾斜杠会被规范化', async () => {
    setupMock({ statusCode: 200, body: '{"content":[]}' });

    await testModelConfig('m', 'k', 'https://api.anthropic.com/', 'anthropic');

    expect(captured?.options.path).toBe('/v1/messages');
  });

  // 默认 apiType 为 anthropic
  it('未指定 apiType 时使用 anthropic 路径', async () => {
    setupMock({ statusCode: 200, body: '{"content":[]}' });

    await testModelConfig('m', 'k', 'https://api.anthropic.com');

    expect(captured?.options.path).toBe('/v1/messages');
    expect(captured?.options.headers['x-api-key']).toBe('k');
  });
});

/**
 * OpenAI 协议测试
 */
describe('testModelConfig - OpenAI 协议', () => {
  // 200 OK 测试通过
  it('200 响应且 choices 数组合法时返回 success=true', async () => {
    setupMock({ statusCode: 200, body: '{"choices":[{"message":{}}]}' });

    const result = await testModelConfig('gpt-4', 'sk-x', 'https://api.openai.com', 'openai');

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
  });

  // 请求路径正确
  it('请求路径包含 /v1/chat/completions', async () => {
    setupMock({ statusCode: 200, body: '{"choices":[]}' });

    await testModelConfig('gpt-4', 'sk-x', 'https://api.openai.com', 'openai');

    expect(captured?.options.path).toBe('/v1/chat/completions');
  });

  // 请求头包含 Authorization Bearer
  it('请求头包含 Authorization: Bearer', async () => {
    setupMock({ statusCode: 200, body: '{"choices":[]}' });

    await testModelConfig('gpt-4', 'my-key', 'https://api.openai.com', 'openai');

    expect(captured?.options.headers['Authorization']).toBe('Bearer my-key');
    expect(captured?.options.headers['x-api-key']).toBeUndefined();
  });

  // baseUrl 末尾 /v1 不重复
  it('baseUrl 末尾包含 /v1 时不重复 /v1 段', async () => {
    setupMock({ statusCode: 200, body: '{"choices":[]}' });

    await testModelConfig('m', 'k', 'https://api.openai.com/v1', 'openai');

    // baseUrl 已含 /v1，仅追加 /chat/completions，最终 pathname 仍为 /v1/chat/completions
    expect(captured?.options.path).toBe('/v1/chat/completions');
  });
});

/**
 * 错误状态码分类测试
 */
describe('testModelConfig - 错误状态码分类', () => {
  // 401 → auth
  it('401 状态码归类为 auth 错误', async () => {
    setupMock({ statusCode: 401, body: '{"error":{"message":"invalid api key"}}' });

    const result = await testModelConfig('m', 'bad-key', 'https://api.x.com');

    expect(result.success).toBe(false);
    expect(result.errorKind).toBe('auth');
    expect(result.statusCode).toBe(401);
  });

  // 403 → auth
  it('403 状态码归类为 auth 错误', async () => {
    setupMock({ statusCode: 403, body: '{}' });

    const result = await testModelConfig('m', 'k', 'https://api.x.com');

    expect(result.errorKind).toBe('auth');
  });

  // 404 → not_found
  it('404 状态码归类为 not_found 错误', async () => {
    setupMock({ statusCode: 404, body: '{"error":{"message":"model not found"}}' });

    const result = await testModelConfig('bad-model', 'k', 'https://api.x.com');

    expect(result.errorKind).toBe('not_found');
    expect(result.errorDetail).toContain('model not found');
  });

  // 429 → rate_limit
  it('429 状态码归类为 rate_limit 错误', async () => {
    setupMock({ statusCode: 429, body: '{}' });

    const result = await testModelConfig('m', 'k', 'https://api.x.com');

    expect(result.errorKind).toBe('rate_limit');
  });

  // 500 → server
  it('500 状态码归类为 server 错误', async () => {
    setupMock({ statusCode: 500, body: '{}' });

    const result = await testModelConfig('m', 'k', 'https://api.x.com');

    expect(result.errorKind).toBe('server');
  });

  // OpenAI 协议 401 同样归类
  it('OpenAI 401 也归类为 auth 错误', async () => {
    setupMock({ statusCode: 401, body: '{"error":{"message":"unauthorized"}}' });

    const result = await testModelConfig('m', 'k', 'https://api.x.com', 'openai');

    expect(result.errorKind).toBe('auth');
  });
});

/**
 * 网络错误测试
 */
describe('testModelConfig - 网络错误', () => {
  // ECONNREFUSED → network
  it('ECONNREFUSED 归类为 network 错误', async () => {
    setupMock({ errorCode: 'ECONNREFUSED' });

    const result = await testModelConfig('m', 'k', 'https://api.x.com');

    expect(result.success).toBe(false);
    expect(result.errorKind).toBe('network');
  });

  // ENOTFOUND → network
  it('ENOTFOUND 归类为 network 错误', async () => {
    setupMock({ errorCode: 'ENOTFOUND' });

    const result = await testModelConfig('m', 'k', 'https://nonexistent.invalid');

    expect(result.errorKind).toBe('network');
  });

  // 超时 → timeout
  it('请求挂起超过 timeoutMs 归类为 timeout 错误', async () => {
    setupMock({ hang: true });

    const result = await testModelConfig('m', 'k', 'https://api.x.com', 'anthropic', 50);

    expect(result.success).toBe(false);
    expect(result.errorKind).toBe('timeout');
  });
});

/**
 * 响应格式异常测试
 */
describe('testModelConfig - 响应格式异常', () => {
  // 非 JSON 响应
  it('非 JSON 响应归类为 invalid_response 错误', async () => {
    setupMock({ statusCode: 200, body: '<html>Not JSON</html>' });

    const result = await testModelConfig('m', 'k', 'https://api.x.com');

    expect(result.success).toBe(false);
    expect(result.errorKind).toBe('invalid_response');
  });

  // 200 但缺少 content 字段
  it('Anthropic 200 响应缺少 content 字段归类为 invalid_response', async () => {
    setupMock({ statusCode: 200, body: '{"some":"other"}' });

    const result = await testModelConfig('m', 'k', 'https://api.x.com', 'anthropic');

    expect(result.success).toBe(false);
    expect(result.errorKind).toBe('invalid_response');
  });

  // 200 但缺少 choices 字段（OpenAI）
  it('OpenAI 200 响应缺少 choices 字段归类为 invalid_response', async () => {
    setupMock({ statusCode: 200, body: '{"some":"other"}' });

    const result = await testModelConfig('m', 'k', 'https://api.x.com', 'openai');

    expect(result.errorKind).toBe('invalid_response');
  });
});

/**
 * 安全性：apiKey 不泄漏测试
 */
describe('testModelConfig - apiKey 脱敏', () => {
  // 错误信息不应包含 apiKey
  it('错误详情不包含 apiKey', async () => {
    setupMock({ errorCode: 'ECONNREFUSED' });
    const apiKey = 'sk-secret-12345';

    const result = await testModelConfig('m', apiKey, 'https://api.x.com');

    expect(result.errorDetail ?? '').not.toContain(apiKey);
  });

  // 401 错误详情不包含 apiKey
  it('401 响应详情不包含 apiKey（即使响应体提及）', async () => {
    const apiKey = 'sk-secret-12345';
    // 响应体不会真的包含 apiKey，这里只是验证 tester 不会主动泄漏
    setupMock({ statusCode: 401, body: '{"error":{"message":"invalid key"}}' });

    const result = await testModelConfig('m', apiKey, 'https://api.x.com');

    expect(result.errorDetail ?? '').not.toContain(apiKey);
  });
});

/**
 * 请求体内容测试
 */
describe('testModelConfig - 请求体格式', () => {
  // 请求体包含 ping 消息
  it('请求体包含 model/max_tokens/messages 字段', async () => {
    setupMock({ statusCode: 200, body: '{"content":[]}' });

    await testModelConfig('claude-3', 'k', 'https://api.x.com', 'anthropic');

    const body = JSON.parse(captured!.body);
    expect(body.model).toBe('claude-3');
    expect(body.max_tokens).toBe(10);
    expect(body.messages).toEqual([{ role: 'user', content: 'ping' }]);
  });

  // OpenAI 协议请求体相同
  it('OpenAI 协议请求体格式与 Anthropic 一致', async () => {
    setupMock({ statusCode: 200, body: '{"choices":[]}' });

    await testModelConfig('gpt-4', 'k', 'https://api.openai.com', 'openai');

    const body = JSON.parse(captured!.body);
    expect(body.model).toBe('gpt-4');
    expect(body.messages[0].content).toBe('ping');
  });
});
