/**
 * UI 渲染函数模块
 * 负责命令列表、工具列表等复杂界面渲染
 * 从 UIRenderer 类中提取，保持单一职责
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import chalk from 'chalk';
import { AVAILABLE_COMMANDS } from './commands';
import { registry } from '../adapters';
import { t } from '../i18n';

/** 命令名称列对齐宽度 */
const COMMAND_NAME_PAD_WIDTH = 15;

/**
 * ANSI 转义序列常量
 * 直接操作终端，比 readline API 更可靠
 */
const ANSI = {
  /** 清除整屏 */
  CLEAR_SCREEN: '\x1b[2J',
  /** 清除整行 */
  CLEAR_LINE: '\x1b[2K',
  /** 回到左上角 */
  HOME: '\x1b[H',
  /** 向上移动 N 行 */
  MOVE_UP: (n: number) => `\x1b[${n}A`,
  /** 向下移动 N 行 */
  MOVE_DOWN: (n: number) => `\x1b[${n}B`,
  /** 回到行首 */
  CURSOR_HOME: '\r',
  /** 隐藏光标 */
  HIDE_CURSOR: '\x1b[?25l',
  /** 显示光标 */
  SHOW_CURSOR: '\x1b[?25h',
};

/**
 * 清除指定行数
 * 使用 ANSI 转义序列向上移动并清除每一行
 *
 * @param count - 要清除的行数
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export function clearLines(count: number): void {
  for (let i = 0; i < count; i++) {
    process.stdout.write(ANSI.CURSOR_HOME);
    process.stdout.write(ANSI.CLEAR_LINE);
    // 非最后一行：向上移动
    if (i < count - 1) {
      process.stdout.write(ANSI.MOVE_UP(1));
    }
    // 最后一行：不移动，保持当前位置
    else {
      // 不执行移动操作
    }
  }
  process.stdout.write(ANSI.MOVE_UP(count));
}

/**
 * 渲染命令选择列表
 * 使用 ANSI 转义序列清除并重新渲染
 * 注意：首次渲染和非首次渲染的行数计算要精确匹配
 *
 * @param currentSelection - 当前选中的索引
 * @param isFirstRender - 是否首次渲染
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export function renderCommandList(currentSelection: number, isFirstRender: boolean = false): void {
  const totalLines = AVAILABLE_COMMANDS.length + 2;

  // 非首次渲染时清除之前的渲染内容
  if (!isFirstRender) {
    clearLines(totalLines);
  }
  // 首次渲染：跳过清除，直接渲染
  else {
    // 首次渲染无需清除旧内容
  }

  renderCommandTitle(isFirstRender);
  renderCommandOptions(currentSelection);
}

/**
 * 渲染命令列表标题
 *
 * @param isFirstRender - 是否首次渲染
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function renderCommandTitle(isFirstRender: boolean): void {
  // 首次渲染：显示完整提示（2行：空行 + 标题）
  if (isFirstRender) {
    console.log('');
    console.log(chalk.cyan(t('ui.selectCommandFull')));
  }
  // 后续渲染：简化标题（2行：空行 + 标题）
  else {
    console.log('');
    console.log(chalk.cyan(t('ui.selectCommand')));
  }
}

/**
 * 渲染命令选项列表
 *
 * @param currentSelection - 当前选中的索引
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function renderCommandOptions(currentSelection: number): void {
  AVAILABLE_COMMANDS.forEach((cmd, index) => {
    const isSelected = index === currentSelection;
    const translatedDesc = t(cmd.descriptionKey);
    renderCommandLine(cmd.name, translatedDesc, isSelected);
  });
}

/**
 * 渲染单条命令行
 *
 * @param name - 命令名称
 * @param description - 命令描述
 * @param isSelected - 是否选中
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function renderCommandLine(name: string, description: string, isSelected: boolean): void {
  const prefix = isSelected ? chalk.cyan('❯ ') : '  ';
  const paddedName = isSelected ? chalk.green(name.padEnd(COMMAND_NAME_PAD_WIDTH)) : chalk.gray(name.padEnd(COMMAND_NAME_PAD_WIDTH));
  const desc = chalk.gray(description);
  console.log(`${prefix}${paddedName} ${desc}`);
}

/**
 * 渲染工具选择列表
 * 显示所有注册的工具供用户选择
 *
 * @param currentSelection - 当前选中的索引
 * @param isFirstRender - 是否首次渲染（首次渲染包含提示文字）
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export function renderToolList(currentSelection: number, isFirstRender: boolean = false): void {
  const toolNames = registry.getToolNames();

  // 总行数：标题(2行) + 选项(toolNames.length行)
  const totalLines = toolNames.length + 2;

  // 非首次渲染时清除之前的渲染内容
  if (!isFirstRender) {
    clearLines(totalLines);
  }
  // 首次渲染：跳过清除
  else {
    // 首次渲染无需清除旧内容
  }

  // 渲染标题（首次和非首次行数相同）
  if (isFirstRender) {
    console.log('');
    console.log(chalk.cyan(t('ui.selectToolFull')));
  } else {
    console.log('');
    console.log(chalk.cyan(t('ui.selectTool')));
  }

  // 渲染每个工具选项
  toolNames.forEach((toolName, index) => {
    const adapter = registry.getAdapter(toolName);
    const isSelected = index === currentSelection;

    // 选中项显示箭头和绿色高亮
    if (isSelected) {
      const prefix = chalk.cyan('❯ ');
      const displayName = chalk.green(adapter.displayName);
      console.log(`${prefix}${displayName}`);
    }
    // 未选中项显示灰色
    else {
      const prefix = '  ';
      const displayName = chalk.gray(adapter.displayName);
      console.log(`${prefix}${displayName}`);
    }
  });
}
