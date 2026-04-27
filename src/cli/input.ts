/**
 * CLI 键盘输入处理模块
 * 处理上下键选择、Enter确认、Esc取消等键盘事件
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import * as readline from 'readline';

/**
 * 键盘回调函数类型
 * 处理键盘输入的回调
 */
export type KeyPressCallback = (action: KeyAction) => void;

/**
 * 键盘动作类型
 * 表示用户执行的键盘操作
 */
export type KeyAction = 'up' | 'down' | 'confirm' | 'cancel' | 'exit';

/**
 * 键盘监听器类
 * 管理 stdin 的 raw mode 和键盘事件监听
 */
export class KeyListener {
  /** stdin 是否处于 raw mode */
  private isRawMode: boolean = false;

  /** 当前keypress事件回调 */
  private currentCallback: KeyPressCallback | null = null;

  /** 绑定后的keypress处理函数（保持引用一致以便移除） */
  private boundHandleKeyPress: (str: string, key: readline.Key) => void;

  /**
   * 构造函数
   * 预绑定keypress处理函数，确保引用一致
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  constructor() {
    // 预绑定方法，确保每次调用 startListening 时引用一致
    this.boundHandleKeyPress = this.handleKeyPress.bind(this);
  }

  /**
   * 开始监听键盘输入
   * 进入 raw mode 并设置事件监听
   * 每次启动前都会重新启用 keypress 事件
   *
   * @param callback - 键盘动作回调函数
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  startListening(callback: KeyPressCallback): void {
    const stdin = process.stdin;

    // 重新启用 keypress 事件（重要！每次都需要）
    readline.emitKeypressEvents(stdin);

    // 进入 raw mode
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();

    this.isRawMode = true;
    this.currentCallback = callback;

    // 使用预绑定的函数作为监听器
    stdin.on('keypress', this.boundHandleKeyPress);
  }

  /**
   * 停止监听键盘输入
   * 退出 raw mode 并清理事件监听，恢复 stdin 流
   *
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  stopListening(): void {
    const stdin = process.stdin;

    // 移除监听器（使用预绑定的函数引用）
    stdin.removeListener('keypress', this.boundHandleKeyPress);

    // 退出 raw mode
    if (stdin.isRaw) {
      stdin.setRawMode(false);
    }
    this.isRawMode = false;
    this.currentCallback = null;

    // 恢复 stdin 流（确保后续可以继续读取）
    stdin.resume();
  }

  /**
   * 处理 keypress 事件
   * 将键盘输入转换为动作类型
   * 注意：raw mode 下不要使用 console.log，否则会干扰渲染
   *
   * @param str - 输入的字符
   * @param key - 键盘信息对象
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  private handleKeyPress(str: string, key: readline.Key): void {
    // 未设置回调时不处理
    if (!this.currentCallback) {
      return;
    }

    // 向上选择
    if (key.name === 'up') {
      this.currentCallback('up');
    }
    // 向下选择
    else if (key.name === 'down') {
      this.currentCallback('down');
    }
    // Enter 确认
    else if (key.name === 'return' || key.name === 'enter') {
      this.currentCallback('confirm');
    }
    // Esc 取消
    else if (key.name === 'escape') {
      this.currentCallback('cancel');
    }
    // Ctrl+C 退出程序
    else if (key.ctrl && key.name === 'c') {
      this.currentCallback('exit');
    }
    // 其他按键不处理
    else {
      // 忽略其他输入
    }
  }

  /**
   * 检查是否正在监听
   *
   * @return 如果处于 raw mode 返回 true
   * @author lvdaxianerplus
   * @date 2026-04-27
   */
  isListening(): boolean {
    return this.isRawMode;
  }
}