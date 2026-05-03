/**
 * `cmrm alias <model> <new-alias>` 快捷方式执行器
 * 与交互菜单(/alias)同等校验逻辑,但仅支持「添加别名」单一动作
 *
 * 流程:
 *  1. 按 name/aliases/model 查找目标模型;未找到则退出码 1
 *  2. 跨工具汇总所有模型,执行别名唯一性校验;失败则退出码 1
 *  3. 不可变方式追加别名,调用 adapter.saveModel 持久化
 *  4. 输出成功提示并返回退出码 0
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { ToolAdapter } from '../adapters';
import { UnifiedModelConfig } from '../types';
import { UIRenderer } from './ui';
import { findModelByName, listAvailableNames, collectAllModels } from './model-finder';
import { validateAlias, getModelKey } from './alias-validator';

/** 退出码:成功 */
const EXIT_OK = 0;

/** 退出码:失败 */
const EXIT_FAIL = 1;

/**
 * 执行 `cmrm alias <model> <new-alias>` 快捷方式
 *
 * @param adapter - 工具适配器(默认为 claude)
 * @param modelName - 用户输入的模型名(可为 name / aliases / model)
 * @param newAlias - 待添加的别名
 * @param ui - UI 渲染器
 * @return 进程退出码(0 成功 / 1 失败)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function runAliasShortcut(
  adapter: ToolAdapter,
  modelName: string,
  newAlias: string,
  ui: UIRenderer
): Promise<number> {
  const model = findModelByName(adapter, modelName);

  // 未找到目标模型:友好提示并以非零退出码结束
  if (!model) {
    printModelNotFound(adapter, modelName, ui);
    return EXIT_FAIL;
  }
  // 找到模型:进入校验与持久化流程
  else {
    return persistAlias(adapter, model, newAlias, ui);
  }
}

/**
 * 校验别名并写入到 adapter
 *
 * @param adapter - 工具适配器
 * @param model - 目标模型
 * @param newAlias - 待添加的别名
 * @param ui - UI 渲染器
 * @return 退出码
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function persistAlias(
  adapter: ToolAdapter,
  model: UnifiedModelConfig,
  newAlias: string,
  ui: UIRenderer
): number {
  const allModels = collectAllModels();
  const result = validateAlias(newAlias, allModels, getModelKey(model));

  // 校验失败:输出失败原因
  if (!result.valid) {
    ui.showError(`别名添加失败: ${result.error}`);
    return EXIT_FAIL;
  }
  // 校验通过:不可变方式追加别名并保存
  else {
    saveModelWithNewAlias(adapter, model, newAlias.trim(), ui);
    return EXIT_OK;
  }
}

/**
 * 不可变方式追加别名后保存
 *
 * @param adapter - 工具适配器
 * @param model - 目标模型
 * @param trimmedAlias - 已 trim 的别名
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function saveModelWithNewAlias(
  adapter: ToolAdapter,
  model: UnifiedModelConfig,
  trimmedAlias: string,
  ui: UIRenderer
): void {
  const updated: UnifiedModelConfig = {
    ...model,
    aliases: [...(model.aliases ?? []), trimmedAlias],
  };

  adapter.saveModel(updated);
  ui.showSuccess(`已为 "${getModelKey(model)}" 添加别名: ${trimmedAlias}`);
}

/**
 * 输出"模型未找到"提示并附带可用模型清单
 *
 * @param adapter - 工具适配器
 * @param name - 用户输入的名称
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function printModelNotFound(adapter: ToolAdapter, name: string, ui: UIRenderer): void {
  ui.showError(`未找到模型: ${name}`);
  const available = listAvailableNames(adapter);

  // 有已保存模型:列出供参考
  if (available.length > 0) {
    ui.showInfo('可用模型:');
    available.forEach(n => ui.showInfo(`  - ${n}`));
  }
  // 完全没有模型:引导用户先添加
  else {
    ui.showInfo('当前没有保存的模型,使用 `cmrm` 进入交互菜单后选 /add 添加');
  }
}
