/**
 * 别名校验器测试
 * 验证 validateAlias / findModelByAlias / getModelKey 的行为
 *
 * 核心场景:
 *  - 空字符串 / 仅空白拒绝
 *  - 与他模型 name / model / aliases 冲突拒绝
 *  - 与自身 name / model / aliases 冲突拒绝
 *  - 合法别名通过
 *  - findModelByAlias 命中/未命中分支
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { describe, it, expect } from 'vitest';
import {
  validateAlias,
  findModelByAlias,
  getModelKey,
} from '../src/cli/alias-validator';
import { UnifiedModelConfig } from '../src/adapters';

/**
 * 构造一个最小可用的 UnifiedModelConfig
 *
 * @param fields - 部分字段覆盖
 * @return 构造完成的模型配置
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function buildModel(fields: Partial<UnifiedModelConfig>): UnifiedModelConfig {
  return {
    model: 'default-model',
    apiKey: 'sk-test',
    baseUrl: 'https://api.example.com',
    ...fields,
  };
}

describe('validateAlias - 空值拒绝', () => {
  // 空字符串:拒绝
  it('应拒绝空字符串', () => {
    const result = validateAlias('', [], 'any');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('别名不能为空');
  });

  // 仅空白:拒绝
  it('应拒绝仅含空白的输入', () => {
    const result = validateAlias('   ', [], 'any');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('别名不能为空');
  });
});

describe('validateAlias - 与其他模型冲突', () => {
  // 与他模型 name 冲突
  it('应拒绝与他模型 name 相同的别名', () => {
    const self = buildModel({ name: 'sonnet', model: 'claude-sonnet' });
    const other = buildModel({ name: 'haiku', model: 'claude-haiku' });
    const result = validateAlias('haiku', [self, other], 'sonnet');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('haiku');
  });

  // 与他模型 model 冲突
  it('应拒绝与他模型 model 相同的别名', () => {
    const self = buildModel({ name: 'sonnet', model: 'claude-sonnet' });
    const other = buildModel({ name: 'opus', model: 'claude-opus-4-7' });
    const result = validateAlias('claude-opus-4-7', [self, other], 'sonnet');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('opus');
  });

  // 与他模型 aliases 冲突
  it('应拒绝与他模型 aliases 中某项相同', () => {
    const self = buildModel({ name: 'sonnet', model: 'claude-sonnet' });
    const other = buildModel({ name: 'opus', model: 'm-opus', aliases: ['o4', 'fast'] });
    const result = validateAlias('o4', [self, other], 'sonnet');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('opus');
  });
});

describe('validateAlias - 与自身冲突', () => {
  // 与自身 name 冲突
  it('应拒绝与自身 name 相同的别名', () => {
    const self = buildModel({ name: 'sonnet', model: 'claude-sonnet' });
    const result = validateAlias('sonnet', [self], 'sonnet');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('name');
  });

  // 与自身 model 冲突
  it('应拒绝与自身 model 相同的别名', () => {
    const self = buildModel({ name: 'sonnet', model: 'claude-sonnet' });
    const result = validateAlias('claude-sonnet', [self], 'sonnet');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('model');
  });

  // 与自身已有 alias 冲突
  it('应拒绝与自身已有 alias 重复', () => {
    const self = buildModel({ name: 'sonnet', model: 'claude-sonnet', aliases: ['s4'] });
    const result = validateAlias('s4', [self], 'sonnet');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('s4');
  });
});

describe('validateAlias - 合法别名', () => {
  // 全新别名:通过
  it('应放行全新合法别名', () => {
    const self = buildModel({ name: 'sonnet', model: 'claude-sonnet', aliases: ['s4'] });
    const other = buildModel({ name: 'haiku', model: 'claude-haiku', aliases: ['h4'] });
    const result = validateAlias('fast', [self, other], 'sonnet');

    expect(result.valid).toBe(true);
  });

  // 输入两端含空白但 trim 后合法:通过
  it('应在 trim 后判断合法性', () => {
    const self = buildModel({ name: 'sonnet', model: 'claude-sonnet' });
    const result = validateAlias('  fast  ', [self], 'sonnet');

    expect(result.valid).toBe(true);
  });
});

describe('findModelByAlias', () => {
  // 命中:返回对应模型
  it('应返回 aliases 命中的模型', () => {
    const target = buildModel({ name: 'sonnet', model: 'claude-sonnet', aliases: ['s4', 'fast'] });
    const other = buildModel({ name: 'haiku', model: 'claude-haiku' });
    const result = findModelByAlias([other, target], 'fast');

    expect(result).toBe(target);
  });

  // 未命中:返回 null
  it('未命中时应返回 null', () => {
    const a = buildModel({ name: 'sonnet', model: 'claude-sonnet' });
    const b = buildModel({ name: 'haiku', model: 'claude-haiku' });
    const result = findModelByAlias([a, b], 'nonexistent');

    expect(result).toBeNull();
  });

  // 空 aliases 字段:跳过
  it('应正确跳过 aliases 缺失的模型', () => {
    const target = buildModel({ name: 'sonnet', model: 'claude-sonnet', aliases: ['s4'] });
    const noAlias = buildModel({ name: 'haiku', model: 'claude-haiku' });
    const result = findModelByAlias([noAlias, target], 's4');

    expect(result).toBe(target);
  });
});

describe('getModelKey', () => {
  // 有 name:返回 name
  it('应优先返回 name 字段', () => {
    const m = buildModel({ name: 'my-name', model: 'm1' });

    expect(getModelKey(m)).toBe('my-name');
  });

  // 无 name:回退 model
  it('缺失 name 时应返回 model', () => {
    const m = buildModel({ model: 'fallback-model' });

    expect(getModelKey(m)).toBe('fallback-model');
  });
});
