/**
 * /set-lang 命令实现
 * 允许用户手动设置界面语言
 *
 * @author lvdaxianerplus
 * @date 2026-05-05
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { I18nManager } from '../manager';
import { Locale, LocaleInfo } from '../types';

/** 十进制基数 */
const DECIMAL_RADIX = 10;

/**
 * 显示语言选择列表
 *
 * @param i18n - i18n 管理器实例
 * @param availableLocales - 可用语言列表
 * @param currentLocale - 当前语言
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function displayLocaleOptions(i18n: I18nManager, availableLocales: LocaleInfo[], currentLocale: Locale): void {
  console.log(chalk.cyan('\n=== ' + i18n.t('commands.setLang.select') + ' ===\n'));

  availableLocales.forEach((locale, index) => {
    const isCurrent = locale.code === currentLocale;
    const marker = isCurrent ? ' (current)' : '';
    console.log(chalk.gray(`[${index}] `) + chalk.white(locale.name) + chalk.gray(marker));
  });

  console.log('');
}

/**
 * 构建验证函数
 *
 * @param i18n - i18n 管理器实例
 * @param availableLocales - 可用语言列表
 * @return 验证函数
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function buildValidator(i18n: I18nManager, availableLocales: LocaleInfo[]): (value: string) => string | boolean {
  return (value: string) => {
    const num = parseInt(value, DECIMAL_RADIX);
    // 条件：输入无效
    if (isNaN(num) || num < 0 || num >= availableLocales.length) {
      return i18n.t('commands.setLang.invalidIndex', { max: availableLocales.length - 1 });
    }
    // 替代：输入有效
    else {
      return true;
    }
  };
}

/**
 * 获取用户选择的语言
 *
 * @param i18n - i18n 管理器实例
 * @param availableLocales - 可用语言列表
 * @return 用户选择的语言代码
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
async function promptForLocale(i18n: I18nManager, availableLocales: LocaleInfo[]): Promise<Locale> {
  const response = await inquirer.prompt([
    {
      type: 'input',
      name: 'index',
      message: i18n.t('commands.setLang.enterIndex'),
      validate: buildValidator(i18n, availableLocales),
    },
  ] as any);

  const selectedIndex = parseInt(response.index, DECIMAL_RADIX);
  return availableLocales[selectedIndex].code as Locale;
}

/**
 * 处理 /set-lang 命令
 * 显示语言选择列表，让用户输入编号选择界面语言
 *
 * @param i18n - i18n 管理器实例
 * @author lvdaxianerplus
 * @date 2026-05-05
 */
export async function handleSetLang(i18n: I18nManager): Promise<void> {
  const availableLocales = i18n.getAvailableLocales();
  const currentLocale = i18n.getLocale();

  displayLocaleOptions(i18n, availableLocales, currentLocale);
  const selectedLocale = await promptForLocale(i18n, availableLocales);

  await i18n.setLocale(selectedLocale);
  console.log(chalk.green('\n' + i18n.t('commands.setLang.success', { locale: selectedLocale })));
}
