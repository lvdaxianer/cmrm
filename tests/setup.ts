/**
 * Vitest 测试初始化
 * 在所有测试前初始化 i18n 系统
 *
 * @author lvdaxianerplus
 * @date 2026-05-05
 */

import { beforeAll, vi } from 'vitest';
import { createI18n } from '../src/i18n';
import { ConfigManager } from '../src/config';

// Mock ConfigManager
const mockConfigManager = {
  getSettings: () => ({ language: { manual: 'zh', geoDetection: true } }),
  readSettings: () => ({ language: { manual: 'zh', geoDetection: true } }),
  saveSettings: () => {},
  hasSettingsFile: () => true,
} as unknown as ConfigManager;

// 初始化 i18n (同步初始化，仅加载默认语言)
beforeAll(async () => {
  const i18n = createI18n(mockConfigManager);
  await i18n.initialize();
});
