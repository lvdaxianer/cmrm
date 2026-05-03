/**
 * CLI 启动分发
 * 根据 process.argv 决定走交互模式 / 快捷方式
 *
 * 拆分原因:
 * - 让 cli.ts 主体专注 CLI 类的实现
 * - 入口分发逻辑独立可测,避免直接污染主类
 *
 * 调用关系:
 *   cli.ts 末尾 require.main === module → bootstrap()
 *     ├─ interactive  → startInteractiveCli() → new CLI().start()
 *     └─ shortcut     → startShortcut(parsed) → runShortcut() → process.exit(code)
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import chalk from 'chalk';
import { UIRenderer } from './ui';
import { parseArgv, ParsedArgs } from './argv-parser';
import { runShortcut } from './shortcut-runner';
import type { CLI } from '../cli';

/** 致命错误的退出码 */
const FATAL_EXIT_CODE = 1;

/**
 * 启动交互式 CLI(原默认行为)
 * 通过依赖注入的 createCli 工厂回避对 ../cli 的循环依赖
 *
 * @param createCli - 创建 CLI 实例的工厂函数
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function startInteractiveCli(createCli: () => CLI): void {
  const cli = createCli();

  cli.start().catch((error: Error) => {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    process.exit(FATAL_EXIT_CODE);
  });
}

/**
 * 执行快捷方式并以解析得到的退出码结束进程
 *
 * @param parsed - 已解析参数(非 interactive 分支)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function startShortcut(parsed: ParsedArgs): void {
  const ui = new UIRenderer();

  runShortcut(parsed, ui)
    .then((code) => process.exit(code))
    .catch((error: Error) => {
      console.error(chalk.red(`Fatal error: ${error.message}`));
      process.exit(FATAL_EXIT_CODE);
    });
}

/**
 * 程序入口分发
 * 无参数走交互模式;有快捷参数(switch/test/help/unknown)走 runShortcut
 *
 * @param createCli - 创建 CLI 实例的工厂函数(由 cli.ts 注入,避免循环引用)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function bootstrap(createCli: () => CLI): void {
  const parsed = parseArgv(process.argv.slice(2));

  // interactive 分支:沿用原 CLI 类启动
  if (parsed.kind === 'interactive') {
    startInteractiveCli(createCli);
  }
  // 其他分支:执行快捷方式后退出
  else {
    startShortcut(parsed);
  }
}
