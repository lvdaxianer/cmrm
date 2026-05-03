/**
 * API 类型选择提示
 * 抽离自 test-handler.askApiType / add-questions 中的 list 问题
 * 统一使用「索引输入」交互(1=anthropic, 2=openai),与其他菜单保持一致
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { ApiType } from '../adapters/types';

/** API 类型选项(索引从 1 开始,与用户输入对齐) */
const API_TYPE_OPTIONS: { value: ApiType; description: string }[] = [
  { value: 'anthropic', description: 'Claude Messages 格式' },
  { value: 'openai', description: 'Chat Completions 格式' },
];

/** 默认索引(对应 anthropic) */
const DEFAULT_INDEX = '1';

/**
 * 提示用户选择 API 类型
 * 显示索引菜单,允许直接 Enter 使用默认值(anthropic)
 *
 * @return 用户选中的 API 类型
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function askApiType(): Promise<ApiType> {
  printApiTypeMenu();

  const response = await inquirer.prompt([
    {
      type: 'input',
      name: 'index',
      message: `请输入索引(默认 ${DEFAULT_INDEX}):`,
      default: DEFAULT_INDEX,
      validate: validateApiTypeIndex,
    },
  ] as any);

  const idx = parseInt(String(response.index).trim(), 10);
  return API_TYPE_OPTIONS[idx - 1].value;
}

/**
 * 打印 API 类型菜单
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function printApiTypeMenu(): void {
  console.log(chalk.cyan('\n=== 选择 API 类型 ==='));
  console.log(chalk.gray('(输入索引号按 Enter 确认,默认为 1=anthropic)\n'));

  API_TYPE_OPTIONS.forEach((option, index) => {
    const indexNum = index + 1;
    const desc = chalk.gray(`(${option.description})`);
    console.log(chalk.gray(`[${indexNum}] `) + option.value + ` ${desc}`);
  });
  console.log('');
}

/**
 * 校验索引输入
 * 必须为 [1, API_TYPE_OPTIONS.length] 之间的整数
 *
 * @param value - 用户输入字符串
 * @return 合法返回 true,否则返回错误提示
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function validateApiTypeIndex(value: string): string | true {
  const num = parseInt(String(value).trim(), 10);
  const max = API_TYPE_OPTIONS.length;

  // 输入非法:返回提示语
  if (isNaN(num) || num < 1 || num > max) {
    return `请输入 1-${max} 之间的数字`;
  }
  // 输入合法:放行
  else {
    return true;
  }
}
