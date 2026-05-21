import { describe, it, expect } from 'vitest';
import { mapToUnifiedConfig } from '../src/cli/import-config-mappers';

describe('mapToUnifiedConfig - codex', () => {
  it('缺少 provider 时应回退为 custom-openai', () => {
    const config = mapToUnifiedConfig('codex', {
      model: 'gpt-5.4',
      openai_base_url: 'https://proxy.example.com/v1',
    });

    expect(config.provider).toBe('custom-openai');
    expect(config.name).toBe('custom-openai/gpt-5.4');
    expect(config.baseUrl).toBe('https://proxy.example.com/v1');
  });

  it('存在 model_provider 时应优先使用原 provider', () => {
    const config = mapToUnifiedConfig('codex', {
      model: 'gpt-5.4',
      model_provider: 'openrouter',
      openai_base_url: 'https://proxy.example.com/v1',
      model_providers: {
        openrouter: {
          base_url: 'https://openrouter.ai/api',
        },
      },
    });

    expect(config.provider).toBe('openrouter');
    expect(config.name).toBe('openrouter/gpt-5.4');
    expect(config.baseUrl).toBe('https://proxy.example.com/v1');
  });
});
