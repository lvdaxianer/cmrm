/**
 * /test 命令编排层
 * 抽离自 cli.ts 中的 showTestMenu / runTestFlow / handleTestMenuError / dispatchTestChoice
 *
 * 与 TestHandler 的关系：
 * - TestHandler 负责具体的测试逻辑（已保存模型 / 自定义参数）
 * - 本模块负责菜单编排、异常处理与"退出"分发
 *
 * 循环菜单设计：
 * - 测试完成（成功或失败）后停留在测试子菜单，避免每次都从命令菜单重新走流程
 * - 仅当用户主动选择「返回上一级」或「退出」时跳出循环
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import chalk from 'chalk';
import { ToolAdapter } from '../adapters';
import { UIRenderer } from './ui';
import { TestHandler, TestMenuChoice } from './test-handler';
import { t } from '../i18n';

/** 退出码:成功 */
const EXIT_OK = 0;

/**
 * 执行 /test 主菜单流程
 * 循环显示子菜单：每次执行 saved/custom 测试后回到本菜单，便于连续测试
 *
 * @param adapter - 已选中的工具适配器
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function runTestMenu(adapter: ToolAdapter, ui: UIRenderer): Promise<void> {
  const handler = new TestHandler(ui, adapter);

  // 循环展示菜单：用户主动选择返回/退出才跳出
  while (true) {
    const shouldContinue = await runOneRound(handler, ui);

    // 用户选择返回上一级：退出循环交由外层分发
    if (!shouldContinue) {
      return;
    }
    // 测试完成后继续下一轮
    else {
      // 提示用户可继续测试或返回
      printContinueHint(ui);
    }
  }
}

/**
 * 执行一轮测试菜单
 * 内部捕获异常以保证循环不被打断
 *
 * @param handler - 测试处理器
 * @param ui - UI 渲染器
 * @return true 表示继续下一轮，false 表示用户选择返回
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function runOneRound(handler: TestHandler, ui: UIRenderer): Promise<boolean> {
  try {
    const choice = await handler.showMenu();
    return await dispatchTestChoice(handler, choice);
  }
  // 测试流程异常：保留原始堆栈用于排查并继续循环（避免单次错误导致用户重走流程）
  catch (error) {
    handleTestMenuError(error, ui);
    return true;
  }
}

/**
 * 打印继续测试的提示
 *
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function printContinueHint(ui: UIRenderer): void {
  ui.showInfo('\n' + t('test.continueHint'));
}

/**
 * 处理测试菜单异常
 * 用户可见层：仅提示错误概要；调试层：原始堆栈写入 stderr
 *
 * @param error - 原始异常对象
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function handleTestMenuError(error: unknown, ui: UIRenderer): void {
  const message = error instanceof Error ? error.message : String(error);

  // 用户可见提示
  ui.showError(`\n${t('test.testFailed')}: ${message}`);

  // Error 实例：保留 stack 便于排查
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  // 非 Error：原样输出避免信息丢失
  else {
    console.error(error);
  }
}

/**
 * 根据用户选择分发测试流程
 *
 * @param handler - 测试处理器
 * @param choice - 用户菜单选择
 * @return true 表示继续循环，false 表示返回上一级
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function dispatchTestChoice(handler: TestHandler, choice: TestMenuChoice): Promise<boolean> {
  // 测试已保存模型：继续循环
  if (choice === 'saved') {
    await handler.testSavedModel();
    return true;
  }
  // 自定义参数测试：继续循环
  else if (choice === 'custom') {
    await handler.testCustom();
    return true;
  }
  // 直接退出程序（不返回）
  else if (choice === 'exit') {
    console.log(chalk.yellow('\n' + t('commands.goodbye')));
    process.exit(EXIT_OK);
  }
  // back：跳出循环，由外层返回命令菜单
  else {
    return false;
  }
}
