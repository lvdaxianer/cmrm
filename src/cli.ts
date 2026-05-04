/**
 * CLI 主编排层
 * 负责启动、命令路由与与编排层的衔接
 *
 * 拆分历史：
 * - 2026-04-27 初版聚合实现（>1300 行）
 * - 2026-05-03 第一阶段：拆分为多个子模块（≤350 行）
 * - 2026-05-03 第二阶段：进一步抽离工具/模型操作编排到 operation-orchestrator
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import * as readline from 'readline';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from './config';
import { registry, ClaudeAdapter } from './adapters';
import { AVAILABLE_COMMANDS } from './cli/commands';
import { UIRenderer } from './cli/ui';
import { createReadlineInterface, prepareForInquirer } from './cli/readline-helper';
import {
  isExitCommand,
  showCommandSuggestions,
  handleUnknownCommand,
} from './cli/fuzzy-match';
import {
  NextOperation,
  OrchestratorContext,
  showToolSelection,
} from './cli/operation-orchestrator';
import { bootstrap } from './cli/bootstrap';
import { printShortcutBanner } from './cli/shortcut-banner';
import { templateManager } from './cli/template-manager';

/**
 * CLI 类
 * 协调命令路由、子菜单切换以及 readline / inquirer 状态切换
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export class CLI {
  /** readline 接口实例（启用命令补全） */
  private rl: readline.Interface;

  /** 配置管理器（settings.json 读写） */
  private configManager: ConfigManager;

  /** UI 渲染器（统一颜色样式） */
  private uiRenderer: UIRenderer;

  /**
   * 构造函数
   * 注册适配器并创建初始 readline 接口
   *
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  constructor() {
    this.configManager = new ConfigManager();
    this.uiRenderer = new UIRenderer();

    registry.register(new ClaudeAdapter());

    this.rl = createReadlineInterface(
      this.completer.bind(this),
      (input) => this.handleInput(input),
    );
  }

  /**
   * 命令补全函数
   * 输入以 '/' 开头时返回所有匹配命令
   *
   * @param input - 用户当前输入
   * @return [matches, original]
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private completer(input: string): [string[], string] {
    const commands = AVAILABLE_COMMANDS.map(cmd => cmd.name);

    // 命令前缀：返回前缀匹配
    if (input.startsWith('/')) {
      return [commands.filter(cmd => cmd.startsWith(input)), input];
    }
    // 非命令：返回全量
    else {
      return [commands, input];
    }
  }

  /**
   * 启动 CLI
   * 初始化配置文件并显示欢迎信息
   *
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  async start(): Promise<void> {
    await this.ensureConfigFile();

    console.log(chalk.cyan('Model Registry Manager (cmrm) - Multi-tool support'));
    console.log(chalk.gray('\n提示：输入命令索引号按 Enter 确认\n'));

    await this.showCommandSelection();
  }

  /**
   * 确保配置文件存在，不存在则初始化
   *
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private async ensureConfigFile(): Promise<void> {
    // 已存在：直接返回
    if (this.configManager.hasSettingsFile()) {
      return;
    }
    // 不存在：尝试初始化
    else {
      this.initializeConfigFile();
    }

    // 确保模板配置文件存在（优先远程拉取，失败则用内置默认）
    const templateInitResult = await templateManager.initializeDefaults();

    // 远程拉取失败：提示用户使用内置模板，并告知如何手动刷新
    if (templateInitResult === 'builtin') {
      const templatesPath = templateManager.getTemplatesPath();

      console.log(chalk.yellow('\n模板远程拉取失败，已使用内置默认模板。'));
      console.log(chalk.gray(`如需更新到最新模板，请检查网络后删除 ${templatesPath} 重新启动。`));
      console.log(chalk.gray(`或手动编辑该文件添加自定义模型模板。`));
    }
    // 远程拉取成功或本地已存在：静默处理，无需额外提示
    else {
      // 不输出任何提示，避免干扰用户正常操作流程
    }
  }

  /**
   * 初始化配置文件并提示用户编辑
   *
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private initializeConfigFile(): void {
    console.log(chalk.yellow('Configuration file not found. Initializing...'));

    try {
      this.configManager.initializeSettings();
      const path = this.configManager.getSettingsPath();
      console.log(chalk.green(`Configuration file created at: ${path}`));
      console.log(chalk.gray('Please edit the file to add your API keys.\n'));
    }
    // 初始化失败：直接退出（无法继续运行）
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`Failed to initialize: ${message}`));
      process.exit(1);
    }
  }

  /**
   * 显示命令选择菜单
   *
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private async showCommandSelection(): Promise<void> {
    prepareForInquirer(this.rl);

    // 顶部展示快捷方式横幅,引导一行式快捷命令
    printShortcutBanner();

    console.log(chalk.cyan('\n=== 选择命令 ==='));
    console.log(chalk.gray('(输入索引号按 Enter 确认)\n'));

    AVAILABLE_COMMANDS.forEach((cmd, index) => {
      console.log(chalk.gray(`[${index}] `) + cmd.name.padEnd(15) + chalk.gray(cmd.description));
    });

    try {
      const selectedIndex = await this.promptCommandIndex();
      const selectedCommand = AVAILABLE_COMMANDS[selectedIndex].name;
      await this.handleInput(selectedCommand);
    }
    // 选择异常：返回菜单重新选择
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.uiRenderer.showError(`选择失败: ${message}`);
      this.rl = this.recreateReadline();
      await this.showCommandSelection();
    }
  }

  /**
   * 提示用户输入命令索引并校验范围
   *
   * @return 已校验的整数索引
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private async promptCommandIndex(): Promise<number> {
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'index',
        message: '请输入命令索引:',
        validate: (value: string) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 0 || num >= AVAILABLE_COMMANDS.length) {
            return `请输入 0-${AVAILABLE_COMMANDS.length - 1} 之间的数字`;
          }
          else {
            return true;
          }
        },
      },
    ] as any);

    return parseInt(response.index, 10);
  }

  /**
   * 路由用户输入到对应的子流程
   *
   * @param input - 用户输入
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private async handleInput(input: string): Promise<void> {
    // 工具选择类命令：交由编排层处理
    if (this.isToolSelectionCommand(input)) {
      const op = input.slice(1) as NextOperation;
      await showToolSelection(this.buildContext(), op);
    }
    // /list 直接展示所有模型
    else if (input === '/list') {
      this.uiRenderer.showAllModels();
      await this.showCommandSelection();
    }
    // /current 直接展示当前模型
    else if (input === '/current') {
      this.uiRenderer.showCurrentModels();
      await this.showCommandSelection();
    }
    // 退出命令
    else if (isExitCommand(input)) {
      this.exitProgram();
    }
    // 空输入：返回菜单
    else if (input === '/' || input === '') {
      await this.showCommandSelection();
    }
    // 部分命令前缀：展示补全建议
    else if (input.startsWith('/') && !this.isKnownCommand(input)) {
      showCommandSuggestions(input, (msg) => this.uiRenderer.showError(msg));
      await this.showCommandSelection();
    }
    // 其他未知输入
    else {
      this.printUnknownCommand(input);
      await this.showCommandSelection();
    }
  }

  /**
   * 判断输入是否为需要选择工具的命令
   *
   * @param input - 用户输入
   * @return true 表示需要走工具选择流程
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private isToolSelectionCommand(input: string): boolean {
    return ['/switch', '/add', '/remove', '/info', '/test', '/alias'].includes(input);
  }

  /**
   * 判断输入是否为已注册命令
   *
   * @param input - 用户输入
   * @return true 表示完全匹配
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private isKnownCommand(input: string): boolean {
    return AVAILABLE_COMMANDS.some(cmd => cmd.name === input);
  }

  /**
   * 输出未知命令提示
   *
   * @param input - 用户输入
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private printUnknownCommand(input: string): void {
    handleUnknownCommand(
      input,
      (msg) => this.uiRenderer.showError(msg),
      (msg) => this.uiRenderer.showWarning(msg),
      (msg) => this.uiRenderer.showInfo(msg),
    );
  }

  /**
   * 退出程序（关闭 readline 后 process.exit）
   *
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private exitProgram(): void {
    console.log(chalk.yellow('\nGoodbye!'));
    this.rl.close();
    process.exit(0);
  }

  /**
   * 重新创建 readline 接口（在使用 inquirer 后必须调用）
   *
   * @return 新创建的 readline 接口
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private recreateReadline(): readline.Interface {
    this.rl = createReadlineInterface(
      this.completer.bind(this),
      (input) => this.handleInput(input),
    );
    return this.rl;
  }

  /**
   * 构建注入给编排层的上下文对象
   *
   * @return 编排层依赖上下文
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private buildContext(): OrchestratorContext {
    return {
      rl: this.rl,
      ui: this.uiRenderer,
      recreateReadline: () => this.recreateReadline(),
      showCommandSelection: () => this.showCommandSelection(),
      exitProgram: () => this.exitProgram(),
    };
  }
}

/**
 * CLI 启动入口
 * 仅在直接运行此文件时启动 CLI
 * 启动分发逻辑(interactive vs shortcut)委托给 bootstrap()
 */
if (require.main === module) {
  bootstrap(() => new CLI());
}
