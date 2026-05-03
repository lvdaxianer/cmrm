/**
 * 通用模型选择器
 * 抽离自 cli.ts 中三处高度重复的模型选择菜单（switch / remove / info），
 * 通过参数化标题与提示语统一控制流，遵循 code-review-spec 3.11 重复代码规范
 *
 * 选择结果以 Union Type 表达，避免回调地狱：
 * - select：用户选中具体模型
 * - back：返回上一级
 * - exit：直接退出程序
 * - empty：无任何已保存模型
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import * as readline from 'readline';
import { ToolAdapter } from '../adapters';
import { UnifiedModelConfig } from '../types';
import { prepareForInquirer, validateIndexInput } from './readline-helper';

/**
 * 模型选择结果（Union Type）
 * 由调用方根据 kind 字段分支处理
 */
export type ModelPickResult =
  | { kind: 'select'; model: UnifiedModelConfig }
  | { kind: 'back' }
  | { kind: 'exit' }
  | { kind: 'empty' };

/**
 * 模型选择器配置项
 * 通过对象传参规避函数参数 ≥ 4 个的限制（code-review-spec 3.10）
 */
export interface ModelPickerOptions {
  /** 标题文本（如 "选择 Claude 模型"） */
  title: string;
  /** 输入提示语（如 "请输入索引号:"） */
  prompt: string;
  /** 操作提示（如 "(输入索引号按 Enter 确认)"） */
  hint: string;
}

/**
 * 提示用户从已保存模型中选择一个
 * 自动处理 readline → inquirer 的状态切换
 *
 * @param adapter - 已选中的工具适配器
 * @param rl - 当前活跃的 readline 接口
 * @param options - 标题/提示文案配置
 * @return 选择结果（select/back/exit/empty）
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function pickModel(
  adapter: ToolAdapter,
  rl: readline.Interface,
  options: ModelPickerOptions
): Promise<ModelPickResult> {
  const models = adapter.getSavedModels();

  // 无任何模型：返回 empty 让调用方决定提示语
  if (models.length === 0) {
    return { kind: 'empty' };
  }
  // 有模型：进入索引选择流程
  else {
    return runIndexSelection(rl, models, options);
  }
}

/**
 * 执行索引选择主流程
 * 切换 stdin 状态、渲染列表、读取索引、解析为 ModelPickResult
 *
 * @param rl - 当前 readline 接口
 * @param models - 已保存模型列表
 * @param options - 选择器配置
 * @return 选择结果
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function runIndexSelection(
  rl: readline.Interface,
  models: UnifiedModelConfig[],
  options: ModelPickerOptions
): Promise<ModelPickResult> {
  // 准备 inquirer：关闭 readline、退出 raw mode
  prepareForInquirer(rl);

  const totalOptions = models.length + 2;
  const backIndex = models.length;
  const exitIndex = models.length + 1;

  // 渲染菜单（标题+模型列表+返回/退出选项）
  renderMenu(models, options, backIndex, exitIndex);

  // 收集用户输入
  const selectedIndex = await promptIndex(options.prompt, totalOptions);

  // 转换索引为结果对象
  return resolveResult(selectedIndex, backIndex, exitIndex, models);
}

/**
 * 渲染模型选择菜单
 *
 * @param models - 已保存模型列表
 * @param options - 选择器配置
 * @param backIndex - 返回选项的索引
 * @param exitIndex - 退出选项的索引
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function renderMenu(
  models: UnifiedModelConfig[],
  options: ModelPickerOptions,
  backIndex: number,
  exitIndex: number
): void {
  console.log(chalk.cyan(`\n=== ${options.title} ===`));
  console.log(chalk.gray(`${options.hint}\n`));

  // 模型行
  models.forEach((model, index) => {
    const displayName = model.name || model.model;
    const providerInfo = model.provider ? chalk.gray(`[${model.provider}]`) : '';
    console.log(chalk.gray(`[${index}] `) + displayName + ` ${providerInfo}`);
  });

  // 控制选项行
  console.log(chalk.gray(`[${backIndex}] 返回上一级`));
  console.log(chalk.gray(`[${exitIndex}] 直接退出`));
}

/**
 * 收集用户输入的索引并校验范围
 *
 * @param prompt - inquirer 输入提示语
 * @param totalOptions - 总选项数（含返回/退出）
 * @return 解析后的整数索引
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function promptIndex(prompt: string, totalOptions: number): Promise<number> {
  const response = await inquirer.prompt([
    {
      type: 'input',
      name: 'index',
      message: prompt,
      validate: (value: string) => validateIndexInput(value, totalOptions),
    },
  ] as any);

  return parseInt(response.index, 10);
}

/**
 * 将索引映射为结构化结果
 *
 * @param index - 用户选择的索引
 * @param backIndex - 返回选项的索引
 * @param exitIndex - 退出选项的索引
 * @param models - 已保存模型列表
 * @return 选择结果
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function resolveResult(
  index: number,
  backIndex: number,
  exitIndex: number,
  models: UnifiedModelConfig[]
): ModelPickResult {
  // 返回上一级
  if (index === backIndex) {
    return { kind: 'back' };
  }
  // 退出程序
  else if (index === exitIndex) {
    return { kind: 'exit' };
  }
  // 选中具体模型
  else {
    return { kind: 'select', model: models[index] };
  }
}
