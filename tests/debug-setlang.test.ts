import { describe, it, vi } from 'vitest';
import inquirer from 'inquirer';
import { handleSetLang } from '../src/i18n/commands/set-lang';

describe('debug', () => {
  it('should spyOn inquirer.prompt', async () => {
    console.log('before spy, prompt is mock:', (inquirer as any).prompt?._isMockFunction);
    const spy = vi.spyOn(inquirer as any, 'prompt').mockResolvedValue({ index: '1' });
    console.log('after spy, prompt is mock:', (inquirer as any).prompt?._isMockFunction);
    
    const mockI18n = {
      getAvailableLocales: vi.fn(() => [{ code: 'zh', name: '中文' }, { code: 'en', name: 'English' }]),
      getLocale: vi.fn(() => 'zh'),
      t: vi.fn((key: string) => key),
      setLocale: vi.fn().mockResolvedValue(undefined),
    } as any;
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await handleSetLang(mockI18n);
    consoleSpy.mockRestore();
    spy.mockRestore();
  });
});
