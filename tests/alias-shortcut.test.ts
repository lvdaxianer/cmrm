/**
 * /alias 快捷方式执行器测试
 * 验证 runAliasShortcut 在不同输入下的 exit code 与 adapter.saveModel 调用情况
 *
 * 测试边界:
 *  - 模型不存在            → exit 1, 不调 saveModel
 *  - 别名空                → exit 1, 不调 saveModel
 *  - 别名与他模型 name 冲突 → exit 1, 不调 saveModel
 *  - 别名与自身已有重复    → exit 1, 不调 saveModel
 *  - 合法别名              → exit 0, saveModel 被调一次, aliases 包含新值
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAliasShortcut } from '../src/cli/alias-shortcut';
import { UIRenderer } from '../src/cli/ui';
import { registry, ToolAdapter, UnifiedModelConfig } from '../src/adapters';

/**
 * 构造一个 mock ToolAdapter,name='claude' 以便覆盖真实 ClaudeAdapter
 *
 * @param models - 已保存的模型列表
 * @param saveSpy - saveModel 的 mock 函数(供断言)
 * @return mock 适配器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function buildMockClaudeAdapter(
  models: UnifiedModelConfig[],
  saveSpy: ReturnType<typeof vi.fn> = vi.fn()
): ToolAdapter {
  return {
    name: 'claude',
    displayName: 'Claude (mock)',
    configPath: '/tmp/mock.json',
    configFormat: 'json',
    readCurrentModel: () => null,
    writeModelConfig: () => 'backup.json',
    getSavedModels: () => models,
    saveModel: saveSpy,
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
 * 在每个测试前重置 mock,保证用例间隔离
 */
beforeEach(() => {
  vi.clearAllMocks();
});

describe('runAliasShortcut - 模型不存在', () => {
  // 模型未找到:exit 1, 不调用 saveModel
  it('模型不存在时应返回 1 且不调用 saveModel', async () => {
    const saveSpy = vi.fn();
    const adapter = buildMockClaudeAdapter([], saveSpy);
    registry.register(adapter);
    const ui = buildSilentUi();

    const code = await runAliasShortcut(adapter, 'nonexistent', 'fast', ui);

    expect(code).toBe(1);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(ui.showError).toHaveBeenCalled();
  });
});

describe('runAliasShortcut - 别名校验失败', () => {
  // 空别名:exit 1
  it('空别名应返回 1 且不调用 saveModel', async () => {
    const saveSpy = vi.fn();
    const target = buildModel({ name: 'sonnet', model: 'claude-sonnet' });
    const adapter = buildMockClaudeAdapter([target], saveSpy);
    registry.register(adapter);
    const ui = buildSilentUi();

    const code = await runAliasShortcut(adapter, 'sonnet', '   ', ui);

    expect(code).toBe(1);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(ui.showError).toHaveBeenCalled();
  });

  // 与他模型 name 冲突:exit 1
  it('别名与他模型 name 冲突时应返回 1', async () => {
    const saveSpy = vi.fn();
    const sonnet = buildModel({ name: 'sonnet', model: 'claude-sonnet' });
    const haiku = buildModel({ name: 'haiku', model: 'claude-haiku' });
    const adapter = buildMockClaudeAdapter([sonnet, haiku], saveSpy);
    registry.register(adapter);
    const ui = buildSilentUi();

    const code = await runAliasShortcut(adapter, 'sonnet', 'haiku', ui);

    expect(code).toBe(1);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(ui.showError).toHaveBeenCalled();
  });

  // 与自身已有 alias 重复:exit 1
  it('别名与自身已有重复时应返回 1', async () => {
    const saveSpy = vi.fn();
    const target = buildModel({
      name: 'sonnet',
      model: 'claude-sonnet',
      aliases: ['s4'],
    });
    const adapter = buildMockClaudeAdapter([target], saveSpy);
    registry.register(adapter);
    const ui = buildSilentUi();

    const code = await runAliasShortcut(adapter, 'sonnet', 's4', ui);

    expect(code).toBe(1);
    expect(saveSpy).not.toHaveBeenCalled();
  });
});

describe('runAliasShortcut - 合法添加', () => {
  // 合法别名:exit 0, saveModel 被调一次, 新别名进入 aliases
  it('合法别名应返回 0 并保存包含新别名的模型副本', async () => {
    const saveSpy = vi.fn();
    const target = buildModel({
      name: 'sonnet',
      model: 'claude-sonnet',
      aliases: ['s4'],
    });
    const adapter = buildMockClaudeAdapter([target], saveSpy);
    registry.register(adapter);
    const ui = buildSilentUi();

    const code = await runAliasShortcut(adapter, 'sonnet', 'fast', ui);

    expect(code).toBe(0);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const saved = saveSpy.mock.calls[0][0] as UnifiedModelConfig;
    expect(saved.aliases).toEqual(['s4', 'fast']);
    expect(ui.showSuccess).toHaveBeenCalled();
  });

  // 别名首次添加(原 aliases 为 undefined):仍应正常追加
  it('原 aliases 缺失时应初始化为新数组', async () => {
    const saveSpy = vi.fn();
    const target = buildModel({ name: 'sonnet', model: 'claude-sonnet' });
    const adapter = buildMockClaudeAdapter([target], saveSpy);
    registry.register(adapter);
    const ui = buildSilentUi();

    const code = await runAliasShortcut(adapter, 'sonnet', 'fast', ui);

    expect(code).toBe(0);
    const saved = saveSpy.mock.calls[0][0] as UnifiedModelConfig;
    expect(saved.aliases).toEqual(['fast']);
  });

  // 输入两端含空白:trim 后保存
  it('应在 trim 后保存别名', async () => {
    const saveSpy = vi.fn();
    const target = buildModel({ name: 'sonnet', model: 'claude-sonnet' });
    const adapter = buildMockClaudeAdapter([target], saveSpy);
    registry.register(adapter);
    const ui = buildSilentUi();

    const code = await runAliasShortcut(adapter, 'sonnet', '  fast  ', ui);

    expect(code).toBe(0);
    const saved = saveSpy.mock.calls[0][0] as UnifiedModelConfig;
    expect(saved.aliases).toEqual(['fast']);
  });
});
