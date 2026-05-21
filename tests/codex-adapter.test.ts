import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodexAdapter } from '../src/adapters/codex';

const mocks = vi.hoisted(() => ({
  parseCodexConfig: vi.fn(),
  writeCodexConfig: vi.fn(),
  readAuthConfig: vi.fn(),
  writeAuthConfig: vi.fn(),
}));

vi.mock('../src/adapters/codex-config', () => ({
  parseCodexConfig: mocks.parseCodexConfig,
  writeCodexConfig: mocks.writeCodexConfig,
  CODEX_RUNTIME_PROVIDER: 'custom-openai',
}));

vi.mock('../src/adapters/codex-auth', () => ({
  readAuthConfig: mocks.readAuthConfig,
  writeAuthConfig: mocks.writeAuthConfig,
}));

vi.mock('../src/adapters/codex-cmrm-store', () => ({
  getSavedModels: vi.fn(() => []),
  saveModel: vi.fn(),
  removeModel: vi.fn(() => true),
  getRetryCount: vi.fn(() => 3),
}));

describe('CodexAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('readCurrentModel 应正确回读 snake_case 字段', () => {
    mocks.parseCodexConfig.mockReturnValue({
      model: 'gpt-5.4',
      model_provider: 'custom-openai',
      openai_base_url: 'https://openrouter.ai/api',
      model_reasoning_effort: 'high',
      disable_response_storage: true,
      model_providers: {
        'custom-openai': {
          base_url: 'https://openrouter.ai/api',
          env_key: 'OPENAI_API_KEY',
        },
      },
    });
    mocks.readAuthConfig.mockReturnValue({
      OPENAI_API_KEY: 'sk-test',
    });

    const adapter = new CodexAdapter();
    const result = adapter.readCurrentModel();

    expect(result).not.toBeNull();
    expect(result!.provider).toBe('custom-openai');
    expect(result!.baseUrl).toBe('https://openrouter.ai/api');
    expect(result!.modelReasoningEffort).toBe('high');
    expect(result!.disableResponseStorage).toBe(true);
  });

  it('writeModelConfig 应返回 null 并仍同步 auth.json', () => {
    mocks.writeCodexConfig.mockReturnValue(null);

    const adapter = new CodexAdapter();
    const result = adapter.writeModelConfig({
      model: 'gpt-5.4',
      apiKey: 'sk-test',
      baseUrl: 'https://openrouter.ai/api',
      provider: 'openrouter',
      modelReasoningEffort: 'high',
    });

    expect(result).toBeNull();
    expect(mocks.writeAuthConfig).toHaveBeenCalled();
  });
});
