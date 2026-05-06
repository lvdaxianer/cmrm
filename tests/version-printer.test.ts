/**
 * 版本号输出测试
 * 覆盖 version-printer.ts
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect, vi } from 'vitest';
import { printVersion } from '../src/cli/version-printer';

describe('printVersion', () => {
  it('应输出版本号', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    printVersion();

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('cmrm v');
    consoleSpy.mockRestore();
  });
});
