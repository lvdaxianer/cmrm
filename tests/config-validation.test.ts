/**
 * 配置验证测试
 * 测试 SL-056 ~ SL-065 故事线场景
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import { describe, it, expect } from 'vitest';
import { ClaudeAdapter } from '../src/adapters/claude';
import { OpenCodeAdapter } from '../src/adapters/opencode';

/**
 * Claude 配置验证测试
 * 覆盖故事线 SL-056 ~ SL-061
 */
describe('Claude 配置验证 (SL-056 ~ SL-061)', () => {
  const adapter = new ClaudeAdapter();

  // SL-056: Claude model验证空值
  it('SL-056: model为空字符串时验证失败', () => {
    const config = {
      model: '',
      apiKey: 'test-key',
      baseUrl: 'https://api.anthropic.com',
    };

    const result = adapter.validateConfig(config as any);

    // 验证失败返回 false
    expect(result).toBe(false);
  });

  // SL-057: Claude model验证有值
  it('SL-057: model有值时继续验证apiKey', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com',
    };

    const result = adapter.validateConfig(config as any);

    // apiKey为空时验证失败
    expect(result).toBe(false);
  });

  // SL-058: Claude apiKey验证空值
  it('SL-058: apiKey为空字符串时验证失败', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com',
    };

    const result = adapter.validateConfig(config as any);

    // 验证失败返回 false
    expect(result).toBe(false);
  });

  // SL-059: Claude apiKey验证有值
  it('SL-059: apiKey有值时继续验证baseUrl', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      apiKey: 'test-api-key',
      baseUrl: '',
    };

    const result = adapter.validateConfig(config as any);

    // baseUrl为空时验证失败
    expect(result).toBe(false);
  });

  // SL-060: Claude baseUrl验证空值
  it('SL-060: baseUrl为空字符串时验证失败', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      apiKey: 'test-api-key',
      baseUrl: '',
    };

    const result = adapter.validateConfig(config as any);

    // 验证失败返回 false
    expect(result).toBe(false);
  });

  // SL-061: Claude所有字段有效
  it('SL-061: model/apiKey/baseUrl都有值时验证通过', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      apiKey: 'test-api-key',
      baseUrl: 'https://api.anthropic.com',
    };

    const result = adapter.validateConfig(config as any);

    // 验证通过返回 true
    expect(result).toBe(true);
  });
});

/**
 * OpenCode 配置验证测试
 * 覆盖故事线 SL-062 ~ SL-064
 */
describe('OpenCode 配置验证 (SL-062 ~ SL-064)', () => {
  const adapter = new OpenCodeAdapter();

  // SL-062: OpenCode provider验证空值
  it('SL-062: provider为空字符串时验证失败', () => {
    const config = {
      model: 'gpt-4',
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1',
      provider: '',
    };

    const result = adapter.validateConfig(config as any);

    // 验证失败返回 false
    expect(result).toBe(false);
  });

  // SL-063: OpenCode provider验证有值
  it('SL-063: provider有值时继续验证其他字段', () => {
    const config = {
      model: '',
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1',
      provider: 'openai',
    };

    const result = adapter.validateConfig(config as any);

    // model为空时验证失败
    expect(result).toBe(false);
  });

  // SL-064: OpenCode所有字段有效
  it('SL-064: model/apiKey/baseUrl/provider都有值时验证通过', () => {
    const config = {
      model: 'gpt-4',
      apiKey: 'test-api-key',
      baseUrl: 'https://api.openai.com/v1',
      provider: 'openai',
    };

    const result = adapter.validateConfig(config as any);

    // 验证通过返回 true
    expect(result).toBe(true);
  });
});

/**
 * 配置验证边界情况测试
 */
describe('配置验证边界情况', () => {
  const claudeAdapter = new ClaudeAdapter();
  const opencodeAdapter = new OpenCodeAdapter();

  // model为undefined
  it('model为undefined时验证失败', () => {
    const config = {
      apiKey: 'test-key',
      baseUrl: 'https://api.anthropic.com',
    };

    expect(claudeAdapter.validateConfig(config as any)).toBe(false);
  });

  // apiKey为undefined
  it('apiKey为undefined时验证失败', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      baseUrl: 'https://api.anthropic.com',
    };

    expect(claudeAdapter.validateConfig(config as any)).toBe(false);
  });

  // baseUrl为undefined
  it('baseUrl为undefined时验证失败', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      apiKey: 'test-key',
    };

    expect(claudeAdapter.validateConfig(config as any)).toBe(false);
  });

  // 配置包含可选字段（haiku/sonnet/opus）
  it('Claude配置包含可选字段时验证通过', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      apiKey: 'test-key',
      baseUrl: 'https://api.anthropic.com',
      haikuModel: 'claude-haiku-4-5',
      sonnetModel: 'claude-sonnet-4-5',
      opusModel: 'claude-opus-4-5',
      name: 'test-config',
    };

    expect(claudeAdapter.validateConfig(config as any)).toBe(true);
  });
});