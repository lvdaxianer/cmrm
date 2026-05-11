/**
 * /test 命令处理器
 * 封装两种测试场景：选择已保存模型 / 自定义参数（不保存）
 *
 * 与 cli.ts 主流程的协作关系：
 * - cli.ts 完成 tool 选择后调用 showMenu 决定走向
 * - testSavedModel/testCustom 各自独立执行测试 + 渲染结果
 *
 * 校验逻辑抽离到 test-handler-validators.ts，控制本文件行数
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { UIRenderer } from './ui';
import { ToolAdapter } from '../adapters';
import { ApiType, UnifiedModelConfig } from '../adapters/types';
import { testModelConfigWithRetry, TestResult } from '../utils/tester';
import {
  validateMenuIndex,
  validateModelIndex,
  validateRequired,
} from './test-handler-validators';
import { askApiType } from './api-type-prompt';
import { t } from '../i18n';
import { getPrimaryModelName } from './model-identity';

/**
 * 测试子菜单选项
 * - saved：测试已保存的模型
 * - custom：自定义参数测试（不持久化）
 * - back：返回上一级
 * - exit：直接退出程序
 */
export type TestMenuChoice = 'saved' | 'custom' | 'back' | 'exit';

/** 子菜单选项个数（用于索引校验） */
const MENU_OPTION_COUNT = 4;

/** 空对象键数量 */
const EMPTY_OBJECT_KEY_COUNT = 0;

/** 默认 API 类型 */
const DEFAULT_API_TYPE = 'anthropic';

/** 默认测试超时（毫秒） */
const DEFAULT_TEST_TIMEOUT_MS = 10000;

/** Codex 适配器名称 */
const ADAPTER_NAME_CODEX = 'codex';

/**
 * 测试命令处理器类
 * 负责呈现 /test 子菜单并执行对应测试流程
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export class TestHandler {
  /** UI 渲染器 */
  private ui: UIRenderer;

  /** 当前选中的工具适配器（用于读取已保存模型） */
  private adapter: ToolAdapter;

  /**
   * 构造函数
   *
   * @param ui - UI 渲染器实例
   * @param adapter - 工具适配器实例（已选择具体工具）
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  constructor(ui: UIRenderer, adapter: ToolAdapter) {
    this.ui = ui;
    this.adapter = adapter;
  }

  /**
   * 显示测试子菜单
   * 让用户选择已保存模型测试 / 自定义测试 / 返回 / 退出
   *
   * @return 用户选择项
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  async showMenu(): Promise<TestMenuChoice> {
    // 标题与操作提示
    console.log(chalk.cyan(`\n=== ${t('test.menuTitle', { tool: this.adapter.displayName })} ===`));
    console.log(chalk.gray(`(${t('tools.selectToolHint')})\n`));

    // 列出每个菜单选项（保持索引与 mapMenuIndex 对应）
    console.log(chalk.gray(`[0] ${t('test.testSaved')}`));
    console.log(chalk.gray(`[1] ${t('test.testCustom')}`));
    console.log(chalk.gray(`[2] ${t('tools.back')}`));
    console.log(chalk.gray(`[3] ${t('tools.exit')}`));

    return this.promptMenuChoice();
  }

  /**
   * 弹出菜单选择 prompt 并解析索引
   *
   * @return 用户选择项
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private async promptMenuChoice(): Promise<TestMenuChoice> {
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'index',
        message: t('tools.enterIndex'),
        validate: (value: string) => validateMenuIndex(value, MENU_OPTION_COUNT),
      },
    ] as any);

    return this.mapMenuIndex(parseInt(response.index, 10));
  }

  /**
   * 将索引映射为菜单选项
   * 0=saved, 1=custom, 2=back, 其他=exit
   *
   * @param index - 用户输入的索引（已通过校验）
   * @return 对应的菜单选项
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private mapMenuIndex(index: number): TestMenuChoice {
    // 0：选择已保存的模型测试
    if (index === 0) {
      return 'saved';
    }
    // 1：自定义参数测试
    else if (index === 1) {
      return 'custom';
    }
    // 2：返回上一级
    else if (index === 2) {
      return 'back';
    }
    // 其他索引（应为 3）：直接退出
    else {
      return 'exit';
    }
  }

  /**
   * 测试已保存模型
   * 列出所有保存的模型，让用户选择后发起测试
   *
   * @return 是否成功完成（false 表示无模型可测）
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  async testSavedModel(): Promise<boolean> {
    const models = this.adapter.getSavedModels();

    // 无模型可测：提示用户先添加配置
    if (models.length === 0) {
      this.ui.showWarning(`\n${this.adapter.displayName} ${t('tools.noModels')}`);
      this.ui.showInfo(t('tools.addModelHint'));
      return false;
    }
    // 已有模型：进入选择流程
    else {
      return this.runSavedModelFlow(models);
    }
  }

  /**
   * 已保存模型测试主流程（在确认存在模型的前提下执行选择 + 测试）
   *
   * @param models - 已保存模型列表（保证非空）
   * @return 始终返回 true（流程已执行完毕）
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private async runSavedModelFlow(models: UnifiedModelConfig[]): Promise<boolean> {
    const selected = await this.promptModelSelection(models);

    // 用户取消选择：跳过测试，但流程算作正常完成
    if (!selected) {
      return true;
    }
    // 已选择模型：发起测试，apiType 兼容旧配置
    else {
      const apiType = selected.apiType ?? DEFAULT_API_TYPE;
      await this.runAndShow(selected.model, selected.apiKey, selected.baseUrl, apiType);
      return true;
    }
  }

  /**
   * 列出已保存模型并让用户选择
   *
   * @param models - 已保存模型列表
   * @return 选中的模型，取消时返回 undefined
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private async promptModelSelection(models: UnifiedModelConfig[]): Promise<UnifiedModelConfig | undefined> {
    const label = this.adapter.name === ADAPTER_NAME_CODEX ? 'Profile' : 'Model';
    console.log(chalk.cyan(`\n=== Select ${label} to Test ===`));
    console.log(chalk.gray(`(${t('tools.selectToolHint')})\n`));

    // 显示每个模型选项（含 apiType 标记 + 工具名后缀便于辨识）
    const toolSuffix = chalk.gray(`(${this.adapter.displayName})`);
    models.forEach((model, index) => {
      const displayName = getPrimaryModelName(model);
      const apiTypeInfo = chalk.gray(`[${model.apiType ?? DEFAULT_API_TYPE}]`);
      console.log(chalk.gray(`[${index}] `) + displayName + ` ${apiTypeInfo} ${toolSuffix}`);
    });
    // 取消选项放在末尾
    console.log(chalk.gray(`[${models.length}] ${t('add.cancel')}`));

    return this.promptIndexAndResolve(models);
  }

  /**
   * 收集索引输入并解析为模型对象
   *
   * @param models - 已保存模型列表
   * @return 选中的模型，取消时返回 undefined
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private async promptIndexAndResolve(models: UnifiedModelConfig[]): Promise<UnifiedModelConfig | undefined> {
    const cancelIndex = models.length;

    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'index',
        message: t('tools.enterIndex'),
        validate: (value: string) => validateModelIndex(value, cancelIndex),
      },
    ] as any);

    const idx = parseInt(response.index, 10);

    // 用户选择取消项
    if (idx === cancelIndex) {
      return undefined;
    }
    // 用户选择具体模型
    else {
      return models[idx];
    }
  }

  /**
   * 自定义参数测试
   * 用户依次选择 API 类型并输入模型/key/URL，发起一次性测试（不保存）
   *
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  async testCustom(): Promise<void> {
    const apiType = await askApiType();
    const params = await this.promptCustomParams();

    // 用户中途取消输入
    if (!params) {
      this.ui.showWarning(t('add.cancel'));
      return;
    }
    // 输入完整：执行测试
    else {
      await this.runAndShow(params.model, params.apiKey, params.baseUrl, apiType);
    }
  }

  /**
   * 询问用户输入自定义测试参数
   *
   * @return 输入的参数，取消时返回 undefined
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private async promptCustomParams(): Promise<{ model: string; apiKey: string; baseUrl: string } | undefined> {
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'model',
        message: t('add.modelName'),
        validate: (value: string) => validateRequired(value, t('add.modelName')),
      },
      {
        type: 'input',
        name: 'apiKey',
        message: t('add.apiKey'),
        validate: (value: string) => validateRequired(value, t('add.apiKey')),
      },
      {
        type: 'input',
        name: 'baseUrl',
        message: t('add.baseUrl'),
        validate: (value: string) => validateRequired(value, t('add.baseUrl')),
      },
    ] as any);

    // 用户中断输入（如 Ctrl+C），response 为空对象
    if (Object.keys(response).length === EMPTY_OBJECT_KEY_COUNT) {
      return undefined;
    }
    // 输入完整：构造参数对象
    else {
      return {
        model: response.model.trim(),
        apiKey: response.apiKey.trim(),
        baseUrl: response.baseUrl.trim(),
      };
    }
  }

  /**
   * 执行测试并渲染结果
   *
   * @param model - 模型名称
   * @param apiKey - API 密钥
   * @param baseUrl - 基础 URL
   * @param apiType - API 协议类型
   * @return 测试结果
   * @author lvdaxianerplus
   * @date 2026-05-03
   * @date 2026-05-05 修改：添加重试机制
   */
  private async runAndShow(
    model: string,
    apiKey: string,
    baseUrl: string,
    apiType: ApiType
  ): Promise<TestResult> {
    this.ui.showInfo(`\n${t('add.testing')} [${apiType}] ...`);

    const result = await this.runTestWithRetry(model, apiKey, baseUrl, apiType);
    this.ui.showTestResult(result);
    return result;
  }

  /**
   * 执行带重试的模型测试
   *
   * @param model - 模型名称
   * @param apiKey - API 密钥
   * @param baseUrl - 基础 URL
   * @param apiType - API 协议类型
   * @return 测试结果
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private async runTestWithRetry(
    model: string,
    apiKey: string,
    baseUrl: string,
    apiType: ApiType
  ): Promise<TestResult> {
    const retryCount = this.getRetryCount();

    return testModelConfigWithRetry(
      model,
      apiKey,
      baseUrl,
      apiType,
      DEFAULT_TEST_TIMEOUT_MS,
      retryCount,
      (currentRetry, maxRetries) => this.onRetry(currentRetry, maxRetries)
    );
  }

  /**
   * 重试回调处理
   *
   * @param currentRetry - 当前重试次数
   * @param maxRetries - 最大重试次数
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private onRetry(currentRetry: number, maxRetries: number): void {
    const retryMsg = t('test.retrying', { current: currentRetry, max: maxRetries });
    this.ui.showInfo(chalk.yellow(`\n${retryMsg}`));
  }

  /**
   * 从配置获取重试次数
   *
   * @return 重试次数，默认3
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  private getRetryCount(): number {
    return this.adapter.getRetryCount();
  }
}
