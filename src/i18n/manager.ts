/**
 * i18n 管理器
 * 核心类，负责语言检测、翻译功能
 *
 * @author lvdaxianerplus
 * @date 2026-05-05
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../config';
import { Locale, LocaleInfo, I18nOptions, TranslateParams } from './types';
import { GeoDetector } from './detector';

/**
 * 默认 i18n 选项
 */
const DEFAULT_OPTIONS: I18nOptions = {
  defaultLocale: 'zh',
  fallbackLocale: 'en',
};

/**
 * 可用语言列表
 */
const AVAILABLE_LOCALES: LocaleInfo[] = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
];

/**
 * i18n 管理器类
 * 管理多语言翻译功能，支持地理位置检测和手动设置
 */
export class I18nManager {
  /** 当前语言 */
  private currentLocale: Locale;

  /** 翻译消息映射 */
  private messages: Record<string, any>;

  /** 配置管理器 */
  private configManager: ConfigManager;

  /** 地理位置检测器 */
  private geoDetector: GeoDetector;

  /** i18n 选项 */
  private options: I18nOptions;

  /**
   * 构造函数
   *
   * @param configManager - 配置管理器实例
   * @param options - i18n 选项
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  constructor(configManager: ConfigManager, options: Partial<I18nOptions> = {}) {
    this.configManager = configManager;
    this.geoDetector = new GeoDetector();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.currentLocale = this.options.defaultLocale;
    this.messages = {};
  }

  /**
   * 初始化 i18n
   * 优先级: 手动设置 > 地理位置检测 > 默认语言(zh)
   *
   * @returns 初始化后的语言代码
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  async initialize(): Promise<Locale> {
    // 加载语言文件
    this.loadMessages(this.options.defaultLocale);

    // 读取用户语言配置
    const settings = this.configManager.readSettings();
    const languageConfig = settings.language || {};

    // 手动设置优先
    if (languageConfig.manual) {
      this.currentLocale = languageConfig.manual;
      this.loadMessages(this.currentLocale);
      return this.currentLocale;
    }

    // 地理位置检测
    if (languageConfig.geoDetection !== false) {
      const detectedLocale = this.detectLocaleByGeo();
      if (detectedLocale) {
        this.currentLocale = detectedLocale;
        this.loadMessages(this.currentLocale);
        return this.currentLocale;
      }
    }

    // 默认使用中文
    this.currentLocale = this.options.defaultLocale;
    this.loadMessages(this.currentLocale);
    return this.currentLocale;
  }

  /**
   * 获取当前语言
   *
   * @returns 当前语言代码
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  getLocale(): Locale {
    return this.currentLocale;
  }

  /**
   * 设置语言（写入配置）
   *
   * @param locale - 要设置的语言代码
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  async setLocale(locale: Locale): Promise<void> {
    this.currentLocale = locale;
    this.loadMessages(locale);

    // 更新配置
    const settings = this.configManager.readSettings();
    if (!settings.language) {
      settings.language = {};
    }
    settings.language.manual = locale;

    // 写入配置文件
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const settingsPath = path.join(os.homedir(), '.cmrm', 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  }

  /**
   * 翻译函数
   *
   * @param key - 翻译 key，如 'commands.select'
   * @param params - 替换参数，如 { max: 10 }
   * @returns 翻译后的字符串
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  t(key: string, params?: TranslateParams): string {
    const keys = key.split('.');
    let value: any = this.messages;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // 尝试备用语言
        return this.tWithFallback(key, params);
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // 替换参数
    return this.interpolate(value, params);
  }

  /**
   * 获取所有可用语言列表
   *
   * @returns 语言信息列表
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  getAvailableLocales(): LocaleInfo[] {
    return AVAILABLE_LOCALES;
  }

  /**
   * 检测地理位置并返回推荐语言
   *
   * @returns 检测到的语言，检测失败返回 null
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  detectLocaleByGeo(): Locale | null {
    // 注意：这里需要外部传入坐标
    // 当前实现返回 null，外部可通过 detectByCoordinates 主动调用
    return null;
  }

  /**
   * 根据 GPS 坐标检测语言
   * 供外部调用，用于交互式获取用户位置
   *
   * @param latitude - 纬度
   * @param longitude - 经度
   * @returns 检测到的语言代码，检测失败默认返回 'zh'
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  detectByCoordinates(latitude: number, longitude: number): Locale {
    return this.geoDetector.detectByCoordinates(latitude, longitude);
  }

  /**
   * 加载指定语言的消息文件
   *
   * @param locale - 语言代码
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  private loadMessages(locale: Locale): void {
    try {
      const localePath = path.join(__dirname, 'locales', `${locale}.json`);

      // 开发环境使用 ts 源码路径
      const rawPath = fs.existsSync(localePath)
        ? localePath
        : path.join(__dirname, '..', 'i18n', 'locales', `${locale}.json`);

      if (fs.existsSync(rawPath)) {
        const content = fs.readFileSync(rawPath, 'utf-8');
        this.messages = JSON.parse(content);
      } else {
        // 回退到内置消息
        this.messages = this.getBuiltinMessages(locale);
      }
    } catch (error) {
      // 加载失败使用内置消息
      this.messages = this.getBuiltinMessages(locale);
    }
  }

  /**
   * 尝试使用备用语言翻译
   *
   * @param key - 翻译 key
   * @param params - 参数
   * @returns 翻译后的字符串
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  private tWithFallback(key: string, params?: TranslateParams): string {
    const fallbackLocale = this.options.fallbackLocale;

    if (this.currentLocale !== fallbackLocale) {
      const fallbackPath = path.join(__dirname, 'locales', `${fallbackLocale}.json`);

      try {
        if (fs.existsSync(fallbackPath)) {
          const content = fs.readFileSync(fallbackPath, 'utf-8');
          const fallbackMessages = JSON.parse(content);
          const value = this.getNestedValue(fallbackMessages, key);

          if (typeof value === 'string') {
            return this.interpolate(value, params);
          }
        }
      } catch {
        // 忽略备用语言加载错误
      }
    }

    // 都失败返回 key
    return key;
  }

  /**
   * 获取嵌套对象值
   *
   * @param obj - 对象
   * @param key - 点分隔的 key，如 'commands.select'
   * @returns 值或 undefined
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  private getNestedValue(obj: Record<string, any>, key: string): any {
    const keys = key.split('.');
    let value: any = obj;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * 插值替换参数
   *
   * @param template - 模板字符串
   * @param params - 参数
   * @returns 替换后的字符串
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  private interpolate(template: string, params?: TranslateParams): string {
    if (!params) {
      return template;
    }

    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  /**
   * 获取内置消息（备用）
   *
   * @param locale - 语言代码
   * @returns 内置消息对象
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  private getBuiltinMessages(locale: Locale): Record<string, any> {
    const builtinMessages: Record<Locale, Record<string, any>> = {
      zh: {
        app: { name: '模型注册管理器', welcome: 'Model Registry Manager (cmrm) - 多工具支持' },
        commands: { select: '选择命令', enterIndex: '请输入命令索引:', exit: '退出程序', goodbye: '再见!' },
        errors: { configNotFound: '配置文件不存在', initFailed: '初始化失败' },
        tools: { selectTool: '选择工具', selectModel: '选择 {tool} 模型' },
        messages: { initialized: '配置文件已创建: {path}', editApiKey: '请编辑文件添加您的 API keys' },
      },
      en: {
        app: { name: 'Model Registry Manager', welcome: 'Model Registry Manager (cmrm) - Multi-tool support' },
        commands: { select: 'Select Command', enterIndex: 'Enter command index:', exit: 'Exit program', goodbye: 'Goodbye!' },
        errors: { configNotFound: 'Configuration file not found', initFailed: 'Initialization failed' },
        tools: { selectTool: 'Select Tool', selectModel: 'Select {tool} Model' },
        messages: { initialized: 'Configuration file created at: {path}', editApiKey: 'Please edit the file to add your API keys.' },
      },
      ja: {
        app: { name: 'モデルレジストリマネージャー', welcome: 'Model Registry Manager (cmrm) - マルチツールサポート' },
        commands: { select: 'コマンド選択', enterIndex: 'コマンドインデックスを入力:', exit: 'プログラム終了', goodbye: 'さようなら!' },
        errors: { configNotFound: '設定ファイルが見つかりません', initFailed: '初期化に失敗しました' },
        tools: { selectTool: 'ツールを選択', selectModel: '{tool} モデルを選択' },
        messages: { initialized: '設定ファイルが作成されました: {path}', editApiKey: 'ファイルを編集してAPIキーを追加してください。' },
      },
    };

    return builtinMessages[locale] || builtinMessages.zh;
  }
}
