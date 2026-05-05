/**
 * i18n 类型定义
 * 定义多语言支持所需的核心类型
 *
 * @author lvdaxianerplus
 * @date 2026-05-05
 */

/**
 * 支持的语言代码
 */
export type Locale = 'zh' | 'en' | 'ja';

/**
 * 语言配置接口
 */
export interface LanguageConfig {
  /** 手动设置的语言代码，优先级高于地理位置检测 */
  manual?: Locale;
  /** 是否启用地理位置检测（默认 true） */
  geoDetection?: boolean;
}

/**
 * i18n 选项接口
 */
export interface I18nOptions {
  /** 默认语言 */
  defaultLocale: Locale;
  /** 备用语言（当默认语言文件缺少 key 时） */
  fallbackLocale: Locale;
}

/**
 * 可用语言信息
 */
export interface LocaleInfo {
  /** 语言代码 */
  code: Locale;
  /** 语言显示名称 */
  name: string;
}

/**
 * 翻译参数
 */
export type TranslateParams = Record<string, string | number | boolean>;
