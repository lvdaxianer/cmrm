/**
 * CLI 版本号输出
 * 处理 `cmrm --version` / `cmrm -v` / `cmrm version` 的版本展示
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import chalk from 'chalk';

/**
 * 从 package.json 中读取版本号
 * 开发环境使用相对路径，生产环境使用 require 解析
 *
 * @return 版本号字符串
 * @author lvdaxianerplus
 * @date 2026-05-06
 */
function getVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../package.json');
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * 打印 CLI 版本号
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */
export function printVersion(): void {
  console.log(chalk.cyan(`cmrm v${getVersion()}`));
}
