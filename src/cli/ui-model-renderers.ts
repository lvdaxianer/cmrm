/**
 * UI 模型渲染函数模块
 * 负责模型列表、当前模型显示等模型相关界面渲染
 * 从 ui-renderers.ts 中进一步拆分，保持单一职责
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import chalk from 'chalk';
import { UnifiedModelConfig } from '../types';
import { ToolAdapter, registry } from '../adapters';
import { t } from '../i18n';
import { getCodexProfileName, getPrimaryModelName } from './model-identity';
import { clearLines } from './ui-renderers';

/** Codex 适配器名称 */
const ADAPTER_NAME_CODEX = 'codex';

/**
 * 获取实体标签
 * Codex 使用 Profile，其他使用 Model
 *
 * @param adapter - 工具适配器
 * @return 标签文本
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function getEntityLabel(adapter: ToolAdapter): string {
  // Codex 工具：使用 Profile 标签
  if (adapter.name === ADAPTER_NAME_CODEX) {
    return 'Profile';
  }
  // 其他工具：使用 Model 标签
  else {
    return 'Model';
  }
}

/**
 * 渲染模型选择列表（索引方式）
 * 显示指定工具的所有保存模型，每个选项带索引编号
 *
 * @param adapter - 工具适配器
 * @param models - 模型配置列表
 * @param currentSelection - 当前选中的索引（用于高亮）
 * @param isFirstRender - 是否首次渲染（首次渲染包含提示文字）
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export function renderModelList(adapter: ToolAdapter, models: UnifiedModelConfig[], currentSelection: number, isFirstRender: boolean = false): void {
  renderModelTitle(adapter, isFirstRender);
  renderModelOptions(models, currentSelection);
  renderModelHint(isFirstRender);
}

/**
 * 渲染模型列表标题
 *
 * @param adapter - 工具适配器
 * @param isFirstRender - 是否首次渲染
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function renderModelTitle(adapter: ToolAdapter, isFirstRender: boolean): void {
  if (isFirstRender) {
    console.log(chalk.cyan(`\n=== Select ${adapter.displayName} ${getEntityLabel(adapter)} ===`));
    console.log(chalk.gray(`(${t('ui.selectModelHint')})\n`));
  }
  // 非首次渲染：不输出标题
  else {
    // 非首次渲染省略标题，保持界面简洁
  }
}

/**
 * 渲染模型选项列表
 *
 * @param models - 模型配置列表
 * @param currentSelection - 当前选中的索引
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function renderModelOptions(models: UnifiedModelConfig[], currentSelection: number): void {
  models.forEach((model, index) => {
    const displayName = getPrimaryModelName(model);
    const providerInfo = shouldShowProviderBadge(model, displayName)
      ? chalk.gray(`[${model.provider}]`)
      : '';
    renderModelLine(index, displayName, providerInfo, index === currentSelection);
  });
}

/**
 * 渲染单条模型行
 *
 * @param index - 模型索引
 * @param displayName - 显示名称
 * @param providerInfo - 提供商信息
 * @param isSelected - 是否选中
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function renderModelLine(index: number, displayName: string, providerInfo: string, isSelected: boolean): void {
  if (isSelected) {
    console.log(chalk.green(`[${index}] `) + chalk.bold(displayName) + ` ${providerInfo}`);
  } else {
    console.log(chalk.gray(`[${index}] `) + displayName + ` ${providerInfo}`);
  }
}

/**
 * 渲染模型列表底部提示
 *
 * @param isFirstRender - 是否首次渲染
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function renderModelHint(isFirstRender: boolean): void {
  if (isFirstRender) {
    console.log(chalk.gray(`\n${t('ui.enterIndex')}:`));
  }
  // 非首次渲染：不输出提示
  else {
    // 非首次渲染省略提示，避免重复
  }
}

/**
 * 判断是否需要额外显示 provider 徽标
 * 当主显示名已是 provider/model 时，不重复显示 [provider]
 *
 * @param model - 模型配置
 * @param displayName - 当前主显示名
 * @return 需要显示返回 true
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
function shouldShowProviderBadge(model: UnifiedModelConfig, displayName: string): boolean {
  return !!model.provider && !displayName.startsWith(`${model.provider}/`);
}

/**
 * 显示所有工具的所有模型配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export function showAllModels(): void {
  const adapters = registry.getAllAdapters();

  console.log(chalk.cyan(`\n=== ${t('ui.allModels')} ===\n`));

  // 遍历每个工具显示其模型
  adapters.forEach(adapter => {
    const models = adapter.getSavedModels();

    // 无模型配置时显示提示
    if (models.length === 0) {
      console.log(chalk.gray(`[${adapter.displayName}] ${t('ui.noModels')}`));
    }
    // 有模型时显示列表
    else {
      const modelNames = models.map(m => getPrimaryModelName(m)).join(', ');
      console.log(chalk.green(`[${adapter.displayName}] ${modelNames}`));
    }
  });

  console.log('');
}

/**
 * 显示所有工具的当前生效模型
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export function showCurrentModels(): void {
  const adapters = registry.getAllAdapters();

  console.log(chalk.cyan(`\n=== ${t('ui.currentModels')} ===\n`));

  // 遍历每个工具显示当前模型
  adapters.forEach(adapter => {
    const currentModel = adapter.readCurrentModel();

    // 有配置时显示当前模型
    if (currentModel) {
      showCurrentModel(adapter, currentModel);
    }
    // 无配置时显示未配置
    else {
      console.log(chalk.gray(`[${adapter.displayName}] ${t('ui.current')}: ${t('ui.notConfigured')}`));
    }
  });

  console.log('');
}

/**
 * 显示单个工具的当前生效模型
 *
 * @param adapter - 工具适配器
 * @param currentModel - 当前模型配置
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function showCurrentModel(adapter: ToolAdapter, currentModel: UnifiedModelConfig): void {
  // Codex 工具且存在 provider：使用 Codex 专用显示逻辑
  if (adapter.name === ADAPTER_NAME_CODEX && currentModel.provider) {
    showCurrentCodexModel(adapter, currentModel);
  }
  // 其他工具：使用通用显示逻辑
  else {
    const currentDisplay = currentModel.provider
      ? getCodexProfileName(currentModel)
      : currentModel.model;
    console.log(chalk.green(`[${adapter.displayName}] ${t('ui.current')}: ${currentDisplay}`));
  }
}

/**
 * 显示 Codex 工具的当前生效模型
 *
 * @param adapter - Codex 工具适配器
 * @param currentModel - 当前模型配置
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function showCurrentCodexModel(adapter: ToolAdapter, currentModel: UnifiedModelConfig): void {
  const runtimeDisplay = getCodexProfileName(currentModel);
  const savedProfile = findMatchingSavedCodexProfile(adapter, currentModel);

  console.log(
    chalk.green(`[${adapter.displayName}] ${t('ui.current')}: ${runtimeDisplay}`) +
    chalk.gray(` (${t('ui.runtimeLabel')}: ${currentModel.baseUrl})`)
  );

  // 保存的配置与运行时显示名不同：额外显示保存的配置名
  if (savedProfile && getPrimaryModelName(savedProfile) !== runtimeDisplay) {
    console.log(chalk.gray(`  ${t('ui.savedLabel')}: ${getPrimaryModelName(savedProfile)}`));
  }
  // 保存的配置与运行时显示名相同：不重复显示
  else {
    // 无需额外显示，保持界面简洁
  }
}

/**
 * 查找与当前 Codex 配置匹配的已保存模型
 *
 * @param adapter - Codex 工具适配器
 * @param currentModel - 当前模型配置
 * @return 匹配的已保存模型，未找到返回 null
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function findMatchingSavedCodexProfile(
  adapter: ToolAdapter,
  currentModel: UnifiedModelConfig
): UnifiedModelConfig | null {
  const models = adapter.getSavedModels();
  const exactMatch = models.find(model =>
    model.model === currentModel.model &&
    model.baseUrl === currentModel.baseUrl
  );

  // 精确匹配：返回该模型
  if (exactMatch) {
    return exactMatch;
  }
  // 精确匹配失败：尝试仅按 model 匹配
  else {
    const modelOnlyMatch = models.find(model => model.model === currentModel.model);
    return modelOnlyMatch || null;
  }
}
