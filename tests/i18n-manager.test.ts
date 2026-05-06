/**
 * i18n 管理器测试
 * 覆盖 I18nManager 所有方法分支
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { I18nManager } from '../src/i18n/manager';
import { ConfigManager } from '../src/config';

vi.mock('fs');

const mockConfigManager = {
  readSettings: vi.fn(),
  saveSettings: vi.fn(),
} as unknown as ConfigManager;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('I18nManager - initialize', () => {
  it('手动设置语言时应使用该语言', async () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({
      language: { manual: 'en' },
    });
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);
    const locale = await i18n.initialize();

    expect(locale).toBe('en');
    expect(i18n.getLocale()).toBe('en');
  });

  it('无手动设置时应使用默认语言', async () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({});
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);
    const locale = await i18n.initialize();

    expect(locale).toBe('zh');
  });

  it('settings.json 不存在时应降级到默认中文,不抛错', async () => {
    vi.mocked(mockConfigManager.readSettings).mockImplementation(() => {
      throw new Error('Settings file not found');
    });
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);
    const locale = await i18n.initialize();

    expect(locale).toBe('zh');
    expect(i18n.getLocale()).toBe('zh');
    expect(i18n.t('app.name')).toBe('模型注册管理器');
  });

  it('geoDetection 为 false 时应跳过地理检测', async () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({
      language: { geoDetection: false },
    });
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);
    const locale = await i18n.initialize();

    expect(locale).toBe('zh');
  });

  it('地理检测成功时应使用检测到的语言', async () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({});
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);
    // Mock detectLocaleByGeo 返回非 null
    vi.spyOn(i18n, 'detectLocaleByGeo').mockReturnValue('ja');

    const locale = await i18n.initialize();

    expect(locale).toBe('ja');
  });
});

describe('I18nManager - t', () => {
  it('应返回正确的翻译', async () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({});
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);
    await i18n.initialize();

    expect(i18n.t('commands.select')).toBe('选择命令');
  });

  it('应支持参数替换', async () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({});
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);
    await i18n.initialize();

    expect(i18n.t('commands.invalidIndex', { max: 5 })).toContain('5');
  });

  it('不存在的 key 应返回 key 本身', async () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({});
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);
    await i18n.initialize();

    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('嵌套 key 不存在时应返回 fallback', async () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({
      language: { manual: 'en' },
    });
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);
    await i18n.initialize();

    expect(i18n.t('app.name')).toBe('Model Registry Manager');
  });

  it('key 对应值为对象时应返回 key', async () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({});
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);
    await i18n.initialize();

    expect(i18n.t('app')).toBe('app');
  });

  it('fallback 语言翻译成功时应返回 fallback 值', async () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({
      language: { manual: 'ja' },
    });
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);
    await i18n.initialize();

    expect(i18n.t('app.name')).toBe('モデルレジストリマネージャー');
  });
});

describe('I18nManager - setLocale', () => {
  it('应设置语言并写入配置', async () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({});
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);
    await i18n.initialize();
    await i18n.setLocale('ja');

    expect(i18n.getLocale()).toBe('ja');
  });
});

describe('I18nManager - getAvailableLocales', () => {
  it('应返回所有可用语言', () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({});
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);
    const locales = i18n.getAvailableLocales();

    expect(locales).toHaveLength(3);
    expect(locales.map(l => l.code)).toContain('zh');
    expect(locales.map(l => l.code)).toContain('en');
    expect(locales.map(l => l.code)).toContain('ja');
  });
});

describe('I18nManager - detectLocaleByGeo', () => {
  it('默认应返回 null', () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({});
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);

    expect(i18n.detectLocaleByGeo()).toBeNull();
  });
});

describe('I18nManager - loadMessages error handling', () => {
  it('语言文件读取失败时应使用内置消息', async () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({});
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('read failed');
    });

    const i18n = new I18nManager(mockConfigManager);
    await i18n.initialize();

    expect(i18n.t('app.name')).toBe('模型注册管理器');
  });
});

describe('I18nManager - detectByCoordinates', () => {
  it('应通过坐标检测语言', () => {
    vi.mocked(mockConfigManager.readSettings).mockReturnValue({});
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const i18n = new I18nManager(mockConfigManager);

    expect(i18n.detectByCoordinates(39, 116)).toBe('zh');
    expect(i18n.detectByCoordinates(35, 140)).toBe('ja');
    expect(i18n.detectByCoordinates(37, -122)).toBe('en');
  });
});
