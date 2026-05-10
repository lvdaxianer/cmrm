/**
 * Claude 适配器完整测试
 * 覆盖 ClaudeAdapter 所有方法分支
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClaudeAdapter } from '../src/adapters/claude';

/**
 * Mock fs 模块
 */
vi.mock('fs');

/**
 * Mock backup 工具
 */
vi.mock('../src/utils/backup', () => ({
  backupConfig: vi.fn(() => 'backup_2026010100'),
  mergeJsonConfig: vi.fn((original, config) => ({
    ...original,
    env: {
      ANTHROPIC_MODEL: config.model,
      ANTHROPIC_AUTH_TOKEN: config.apiKey,
      ANTHROPIC_BASE_URL: config.baseUrl,
    },
  })),
}));

const CLAUDE_CONFIG_PATH = path.join(os.homedir(), '.claude', 'settings.json');
const CMRM_SETTINGS_PATH = path.join(os.homedir(), '.cmrm', 'settings.json');

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

/**
 * 构造适配器实例
 */
function buildAdapter(): ClaudeAdapter {
  return new ClaudeAdapter();
}

/**
 * readCurrentModel 测试
 */
describe('ClaudeAdapter - readCurrentModel', () => {
  // 配置文件不存在
  it('配置文件不存在时应返回 null', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = buildAdapter();

    expect(adapter.readCurrentModel()).toBeNull();
  });

  // 配置文件存在且有效
  it('配置文件有效时应返回模型配置', () => {
    const config = {
      env: {
        ANTHROPIC_MODEL: 'claude-sonnet',
        ANTHROPIC_AUTH_TOKEN: 'sk-test',
        ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'haiku',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'sonnet',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'opus',
      },
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(config));
    const adapter = buildAdapter();

    const result = adapter.readCurrentModel();

    expect(result).not.toBeNull();
    expect(result!.model).toBe('claude-sonnet');
    expect(result!.apiKey).toBe('sk-test');
    expect(result!.haikuModel).toBe('haiku');
  });

  // 配置文件解析失败
  it('配置文件解析失败时应返回 null', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
    const adapter = buildAdapter();

    expect(adapter.readCurrentModel()).toBeNull();
  });

  // env 中无 ANTHROPIC_MODEL
  it('env 中无模型配置时应返回 null', () => {
    const config = { env: { ANTHROPIC_AUTH_TOKEN: 'sk-test' } };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(config));
    const adapter = buildAdapter();

    expect(adapter.readCurrentModel()).toBeNull();
  });

  // env 对象不存在
  it('env 对象不存在时应返回 null', () => {
    const config = {};
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(config));
    const adapter = buildAdapter();

    expect(adapter.readCurrentModel()).toBeNull();
  });
});

/**
 * writeModelConfig 测试
 */
describe('ClaudeAdapter - writeModelConfig', () => {
  it('应备份并写入配置', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ env: {} }));
    const adapter = buildAdapter();

    const backupName = adapter.writeModelConfig({
      model: 'claude-sonnet',
      apiKey: 'sk-test',
      baseUrl: 'https://api.anthropic.com',
    });

    expect(backupName).toBe('backup_2026010100');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('配置文件为空或格式错误时应回退为空对象并继续写入', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
    const adapter = buildAdapter();

    const backupName = adapter.writeModelConfig({
      model: 'claude-sonnet',
      apiKey: 'sk-test',
      baseUrl: 'https://api.anthropic.com',
    });

    expect(backupName).toBe('backup_2026010100');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('目录不存在时应创建目录', () => {
    const configDir = path.dirname(CLAUDE_CONFIG_PATH);
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      if (p === CLAUDE_CONFIG_PATH || p === configDir) return false;
      return true;
    });
    const adapter = buildAdapter();

    adapter.writeModelConfig({
      model: 'claude-sonnet',
      apiKey: 'sk-test',
      baseUrl: 'https://api.anthropic.com',
    });

    expect(fs.mkdirSync).toHaveBeenCalled();
  });
});

/**
 * getSavedModels 测试
 */
describe('ClaudeAdapter - getSavedModels', () => {
  // 新格式配置
  it('应读取新格式配置的模型列表', () => {
    const settings = {
      tools: {
        claude: {
          modes: [{ name: 'test', model: 'm', apiKey: 'k', baseUrl: 'u' }],
        },
      },
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));
    const adapter = buildAdapter();

    const models = adapter.getSavedModels();

    expect(models).toHaveLength(1);
    expect(models[0].name).toBe('test');
  });

  // 旧格式配置
  it('应读取旧格式配置并转换', () => {
    const settings = {
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
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));
    const adapter = buildAdapter();

    const models = adapter.getSavedModels();

    expect(models).toHaveLength(1);
    expect(models[0].model).toBe('claude-sonnet');
  });

  // 文件不存在
  it('文件不存在时应返回空数组', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = buildAdapter();

    expect(adapter.getSavedModels()).toEqual([]);
  });

  // 解析失败
  it('解析失败时应返回空数组', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('invalid');
    const adapter = buildAdapter();

    expect(adapter.getSavedModels()).toEqual([]);
  });

  // 无任何模型配置
  it('无任何模型字段时应返回空数组', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}));
    const adapter = buildAdapter();

    expect(adapter.getSavedModels()).toEqual([]);
  });
});

/**
 * saveModel 测试
 */
describe('ClaudeAdapter - saveModel', () => {
  it('应保存模型到 cmrm settings', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = buildAdapter();

    adapter.saveModel({
      name: 'test',
      model: 'claude-sonnet',
      apiKey: 'sk-test',
      baseUrl: 'https://api.anthropic.com',
    });

    expect(fs.writeFileSync).toHaveBeenCalled();
    const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
    expect(written.tools.claude.modes[0].name).toBe('claude-sonnet');
    expect(written.tools.claude.modes[0].aliases).toEqual(['test']);
  });

  it('应更新已存在的模型', () => {
    const settings = {
      tools: {
        claude: {
          modes: [{ name: 'new-model', model: 'new-model', apiKey: 'k', baseUrl: 'u' }],
        },
      },
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));
    const adapter = buildAdapter();

    adapter.saveModel({
      name: 'test',
      model: 'new-model',
      apiKey: 'sk-new',
      baseUrl: 'https://new.com',
    });

    const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
    expect(written.tools.claude.modes[0].model).toBe('new-model');
    expect(written.tools.claude.modes).toHaveLength(1);
    expect(written.tools.claude.modes[0].aliases).toEqual(['test']);
  });

  it('cmrm settings 为空或格式错误时应重建结构后保存', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
    const adapter = buildAdapter();

    adapter.saveModel({
      name: 'rebuilt',
      model: 'claude-sonnet',
      apiKey: 'sk-test',
      baseUrl: 'https://api.anthropic.com',
    });

    const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
    expect(written.tools.claude.modes[0].name).toBe('claude-sonnet');
    expect(written.tools.claude.modes[0].aliases).toEqual(['rebuilt']);
  });
});

/**
 * removeModel 测试
 */
describe('ClaudeAdapter - removeModel', () => {
  it('应删除已存在的模型', () => {
    const settings = {
      tools: {
        claude: {
          modes: [{ name: 'legacy-name', model: 'm', apiKey: 'k', baseUrl: 'u' }],
        },
      },
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));
    const adapter = buildAdapter();

    const result = adapter.removeModel('m');

    expect(result).toBe(true);
    const written = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
    expect(written.tools.claude.modes).toHaveLength(0);
  });

  it('配置不存在时应返回 false', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = buildAdapter();

    expect(adapter.removeModel('test')).toBe(false);
  });

  it('模型不存在时应返回 false', () => {
    const settings = {
      tools: {
        claude: {
          modes: [{ name: 'other', model: 'm', apiKey: 'k', baseUrl: 'u' }],
        },
      },
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settings));
    const adapter = buildAdapter();

    expect(adapter.removeModel('nonexistent')).toBe(false);
  });

  it('结构不完整时应返回 false', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ tools: { claude: {} } }));
    const adapter = buildAdapter();

    expect(adapter.removeModel('test')).toBe(false);
  });

  it('cmrm settings 为空或格式错误时应返回 false 而不是抛错', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
    const adapter = buildAdapter();

    expect(adapter.removeModel('test')).toBe(false);
  });
});

/**
 * validateConfig 测试
 */
describe('ClaudeAdapter - validateConfig', () => {
  it('所有字段有效时应返回 true', () => {
    const adapter = buildAdapter();

    expect(
      adapter.validateConfig({
        model: 'claude-sonnet',
        apiKey: 'sk-test',
        baseUrl: 'https://api.anthropic.com',
      })
    ).toBe(true);
  });

  it('model 为空时应返回 false', () => {
    const adapter = buildAdapter();

    expect(
      adapter.validateConfig({
        model: '',
        apiKey: 'sk-test',
        baseUrl: 'https://api.anthropic.com',
      })
    ).toBe(false);
  });

  it('apiKey 为空时应返回 false', () => {
    const adapter = buildAdapter();

    expect(
      adapter.validateConfig({
        model: 'claude-sonnet',
        apiKey: '',
        baseUrl: 'https://api.anthropic.com',
      })
    ).toBe(false);
  });

  it('baseUrl 为空时应返回 false', () => {
    const adapter = buildAdapter();

    expect(
      adapter.validateConfig({
        model: 'claude-sonnet',
        apiKey: 'sk-test',
        baseUrl: '',
      })
    ).toBe(false);
  });
});

/**
 * getRetryCount 测试
 */
describe('ClaudeAdapter - getRetryCount', () => {
  it('应返回配置中的 retry 值', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ retry: 5 }));
    const adapter = buildAdapter();

    expect(adapter.getRetryCount()).toBe(5);
  });

  it('retry 不存在时应返回默认值 3', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}));
    const adapter = buildAdapter();

    expect(adapter.getRetryCount()).toBe(3);
  });

  it('retry 为负数时应返回默认值 3', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ retry: -1 }));
    const adapter = buildAdapter();

    expect(adapter.getRetryCount()).toBe(3);
  });

  it('retry 为 0 时应返回默认值 3', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ retry: 0 }));
    const adapter = buildAdapter();

    expect(adapter.getRetryCount()).toBe(3);
  });

  it('文件不存在时应返回默认值 3', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const adapter = buildAdapter();

    expect(adapter.getRetryCount()).toBe(3);
  });
});
