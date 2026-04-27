/**
 * 配置验证测试
 * 测试 Claude 配置验证功能
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import { describe, it, expect } from 'vitest';
import { ClaudeAdapter } from '../src/adapters/claude';

/**
 * Claude 配置验证测试
 */
describe('Claude 配置验证', () => {
  const adapter = new ClaudeAdapter();

  // model验证空值
  it('model为空字符串时验证失败', () => {
    const config = {
      model: '',
      apiKey: 'test-key',
      baseUrl: 'https://api.anthropic.com',
    };

    const result = adapter.validateConfig(config as any);

    // 验证失败返回 false
    expect(result).toBe(false);
  });

  // model验证有值
  it('model有值时继续验证apiKey', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com',
    };

    const result = adapter.validateConfig(config as any);

    // apiKey为空时验证失败
    expect(result).toBe(false);
  });

  // apiKey验证空值
  it('apiKey为空字符串时验证失败', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      apiKey: '',
      baseUrl: 'https://api.anthropic.com',
    };

    const result = adapter.validateConfig(config as any);

    // 验证失败返回 false
    expect(result).toBe(false);
  });

  // apiKey验证有值
  it('apiKey有值时继续验证baseUrl', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      apiKey: 'test-api-key',
      baseUrl: '',
    };

    const result = adapter.validateConfig(config as any);

    // baseUrl为空时验证失败
    expect(result).toBe(false);
  });

  // baseUrl验证空值
  it('baseUrl为空字符串时验证失败', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      apiKey: 'test-api-key',
      baseUrl: '',
    };

    const result = adapter.validateConfig(config as any);

    // 验证失败返回 false
    expect(result).toBe(false);
  });

  // 所有字段有效
  it('model/apiKey/baseUrl都有值时验证通过', () => {
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
 * 配置验证边界情况测试
 */
describe('配置验证边界情况', () => {
  const adapter = new ClaudeAdapter();

  // model为undefined
  it('model为undefined时验证失败', () => {
    const config = {
      apiKey: 'test-key',
      baseUrl: 'https://api.anthropic.com',
    };

    expect(adapter.validateConfig(config as any)).toBe(false);
  });

  // apiKey为undefined
  it('apiKey为undefined时验证失败', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      baseUrl: 'https://api.anthropic.com',
    };

    expect(adapter.validateConfig(config as any)).toBe(false);
  });

  // baseUrl为undefined
  it('baseUrl为undefined时验证失败', () => {
    const config = {
      model: 'claude-sonnet-4-5',
      apiKey: 'test-key',
    };

    expect(adapter.validateConfig(config as any)).toBe(false);
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

    expect(adapter.validateConfig(config as any)).toBe(true);
  });
});