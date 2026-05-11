/**
 * /alias 子菜单具体动作处理器
 * 拆分自 alias-handler,聚焦「添加 / 删除 / 列出」三个动作及其辅助函数
 *
 * 设计要点:
 * - 不可变更新:所有 saveModel 前都会复制一份新的 UnifiedModelConfig
 * - 写入失败时返回原模型,保证 UI 状态与磁盘状态保持一致
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
import { validateAlias, getModelKey } from './alias-validator';
import { collectAllModels } from './model-finder';
import { validateIndexInput } from './readline-helper';
import { t } from '../i18n';

/** 空别名数组长度 */
const EMPTY_ALIAS_COUNT = 0;

/**
 * 处理「添加别名」子操作
 *
 * @param adapter - 工具适配器
 * @param model - 当前模型
 * @param ui - UI 渲染器
 * @return 操作后的最新模型(失败则返回原模型)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function handleAddAlias(
  adapter: ToolAdapter,
  model: UnifiedModelConfig,
  ui: UIRenderer
): Promise<UnifiedModelConfig> {
  const alias = await promptAliasInput();
  const allModels = collectAllModels();
  const result = validateAlias(alias, allModels, getModelKey(model));

  // 校验失败:提示并保持原模型
  if (!result.valid) {
    ui.showError(t('alias.addFailed') + `: ${result.error}`);
    return model;
  }
  // 校验通过:写入并返回最新模型
  else {
    return persistAddedAlias(adapter, model, alias.trim(), ui);
  }
}

/**
 * 询问待添加的别名
 *
 * @return 用户输入的原始字符串(未 trim)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function promptAliasInput(): Promise<string> {
  const response = await inquirer.prompt([
    {
      type: 'input',
      name: 'alias',
      message: t('alias.enterAlias'),
    },
  ] as any);

  return String(response.alias ?? '');
}

/**
 * 不可变方式追加别名并保存
 *
 * @param adapter - 工具适配器
 * @param model - 当前模型
 * @param trimmedAlias - 已 trim 的别名
 * @param ui - UI 渲染器
 * @return 最新模型副本
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function persistAddedAlias(
  adapter: ToolAdapter,
  model: UnifiedModelConfig,
  trimmedAlias: string,
  ui: UIRenderer
): UnifiedModelConfig {
  const updated: UnifiedModelConfig = {
    ...model,
    aliases: [...(model.aliases ?? []), trimmedAlias],
  };

  adapter.saveModel(updated);
  ui.showSuccess(t('alias.aliasAdded') + `: ${trimmedAlias}`);
  return updated;
}

/**
 * 处理「删除别名」子操作
 *
 * @param adapter - 工具适配器
 * @param model - 当前模型
 * @param ui - UI 渲染器
 * @return 操作后的最新模型(无别名/取消时返回原模型)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function handleRemoveAlias(
  adapter: ToolAdapter,
  model: UnifiedModelConfig,
  ui: UIRenderer
): Promise<UnifiedModelConfig> {
  const aliases = model.aliases ?? [];

  // 无别名:直接提示
  if (aliases.length === EMPTY_ALIAS_COUNT) {
    ui.showWarning(t('alias.noAliasToRemove'));
    return model;
  }
  // 有别名:让用户选择索引
  else {
    return promptRemoveIndex(adapter, model, aliases, ui);
  }
}

/**
 * 询问待删除别名的索引并执行删除
 *
 * @param adapter - 工具适配器
 * @param model - 当前模型
 * @param aliases - 当前别名列表
 * @param ui - UI 渲染器
 * @return 操作后的最新模型
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function promptRemoveIndex(
  adapter: ToolAdapter,
  model: UnifiedModelConfig,
  aliases: string[],
  ui: UIRenderer
): Promise<UnifiedModelConfig> {
  console.log(chalk.cyan('\n=== ' + t('alias.selectToRemove') + ' ==='));
  aliases.forEach((a, i) => console.log(chalk.gray(`[${i}] ${a}`)));

  const response = await inquirer.prompt([
    {
      type: 'input',
      name: 'index',
      message: t('tools.enterIndex'),
      validate: (value: string) => validateIndexInput(value, aliases.length),
    },
  ] as any);

  const idx = parseInt(response.index, 10);
  return persistRemovedAlias(adapter, model, idx, ui);
}

/**
 * 不可变方式移除指定索引的别名并保存
 *
 * @param adapter - 工具适配器
 * @param model - 当前模型
 * @param idx - 待删除别名的索引
 * @param ui - UI 渲染器
 * @return 最新模型副本
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function persistRemovedAlias(
  adapter: ToolAdapter,
  model: UnifiedModelConfig,
  idx: number,
  ui: UIRenderer
): UnifiedModelConfig {
  const aliases = model.aliases ?? [];
  const removed = aliases[idx];
  const next = aliases.filter((_, i) => i !== idx);

  const updated: UnifiedModelConfig = {
    ...model,
    aliases: next,
  };

  adapter.saveModel(updated);
  ui.showSuccess(t('alias.aliasRemoved') + `: ${removed}`);
  return updated;
}

/**
 * 处理「列出别名」子操作
 *
 * @param model - 当前模型
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function handleListAliases(model: UnifiedModelConfig, ui: UIRenderer): void {
  const aliases = model.aliases ?? [];

  // 无别名:提示
  if (aliases.length === EMPTY_ALIAS_COUNT) {
    ui.showInfo('\n' + t('alias.noAlias'));
  }
  // 有别名:逐个列出
  else {
    console.log(chalk.cyan('\n=== ' + t('alias.aliasList') + ' ==='));
    aliases.forEach((a, i) => console.log(chalk.gray(`  [${i}] ${a}`)));
  }
}
