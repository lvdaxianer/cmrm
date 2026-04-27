/**
 * CLI 主模块
 * 提供命令行交互界面，整合命令、UI、输入处理模块
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import * as readline from 'readline';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from './config';
import { UnifiedModelConfig } from './types';
import { registry, ClaudeAdapter, ToolAdapter } from './adapters';
import { AVAILABLE_COMMANDS } from './cli/commands';
import { KeyListener, KeyAction } from './cli/input';
import { UIRenderer } from './cli/ui';

/**
 * CLI 类
 * 处理命令行交互逻辑，协调各模块工作
 */
export class CLI {
  /** readline 接口实例 */
  private rl: readline.Interface;

  /** 配置管理器 */
  private configManager: ConfigManager;

  /** UI 渲染器 */
  private uiRenderer: UIRenderer;

  /** 键盘监听器 */
  private keyListener: KeyListener;

  /** 当前选中的索引 */
  private currentSelection: number = 0;

  /** 当前选项列表（工具名称或模型名称） */
  private currentOptions: string[] = [];

  /** 下一步操作类型 */
  private nextOperation: 'switch' | 'add' | 'remove' | null = null;

  /** 当前选中的工具适配器 */
  private selectedAdapter: ToolAdapter | null = null;

  /**
   * 命令自动补全函数
   * 根据用户输入提供匹配的命令建议
   *
   * @param input - 用户当前输入
   * @returns 补全结果数组
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private completer(input: string): [string[], string] {
    // 获取所有命令名称
    const commands = AVAILABLE_COMMANDS.map(cmd => cmd.name);

    // 输入为空或以 / 开头时提供补全
    if (input.startsWith('/')) {
      const matches = commands.filter(cmd => cmd.startsWith(input));
      return [matches, input];
    }

    // 非命令输入不提供补全
    return [commands, input];
  }

  /**
   * 构造函数
   * 初始化各模块实例和适配器注册表
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  constructor() {
    // 全局启用 keypress 事件（必须在任何 keypress 监听之前调用）
    readline.emitKeypressEvents(process.stdin);

    // 初始化 readline 接口（带自动补全）
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> ',
      completer: this.completer.bind(this)
    });

    // 初始化各模块
    this.configManager = new ConfigManager();
    this.uiRenderer = new UIRenderer();
    this.keyListener = new KeyListener();

    // 注册适配器
    registry.register(new ClaudeAdapter());

    // 监听 line 事件处理输入
    this.rl.on('line', (input) => {
      this.handleInput(input.trim());
    });
  }

  /**
   * 启动 CLI
   * 检查配置文件并显示欢迎信息
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  async start(): Promise<void> {
    // 检查并初始化配置文件
    await this.ensureConfigFile();

    console.log(chalk.cyan('Model Registry Manager (cmrm) - Multi-tool support'));
    console.log(chalk.gray('\n提示：输入命令或使用上下键选择命令，Enter 确认，Ctrl+C 退出\n'));

    // 显示命令选择菜单
    this.showCommandSelection();
  }

  /**
   * 显示命令选择菜单
   * 使用上下键选择命令
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private showCommandSelection(): void {
    // 设置当前选项为命令列表
    this.currentOptions = AVAILABLE_COMMANDS.map(cmd => cmd.name);
    this.currentSelection = 0;

    // 渲染命令列表
    this.uiRenderer.renderCommandList(this.currentSelection, true);
    this.setupKeyListener('command');
  }

  /**
   * 确保配置文件存在
   * 不存在则创建默认配置
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private async ensureConfigFile(): Promise<void> {
    // 配置文件已存在，无需初始化
    if (this.configManager.hasSettingsFile()) {
      return;
    }

    // 配置文件不存在，创建默认配置
    console.log(chalk.yellow('Configuration file not found. Initializing...'));

    try {
      this.configManager.initializeSettings();
      const path = this.configManager.getSettingsPath();
      console.log(chalk.green(`Configuration file created at: ${path}`));
      console.log(chalk.gray('Please edit the file to add your API keys.\n'));
    }
    // 初始化失败
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`Failed to initialize: ${message}`));
      process.exit(1);
    }
  }

  /**
   * 处理用户输入命令
   *
   * @param input - 用户输入的命令字符串
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private handleInput(input: string): void {
    // /switch 命令 - 显示工具选择
    if (input === '/switch') {
      this.nextOperation = 'switch';
      this.showToolSelection();
    }
    // /add 命令 - 显示工具选择后交互添加
    else if (input === '/add') {
      this.nextOperation = 'add';
      this.showToolSelection();
    }
    // /remove 命令 - 显示工具选择后交互删除
    else if (input === '/remove') {
      this.nextOperation = 'remove';
      this.showToolSelection();
    }
    // /list 命令 - 显示所有模型配置，然后返回命令选择
    else if (input === '/list') {
      this.uiRenderer.showAllModels();
      this.showCommandSelection();
    }
    // /current 命令 - 显示当前生效模型，然后返回命令选择
    else if (input === '/current') {
      this.uiRenderer.showCurrentModels();
      this.showCommandSelection();
    }
    // 退出命令 - 关闭程序
    else if (this.isExitCommand(input)) {
      console.log(chalk.yellow('\nGoodbye!'));
      this.rl.close();
      process.exit(0);
    }
    // 空命令 "/" - 显示命令选择菜单
    else if (input === '/') {
      this.showCommandSelection();
    }
    // 空输入 - 显示命令选择菜单
    else if (input === '') {
      this.showCommandSelection();
    }
    // 部分命令输入 - 显示匹配建议后返回命令选择
    else if (input.startsWith('/') && !AVAILABLE_COMMANDS.some(cmd => cmd.name === input)) {
      this.showCommandSuggestions(input);
      this.showCommandSelection();
    }
    // 未知命令 - 提示错误后返回命令选择
    else {
      this.handleUnknownCommand(input);
      this.showCommandSelection();
    }
  }

  /**
   * 显示命令匹配建议
   * 当用户输入部分命令时提示可能的匹配项
   *
   * @param input - 用户输入的部分命令
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private showCommandSuggestions(input: string): void {
    // 查找以输入开头的命令
    const matches = AVAILABLE_COMMANDS
      .filter(cmd => cmd.name.startsWith(input))
      .map(cmd => `${cmd.name} - ${cmd.description}`);

    // 无匹配时提示无此命令
    if (matches.length === 0) {
      this.uiRenderer.showError(`No command starts with: ${input}`);
      this.uiRenderer.showCommands();
      return;
    }

    // 显示匹配的命令建议
    console.log(chalk.cyan('\nAvailable commands:'));
    matches.forEach(cmd => {
      console.log(chalk.gray(`  ${cmd}`));
    });
    console.log(chalk.gray('\n  (Press Enter to confirm, or continue typing)'));
  }

  /**
   * 检查是否为退出命令
   *
   * @param input - 用户输入
   * @return 如果是退出命令返回 true
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private isExitCommand(input: string): boolean {
    const exitCommands = ['/exit', '/quit', 'exit', 'quit'];
    return exitCommands.includes(input.toLowerCase());
  }

  /**
   * 处理未知命令
   * 显示错误并推荐相似命令
   *
   * @param input - 用户输入的未知命令
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private handleUnknownCommand(input: string): void {
    this.uiRenderer.showError(`Unknown command: ${input}`);

    // 查找相似命令推荐
    const suggestions = this.findSimilarCommands(input);

    // 有相似命令时显示推荐
    if (suggestions.length > 0) {
      this.uiRenderer.showWarning('Did you mean:');
      suggestions.forEach(cmd => {
        console.log(`  ${chalk.green(cmd.name)} - ${chalk.gray(cmd.description)}`);
      });
    }
    // 无相似命令时显示可用命令列表
    else {
      this.uiRenderer.showInfo('Available commands: /switch-model, /add-model, /list, /current, /exit');
    }
  }

  /**
   * 查找与输入相似的命令
   * 使用编辑距离算法匹配相似命令
   *
   * @param input - 用户输入的命令
   * @return 相似命令列表
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private findSimilarCommands(input: string): typeof AVAILABLE_COMMANDS {
    const suggestions: typeof AVAILABLE_COMMANDS = [];
    const threshold = 3;

    // 遍历所有命令计算编辑距离
    for (const cmd of AVAILABLE_COMMANDS) {
      const distance = this.levenshteinDistance(input.toLowerCase(), cmd.name.toLowerCase());

      // 编辑距离在阈值内或部分匹配则推荐
      if (distance <= threshold || (input.startsWith('/') && cmd.name.includes(input))) {
        suggestions.push(cmd);
      }
      // 不匹配则跳过
      else {
        continue;
      }
    }

    return suggestions;
  }

  /**
   * 计算编辑距离（Levenshtein Distance）
   *
   * @param a - 第一个字符串
   * @param b - 第二个字符串
   * @return 编辑距离数值
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private levenshteinDistance(a: string, b: string): number {
    // 初始化矩阵
    const matrix: number[][] = [];

    // 构建矩阵第一列（b 的长度）
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    // 构建矩阵第一行（a 的长度）
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // 计算矩阵每个单元格的值
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        // 字符相同则取左上角值
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        }
        // 字符不同则取最小值加1
        else {
          const minVal = Math.min(
            matrix[i - 1][j - 1] + 1, // 替换
            matrix[i][j - 1] + 1,     // 插入
            matrix[i - 1][j] + 1      // 删除
          );
          matrix[i][j] = minVal;
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * 显示工具选择菜单
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private showToolSelection(): void {
    this.currentOptions = registry.getToolNames();
    this.currentSelection = 0;

    // 首次渲染（包含完整提示）
    this.uiRenderer.renderToolList(this.currentSelection, true);
    this.setupKeyListener('tool');
  }

  /**
   * 显示模型选择菜单（用于 /switch-model）
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private showModelSelection(): void {
    // 未选择工具时不执行
    if (!this.selectedAdapter) {
      return;
    }

    const models = this.selectedAdapter.getSavedModels();

    // 无保存模型时显示提示
    if (models.length === 0) {
      this.uiRenderer.showWarning(`\n${this.selectedAdapter.displayName} 没有保存的模型配置`);
      this.uiRenderer.showInfo('请使用 /add-model 命令添加模型配置');
      this.showCommandSelection();
      return;
    }

    // 有模型时显示选择列表（首次渲染）
    this.currentOptions = models.map(m => m.name || m.model);
    this.currentSelection = 0;

    this.uiRenderer.renderModelList(this.selectedAdapter, models, this.currentSelection, true);
    this.setupKeyListener('model');
  }

  /**
   * 显示删除模型选择菜单（用于 /remove）
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private showRemoveModelSelection(): void {
    // 未选择工具时不执行
    if (!this.selectedAdapter) {
      return;
    }

    const models = this.selectedAdapter.getSavedModels();

    // 无保存模型时显示提示
    if (models.length === 0) {
      this.uiRenderer.showWarning(`\n${this.selectedAdapter.displayName} 没有保存的模型配置`);
      this.uiRenderer.showInfo('请使用 /add 命令添加模型配置');
      this.showCommandSelection();
      return;
    }

    // 有模型时显示选择列表（首次渲染）
    this.currentOptions = models.map(m => m.name || m.model);
    this.currentSelection = 0;

    this.uiRenderer.renderModelList(this.selectedAdapter, models, this.currentSelection, true);
    this.setupKeyListener('remove');
  }

  /**
   * 设置键盘监听器
   * 关闭 readline interface 后立即启动 raw mode 监听
   *
   * @param mode - 监听模式（command、tool、model 或 remove）
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private setupKeyListener(mode: 'command' | 'tool' | 'model' | 'remove'): void {
    // 关闭 readline interface，释放 stdin
    this.rl.close();

    // 关闭后 stdin 会暂停，立即恢复
    process.stdin.resume();

    // 启动键盘监听（进入 raw mode）
    this.keyListener.startListening((action) => {
      this.handleKeyAction(action, mode);
    });
  }

  /**
   * 处理键盘动作
   * 对于上下键，先停止监听再渲染，渲染后自动重新监听
   *
   * @param action - 键盘动作类型
   * @param mode - 当前选择模式
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private handleKeyAction(action: KeyAction, mode: 'command' | 'tool' | 'model' | 'remove'): void {
    // 向上选择 - 停止监听、更新索引、渲染（渲染后会重新监听）
    if (action === 'up') {
      this.keyListener.stopListening();
      this.currentSelection = Math.max(0, this.currentSelection - 1);
      this.renderCurrentList(mode);
    }
    // 向下选择 - 停止监听、更新索引、渲染（渲染后会重新监听）
    else if (action === 'down') {
      this.keyListener.stopListening();
      this.currentSelection = Math.min(this.currentOptions.length - 1, this.currentSelection + 1);
      this.renderCurrentList(mode);
    }
    // 确认选择 - 先停止监听再处理选中项（不再重新监听）
    else if (action === 'confirm') {
      this.keyListener.stopListening();
      this.handleSelection(mode);
    }
    // 取消选择 - 先停止监听再返回命令选择菜单
    else if (action === 'cancel') {
      this.keyListener.stopListening();
      this.nextOperation = null;
      this.uiRenderer.showWarning('\n已取消');
      this.showCommandSelection();
    }
    // 退出程序 - 先停止监听再退出
    else if (action === 'exit') {
      this.keyListener.stopListening();
      console.log(chalk.yellow('\nGoodbye!'));
      this.rl.close();
      process.exit(0);
    }
    // 其他动作不处理
    else {
      // 忽略
    }
  }

  /**
   * 渲染当前选择列表
   * 渲染前停止监听，渲染后重新启动监听
   * 这样可以避免 raw mode 和 readline API 的冲突
   *
   * @param mode - 选择模式
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private renderCurrentList(mode: 'tool' | 'model' | 'command' | 'remove'): void {
    // 命令模式 - 渲染命令列表
    if (mode === 'command') {
      this.uiRenderer.renderCommandList(this.currentSelection, false);
    }
    // 工具模式 - 渲染工具列表（后续渲染，不显示完整提示）
    else if (mode === 'tool') {
      this.uiRenderer.renderToolList(this.currentSelection, false);
    }
    // 模型模式 - 渲染模型列表（后续渲染）
    else if ((mode === 'model' || mode === 'remove') && this.selectedAdapter) {
      const models = this.selectedAdapter.getSavedModels();
      this.uiRenderer.renderModelList(this.selectedAdapter, models, this.currentSelection, false);
    }
    // 其他模式不渲染
    else {
      // 不处理
    }

    // 渲染完成后重新启动键盘监听
    this.setupKeyListener(mode);
  }

  /**
   * 处理选择确认
   *
   * @param mode - 选择模式
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private handleSelection(mode: 'tool' | 'model' | 'command' | 'remove'): void {

    // 命令选择完成
    if (mode === 'command') {
      this.handleCommandSelection();
    }
    // 工具选择完成
    else if (mode === 'tool') {
      this.handleToolSelection();
    }
    // 模型选择完成（switch 操作）
    else if (mode === 'model') {
      this.handleModelSelection();
    }
    // 模型选择完成（remove 操作）
    else if (mode === 'remove') {
      this.handleRemoveSelection();
    }
    // 其他模式不处理
    else {
      // 不处理
    }
  }

  /**
   * 处理删除模型选择完成
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private handleRemoveSelection(): void {
    // 未选择工具时不执行
    if (!this.selectedAdapter) {
      return;
    }

    const models = this.selectedAdapter.getSavedModels();
    const selectedModel = models[this.currentSelection];

    this.removeModel(selectedModel);
  }

  /**
   * 删除模型配置
   *
   * @param selectedModel - 要删除的模型配置
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private removeModel(selectedModel: UnifiedModelConfig): void {
    // 未选择工具时不执行
    if (!this.selectedAdapter) {
      return;
    }

    // 获取配置名称
    const configName = selectedModel.name || selectedModel.model;

    try {
      // 删除配置
      const success = this.selectedAdapter.removeModel(configName);

      // 删除成功
      if (success) {
        this.uiRenderer.showSuccess(`\n模型配置已删除: ${configName}`);
      }
      // 删除失败（配置不存在）
      else {
        this.uiRenderer.showError(`\n删除失败: 配置不存在`);
      }
    }
    // 删除失败
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.uiRenderer.showError(`\n删除失败: ${message}`);
    }

    // 清理状态并返回命令选择菜单
    this.nextOperation = null;
    this.showCommandSelection();
  }

  /**
   * 处理命令选择完成
   * 执行选中的命令
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private handleCommandSelection(): void {
    const selectedCommand = this.currentOptions[this.currentSelection];
    this.handleInput(selectedCommand);
  }

  /**
   * 处理工具选择完成
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private handleToolSelection(): void {
    const selectedTool = this.currentOptions[this.currentSelection];
    this.selectedAdapter = registry.getAdapter(selectedTool);

    this.uiRenderer.showSuccess(`\n已选择工具: ${this.selectedAdapter.displayName}`);

    // 调试日志

    // 根据下一步操作继续流程
    if (this.nextOperation === 'switch') {
      this.showModelSelection();
    }
    else if (this.nextOperation === 'add') {
      this.handleAddModel();
    }
    else if (this.nextOperation === 'remove') {
      this.showRemoveModelSelection();
    }
    else {
      // 无后续操作，返回命令选择菜单
      this.showCommandSelection();
    }
  }

  /**
   * 处理模型选择完成（switch 操作）
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private handleModelSelection(): void {
    // 未选择工具时不执行
    if (!this.selectedAdapter) {
      return;
    }

    const models = this.selectedAdapter.getSavedModels();
    const selectedModel = models[this.currentSelection];

    this.switchModel(selectedModel);
  }

  /**
   * 处理 /add-model 命令
   * 交互式让用户输入模型配置信息
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private async handleAddModel(): Promise<void> {
    // 未选择工具时不执行
    if (!this.selectedAdapter) {
      return;
    }

    // 关闭 readline
    this.rl.close();

    // 确保 KeyListener 已停止
    if (this.keyListener.isListening()) {
      this.keyListener.stopListening();
    }

    // 确保 stdin 不在 raw mode
    if (process.stdin.isRaw) {
      process.stdin.setRawMode(false);
    }

    console.log(chalk.cyan(`\n=== 添加 ${this.selectedAdapter.displayName} 模型配置 ===\n`));
    console.log(chalk.gray('提示：可选字段不填写可直接按 Enter 跳过\n'));

    try {
      // 构建问题列表
      const questions = this.buildAddModelQuestions();

      // 收集用户输入
      const response = await inquirer.prompt(questions as any);

      // 用户取消输入
      if (Object.keys(response).length === 0) {
        this.recreateReadline();
        this.uiRenderer.showWarning('\n已取消');
        this.showCommandSelection();
        return;
      }

      // 构建配置对象
      const config = this.buildModelConfig(response);

      // 验证配置
      if (!this.selectedAdapter.validateConfig(config)) {
        this.recreateReadline();
        this.uiRenderer.showError('\n配置验证失败！请检查必填字段。');
        this.showCommandSelection();
        return;
      }

      // 保存配置
      this.selectedAdapter.saveModel(config);
      this.showAddModelResult(config);

      // 重新创建 readline
      this.recreateReadline();
    }
    // 添加失败
    catch (error) {
      this.recreateReadline();
      const message = error instanceof Error ? error.message : String(error);
      this.uiRenderer.showError(`添加失败: ${message}`);
    }

    // 清理状态并返回命令选择菜单
    this.nextOperation = null;

    // 恢复 stdin 状态，确保 keypress 事件正常工作
    process.stdin.pause();
    readline.emitKeypressEvents(process.stdin);

    this.recreateReadline();
    this.showCommandSelection();
  }

  /**
   * 重新创建 readline 接口
   * 在使用 prompts 库后需要重新创建
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private recreateReadline(): void {
    // 恢复 stdin
    process.stdin.resume();

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> ',
      completer: this.completer.bind(this)
    });

    // 重新绑定 line 事件
    this.rl.on('line', (input) => {
      this.handleInput(input.trim());
    });
  }

  /**
   * 构建添加模型的问题列表
   *
   * @return inquirer 问题数组
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private buildAddModelQuestions(): inquirer.QuestionCollection[] {
    // Claude 配置问题列表
    return [
      {
        type: 'input',
        name: 'configName',
        message: '配置名称（可选，不填则使用模型名称）',
      },
      {
        type: 'input',
        name: 'model',
        message: '模型名称（必填）',
        validate: (value: string) => value.trim() !== '' || '模型名称为必填字段',
      },
      {
        type: 'input',
        name: 'apiKey',
        message: 'API Key（必填）',
        validate: (value: string) => value.trim() !== '' || 'API Key 为必填字段',
      },
      {
        type: 'input',
        name: 'baseUrl',
        message: 'Base URL（必填）',
        default: 'https://api.anthropic.com',
        validate: (value: string) => value.trim() !== '' || 'Base URL 为必填字段',
      },
      {
        type: 'input',
        name: 'haikuModel',
        message: 'Haiku 模型（可选）',
      },
      {
        type: 'input',
        name: 'sonnetModel',
        message: 'Sonnet 模型（可选）',
      },
      {
        type: 'input',
        name: 'opusModel',
        message: 'Opus 模型（可选）',
      },
    ];
  }

  /**
   * 根据用户输入构建模型配置对象
   *
   * @param response - prompts 返回的用户输入
   * @return 统一模型配置对象
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private buildModelConfig(response: Record<string, any>): UnifiedModelConfig {
    // 基础配置字段
    const config: UnifiedModelConfig = {
      name: response.configName?.trim() || response.model.trim(),
      model: response.model.trim(),
      apiKey: response.apiKey.trim(),
      baseUrl: response.baseUrl.trim(),
    };

    // Claude 可选字段
    if (response.haikuModel?.trim()) {
      config.haikuModel = response.haikuModel.trim();
    }
    else {
      // 可选字段不填则不设置
    }

    if (response.sonnetModel?.trim()) {
      config.sonnetModel = response.sonnetModel.trim();
    }
    else {
      // 可选字段不填则不设置
    }

    if (response.opusModel?.trim()) {
      config.opusModel = response.opusModel.trim();
    }
    else {
      // 可选字段不填则不设置
    }

    return config;
  }

  /**
   * 显示添加模型的结果
   *
   * @param config - 添加的模型配置
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private showAddModelResult(config: UnifiedModelConfig): void {
    this.uiRenderer.showSuccess('\n模型配置已添加:');
    this.uiRenderer.showInfo(`  名称:     ${config.name}`);
    this.uiRenderer.showInfo(`  模型:     ${config.model}`);

    // API Key 截断显示（保护敏感信息）
    const truncatedApiKey = config.apiKey.substring(0, 10) + '...';
    this.uiRenderer.showInfo(`  API Key:  ${truncatedApiKey}`);
    this.uiRenderer.showInfo(`  Base URL: ${config.baseUrl}`);
  }

  /**
   * 切换模型
   * 写入模型配置到工具配置文件
   *
   * @param config - 要切换的模型配置
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private switchModel(config: UnifiedModelConfig): void {
    // 未选择工具时不执行
    if (!this.selectedAdapter) {
      return;
    }

    try {
      // 验证配置完整性
      if (!this.selectedAdapter.validateConfig(config)) {
        this.uiRenderer.showError('\n配置验证失败！缺少必填字段。');
        this.showCommandSelection();
        return;
      }

      // 写入配置（自动备份）
      const backupFileName = this.selectedAdapter.writeModelConfig(config);

      // 显示切换结果
      this.showSwitchResult(config, backupFileName);
    }
    // 切换失败
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.uiRenderer.showError(`切换失败: ${message}`);
    }

    // 清理状态并返回命令选择菜单
    this.nextOperation = null;
    this.showCommandSelection();
  }

  /**
   * 显示模型切换结果
   *
   * @param config - 切换后的模型配置
   * @param backupFileName - 备份文件名
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private showSwitchResult(config: UnifiedModelConfig, backupFileName: string): void {
    this.uiRenderer.showSuccess('\n模型已切换:');
    this.uiRenderer.showInfo(`  工具:     ${this.selectedAdapter!.displayName}`);
    this.uiRenderer.showInfo(`  模型:     ${config.model}`);

    // 有备份文件时显示
    if (backupFileName) {
      this.uiRenderer.showInfo(`  备份:     ${backupFileName}`);
    }
    else {
      // 无备份（配置文件不存在）
    }
  }
}

/**
 * CLI 启动入口
 * 仅在直接运行此文件时启动 CLI
 */
if (require.main === module) {
  const cli = new CLI();

  cli.start().catch((error: Error) => {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  });
}