/**
 * 配置管理器测试
 * 覆盖 ConfigManager 所有方法分支
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../src/config';

/**
 * Mock fs 模块
 */
vi.mock('fs');

/**
 * 测试用的临时 settings 路径
 */
const TEST_SETTINGS_PATH = path.join(os.homedir(), '.cmrm', 'settings.json');

/**
 * 每个测试前重置 mock
 */
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
});

/**
 * 构建 ConfigManager 实例
 */
function buildConfigManager(): ConfigManager {
  return new ConfigManager();
}

/**
 * hasSettingsFile 测试
 */
describe('ConfigManager - hasSettingsFile', () => {
  // 文件存在返回 true
  it('文件存在时应返回 true', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const cm = buildConfigManager();

    expect(cm.hasSettingsFile()).toBe(true);
    expect(fs.existsSync).toHaveBeenCalledWith(TEST_SETTINGS_PATH);
  });

  // 文件不存在返回 false
  it('文件不存在时应返回 false', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const cm = buildConfigManager();

    expect(cm.hasSettingsFile()).toBe(false);
  });
});

/**
 * readSettings 测试
 */
describe('ConfigManager - readSettings', () => {
  // 读取新格式配置
  it('应读取新格式配置', () => {
    const newSettings = {
      tools: {
        claude: { modes: [{ name: 'test', model: 'm', apiKey: 'k', baseUrl: 'u' }] },
      },
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(newSettings));
    const cm = buildConfigManager();

    const result = cm.readSettings();

    expect(result.tools.claude.modes[0].name).toBe('test');
  });

  // 读取旧格式配置并自动迁移
  it('应读取旧格式配置并自动迁移到新格式', () => {
    const oldSettings = {
      modes: [
        {
          ANTHROPIC_MODEL: 'claude-sonnet',
          ANTHROPIC_AUTH_TOKEN: 'sk-test',
          ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
          ANTHROPIC_DEFAULT_HAIKU_MODEL: 'haiku',
          ANTHROPIC_DEFAULT_SONNET_MODEL: 'sonnet',
          ANTHROPIC_DEFAULT_OPUS_MODEL: 'opus',
        },
      ],
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(oldSettings));
    const cm = buildConfigManager();

    const result = cm.readSettings();

    expect(result.tools.claude.modes[0].model).toBe('claude-sonnet');
    expect(result.tools.claude.modes[0].apiKey).toBe('sk-test');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  // 文件不存在抛出错误
  it('文件不存在时应抛出错误', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const cm = buildConfigManager();

    expect(() => cm.readSettings()).toThrow('Settings file not found');
  });

  // JSON 解析失败抛出错误
  it('JSON 解析失败时应抛出错误', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
    const cm = buildConfigManager();

    expect(() => cm.readSettings()).toThrow();
  });
});

/**
 * getToolModels 测试
 */
describe('ConfigManager - getToolModels', () => {
  // 正常读取模型列表
  it('应返回指定工具的模型列表', () => {
    const settings = {
      tools: {
        claude: {
          modes: [{ name: 'test', model: 'm', apiKey: 'k', baseUrl: 'u' }],
        },
      },
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));
    const cm = buildConfigManager();

    const models = cm.getToolModels('claude');

    expect(models).toHaveLength(1);
    expect(models[0].name).toBe('test');
  });

  // 工具不存在返回空数组
  it('工具不存在时应返回空数组', () => {
    const settings = { tools: {} };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));
    const cm = buildConfigManager();

    const models = cm.getToolModels('unknown');

    expect(models).toEqual([]);
  });

  // modes 不存在返回空数组
  it('modes 不存在时应返回空数组', () => {
    const settings = { tools: { claude: {} } };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));
    const cm = buildConfigManager();

    const models = cm.getToolModels('claude');

    expect(models).toEqual([]);
  });

  // 文件不存在返回空数组
  it('文件不存在时应返回空数组', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const cm = buildConfigManager();

    const models = cm.getToolModels('claude');

    expect(models).toEqual([]);
  });
});

/**
 * saveToolModel 测试
 */
describe('ConfigManager - saveToolModel', () => {
  // 保存新模型到空配置
  it('应保存新模型到空配置', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const cm = buildConfigManager();

    cm.saveToolModel('claude', {
      name: 'new-model',
      model: 'claude-sonnet',
      apiKey: 'sk-test',
      baseUrl: 'https://api.anthropic.com',
    });

    expect(fs.writeFileSync).toHaveBeenCalled();
    const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
    expect(written.tools.claude.modes[0].name).toBe('new-model');
  });

  // 更新已存在模型
  it('应更新已存在的模型', () => {
    const settings = {
      tools: {
        claude: {
          modes: [{ name: 'existing', model: 'old', apiKey: 'k', baseUrl: 'u' }],
        },
      },
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));
    const cm = buildConfigManager();

    cm.saveToolModel('claude', {
      name: 'existing',
      model: 'new-model',
      apiKey: 'sk-new',
      baseUrl: 'https://new.com',
    });

    const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
    expect(written.tools.claude.modes[0].model).toBe('new-model');
    expect(written.tools.claude.modes).toHaveLength(1);
  });

  // 添加新模型到已有工具
  it('应添加新模型到已有工具', () => {
    const settings = {
      tools: {
        claude: {
          modes: [{ name: 'first', model: 'm1', apiKey: 'k', baseUrl: 'u' }],
        },
      },
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));
    const cm = buildConfigManager();

    cm.saveToolModel('claude', {
      name: 'second',
      model: 'm2',
      apiKey: 'k2',
      baseUrl: 'u2',
    });

    const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
    expect(written.tools.claude.modes).toHaveLength(2);
  });

  // 创建 tools 结构当不存在时
  it('settings 不存在 tools 时应自动创建', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}));
    const cm = buildConfigManager();

    cm.saveToolModel('claude', {
      name: 'test',
      model: 'm',
      apiKey: 'k',
      baseUrl: 'u',
    });

    const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
    expect(written.tools.claude.modes[0].name).toBe('test');
  });

  // 创建工具结构当工具不存在时
  it('tools 存在但工具不存在时应自动创建', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ tools: {} }));
    const cm = buildConfigManager();

    cm.saveToolModel('claude', {
      name: 'test',
      model: 'm',
      apiKey: 'k',
      baseUrl: 'u',
    });

    const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
    expect(written.tools.claude.modes[0].name).toBe('test');
  });

  // 工具存在但 modes 不存在时应自动创建 modes
  it('工具存在但 modes 不存在时应自动创建 modes', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ tools: { claude: {} } }));
    const cm = buildConfigManager();

    cm.saveToolModel('claude', {
      name: 'test',
      model: 'm',
      apiKey: 'k',
      baseUrl: 'u',
    });

    const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
    expect(written.tools.claude.modes[0].name).toBe('test');
  });

  // 保存失败时应抛出错误
  it('保存失败时应抛出错误', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw new Error('write failed');
    });
    const cm = buildConfigManager();

    expect(() =>
      cm.saveToolModel('claude', {
        name: 'test',
        model: 'm',
        apiKey: 'k',
        baseUrl: 'u',
      })
    ).toThrow('Failed to save tool model');
  });
});

/**
 * initializeSettings 测试
 */
describe('ConfigManager - initializeSettings', () => {
  // 初始化新配置
  it('应创建默认配置', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === TEST_SETTINGS_PATH) return false;
      return false;
    });
    const cm = buildConfigManager();

    cm.initializeSettings();

    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
    const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
    expect(written.tools.claude.modes[0].name).toBe('claude-sonnet-4-5');
    expect(written.tools.opencode.modes).toEqual([]);
  });

  // 目录已存在也能正常初始化
  it('目录已存在时应直接写入配置', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const cm = buildConfigManager();

    cm.initializeSettings();

    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  // 初始化失败时应抛出错误
  it('初始化失败时应抛出错误', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => {
      throw new Error('mkdir failed');
    });
    const cm = buildConfigManager();

    expect(() => cm.initializeSettings()).toThrow('Failed to initialize settings');
  });
});

/**
 * getSettingsPath 测试
 */
describe('ConfigManager - getSettingsPath', () => {
  it('应返回正确的配置文件路径', () => {
    const cm = buildConfigManager();

    expect(cm.getSettingsPath()).toBe(TEST_SETTINGS_PATH);
  });
});
