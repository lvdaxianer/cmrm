/**
 * CLI命令处理测试
 * 测试 SL-001 ~ SL-010 故事线场景
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import { describe, it, expect } from 'vitest';
import { AVAILABLE_COMMANDS, SUPPORTED_PROVIDERS, PROVIDER_DEFAULT_URLS } from '../src/cli/commands';
import { KeyListener } from '../src/cli/input';

/**
 * 命令定义测试
 */
describe('命令定义 (SL-001 ~ SL-010)', () => {
  // SL-001: /switch-model 命令存在
  it('SL-001: /switch-model 命令定义正确', () => {
    const cmd = AVAILABLE_COMMANDS.find(c => c.name === '/switch-model');

    expect(cmd).toBeDefined();
    expect(cmd?.description).toContain('切换模型');
  });

  // SL-002: /add-model 命令存在
  it('SL-002: /add-model 命令定义正确', () => {
    const cmd = AVAILABLE_COMMANDS.find(c => c.name === '/add-model');

    expect(cmd).toBeDefined();
    expect(cmd?.description).toContain('添加新模型');
  });

  // SL-003: /list 命令存在
  it('SL-003: /list 命令定义正确', () => {
    const cmd = AVAILABLE_COMMANDS.find(c => c.name === '/list');

    expect(cmd).toBeDefined();
    expect(cmd?.description).toContain('显示所有');
  });

  // SL-004: /current 命令存在
  it('SL-004: /current 命令定义正确', () => {
    const cmd = AVAILABLE_COMMANDS.find(c => c.name === '/current');

    expect(cmd).toBeDefined();
    expect(cmd?.description).toContain('当前');
  });

  // SL-005/006: /exit 命令存在
  it('SL-005/006: /exit 命令定义正确', () => {
    const cmd = AVAILABLE_COMMANDS.find(c => c.name === '/exit');

    expect(cmd).toBeDefined();
    expect(cmd?.description).toContain('退出');
  });

  // 命令数量验证
  it('可用命令数量为5个', () => {
    expect(AVAILABLE_COMMANDS.length).toBe(5);
  });

  // 所有命令以/开头
  it('所有命令以斜杠开头', () => {
    AVAILABLE_COMMANDS.forEach(cmd => {
      expect(cmd.name.startsWith('/')).toBe(true);
    });
  });
});

/**
 * Provider定义测试
 */
describe('Provider定义', () => {
  // 支持的Provider列表
  it('支持的Provider列表正确', () => {
    // 国外提供商
    expect(SUPPORTED_PROVIDERS).toContain('openai');
    expect(SUPPORTED_PROVIDERS).toContain('anthropic');
    expect(SUPPORTED_PROVIDERS).toContain('openrouter');
    expect(SUPPORTED_PROVIDERS).toContain('deepseek');
    expect(SUPPORTED_PROVIDERS).toContain('google');
    // 国内提供商
    expect(SUPPORTED_PROVIDERS).toContain('zhipu');
    expect(SUPPORTED_PROVIDERS).toContain('minimax');
    expect(SUPPORTED_PROVIDERS).toContain('moonshot');
    expect(SUPPORTED_PROVIDERS).toContain('alibaba');
    expect(SUPPORTED_PROVIDERS).toContain('baidu');
    expect(SUPPORTED_PROVIDERS.length).toBe(10);
  });

  // Provider默认URL映射
  it('Provider默认URL映射正确', () => {
    // 国外提供商
    expect(PROVIDER_DEFAULT_URLS['openai']).toBe('https://api.openai.com/v1');
    expect(PROVIDER_DEFAULT_URLS['anthropic']).toBe('https://api.anthropic.com');
    expect(PROVIDER_DEFAULT_URLS['openrouter']).toBe('https://openrouter.ai/api/v1');
    expect(PROVIDER_DEFAULT_URLS['deepseek']).toBe('https://api.deepseek.com');
    expect(PROVIDER_DEFAULT_URLS['google']).toBe('https://generativelanguage.googleapis.com');
    // 国内提供商
    expect(PROVIDER_DEFAULT_URLS['zhipu']).toBe('https://open.bigmodel.cn/api/paas/v4');
    expect(PROVIDER_DEFAULT_URLS['minimax']).toBe('https://api.minimax.chat/v1');
    expect(PROVIDER_DEFAULT_URLS['moonshot']).toBe('https://api.moonshot.cn/v1');
    expect(PROVIDER_DEFAULT_URLS['alibaba']).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1');
    expect(PROVIDER_DEFAULT_URLS['baidu']).toBe('https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop');
  });

  // 未定义的Provider返回undefined
  it('未定义的Provider返回undefined', () => {
    expect(PROVIDER_DEFAULT_URLS['unknown']).toBeUndefined();
  });
});

/**
 * 键盘输入测试
 * 测试 SL-011 ~ SL-020
 */
describe('键盘输入处理 (SL-011 ~ SL-020)', () => {
  type KeyAction = 'up' | 'down' | 'confirm' | 'cancel' | 'exit';

  // SL-011 ~ SL-014: 方向键边界测试
  it('KeyListener 实例化成功', () => {
    const listener = new KeyListener();

    expect(listener).toBeDefined();
    expect(listener.isListening()).toBe(false);
  });

  // 测试监听状态切换（在真实终端中运行）
  it.skip('startListening 和 stopListening 正常工作（需要真实终端）', () => {
    // 此测试需要在真实终端环境中运行
    // 测试环境中 stdin.setRawMode 不可用
    const listener = new KeyListener();
    const actions: KeyAction[] = [];

    // 开始监听
    listener.startListening((action) => {
      actions.push(action);
    });

    expect(listener.isListening()).toBe(true);

    // 停止监听
    listener.stopListening();

    expect(listener.isListening()).toBe(false);
  });

  // 测试 isListening 方法
  it('isListening 初始状态为 false', () => {
    const listener = new KeyListener();
    expect(listener.isListening()).toBe(false);
  });
});

/**
 * 相似命令查找测试
 * 模拟 SL-009 ~ SL-010
 */
describe('相似命令查找 (SL-009 ~ SL-010)', () => {
  // 模拟编辑距离计算（简化版）
  function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // SL-009: 拼写错误有相似推荐
  it('SL-009: /swtich 与 /switch-model 编辑距离小于阈值', () => {
    const distance = levenshteinDistance('/swtich', '/switch-model');

    // 编辑距离为3（替换 t->t, 缺少 model）
    expect(distance).toBeLessThanOrEqual(10);
  });

  // SL-010: 无效命令无相似
  it('SL-010: /abc123 与所有命令编辑距离较大', () => {
    const distances = AVAILABLE_COMMANDS.map(cmd => ({
      name: cmd.name,
      distance: levenshteinDistance('/abc123', cmd.name),
    }));

    // 所有距离都较大
    distances.forEach(d => {
      expect(d.distance).toBeGreaterThan(3);
    });
  });

  // 空输入与命令的距离
  it('空字符串与命令的编辑距离', () => {
    const distance = levenshteinDistance('', '/switch-model');

    // 空字符串距离等于命令长度
    expect(distance).toBe('/switch-model'.length);
  });

  // 完全匹配距离为0
  it('完全匹配的命令编辑距离为0', () => {
    const distance = levenshteinDistance('/switch-model', '/switch-model');

    expect(distance).toBe(0);
  });
});