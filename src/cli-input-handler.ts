/**
 * CLI 输入处理模块
 * 负责处理用户输入、特殊命令和未知命令
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import { AVAILABLE_COMMANDS } from './cli/commands';
import { UIRenderer } from './cli/ui';
import {
  showCommandSuggestions,
  handleUnknownCommand,
} from './cli/fuzzy-match';
import {
  NextOperation,
  OrchestratorContext,
  showToolSelection,
} from './cli/operation-orchestrator';
import { handleSetLang } from './i18n/commands/set-lang';
import { I18nManager } from './i18n';

/** 命令前缀字符 */
const COMMAND_PREFIX = '/';
/** 退出命令列表 */
const EXIT_COMMANDS = ['/exit', '/quit', '/q'];

/**
 * CLI 输入处理器类
 * 封装所有输入处理逻辑
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export class CliInputHandler {
  /**
   * 构造函数
   *
   * @param uiRenderer - UI 渲染器
   * @param i18n - i18n 管理器
   * @param buildContext - 构建编排层上下文的函数
   * @param showCommandSelection - 显示命令选择菜单的函数
   * @param exitProgram - 退出程序的函数
   * @param recreateReadline - 重新创建 readline 接口的函数
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  constructor(
    private readonly uiRenderer: UIRenderer,
    private readonly i18n: I18nManager,
    private readonly buildContext: () => OrchestratorContext,
    private readonly showCommandSelection: () => Promise<void>,
    private readonly exitProgram: () => void,
    private readonly recreateReadline: () => void,
  ) {}

  /**
   * 路由用户输入到对应的子流程
   *
   * @param input - 用户输入
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  async handleInput(input: string): Promise<void> {
    // 条件: 工具选择类命令，交由编排层处理
    if (this.isToolSelectionCommand(input)) {
      await this.handleToolSelectionCommand(input);
      return;
    }

    const isHandled = await this.handleSpecialCommand(input);
    // 条件: 未被特殊命令处理，视为未知输入
    if (!isHandled) {
      await this.handleUnknownInput(input);
    }
    // 替代: 已被处理，无需额外操作
    else {
      // 命令已处理
    }
  }

  /**
   * 处理工具选择类命令
   *
   * @param input - 用户输入
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private async handleToolSelectionCommand(input: string): Promise<void> {
    const op = input.slice(1) as NextOperation;
    await showToolSelection(this.buildContext(), op);
  }

  /**
   * 处理列表展示类命令
   *
   * @param showAll - 是否展示所有模型（true 为 /list，false 为 /current）
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  async handleListCommand(showAll: boolean): Promise<void> {
    // 条件: 展示所有模型列表
    if (showAll) {
      this.uiRenderer.showAllModels();
    }
    // 替代: 仅展示当前模型
    else {
      this.uiRenderer.showCurrentModels();
    }
    await this.showCommandSelection();
  }

  /**
   * 处理未知命令输入
   *
   * @param input - 用户输入
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private async handleUnknownInput(input: string): Promise<void> {
    // 条件: 输入以命令前缀开头但不是已知命令，展示补全建议
    if (input.startsWith(COMMAND_PREFIX) && !this.isKnownCommand(input)) {
      showCommandSuggestions(input, (msg) => this.uiRenderer.showError(msg));
    }
    // 替代: 其他未知输入，输出未知命令提示
    else {
      this.printUnknownCommand(input);
    }
    await this.showCommandSelection();
  }

  /**
   * 处理特殊命令（非工具选择类）
   *
   * @param input - 用户输入
   * @returns 是否已处理
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private async handleSpecialCommand(input: string): Promise<boolean> {
    // 条件: /list 命令，展示所有模型
    if (input === '/list') {
      await this.handleListCommand(true);
      return true;
    }
    // 条件: /current 命令，展示当前模型
    else if (input === '/current') {
      await this.handleListCommand(false);
      return true;
    }
    // 条件: /set-lang 命令，设置语言
    else if (input === '/set-lang') {
      await handleSetLang(this.i18n);
      await this.showCommandSelection();
      return true;
    }
    // 条件: 退出命令，结束程序
    else if (this.isExitCommand(input)) {
      this.exitProgram();
      return true;
    }
    // 条件: 空输入，返回菜单
    else if (input === COMMAND_PREFIX || input === '') {
      await this.showCommandSelection();
      return true;
    }
    // 替代: 非特殊命令，未处理
    else {
      return false;
    }
  }

  /**
   * 判断输入是否为需要选择工具的命令
   *
   * @param input - 用户输入
   * @return true 表示需要走工具选择流程
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private isToolSelectionCommand(input: string): boolean {
    return ['/switch', '/add', '/remove', '/info', '/test', '/alias'].includes(input);
  }

  /**
   * 判断输入是否为退出命令
   *
   * @param input - 用户输入
   * @return true 表示是退出命令
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private isExitCommand(input: string): boolean {
    return EXIT_COMMANDS.includes(input);
  }

  /**
   * 判断输入是否为已注册命令
   *
   * @param input - 用户输入
   * @return true 表示完全匹配
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private isKnownCommand(input: string): boolean {
    return AVAILABLE_COMMANDS.some(cmd => cmd.name === input);
  }

  /**
   * 输出未知命令提示
   *
   * @param input - 用户输入
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private printUnknownCommand(input: string): void {
    handleUnknownCommand(
      input,
      (msg) => this.uiRenderer.showError(msg),
      (msg) => this.uiRenderer.showWarning(msg),
      (msg) => this.uiRenderer.showInfo(msg),
    );
  }
}
