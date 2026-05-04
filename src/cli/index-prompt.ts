/**
 * 索引选择通用提示器
 * 提取 askAddMethod 与 askTemplateSelection 的公共逻辑
 * 统一处理"索引菜单打印 + 索引输入校验"
 *
 * @author lvdaxianerplus
 * @date 2026-05-04
 */

import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * 打印索引选择菜单
 * 统一的菜单标题与索引格式，减少重复代码
 *
 * @param title - 菜单标题
 * @param items - 菜单项列表
 * @param getLabel - 获取菜单项显示文本的函数
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
export function printIndexMenu<T>(
  title: string,
  items: T[],
  getLabel: (item: T, index: number) => string
): void {
  // 打印菜单标题
  console.log(chalk.cyan(`\n=== ${title} ===`));
  // 打印操作提示
  console.log(chalk.gray('(输入索引号按 Enter 确认)\n'));

  // 逐条打印菜单项，索引从 1 开始
  items.forEach((item, index) => {
    const idx = index + 1;
    console.log(chalk.gray(`[${idx}] `) + getLabel(item, index));
  });
  console.log('');
}

/**
 * 提示用户输入索引并校验范围
 * 统一处理索引输入的校验逻辑，确保输入为 1~maxIndex 之间的整数
 *
 * @param prompt - 输入提示文本
 * @param maxIndex - 最大有效索引（1-based）
 * @return 用户输入的 1-based 索引，取消或无效返回 null
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
export async function askIndex(prompt: string, maxIndex: number): Promise<number | null> {
  // 构建 inquirer 问题对象
  const response = await inquirer.prompt([
    {
      type: 'input',
      name: 'index',
      message: prompt,
      // 校验输入：必须为 1~maxIndex 之间的整数
      validate: (value: string) => {
        const num = parseInt(String(value).trim(), 10);
        // 非数字或超出范围
        if (isNaN(num) || num < 1 || num > maxIndex) {
          return `请输入 1-${maxIndex} 之间的数字`;
        }
        // 校验通过
        else {
          return true;
        }
      },
    },
  ] as any);

  // 解析并返回用户输入的索引
  const idx = parseInt(String(response.index).trim(), 10);
  // 再次校验（防御性编程）
  if (isNaN(idx) || idx < 1 || idx > maxIndex) {
    return null;
  }
  // 校验通过：返回有效索引
  else {
    return idx;
  }
}
