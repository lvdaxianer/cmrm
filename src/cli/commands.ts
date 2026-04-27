/**
 * CLI 命令定义模块
 * 定义可用命令列表和 Provider 配置
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

/**
 * 命令定义接口
 * 描述一个可执行的 CLI 命令
 */
export interface CommandDefinition {
  /** 命令名称（如 /switch-model） */
  name: string;
  /** 命令描述 */
  description: string;
}

/**
 * 可用命令列表
 * 用户可输入的所有命令
 */
export const AVAILABLE_COMMANDS: CommandDefinition[] = [
  { name: '/switch-model', description: '切换模型（选工具→选模型）' },
  { name: '/add-model', description: '添加新模型配置' },
  { name: '/list', description: '显示所有模型配置' },
  { name: '/current', description: '显示所有工具当前模型' },
  { name: '/exit', description: '退出程序' }
];

/**
 * 支持的 Provider 列表
 * OpenCode 配置时可选的提供商（包含国内外主流 AI 服务）
 */
export const SUPPORTED_PROVIDERS = [
  // 国外提供商
  'openai',
  'anthropic',
  'openrouter',
  'deepseek',
  'google',
  // 国内提供商
  'zhipu',      // 智谱 GLM
  'minimax',    // MiniMax
  'moonshot',   // 月之暗面 Kimi
  'alibaba',    // 阿里通义千问
  'baidu',      // 百度文心一言
];

/**
 * Provider 默认 Base URL 映射表
 * 根据 Provider 名称返回默认 API 端点
 */
export const PROVIDER_DEFAULT_URLS: Record<string, string> = {
  // 国外提供商
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  openrouter: 'https://openrouter.ai/api/v1',
  deepseek: 'https://api.deepseek.com',
  google: 'https://generativelanguage.googleapis.com',
  // 国内提供商
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  minimax: 'https://api.minimax.chat/v1',
  moonshot: 'https://api.moonshot.cn/v1',
  alibaba: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  baidu: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
};