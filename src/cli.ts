/**
 * CLI 主编排层
 * 负责启动、命令路由与与编排层的衔接
 *
 * 拆分历史：
 * - 2026-04-27 初版聚合实现（>1300 行）
 * - 2026-05-03 第一阶段：拆分为多个子模块（≤350 行）
 * - 2026-05-03 第二阶段：进一步抽离工具/模型操作编排到 operation-orchestrator
 * - 2026-05-11 第三阶段：抽离输入处理逻辑到 cli-input-handler
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import * as readline from 'readline';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from './config';
import { registry, ClaudeAdapter, CodexAdapter } from './adapters';
import { AVAILABLE_COMMANDS } from './cli/commands';
import { UIRenderer } from './cli/ui';
import { createReadlineInterface, prepareForInquirer } from './cli/readline-helper';
import {
  NextOperation,
  OrchestratorContext,
  showToolSelection,
} from './cli/operation-orchestrator';
import { bootstrap } from './cli/bootstrap';
import { printShortcutBanner } from './cli/shortcut-banner';
import { templateManager } from './cli/template-manager';
import { createI18n, I18nManager } from './i18n';
import { CliInputHandler } from './cli-input-handler';

/** 命令前缀字符 */
const COMMAND_PREFIX = '/';

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

  /** i18n 管理器（多语言支持） */
  private i18n: I18nManager;

  /** 输入处理器 */
  private inputHandler: CliInputHandler;

  /**
   * 构造函数
   * 注册适配器并创建初始 readline 接口
   *
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  constructor() {
    this.configManager = new ConfigManager();
    this.i18n = createI18n(this.configManager);
    this.uiRenderer = new UIRenderer();

    registry.register(new ClaudeAdapter());
    registry.register(new CodexAdapter());

    this.inputHandler = new CliInputHandler(
      this.uiRenderer,
      this.i18n,
      () => this.buildContext(),
      () => this.showCommandSelection(),
      () => this.exitProgram(),
      () => this.recreateReadline(),
    );

    this.rl = createReadlineInterface(
      this.completer.bind(this),
      (input) => this.inputHandler.handleInput(input),
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

    // 条件: 输入以命令前缀开头，返回前缀匹配结果
    if (input.startsWith(COMMAND_PREFIX)) {
      return [commands.filter(cmd => cmd.startsWith(input)), input];
    }
    // 替代: 非命令输入，返回全量命令列表
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
    const isConfigCreated = await this.ensureConfigFile();

    // 初始化 i18n（在配置文件准备好之后执行，避免首启读取未创建的 settings）
    await this.i18n.initialize();

    // 条件: 配置文件是本次启动新创建的，需要提示用户
    if (isConfigCreated) {
      this.showConfigInitializedMessage();
    }
    // 替代: 配置文件已存在，跳过初始化提示
    else {
      // 配置文件已存在，无需初始化提示
    }

    console.log(chalk.cyan(this.i18n.t('app.welcome')));
    console.log(chalk.gray('\n' + this.i18n.t('commands.selectHint') + '\n'));

    await this.showCommandSelection();
  }

  /**
   * 确保配置文件存在，不存在则初始化
   *
   * @return 是否本次创建了新配置文件
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private async ensureConfigFile(): Promise<boolean> {
    const isConfigCreated = this.configManager.ensureSettingsFile();

    // 确保模板配置文件存在（优先远程拉取，失败则用内置默认）
    const templateInitResult = await templateManager.initializeDefaults();

    // 条件: 远程拉取失败，提示用户使用内置模板
    if (templateInitResult === 'builtin') {
      const templatesPath = templateManager.getTemplatesPath();

      console.log(chalk.yellow('\n' + this.i18n.t('messages.templateBuiltin')));
      console.log(chalk.gray(this.i18n.t('messages.templateHint', { path: templatesPath })));
    }
    // 替代: 远程拉取成功或本地已存在，静默处理
    else {
      // 不输出任何提示，避免干扰用户正常操作流程
    }

    return isConfigCreated;
  }

  /**
   * 显示配置文件初始化成功提示
   *
   * @author lvdaxianerplus
   * @date 2026-05-10
   */
  private showConfigInitializedMessage(): void {
    const path = this.configManager.getSettingsPath();
    console.log(chalk.yellow(this.i18n.t('errors.configNotFound') + '. Initializing...'));
    console.log(chalk.green(this.i18n.t('messages.configCreated', { path: path })));
    console.log(chalk.gray(this.i18n.t('messages.editApiKey') + '\n'));
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

    console.log(chalk.cyan('\n=== ' + this.i18n.t('commands.select') + ' ==='));
    console.log(chalk.gray('(' + this.i18n.t('commands.selectHint') + ')\n'));

    AVAILABLE_COMMANDS.forEach((cmd, index) => {
      const translatedDesc = this.i18n.t(cmd.descriptionKey);
      console.log(chalk.gray(`[${index}] `) + cmd.name.padEnd(15) + chalk.gray(translatedDesc));
    });

    try {
      const selectedIndex = await this.promptCommandIndex();
      const selectedCommand = AVAILABLE_COMMANDS[selectedIndex].name;
      await this.inputHandler.handleInput(selectedCommand);
    }
    // 选择异常：返回菜单重新选择
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.uiRenderer.showError(this.i18n.t('errors.selectFailed', { message: message }));
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
        message: this.i18n.t('commands.enterIndex'),
        validate: (value: string) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 0 || num >= AVAILABLE_COMMANDS.length) {
            return this.i18n.t('commands.invalidIndex', { max: AVAILABLE_COMMANDS.length - 1 });
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
   * 退出程序（关闭 readline 后 process.exit）
   *
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  private exitProgram(): void {
    console.log(chalk.yellow('\n' + this.i18n.t('commands.goodbye')));
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
      (input) => this.inputHandler.handleInput(input),
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
