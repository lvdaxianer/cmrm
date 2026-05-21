/**
 * /add 命令流程辅助函数
 * 封装添加流程中的验证、测试、保存等纯逻辑
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { ToolAdapter } from '../adapters';
import { UnifiedModelConfig } from '../types';
import { UIRenderer } from './ui';
import { testModelConfig } from '../utils/tester';
import { t } from '../i18n';
import { collectAllModels } from './model-finder';
import { validateAlias } from './alias-validator';
import { getPrimaryModelName, validateModelIdentity } from './model-identity';

/** API Key 截断显示长度 */
const API_KEY_TRUNCATE_LENGTH = 10;

/** 默认 API 类型 */
const DEFAULT_API_TYPE = 'anthropic';

/**
 * 验证配置标识（名称与别名唯一性）
 *
 * @param config - 待验证的模型配置
 * @param ui - UI 渲染器
 * @return 验证通过返回 true，否则 false
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function validateConfigIdentity(config: UnifiedModelConfig, ui: UIRenderer): boolean {
  const allModels = collectAllModels();
  const identityResult = validateModelIdentity(config, allModels);

  // 标识校验失败
  if (!identityResult.valid) {
    ui.showError(identityResult.error || t('add.validateFailed'));
    return false;
  }
  // 标识校验通过：继续校验别名
  else {
    return validateConfigAliases(config, allModels, ui);
  }
}

/**
 * 验证配置中的别名唯一性
 *
 * @param config - 待验证的模型配置
 * @param allModels - 所有已保存模型
 * @param ui - UI 渲染器
 * @return 全部别名校验通过返回 true，否则 false
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function validateConfigAliases(
  config: UnifiedModelConfig,
  allModels: UnifiedModelConfig[],
  ui: UIRenderer
): boolean {
  for (const alias of config.aliases ?? []) {
    const aliasResult = validateAlias(alias, allModels, getPrimaryModelName(config));
    // 某个别名校验失败
    if (!aliasResult.valid) {
      ui.showError(aliasResult.error || t('add.validateFailed'));
      return false;
    }
  }
  return true;
}

/**
 * 测试配置并根据用户选择保存或放弃
 *
 * @param adapter - 工具适配器
 * @param ui - UI 渲染器
 * @param config - 标准化后的配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export async function testThenSave(
  adapter: ToolAdapter,
  ui: UIRenderer,
  config: UnifiedModelConfig
): Promise<void> {
  // 测试配置连通性并询问保存意愿
  const shouldSave = await testAndConfirmSave(config, ui);

  // 用户同意保存：持久化配置并展示结果
  if (shouldSave) {
    adapter.saveModel(config);
    showAddModelResult(config, ui);
  }
  // 用户放弃保存
  else {
    ui.showWarning('\n' + t('add.cancelSave'));
  }
}

/**
 * 测试配置并询问是否保存（测试失败时）
 *
 * @param config - 待测试配置
 * @param ui - UI 渲染器
 * @return true 表示同意保存
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export async function testAndConfirmSave(config: UnifiedModelConfig, ui: UIRenderer): Promise<boolean> {
  ui.showInfo('\n' + t('add.testing'));

  // 发起模型连通性测试
  const result = await testModelConfig(
    config.model,
    config.apiKey,
    config.baseUrl,
    config.apiType ?? DEFAULT_API_TYPE
  );
  ui.showTestResult(result);

  // 测试通过：直接同意保存
  if (result.success) {
    return true;
  }
  // 测试失败：询问用户是否仍保存
  else {
    return confirmStillSave();
  }
}

/**
 * 询问用户测试失败后是否仍保存配置
 *
 * @return 用户选择，默认 false
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
async function confirmStillSave(): Promise<boolean> {
  // 弹出确认对话框
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

/**
 * 显示添加成功结果（API Key 截断脱敏）
 *
 * @param config - 已保存的配置对象
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function showAddModelResult(config: UnifiedModelConfig, ui: UIRenderer): void {
  ui.showSuccess('\n' + t('add.modelAdded'));
  ui.showInfo(`  ${t('ui.savedLabel')}: ${config.name}`);
  ui.showInfo(`  ${t('actions.model')}:     ${config.model}`);

  // API Key 脱敏（仅显示前 N 位，避免泄露完整密钥）
  const truncatedApiKey = config.apiKey.substring(0, API_KEY_TRUNCATE_LENGTH) + '...';
  ui.showInfo(`  API Key:  ${truncatedApiKey}`);
  ui.showInfo(`  Base URL: ${config.baseUrl}`);
  ui.showInfo(`  API 类型: ${config.apiType ?? DEFAULT_API_TYPE}`);
}
