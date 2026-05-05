/**
 * i18n 模块导出
 *
 * @author lvdaxianerplus
 * @date 2026-05-05
 */

export { I18nManager } from './manager';
export { GeoDetector, geoDetector } from './detector';
export type { Locale, LocaleInfo, I18nOptions, LanguageConfig, TranslateParams } from './types';
export { handleSetLang } from './commands/set-lang';

/**
 * 创建 i18n 管理器实例
 *
 * @param configManager - 配置管理器实例
 * @returns I18nManager 实例
 * @author lvdaxianerplus
 * @date 2026-05-05
 */
import { I18nManager } from './manager';
import { ConfigManager } from '../config';
import { TranslateParams } from './types';

let i18nInstance: I18nManager | null = null;

export function createI18n(configManager: ConfigManager): I18nManager {
  i18nInstance = new I18nManager(configManager);
  return i18nInstance;
}

/**
 * 获取全局 i18n 实例
 *
 * @returns I18nManager 实例
 * @throws Error 如果实例未创建
 * @author lvdaxianerplus
 * @date 2026-05-05
 */
export function getI18n(): I18nManager {
  if (!i18nInstance) {
    throw new Error('i18n not initialized. Call createI18n first.');
  }
  return i18nInstance;
}

/**
 * 全局翻译函数
 * 安全版本：如果 i18n 未初始化，返回 key 本身
 *
 * @param key - 翻译 key
 * @param params - 替换参数
 * @returns 翻译后的字符串或 key 本身
 * @author lvdaxianerplus
 * @date 2026-05-05
 */
export function t(key: string, params?: TranslateParams): string {
  if (!i18nInstance) {
    return key;
  }
  return i18nInstance.t(key, params);
}
