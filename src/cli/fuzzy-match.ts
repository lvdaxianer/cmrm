/**
 * 命令模糊匹配模块
 * 抽离自 cli.ts，提供命令名称的相似度匹配与建议显示
 *
 * 设计动机：
 * - cli.ts 主类聚合过多职责（>1300 行），违反 12 节复杂度约束
 * - 编辑距离与命令推荐属于纯函数逻辑，便于单独测试
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import chalk from 'chalk';
import { AVAILABLE_COMMANDS, CommandDefinition } from './commands';
import { t } from '../i18n';

/** Levenshtein 距离阈值（≤ 该值视为相似命令） */
const LEVENSHTEIN_THRESHOLD = 3;

/** 退出命令清单（不区分大小写） */
const EXIT_COMMANDS = ['/exit', '/quit', 'exit', 'quit'];

/** 命令前缀字符 */
const COMMAND_PREFIX = '/';

/** 字符串起始索引 */
const STRING_START_INDEX = 0;

/**
 * 检查输入是否为退出命令
 *
 * @param input - 用户输入
 * @return true 表示用户希望退出
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function isExitCommand(input: string): boolean {
  return EXIT_COMMANDS.includes(input.toLowerCase());
}

/**
 * 计算两个字符串的 Levenshtein 编辑距离
 * 标准动态规划实现，时间复杂度 O(m*n)
 *
 * @param a - 第一个字符串
 * @param b - 第二个字符串
 * @return 编辑距离整数
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix = createMatrix(a, b);
  fillMatrix(matrix, a, b);
  return matrix[b.length][a.length];
}

/**
 * 创建编辑距离矩阵
 * 初始化首行和首列
 *
 * @param a - 源字符串
 * @param b - 目标字符串
 * @return 初始化后的矩阵
 * @author lvdaxianerplus
 * @date 2026-05-05
 */
function createMatrix(a: string, b: string): number[][] {
  const matrix: number[][] = [];

  // 初始化首列
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // 初始化首行
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  return matrix;
}

/**
 * 填充编辑距离矩阵
 *
 * @param matrix - 矩阵引用
 * @param a - 源字符串
 * @param b - 目标字符串
 * @author lvdaxianerplus
 * @date 2026-05-05
 */
function fillMatrix(matrix: number[][], a: string, b: string): void {
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = computeCell(matrix, a, b, i, j);
    }
  }
}

/**
 * 计算编辑距离矩阵单元格的值
 *
 * @param matrix - 当前矩阵
 * @param a - 源字符串
 * @param b - 目标字符串
 * @param i - 行索引
 * @param j - 列索引
 * @return 该单元格的最小代价
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function computeCell(matrix: number[][], a: string, b: string, i: number, j: number): number {
  // 字符相同：从左上角继承
  if (b.charAt(i - 1) === a.charAt(j - 1)) {
    return matrix[i - 1][j - 1];
  }
  // 字符不同：取替换/插入/删除三者最小值 + 1
  else {
    return Math.min(
      matrix[i - 1][j - 1] + 1,
      matrix[i][j - 1] + 1,
      matrix[i - 1][j] + 1
    );
  }
}

/**
 * 查找与输入相似的命令
 * 编辑距离 ≤ 阈值 或 输入是命令的子串均视为相似
 *
 * @param input - 用户输入的命令
 * @return 相似命令列表
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function findSimilarCommands(input: string): CommandDefinition[] {
  const lowerInput = input.toLowerCase();

  return AVAILABLE_COMMANDS.filter(cmd => isSimilar(lowerInput, cmd.name));
}

/**
 * 判断单个命令是否与输入相似
 *
 * @param lowerInput - 已转小写的输入
 * @param cmdName - 命令名称
 * @return true 表示相似
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function isSimilar(lowerInput: string, cmdName: string): boolean {
  const distance = levenshteinDistance(lowerInput, cmdName.toLowerCase());

  // 距离够近
  if (distance <= LEVENSHTEIN_THRESHOLD) {
    return true;
  }
  // 命令以斜杠开头，且包含输入串：作为部分匹配
  else if (lowerInput.startsWith(COMMAND_PREFIX) && cmdName.includes(lowerInput)) {
    return true;
  }
  // 其他情况均不视为相似
  else {
    return false;
  }
}

/**
 * 显示命令补全建议（用户输入了 `/xxx` 但未完整匹配时调用）
 * 找不到任何前缀匹配时输出错误信息并展示完整命令清单
 *
 * @param input - 用户输入的命令前缀
 * @param printError - 错误信息打印函数
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function showCommandSuggestions(input: string, printError: (msg: string) => void): void {
  const matches = AVAILABLE_COMMANDS.filter(cmd => cmd.name.startsWith(input));

  // 无任何前缀匹配：错误提示 + 列出所有命令
  if (matches.length === 0) {
    printError(t('fuzzy.noCommandStartsWith', { input }));
    listCommands(AVAILABLE_COMMANDS, false);
  }
  // 有匹配：列出匹配项
  else {
    listCommands(matches, true);
  }
}

/**
 * 列出命令列表
 *
 * @param commands - 要列出的命令数组
 * @param showHint - 是否显示按 Enter 提示
 * @author lvdaxianerplus
 * @date 2026-05-05
 */
function listCommands(commands: CommandDefinition[], showHint: boolean = false): void {
  console.log(chalk.cyan(`\n${t('fuzzy.availableCommands')}:`));

  commands.forEach(cmd => {
    console.log(chalk.gray(`  ${cmd.name} - ${cmd.description}`));
  });

  // 仅在需要提示时显示
  if (showHint) {
    console.log(chalk.gray(`\n  (${t('fuzzy.pressEnterHint')})`));
  }
  // 不需要提示：保持简洁
  else {
    // 不输出提示行
  }
}

/**
 * 处理未知命令：提示错误并显示相似命令推荐
 *
 * @param input - 用户输入的未知命令
 * @param printError - 错误打印函数
 * @param printWarn - 警告打印函数
 * @param printInfo - 信息打印函数
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function handleUnknownCommand(
  input: string,
  printError: (msg: string) => void,
  printWarn: (msg: string) => void,
  printInfo: (msg: string) => void
): void {
  printError(t('fuzzy.unknownCommand', { input }));

  const suggestions = findSimilarCommands(input);

  // 有相似命令：输出推荐
  if (suggestions.length > 0) {
    printSuggestions(suggestions, printWarn);
  }
  // 无相似命令：列出常用命令
  else {
    printInfo(t('fuzzy.commandListFallback'));
  }
}

/**
 * 打印命令推荐
 *
 * @param suggestions - 相似命令列表
 * @param printWarn - 警告打印函数
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function printSuggestions(suggestions: CommandDefinition[], printWarn: (msg: string) => void): void {
  printWarn(t('fuzzy.didYouMean'));

  suggestions.forEach(cmd => {
    console.log(`  ${chalk.green(cmd.name)} - ${chalk.gray(cmd.description)}`);
  });
}
