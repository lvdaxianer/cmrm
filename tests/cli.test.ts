/**
 * CLI 类测试
 * 覆盖 CLI 类的主要方法分支
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CLI } from '../src/cli';

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
    prompt: vi.fn().mockResolvedValue({ index: '9' }),
  },
}));

let mockHasSettingsFile = true;

vi.mock('../src/config', () => ({
  ConfigManager: class MockConfigManager {
    hasSettingsFile() { return mockHasSettingsFile; }
    initializeSettings() {}
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
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '9' });

    await cli.start();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('无配置文件时应初始化', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    mockHasSettingsFile = false;

    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '9' });

    const cli = new CLI();
    await cli.start();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    mockHasSettingsFile = true;
  });
});

describe('CLI - handleInput', () => {
  it('应处理 /list 命令', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '9' });

    await (cli as any).handleInput('/list');

    consoleSpy.mockRestore();
  });

  it('应处理 /current 命令', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '9' });

    await (cli as any).handleInput('/current');

    consoleSpy.mockRestore();
  });

  it('应处理 /set-lang 命令', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '9' });

    await (cli as any).handleInput('/set-lang');

    consoleSpy.mockRestore();
  });

  it('应处理 /exit 命令', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    const cli = new CLI();

    await (cli as any).handleInput('/exit');

    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('应处理空输入', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '9' });

    await (cli as any).handleInput('');

    consoleSpy.mockRestore();
  });

  it('应处理未知命令前缀', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '9' });

    await (cli as any).handleInput('/unknown');

    consoleSpy.mockRestore();
  });

  it('应处理完全未知输入', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '9' });

    await (cli as any).handleInput('random text');

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

    expect((cli as any).isToolSelectionCommand('/switch')).toBe(true);
    expect((cli as any).isToolSelectionCommand('/add')).toBe(true);
    expect((cli as any).isToolSelectionCommand('/remove')).toBe(true);
    expect((cli as any).isToolSelectionCommand('/info')).toBe(true);
    expect((cli as any).isToolSelectionCommand('/test')).toBe(true);
    expect((cli as any).isToolSelectionCommand('/alias')).toBe(true);
    expect((cli as any).isToolSelectionCommand('/list')).toBe(false);
  });
});

describe('CLI - isKnownCommand', () => {
  it('应识别已知命令', () => {
    const cli = new CLI();

    expect((cli as any).isKnownCommand('/switch')).toBe(true);
    expect((cli as any).isKnownCommand('/unknown')).toBe(false);
  });
});

describe('CLI - ensureConfigFile', () => {
  it('配置文件存在时应直接返回', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();

    await (cli as any).ensureConfigFile();

    consoleSpy.mockRestore();
  });
});

describe('CLI - initializeConfigFile', () => {
  it('应初始化配置文件', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();

    (cli as any).initializeConfigFile();

    consoleSpy.mockRestore();
  });

  it('初始化失败时应退出进程', () => {
    mockHasSettingsFile = false;
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { ConfigManager } = vi.mocked('../src/config') as any;
    const cli = new CLI();

    // 强制 initializeSettings 抛异常
    const original = (cli as any).configManager.initializeSettings;
    (cli as any).configManager.initializeSettings = () => {
      throw new Error('init failed');
    };

    (cli as any).initializeConfigFile();

    expect(exitSpy).toHaveBeenCalledWith(1);
    consoleSpy.mockRestore();
    mockHasSettingsFile = true;
  });
});

describe('CLI - start with builtin template', () => {
  it('模板远程拉取失败时应提示使用内置模板', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    mockHasSettingsFile = false;
    mockTemplateInitResult = 'builtin';

    const cli = new CLI();
    const inquirer = await import('inquirer');
    vi.mocked(inquirer.default.prompt).mockResolvedValue({ index: '9' });

    await cli.start();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
    mockHasSettingsFile = true;
    mockTemplateInitResult = 'remote';
  });
});

describe('CLI - handleInput tool selection', () => {
  it('应处理 /switch 命令', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cli = new CLI();

    const { showToolSelection } = await import('../src/cli/operation-orchestrator');
    const showToolSpy = vi.mocked(showToolSelection);

    await (cli as any).handleInput('/switch');

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
      return Promise.resolve({ index: '9' });
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
      return Promise.resolve({ index: '9' });
    });

    await (cli as any).promptCommandIndex();

    expect(typeof validateResult).toBe('string');
  });
});
