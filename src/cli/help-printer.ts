/**
 * CLI 帮助文案输出
 * 处理 `cmrm --help` / `cmrm -h` / `cmrm help` 的文案展示
 *
 * 拆分原因:
 * - 文案集中维护,避免散落多处
 * - 不依赖 UIRenderer(help 在 readline 初始化前可被调用)
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import chalk from 'chalk';

/**
 * 打印 CLI 使用说明
 * 包含 USAGE / EXAMPLES / NOTES 三段
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function printHelp(): void {
  printHeader();
  printUsage();
  printExamples();
  printNotes();
}

/**
 * 打印标题段
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function printHeader(): void {
  console.log(chalk.cyan('cmrm - Model Registry Manager'));
  console.log(chalk.gray('Claude CLI 模型快速切换/测试工具\n'));
}

/**
 * 打印 USAGE 段(命令一行式说明)
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function printUsage(): void {
  console.log(chalk.cyan('USAGE:'));
  console.log('  ' + chalk.green('cmrm') + chalk.gray('                                 进入交互式菜单(默认)'));
  console.log('  ' + chalk.green('cmrm switch <model-name>') + chalk.gray('             快速切换 claude 工具的模型'));
  console.log('  ' + chalk.green('cmrm test <model-name>') + chalk.gray('               快速测试已保存模型的连通性'));
  console.log('  ' + chalk.green('cmrm alias <model-name> <new-alias>') + chalk.gray('  为模型添加全局唯一别名'));
  console.log('  ' + chalk.green('cmrm --help, -h') + chalk.gray('                      显示本帮助'));
  console.log('');
}

/**
 * 打印 EXAMPLES 段(具体示例)
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function printExamples(): void {
  console.log(chalk.cyan('EXAMPLES:'));
  console.log('  ' + chalk.gray('# 切换到名为 sonnet-4 的模型(默认工具=claude)'));
  console.log('  ' + chalk.green('cmrm switch sonnet-4'));
  console.log('  ' + chalk.gray('# 测试 gpt-4o-mini 模型的连通性'));
  console.log('  ' + chalk.green('cmrm test gpt-4o-mini'));
  console.log('  ' + chalk.gray('# 为 sonnet-4 模型添加 fast 别名,之后可 cmrm switch fast'));
  console.log('  ' + chalk.green('cmrm alias sonnet-4 fast'));
  console.log('');
}

/**
 * 打印 NOTES 段(查找规则与默认值说明)
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function printNotes(): void {
  console.log(chalk.cyan('NOTES:'));
  console.log(chalk.gray('  - 模型名按 name → aliases → model 三级匹配,首项命中即返回'));
  console.log(chalk.gray('  - 别名全局唯一,跨模型/跨工具不可重复'));
  console.log(chalk.gray('  - 找不到模型时会列出所有可用名称,退出码为 1'));
  console.log(chalk.gray('  - 不传任何参数时进入完整交互菜单'));
  console.log('');
}
