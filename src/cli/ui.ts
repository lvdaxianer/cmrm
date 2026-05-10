/**
 * CLI UI 渲染模块
 * 负责命令列表、工具列表、模型列表等界面渲染
 * 使用 ANSI 转义序列直接操作终端，避免 readline API 在 raw mode 下的不稳定性
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import chalk from 'chalk';
import { AVAILABLE_COMMANDS } from './commands';
import { UnifiedModelConfig } from '../types';
import { ToolAdapter, registry } from '../adapters';
import { TestResult } from '../utils/tester';
import { t } from '../i18n';
import { getCodexProfileName, getPrimaryModelName } from './model-identity';

function getEntityLabel(adapter: ToolAdapter): string {
  return adapter.name === 'codex' ? 'Profile' : 'Model';
}

/**
 * ANSI 转义序列常量
 * 直接操作终端，比 readline API 更可靠
 */
const ANSI = {
  /** 清除整屏 */
  CLEAR_SCREEN: '\x1b[2J',
  /** 清除整行 */
  CLEAR_LINE: '\x1b[2K',
  /** 回到左上角 */
  HOME: '\x1b[H',
  /** 向上移动 N 行 */
  MOVE_UP: (n: number) => `\x1b[${n}A`,
  /** 向下移动 N 行 */
  MOVE_DOWN: (n: number) => `\x1b[${n}B`,
  /** 回到行首 */
  CURSOR_HOME: '\r',
  /** 隐藏光标 */
  HIDE_CURSOR: '\x1b[?25l',
  /** 显示光标 */
  SHOW_CURSOR: '\x1b[?25h',
};

/**
 * 清除指定行数
 * 使用 ANSI 转义序列向上移动并清除每一行
 *
 * @param count - 要清除的行数
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
function clearLines(count: number): void {
  for (let i = 0; i < count; i++) {
    process.stdout.write(ANSI.CURSOR_HOME);
    process.stdout.write(ANSI.CLEAR_LINE);
    if (i < count - 1) {
      process.stdout.write(ANSI.MOVE_UP(1));
    }
  }
  process.stdout.write(ANSI.MOVE_UP(count));
}

/**
 * UI 渲染器类
 * 提供各种 CLI 界面渲染功能
 */
export class UIRenderer {
  /**
   * 渲染命令选择列表
   * 使用 ANSI 转义序列清除并重新渲染
   * 注意：首次渲染和非首次渲染的行数计算要精确匹配
   *
   * @param currentSelection - 当前选中的索引
   * @param isFirstRender - 是否首次渲染
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  renderCommandList(currentSelection: number, isFirstRender: boolean = false): void {
    // 首次渲染的行数：标题(2行) + 选项(5行) = 7行
    // 后续渲染的行数：标题(1行) + 空行(1行) + 选项(5行) = 7行
    // 两者相同，所以清除行数固定为 7
    const totalLines = AVAILABLE_COMMANDS.length + 2;

    // 非首次渲染时清除之前的渲染内容
    if (!isFirstRender) {
      clearLines(totalLines);
    }

    // 渲染标题（首次和非首次标题不同，但行数相同）
    if (isFirstRender) {
      // 首次渲染：显示完整提示（2行：空行 + 标题）
      console.log('');
      console.log(chalk.cyan(t('ui.selectCommandFull')));
    } else {
      // 后续渲染：简化标题（2行：空行 + 标题）
      console.log('');
      console.log(chalk.cyan(t('ui.selectCommand')));
    }

    // 渲染每个命令选项（每个选项占 1 行）
    AVAILABLE_COMMANDS.forEach((cmd, index) => {
      const isSelected = index === currentSelection;
      const translatedDesc = t(cmd.descriptionKey);

      // 选中项显示箭头和绿色高亮
      if (isSelected) {
        const prefix = chalk.cyan('❯ ');
        const paddedName = chalk.green(cmd.name.padEnd(15));
        const description = chalk.gray(translatedDesc);
        console.log(`${prefix}${paddedName} ${description}`);
      }
      // 未选中项显示灰色
      else {
        const prefix = '  ';
        const paddedName = chalk.gray(cmd.name.padEnd(15));
        const description = chalk.gray(translatedDesc);
        console.log(`${prefix}${paddedName} ${description}`);
      }
    });
  }

  /**
   * 渲染工具选择列表
   * 显示所有注册的工具供用户选择
   *
   * @param currentSelection - 当前选中的索引
   * @param isFirstRender - 是否首次渲染（首次渲染包含提示文字）
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  renderToolList(currentSelection: number, isFirstRender: boolean = false): void {
    const toolNames = registry.getToolNames();

    // 总行数：标题(2行) + 选项(toolNames.length行)
    const totalLines = toolNames.length + 2;

    // 非首次渲染时清除之前的渲染内容
    if (!isFirstRender) {
      clearLines(totalLines);
    }

    // 渲染标题（首次和非首次行数相同）
    if (isFirstRender) {
      console.log('');
      console.log(chalk.cyan(t('ui.selectToolFull')));
    } else {
      console.log('');
      console.log(chalk.cyan(t('ui.selectTool')));
    }

    // 渲染每个工具选项
    toolNames.forEach((toolName, index) => {
      const adapter = registry.getAdapter(toolName);
      const isSelected = index === currentSelection;

      // 选中项显示箭头和绿色高亮
      if (isSelected) {
        const prefix = chalk.cyan('❯ ');
        const displayName = chalk.green(adapter.displayName);
        console.log(`${prefix}${displayName}`);
      }
      // 未选中项显示灰色
      else {
        const prefix = '  ';
        const displayName = chalk.gray(adapter.displayName);
        console.log(`${prefix}${displayName}`);
      }
    });
  }

  /**
   * 渲染模型选择列表（索引方式）
   * 显示指定工具的所有保存模型，每个选项带索引编号
   *
   * @param adapter - 工具适配器
   * @param models - 模型配置列表
   * @param currentSelection - 当前选中的索引（用于高亮）
   * @param isFirstRender - 是否首次渲染（首次渲染包含提示文字）
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  renderModelList(adapter: ToolAdapter, models: UnifiedModelConfig[], currentSelection: number, isFirstRender: boolean = false): void {
    // 渲染标题
    if (isFirstRender) {
      console.log(chalk.cyan(`\n=== Select ${adapter.displayName} ${getEntityLabel(adapter)} ===`));
      console.log(chalk.gray(`(${t('ui.selectModelHint')})\n`));
    }

    // 渲染每个模型选项
    models.forEach((model, index) => {
      const displayName = getPrimaryModelName(model);
      const providerInfo = this.shouldShowProviderBadge(model, displayName)
        ? chalk.gray(`[${model.provider}]`)
        : '';

      // 选中项高亮显示
      if (index === currentSelection) {
        console.log(chalk.green(`[${index}] `) + chalk.bold(displayName) + ` ${providerInfo}`);
      }
      // 未选中项灰色显示
      else {
        console.log(chalk.gray(`[${index}] `) + displayName + ` ${providerInfo}`);
      }
    });

    // 显示提示
    if (isFirstRender) {
      console.log(chalk.gray(`\n${t('ui.enterIndex')}:`));
    }
  }

  /**
   * 判断是否需要额外显示 provider 徽标
   * 当主显示名已是 provider/model 时，不重复显示 [provider]
   *
   * @param model - 模型配置
   * @param displayName - 当前主显示名
   * @return 需要显示返回 true
   * @author lvdaxianerplus
   * @date 2026-05-10
   */
  private shouldShowProviderBadge(model: UnifiedModelConfig, displayName: string): boolean {
    return !!model.provider && !displayName.startsWith(`${model.provider}/`);
  }

  /**
   * 显示所有工具的所有模型配置
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  showAllModels(): void {
    const adapters = registry.getAllAdapters();

    console.log(chalk.cyan(`\n=== ${t('ui.allModels')} ===\n`));

    // 遍历每个工具显示其模型
    adapters.forEach(adapter => {
      const models = adapter.getSavedModels();

      // 无模型配置时显示提示
      if (models.length === 0) {
        console.log(chalk.gray(`[${adapter.displayName}] ${t('ui.noModels')}`));
      }
      // 有模型时显示列表
      else {
        const modelNames = models.map(m => getPrimaryModelName(m)).join(', ');
        console.log(chalk.green(`[${adapter.displayName}] ${modelNames}`));
      }
    });

    console.log('');
  }

  /**
   * 显示所有工具的当前生效模型
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  showCurrentModels(): void {
    const adapters = registry.getAllAdapters();

    console.log(chalk.cyan(`\n=== ${t('ui.currentModels')} ===\n`));

    // 遍历每个工具显示当前模型
    adapters.forEach(adapter => {
      const currentModel = adapter.readCurrentModel();

      // 有配置时显示当前模型
      if (currentModel) {
        this.showCurrentModel(adapter, currentModel);
      }
      // 无配置时显示未配置
      else {
        console.log(chalk.gray(`[${adapter.displayName}] ${t('ui.current')}: ${t('ui.notConfigured')}`));
      }
    });

    console.log('');
  }

  private showCurrentModel(adapter: ToolAdapter, currentModel: UnifiedModelConfig): void {
    if (adapter.name === 'codex' && currentModel.provider) {
      this.showCurrentCodexModel(adapter, currentModel);
    }
    else {
      const currentDisplay = currentModel.provider
        ? getCodexProfileName(currentModel)
        : currentModel.model;
      console.log(chalk.green(`[${adapter.displayName}] ${t('ui.current')}: ${currentDisplay}`));
    }
  }

  private showCurrentCodexModel(adapter: ToolAdapter, currentModel: UnifiedModelConfig): void {
    const runtimeDisplay = getCodexProfileName(currentModel);
    const savedProfile = this.findMatchingSavedCodexProfile(adapter, currentModel);

    console.log(
      chalk.green(`[${adapter.displayName}] ${t('ui.current')}: ${runtimeDisplay}`) +
      chalk.gray(` (${t('ui.runtimeLabel')}: ${currentModel.baseUrl})`)
    );

    if (savedProfile && getPrimaryModelName(savedProfile) !== runtimeDisplay) {
      console.log(chalk.gray(`  ${t('ui.savedLabel')}: ${getPrimaryModelName(savedProfile)}`));
    }
  }

  private findMatchingSavedCodexProfile(
    adapter: ToolAdapter,
    currentModel: UnifiedModelConfig
  ): UnifiedModelConfig | null {
    const models = adapter.getSavedModels();
    const exactMatch = models.find(model =>
      model.model === currentModel.model &&
      model.baseUrl === currentModel.baseUrl
    );

    if (exactMatch) {
      return exactMatch;
    }

    const modelOnlyMatch = models.find(model => model.model === currentModel.model);
    return modelOnlyMatch || null;
  }

  /**
   * 显示错误消息
   *
   * @param message - 错误消息内容
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  showError(message: string): void {
    console.log(chalk.red(message));
  }

  /**
   * 显示成功消息
   *
   * @param message - 成功消息内容
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  showSuccess(message: string): void {
    console.log(chalk.green(message));
  }

  /**
   * 显示警告消息
   *
   * @param message - 警告消息内容
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  showWarning(message: string): void {
    console.log(chalk.yellow(message));
  }

  /**
   * 显示信息消息（灰色）
   *
   * @param message - 信息消息内容
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  showInfo(message: string): void {
    console.log(chalk.gray(message));
  }

  /**
   * 显示模型测试结果
   * 成功时绿色显示通过，失败时红色显示错误类型
   *
   * @param result - 测试结果对象
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  showTestResult(result: TestResult): void {
    const detail = this.buildTestDetail(result);
    const symbol = result.success ? chalk.green('✓ ') : chalk.red('✗ ');
    const colored = result.success ? chalk.green(result.message) : chalk.red(result.message);
    console.log(symbol + colored + ' ' + chalk.gray(detail));

    // 失败且包含详情时附加输出，否则不输出额外行
    if (!result.success && result.errorDetail) {
      console.log(chalk.gray(`  ${t('ui.detail')}: ${result.errorDetail}`));
    }
    // 无详情或测试通过：保持 UI 简洁
    else {
      // 不输出额外行
    }
  }

  /**
   * 构建测试结果详情字符串（耗时 + 状态码）
   *
   * @param result - 测试结果
   * @return 灰色详情文本
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private buildTestDetail(result: TestResult): string {
    const parts: string[] = [`${result.durationMs}ms`];

    // 有 HTTP 状态码时附加（网络异常没有状态码）
    if (result.statusCode !== undefined) {
      parts.push(`HTTP ${result.statusCode}`);
    }
    // 无状态码：仅展示耗时
    else {
      // 不附加 HTTP 段
    }

    return `(${parts.join(', ')})`;
  }
}
