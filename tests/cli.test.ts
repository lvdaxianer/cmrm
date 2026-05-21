/**
 * CLI 类测试
 * 覆盖 CLI 类的主要方法分支
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CLI } from '../src/cli';

/** 当前命令菜单中 /exit 的索引 */
const EXIT_COMMAND_INDEX = '10';

vi.mock('readline', () => ({
  createInterface: vi.fn(() => ({
    close: vi.fn(),
    on: vi.fn(),
    question: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
  emitKeypressEvents: vi.fn(),
}));

vi.mock('../src/cli/readline-helper', () => ({
  createReadlineInterface: vi.fn(() => ({
    close: vi.fn(),
    on: vi.fn(),
    question: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
  prepareForInquirer: vi.fn(),
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ index: '10' }),
  },
}));

let mockHasSettingsFile = true;
let mockEnsureSettingsCreated = false;
const mockEnsureSettingsFile = vi.fn(() => mockEnsureSettingsCreated);

vi.mock('../src/config', () => ({
  ConfigManager: class MockConfigManager {
    hasSettingsFile() { return mockHasSettingsFile; }
    initializeSettings() {}
    ensureSettingsFile() { return mockEnsureSettingsFile(); }
    getSettingsPath() { return '/home/test/.cmrm/settings.json'; }
    readSettings() { return {}; }
    saveToolModel() {}
    getToolModels() { return []; }
  },
}));

vi.mock('../src/i18n', () => ({
  createI18n: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    t: vi.fn((key: string) => key),
    getLocale: vi.fn(() => 'zh'),
    getAvailableLocales: vi.fn(() => [
      { code: 'zh', name: '中文' },
      { code: 'en', name: 'English' },
      { code: 'ja', name: '日本語' },
    ]),
    setLocale: vi.fn().mockResolvedValue(undefined),
  })),
  t: vi.fn((key: string) => key),
  getI18n: vi.fn(() => ({
    t: vi.fn((key: string) => key),
    getLocale: vi.fn(() => 'zh'),
    setLocale: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../src/adapters', () => ({
  registry: {
    register: vi.fn(),
    getToolNames: vi.fn(() => ['claude']),
    getAllAdapters: vi.fn(() => [
      {
        name: 'claude',
        displayName: 'Claude',
        getSavedModels: vi.fn(() => []),
        readCurrentModel: vi.fn(() => null),
      },
    ]),
    getAdapter: vi.fn(() => ({
      name: 'claude',
      displayName: 'Claude',
      getSavedModels: vi.fn(() => []),
      readCurrentModel: vi.fn(() => null),
    })),
  },
  ClaudeAdapter: vi.fn().mockImplementation(function () {
    return {
      name: 'claude',
      displayName: 'Claude',
    };
  }),
  CodexAdapter: vi.fn().mockImplementation(function () {
    return {
      name: 'codex',
      displayName: 'Codex',
    };
  }),
}));

let mockTemplateInitResult: string | Promise<string> = 'remote';

vi.mock('../src/cli/template-manager', () => ({
  templateManager: {
    initializeDefaults: vi.fn().mockImplementation(() => Promise.resolve(mockTemplateInitResult)),
    getTemplatesPath: vi.fn(() => '/home/test/.cmrm/templates.json'),
  },
}));

vi.mock('../src/cli/shortcut-banner', () => ({
  printShortcutBanner: vi.fn(),
}));

vi.mock('../src/cli/operation-orchestrator', () => ({
  showToolSelection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/i18n/commands/set-lang', () => ({
  handleSetLang: vi.fn().mockResolvedValue(undefined),
}));

let exitSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockHasSettingsFile = true;
  mockEnsureSettingsCreated = false;
  mockTemplateInitResult = 'remote';
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
});

afterEach(() => {
  vi.clearAllMocks();
  exitSpy?.mockRestore();
});

describe('CLI - constructor', () => {
  it('应成功实例化', () => {
    const cli = new CLI();
    expect(cli).toBeDefined();
  });
});

describe('CLI - start', () => {
  it('应启动并显示欢迎信息', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();

    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '10' });

    await cli.start();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('无配置文件时应初始化', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    mockEnsureSettingsCreated = true;

    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '10' });

    const cli = new CLI();
    await cli.start();

    expect(consoleSpy).toHaveBeenCalled();
    expect(mockEnsureSettingsFile).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('CLI - handleInput', () => {
  it('应处理 /list 命令', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '10' });

    await (cli as any).inputHandler.handleInput('/list');

    consoleSpy.mockRestore();
  });

  it('应处理 /current 命令', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '10' });

    await (cli as any).inputHandler.handleInput('/current');

    consoleSpy.mockRestore();
  });

  it('应处理 /set-lang 命令', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '10' });

    await (cli as any).inputHandler.handleInput('/set-lang');

    consoleSpy.mockRestore();
  });

  it('应处理 /exit 命令', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    const cli = new CLI();

    await (cli as any).inputHandler.handleInput('/exit');

    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('应处理空输入', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '10' });

    await (cli as any).inputHandler.handleInput('');

    consoleSpy.mockRestore();
  });

  it('应处理未知命令前缀', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '10' });

    await (cli as any).inputHandler.handleInput('/unknown');

    consoleSpy.mockRestore();
  });

  it('应处理完全未知输入', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '10' });

    await (cli as any).inputHandler.handleInput('random text');

    consoleSpy.mockRestore();
  });
});

describe('CLI - completer', () => {
  it('命令前缀应返回匹配命令', () => {
    const cli = new CLI();
    const result = (cli as any).completer('/sw');

    expect(result[0]).toContain('/switch');
  });

  it('非命令前缀应返回所有命令', () => {
    const cli = new CLI();
    const result = (cli as any).completer('');

    expect(result[0].length).toBeGreaterThan(0);
  });
});

describe('CLI - isToolSelectionCommand', () => {
  it('应识别工具选择命令', () => {
    const cli = new CLI();

    expect((cli as any).inputHandler.isToolSelectionCommand('/switch')).toBe(true);
    expect((cli as any).inputHandler.isToolSelectionCommand('/add')).toBe(true);
    expect((cli as any).inputHandler.isToolSelectionCommand('/edit')).toBe(true);
    expect((cli as any).inputHandler.isToolSelectionCommand('/remove')).toBe(true);
    expect((cli as any).inputHandler.isToolSelectionCommand('/info')).toBe(true);
    expect((cli as any).inputHandler.isToolSelectionCommand('/test')).toBe(true);
    expect((cli as any).inputHandler.isToolSelectionCommand('/alias')).toBe(true);
    expect((cli as any).inputHandler.isToolSelectionCommand('/list')).toBe(false);
  });
});

describe('CLI - isKnownCommand', () => {
  it('应识别已知命令', () => {
    const cli = new CLI();

    expect((cli as any).inputHandler.isKnownCommand('/switch')).toBe(true);
    expect((cli as any).inputHandler.isKnownCommand('/edit')).toBe(true);
    expect((cli as any).inputHandler.isKnownCommand('/unknown')).toBe(false);
  });
});

describe('CLI - ensureConfigFile', () => {
  it('配置文件存在时应直接返回', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();

    const created = await (cli as any).ensureConfigFile();

    expect(created).toBe(false);
    expect(mockEnsureSettingsFile).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('首启时应返回 created=true', async () => {
    const cli = new CLI();
    mockEnsureSettingsCreated = true;

    const created = await (cli as any).ensureConfigFile();

    expect(created).toBe(true);
    expect(mockEnsureSettingsFile).toHaveBeenCalled();
  });
});

describe('CLI - showConfigInitializedMessage', () => {
  it('应输出配置初始化提示', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();

    (cli as any).showConfigInitializedMessage();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('CLI - start with builtin template', () => {
  it('模板远程拉取失败时应提示使用内置模板', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    mockEnsureSettingsCreated = true;
    mockTemplateInitResult = 'builtin';

    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '10' });

    await cli.start();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    mockTemplateInitResult = 'remote';
  });
});

describe('CLI - handleInput tool selection', () => {
  it('应处理 /switch 命令', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();

    const { showToolSelection } = await import('../src/cli/operation-orchestrator');
    const showToolSpy = vi.mocked(showToolSelection);

    await (cli as any).inputHandler.handleInput('/switch');

    expect(showToolSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('应处理 /edit 命令', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();

    const { showToolSelection } = await import('../src/cli/operation-orchestrator');
    const showToolSpy = vi.mocked(showToolSelection);

    await (cli as any).inputHandler.handleInput('/edit');

    expect(showToolSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('CLI - showCommandSelection error handling', () => {
  it('prompt 异常时应恢复并重新显示菜单', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();
    const inquirer = await import('inquirer');

    let callCount = 0;
    vi.mocked(inquirer.default.prompt).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('prompt error'));
      }
      return Promise.resolve({ index: '10' });
    });

    await (cli as any).showCommandSelection();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('CLI - promptCommandIndex validation', () => {
  it('应验证无效索引', async () => {
    const cli = new CLI();
    const inquirer = await import('inquirer');

    let validateResult: string | boolean = true;
    vi.mocked(inquirer.default.prompt).mockImplementation((questions: any) => {
      if (questions && questions[0] && questions[0].validate) {
        validateResult = questions[0].validate('99');
      }
      return Promise.resolve({ index: '10' });
    });

    await (cli as any).promptCommandIndex();

    expect(typeof validateResult).toBe('string');
  });
});
