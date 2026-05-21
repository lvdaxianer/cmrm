import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runEditFlow, runEditForModel } from '../src/cli/edit-handler';

const mocks = vi.hoisted(() => ({
  prompt: vi.fn(),
  pickModel: vi.fn(),
  collectAllModels: vi.fn(),
  testModelConfig: vi.fn(),
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: mocks.prompt,
  },
}));

vi.mock('../src/cli/model-picker', () => ({
  pickModel: mocks.pickModel,
}));

vi.mock('../src/cli/model-finder', () => ({
  collectAllModels: mocks.collectAllModels,
}));

vi.mock('../src/utils/tester', () => ({
  testModelConfig: mocks.testModelConfig,
}));

vi.mock('../src/i18n', () => ({
  t: vi.fn((key: string) => key),
}));

function buildUi() {
  return {
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showTestResult: vi.fn(),
  } as any;
}

describe('runEditFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('重命名时应保存新配置并删除旧配置', async () => {
    const adapter = {
      displayName: 'Claude',
      validateConfig: vi.fn(() => true),
      saveModel: vi.fn(),
      removeModel: vi.fn(() => true),
    } as any;
    const ui = buildUi();
    const model = {
      name: 'claude-sonnet-4-5',
      model: 'claude-sonnet-4-5',
      apiKey: 'sk-old',
      baseUrl: 'https://api.example.com',
      apiType: 'anthropic',
    };

    mocks.pickModel.mockResolvedValue({ kind: 'select', model });
    mocks.prompt.mockResolvedValue({
      model: 'claude-opus-4-1',
      apiKey: 'sk-new',
    });
    mocks.collectAllModels.mockReturnValue([model]);
    mocks.testModelConfig.mockResolvedValue({
      success: true,
      durationMs: 100,
      statusCode: 200,
      message: 'ok',
    });

    await runEditFlow(adapter, ui, {} as any);

    expect(adapter.saveModel).toHaveBeenCalledWith(expect.objectContaining({
      name: 'claude-opus-4-1',
      model: 'claude-opus-4-1',
      apiKey: 'sk-new',
    }));
    expect(adapter.removeModel).toHaveBeenCalledWith('claude-sonnet-4-5');
    expect(ui.showSuccess).toHaveBeenCalled();
  });

  it('编辑 Codex 时应保留 provider 并只更新模型名和 key', async () => {
    const adapter = {
      displayName: 'Codex',
      validateConfig: vi.fn(() => true),
      saveModel: vi.fn(),
      removeModel: vi.fn(() => true),
    } as any;
    const ui = buildUi();
    const model = {
      name: 'openrouter/gpt-5.4',
      model: 'gpt-5.4',
      apiKey: 'sk-old',
      baseUrl: 'https://openrouter.ai/api',
      provider: 'openrouter',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    };

    mocks.pickModel.mockResolvedValue({ kind: 'select', model });
    mocks.prompt.mockResolvedValue({
      model: 'gpt-5.5',
      apiKey: 'sk-new',
    });
    mocks.collectAllModels.mockReturnValue([model]);
    mocks.testModelConfig.mockResolvedValue({
      success: true,
      durationMs: 100,
      statusCode: 200,
      message: 'ok',
    });

    await runEditFlow(adapter, ui, {} as any);

    expect(adapter.saveModel).toHaveBeenCalledWith(expect.objectContaining({
      name: 'openrouter/gpt-5.5',
      model: 'gpt-5.5',
      apiKey: 'sk-new',
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    }));
    expect(adapter.removeModel).toHaveBeenCalledWith('openrouter/gpt-5.4');
  });

  it('测试失败且用户拒绝保存时不应写入配置', async () => {
    const adapter = {
      displayName: 'Claude',
      validateConfig: vi.fn(() => true),
      saveModel: vi.fn(),
      removeModel: vi.fn(() => true),
    } as any;
    const ui = buildUi();
    const model = {
      name: 'claude-sonnet-4-5',
      model: 'claude-sonnet-4-5',
      apiKey: 'sk-old',
      baseUrl: 'https://api.example.com',
      apiType: 'anthropic',
    };

    mocks.pickModel.mockResolvedValue({ kind: 'select', model });
    mocks.prompt
      .mockResolvedValueOnce({
        model: 'claude-opus-4-1',
        apiKey: 'sk-new',
      })
      .mockResolvedValueOnce({
        stillSave: false,
      });
    mocks.collectAllModels.mockReturnValue([model]);
    mocks.testModelConfig.mockResolvedValue({
      success: false,
      durationMs: 100,
      message: 'failed',
      errorKind: 'http_error',
    });

    await runEditFlow(adapter, ui, {} as any);

    expect(adapter.saveModel).not.toHaveBeenCalled();
    expect(adapter.removeModel).not.toHaveBeenCalled();
    expect(ui.showWarning).toHaveBeenCalled();
  });

  it('选择直接退出时应优先调用注入的 onExit', async () => {
    const adapter = {
      displayName: 'Claude',
    } as any;
    const ui = buildUi();
    const onExit = vi.fn();

    mocks.pickModel.mockResolvedValue({ kind: 'exit' });

    await runEditFlow(adapter, ui, {} as any, { onExit });

    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

describe('runEditForModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('直接编辑指定模型时应复用默认值并保存更新结果', async () => {
    const adapter = {
      displayName: 'Codex',
      validateConfig: vi.fn(() => true),
      saveModel: vi.fn(),
      removeModel: vi.fn(() => true),
    } as any;
    const ui = buildUi();
    const model = {
      name: 'custom-openai/gpt-5.4',
      model: 'gpt-5.4',
      apiKey: 'sk-current',
      baseUrl: 'https://api.example.com/v1',
      provider: 'custom-openai',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    };

    mocks.prompt.mockResolvedValue({
      model: 'gpt-5.5',
      apiKey: 'sk-next',
    });
    mocks.collectAllModels.mockReturnValue([model]);
    mocks.testModelConfig.mockResolvedValue({
      success: true,
      durationMs: 80,
      statusCode: 200,
      message: 'ok',
    });

    const result = await runEditForModel(adapter, model, ui);

    expect(result).toBe('saved');
    expect(mocks.prompt).toHaveBeenCalledTimes(1);
    const promptArgs = mocks.prompt.mock.calls[0]?.[0];
    expect(promptArgs?.[1]).toMatchObject({
      type: 'password',
      name: 'apiKey',
      message: 'add.apiKey',
      mask: '*',
    });
    expect(promptArgs?.[1]).not.toHaveProperty('default');
    expect(adapter.saveModel).toHaveBeenCalledWith(expect.objectContaining({
      name: 'custom-openai/gpt-5.5',
      model: 'gpt-5.5',
      apiKey: 'sk-next',
      provider: 'custom-openai',
      baseUrl: 'https://api.example.com/v1',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
    }));
    expect(ui.showInfo).toHaveBeenCalledWith('  ui.savedLabel: custom-openai/gpt-5.5');
  });

  it('测试失败且拒绝保存时应返回 cancelled', async () => {
    const adapter = {
      displayName: 'Codex',
      validateConfig: vi.fn(() => true),
      saveModel: vi.fn(),
      removeModel: vi.fn(() => true),
    } as any;
    const ui = buildUi();
    const model = {
      name: 'custom-openai/gpt-5.4',
      model: 'gpt-5.4',
      apiKey: 'sk-current',
      baseUrl: 'https://api.example.com/v1',
      provider: 'custom-openai',
    };

    mocks.prompt
      .mockResolvedValueOnce({
        model: 'gpt-5.5',
        apiKey: 'sk-next',
      })
      .mockResolvedValueOnce({
        stillSave: false,
      });
    mocks.collectAllModels.mockReturnValue([model]);
    mocks.testModelConfig.mockResolvedValue({
      success: false,
      durationMs: 80,
      message: 'failed',
      errorKind: 'http_error',
    });

    const result = await runEditForModel(adapter, model, ui);

    expect(result).toBe('cancelled');
    expect(adapter.saveModel).not.toHaveBeenCalled();
  });
});
