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
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export interface CommandDefinition {
  /** 命令名称（如 /switch-model） */
  name: string;
  /** 命令描述（已翻译的文本） */
  description: string;
  /** 命令描述翻译 key */
  descriptionKey: string;
}

/**
 * 可用命令列表
 * 用户可输入的所有命令
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export const AVAILABLE_COMMANDS: CommandDefinition[] = [
  { name: '/switch', description: 'Switch Model Config', descriptionKey: 'commands.desc.switch' },
  { name: '/add', description: 'Add Model Config', descriptionKey: 'commands.desc.add' },
  { name: '/edit', description: 'Edit Model Config', descriptionKey: 'commands.desc.edit' },
  { name: '/remove', description: 'Remove Model Config', descriptionKey: 'commands.desc.remove' },
  { name: '/info', description: 'View Model Details', descriptionKey: 'commands.desc.info' },
  { name: '/test', description: 'Test Model Config', descriptionKey: 'commands.desc.test' },
  { name: '/alias', description: 'Manage Aliases', descriptionKey: 'commands.desc.alias' },
  { name: '/list', description: 'Show All Models', descriptionKey: 'commands.desc.list' },
  { name: '/current', description: 'Show Current Model', descriptionKey: 'commands.desc.current' },
  { name: '/set-lang', description: 'Set Language', descriptionKey: 'commands.desc.setLang' },
  { name: '/exit', description: 'Exit Program', descriptionKey: 'commands.desc.exit' }
];
