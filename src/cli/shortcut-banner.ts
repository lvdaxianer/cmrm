/**
 * 主菜单顶部的快捷方式横幅
 * 在每次显示主命令菜单前打印简略 hint,引导用户使用一行式快捷命令
 *
 * 设计要点:
 * - 浓缩版 hint(3 行),不替代 `cmrm --help` 完整文案
 * - 不依赖 UIRenderer,直接 console.log + chalk,避免循环引用
 * - 集中维护快捷方式条目,便于今后增删
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import chalk from 'chalk';

/** 单条快捷方式的命令与描述 */
interface ShortcutItem {
  /** 终端命令(含参数占位) */
  cmd: string;
  /** 命令描述(简体中文) */
  desc: string;
}

/** 快捷方式条目集合,集中维护避免散落多处 */
const SHORTCUTS: ShortcutItem[] = [
  { cmd: 'cmrm switch <name>',          desc: '快速切换模型' },
  { cmd: 'cmrm test <name>',            desc: '快速测试连通性' },
  { cmd: 'cmrm alias <name> <alias>',   desc: '为模型添加别名' },
  { cmd: 'cmrm --help',                 desc: '查看详细帮助' },
];

/** 首行前缀("Shortcuts: "),其余行用等宽留白对齐 */
const HEADER = 'Shortcuts: ';

/** 命令列对齐宽度(取 SHORTCUTS 中最长命令长度 + 4 留白) */
const CMD_COLUMN_WIDTH = 32;

/**
 * 打印主菜单顶部的快捷方式横幅
 * 输出 3 行命令清单 + 1 行尾部空行,首行带 "Shortcuts:" 前缀,后续行竖直对齐
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function printShortcutBanner(): void {
  // 空数组保护:无快捷方式则不输出任何内容(理论不会触发)
  if (SHORTCUTS.length === 0) {
    return;
  }
  // 正常路径:首行加 "Shortcuts:" 前缀,后续行使用等宽留白
  else {
    printShortcutLines();
    console.log('');
  }
}

/**
 * 逐行打印快捷方式条目
 * 拆为独立函数避免父函数嵌套过深
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function printShortcutLines(): void {
  const indent = ' '.repeat(HEADER.length);

  // 首行:Shortcuts: 前缀
  printShortcutLine(SHORTCUTS[0], chalk.cyan(HEADER));
  // 后续行:用等宽空白前缀,保持竖直对齐
  for (let i = 1; i < SHORTCUTS.length; i++) {
    printShortcutLine(SHORTCUTS[i], indent);
  }
}

/**
 * 打印单条快捷方式行
 * 命令列绿色加粗,描述列灰色弱化
 *
 * @param item - 快捷方式条目
 * @param prefix - 行首前缀(首行 "Shortcuts:" / 后续等宽留白)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function printShortcutLine(item: ShortcutItem, prefix: string): void {
  const cmdPadded = item.cmd.padEnd(CMD_COLUMN_WIDTH);
  console.log(prefix + chalk.green(cmdPadded) + chalk.gray(item.desc));
}
