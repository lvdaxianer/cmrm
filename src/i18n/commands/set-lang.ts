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
import { Locale } from '../types';

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

  // 显示语言选项列表（带编号）
  console.log(chalk.cyan('\n=== ' + i18n.t('commands.setLang.select') + ' ===\n'));

  availableLocales.forEach((locale, index) => {
    const isCurrent = locale.code === currentLocale;
    const marker = isCurrent ? ' (current)' : '';
    console.log(chalk.gray(`[${index}] `) + chalk.white(locale.name) + chalk.gray(marker));
  });

  console.log('');

  // 让用户输入编号
  const response = await inquirer.prompt([
    {
      type: 'input',
      name: 'index',
      message: i18n.t('commands.setLang.enterIndex'),
      validate: (value: string) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0 || num >= availableLocales.length) {
          return i18n.t('commands.setLang.invalidIndex', { max: availableLocales.length - 1 });
        }
        return true;
      },
    },
  ] as any);

  const selectedIndex = parseInt(response.index, 10);
  const selectedLocale = availableLocales[selectedIndex].code as Locale;

  // 保存到配置
  await i18n.setLocale(selectedLocale);

  console.log(chalk.green('\n' + i18n.t('commands.setLang.success', { locale: selectedLocale })));
}
