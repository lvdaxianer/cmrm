/**
 * /set-lang 命令测试
 * 覆盖 handleSetLang 各分支
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import inquirer from 'inquirer';
import { handleSetLang } from '../src/i18n/commands/set-lang';

let promptSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  promptSpy = vi.spyOn(inquirer as any, 'prompt').mockResolvedValue({ index: '1' });
});

afterEach(() => {
  promptSpy?.mockRestore();
});

describe('handleSetLang', () => {
  it('应选择并设置语言', async () => {
    const mockI18n = {
      getAvailableLocales: vi.fn(() => [
        { code: 'zh', name: '中文' },
        { code: 'en', name: 'English' },
        { code: 'ja', name: '日本語' },
      ]),
      getLocale: vi.fn(() => 'zh'),
      t: vi.fn((key: string) => key),
      setLocale: vi.fn().mockResolvedValue(undefined),
    } as any;

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await handleSetLang(mockI18n);

    expect(mockI18n.setLocale).toHaveBeenCalledWith('en');
    consoleSpy.mockRestore();
  });

  it('应处理无效索引验证', async () => {
    const mockI18n = {
      getAvailableLocales: vi.fn(() => [
        { code: 'zh', name: '中文' },
        { code: 'en', name: 'English' },
      ]),
      getLocale: vi.fn(() => 'zh'),
      t: vi.fn((key: string, params?: any) => {
        if (params) return `\${key}:\${JSON.stringify(params)}`;
        return key;
      }),
      setLocale: vi.fn().mockResolvedValue(undefined),
    } as any;

    let validateResult: string | boolean = true;
    promptSpy.mockImplementation((questions: any) => {
      if (questions && questions[0] && questions[0].validate) {
        validateResult = questions[0].validate('5');
      }
      return Promise.resolve({ index: '0' });
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await handleSetLang(mockI18n);

    expect(typeof validateResult).toBe('string');
    consoleSpy.mockRestore();
  });
});
