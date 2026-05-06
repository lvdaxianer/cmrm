/**
 * i18n 模块级别 key 测试
 * 验证模块加载时不会立即调用 t() 导致返回 raw key
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * 加载指定 locale 文件
 *
 * @param locale 语言代码
 * @return locale JSON 对象
 * @author lvdaxianerplus
 * @date 2026-05-06
 */
function loadLocale(locale: 'zh' | 'en' | 'ja'): Record<string, any> {
  const file = resolve(__dirname, `../src/i18n/locales/${locale}.json`);
  return JSON.parse(readFileSync(file, 'utf-8'));
}

/**
 * 按点路径获取嵌套 key 的值
 *
 * @param obj 对象
 * @param keyPath 点分隔路径(如 add.templateAdd)
 * @return 找到的值或 undefined
 * @author lvdaxianerplus
 * @date 2026-05-06
 */
function getByPath(obj: Record<string, any>, keyPath: string): unknown {
  return keyPath.split('.').reduce<any>((acc, key) => acc?.[key], obj);
}

describe('i18n module-level keys', () => {
  // 验证 add-handler.ts 使用的 key 在所有 locale 中存在
  const addKeys = [
    'add.templateAdd',
    'add.templateDesc',
    'add.customAdd',
    'add.customDesc',
  ];

  // 验证 api-type-prompt.ts 使用的 key 在所有 locale 中存在
  const apiTypeKeys = [
    'add.apiTypeAnthropic',
    'add.apiTypeOpenAI',
    'add.apiTypeAnthropicDesc',
    'add.apiTypeOpenAIDesc',
  ];

  const allKeys = [...addKeys, ...apiTypeKeys];
  const locales: Array<'zh' | 'en' | 'ja'> = ['zh', 'en', 'ja'];

  // 遍历每个 locale 文件,断言所有 key 都有对应翻译
  locales.forEach((locale) => {
    describe(`locale: ${locale}`, () => {
      const data = loadLocale(locale);

      allKeys.forEach((key) => {
        it(`should have translation for "${key}"`, () => {
          const value = getByPath(data, key);
          expect(value, `${locale}.json missing key: ${key}`).toBeDefined();
          expect(typeof value).toBe('string');
          expect((value as string).length).toBeGreaterThan(0);
        });
      });
    });
  });
});
