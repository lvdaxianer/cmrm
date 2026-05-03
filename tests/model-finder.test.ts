/**
 * 模型查找工具测试
 * 验证 findModelByName / listAvailableNames 的行为
 *
 * 核心场景:
 *  - name 字段优先匹配
 *  - aliases 中某项次优先匹配(本次新增)
 *  - name/aliases 未命中时回退 model 字段
 *  - 优先级:name > aliases > model(本次新增)
 *  - 完全未命中返回 null
 *  - 空模型列表的边界处理
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { describe, it, expect } from 'vitest';
import { findModelByName, listAvailableNames } from '../src/cli/model-finder';
import { ToolAdapter, UnifiedModelConfig } from '../src/adapters';

/**
 * 构造仅包含 getSavedModels 行为的最小 ToolAdapter mock
 *
 * @param models - 预设的已保存模型列表
 * @return 仅实现 getSavedModels 的伪 ToolAdapter
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function buildMockAdapter(models: UnifiedModelConfig[]): ToolAdapter {
  return {
    getSavedModels: () => models,
  } as unknown as ToolAdapter;
}

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

describe('findModelByName - 命中匹配', () => {
  // 优先按 name 字段匹配
  it('应优先匹配 name 字段', () => {
    const target = buildModel({ name: 'my-sonnet', model: 'claude-sonnet-4-6' });
    const adapter = buildMockAdapter([
      buildModel({ name: 'my-haiku', model: 'claude-haiku-4-5' }),
      target,
    ]);

    const result = findModelByName(adapter, 'my-sonnet');

    expect(result).toBe(target);
  });

  // name 未命中时退化按 model 字段匹配
  it('name 未命中时应退化匹配 model 字段', () => {
    const target = buildModel({ name: 'custom-name', model: 'claude-opus-4-7' });
    const adapter = buildMockAdapter([target]);

    const result = findModelByName(adapter, 'claude-opus-4-7');

    expect(result).toBe(target);
  });

  // name 字段在多个模型中存在时仅命中第一个
  it('多个同 name 时返回首个', () => {
    const first = buildModel({ name: 'dup', model: 'a' });
    const second = buildModel({ name: 'dup', model: 'b' });
    const adapter = buildMockAdapter([first, second]);

    const result = findModelByName(adapter, 'dup');

    expect(result).toBe(first);
  });
});

describe('findModelByName - 未命中', () => {
  // 完全未命中:返回 null
  it('未命中时应返回 null', () => {
    const adapter = buildMockAdapter([
      buildModel({ name: 'one', model: 'm1' }),
    ]);

    const result = findModelByName(adapter, 'nonexistent');

    expect(result).toBeNull();
  });

  // 空模型列表:返回 null
  it('空模型列表时应返回 null', () => {
    const adapter = buildMockAdapter([]);

    const result = findModelByName(adapter, 'whatever');

    expect(result).toBeNull();
  });
});

describe('listAvailableNames', () => {
  // 名称优先 name 字段,缺失时退化 model
  it('应优先输出 name,缺失时回退 model', () => {
    const adapter = buildMockAdapter([
      buildModel({ name: 'sonnet', model: 'claude-sonnet-4-6' }),
      buildModel({ model: 'gpt-4o' }),
    ]);

    expect(listAvailableNames(adapter)).toEqual(['sonnet', 'gpt-4o']);
  });

  // 空列表:返回空数组
  it('空模型列表时应返回空数组', () => {
    const adapter = buildMockAdapter([]);

    expect(listAvailableNames(adapter)).toEqual([]);
  });
});

describe('findModelByName - aliases 命中', () => {
  // name 未命中,aliases 命中:返回模型
  it('name 未命中但 aliases 命中应返回对应模型', () => {
    const target = buildModel({
      name: 'my-sonnet',
      model: 'claude-sonnet',
      aliases: ['s4', 'fast'],
    });
    const adapter = buildMockAdapter([
      buildModel({ name: 'my-haiku', model: 'claude-haiku' }),
      target,
    ]);

    const result = findModelByName(adapter, 'fast');

    expect(result).toBe(target);
  });

  // aliases 中首个命中:返回模型
  it('aliases 数组首个命中也应返回对应模型', () => {
    const target = buildModel({
      name: 'sonnet',
      model: 'claude-sonnet',
      aliases: ['s4', 'fast'],
    });
    const adapter = buildMockAdapter([target]);

    const result = findModelByName(adapter, 's4');

    expect(result).toBe(target);
  });
});

describe('findModelByName - 优先级 name > aliases > model', () => {
  // 同名情况下应优先返回 name 命中
  it('当某模型 name 与另一模型 aliases 同名时应返回 name 命中者', () => {
    const byNameOwner = buildModel({ name: 'fast', model: 'm-name-owner' });
    const byAliasOwner = buildModel({
      name: 'sonnet',
      model: 'm-alias-owner',
      aliases: ['fast'],
    });
    const adapter = buildMockAdapter([byAliasOwner, byNameOwner]);

    const result = findModelByName(adapter, 'fast');

    expect(result).toBe(byNameOwner);
  });

  // aliases 优先于 model 字段:同名时返回 aliases 命中
  it('当 aliases 与 model 字段同名时应返回 aliases 命中者', () => {
    const byAliasOwner = buildModel({
      name: 'sonnet',
      model: 'claude-sonnet',
      aliases: ['my-key'],
    });
    const byModelOwner = buildModel({ name: 'opus', model: 'my-key' });
    const adapter = buildMockAdapter([byModelOwner, byAliasOwner]);

    const result = findModelByName(adapter, 'my-key');

    expect(result).toBe(byAliasOwner);
  });

  // aliases 缺失字段不影响其他模型 model 命中
  it('aliases 缺失时仍应正常退化 model 匹配', () => {
    const target = buildModel({ name: 'opus', model: 'claude-opus-4-7' });
    const adapter = buildMockAdapter([
      buildModel({ name: 'haiku', model: 'claude-haiku' }),
      target,
    ]);

    const result = findModelByName(adapter, 'claude-opus-4-7');

    expect(result).toBe(target);
  });
});
