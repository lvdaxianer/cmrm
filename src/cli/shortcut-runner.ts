/**
 * CLI 快捷方式执行器
 * 处理 `cmrm switch <name>` / `cmrm test <name>` / `cmrm --help` 等一行式命令
 *
 * 与交互模式的差异:
 * - 不打开 readline / inquirer 接口(完全无交互)
 * - 执行完毕后由调用方 process.exit(返回码)
 * - 找不到模型时输出友好提示并以非零退出码结束
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { ToolAdapter, registry, ClaudeAdapter } from '../adapters';
import { UnifiedModelConfig } from '../types';
import { UIRenderer } from './ui';
import { ParsedArgs } from './argv-parser';
import { findModelByName, listAvailableNames } from './model-finder';
import { runSwitchAction } from './model-actions';
import { testModelConfig } from '../utils/tester';
import { printHelp } from './help-printer';
import { printVersion } from './version-printer';
import { runAliasShortcut } from './alias-shortcut';
import { createI18n, t } from '../i18n';
import { ConfigManager } from '../config';

/** 默认工具名(目前 registry 仅注册了 claude) */
const DEFAULT_TOOL_NAME = 'claude';

/** 退出码:成功 */
const EXIT_OK = 0;

/** 退出码:失败 */
const EXIT_FAIL = 1;

/**
 * 执行快捷命令
 * 根据 parsed.kind 分发到对应处理逻辑,返回进程退出码
 *
 * @param parsed - 已解析的命令行参数
 * @param ui - UI 渲染器
 * @return 进程退出码(0 成功 / 1 失败)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export async function runShortcut(parsed: ParsedArgs, ui: UIRenderer): Promise<number> {
  // help 直接打印文案
  if (parsed.kind === 'help') {
    printHelp();
    return EXIT_OK;
  }
  // version 直接打印版本号
  else if (parsed.kind === 'version') {
    printVersion();
    return EXIT_OK;
  }
  // set-lang:直接设置语言,无需 adapter
  else if (parsed.kind === 'setLang') {
    return runSetLangShortcut(parsed.locale, ui);
  }
  // switch / test / unknown:进入命令分发(需保证 adapter 已注册)
  else {
    return runWithAdapter(parsed, ui);
  }
}

/**
 * 在 adapter 注册完成后分发命令
 * 集中处理 switch / test / alias / unknown / interactive 五种情况
 *
 * @param parsed - 已解析参数
 * @param ui - UI 渲染器
 * @return 进程退出码
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function runWithAdapter(parsed: ParsedArgs, ui: UIRenderer): Promise<number> {
  ensureAdapterRegistered();
  const adapter = registry.getAdapter(DEFAULT_TOOL_NAME);
  return dispatchByKind(parsed, adapter, ui);
}

/**
 * 根据 parsed.kind 分发到具体快捷处理函数
 * 抽离独立函数以保证父函数 ≤ 20 行
 *
 * @param parsed - 已解析参数
 * @param adapter - 已就绪的工具适配器
 * @param ui - UI 渲染器
 * @return 进程退出码
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function dispatchByKind(
  parsed: ParsedArgs,
  adapter: ToolAdapter,
  ui: UIRenderer
): Promise<number> {
  // switch <model>:切换模型
  if (parsed.kind === 'switch') {
    return runSwitchShortcut(adapter, parsed.model, ui);
  }
  // test <model>:测试连通性
  else if (parsed.kind === 'test') {
    return runTestShortcut(adapter, parsed.model, ui);
  }
  // alias <model> <alias>:为模型添加别名
  else if (parsed.kind === 'alias') {
    return runAliasShortcut(adapter, parsed.model, parsed.alias, ui);
  }
  // unknown / interactive:进入 fallback 分支
  else {
    return dispatchFallback(parsed, ui);
  }
}

/**
 * 处理 unknown / interactive 兜底分支
 *
 * @param parsed - 已解析参数(此时 kind 已收敛为 unknown 或 interactive)
 * @param ui - UI 渲染器
 * @return 进程退出码
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function dispatchFallback(parsed: ParsedArgs, ui: UIRenderer): number {
  // unknown:打印未知命令提示
  if (parsed.kind === 'unknown') {
    return reportUnknown(parsed.input, ui);
  }
  // interactive 在 cli.ts 入口已分流,理论不会进入此分支
  else {
    return EXIT_OK;
  }
}

/**
 * 确保默认 adapter 已注册(幂等)
 * registry.register 内部使用 Map.set,重复注册会被覆盖,无副作用
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function ensureAdapterRegistered(): void {
  // 已注册:跳过(避免重复实例化)
  if (registry.getToolNames().includes(DEFAULT_TOOL_NAME)) {
    return;
  }
  // 未注册:补充注册
  else {
    registry.register(new ClaudeAdapter());
  }
}

/**
 * 执行 switch 快捷方式
 * 找到模型则调用 runSwitchAction,否则输出未找到提示
 *
 * @param adapter - 工具适配器
 * @param name - 用户输入的模型名
 * @param ui - UI 渲染器
 * @return 退出码
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function runSwitchShortcut(adapter: ToolAdapter, name: string, ui: UIRenderer): Promise<number> {
  const model = findModelByName(adapter, name);

  // 未找到:友好提示并退出码 1
  if (!model) {
    printModelNotFound(adapter, name, ui);
    return EXIT_FAIL;
  }
  // 找到:执行切换
  else {
    await runSwitchAction(adapter, model, ui);
    return EXIT_OK;
  }
}

/**
 * 执行 test 快捷方式
 * 找到模型则发起一次性 HTTP 测试并显示结果
 *
 * @param adapter - 工具适配器
 * @param name - 用户输入的模型名
 * @param ui - UI 渲染器
 * @return 退出码(测试失败也以退出码 1 反馈)
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function runTestShortcut(adapter: ToolAdapter, name: string, ui: UIRenderer): Promise<number> {
  const model = findModelByName(adapter, name);

  // 未找到模型:与 switch 一致的友好提示
  if (!model) {
    printModelNotFound(adapter, name, ui);
    return EXIT_FAIL;
  }
  // 找到:执行测试,根据测试结果决定退出码
  else {
    return runTestForModel(model, ui);
  }
}

/**
 * 对已找到的模型发起一次测试
 * 抽离独立函数避免父函数嵌套过深
 *
 * @param model - 已查到的模型配置
 * @param ui - UI 渲染器
 * @return 退出码:测试通过 0 / 失败 1
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
async function runTestForModel(model: UnifiedModelConfig, ui: UIRenderer): Promise<number> {
  const apiType = model.apiType ?? 'anthropic';
  const modelName = model.name || model.model;
  ui.showInfo(t('shortcut.testing', { apiType, name: modelName }));

  const result = await testModelConfig(model.model, model.apiKey, model.baseUrl, apiType);
  ui.showTestResult(result);

  // 通过:退出码 0
  if (result.success) {
    return EXIT_OK;
  }
  // 失败:退出码 1,便于脚本管道判断
  else {
    return EXIT_FAIL;
  }
}

/**
 * 输出未知命令提示
 * 用户可通过 `cmrm --help` 查看支持的命令列表
 *
 * @param input - 触发的输入
 * @param ui - UI 渲染器
 * @return 退出码 1
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function reportUnknown(input: string, ui: UIRenderer): number {
  ui.showError(t('fuzzy.unknownCommand', { input }));
  ui.showInfo(t('help.showHelpHint'));
  return EXIT_FAIL;
}

/**
 * 输出"模型未找到"提示并附带可用模型清单
 *
 * @param adapter - 工具适配器
 * @param name - 用户尝试查找的名称
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function printModelNotFound(adapter: ToolAdapter, name: string, ui: UIRenderer): void {
  ui.showError(t('shortcut.modelNotFound', { name }));
  const available = listAvailableNames(adapter);

  // 有已保存模型:列出供参考
  if (available.length > 0) {
    ui.showInfo(t('shortcut.availableModels'));
    available.forEach(n => ui.showInfo(`  - ${n}`));
  }
  // 完全没有模型:引导用户先添加
  else {
    ui.showInfo(t('shortcut.noModelsHint'));
  }
}

/**
 * 执行 set-lang 快捷方式
 * 直接设置语言,无需交互和 adapter
 *
 * @param locale - 目标语言代码(zh/en/ja)
 * @param ui - UI 渲染器
 * @return 退出码
 * @author lvdaxianerplus
 * @date 2026-05-06
 */
async function runSetLangShortcut(locale: string, ui: UIRenderer): Promise<number> {
  const configManager = new ConfigManager();
  const i18n = createI18n(configManager);
  await i18n.initialize();
  await i18n.setLocale(locale as 'zh' | 'en' | 'ja');

  ui.showSuccess(t('commands.setLang.success', { locale }));
  return EXIT_OK;
}
