/**
 * /edit 命令处理器
 * 仅允许编辑已保存配置的模型名称与 API Key
 *
 * @author lvdaxianerplus
 * @date 2026-05-21
 */

import inquirer from 'inquirer';
import * as readline from 'readline';
import { ToolAdapter } from '../adapters';
import { UnifiedModelConfig } from '../types';
import { UIRenderer } from './ui';
import { pickModel } from './model-picker';
import { collectAllModels } from './model-finder';
import { getPrimaryModelName, normalizeModelIdentity, validateModelIdentity } from './model-identity';
import { t } from '../i18n';
import { testModelConfig } from '../utils/tester';

/** API Key 截断显示长度 */
const API_KEY_TRUNCATE_LENGTH = 10;

/** 默认 API 类型 */
const DEFAULT_API_TYPE = 'anthropic';

/**
 * 编辑流程结果
 * 用于区分是否真正完成了保存
 */
export type EditResult = 'saved' | 'cancelled' | 'failed';

/**
 * /edit 流程附加配置
 * 用于注入统一退出行为
 */
export interface EditFlowOptions {
  /** 处理“直接退出”的回调 */
  onExit?: () => void;
}

/**
 * 执行 /edit 主流程
 *
 * @param adapter - 已选中的工具适配器
 * @param ui - UI 渲染器
 * @param rl - 当前活跃的 readline 接口
 * @param options - 附加流程配置
 * @author lvdaxianerplus
 * @date 2026-05-21
 */
export async function runEditFlow(
  adapter: ToolAdapter,
  ui: UIRenderer,
  rl: readline.Interface,
  options: EditFlowOptions = {}
): Promise<void> {
  const result = await pickModel(adapter, rl, {
    title: `Edit ${adapter.displayName} Model`,
    prompt: t('tools.enterIndex'),
    hint: t('tools.confirmHint'),
  });

  await handleEditSelection(adapter, ui, result, options);
}

/**
 * 处理编辑选择结果
 *
 * @param adapter - 工具适配器
 * @param ui - UI 渲染器
 * @param result - 模型选择结果
 * @param options - 附加流程配置
 * @author lvdaxianerplus
 * @date 2026-05-21
 */
async function handleEditSelection(
  adapter: ToolAdapter,
  ui: UIRenderer,
  result: Awaited<ReturnType<typeof pickModel>>,
  options: EditFlowOptions
): Promise<void> {
  if (result.kind === 'empty') {
    ui.showWarning(`\n${adapter.displayName} ${t('tools.noModels')}`);
    ui.showInfo(t('tools.addModelHint'));
  }
  else if (result.kind === 'back') {
    ui.showInfo('\n' + t('add.cancel'));
  }
  else if (result.kind === 'exit') {
    handleFlowExit(options);
  }
  else {
    await runEditForModel(adapter, result.model, ui);
  }
}

/**
 * 处理 /edit 流程中的“直接退出”
 * 优先走外部注入的统一退出逻辑
 *
 * @param options - 附加流程配置
 * @author lvdaxianerplus
 * @date 2026-05-21
 */
function handleFlowExit(options: EditFlowOptions): void {
  if (options.onExit) {
    options.onExit();
  }
  else {
    process.exit(0);
  }
}

/**
 * 编辑指定模型并持久化
 *
 * @param adapter - 工具适配器
 * @param model - 当前模型
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-21
 */
export async function runEditForModel(
  adapter: ToolAdapter,
  model: UnifiedModelConfig,
  ui: UIRenderer
): Promise<EditResult> {
  return promptAndPersistEdit(adapter, model, ui);
}

/**
 * 收集编辑输入并持久化
 *
 * @param adapter - 工具适配器
 * @param model - 当前模型
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-21
 */
async function promptAndPersistEdit(
  adapter: ToolAdapter,
  model: UnifiedModelConfig,
  ui: UIRenderer
): Promise<EditResult> {
  const originalKey = getPrimaryModelName(model);
  const response = await promptEditFields(model);

  if (Object.keys(response).length === 0) {
    ui.showWarning('\n' + t('add.cancel'));
    return 'cancelled';
  }

  const updated = buildEditedConfig(model, response);
  if (!adapter.validateConfig(updated)) {
    ui.showError('\n' + t('add.validateFailed'));
    return 'failed';
  }

  const identityResult = validateModelIdentity(updated, collectAllModels(), originalKey);
  if (!identityResult.valid) {
    ui.showError(identityResult.error || t('add.validateFailed'));
    return 'failed';
  }

  const shouldSave = await testAndConfirmSave(updated, ui);
  if (!shouldSave) {
    ui.showWarning('\n' + t('add.cancelSave'));
    return 'cancelled';
  }

  persistEditedConfig(adapter, updated, originalKey);
  showEditResult(updated, ui);
  return 'saved';
}

/**
 * 弹出编辑输入框
 *
 * @param model - 当前模型
 * @return 编辑后的响应对象
 * @author lvdaxianerplus
 * @date 2026-05-21
 */
async function promptEditFields(model: UnifiedModelConfig): Promise<Record<string, string>> {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'model',
      message: `${t('add.modelName')} [${model.model}]:`,
      default: model.model,
      validate: (value: string) => value.trim() !== '' || t('add.modelName') + ' is required',
    },
    {
      type: 'password',
      name: 'apiKey',
      message: t('add.apiKey'),
      mask: '*',
      validate: (value: string) => value.trim() !== '' || t('add.apiKey') + ' is required',
    },
  ] as any);
}

/**
 * 构建编辑后的配置
 *
 * @param model - 原模型
 * @param response - 编辑响应
 * @return 编辑后的标准化配置
 * @author lvdaxianerplus
 * @date 2026-05-21
 */
function buildEditedConfig(
  model: UnifiedModelConfig,
  response: Record<string, string>
): UnifiedModelConfig {
  return normalizeModelIdentity({
    ...model,
    model: response.model.trim(),
    apiKey: response.apiKey.trim(),
  });
}

/**
 * 保存编辑后的配置
 *
 * @param adapter - 工具适配器
 * @param updated - 编辑后的配置
 * @param originalKey - 原始模型标识
 * @author lvdaxianerplus
 * @date 2026-05-21
 */
function persistEditedConfig(
  adapter: ToolAdapter,
  updated: UnifiedModelConfig,
  originalKey: string
): void {
  adapter.saveModel(updated);

  if (getPrimaryModelName(updated) !== originalKey) {
    adapter.removeModel(originalKey);
  }
}

/**
 * 显示编辑完成结果
 *
 * @param config - 已更新配置
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-21
 */
function showEditResult(config: UnifiedModelConfig, ui: UIRenderer): void {
  ui.showSuccess('\n' + t('edit.updated'));
  ui.showInfo(`  ${t('ui.savedLabel')}: ${config.name}`);
  ui.showInfo(`  ${t('actions.model')}:     ${config.model}`);
  ui.showInfo(`  API Key:  ${config.apiKey.substring(0, API_KEY_TRUNCATE_LENGTH)}...`);
}

/**
 * 测试编辑后的配置并确认是否保存
 *
 * @param config - 已编辑配置
 * @param ui - UI 渲染器
 * @return true 表示继续保存
 * @author lvdaxianerplus
 * @date 2026-05-21
 */
async function testAndConfirmSave(
  config: UnifiedModelConfig,
  ui: UIRenderer
): Promise<boolean> {
  ui.showInfo('\n' + t('add.testing'));

  const result = await testModelConfig(
    config.model,
    config.apiKey,
    config.baseUrl,
    config.apiType ?? DEFAULT_API_TYPE
  );
  ui.showTestResult(result);

  if (result.success) {
    return true;
  }
  else {
    return confirmStillSave();
  }
}

/**
 * 测试失败后确认是否仍保存
 *
 * @return 用户选择结果
 * @author lvdaxianerplus
 * @date 2026-05-21
 */
async function confirmStillSave(): Promise<boolean> {
  const response = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'stillSave',
      message: t('add.testFailStillSave'),
      default: false,
    },
  ] as any);

  return Boolean(response.stillSave);
}
