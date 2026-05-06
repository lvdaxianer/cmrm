/**
 * 模型配置测试重试机制测试
 * 覆盖 testModelConfigWithRetry 函数
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

vi.mock('https', () => ({
  default: { request: vi.fn() },
  request: vi.fn(),
}));

import * as https from 'https';
import { testModelConfigWithRetry } from '../src/utils/tester';

let captured: any = null;

function setupMock(scenario: { statusCode?: number; body?: string; errorCode?: string; hang?: boolean }): void {
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

    if (scenario.hang) {
      return req;
    }

    if (scenario.errorCode) {
      setImmediate(() => {
        const err = new Error(scenario.errorCode!) as NodeJS.ErrnoException;
        err.code = scenario.errorCode;
        req.emit('error', err);
      });
      return req;
    }

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

beforeEach(() => {
  vi.clearAllMocks();
  captured = null;
});

describe('testModelConfigWithRetry', () => {
  it('首次成功应直接返回', async () => {
    setupMock({ statusCode: 200, body: '{"content":[{"text":"pong"}]}' });

    const result = await testModelConfigWithRetry('claude-3', 'sk-test', 'https://api.anthropic.com', 'anthropic', 10000, 3);

    expect(result.success).toBe(true);
  });

  it('失败重试后成功应返回成功', async () => {
    let callCount = 0;
    const mockedRequest = vi.mocked(https.request);
    mockedRequest.mockImplementation(((options: any, callback: any) => {
      const req = new EventEmitter() as any;
      req.write = vi.fn();
      req.end = vi.fn();

      callCount++;
      const res = new EventEmitter() as any;
      // 前两次失败，第三次成功
      if (callCount < 3) {
        res.statusCode = 500;
      } else {
        res.statusCode = 200;
      }
      const body = callCount < 3 ? '{}' : '{"content":[{"text":"pong"}]}';

      setImmediate(() => {
        callback(res);
        setImmediate(() => {
          res.emit('data', Buffer.from(body));
          res.emit('end');
        });
      });
      return req;
    }) as any);

    const onRetry = vi.fn();
    const result = await testModelConfigWithRetry('claude-3', 'sk-test', 'https://api.anthropic.com', 'anthropic', 10000, 3, onRetry);

    expect(result.success).toBe(true);
    expect(onRetry).toHaveBeenCalled();
  });

  it('全部重试失败后应返回失败', async () => {
    setupMock({ statusCode: 500, body: '{}' });

    const onRetry = vi.fn();
    const result = await testModelConfigWithRetry('claude-3', 'sk-test', 'https://api.anthropic.com', 'anthropic', 10000, 2, onRetry);

    expect(result.success).toBe(false);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('网络错误重试后应返回失败', async () => {
    setupMock({ errorCode: 'ECONNREFUSED' });

    const onRetry = vi.fn();
    const result = await testModelConfigWithRetry('claude-3', 'sk-test', 'https://api.anthropic.com', 'anthropic', 10000, 2, onRetry);

    expect(result.success).toBe(false);
    expect(result.errorKind).toBe('network');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('无 onRetry 回调时不应报错', async () => {
    setupMock({ statusCode: 500, body: '{}' });

    const result = await testModelConfigWithRetry('claude-3', 'sk-test', 'https://api.anthropic.com', 'anthropic', 10000, 2);

    expect(result.success).toBe(false);
  });
});
