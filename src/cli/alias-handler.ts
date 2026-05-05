/**
 * /alias 交互式菜单入口
 * 用户通过主菜单选择 /alias → 选择工具(由编排器) → 选择目标模型 → 进入子菜单
 *
 * 子菜单提供:
 *   [0] 添加别名
 *   [1] 删除别名
 *   [2] 列出别名
 *   [3] 返回上一级
 *
 * 设计要点:
 * - 本文件仅做「选目标模型 → 进入循环」的薄入口路由
 * - 子菜单循环、渲染、输入校验在 alias-menu.ts
 * - 添加 / 删除 / 列出动作在 alias-actions.ts
 * - 校验逻辑统一走 alias-validator,与快捷方式同等规则
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import * as readline from 'readline';
import { ToolAdapter } from '../adapters';
import { UnifiedModelConfig } from '../types';
import { UIRenderer } from './ui';
import { pickModel } from './model-picker';
import { runActionLoop } from './alias-menu';
import { t } from '../i18n';

/**
 * 执行 /alias 交互流程
 * 选模型 → 进入子菜单 → 循环执行,直到用户选择「返回」
 *
 * @param adapter - 已选中的工具适配器
 * @param ui - UI 渲染器
 * @param rl - 当前活跃的 readline 接口
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function runAliasFlow(
  adapter: ToolAdapter,
  ui: UIRenderer,
  rl: readline.Interface
): Promise<void> {
  const model = await pickTargetModel(adapter, rl, ui);

  // 用户取消选择(empty/back/exit):直接结束流程
  if (!model) {
    return;
  }
  // 选中模型:进入子菜单循环
  else {
    await runActionLoop(adapter, model, ui);
  }
}

/**
 * 选择待管理别名的模型
 * 包装 pickModel,无模型/返回/退出时统一返回 null
 *
 * @param adapter - 工具适配器
 * @param rl - 当前 readline
 * @param ui - UI 渲染器
 * @return 选中的模型;放弃则返回 null
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function pickTargetModel(
  adapter: ToolAdapter,
  rl: readline.Interface,
  ui: UIRenderer
): Promise<UnifiedModelConfig | null> {
  const result = await pickModel(adapter, rl, {
    title: t('alias.selectModel', { tool: adapter.displayName }),
    prompt: t('tools.enterIndex'),
    hint: t('tools.confirmHint'),
  });

  // 选中模型:返回模型实例
  if (result.kind === 'select') {
    return result.model;
  }
  // 无模型:友好提示
  else if (result.kind === 'empty') {
    ui.showWarning(`\n${adapter.displayName} ${t('tools.noModels')}`);
    ui.showInfo(t('tools.addModelHint'));
    return null;
  }
  // back / exit:放弃
  else {
    return null;
  }
}
