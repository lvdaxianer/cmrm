/**
 * /add 命令处理器
 * 抽离自 cli.ts 的 handleAddModel 流程，包含交互输入、配置验证、测试连通性、保存确认
 *
 * 与 cli.ts 协作关系：
 * - cli.ts 选完工具后调用 runAddFlow
 * - 本模块处理具体输入收集与保存决策
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import * as readline from 'readline';
import { ToolAdapter } from '../adapters';
import { UnifiedModelConfig } from '../types';
import { UIRenderer } from './ui';
import { testModelConfig } from '../utils/tester';
import { prepareForInquirer } from './readline-helper';
import { buildAddModelQuestions, buildModelConfig } from './add-questions';
import { askApiType } from './api-type-prompt';

/**
 * 执行 /add 主流程
 * 收集用户输入 → 验证 → 测试连通性 → 决定是否保存
 *
 * @param adapter - 已选中的工具适配器
 * @param ui - UI 渲染器
 * @param rl - 当前活跃的 readline 接口
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function runAddFlow(
  adapter: ToolAdapter,
  ui: UIRenderer,
  rl: readline.Interface
): Promise<void> {
  // 进入 inquirer 模式（关闭 readline 等）
  prepareForInquirer(rl);

  console.log(chalk.cyan(`\n=== 添加 ${adapter.displayName} 模型配置 ===\n`));
  console.log(chalk.gray('提示：可选字段不填写可直接按 Enter 跳过\n'));

  try {
    await collectAndSave(adapter, ui);
  }
  // 添加流程异常：友好提示
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ui.showError(`添加失败: ${message}`);
  }
}

/**
 * 收集用户输入并完成保存流程
 * 抽离主体逻辑使 runAddFlow 保持线性可读
 *
 * @param adapter - 工具适配器
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function collectAndSave(adapter: ToolAdapter, ui: UIRenderer): Promise<void> {
  // 先以索引菜单选择 API 类型(与其他菜单一致)
  const apiType = await askApiType();
  // 收集其他字段
  const response = await inquirer.prompt(buildAddModelQuestions() as any);

  // 用户取消（Ctrl+C 等）
  if (Object.keys(response).length === 0) {
    ui.showWarning('\n已取消');
    return;
  }
  // 输入完整：合并 apiType 后进入验证
  else {
    await validateAndPersist(adapter, ui, { ...response, apiType });
  }
}

/**
 * 验证配置并根据测试结果决定是否保存
 *
 * @param adapter - 工具适配器
 * @param ui - UI 渲染器
 * @param response - inquirer 收集到的输入
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function validateAndPersist(
  adapter: ToolAdapter,
  ui: UIRenderer,
  response: Record<string, any>
): Promise<void> {
  const config = buildModelConfig(response);

  // 验证失败：终止流程
  if (!adapter.validateConfig(config)) {
    ui.showError('\n配置验证失败！请检查必填字段。');
    return;
  }
  // 验证通过：测试连通性后决定是否保存
  else {
    await testThenSave(adapter, ui, config);
  }
}

/**
 * 测试配置并根据用户选择保存或放弃
 *
 * @param adapter - 工具适配器
 * @param ui - UI 渲染器
 * @param config - 标准化后的配置对象
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function testThenSave(
  adapter: ToolAdapter,
  ui: UIRenderer,
  config: UnifiedModelConfig
): Promise<void> {
  const shouldSave = await testAndConfirmSave(config, ui);

  // 用户同意保存
  if (shouldSave) {
    adapter.saveModel(config);
    showAddModelResult(config, ui);
  }
  // 用户放弃保存
  else {
    ui.showWarning('\n已取消保存');
  }
}

/**
 * 测试配置并询问是否保存（测试失败时）
 *
 * @param config - 待测试配置
 * @param ui - UI 渲染器
 * @return true 表示同意保存
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function testAndConfirmSave(config: UnifiedModelConfig, ui: UIRenderer): Promise<boolean> {
  ui.showInfo('\n正在测试连接...');

  const result = await testModelConfig(
    config.model,
    config.apiKey,
    config.baseUrl,
    config.apiType ?? 'anthropic'
  );
  ui.showTestResult(result);

  // 测试通过：直接保存
  if (result.success) {
    return true;
  }
  // 测试失败：询问用户
  else {
    return confirmStillSave();
  }
}

/**
 * 询问用户测试失败后是否仍保存配置
 *
 * @return 用户选择，默认 false
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function confirmStillSave(): Promise<boolean> {
  const response = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'stillSave',
      message: '测试失败，是否仍保存此配置？',
      default: false,
    },
  ] as any);

  return Boolean(response.stillSave);
}

/**
 * 显示添加成功结果（API Key 截断）
 *
 * @param config - 已保存的配置对象
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function showAddModelResult(config: UnifiedModelConfig, ui: UIRenderer): void {
  ui.showSuccess('\n模型配置已添加:');
  ui.showInfo(`  名称:     ${config.name}`);
  ui.showInfo(`  模型:     ${config.model}`);

  // API Key 脱敏（仅显示前 10 位）
  const truncatedApiKey = config.apiKey.substring(0, 10) + '...';
  ui.showInfo(`  API Key:  ${truncatedApiKey}`);
  ui.showInfo(`  Base URL: ${config.baseUrl}`);
  ui.showInfo(`  API 类型: ${config.apiType ?? 'anthropic'}`);
}
