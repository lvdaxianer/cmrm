/**
 * 翻译辅助函数模块
 * 封装翻译回退、嵌套值获取、插值替换等纯函数逻辑
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import * as fs from 'fs';
import * as path from 'path';
import { Locale, TranslateParams } from './types';

/** JSON 缩进空格数 */
const JSON_INDENT = 2;

/** 开发环境源码路径相对层级 */
const DEV_PATH_LEVEL_UP = '..';

/**
 * 获取嵌套对象值
 *
 * @param obj - 对象
 * @param key - 点分隔的 key，如 'commands.select'
 * @returns 值或 undefined
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getNestedValue(obj: Record<string, any>, key: string): any {
  const keys = key.split('.');
  let value: any = obj;

  for (const k of keys) {
    // 条件：存在嵌套属性
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    }
    // 替代：属性不存在，返回 undefined
    else {
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
 * @date 2026-05-11
 */
export function interpolate(template: string, params?: TranslateParams): string {
  // 条件：无参数
  if (!params) {
    return template;
  }
  // 替代：有参数，执行替换
  else {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }
}

/**
 * 获取语言文件路径
 *
 * @param locale - 语言代码
 * @returns 语言文件路径
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getLocalePath(locale: Locale): string {
  const localePath = path.join(__dirname, 'locales', `${locale}.json`);

  // 条件：开发环境使用 ts 源码路径
  if (!fs.existsSync(localePath)) {
    return path.join(__dirname, DEV_PATH_LEVEL_UP, 'i18n', 'locales', `${locale}.json`);
  }
  // 替代：使用默认路径
  else {
    return localePath;
  }
}

/**
 * 加载指定语言的消息文件
 *
 * @param locale - 语言代码
 * @returns 消息对象，失败时返回空对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function loadMessages(locale: Locale): Record<string, any> {
  try {
    const rawPath = getLocalePath(locale);

    // 条件：语言文件存在
    if (fs.existsSync(rawPath)) {
      const content = fs.readFileSync(rawPath, 'utf-8');
      return JSON.parse(content);
    }
    // 替代：回退到内置消息
    else {
      return getBuiltinMessages(locale);
    }
  } catch (error) {
    // 加载失败使用内置消息
    return getBuiltinMessages(locale);
  }
}

/**
 * 加载备用语言消息
 *
 * @param fallbackLocale - 备用语言代码
 * @returns 备用消息对象，加载失败返回 undefined
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function loadFallbackMessages(fallbackLocale: Locale): Record<string, any> | undefined {
  const fallbackPath = path.join(__dirname, 'locales', `${fallbackLocale}.json`);

  try {
    // 条件：备用语言文件存在
    if (fs.existsSync(fallbackPath)) {
      const content = fs.readFileSync(fallbackPath, 'utf-8');
      return JSON.parse(content);
    }
    // 替代：备用语言文件不存在
    else {
      return undefined;
    }
  } catch {
    return undefined;
  }
}

/**
 * 从备用消息中查找翻译
 *
 * @param key - 翻译 key
 * @param params - 参数
 * @param fallbackMessages - 备用消息对象
 * @returns 翻译后的字符串，未找到返回 undefined
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function tryFallbackTranslate(
  key: string,
  params: TranslateParams | undefined,
  fallbackMessages: Record<string, any>
): string | undefined {
  const value = getNestedValue(fallbackMessages, key);

  // 条件：找到有效的字符串值
  if (typeof value === 'string') {
    return interpolate(value, params);
  }
  // 替代：未找到有效值，返回 undefined
  else {
    return undefined;
  }
}

/**
 * 获取内置消息（备用）
 *
 * @param locale - 语言代码
 * @returns 内置消息对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getBuiltinMessages(locale: Locale): Record<string, any> {
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

  // 条件：存在对应语言的内置消息
  if (builtinMessages[locale]) {
    return builtinMessages[locale];
  }
  // 替代：回退到中文
  else {
    return builtinMessages.zh;
  }
}
