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

/**
 * ANSI 转义序列常量
 * 直接操作终端，比 readline API 更可靠
 */
const ANSI = {
  /** 清除整行 */
  CLEAR_LINE: '\x1b[2K',
  /** 清除从光标到屏幕底部 */
  CLEAR_DOWN: '\x1b[J',
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
 * 清除指定行数的内容并回到起始位置
 * 使用 ANSI 转义序列直接操作终端
 *
 * @param lines - 要清除的行数
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
function clearLines(lines: number): void {
  // 向上移动指定行数 + 回到行首
  process.stdout.write(ANSI.CURSOR_HOME + ANSI.MOVE_UP(lines));
  // 清除从当前位置到屏幕底部
  process.stdout.write(ANSI.CLEAR_DOWN);
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
      console.log(chalk.cyan('选择命令 (↑/↓ 选择，Enter 确认，Ctrl+C 退出):'));
    } else {
      // 后续渲染：简化标题（2行：空行 + 标题）
      console.log('');
      console.log(chalk.cyan('选择命令:'));
    }

    // 渲染每个命令选项（每个选项占 1 行）
    AVAILABLE_COMMANDS.forEach((cmd, index) => {
      const isSelected = index === currentSelection;

      // 选中项显示箭头和绿色高亮
      if (isSelected) {
        const prefix = chalk.cyan('❯ ');
        const paddedName = chalk.green(cmd.name.padEnd(15));
        const description = chalk.gray(cmd.description);
        console.log(`${prefix}${paddedName} ${description}`);
      }
      // 未选中项显示灰色
      else {
        const prefix = '  ';
        const paddedName = chalk.gray(cmd.name.padEnd(15));
        const description = chalk.gray(cmd.description);
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
      console.log(chalk.cyan('选择工具 (↑/↓ 选择，Enter 确认，Esc 取消):'));
    } else {
      console.log('');
      console.log(chalk.cyan('选择工具:'));
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
   * 渲染模型选择列表
   * 显示指定工具的所有保存模型
   *
   * @param adapter - 工具适配器
   * @param models - 模型配置列表
   * @param currentSelection - 当前选中的索引
   * @param isFirstRender - 是否首次渲染（首次渲染包含提示文字）
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  renderModelList(adapter: ToolAdapter, models: UnifiedModelConfig[], currentSelection: number, isFirstRender: boolean = false): void {
    // 总行数：标题(2行) + 模型(models.length行)
    const totalLines = models.length + 2;

    // 非首次渲染时清除之前的渲染内容
    if (!isFirstRender) {
      clearLines(totalLines);
    }

    // 渲染标题（首次和非首次行数相同）
    if (isFirstRender) {
      console.log('');
      console.log(chalk.cyan(`选择 ${adapter.displayName} 模型 (↑/↓ 选择，Enter 确认，Esc 取消):`));
    } else {
      console.log('');
      console.log(chalk.cyan(`选择 ${adapter.displayName} 模型:`));
    }

    // 渲染每个模型选项
    models.forEach((model, index) => {
      const isSelected = index === currentSelection;
      const displayName = model.name || model.model;

      // 选中项显示箭头和绿色高亮
      if (isSelected) {
        const prefix = chalk.cyan('❯ ');
        const modelName = chalk.green(displayName);
        const providerInfo = model.provider ? chalk.gray(`[${model.provider}]`) : '';
        console.log(`${prefix}${modelName} ${providerInfo}`);
      }
      // 未选中项显示灰色
      else {
        const prefix = '  ';
        const modelName = chalk.gray(displayName);
        const providerInfo = model.provider ? chalk.gray(`[${model.provider}]`) : '';
        console.log(`${prefix}${modelName} ${providerInfo}`);
      }
    });
  }

  /**
   * 显示所有工具的所有模型配置
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  showAllModels(): void {
    const adapters = registry.getAllAdapters();

    console.log(chalk.cyan('\n=== 所有模型配置 ===\n'));

    // 遍历每个工具显示其模型
    adapters.forEach(adapter => {
      const models = adapter.getSavedModels();

      // 无模型配置时显示提示
      if (models.length === 0) {
        console.log(chalk.gray(`[${adapter.displayName}] (无模型配置)`));
      }
      // 有模型时显示列表
      else {
        const modelNames = models.map(m => m.name || m.model).join(', ');
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

    console.log(chalk.cyan('\n=== 当前生效模型 ===\n'));

    // 遍历每个工具显示当前模型
    adapters.forEach(adapter => {
      const currentModel = adapter.readCurrentModel();

      // 有配置时显示当前模型
      if (currentModel) {
        console.log(chalk.green(`[${adapter.displayName}] 当前: ${currentModel.model}`));
      }
      // 无配置时显示未配置
      else {
        console.log(chalk.gray(`[${adapter.displayName}] 当前: (未配置)`));
      }
    });

    console.log('');
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
}