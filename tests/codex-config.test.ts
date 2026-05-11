import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as TOML from '@iarna/toml';
import { mergeTomlConfig, writeCodexConfig } from '../src/adapters/codex-config';

vi.mock('fs');
vi.mock('@iarna/toml', () => ({
  parse: vi.fn(),
  stringify: vi.fn(() => 'toml-output'),
}));
vi.mock('../src/utils/backup', () => ({
  backupConfig: vi.fn(() => 'backup_2026051000'),
}));

describe('codex-config - mergeTomlConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('已有 provider 时应沿用原 provider，只更新模型与 base_url', () => {
    const original = {
      model: 'old-model',
      model_provider: 'openrouter',
      model_reasoning_effort: 'medium',
      disable_response_storage: false,
      model_providers: {
        openrouter: {
          name: 'openrouter',
          base_url: 'https://api.openai.com',
          env_key: 'OPENAI_API_KEY',
          wire_api: 'responses',
          requires_openai_auth: true,
        },
      },
    };

    const result = mergeTomlConfig(original, {
      model: 'gpt-5.4',
      apiKey: 'sk-test',
      baseUrl: 'https://openrouter.ai/api',
      provider: 'openrouter',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    });

    expect(result.changed).toBe(true);
    expect(result.config.model_provider).toBe('openrouter');
    expect(result.config.openai_base_url).toBe('https://openrouter.ai/api');
    expect(result.config.model_providers.openrouter.base_url).toBe('https://openrouter.ai/api');
  });

  it('provider 已存在且完全相同时应返回 changed=false', () => {
    const original = {
      model: 'gpt-5.4',
      model_provider: 'openrouter',
      model_reasoning_effort: 'high',
      disable_response_storage: true,
      openai_base_url: 'https://openrouter.ai/api',
      model_providers: {
        openrouter: {
          name: 'openrouter',
          base_url: 'https://openrouter.ai/api',
          env_key: 'OPENAI_API_KEY',
          wire_api: 'responses',
          requires_openai_auth: true,
        },
      },
    };

    const result = mergeTomlConfig(original, {
      model: 'gpt-5.4',
      apiKey: 'sk-test',
      baseUrl: 'https://openrouter.ai/api',
      provider: 'openrouter',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    });

    expect(result.changed).toBe(false);
    expect(result.config.model_providers.openrouter.base_url).toBe('https://openrouter.ai/api');
  });

  it('provider 已存在但字段不同时应更新当前 provider 槽位', () => {
    const original = {
      model: 'gpt-5.4',
      model_provider: 'openrouter',
      model_reasoning_effort: 'medium',
      disable_response_storage: false,
      model_providers: {
        openrouter: {
          name: 'openrouter',
          base_url: 'https://old.example.com',
          env_key: 'OPENAI_API_KEY',
          wire_api: 'responses',
          requires_openai_auth: true,
        },
      },
    };

    const result = mergeTomlConfig(original, {
      model: 'gpt-5.5',
      apiKey: 'sk-test',
      baseUrl: 'https://new.example.com',
      provider: 'openrouter',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    });

    expect(result.changed).toBe(true);
    expect(result.config.model).toBe('gpt-5.5');
    expect(result.config.model_reasoning_effort).toBe('high');
    expect(result.config.disable_response_storage).toBe(true);
    expect(result.config.model_provider).toBe('openrouter');
    expect(result.config.openai_base_url).toBe('https://new.example.com');
    expect(result.config.model_providers.openrouter.base_url).toBe('https://new.example.com');
  });

  it('若当前没有 provider，应补一个 openai provider', () => {
    const original = {
      model: 'gpt-4.1',
      model_reasoning_effort: 'medium',
      disable_response_storage: false,
    };

    const result = mergeTomlConfig(original, {
      model: 'gpt-5.4',
      apiKey: 'sk-test',
      baseUrl: 'https://proxy.example.com/v1',
      provider: 'openai',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    });

    expect(result.changed).toBe(true);
    expect(result.config.model_provider).toBe('openai');
    expect(result.config.openai_base_url).toBe('https://proxy.example.com/v1');
    expect(result.config.model_providers.openai.base_url).toBe('https://proxy.example.com/v1');
  });
});

describe('codex-config - writeCodexConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('无变化时不应写文件也不应备份', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(`
model = "gpt-5.4"
model_provider = "openrouter"
model_reasoning_effort = "high"
disable_response_storage = true
`);
    vi.mocked(TOML.parse).mockReturnValue({
      model: 'gpt-5.4',
      model_provider: 'openrouter',
      model_reasoning_effort: 'high',
      disable_response_storage: true,
      openai_base_url: 'https://openrouter.ai/api',
      model_providers: {
        openrouter: {
          name: 'openrouter',
          base_url: 'https://openrouter.ai/api',
          env_key: 'OPENAI_API_KEY',
          wire_api: 'responses',
          requires_openai_auth: true,
        },
      },
    });

    const result = writeCodexConfig('/tmp/config.toml', {
      model: 'gpt-5.4',
      apiKey: 'sk-test',
      baseUrl: 'https://openrouter.ai/api',
      provider: 'openrouter',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    });

    expect(result).toBeUndefined();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('配置文件不存在时应当作空配置并直接写入', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = writeCodexConfig('/tmp/config.toml', {
      model: 'gpt-5.4',
      apiKey: 'sk-test',
      baseUrl: 'https://openrouter.ai/api',
      provider: 'openrouter',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    });

    expect(result).toBe('backup_2026051000');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('配置文件为空或格式错误时应回退为空配置并继续写入', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('invalid toml');
    vi.mocked(TOML.parse).mockImplementation(() => {
      throw new Error('parse failed');
    });

    const result = writeCodexConfig('/tmp/config.toml', {
      model: 'gpt-5.4',
      apiKey: 'sk-test',
      baseUrl: 'https://openrouter.ai/api',
      provider: 'openrouter',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    });

    expect(result).toBe('backup_2026051000');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('缺少 provider 时应创建 openai provider 并写 openai_base_url', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = writeCodexConfig('/tmp/config.toml', {
      model: 'gpt-5.4',
      apiKey: 'sk-test',
      baseUrl: 'https://proxy.example.com/v1',
      provider: 'openai',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    });

    expect(result).toBe('backup_2026051000');
    expect(TOML.stringify).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-5.4',
      model_provider: 'openai',
      openai_base_url: 'https://proxy.example.com/v1',
      model_providers: {
        openai: expect.objectContaining({
          base_url: 'https://proxy.example.com/v1',
        }),
      },
    }));
  });
});
