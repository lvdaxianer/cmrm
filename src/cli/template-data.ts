/**
 * 内置模型模板数据
 * 存放默认模板常量，供 TemplateManager 在首次初始化时使用
 *
 * 数据来源：用户实际 Claude Code 配置
 * 所有模板均使用 Anthropic Messages API 格式
 *
 * 设计要点：
 * - 本文件仅存放数据常量，不包含任何业务逻辑
 * - 模板数据与 TemplateManager 解耦，便于独立维护
 * - 用户可通过编辑 ~/.cmrm/templates.json 覆盖或扩展这些模板
 *
 * @author lvdaxianerplus
 * @date 2026-05-04
 */

import { ApiType } from '../adapters/types';

/**
 * 模型模板接口
 * 描述一个可复用的模型配置模板
 *
 * 每个模板对应一个模型提供商（如 DeepSeek、Minimax 等），
 * 包含该提供商的默认模型名称、API 端点、协议类型等固定信息。
 * 用户选择模板后，仅需输入 API Key 即可完成配置添加。
 */
export interface ModelTemplate {
  /** 模板唯一标识，用于索引和查找（如 'deepseek'） */
  id: string;
  /** 模板显示名称，在菜单中展示给用户（如 'DeepSeek'） */
  name: string;
  /** 模板描述，说明模型版本和接入方式（如 'DeepSeek V3.2 (Anthropic 格式)'） */
  description: string;
  /** 默认模型名称，发送请求时使用的 model 字段 */
  model: string;
  /** API 端点 URL，模型服务的根地址 */
  baseUrl: string;
  /** API 协议类型，决定请求体格式（目前均为 'anthropic'） */
  apiType: ApiType;
  /** 提供商标识，用于分类和识别（如 'deepseek'、'minimax'） */
  provider: string;
  /** Haiku 模型名称（可选），轻量级任务使用的模型 */
  haikuModel?: string;
  /** Sonnet 模型名称（可选），平衡型任务使用的模型 */
  sonnetModel?: string;
  /** Opus 模型名称（可选），高性能任务使用的模型 */
  opusModel?: string;
}

/**
 * 内置默认模板列表
 * 用户可通过编辑 ~/.cmrm/templates.json 自定义
 *
 * 覆盖 9 个主流国内模型提供商，均通过 Anthropic Messages API 接入：
 * - DeepSeek：深度求索大模型
 * - 智谱 AI：GLM 系列模型（bigmodel / Z.AI 双接入点）
 * - Kimi：月之暗面大模型
 * - Minimax：海螺 AI（国内版 + 国际版双端点）
 * - OpenRouter：聚合 API 平台
 * - 小米 MiMo：小米大模型
 * - 通义千问：阿里云 DashScope
 */
export const BUILT_IN_TEMPLATES: ModelTemplate[] = [
  // DeepSeek：深度求索 V3.2，国内领先大模型
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek V3.2 (Anthropic 格式)',
    model: 'DeepSeek-V3.2',
    baseUrl: 'https://api.deepseek.com/anthropic',
    apiType: 'anthropic',
    provider: 'deepseek',
  },
  // 智谱 AI bigmodel 接入点：GLM-4.7 系列
  {
    id: 'zhipu-bigmodel',
    name: '智谱 AI (bigmodel)',
    description: '智谱 GLM-4.7 (bigmodel 接入点)',
    model: 'glm-4.7',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    apiType: 'anthropic',
    provider: 'zhipu',
  },
  // 智谱 AI Z.AI 接入点：GLM-4.7 系列（替代接入点）
  {
    id: 'zai',
    name: 'Z.AI',
    description: '智谱 GLM-4.7 (Z.AI 接入点)',
    model: 'glm-4.7',
    baseUrl: 'https://api.z.ai/api/anthropic',
    apiType: 'anthropic',
    provider: 'zai',
  },
  // 月之暗面 Kimi：K2.6 系列，Coding 端点
  {
    id: 'kimi',
    name: 'Kimi / Moonshot',
    description: '月之暗面 Kimi (Coding 端点)',
    model: 'kimi-k2.6',
    baseUrl: 'https://api.kimi.com/coding/',
    apiType: 'anthropic',
    provider: 'kimi',
  },
  // Minimax 国内版：海螺 AI M2.1
  {
    id: 'minimax-cn',
    name: 'Minimax 国内版',
    description: '海螺 AI MiniMax-M2.1 (Anthropic 格式)',
    model: 'MiniMax-M2.1',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    apiType: 'anthropic',
    provider: 'minimax',
  },
  // Minimax 国际版：MiniMax International M2.1
  {
    id: 'minimax-intl',
    name: 'Minimax 国际版',
    description: 'MiniMax International M2.1 (Anthropic 格式)',
    model: 'MiniMax-M2.1',
    baseUrl: 'https://api.minimax.io/anthropic',
    apiType: 'anthropic',
    provider: 'minimax',
  },
  // OpenRouter：聚合 API 平台，支持多模型路由
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'OpenRouter 聚合 API (Anthropic 格式)',
    model: 'anthropic/claude-sonnet-4.5',
    baseUrl: 'https://openrouter.ai/api',
    apiType: 'anthropic',
    provider: 'openrouter',
    haikuModel: 'anthropic/claude-haiku-4.5',
    sonnetModel: 'anthropic/claude-sonnet-4.5',
    opusModel: 'anthropic/claude-opus-4.5',
  },
  // 小米 MiMo：小米大模型 v2-flash
  {
    id: 'xiaomi',
    name: '小米 MiMo',
    description: '小米 MiMo-v2-flash (Anthropic 格式)',
    model: 'mimo-v2-flash',
    baseUrl: 'https://api.xiaomimimo.com/anthropic',
    apiType: 'anthropic',
    provider: 'xiaomi',
  },
  // 通义千问：阿里云 DashScope qwen3-max
  {
    id: 'alibaba',
    name: '通义千问 / DashScope',
    description: '阿里云 qwen3-max (Anthropic 格式)',
    model: 'qwen3-max',
    baseUrl: 'https://dashscope.aliyuncs.com/apps/anthropic',
    apiType: 'anthropic',
    provider: 'alibaba',
  },
];
