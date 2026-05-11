/**
 * i18n 管理器
 * 核心类，负责语言检测、翻译功能
 *
 * @author lvdaxianerplus
 * @date 2026-05-05
 */

import { ConfigManager } from '../config';
import { Locale, LocaleInfo, I18nOptions, TranslateParams } from './types';
import { LocaleDetector } from './locale-detector';
import {
  loadMessages,
  loadFallbackMessages,
  tryFallbackTranslate,
  getNestedValue,
  interpolate,
} from './translation-helpers';

/** 默认 i18n 选项 */
const DEFAULT_OPTIONS: I18nOptions = {
  defaultLocale: 'zh',
  fallbackLocale: 'en',
};

/** 可用语言列表 */
const AVAILABLE_LOCALES: LocaleInfo[] = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
];

/** i18n 管理器类
 * 管理多语言翻译功能，支持地理位置检测和手动设置
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export class I18nManager {
  /** 当前语言 */
  private currentLocale: Locale;

  /** 翻译消息映射 */
  private messages: Record<string, any>;

  /** 配置管理器 */
  private configManager: ConfigManager;

  /** 语言环境检测器 */
  private localeDetector: LocaleDetector;

  /** i18n 选项 */
  private options: I18nOptions;

  /**
   * 构造函数
   *
   * @param configManager - 配置管理器实例
   * @param options - i18n 选项
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  constructor(configManager: ConfigManager, options: Partial<I18nOptions> = {}) {
    this.configManager = configManager;
    this.localeDetector = new LocaleDetector();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.currentLocale = this.options.defaultLocale;
    this.messages = {};
  }

  /**
   * 安全读取语言配置
   * settings.json 不存在或解析失败时返回空配置,确保 i18n 可降级到默认中文
   *
   * @returns 语言配置对象,失败时返回空对象
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private readLanguageConfigSafely(): { manual?: Locale; isGeoDetectionEnabled?: boolean } {
    try {
      const settings = this.configManager.readSettings();
      return settings.language || {};
    }
    // 配置文件缺失/损坏:返回空配置,让 initialize 落到默认中文
    catch {
      return {};
    }
  }

  /**
   * 应用语言设置
   *
   * @param locale - 要设置的语言
   * @returns 设置后的语言代码
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private applyLocale(locale: Locale): Locale {
    this.currentLocale = locale;
    this.messages = loadMessages(this.currentLocale);
    return this.currentLocale;
  }

  /**
   * 初始化 i18n
   * 优先级: 手动设置 > 地理位置检测 > 默认语言(zh)
   * 配置文件不存在或读取失败时静默降级为默认中文,不抛错
   *
   * @returns 初始化后的语言代码
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  async initialize(): Promise<Locale> {
    // 加载默认语言文件作为兜底
    this.messages = loadMessages(this.options.defaultLocale);

    // 读取用户语言配置(失败则使用空对象,让后续逻辑落到默认 zh)
    const languageConfig = this.readLanguageConfigSafely();

    // 条件：手动设置优先
    if (languageConfig.manual) {
      return this.applyLocale(languageConfig.manual);
    }
    // 替代：无手动设置，继续检测地理位置
    else {
      // 继续检测地理位置
    }

    // 条件：地理位置检测未禁用
    if (languageConfig.isGeoDetectionEnabled !== false) {
      const detectedLocale = this.localeDetector.tryDetectLocale();
      // 条件：地理位置检测成功
      if (detectedLocale) {
        return this.applyLocale(detectedLocale);
      }
      // 替代：地理位置检测失败，使用默认语言
      else {
        // 地理位置检测失败，使用默认语言
      }
    }
    // 替代：地理位置检测已禁用
    else {
      // 地理位置检测已禁用
    }

    // 默认使用中文(defaultLocale)
    return this.applyLocale(this.options.defaultLocale);
  }

  /**
   * 获取当前语言
   *
   * @returns 当前语言代码
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  getLocale(): Locale {
    return this.currentLocale;
  }

  /**
   * 设置语言（写入配置）
   *
   * @param locale - 要设置的语言代码
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  async setLocale(locale: Locale): Promise<void> {
    this.currentLocale = locale;
    this.messages = loadMessages(locale);

    // 更新配置
    const settings = this.configManager.readSettings();
    // 条件：language 对象不存在
    if (!settings.language) {
      settings.language = {};
    }
    // 替代：language 已存在
    else {
      // language 对象已存在
    }
    settings.language.manual = locale;

    // 统一保存(自动备份)
    this.configManager.saveSettings(settings);
  }

  /**
   * 翻译函数
   *
   * @param key - 翻译 key，如 'commands.select'
   * @param params - 替换参数，如 { max: 10 }
   * @returns 翻译后的字符串
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  t(key: string, params?: TranslateParams): string {
    const keys = key.split('.');
    let value: any = this.messages;

    for (const k of keys) {
      // 条件：存在嵌套属性
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      }
      // 替代：属性不存在，尝试备用语言
      else {
        return this.tWithFallback(key, params);
      }
    }

    // 条件：值不是字符串
    if (typeof value !== 'string') {
      return key;
    }
    // 替代：值是字符串，执行插值替换
    else {
      return interpolate(value, params);
    }
  }

  /**
   * 获取所有可用语言列表
   *
   * @returns 语言信息列表
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  getAvailableLocales(): LocaleInfo[] {
    return AVAILABLE_LOCALES;
  }

  /**
   * 根据 GPS 坐标检测语言
   * 供外部调用，用于交互式获取用户位置
   *
   * @param latitude - 纬度
   * @param longitude - 经度
   * @returns 检测到的语言代码，检测失败默认返回 'zh'
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  detectByCoordinates(latitude: number, longitude: number): Locale {
    return this.localeDetector.detectByCoordinates(latitude, longitude);
  }

  /**
   * 尝试使用备用语言翻译
   *
   * @param key - 翻译 key
   * @param params - 参数
   * @returns 翻译后的字符串
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private tWithFallback(key: string, params?: TranslateParams): string {
    const fallbackLocale = this.options.fallbackLocale;

    // 条件：当前语言与备用语言不同
    if (this.currentLocale !== fallbackLocale) {
      const fallbackMessages = loadFallbackMessages(fallbackLocale);

      // 条件：备用消息加载成功
      if (fallbackMessages) {
        const result = tryFallbackTranslate(key, params, fallbackMessages);
        // 条件：备用翻译成功
        if (result !== undefined) {
          return result;
        }
        // 替代：备用翻译失败
        else {
          // 备用语言中未找到对应 key
        }
      }
      // 替代：备用消息加载失败
      else {
        // 备用语言文件加载失败
      }
    }
    // 替代：当前语言与备用语言相同
    else {
      // 无需尝试备用语言
    }

    // 都失败返回 key
    return key;
  }
}
