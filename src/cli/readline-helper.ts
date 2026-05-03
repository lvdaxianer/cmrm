/**
 * readline 生命周期辅助模块
 * 抽离自 cli.ts，统一处理 readline 与 stdin/inquirer 的状态切换
 *
 * 设计动机：
 * - cli.ts 中每个交互方法开头都重复 4 行 stdin 状态重置逻辑
 * - inquirer 在 raw mode 下行为不稳定，需要显式退出
 * - 多次复用同一段代码违反 code-review-spec 3.11 重复检测规范
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import * as readline from 'readline';

/** 命令补全函数签名（与 readline.Completer 兼容） */
export type CompleterFn = (input: string) => [string[], string];

/** 行输入回调 */
export type LineHandler = (input: string) => void;

/**
 * 进入 inquirer 交互前的准备工作
 * 移除 readline 监听器、关闭接口、退出 stdin raw mode
 *
 * 必要性：inquirer 在 readline 仍然监听 line 事件时会出现重复触发
 * 同时 stdin 处于 raw mode 时 inquirer 的 line input 无法正常工作
 *
 * @param rl - 当前活跃的 readline 接口
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function prepareForInquirer(rl: readline.Interface): void {
  // 移除现有 line 监听器，防止 inquirer 输入被截获
  rl.removeAllListeners('line');

  // 关闭旧 readline 接口，释放 stdin 控制权
  rl.close();

  // raw mode 已开启时退出，让 inquirer 能正常读取整行
  if (process.stdin.isRaw) {
    process.stdin.setRawMode(false);
  }
  // 已是普通模式时无须切换
  else {
    // 不进行任何操作
  }

  // 确保 stdin 可读（之前可能被 pause）
  process.stdin.resume();
}

/**
 * 创建带命令补全的 readline 接口
 * 抽离自原 cli.ts 构造函数与 recreateReadline，统一接口创建逻辑
 *
 * @param completer - 命令补全函数
 * @param lineHandler - line 事件处理函数
 * @return 新创建的 readline 接口
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function createReadlineInterface(
  completer: CompleterFn,
  lineHandler: LineHandler
): readline.Interface {
  // 全局启用 keypress 事件（重复调用安全，内部去重）
  readline.emitKeypressEvents(process.stdin);

  // 恢复 stdin 输入流（防止之前 pause 状态延续）
  process.stdin.resume();

  // 创建新接口
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
    completer,
  });

  // 绑定 line 事件
  rl.on('line', (input) => lineHandler(input.trim()));

  return rl;
}

/**
 * 校验"索引输入"是否为 [0, totalOptions) 范围内的整数
 * 由 tool-selector / model-picker / alias-actions 共享,避免三处重复实现
 *
 * @param value - inquirer 用户输入字符串
 * @param totalOptions - 选项总数(下界自动 0)
 * @return 合法返回 true,否则返回中文错误提示
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function validateIndexInput(value: string, totalOptions: number): string | true {
  const num = parseInt(value, 10);

  // 非数字 / 越界:拒绝
  if (isNaN(num) || num < 0 || num >= totalOptions) {
    return `请输入 0-${totalOptions - 1} 之间的数字`;
  }
  // 合法:放行
  else {
    return true;
  }
}
