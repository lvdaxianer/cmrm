/**
 * CLI 快捷方式执行器测试
 * 验证 runShortcut 在不同 ParsedArgs 分支下的 exit code 与依赖调用
 *
 * 测试边界:
 *  - help          → 打印帮助,退出码 0
 *  - switch 命中    → 调 runSwitchAction,退出码 0
 *  - switch 未命中  → 退出码 1,错误提示带可用模型清单
 *  - test  命中通过 → 退出码 0
 *  - test  命中失败 → 退出码 1
 *  - test  未命中   → 退出码 1
 *  - unknown       → 退出码 1
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runShortcut } from '../src/cli/shortcut-runner';
import { ParsedArgs } from '../src/cli/argv-parser';
import { UIRenderer } from '../src/cli/ui';
import { registry, ToolAdapter, UnifiedModelConfig } from '../src/adapters';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

/**
 * Mock 模型操作模块:避免真实切换写文件
 */
vi.mock('../src/cli/model-actions', () => ({
  runSwitchAction: vi.fn().mockResolvedValue(undefined),
}));

/**
 * Mock 测试器模块:控制 testModelConfig 返回值
 */
vi.mock('../src/utils/tester', () => ({
  testModelConfig: vi.fn(),
}));

vi.mock('../src/cli/edit-handler', () => ({
  runEditForModel: vi.fn().mockResolvedValue('saved'),
}));

import { runSwitchAction } from '../src/cli/model-actions';
import { testModelConfig } from '../src/utils/tester';
import { runEditForModel } from '../src/cli/edit-handler';
import * as fs from 'fs';

/**
 * 构造一个 mock ToolAdapter,name='claude' 以便覆盖真实 ClaudeAdapter
 *
 * @param models - 已保存的模型列表
 * @return mock 适配器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function buildMockClaudeAdapter(models: UnifiedModelConfig[]): ToolAdapter {
  return {
    name: 'claude',
    displayName: 'Claude (mock)',
    configPath: '/tmp/mock.json',
    configFormat: 'json',
    readCurrentModel: () => null,
    writeModelConfig: () => 'backup.json',
    getSavedModels: () => models,
    saveModel: () => undefined,
    removeModel: () => true,
    validateConfig: () => true,
  } as unknown as ToolAdapter;
}

/**
 * 构造无副作用 UIRenderer:所有方法替换为 vi.fn,避免污染 stdout
 *
 * @return 静默 UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
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
 * 构造一个最小可用的 UnifiedModelConfig
 *
 * @param fields - 部分字段覆盖
 * @return 模型配置
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function buildModel(fields: Partial<UnifiedModelConfig>): UnifiedModelConfig {
  return {
    model: 'default-model',
    apiKey: 'sk-test',
    baseUrl: 'https://api.example.com',
    ...fields,
  };
}

/**
 * 在每个测试前重置 mock 与 registry,保证用例间隔离
 */
beforeEach(() => {
  vi.clearAllMocks();
  // 注:不能直接清空 registry(没有暴露 clear),通过覆盖注入 mock claude adapter
  registry.register(buildMockClaudeAdapter([]));
});

/**
 * help 分支
 */
describe('runShortcut - help', () => {
  // help 不依赖 adapter,直接打印并退出
  it('help 分支应返回退出码 0', async () => {
    // 抑制 console.log 输出,避免污染测试报告
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const ui = buildSilentUi();

    const code = await runShortcut({ kind: 'help' }, ui);

    expect(code).toBe(0);
    logSpy.mockRestore();
  });
});

/**
 * switch 分支
 */
describe('runShortcut - switch', () => {
  // 命中 → 调用 runSwitchAction 且退出码为 0
  it('switch 命中模型时应调用 runSwitchAction 并返回 0', async () => {
    const target = buildModel({ name: 'sonnet-4', model: 'claude-sonnet-4-6' });
    registry.register(buildMockClaudeAdapter([target]));
    const ui = buildSilentUi();

    const code = await runShortcut({ kind: 'switch', model: 'sonnet-4' }, ui);

    expect(code).toBe(0);
    expect(runSwitchAction).toHaveBeenCalledTimes(1);
  });

  // 未命中 → 不调 runSwitchAction,提示并退出码 1
  it('switch 未命中模型时应返回 1 并展示错误提示', async () => {
    registry.register(buildMockClaudeAdapter([
      buildModel({ name: 'haiku', model: 'claude-haiku-4-5' }),
    ]));
    const ui = buildSilentUi();

    const code = await runShortcut({ kind: 'switch', model: 'nonexistent' }, ui);

    expect(code).toBe(1);
    expect(runSwitchAction).not.toHaveBeenCalled();
    expect(ui.showError).toHaveBeenCalled();
  });
});

/**
 * edit 分支
 */
describe('runShortcut - edit', () => {
  // 命中 → 调用 runEditForModel 且退出码为 0
  it('edit 命中模型时应调用 runEditForModel 并返回 0', async () => {
    const target = buildModel({
      name: 'openrouter/gpt-5.4',
      model: 'gpt-5.4',
      provider: 'openrouter',
    });
    registry.register(buildMockClaudeAdapter([target]));
    const ui = buildSilentUi();

    const code = await runShortcut({ kind: 'edit', model: 'openrouter/gpt-5.4' }, ui);

    expect(code).toBe(0);
    expect(runEditForModel).toHaveBeenCalledTimes(1);
    expect(runEditForModel).toHaveBeenCalledWith(expect.anything(), target, ui);
  });

  // 用户取消或未保存 → 返回 1，便于脚本判断
  it('edit 命中但未保存时应返回 1', async () => {
    const target = buildModel({
      name: 'custom-openai/gpt-5.4',
      model: 'gpt-5.4',
      provider: 'custom-openai',
    });
    registry.register(buildMockClaudeAdapter([target]));
    vi.mocked(runEditForModel).mockResolvedValueOnce('cancelled');
    const ui = buildSilentUi();

    const code = await runShortcut({ kind: 'edit', model: 'custom-openai/gpt-5.4' }, ui);

    expect(code).toBe(1);
    expect(runEditForModel).toHaveBeenCalledTimes(1);
  });

  // 未命中 → 不调 runEditForModel,提示并退出码 1
  it('edit 未命中模型时应返回 1 并展示错误提示', async () => {
    registry.register(buildMockClaudeAdapter([
      buildModel({ name: 'haiku', model: 'claude-haiku-4-5' }),
    ]));
    const ui = buildSilentUi();

    const code = await runShortcut({ kind: 'edit', model: 'nonexistent' }, ui);

    expect(code).toBe(1);
    expect(runEditForModel).not.toHaveBeenCalled();
    expect(ui.showError).toHaveBeenCalled();
  });
});

/**
 * test 分支
 */
describe('runShortcut - test', () => {
  // 测试通过:退出码 0,展示结果
  it('test 命中且测试通过时应返回 0', async () => {
    const target = buildModel({ name: 'sonnet-4', model: 'claude-sonnet-4-6' });
    registry.register(buildMockClaudeAdapter([target]));
    vi.mocked(testModelConfig).mockResolvedValueOnce({
      success: true,
      durationMs: 100,
      statusCode: 200,
      modelEcho: 'claude-sonnet-4-6',
    } as any);
    const ui = buildSilentUi();

    const code = await runShortcut({ kind: 'test', model: 'sonnet-4' }, ui);

    expect(code).toBe(0);
    expect(testModelConfig).toHaveBeenCalledTimes(1);
    expect(ui.showTestResult).toHaveBeenCalled();
  });

  // 测试失败:退出码 1
  it('test 命中但测试失败时应返回 1', async () => {
    const target = buildModel({ name: 'gpt-4o', model: 'gpt-4o' });
    registry.register(buildMockClaudeAdapter([target]));
    vi.mocked(testModelConfig).mockResolvedValueOnce({
      success: false,
      durationMs: 100,
      errorKind: 'http_error',
      errorMessage: '401',
    } as any);
    const ui = buildSilentUi();

    const code = await runShortcut({ kind: 'test', model: 'gpt-4o' }, ui);

    expect(code).toBe(1);
    expect(ui.showTestResult).toHaveBeenCalled();
  });

  // 模型不存在:退出码 1,不发起 HTTP 测试
  it('test 模型不存在时应返回 1 且不调用 testModelConfig', async () => {
    registry.register(buildMockClaudeAdapter([]));
    const ui = buildSilentUi();

    const code = await runShortcut({ kind: 'test', model: 'whatever' }, ui);

    expect(code).toBe(1);
    expect(testModelConfig).not.toHaveBeenCalled();
    expect(ui.showError).toHaveBeenCalled();
  });
});

/**
 * unknown 分支
 */
describe('runShortcut - unknown', () => {
  // 未识别命令:退出码 1
  it('unknown 分支应返回 1 并展示错误提示', async () => {
    const ui = buildSilentUi();

    const code = await runShortcut({ kind: 'unknown', input: 'foobar' }, ui);

    expect(code).toBe(1);
    expect(ui.showError).toHaveBeenCalled();
  });
});

describe('runShortcut - import', () => {
  it('import 分支应先注册适配器，再进入文件检查流程', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const ui = buildSilentUi();

    const code = await runShortcut({ kind: 'import', tool: 'claude', file: 'missing.json' }, ui);

    expect(code).toBe(1);
    expect(fs.existsSync).toHaveBeenCalledWith('missing.json');
  });
});
