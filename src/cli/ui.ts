/**
 * CLI UI 渲染模块
 * 负责命令列表、工具列表、模型列表等界面渲染
 * 使用 ANSI 转义序列直接操作终端，避免 readline API 在 raw mode 下的不稳定性
 *
 * 拆分历史：
 * - 2026-05-11 提取复杂渲染逻辑到 ui-renderers.ts
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import chalk from 'chalk';
import { UnifiedModelConfig } from '../types';
import { ToolAdapter } from '../adapters';
import { TestResult } from '../utils/tester';
import { t } from '../i18n';
import {
  clearLines,
  renderCommandList as renderCommandListFn,
  renderToolList as renderToolListFn,
} from './ui-renderers';
import {
  renderModelList as renderModelListFn,
  showAllModels as showAllModelsFn,
  showCurrentModels as showCurrentModelsFn,
} from './ui-model-renderers';

/**
 * UI 渲染器类
 * 提供各种 CLI 界面渲染功能
 * 核心方法保留在类中，复杂列表渲染委托给 ui-renderers.ts
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export class UIRenderer {
  /**
   * 渲染命令选择列表
   * 委托给 ui-renderers.ts 中的实现
   *
   * @param currentSelection - 当前选中的索引
   * @param isFirstRender - 是否首次渲染
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  renderCommandList(currentSelection: number, isFirstRender: boolean = false): void {
    renderCommandListFn(currentSelection, isFirstRender);
  }

  /**
   * 渲染工具选择列表
   * 委托给 ui-renderers.ts 中的实现
   *
   * @param currentSelection - 当前选中的索引
   * @param isFirstRender - 是否首次渲染（首次渲染包含提示文字）
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  renderToolList(currentSelection: number, isFirstRender: boolean = false): void {
    renderToolListFn(currentSelection, isFirstRender);
  }

  /**
   * 渲染模型选择列表（索引方式）
   * 委托给 ui-renderers.ts 中的实现
   *
   * @param adapter - 工具适配器
   * @param models - 模型配置列表
   * @param currentSelection - 当前选中的索引（用于高亮）
   * @param isFirstRender - 是否首次渲染（首次渲染包含提示文字）
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  renderModelList(adapter: ToolAdapter, models: UnifiedModelConfig[], currentSelection: number, isFirstRender: boolean = false): void {
    renderModelListFn(adapter, models, currentSelection, isFirstRender);
  }

  /**
   * 显示所有工具的所有模型配置
   * 委托给 ui-renderers.ts 中的实现
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  showAllModels(): void {
    showAllModelsFn();
  }

  /**
   * 显示所有工具的当前生效模型
   * 委托给 ui-renderers.ts 中的实现
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  showCurrentModels(): void {
    showCurrentModelsFn();
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

// 重新导出 clearLines，供外部模块使用
export { clearLines };
