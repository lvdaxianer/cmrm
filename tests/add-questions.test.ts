import { describe, it, expect, vi } from 'vitest';
import { buildModelConfig } from '../src/cli/add-questions';

vi.mock('../src/i18n', () => ({
  t: vi.fn((key: string) => key),
}));

describe('buildModelConfig - codex', () => {
  it('未填写 configName 时应默认生成 provider/model', () => {
    const config = buildModelConfig('codex', {
      model: 'gpt-5.4',
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com',
      provider: 'uino',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    });

    expect(config.name).toBe('uino/gpt-5.4');
    expect(config.provider).toBe('uino');
  });

  it('填写 configName 时应转成 alias 而不是覆盖规范 name', () => {
    const config = buildModelConfig('codex', {
      configName: 'prod',
      model: 'gpt-5.4',
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com',
      provider: 'uino',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    });

    expect(config.name).toBe('uino/gpt-5.4');
    expect(config.aliases).toEqual(['prod']);
  });
});

describe('buildModelConfig - claude', () => {
  it('填写 configName 时应保留 model 为规范 name，并把自定义名转成 alias', () => {
    const config = buildModelConfig('claude', {
      configName: 'sonnet-prod',
      model: 'claude-sonnet-4-5-20250514',
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com',
    });

    expect(config.name).toBe('claude-sonnet-4-5-20250514');
    expect(config.aliases).toEqual(['sonnet-prod']);
  });
});
