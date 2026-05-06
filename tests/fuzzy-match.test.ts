/**
 * 模糊匹配模块测试
 * 覆盖 fuzzy-match.ts 所有导出函数
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect, vi } from 'vitest';
import {
  isExitCommand,
  levenshteinDistance,
  findSimilarCommands,
  showCommandSuggestions,
  handleUnknownCommand,
} from '../src/cli/fuzzy-match';

describe('isExitCommand', () => {
  it('/exit 应返回 true', () => {
    expect(isExitCommand('/exit')).toBe(true);
  });

  it('/quit 应返回 true', () => {
    expect(isExitCommand('/quit')).toBe(true);
  });

  it('exit 应返回 true', () => {
    expect(isExitCommand('exit')).toBe(true);
  });

  it('quit 应返回 true', () => {
    expect(isExitCommand('quit')).toBe(true);
  });

  it('EXIT 应返回 true（不区分大小写）', () => {
    expect(isExitCommand('EXIT')).toBe(true);
  });

  it('/switch 应返回 false', () => {
    expect(isExitCommand('/switch')).toBe(false);
  });
});

describe('levenshteinDistance', () => {
  it('相同字符串距离为 0', () => {
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
  });

  it('空字符串与任意字符串距离等于字符串长度', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });

  it('两个空字符串距离为 0', () => {
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('单字符替换距离为 1', () => {
    expect(levenshteinDistance('abc', 'abd')).toBe(1);
  });

  it('单字符插入距离为 1', () => {
    expect(levenshteinDistance('abc', 'abcd')).toBe(1);
  });

  it('单字符删除距离为 1', () => {
    expect(levenshteinDistance('abcd', 'abc')).toBe(1);
  });

  it('复杂编辑距离计算正确', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });
});

describe('findSimilarCommands', () => {
  it('/swtich 应匹配 /switch', () => {
    const results = findSimilarCommands('/swtich');
    expect(results.some((r) => r.name === '/switch')).toBe(true);
  });

  it('/lis 应匹配 /list', () => {
    const results = findSimilarCommands('/lis');
    expect(results.some((r) => r.name === '/list')).toBe(true);
  });

  it('完全无关的输入不应匹配任何命令', () => {
    const results = findSimilarCommands('/xyz123');
    expect(results).toHaveLength(0);
  });
});

describe('showCommandSuggestions', () => {
  it('无匹配时应打印错误', () => {
    const printError = vi.fn();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    showCommandSuggestions('/nonexistent', printError);

    expect(printError).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('有匹配时应列出匹配项', () => {
    const printError = vi.fn();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    showCommandSuggestions('/sw', printError);

    expect(printError).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('handleUnknownCommand', () => {
  it('有相似命令时应输出推荐', () => {
    const printError = vi.fn();
    const printWarn = vi.fn();
    const printInfo = vi.fn();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    handleUnknownCommand('/swtich', printError, printWarn, printInfo);

    expect(printError).toHaveBeenCalled();
    expect(printWarn).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('无相似命令时应输出命令列表', () => {
    const printError = vi.fn();
    const printWarn = vi.fn();
    const printInfo = vi.fn();

    handleUnknownCommand('/xyz123', printError, printWarn, printInfo);

    expect(printError).toHaveBeenCalled();
    expect(printInfo).toHaveBeenCalled();
  });
});
