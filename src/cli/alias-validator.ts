/**
 * 别名校验器
 * 提供别名唯一性校验与按别名查找模型的纯函数接口
 *
 * 设计要点:
 * - 不依赖任何 IO,所有逻辑均为纯函数,便于单测
 * - 返回结构化结果(AliasValidationResult)而非抛异常,调用方决定如何提示
 * - 大小写敏感,与现有 `name` 字段行为一致
 *
 * 唯一性规则(任一不通过即拒绝):
 * 1. trim 后非空字符串
 * 2. 不与任何其他模型的 `name` 相同
 * 3. 不与任何其他模型的 `model` 相同
 * 4. 不与任何其他模型的 `aliases` 中任意一项相同
 * 5. 不与当前模型自己的 `name` / `model` 相同(自指无意义)
 * 6. 不与当前模型已有 `aliases` 重复
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { UnifiedModelConfig } from '../adapters/types';

/**
 * 别名校验结果
 * valid=false 时通过 error 字段告知失败原因
 */
export interface AliasValidationResult {
  /** 校验是否通过 */
  valid: boolean;
  /** 失败原因(valid=false 时填充) */
  error?: string;
}

/**
 * 解析当前模型标识,用于在校验过程中跳过自身
 *
 * @param model - 当前模型配置
 * @return 自身唯一标识(优先 name,缺失时回退 model)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function getModelKey(model: UnifiedModelConfig): string {
  return model.name || model.model;
}

/**
 * 判断模型与当前操作模型是否为同一个
 * 兼容仅有 model 无 name 的场景
 *
 * @param target - 待比较模型
 * @param currentKey - 当前操作模型的唯一标识
 * @return 同一个返回 true,否则 false
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function isSameModel(target: UnifiedModelConfig, currentKey: string): boolean {
  // name 命中:同一个模型
  if (target.name && target.name === currentKey) {
    return true;
  }
  // model 命中:同一个模型(用户没设 name 的退化情况)
  else if (!target.name && target.model === currentKey) {
    return true;
  }
  // 都未命中:不同模型
  else {
    return false;
  }
}

/**
 * 校验单个新别名是否唯一合法
 * 任一规则不通过即返回 valid=false 与失败原因
 *
 * @param alias - 待添加的别名(原始输入,函数内部 trim)
 * @param allModels - 跨工具/跨用户的全部已保存模型
 * @param currentModelKey - 当前操作模型的唯一标识(用于跳过自身)
 * @return 校验结果
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function validateAlias(
  alias: string,
  allModels: UnifiedModelConfig[],
  currentModelKey: string
): AliasValidationResult {
  const trimmed = alias.trim();

  // 规则 1:trim 后非空
  if (!trimmed) {
    return { valid: false, error: '别名不能为空' };
  }
  // 非空:进入冲突检测
  else {
    return checkConflicts(trimmed, allModels, currentModelKey);
  }
}

/**
 * 在所有模型上执行冲突检测
 * 抽离独立函数避免父函数嵌套过深
 *
 * @param alias - 已 trim 后的别名
 * @param allModels - 全部模型
 * @param currentModelKey - 当前模型唯一标识
 * @return 校验结果
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function checkConflicts(
  alias: string,
  allModels: UnifiedModelConfig[],
  currentModelKey: string
): AliasValidationResult {
  // 先检查与当前模型自身的冲突
  const selfConflict = checkSelfConflict(alias, allModels, currentModelKey);
  if (selfConflict) {
    return { valid: false, error: selfConflict };
  }
  // 再检查与其他模型的冲突
  else {
    return checkOtherModelConflict(alias, allModels, currentModelKey);
  }
}

/**
 * 检查别名是否与当前模型自身的 name/model/aliases 冲突
 *
 * @param alias - 已 trim 别名
 * @param allModels - 全部模型
 * @param currentKey - 当前模型唯一标识
 * @return 冲突说明;无冲突返回 null
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function checkSelfConflict(
  alias: string,
  allModels: UnifiedModelConfig[],
  currentKey: string
): string | null {
  const self = allModels.find(m => isSameModel(m, currentKey));

  // 自身不存在:跳过自身冲突检测(由调用方先确保模型存在)
  if (!self) {
    return null;
  }
  // 自身存在:逐项比较
  else {
    return compareWithSelf(alias, self);
  }
}

/**
 * 与当前模型逐项比较冲突
 *
 * @param alias - 已 trim 别名
 * @param self - 当前模型
 * @return 冲突说明;无冲突返回 null
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function compareWithSelf(alias: string, self: UnifiedModelConfig): string | null {
  // 与自身 name 冲突
  if (self.name === alias) {
    return `别名与当前模型的 name 字段相同: ${alias}`;
  }
  // 与自身 model 冲突
  else if (self.model === alias) {
    return `别名与当前模型的 model 字段相同: ${alias}`;
  }
  // 与自身已有 aliases 冲突
  else if ((self.aliases ?? []).includes(alias)) {
    return `别名已存在于当前模型: ${alias}`;
  }
  // 无冲突
  else {
    return null;
  }
}

/**
 * 检查别名是否与其他模型(非自身)冲突
 *
 * @param alias - 已 trim 别名
 * @param allModels - 全部模型
 * @param currentKey - 当前模型唯一标识
 * @return 校验结果
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function checkOtherModelConflict(
  alias: string,
  allModels: UnifiedModelConfig[],
  currentKey: string
): AliasValidationResult {
  for (const m of allModels) {
    // 跳过自身
    if (isSameModel(m, currentKey)) {
      continue;
    }
    // 其他模型:逐项比较
    else {
      const reason = findConflictReason(alias, m);
      if (reason) {
        return { valid: false, error: reason };
      }
    }
  }

  return { valid: true };
}

/**
 * 在单个其他模型上查找冲突原因
 *
 * @param alias - 已 trim 别名
 * @param other - 其他模型
 * @return 冲突说明;无冲突返回 null
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function findConflictReason(alias: string, other: UnifiedModelConfig): string | null {
  const otherKey = other.name || other.model;

  // 与他模型 name 冲突
  if (other.name === alias) {
    return `别名与模型 "${otherKey}" 的 name 字段冲突`;
  }
  // 与他模型 model 冲突
  else if (other.model === alias) {
    return `别名与模型 "${otherKey}" 的 model 字段冲突`;
  }
  // 与他模型 aliases 中某项冲突
  else if ((other.aliases ?? []).includes(alias)) {
    return `别名已被模型 "${otherKey}" 占用`;
  }
  // 无冲突
  else {
    return null;
  }
}

/**
 * 在所有模型的 aliases 中查找命中
 * 用于 findModelByName 的 alias 命中分支
 *
 * @param models - 已保存模型列表
 * @param alias - 待查找别名(精确匹配,大小写敏感)
 * @return 命中的模型;未命中返回 null
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function findModelByAlias(
  models: UnifiedModelConfig[],
  alias: string
): UnifiedModelConfig | null {
  const hit = models.find(m => (m.aliases ?? []).includes(alias));

  // 命中:返回该模型
  if (hit) {
    return hit;
  }
  // 未命中:返回 null
  else {
    return null;
  }
}
