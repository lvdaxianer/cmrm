/**
 * 模型查找工具
 * 按 name / aliases / model 字段从已保存模型列表中检索目标
 *
 * 应用场景:
 * - CLI 快捷方式 `cmrm switch <name>` / `cmrm test <name>`
 * - 用户输入的「名称」可能是 `name` 字段(自定义名),也可能是 `aliases` 中某项,
 *   或者是 `model` 字段(模型 ID)
 *
 * 查找优先级:
 * 1. 完全匹配 `name`(用户主动命名优先级最高)
 * 2. 完全匹配任意模型的 `aliases` 中某项(用户主动命名,优先级次于 name)
 * 3. 完全匹配 `model`(退化匹配,兼容直接使用模型 ID 的场景)
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { ToolAdapter, registry } from '../adapters';
import { UnifiedModelConfig } from '../types';
import { findModelByAlias } from './alias-validator';

/**
 * 按名称查找已保存模型
 * 优先匹配 name 字段,其次匹配 aliases 中某项,最后退化匹配 model 字段
 *
 * @param adapter - 工具适配器(必须已注册)
 * @param name - 用户输入的模型名(name / aliases / model 字段值)
 * @return 命中模型;未命中返回 null
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function findModelByName(
  adapter: ToolAdapter,
  name: string
): UnifiedModelConfig | null {
  const models = adapter.getSavedModels();

  // 优先按 name 字段匹配
  const byName = models.find(m => m.name === name);
  if (byName) {
    return byName;
  }
  // name 未命中:进入次级查找(aliases / model)
  else {
    return findByAliasOrModel(models, name);
  }
}

/**
 * 在 name 未命中时,继续按 aliases / model 字段查找
 * 抽离独立函数避免父函数嵌套过深
 *
 * @param models - 已保存模型列表
 * @param name - 用户输入的名称
 * @return 命中模型;未命中返回 null
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function findByAliasOrModel(
  models: UnifiedModelConfig[],
  name: string
): UnifiedModelConfig | null {
  // 次优先:按 aliases 中某项匹配
  const byAlias = findModelByAlias(models, name);
  if (byAlias) {
    return byAlias;
  }
  // aliases 也未命中:退化按 model 字段匹配
  else {
    return findByModelField(models, name);
  }
}

/**
 * 在模型列表中按 model 字段查找
 * 抽离为独立函数避免父函数的 if/else 嵌套
 *
 * @param models - 已保存模型列表
 * @param name - 模型名(对应 UnifiedModelConfig.model)
 * @return 命中返回模型配置;未命中返回 null
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function findByModelField(
  models: UnifiedModelConfig[],
  name: string
): UnifiedModelConfig | null {
  const byModel = models.find(m => m.model === name);

  // 命中:返回配置
  if (byModel) {
    return byModel;
  }
  // 未命中:返回 null
  else {
    return null;
  }
}

/**
 * 列出所有可用模型显示名(name || model)
 * 用于查找失败时给出友好提示
 *
 * @param adapter - 工具适配器
 * @return 模型显示名数组,无模型时返回空数组
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function listAvailableNames(adapter: ToolAdapter): string[] {
  return adapter.getSavedModels().map(m => m.name || m.model);
}

/**
 * 跨所有已注册工具汇总全部模型
 * 用于全局别名唯一性校验,避免在 alias-actions / alias-shortcut 重复实现
 *
 * @return 全部模型数组(可能为空)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function collectAllModels(): UnifiedModelConfig[] {
  return registry
    .getAllAdapters()
    .flatMap(a => a.getSavedModels());
}
