/**
 * CLI 命令定义模块
 * 定义可用命令列表
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
  { name: '/switch', description: '切换模型配置' },
  { name: '/add', description: '添加新模型配置' },
  { name: '/remove', description: '删除模型配置' },
  { name: '/info', description: '查看模型详细信息' },
  { name: '/test', description: '测试模型配置是否可用' },
  { name: '/alias', description: '管理模型别名(添加/删除/列出)' },
  { name: '/list', description: '显示所有模型配置' },
  { name: '/current', description: '显示当前模型' },
  { name: '/exit', description: '退出程序' }
];