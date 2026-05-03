/**
 * 主菜单顶部快捷方式横幅测试
 * 验证 printShortcutBanner 输出的行数与关键文本
 *
 * 测试目标:
 *  - 至少打印 4 行(3 条快捷方式 + 1 行空行)
 *  - 输出文本应包含 cmrm switch / cmrm test / cmrm --help 三个关键字
 *  - 调用过程不抛异常
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printShortcutBanner } from '../src/cli/shortcut-banner';

/**
 * 每个用例前重置 console.log 监听,避免污染其它用例
 */
let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  logSpy.mockRestore();
});

/**
 * 行数与是否抛异常的基础校验
 */
describe('printShortcutBanner - 行数与异常', () => {
  // 至少打印 4 行(3 条快捷命令 + 1 行结尾空行)
  it('应至少调用 console.log 4 次', () => {
    printShortcutBanner();

    expect(logSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  // 调用过程不抛异常
  it('调用过程不应抛出异常', () => {
    expect(() => printShortcutBanner()).not.toThrow();
  });
});

/**
 * 输出文本关键字校验
 */
describe('printShortcutBanner - 文本内容', () => {
  /**
   * 把所有 console.log 调用拼成一个字符串,便于子串匹配
   *
   * @return 拼接后的全部输出文本
   * @author lvdaxianerplus
   * @date 2026-05-03
   */
  function joinAllOutput(): string {
    return logSpy.mock.calls
      .map((args) => args.join(' '))
      .join('\n');
  }

  // 关键字:cmrm switch
  it('输出应包含 "cmrm switch <name>"', () => {
    printShortcutBanner();

    expect(joinAllOutput()).toContain('cmrm switch <name>');
  });

  // 关键字:cmrm test
  it('输出应包含 "cmrm test <name>"', () => {
    printShortcutBanner();

    expect(joinAllOutput()).toContain('cmrm test <name>');
  });

  // 关键字:cmrm --help
  it('输出应包含 "cmrm --help"', () => {
    printShortcutBanner();

    expect(joinAllOutput()).toContain('cmrm --help');
  });

  // 首行应带 "Shortcuts:" 前缀以提示用户
  it('首行应带 "Shortcuts:" 前缀', () => {
    printShortcutBanner();

    expect(joinAllOutput()).toContain('Shortcuts:');
  });
});
