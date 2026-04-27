/**
 * CLI UI 渲染模块
 * 负责命令列表、工具列表、模型列表等界面渲染
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import * as readline from 'readline';
import chalk from 'chalk';
import { AVAILABLE_COMMANDS } from './commands';
import { UnifiedModelConfig } from '../types';
import { ToolAdapter, registry } from '../adapters';

/**
 * UI 渲染器类
 * 提供各种 CLI 界面渲染功能
 */
export class UIRenderer {
  /**
   * 显示可用命令列表
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  showCommands(): void {
    console.log(chalk.cyan('\n可用命令:\n'));

    // 遍历所有命令并渲染
    AVAILABLE_COMMANDS.forEach(cmd => {
      const paddedName = cmd.name.padEnd(15);
      console.log(`  ${chalk.green(paddedName)} ${chalk.gray(cmd.description)}`);
    });

    console.log('');
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

    // 计算需要清除的行数
    // 首次渲染：标题(2行) + 提示(1行) + 选项(toolNames.length行)
    // 后续渲染：标题(1行) + 选项(toolNames.length行)
    const linesToClear = isFirstRender ? 0 : toolNames.length + 3;

    // 非首次渲染时清除之前的渲染内容
    if (!isFirstRender && linesToClear > 0) {
      readline.moveCursor(process.stdout, 0, -linesToClear);
      readline.clearScreenDown(process.stdout);
    }

    // 首次渲染显示完整提示
    if (isFirstRender) {
      console.log(chalk.cyan('\n选择工具 (↑/↓ 选择，Enter 确认，Esc 取消):\n'));
    } else {
      console.log(chalk.cyan('\n选择工具:\n'));
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
    // 计算需要清除的行数
    const linesToClear = isFirstRender ? 0 : models.length + 3;

    // 非首次渲染时清除之前的渲染内容
    if (!isFirstRender && linesToClear > 0) {
      readline.moveCursor(process.stdout, 0, -linesToClear);
      readline.clearScreenDown(process.stdout);
    }

    // 首次渲染显示完整提示
    if (isFirstRender) {
      console.log(chalk.cyan(`\n选择 ${adapter.displayName} 模型 (↑/↓ 选择，Enter 确认，Esc 取消):\n`));
    } else {
      console.log(chalk.cyan(`\n选择 ${adapter.displayName} 模型:\n`));
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