/**
 * 工具选择器模块
 * 抽离自 cli.ts 的 showToolSelection 方法，专注于工具选择交互
 *
 * 与 model-picker 一致地使用 Union Type 表达结果，
 * 让调用方根据 kind 字段决定后续动作而非依赖回调
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import * as readline from 'readline';
import { registry, ToolAdapter } from '../adapters';
import { prepareForInquirer, validateIndexInput } from './readline-helper';
import { t } from '../i18n';

/** 默认进制基数 */
const DEFAULT_RADIX = 10;

/** 返回选项偏移量 */
const BACK_INDEX_OFFSET = 1;

/** 退出选项偏移量 */
const EXIT_INDEX_OFFSET = 2;

/**
 * 工具选择结果
 * - select：用户选中具体工具
 * - back：返回上一级（命令选择）
 * - exit：直接退出程序
 */
export type ToolPickResult =
  | { kind: 'select'; adapter: ToolAdapter }
  | { kind: 'back' }
  | { kind: 'exit' };

/**
 * 显示工具选择菜单并返回用户选择结果
 *
 * @param rl - 当前活跃的 readline 接口
 * @return 工具选择结果
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function selectTool(rl: readline.Interface): Promise<ToolPickResult> {
  prepareForInquirer(rl);

  const toolNames = registry.getToolNames();
  const totalOptions = toolNames.length + EXIT_INDEX_OFFSET;
  const backIndex = toolNames.length;
  const exitIndex = toolNames.length + 1;

  // 渲染菜单
  renderMenu(toolNames, backIndex, exitIndex);

  // 收集索引输入
  const selectedIndex = await promptIndex(totalOptions);

  // 解析为结果对象
  return resolveResult(selectedIndex, backIndex, exitIndex, toolNames);
}

/**
 * 渲染工具选择菜单
 *
 * @param toolNames - 已注册的工具名称
 * @param backIndex - 返回选项索引
 * @param exitIndex - 退出选项索引
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function renderMenu(toolNames: string[], backIndex: number, exitIndex: number): void {
  console.log(chalk.cyan('\n=== ' + t('tools.selectTool') + ' ==='));
  console.log(chalk.gray('(' + t('tools.selectToolHint') + ')\n'));

  // 工具行
  toolNames.forEach((toolName, index) => {
    const adapter = registry.getAdapter(toolName);
    console.log(chalk.gray(`[${index}] `) + adapter.displayName);
  });

  // 控制选项行
  console.log(chalk.gray(`[${backIndex}] ` + t('tools.back')));
  console.log(chalk.gray(`[${exitIndex}] ` + t('tools.exit')));
}

/**
 * 收集用户输入的索引
 *
 * @param totalOptions - 选项总数（含返回/退出）
 * @return 解析后的整数索引
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function promptIndex(totalOptions: number): Promise<number> {
  const response = await inquirer.prompt([
    {
      type: 'input',
      name: 'index',
      message: t('tools.enterToolIndex'),
      validate: (value: string) => validateIndexInput(value, totalOptions),
    },
  ] as any);

  return parseInt(response.index, DEFAULT_RADIX);
}

/**
 * 将索引映射为结果对象
 *
 * @param index - 用户选中的索引
 * @param backIndex - 返回索引
 * @param exitIndex - 退出索引
 * @param toolNames - 工具名称列表
 * @return 结构化结果
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function resolveResult(
  index: number,
  backIndex: number,
  exitIndex: number,
  toolNames: string[]
): ToolPickResult {
  // 返回上一级
  if (index === backIndex) {
    return { kind: 'back' };
  }
  // 直接退出
  else if (index === exitIndex) {
    return { kind: 'exit' };
  }
  // 选中工具
  else {
    const adapter = registry.getAdapter(toolNames[index]);
    return { kind: 'select', adapter };
  }
}
