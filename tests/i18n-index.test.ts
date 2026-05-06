/**
 * i18n 模块导出测试
 * 覆盖 index.ts 中未初始化的分支
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect, vi } from 'vitest';

describe('i18n index - uninitialized', () => {
  it('未初始化时 getI18n 应抛出错误', async () => {
    vi.resetModules();
    const { getI18n } = await import('../src/i18n');
    expect(() => getI18n()).toThrow('i18n not initialized');
  });

  it('未初始化时 t 应返回 key', async () => {
    vi.resetModules();
    const { t } = await import('../src/i18n');
    expect(t('test.key')).toBe('test.key');
    expect(t('test.key', { param: 'value' })).toBe('test.key');
  });
});
