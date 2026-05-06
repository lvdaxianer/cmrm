/**
 * 工具/模型操作编排层
 * 抽离自 cli.ts 的 showToolSelection / dispatchToolResult / runOperation
 * / handleSwitchOrRemove / handleInfo / dispatchModelResult / executeModelAction
 *
 * 设计理念：
 * - cli.ts 仅作为启动入口与命令路由层
 * - 所有「选工具 → 选模型 → 执行动作」的多级编排集中在本模块
 * - 通过 OrchestratorContext 注入依赖，便于单测
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import * as readline from 'readline';
import { registry, ToolAdapter } from '../adapters';
import { UnifiedModelConfig } from '../types';
import { UIRenderer } from './ui';
import { selectTool, ToolPickResult } from './tool-selector';
import { pickModel, ModelPickResult } from './model-picker';
import { runAddFlow } from './add-handler';
import { runSwitchAction, runRemoveAction, showModelInfo } from './model-actions';
import { runTestMenu } from './test-menu-runner';
import { runAliasFlow } from './alias-handler';
import { t } from '../i18n';

/** 顶级命令对应的下游操作类型 */
export type NextOperation = 'switch' | 'add' | 'remove' | 'info' | 'test' | 'alias' | null;

/** 子流程类型(switch/remove/info 共享同一选择菜单) */
type ModelActionMode = 'switch' | 'remove' | 'info';

/**
 * 编排层依赖上下文
 * 由 CLI 类注入，使外部函数也能驱动 UI 与状态恢复
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export interface OrchestratorContext {
  /** 当前 readline 接口 */
  rl: readline.Interface;
  /** UI 渲染器 */
  ui: UIRenderer;
  /** 重新创建 readline（inquirer 后必须调用） */
  recreateReadline(): readline.Interface;
  /** 返回命令选择主菜单 */
  showCommandSelection(): Promise<void>;
  /** 退出程序 */
  exitProgram(): void;
}

/**
 * 显示工具选择菜单并分发到对应子流程
 * 单工具优化:仅注册一个适配器时跳过「选工具」步骤,直接进入对应子流程
 *
 * @param ctx - 编排上下文
 * @param op - 当前命令对应的子操作
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function showToolSelection(ctx: OrchestratorContext, op: NextOperation): Promise<void> {
  try {
    // 单工具场景:跳过选择菜单,直接使用唯一适配器
    const adapters = registry.getAllAdapters();
    if (adapters.length === 1) {
      await runOperation(ctx, op, adapters[0]);
    }
    // 多工具场景:正常走选择流程
    else {
      const result = await selectTool(ctx.rl);
      await dispatchToolResult(ctx, op, result);
    }
  }
  // 工具选择异常：返回命令菜单
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.ui.showError(t('errors.selectFailed', { message: message }));
    ctx.rl = ctx.recreateReadline();
    await ctx.showCommandSelection();
  }
}

/**
 * 根据工具选择结果分发到对应流程
 *
 * @param ctx - 编排上下文
 * @param op - 当前命令对应的子操作
 * @param result - 工具选择结果
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function dispatchToolResult(
  ctx: OrchestratorContext,
  op: NextOperation,
  result: ToolPickResult
): Promise<void> {
  // 返回上一级
  if (result.kind === 'back') {
    ctx.rl = ctx.recreateReadline();
    await ctx.showCommandSelection();
  }
  // 直接退出
  else if (result.kind === 'exit') {
    ctx.exitProgram();
  }
  // 选中工具：进入子流程
  else {
    ctx.ui.showSuccess(`\n${t('tools.selected')}: ${result.adapter.displayName}`);
    await runOperation(ctx, op, result.adapter);
  }
}

/**
 * 根据当前 op 运行子流程
 *
 * @param ctx - 编排上下文
 * @param op - 子操作类型
 * @param adapter - 已选中的工具适配器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function runOperation(
  ctx: OrchestratorContext,
  op: NextOperation,
  adapter: ToolAdapter
): Promise<void> {
  // /switch
  if (op === 'switch') {
    await handleSwitchOrRemove(ctx, adapter, 'switch');
  }
  // /add
  else if (op === 'add') {
    await runAddFlow(adapter, ctx.ui, ctx.rl);
    await finalizeAndReturn(ctx);
  }
  // /remove
  else if (op === 'remove') {
    await handleSwitchOrRemove(ctx, adapter, 'remove');
  }
  // /info
  else if (op === 'info') {
    await handleInfo(ctx, adapter);
  }
  // /test
  else if (op === 'test') {
    await runTestMenu(adapter, ctx.ui);
    await finalizeAndReturn(ctx);
  }
  // /alias
  else if (op === 'alias') {
    await runAliasFlow(adapter, ctx.ui, ctx.rl);
    await finalizeAndReturn(ctx);
  }
  // 未指定操作:直接返回菜单
  else {
    await finalizeAndReturn(ctx);
  }
}

/**
 * 处理 /switch 与 /remove 子流程（共享模型选择 + 后续动作）
 *
 * @param ctx - 编排上下文
 * @param adapter - 已选中的工具适配器
 * @param mode - 'switch' 或 'remove'
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function handleSwitchOrRemove(
  ctx: OrchestratorContext,
  adapter: ToolAdapter,
  mode: 'switch' | 'remove'
): Promise<void> {
  const titleMap = {
    switch: { title: t('tools.selectModel', { tool: adapter.displayName }), prompt: t('tools.enterIndex') },
    remove: { title: t('tools.removeModel', { tool: adapter.displayName }), prompt: t('tools.enterIndexToRemove') },
  };
  const result = await pickModel(adapter, ctx.rl, {
    title: titleMap[mode].title,
    prompt: titleMap[mode].prompt,
    hint: mode === 'remove' ? t('tools.confirmDeleteHint') : t('tools.confirmHint'),
  });
  await dispatchModelResult(ctx, adapter, result, mode);
}

/**
 * 处理 /info 子流程
 *
 * @param ctx - 编排上下文
 * @param adapter - 已选中的工具适配器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function handleInfo(ctx: OrchestratorContext, adapter: ToolAdapter): Promise<void> {
  const result = await pickModel(adapter, ctx.rl, {
    title: t('tools.viewModelInfo', { tool: adapter.displayName }),
    prompt: t('tools.enterIndex'),
    hint: t('tools.confirmHint'),
  });
  await dispatchModelResult(ctx, adapter, result, 'info');
}

/**
 * 根据模型选择结果执行对应动作
 *
 * @param ctx - 编排上下文
 * @param adapter - 工具适配器
 * @param result - 模型选择结果
 * @param mode - 子流程类型
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function dispatchModelResult(
  ctx: OrchestratorContext,
  adapter: ToolAdapter,
  result: ModelPickResult,
  mode: ModelActionMode
): Promise<void> {
  // 无任何已保存模型
  if (result.kind === 'empty') {
    ctx.ui.showWarning(`\n${adapter.displayName} ${t('tools.noModels')}`);
    ctx.ui.showInfo(t('tools.addModelHint'));
    await finalizeAndReturn(ctx);
  }
  // 返回上一级（回到工具选择）
  else if (result.kind === 'back') {
    ctx.rl = ctx.recreateReadline();
    // 回退至命令菜单(工具选择由命令菜单触发)
    await ctx.showCommandSelection();
  }
  // 直接退出
  else if (result.kind === 'exit') {
    ctx.exitProgram();
  }
  // 选中模型：执行对应动作
  else {
    await executeModelAction(ctx, adapter, result.model, mode);
    await finalizeAndReturn(ctx);
  }
}

/**
 * 根据 mode 调用具体动作
 *
 * @param ctx - 编排上下文
 * @param adapter - 工具适配器
 * @param model - 选中的模型
 * @param mode - 动作类型
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function executeModelAction(
  ctx: OrchestratorContext,
  adapter: ToolAdapter,
  model: UnifiedModelConfig,
  mode: ModelActionMode
): Promise<void> {
  // 切换
  if (mode === 'switch') {
    await runSwitchAction(adapter, model, ctx.ui);
  }
  // 删除
  else if (mode === 'remove') {
    await runRemoveAction(adapter, model, ctx.ui);
  }
  // 查看
  else {
    showModelInfo(model);
  }
}

/**
 * 完成子流程后清理状态并返回命令菜单
 *
 * @param ctx - 编排上下文
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function finalizeAndReturn(ctx: OrchestratorContext): Promise<void> {
  ctx.rl = ctx.recreateReadline();
  await ctx.showCommandSelection();
}
