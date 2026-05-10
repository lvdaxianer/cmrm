/**
 * 模型操作处理器
 * 抽离自 cli.ts，集中处理已选中模型的三类操作：switch / remove / info
 *
 * 拆分原因：
 * - 三个操作各自体量较小（10-40 行），合并为一个文件减少模块碎片
 * - 共享 ToolAdapter + UIRenderer 注入风格，便于未来扩展
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import chalk from 'chalk';
import { ToolAdapter } from '../adapters';
import { UnifiedModelConfig } from '../types';
import { UIRenderer } from './ui';
import { t } from '../i18n';
import { writeEnvVars, getRestartHint } from '../utils/shell-env-writer';
import { getPrimaryModelName } from './model-identity';

/**
 * 切换工具的当前模型配置
 * 写入工具配置文件（自动备份）并打印结果
 *
 * @param adapter - 工具适配器
 * @param config - 待切换的模型配置
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function runSwitchAction(
  adapter: ToolAdapter,
  config: UnifiedModelConfig,
  ui: UIRenderer
): Promise<void> {
  try {
    // 验证配置完整性
    if (!adapter.validateConfig(config)) {
      ui.showError('\n' + t('actions.validateFailed'));
      return;
    }
    // 验证通过：写入并展示结果
    else {
      const backupFileName = adapter.writeModelConfig(config);
      showSwitchResult(adapter, config, backupFileName, ui);

      // Codex 工具：额外写入 shell 环境变量
      if (adapter.name === 'codex') {
        await updateShellEnvForCodex(config, ui);
      }
    }
  }
  // 切换异常：友好提示
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ui.showError(t('actions.switchFailed') + `: ${message}`);
  }
}

/**
 * 更新 Codex 的 shell 环境变量
 * 将 OPENAI_API_KEY 写入 shell 配置文件，使 Codex CLI 能读取到
 *
 * @param config - 模型配置
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
async function updateShellEnvForCodex(
  config: UnifiedModelConfig,
  ui: UIRenderer
): Promise<void> {
  try {
    const result = writeEnvVars({ OPENAI_API_KEY: config.apiKey });

    ui.showInfo('\n' + t('actions.envVarUpdated'));
    ui.showInfo(`  ${t('actions.envVarPath')}: ${result.path}`);
    ui.showWarning(`  ${getRestartHint(result.path)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ui.showWarning(`${t('actions.envVarUpdateFailed')}: ${message}`);
  }
}

/**
 * 显示切换成功后的摘要
 *
 * @param adapter - 工具适配器
 * @param config - 切换后的配置
 * @param backupFileName - 备份文件名（无备份时为 null）
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function showSwitchResult(
  adapter: ToolAdapter,
  config: UnifiedModelConfig,
  backupFileName: string | null,
  ui: UIRenderer
): void {
  ui.showSuccess('\n' + t('actions.modelSwitched'));
  ui.showInfo(`  ${t('actions.tool')}:     ${adapter.displayName}`);
  ui.showInfo(`  ${t('actions.model')}:     ${config.model}`);

  // 有备份：附加备份文件名
  if (backupFileName) {
    ui.showInfo(`  ${t('actions.backup')}:     ${backupFileName}`);
  }
  // 无备份：不输出额外行
  else {
    // 配置文件首次创建，无需备份
  }
}

/**
 * 删除指定的模型配置
 *
 * @param adapter - 工具适配器
 * @param config - 要删除的模型配置
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function runRemoveAction(
  adapter: ToolAdapter,
  config: UnifiedModelConfig,
  ui: UIRenderer
): Promise<void> {
  const configName = getPrimaryModelName(config);

  try {
    const success = adapter.removeModel(configName);

    // 删除成功
    if (success) {
      ui.showSuccess(`\n${t('actions.modelDeleted')}: ${configName}`);
    }
    // 删除失败（配置不存在）
    else {
      ui.showError(`\n${t('actions.deleteFailed')}: ${t('actions.configNotExists')}`);
    }
  }
  // 异常：友好提示
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ui.showError(`\n${t('actions.deleteFailed')}: ${message}`);
  }
}

/**
 * 显示模型详细信息（JSON 格式）
 *
 * @param model - 模型配置
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function showModelInfo(model: UnifiedModelConfig): void {
  console.log(chalk.cyan('\n=== ' + t('actions.modelDetails') + ' ===\n'));
  console.log(JSON.stringify(model, null, 2));
  console.log('');
}
