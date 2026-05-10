/**
 * set-lang 快捷命令执行器
 * 处理 `cmrm set-lang <locale>` 命令
 *
 * @author lvdaxianerplus
 * @date 2026-05-09
 */

import { UIRenderer } from './ui';
import { createI18n, t } from '../i18n';
import { ConfigManager } from '../config';

/** 退出码:成功 */
const EXIT_OK = 0;

/**
 * 执行 set-lang 快捷方式
 * 直接设置语言,无需交互和 adapter
 *
 * @param locale - 目标语言代码(zh/en/ja)
 * @param ui - UI 渲染器
 * @return 退出码
 * @author lvdaxianerplus
 * @date 2026-05-06
 */
export async function runSetLangShortcut(locale: string, ui: UIRenderer): Promise<number> {
  const configManager = new ConfigManager();
  configManager.ensureSettingsFile();
  const i18n = createI18n(configManager);
  await i18n.initialize();
  await i18n.setLocale(locale as 'zh' | 'en' | 'ja');

  ui.showSuccess(t('commands.setLang.success', { locale }));
  return EXIT_OK;
}
