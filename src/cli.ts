#!/usr/bin/env node
/**
 * CLI 交互模块
 * 提供命令行交互界面，支持模型切换、查看当前配置等功能
 *
 * @author lvdaxianer
 * @date 2025-01-01
 */

import * as readline from 'readline';
import chalk from 'chalk';
import prompts from 'prompts';
import { ConfigManager } from './config';
import { ModelConfig } from './types';

/**
 * 可用命令列表
 */
const AVAILABLE_COMMANDS = [
  { name: '/model', description: '切换模型 / Switch model' },
  { name: '/input', description: '添加新模型配置 / Add new model config' },
  { name: '/list', description: '查看所有模型配置 / List all models' },
  { name: '/current', description: '查看当前模型 / Show current model' },
  { name: '/exit', description: '退出程序 / Exit program' }
];

/**
 * CLI 类
 * 处理命令行交互逻辑
 */
export class CLI {
  /** readline 接口实例 */
  private rl: readline.Interface;
  /** 配置管理器 */
  private configManager: ConfigManager;
  /** 当前选中的模型索引 */
  private currentSelection: number = 0;
  /** 模型列表 */
  private models: ModelConfig[] = [];
  /** 当前输入的命令 */
  private currentInput: string = '';

  /**
   * 构造函数
   * 初始化 readline 接口和配置管理器
   */
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });
    this.configManager = new ConfigManager();

    // 监听 line 事件，实时处理输入
    this.rl.on('line', (input) => {
      this.handleInput(input.trim());
    });
  }

  /**
   * 启动 CLI
   * 检查配置文件并显示欢迎信息和命令列表
   *
   * @author lvdaxianer
   */
  async start(): Promise<void> {
    // 检查配置文件是否存在
    if (!this.configManager.hasSettingsFile()) {
      console.log(chalk.yellow('Configuration file not found. Initializing...'));
      try {
        this.configManager.initializeSettings();
        console.log(chalk.green(`Configuration file created at: ${this.configManager['settingsPath']}`));
        console.log(chalk.gray('Please edit the file to add your API keys.\n'));
      } catch (error) {
        console.log(chalk.red(`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    }

    console.log(chalk.cyan('Claude Model Registry Manager (cmrm)'));
    // 启动时显示命令列表
    this.showCommands();

    this.promptWithCommands();
  }

  /**
   * 显示命令提示符并附带命令列表
   *
   * @author lvdaxianer
   */
  private promptWithCommands(): void {
    this.showCommands();
    this.rl.prompt();
  }

  /**
   * 显示命令提示符
   *
   * @author lvdaxianer
   */
  private prompt(): void {
    this.rl.prompt();
  }

  /**
   * 处理用户输入
   *
   * @param input - 用户输入的命令
   * @author lvdaxianer
   */
  private handleInput(input: string): void {
    this.currentInput = input;

    // 输入 /model 时，显示模型选择菜单
    if (input === '/model') {
      this.showModelSelection();
    }
    // 输入 /input 时，交互式添加新模型
    else if (input === '/input') {
      this.handleInputCommand();
    }
    // 输入 /list 时，显示所有模型配置
    else if (input === '/list') {
      this.showModelList();
      this.promptWithCommands();
    }
    // 输入 /current 时，显示当前模型
    else if (input === '/current') {
      this.showCurrentModel();
      this.promptWithCommands();
    }
    // 输入退出命令时，关闭程序
    else if (input === '/exit' || input === '/quit' || input === 'exit' || input === 'quit') {
      console.log(chalk.yellow('Goodbye!'));
      this.rl.close();
      process.exit(0);
    }
    // 输入 / 时，显示可用命令
    else if (input === '/') {
      this.showCommands();
      this.prompt();
    }
    // 输入空内容时，继续提示
    else if (input === '') {
      this.prompt();
    }
    // 输入未知命令时，提示错误并建议相似命令
    else {
      this.handleUnknownCommand(input);
      this.promptWithCommands();
    }
  }

  /**
   * 显示可用命令列表
   *
   * @author lvdaxianer
   */
  private showCommands(): void {
    console.log(chalk.cyan('\nAvailable commands:\n'));
    AVAILABLE_COMMANDS.forEach(cmd => {
      console.log(`  ${chalk.green(cmd.name.padEnd(12))} ${chalk.gray(cmd.description)}`);
    });
    console.log('');
  }

  /**
   * 处理未知命令
   * 显示错误信息并建议相似的命令
   *
   * @param input - 用户输入的未知命令
   * @author lvdaxianer
   */
  private handleUnknownCommand(input: string): void {
    console.log(chalk.red(`Unknown command: ${input}`));

    // 查找相似的命令
    const suggestions = this.findSimilarCommands(input);

    // 如果有相似命令，显示建议
    if (suggestions.length > 0) {
      console.log(chalk.yellow('Did you mean:'));
      suggestions.forEach(cmd => {
        console.log(`  ${chalk.green(cmd.name)} - ${chalk.gray(cmd.description)}`);
      });
    } else {
      console.log(chalk.gray('Available commands: /model, /current, /exit'));
    }
  }

  /**
   * 查找与输入相似的命令
   * 使用简单的编辑距离算法找出相似命令
   *
   * @param input - 用户输入的命令
   * @return 相似的命令列表
   * @author lvdaxianer
   */
  private findSimilarCommands(input: string): typeof AVAILABLE_COMMANDS {
    const suggestions: typeof AVAILABLE_COMMANDS = [];
    const threshold = 3; // 编辑距离阈值

    for (const cmd of AVAILABLE_COMMANDS) {
      const distance = this.levenshteinDistance(input.toLowerCase(), cmd.name.toLowerCase());
      // 如果编辑距离小于阈值，或者是输入以 / 开头且命令名称包含输入内容
      if (distance <= threshold || (input.startsWith('/') && cmd.name.includes(input))) {
        suggestions.push(cmd);
      }
    }

    return suggestions;
  }

  /**
   * 计算两个字符串之间的编辑距离（Levenshtein 距离）
   *
   * @param a - 第一个字符串
   * @param b - 第二个字符串
   * @return 编辑距离
   * @author lvdaxianer
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    // 初始化矩阵
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // 填充矩阵
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 替换
            matrix[i][j - 1] + 1,     // 插入
            matrix[i - 1][j] + 1      // 删除
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * 显示当前配置的模型
   *
   * @author lvdaxianer
   */
  private showCurrentModel(): void {
    try {
      const currentModel = this.configManager.getCurrentModel();
      // 如果存在当前模型，显示模型名称
      if (currentModel) {
        console.log(chalk.green(`Current model: ${currentModel}`));
      } else {
        console.log(chalk.yellow('No model is currently configured'));
      }
    } catch (error) {
      console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  /**
   * 处理 /input 命令
   * 交互式让用户输入模型配置信息
   *
   * @author lvdaxianer
   */
  private async handleInputCommand(): Promise<void> {
    try {
      console.log(chalk.cyan('\n=== Add New Model Configuration ===\n'));

      const questions = [
        {
          type: 'text' as const,
          name: 'ANTHROPIC_MODEL',
          message: 'Default Model (e.g., claude-sonnet-4-5-20250514)',
          validate: (value: string) => value.trim() !== '' || 'This field is required'
        },
        {
          type: 'text' as const,
          name: 'ANTHROPIC_DEFAULT_HAIKU_MODEL',
          message: 'Haiku Model (e.g., claude-haiku-4-5-20250514)',
          initial: 'claude-haiku-4-5-20250514',
          validate: (value: string) => value.trim() !== '' || 'This field is required'
        },
        {
          type: 'text' as const,
          name: 'ANTHROPIC_DEFAULT_SONNET_MODEL',
          message: 'Sonnet Model (e.g., claude-sonnet-4-5-20250514)',
          initial: 'claude-sonnet-4-5-20250514',
          validate: (value: string) => value.trim() !== '' || 'This field is required'
        },
        {
          type: 'text' as const,
          name: 'ANTHROPIC_DEFAULT_OPUS_MODEL',
          message: 'Opus Model (e.g., claude-opus-4-5-20251101)',
          initial: 'claude-opus-4-5-20251101',
          validate: (value: string) => value.trim() !== '' || 'This field is required'
        },
        {
          type: 'text' as const,
          name: 'ANTHROPIC_AUTH_TOKEN',
          message: 'Auth Token (e.g., sk-ant-xxx)',
          validate: (value: string) => value.trim() !== '' || 'This field is required'
        },
        {
          type: 'text' as const,
          name: 'ANTHROPIC_BASE_URL',
          message: 'Base URL (e.g., https://api.anthropic.com)',
          initial: 'https://api.anthropic.com',
          validate: (value: string) => value.trim() !== '' || 'This field is required'
        }
      ];

      const response = await prompts(questions);

      // 用户按 Ctrl+C 取消
      if (Object.keys(response).length === 0) {
        console.log(chalk.yellow('\nCancelled'));
        this.promptWithCommands();
        return;
      }

      const newModel: ModelConfig = {
        ANTHROPIC_MODEL: response.ANTHROPIC_MODEL,
        ANTHROPIC_DEFAULT_HAIKU_MODEL: response.ANTHROPIC_DEFAULT_HAIKU_MODEL,
        ANTHROPIC_DEFAULT_SONNET_MODEL: response.ANTHROPIC_DEFAULT_SONNET_MODEL,
        ANTHROPIC_DEFAULT_OPUS_MODEL: response.ANTHROPIC_DEFAULT_OPUS_MODEL,
        ANTHROPIC_AUTH_TOKEN: response.ANTHROPIC_AUTH_TOKEN,
        ANTHROPIC_BASE_URL: response.ANTHROPIC_BASE_URL
      };

      // 验证必填字段
      if (!this.configManager.validateModelConfig(newModel)) {
        console.log(chalk.red('\nValidation failed! Required fields are missing.'));
        this.promptWithCommands();
        return;
      }

      // 检查是否已存在
      if (this.configManager.modelExists(newModel)) {
        console.log(chalk.yellow('\nThis model configuration already exists!'));
        this.promptWithCommands();
        return;
      }

      // 保存到 settings.json
      this.configManager.addModel(newModel);
      console.log(chalk.green('\nModel configuration added successfully!'));
      console.log(chalk.gray(`Model: ${newModel.ANTHROPIC_MODEL}`));
      console.log(chalk.gray(`Base URL: ${newModel.ANTHROPIC_BASE_URL}`));
    } catch (error) {
      console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
    this.promptWithCommands();
  }

  /**
   * 显示所有模型配置列表
   *
   * @author lvdaxianer
   */
  private showModelList(): void {
    try {
      const models = this.configManager.getAvailableModels();

      if (models.length === 0) {
        console.log(chalk.yellow('No models found in settings.json'));
        return;
      }

      console.log(chalk.cyan('\n=== All Model Configurations ===\n'));
      models.forEach((model, index) => {
        console.log(chalk.green(`[${index + 1}] ${model.ANTHROPIC_MODEL}`));
        // 使用辅助函数处理空值显示
        console.log(chalk.gray(`    Haiku:  ${this.formatValue(model.ANTHROPIC_DEFAULT_HAIKU_MODEL)}`));
        console.log(chalk.gray(`    Sonnet: ${this.formatValue(model.ANTHROPIC_DEFAULT_SONNET_MODEL)}`));
        console.log(chalk.gray(`    Opus:   ${this.formatValue(model.ANTHROPIC_DEFAULT_OPUS_MODEL)}`));
        console.log(chalk.gray(`    Token:  ${this.formatValue(model.ANTHROPIC_AUTH_TOKEN)}`));
        console.log(chalk.gray(`    URL:    ${this.formatValue(model.ANTHROPIC_BASE_URL)}`));
        console.log('');
      });
    } catch (error) {
      console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  /**
   * 格式化值显示，空值显示为 -
   *
   * @param value - 要格式化的值
   * @return 格式化后的字符串
   * @author lvdaxianer
   */
  private formatValue(value: string | undefined): string {
    return value || '-';
  }

  /**
   * 显示模型选择菜单
   *
   * @author lvdaxianer
   */
  private showModelSelection(): void {
    try {
      this.models = this.configManager.getAvailableModels();

      // 如果没有模型，显示提示
      if (this.models.length === 0) {
        console.log(chalk.yellow('No models found in settings.json'));
        this.promptWithCommands();
        return;
      }

      this.currentSelection = 0;
      this.renderModelList();
      this.setupKeyListener();
    } catch (error) {
      console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      this.promptWithCommands();
    }
  }

  /**
   * 渲染模型列表
   *
   * @author lvdaxianer
   */
  private renderModelList(): void {
    // 清除屏幕并重新渲染
    readline.moveCursor(process.stdout, 0, -this.models.length - 3);
    readline.clearScreenDown(process.stdout);

    console.log(chalk.cyan('\nSelect a model (use ↑/↓ arrows, Enter to confirm, Esc to cancel):\n'));

    this.models.forEach((model, index) => {
      const isSelected = index === this.currentSelection;
      const prefix = isSelected ? chalk.cyan('❯ ') : '  ';
      // 显示默认模型名称
      const defaultModel = model.ANTHROPIC_MODEL || 'Unknown';
      const displayName = isSelected ? chalk.green(defaultModel) : chalk.gray(defaultModel);
      // 显示其他模型信息
      const haiku = model.ANTHROPIC_DEFAULT_HAIKU_MODEL;
      const sonnet = model.ANTHROPIC_DEFAULT_SONNET_MODEL;
      const opus = model.ANTHROPIC_DEFAULT_OPUS_MODEL;
      const modelInfo = chalk.gray(`(H:${haiku}, S:${sonnet}, O:${opus})`);

      console.log(`${prefix}${displayName} ${modelInfo}`);
    });
  }

  /**
   * 设置键盘监听器
   * 监听上下箭头键、回车键、ESC 键
   *
   * @author lvdaxianer
   */
  private setupKeyListener(): void {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onKeyPress = (str: string, key: readline.Key) => {
      // 按上箭头时，选择上一个模型
      if (key.name === 'up') {
        this.currentSelection = Math.max(0, this.currentSelection - 1);
        this.renderModelList();
      }
      // 按下箭头时，选择下一个模型
      else if (key.name === 'down') {
        this.currentSelection = Math.min(this.models.length - 1, this.currentSelection + 1);
        this.renderModelList();
      }
      // 按回车键时，确认选择
      else if (key.name === 'return' || key.name === 'enter') {
        stdin.removeListener('keypress', onKeyPress);
        stdin.setRawMode(false);
        stdin.pause();
        this.selectModel(this.models[this.currentSelection]);
      }
      // 按 ESC 键时，取消选择
      else if (key.name === 'escape') {
        stdin.removeListener('keypress', onKeyPress);
        stdin.setRawMode(false);
        stdin.pause();
        console.log(chalk.yellow('\nCancelled'));
        this.promptWithCommands();
      }
      // 按 Ctrl+C 时，退出程序
      else if (key.ctrl && key.name === 'c') {
        console.log(chalk.yellow('\nGoodbye!'));
        this.rl.close();
        process.exit(0);
      }
    };

    stdin.on('keypress', onKeyPress);
  }

  /**
   * 选择模型并更新配置
   * 将选中的模型配置写入 Claude 配置文件
   * 会先验证必填属性，然后使用合并模式更新配置
   *
   * @param model - 选中的模型配置
   * @author lvdaxianer
   */
  private selectModel(model: ModelConfig): void {
    try {
      // 验证必填属性
      if (!this.configManager.validateModelConfig(model)) {
        console.log(chalk.red('\nInvalid model configuration!'));
        console.log(chalk.yellow('Required fields: ANTHROPIC_MODEL, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL'));
        this.promptWithCommands();
        return;
      }

      // 写入完整的模型配置（使用合并模式，只更新指定属性）
      this.configManager.writeClaudeConfig({
        ANTHROPIC_MODEL: model.ANTHROPIC_MODEL,
        ANTHROPIC_DEFAULT_HAIKU_MODEL: model.ANTHROPIC_DEFAULT_HAIKU_MODEL,
        ANTHROPIC_DEFAULT_SONNET_MODEL: model.ANTHROPIC_DEFAULT_SONNET_MODEL,
        ANTHROPIC_DEFAULT_OPUS_MODEL: model.ANTHROPIC_DEFAULT_OPUS_MODEL,
        ANTHROPIC_AUTH_TOKEN: model.ANTHROPIC_AUTH_TOKEN,
        ANTHROPIC_BASE_URL: model.ANTHROPIC_BASE_URL
      });
      console.log(chalk.green('\nModel configuration updated:'));
      console.log(chalk.gray(`  Model:     ${model.ANTHROPIC_MODEL}`));
      console.log(chalk.gray(`  Haiku:     ${model.ANTHROPIC_DEFAULT_HAIKU_MODEL}`));
      console.log(chalk.gray(`  Sonnet:    ${model.ANTHROPIC_DEFAULT_SONNET_MODEL}`));
      console.log(chalk.gray(`  Opus:      ${model.ANTHROPIC_DEFAULT_OPUS_MODEL}`));
      console.log(chalk.gray(`  Auth Token: ${model.ANTHROPIC_AUTH_TOKEN}`));
      console.log(chalk.gray(`  Base URL:  ${model.ANTHROPIC_BASE_URL}`));
    } catch (error) {
      console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    }
    this.promptWithCommands();
  }
}

// 仅在直接运行时启动 CLI
if (require.main === module) {
  const cli = new CLI();
  cli.start().catch((error) => {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  });
}
