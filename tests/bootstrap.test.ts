/**
 * CLI 启动分发测试
 * 覆盖 bootstrap.ts 各分支
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bootstrap, startInteractiveCli, startShortcut } from '../src/cli/bootstrap';

vi.mock('../src/cli/argv-parser', () => ({
  parseArgv: vi.fn(),
}));

vi.mock('../src/cli/shortcut-runner', () => ({
  runShortcut: vi.fn().mockResolvedValue(0),
}));

import { parseArgv } from '../src/cli/argv-parser';
import { runShortcut } from '../src/cli/shortcut-runner';

let exitSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
});

afterEach(() => {
  exitSpy.mockRestore();
  vi.clearAllMocks();
});

describe('startInteractiveCli', () => {
  it('应启动 CLI', () => {
    const mockStart = vi.fn().mockResolvedValue(undefined);
    const createCli = () => ({ start: mockStart } as any);

    startInteractiveCli(createCli);

    expect(mockStart).toHaveBeenCalled();
  });
});

describe('startShortcut', () => {
  it('应执行快捷方式并退出', async () => {
    const parsed = { kind: 'help' } as any;

    startShortcut(parsed);
    await new Promise((r) => setTimeout(r, 10));

    expect(runShortcut).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

describe('bootstrap', () => {
  it('interactive 分支应启动交互式 CLI', () => {
    vi.mocked(parseArgv).mockReturnValue({ kind: 'interactive' });
    const mockStart = vi.fn().mockResolvedValue(undefined);
    const createCli = () => ({ start: mockStart } as any);

    bootstrap(createCli);

    expect(mockStart).toHaveBeenCalled();
  });

  it('help 分支应启动快捷方式', async () => {
    vi.mocked(parseArgv).mockReturnValue({ kind: 'help' });

    bootstrap(() => ({ start: vi.fn() } as any));
    await new Promise((r) => setTimeout(r, 20));

    expect(runShortcut).toHaveBeenCalled();
  });

  it('version 分支应启动快捷方式', async () => {
    vi.mocked(parseArgv).mockReturnValue({ kind: 'version' });

    bootstrap(() => ({ start: vi.fn() } as any));
    await new Promise((r) => setTimeout(r, 20));

    expect(runShortcut).toHaveBeenCalled();
  });
});
