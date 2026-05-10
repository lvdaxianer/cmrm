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
import { t } from '../i18n';

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
  console.log(chalk.gray(`${t('help.subtitle')}\n`));
}

/**
 * 打印 USAGE 段(命令一行式说明)
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function printUsage(): void {
  console.log(chalk.cyan('USAGE:'));
  console.log('  ' + chalk.green('cmrm') + chalk.gray(`                                 ${t('help.usageInteractive')}`));
  console.log('  ' + chalk.green('cmrm switch <model-name>') + chalk.gray(`             ${t('help.usageSwitch')}`));
  console.log('  ' + chalk.green('cmrm test <model-name>') + chalk.gray(`               ${t('help.usageTest')}`));
  console.log('  ' + chalk.green('cmrm alias <model-name> <new-alias>') + chalk.gray(`  ${t('help.usageAlias')}`));
  console.log('  ' + chalk.green('cmrm <tool> import <file>') + chalk.gray(`            ${t('help.usageImport')}`));
  console.log('  ' + chalk.green('cmrm --help, -h') + chalk.gray(`                      ${t('help.usageHelp')}`));
  console.log('  ' + chalk.green('cmrm --version, -v') + chalk.gray(`                   ${t('help.usageVersion')}`));
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
  console.log('  ' + chalk.gray(`# ${t('help.exampleSwitchComment')}`));
  console.log('  ' + chalk.green('cmrm switch sonnet-4'));
  console.log('  ' + chalk.gray(`# ${t('help.exampleTestComment')}`));
  console.log('  ' + chalk.green('cmrm test gpt-4o-mini'));
  console.log('  ' + chalk.gray(`# ${t('help.exampleAliasComment')}`));
  console.log('  ' + chalk.green('cmrm alias sonnet-4 fast'));
  console.log('  ' + chalk.gray(`# ${t('help.exampleImportComment')}`));
  console.log('  ' + chalk.green('cmrm claude import config.json'));
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
  console.log(chalk.gray(`  - ${t('help.noteMatchRule')}`));
  console.log(chalk.gray(`  - ${t('help.noteAliasUnique')}`));
  console.log(chalk.gray(`  - ${t('help.noteNotFound')}`));
  console.log(chalk.gray(`  - ${t('help.noteInteractive')}`));
  console.log('');
}
