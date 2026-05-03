/**
 * /add 命令问题构建器
 * 抽离自 cli.ts，集中维护添加模型流程的 inquirer 问题模板与配置组装逻辑
 *
 * 拆分原因：
 * - 问题列表与配置组装属于纯数据处理，不依赖 readline 状态
 * - 与 add-handler 解耦后便于单元测试
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { Question } from 'inquirer';
import { UnifiedModelConfig } from '../types';
import { ApiType } from '../adapters/types';

/**
 * 构建添加模型的 inquirer 问题列表
 * 顺序：configName → model → apiKey → baseUrl → 三类可选模型
 * 注：apiType 改用统一的索引输入菜单 askApiType,不再放在 list 问题里
 *
 * @return inquirer 问题数组
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function buildAddModelQuestions(): Question[] {
  return [
    {
      type: 'input',
      name: 'configName',
      message: '配置名称（可选，不填则使用模型名称）',
    },
    {
      type: 'input',
      name: 'model',
      message: '模型名称（必填）',
      validate: (value: string) => value.trim() !== '' || '模型名称为必填字段',
    },
    {
      type: 'input',
      name: 'apiKey',
      message: 'API Key（必填）',
      validate: (value: string) => value.trim() !== '' || 'API Key 为必填字段',
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'Base URL（必填）',
      default: 'https://api.anthropic.com',
      validate: (value: string) => value.trim() !== '' || 'Base URL 为必填字段',
    },
    {
      type: 'input',
      name: 'haikuModel',
      message: 'Haiku 模型（可选）',
    },
    {
      type: 'input',
      name: 'sonnetModel',
      message: 'Sonnet 模型（可选）',
    },
    {
      type: 'input',
      name: 'opusModel',
      message: 'Opus 模型（可选）',
    },
  ];
}

/**
 * 根据 inquirer 响应构建模型配置对象
 * 必填字段 trim 后填入，可选字段为空时不写入对象
 *
 * @param response - inquirer prompt 返回的字段映射
 * @return 标准化的 UnifiedModelConfig
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function buildModelConfig(response: Record<string, any>): UnifiedModelConfig {
  // 基础字段（必填）
  const config: UnifiedModelConfig = {
    name: response.configName?.trim() || response.model.trim(),
    model: response.model.trim(),
    apiKey: response.apiKey.trim(),
    baseUrl: response.baseUrl.trim(),
    apiType: (response.apiType as ApiType) ?? 'anthropic',
  };

  // Haiku 可选模型
  attachOptional(config, 'haikuModel', response.haikuModel);
  // Sonnet 可选模型
  attachOptional(config, 'sonnetModel', response.sonnetModel);
  // Opus 可选模型
  attachOptional(config, 'opusModel', response.opusModel);

  return config;
}

/**
 * 将可选字段附加到配置对象（trim 后非空才写入）
 *
 * @param config - 待修改的配置对象
 * @param key - 字段名
 * @param value - 用户输入值
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function attachOptional(config: UnifiedModelConfig, key: keyof UnifiedModelConfig, value: any): void {
  // 输入存在且 trim 后非空：写入
  if (value?.trim()) {
    (config as any)[key] = value.trim();
  }
  // 否则保持不写入
  else {
    // 可选字段不填则跳过
  }
}
