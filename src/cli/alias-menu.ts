/**
 * /alias 子菜单循环与渲染
 * 拆分自 alias-handler,聚焦菜单本身的渲染、输入校验与循环路由
 *
 * 设计要点:
 * - 菜单选项常量集中定义,降低魔法数字风险
 * - 子菜单循环由 runActionLoop 控制,通过回调更新当前模型
 * - 单文件 ≤ 350 行;每个函数 ≤ 20 行
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { ToolAdapter } from '../adapters';
import { UnifiedModelConfig } from '../types';
import { UIRenderer } from './ui';
import { getModelKey } from './alias-validator';
import { handleAddAlias, handleRemoveAlias, handleListAliases } from './alias-actions';
import { t } from '../i18n';

/** 子菜单选项索引常量 */
export const ACTION_INDEX = {
  ADD: 0,
  REMOVE: 1,
  LIST: 2,
  BACK: 3,
} as const;

/** 子菜单选项总数 */
const ACTION_COUNT = 4;

/**
 * 子菜单循环
 * 用户每完成一次操作后回到子菜单,直到选择「返回上一级」
 *
 * @param adapter - 工具适配器
 * @param model - 目标模型(每次操作后会从 adapter 中重新拉取最新副本)
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function runActionLoop(
  adapter: ToolAdapter,
  model: UnifiedModelConfig,
  ui: UIRenderer
): Promise<void> {
  let current = model;
  let shouldContinue = true;

  // 循环子菜单:直到用户选择返回
  while (shouldContinue) {
    shouldContinue = await runOneAction(adapter, current, ui, (next) => {
      current = next;
    });
  }
}

/**
 * 渲染并执行子菜单的一次循环
 * 由 runActionLoop 反复调用
 *
 * @param adapter - 工具适配器
 * @param model - 当前目标模型
 * @param ui - UI 渲染器
 * @param onModelUpdate - 模型变更后的更新回调
 * @return 是否继续下一轮(false 表示退出循环)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function runOneAction(
  adapter: ToolAdapter,
  model: UnifiedModelConfig,
  ui: UIRenderer,
  onModelUpdate: (next: UnifiedModelConfig) => void
): Promise<boolean> {
  renderSubMenu(model);
  const action = await promptActionIndex();
  return await dispatchAction(action, adapter, model, ui, onModelUpdate);
}

/**
 * 根据用户输入的菜单索引分发到具体动作
 * 抽出独立函数,避免父函数 if/else 嵌套过深
 *
 * @param action - 已校验的菜单索引
 * @param adapter - 工具适配器
 * @param model - 当前目标模型
 * @param ui - UI 渲染器
 * @param onModelUpdate - 模型变更后的更新回调
 * @return 是否继续下一轮(false 表示退出循环)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function dispatchAction(
  action: number,
  adapter: ToolAdapter,
  model: UnifiedModelConfig,
  ui: UIRenderer,
  onModelUpdate: (next: UnifiedModelConfig) => void
): Promise<boolean> {
  // 添加别名
  if (action === ACTION_INDEX.ADD) {
    const next = await handleAddAlias(adapter, model, ui);
    onModelUpdate(next);
    return true;
  }
  // 删除别名
  else if (action === ACTION_INDEX.REMOVE) {
    const next = await handleRemoveAlias(adapter, model, ui);
    onModelUpdate(next);
    return true;
  }
  // 列出别名
  else if (action === ACTION_INDEX.LIST) {
    handleListAliases(model, ui);
    return true;
  }
  // 返回上一级
  else {
    return false;
  }
}

/**
 * 渲染子菜单
 *
 * @param model - 当前目标模型
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function renderSubMenu(model: UnifiedModelConfig): void {
  const aliases = model.aliases ?? [];
  const aliasText = aliases.length > 0 ? aliases.join(', ') : t('alias.none');

  console.log(chalk.cyan(`\n=== ${t('alias.manageTitle', { model: getModelKey(model) })} ===`));
  console.log(chalk.gray(`${t('alias.currentAliases')}: [${aliasText}]\n`));
  console.log(chalk.gray(`[${ACTION_INDEX.ADD}] ${t('alias.add')}`));
  console.log(chalk.gray(`[${ACTION_INDEX.REMOVE}] ${t('alias.remove')}`));
  console.log(chalk.gray(`[${ACTION_INDEX.LIST}] ${t('alias.list')}`));
  console.log(chalk.gray(`[${ACTION_INDEX.BACK}] ${t('tools.back')}`));
}

/**
 * 提示用户输入子菜单索引
 *
 * @return 已校验的索引值(0-3)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function promptActionIndex(): Promise<number> {
  const response = await inquirer.prompt([
    {
      type: 'input',
      name: 'index',
      message: t('tools.enterIndex'),
      validate: (value: string) => validateActionIndex(value),
    },
  ] as any);

  return parseInt(response.index, 10);
}

/**
 * 校验子菜单输入合法性
 *
 * @param value - 用户输入字符串
 * @return 合法返回 true,否则返回错误提示
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function validateActionIndex(value: string): true | string {
  const num = parseInt(value, 10);

  // 非数字 / 越界
  if (isNaN(num) || num < 0 || num >= ACTION_COUNT) {
    return t('alias.invalidIndex', { max: ACTION_COUNT - 1 });
  }
  // 合法
  else {
    return true;
  }
}
