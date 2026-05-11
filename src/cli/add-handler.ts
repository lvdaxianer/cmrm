/**
 * /add 命令处理器
 * 抽离自 cli.ts 的 handleAddModel 流程，包含交互输入、配置验证、测试连通性、保存确认
 *
 * 流程：选择添加方式(模板/自定义) → 收集输入 → 验证 → 测试连通性 → 保存
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
import { prepareForInquirer } from './readline-helper';
import { buildAddModelQuestions, buildModelConfig } from './add-questions';
import { askApiType } from './api-type-prompt';
import { printIndexMenu, askIndex } from './index-prompt';
import { templateManager } from './template-manager';
import { selectTemplateAndSave } from './template-add-handler';
import { t } from '../i18n';
import { validateConfigIdentity, testThenSave } from './add-flow-helpers';

/** Codex 适配器名称 */
const ADAPTER_NAME_CODEX = 'codex';

/** 空对象键数量 */
const EMPTY_OBJECT_KEY_COUNT = 0;

/** 默认 OpenAI API 类型 */
const DEFAULT_OPENAI_API_TYPE = 'openai';

/**
 * 添加方式选项
 * 使用 i18n key 而非已翻译文本,避免模块加载时 i18n 未初始化导致返回 raw key
 */
interface AddMethodOption {
  /** 选项标识 */
  value: 'template' | 'custom';
  /** 显示文本 i18n key */
  labelKey: string;
  /** 选项描述 i18n key */
  descriptionKey: string;
}

/** 添加方式选项列表(运行时再调用 t() 解析) */
const ADD_METHOD_OPTIONS: AddMethodOption[] = [
  { value: 'template', labelKey: 'add.templateAdd', descriptionKey: 'add.templateDesc' },
  { value: 'custom', labelKey: 'add.customAdd', descriptionKey: 'add.customDesc' },
];

/**
 * 执行 /add 主流程
 * 选择添加方式 → 收集用户输入 → 验证 → 测试连通性 → 决定是否保存
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

  console.log(chalk.cyan(`\n=== ${t('add.title', { tool: adapter.displayName })} ===\n`));

  try {
    await runAddFlowCore(adapter, ui);
  }
  // 添加流程异常：友好提示错误信息
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ui.showError(t('alias.addFailed') + `: ${message}`);
  }
}

/**
 * /add 主流程核心逻辑
 *
 * @param adapter - 已选中的工具适配器
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
async function runAddFlowCore(adapter: ToolAdapter, ui: UIRenderer): Promise<void> {
  // Codex 工具没有预设模板，直接走自定义添加
  if (adapter.name === ADAPTER_NAME_CODEX) {
    console.log(chalk.gray(t('add.hintOptional') + '\n'));
    await collectAndSave(adapter, ui);
  }
  // Claude 工具：先选择添加方式(模板/自定义)
  else {
    const method = await askAddMethod();

    // 用户取消选择
    if (!method) {
      ui.showWarning('\n' + t('add.cancel'));
    }
    // 用户选择了添加方式：分发到对应子流程
    else {
      await dispatchAddMethod(method, adapter, ui);
    }
  }
}

/**
 * 询问添加方式
 * 显示模板添加与自定义添加的索引菜单
 *
 * @return 'template' | 'custom' | undefined（取消）
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function askAddMethod(): Promise<'template' | 'custom' | undefined> {
  // 打印添加方式选择菜单(运行时解析 i18n key)
  printIndexMenu(t('add.selectMethod'), ADD_METHOD_OPTIONS, (opt) => {
    const desc = chalk.gray(`(${t(opt.descriptionKey)})`);
    return t(opt.labelKey) + ` ${desc}`;
  });

  // 提示用户输入索引并校验范围
  const idx = await askIndex(
    t('add.enterMethodIndex', { count: ADD_METHOD_OPTIONS.length }),
    ADD_METHOD_OPTIONS.length
  );

  // 用户取消或输入无效
  if (idx == null) {
    return undefined;
  }
  // 返回对应选项的值
  else {
    return ADD_METHOD_OPTIONS[idx - 1]?.value || undefined;
  }
}

/**
 * 根据用户选择的添加方式分发到对应子流程
 *
 * @param method - 用户选择的添加方式
 * @param adapter - 工具适配器
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
async function dispatchAddMethod(
  method: 'template' | 'custom',
  adapter: ToolAdapter,
  ui: UIRenderer
): Promise<void> {
  // 基于模板添加：先检查模板可用性
  if (method === 'template') {
    await runTemplateAddFlow(adapter, ui);
  }
  // 自定义添加：进入手动输入流程
  else {
    console.log(chalk.gray(t('add.hintOptional') + '\n'));
    await collectAndSave(adapter, ui);
  }
}

/**
 * 执行模板添加子流程
 * 热加载模板列表，无模板时降级到自定义添加
 *
 * @param adapter - 工具适配器
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
async function runTemplateAddFlow(adapter: ToolAdapter, ui: UIRenderer): Promise<void> {
  // 热加载模板列表（每次重新读取文件）
  const templates = templateManager.getTemplates();

  // 无可用模板：降级到自定义添加
  if (templates.length === 0) {
    ui.showWarning(t('add.noTemplates'));
    console.log(chalk.gray(t('add.hintOptional') + '\n'));
    await collectAndSave(adapter, ui);
  }
  // 有可用模板：进入模板选择流程
  else {
    const response = await selectTemplateAndSave(adapter, ui, templates);

    // 用户取消模板选择或配置输入
    if (response === undefined) {
      ui.showWarning('\n' + t('add.cancel'));
    }
    // 收集完成：进入验证保存流程
    else {
      await validateAndPersist(adapter, ui, response);
    }
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
  // Codex 固定使用 OpenAI 格式，跳过选择
  const apiType = adapter.name === ADAPTER_NAME_CODEX ? DEFAULT_OPENAI_API_TYPE : await askApiType();
  // 收集其他字段
  const response = await inquirer.prompt(buildAddModelQuestions(adapter.name) as any);

  // 用户取消（Ctrl+C 等）
  if (Object.keys(response).length === EMPTY_OBJECT_KEY_COUNT) {
    ui.showWarning('\n' + t('add.cancel'));
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
  // 将 inquirer 响应组装为标准配置对象
  const config = buildModelConfig(adapter.name, response);

  // 验证失败：终止流程，提示用户检查必填字段
  if (!adapter.validateConfig(config)) {
    ui.showError('\n' + t('add.validateFailed'));
  }
  // 标识与别名校验失败
  else if (!validateConfigIdentity(config, ui)) {
    return;
  }
  // 验证通过：测试连通性后决定是否保存
  else {
    await testThenSave(adapter, ui, config);
  }
}
