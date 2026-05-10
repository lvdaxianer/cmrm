/**
 * 导入处理器测试
 * 验证 runImportShortcut 的完整导入流程
 *
 * 覆盖分支:
 *  - 无效工具名 → 报错
 *  - 文件不存在 → 报错
 *  - JSON 解析失败 → 报错
 *  - TOML 解析失败 → 报错
 *  - 缺少必填字段 → 验证失败
 *  - 完整有效配置 + 测试通过 → 保存成功
 *  - 完整有效配置 + 测试失败 → 不保存
 *
 * @author lvdaxianerplus
 * @date 2026-05-09
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runImportShortcut } from '../src/cli/import-handler';
import { UIRenderer } from '../src/cli/ui';
import { registry, ToolAdapter } from '../src/adapters';

// Mock fs 模块
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import * as fs from 'fs';

// Mock TOML 模块
vi.mock('@iarna/toml', () => ({
  parse: vi.fn(),
}));

import * as TOML from '@iarna/toml';

// Mock tester 模块
vi.mock('../src/utils/tester', () => ({
  testModelConfig: vi.fn(),
}));

import { testModelConfig } from '../src/utils/tester';

// Mock i18n 模块
vi.mock('../src/i18n', () => ({
  t: vi.fn((key: string) => key),
}));

/**
 * 构造最小可用的 mock ToolAdapter
 *
 * @param name - 工具名称
 * @param displayName - 显示名称
 * @return mock 适配器
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function buildMockAdapter(name: string, displayName: string): ToolAdapter {
  return {
    name,
    displayName,
    configPath: '/tmp/mock.json',
    configFormat: 'json',
    readCurrentModel: () => null,
    writeModelConfig: () => 'backup.json',
    getSavedModels: () => [],
    saveModel: vi.fn(),
    removeModel: () => true,
    validateConfig: vi.fn(() => true),
    getRetryCount: () => 3,
  } as unknown as ToolAdapter;
}

/**
 * 构造静默 UI 渲染器
 * 所有方法替换为空实现,避免污染 stdout
 *
 * @return 静默 UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function buildSilentUi(): UIRenderer {
  const ui = new UIRenderer();
  vi.spyOn(ui, 'showError').mockImplementation(() => undefined);
  vi.spyOn(ui, 'showInfo').mockImplementation(() => undefined);
  vi.spyOn(ui, 'showSuccess').mockImplementation(() => undefined);
  vi.spyOn(ui, 'showWarning').mockImplementation(() => undefined);
  vi.spyOn(ui, 'showTestResult').mockImplementation(() => undefined);
  return ui;
}

/**
 * 每个测试前重置 mock,保证用例间隔离
 */
beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * 参数校验分支
 */
describe('runImportShortcut - 参数校验', () => {
  // 无效工具名 → 报错
  it('无效工具名应返回 1 并提示错误', async () => {
    const ui = buildSilentUi();

    // 未注册任何 adapter,registry.getAdapter 会抛出错误
    const code = await runImportShortcut('unknown', 'config.json', ui);

    expect(code).toBe(1);
    expect(ui.showError).toHaveBeenCalled();
  });

  // 文件不存在 → 报错
  it('文件不存在应返回 1 并提示错误', async () => {
    // 文件不存在
    vi.mocked(fs.existsSync).mockReturnValue(false);
    // 注册 claude adapter
    registry.register(buildMockAdapter('claude', 'Claude'));
    const ui = buildSilentUi();

    const code = await runImportShortcut('claude', 'not-found.json', ui);

    expect(code).toBe(1);
    expect(fs.existsSync).toHaveBeenCalledWith('not-found.json');
    expect(ui.showError).toHaveBeenCalled();
  });
});

/**
 * 文件解析分支
 */
describe('runImportShortcut - 文件解析', () => {
  beforeEach(() => {
    // 文件存在
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  // JSON 解析失败 → 报错
  it('JSON 解析失败应返回 1', async () => {
    // 返回无效 JSON
    vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
    registry.register(buildMockAdapter('claude', 'Claude'));
    const ui = buildSilentUi();

    const code = await runImportShortcut('claude', 'config.json', ui);

    expect(code).toBe(1);
    expect(ui.showError).toHaveBeenCalled();
  });

  // TOML 解析失败 → 报错
  it('TOML 解析失败应返回 1', async () => {
    // 返回无效 TOML
    vi.mocked(fs.readFileSync).mockReturnValue('invalid toml');
    // TOML 解析抛出异常
    vi.mocked(TOML.parse).mockImplementation(() => {
      throw new Error('TOML parse error');
    });
    registry.register(buildMockAdapter('codex', 'Codex'));
    const ui = buildSilentUi();

    const code = await runImportShortcut('codex', 'config.toml', ui);

    expect(code).toBe(1);
    expect(ui.showError).toHaveBeenCalled();
  });
});

/**
 * 验证与测试分支
 */
describe('runImportShortcut - 验证与测试', () => {
  beforeEach(() => {
    // 文件存在
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  // 缺少必填字段 → 验证失败
  it('配置验证失败应返回 1', async () => {
    const adapter = buildMockAdapter('claude', 'Claude');
    // 强制验证失败
    vi.mocked(adapter.validateConfig).mockReturnValue(false);
    registry.register(adapter);

    // 返回空对象(缺少必填字段)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}));
    const ui = buildSilentUi();

    const code = await runImportShortcut('claude', 'config.json', ui);

    expect(code).toBe(1);
    expect(adapter.validateConfig).toHaveBeenCalled();
    expect(ui.showError).toHaveBeenCalled();
  });

  // 测试失败 → 不保存
  it('测试失败应返回 1 且不保存配置', async () => {
    const adapter = buildMockAdapter('claude', 'Claude');
    registry.register(adapter);

    // 返回完整配置
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      model: 'claude-sonnet',
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com',
    }));
    // 测试失败
    vi.mocked(testModelConfig).mockResolvedValue({
      success: false,
      durationMs: 100,
      errorKind: 'http_error',
      errorMessage: '401',
    } as any);
    const ui = buildSilentUi();

    const code = await runImportShortcut('claude', 'config.json', ui);

    expect(code).toBe(1);
    expect(testModelConfig).toHaveBeenCalled();
    expect(adapter.saveModel).not.toHaveBeenCalled();
  });

  // 完整有效配置 + 测试通过 → 保存成功 (JSON)
  it('JSON 配置测试通过应保存并返回 0', async () => {
    const adapter = buildMockAdapter('claude', 'Claude');
    registry.register(adapter);

    // 返回完整 JSON 配置
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      name: 'sonnet-4',
      model: 'claude-sonnet-4-5',
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com',
      haikuModel: 'claude-haiku',
    }));
    // 测试通过
    vi.mocked(testModelConfig).mockResolvedValue({
      success: true,
      durationMs: 100,
      statusCode: 200,
      modelEcho: 'claude-sonnet-4-5',
    } as any);
    const ui = buildSilentUi();

    const code = await runImportShortcut('claude', 'config.json', ui);

    expect(code).toBe(0);
    // 验证测试参数正确
    expect(testModelConfig).toHaveBeenCalledWith(
      'claude-sonnet-4-5',
      'sk-test',
      'https://api.example.com',
      'anthropic'
    );
    // 验证保存被调用
    expect(adapter.saveModel).toHaveBeenCalledTimes(1);
    expect(adapter.saveModel).toHaveBeenCalledWith(expect.objectContaining({
      name: 'claude-sonnet-4-5',
      aliases: ['sonnet-4'],
    }));
    expect(ui.showSuccess).toHaveBeenCalled();
  });

  it('Claude 原生 settings.json 格式应映射成功并补齐默认 name', async () => {
    const adapter = buildMockAdapter('claude', 'Claude');
    registry.register(adapter);

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      env: {
        ANTHROPIC_MODEL: 'claude-sonnet-4-5',
        ANTHROPIC_AUTH_TOKEN: 'sk-ant-test',
        ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-haiku-4-5',
      },
    }));
    vi.mocked(testModelConfig).mockResolvedValue({
      success: true,
      durationMs: 100,
      statusCode: 200,
    } as any);
    const ui = buildSilentUi();

    const code = await runImportShortcut('claude', 'settings.json', ui);

    expect(code).toBe(0);
    expect(adapter.saveModel).toHaveBeenCalledWith(expect.objectContaining({
      name: 'claude-sonnet-4-5',
      model: 'claude-sonnet-4-5',
      apiKey: 'sk-ant-test',
      baseUrl: 'https://api.anthropic.com',
      haikuModel: 'claude-haiku-4-5',
      apiType: 'anthropic',
    }));
  });

  // 完整有效配置 + 测试通过 → 保存成功 (TOML)
  it('TOML 配置测试通过应保存并返回 0', async () => {
    const adapter = buildMockAdapter('codex', 'Codex');
    registry.register(adapter);

    // 返回原始 TOML 内容
    vi.mocked(fs.readFileSync).mockReturnValue('name = "custom-gpt"\nmodel = "gpt-5"');
    // TOML 解析返回对象
    vi.mocked(TOML.parse).mockReturnValue({
      name: 'custom-gpt',
      model: 'gpt-5',
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com',
      apiType: 'openai',
    });
    // 测试通过
    vi.mocked(testModelConfig).mockResolvedValue({
      success: true,
      durationMs: 100,
      statusCode: 200,
    } as any);
    const ui = buildSilentUi();

    const code = await runImportShortcut('codex', 'config.toml', ui);

    expect(code).toBe(0);
    // 验证测试参数正确(含 openai apiType)
    expect(testModelConfig).toHaveBeenCalledWith(
      'gpt-5',
      'sk-test',
      'https://api.example.com',
      'openai'
    );
    // 验证保存被调用
    expect(adapter.saveModel).toHaveBeenCalledTimes(1);
    expect(adapter.saveModel).toHaveBeenCalledWith(expect.objectContaining({
      name: 'codex/gpt-5',
      aliases: ['custom-gpt'],
    }));
  });

  it('Codex 原生 config.toml 格式应映射成功并补齐默认 name', async () => {
    const adapter = buildMockAdapter('codex', 'Codex');
    registry.register(adapter);

    vi.mocked(fs.readFileSync).mockReturnValue('model = "gpt-5.4"');
    vi.mocked(TOML.parse).mockReturnValue({
      model: 'gpt-5.4',
      apiKey: 'sk-test',
      model_provider: 'openrouter',
      model_reasoning_effort: 'high',
      disable_response_storage: true,
      model_providers: {
        openrouter: {
          base_url: 'https://openrouter.ai/api',
        },
      },
    });
    vi.mocked(testModelConfig).mockResolvedValue({
      success: true,
      durationMs: 100,
      statusCode: 200,
    } as any);
    const ui = buildSilentUi();

    const code = await runImportShortcut('codex', 'config.toml', ui);

    expect(code).toBe(0);
    expect(adapter.saveModel).toHaveBeenCalledWith(expect.objectContaining({
      name: 'openrouter/gpt-5.4',
      model: 'gpt-5.4',
      apiKey: 'sk-test',
      baseUrl: 'https://openrouter.ai/api',
      provider: 'openrouter',
      modelReasoningEffort: 'high',
      disableResponseStorage: true,
      apiType: 'openai',
    }));
  });

  it('Codex 导入应优先读取顶层 openai_base_url', async () => {
    const adapter = buildMockAdapter('codex', 'Codex');
    registry.register(adapter);

    vi.mocked(fs.readFileSync).mockReturnValue('model = "gpt-5.4"');
    vi.mocked(TOML.parse).mockReturnValue({
      model: 'gpt-5.4',
      apiKey: 'sk-test',
      model_provider: 'openrouter',
      openai_base_url: 'https://runtime.example.com/v1',
      model_reasoning_effort: 'high',
      model_providers: {
        openrouter: {
          base_url: 'https://provider.example.com/v1',
        },
      },
    });
    vi.mocked(testModelConfig).mockResolvedValue({
      success: true,
      durationMs: 100,
      statusCode: 200,
    } as any);
    const ui = buildSilentUi();

    const code = await runImportShortcut('codex', 'config.toml', ui);

    expect(code).toBe(0);
    expect(adapter.saveModel).toHaveBeenCalledWith(expect.objectContaining({
      baseUrl: 'https://runtime.example.com/v1',
      provider: 'openrouter',
    }));
  });

  it('导入时若规范名与其他模型引用名冲突应返回 1', async () => {
    const adapter = buildMockAdapter('claude', 'Claude');
    registry.register(adapter);
    registry.register({
      ...buildMockAdapter('codex', 'Codex'),
      getSavedModels: () => [{
        name: 'uino/gpt-5.4',
        model: 'gpt-5.4',
        provider: 'uino',
        apiKey: 'sk-test',
        baseUrl: 'https://api.example.com',
        aliases: ['sonnet-prod'],
      }],
    } as ToolAdapter);

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      model: 'sonnet-prod',
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com',
    }));
    const ui = buildSilentUi();

    const code = await runImportShortcut('claude', 'config.json', ui);

    expect(code).toBe(1);
    expect(adapter.saveModel).not.toHaveBeenCalled();
  });
});
