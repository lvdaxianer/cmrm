import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runSetLangShortcut } from '../src/cli/set-lang-shortcut';

const ensureSettingsFile = vi.fn();
const setLocale = vi.fn().mockResolvedValue(undefined);

vi.mock('../src/config', () => ({
  ConfigManager: class MockConfigManager {
    ensureSettingsFile() {
      return ensureSettingsFile();
    }
  },
}));

vi.mock('../src/i18n', () => ({
  createI18n: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    setLocale,
  })),
  t: vi.fn((key: string, params?: Record<string, string>) => {
    if (key === 'commands.setLang.success' && params?.locale) {
      return `set ${params.locale} success`;
    }
    return key;
  }),
}));

describe('runSetLangShortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('首启时应先确保 settings 文件存在再设置语言', async () => {
    const ui = {
      showSuccess: vi.fn(),
    } as any;

    const code = await runSetLangShortcut('en', ui);

    expect(ensureSettingsFile).toHaveBeenCalled();
    expect(setLocale).toHaveBeenCalledWith('en');
    expect(ui.showSuccess).toHaveBeenCalled();
    expect(code).toBe(0);
  });
});
