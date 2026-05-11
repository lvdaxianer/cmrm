/**
 * CLI 快捷方式执行器
 * 处理 `cmrm switch <name>` / `cmrm test <name>` / `cmrm --help` 等一行式命令
 *
 * 与交互模式的差异:
 * - 不打开 readline / inquirer 接口(完全无交互)
 * - 执行完毕后由调用方 process.exit(返回码)
 * - 找不到模型时输出友好提示并以非零退出码结束
 *
 * 多工具支持:
 * - switch/test/alias 命令遍历所有已注册工具的模型列表查找目标
 * - 找到后使用对应适配器执行操作
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 * @date 2026-05-09 修改: 支持多工具模型查找
 */

import { ToolAdapter, registry, ClaudeAdapter, CodexAdapter } from '../adapters';
import { UnifiedModelConfig } from '../types';
import { UIRenderer } from './ui';
import { ParsedArgs } from './argv-parser';
import { findModelByName } from './model-finder';
import { runSwitchAction } from './model-actions';
import { testModelConfig } from '../utils/tester';
import { printHelp } from './help-printer';
import { printVersion } from './version-printer';
import { runAliasShortcut } from './alias-shortcut';
import { runImportShortcut } from './import-handler';
import { runSetLangShortcut } from './set-lang-shortcut';
import { reportUnknown, printModelNotFoundAllTools } from './shortcut-helpers';
import { t } from '../i18n';
import { getPrimaryModelName } from './model-identity';

/** 退出码:成功 */
const EXIT_OK = 0;

/** 退出码:失败 */
const EXIT_FAIL = 1;

/** 默认 API 类型 */
const DEFAULT_API_TYPE = 'anthropic';

/**
 * 跨所有工具查找模型结果
 */
interface ModelSearchResult {
  /** 命中模型的适配器 */
  adapter: ToolAdapter;
  /** 命中的模型配置 */
  model: UnifiedModelConfig;
}

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
  // import:从文件导入模型配置
  else if (parsed.kind === 'import') {
    ensureAllAdaptersRegistered();
    return runImportShortcut(parsed.tool, parsed.file, ui);
  }
  // switch / test / alias:进入多工具命令分发
  else {
    return runMultiToolShortcut(parsed, ui);
  }
}

/**
 * 多工具快捷命令分发
 * 遍历所有适配器查找目标模型并执行操作
 *
 * @param parsed - 已解析参数
 * @param ui - UI 渲染器
 * @return 进程退出码
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
async function runMultiToolShortcut(parsed: ParsedArgs, ui: UIRenderer): Promise<number> {
  ensureAllAdaptersRegistered();
  return dispatchByKind(parsed, ui);
}

/**
 * 根据 parsed.kind 分发到具体快捷处理函数
 *
 * @param parsed - 已解析参数
 * @param ui - UI 渲染器
 * @return 进程退出码
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
async function dispatchByKind(parsed: ParsedArgs, ui: UIRenderer): Promise<number> {
  // switch <model>:切换模型
  if (parsed.kind === 'switch') {
    return runSwitchShortcut(parsed.model, ui);
  }
  // test <model>:测试连通性
  else if (parsed.kind === 'test') {
    return runTestShortcut(parsed.model, ui);
  }
  // alias <model> <alias>:为模型添加别名
  else if (parsed.kind === 'alias') {
    return runAliasShortcutMultiTool(parsed.model, parsed.alias, ui);
  }
  // unknown / interactive:进入 fallback 分支
  else {
    return dispatchFallback(parsed, ui);
  }
}

/**
 * 跨所有已注册工具查找模型
 * 按 name → aliases → model 三级匹配
 *
 * @param name - 用户输入的模型名
 * @return 查找结果，未命中返回 undefined
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function findModelAcrossAllAdapters(name: string): ModelSearchResult | undefined {
  // 遍历所有已注册适配器
  for (const adapter of registry.getAllAdapters()) {
    const model = findModelByName(adapter, name);
    // 命中:返回结果
    if (model) {
      return { adapter, model };
    }
  }
  // 全部未命中
  return undefined;
}

/**
 * 确保所有适配器已注册(幂等)
 * registry.register 内部使用 Map.set,重复注册会被覆盖,无副作用
 *
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function ensureAllAdaptersRegistered(): void {
  const toolNames = registry.getToolNames();

  // 注册 Claude 适配器
  if (!toolNames.includes('claude')) {
    registry.register(new ClaudeAdapter());
  }
  // 已注册 Claude 适配器:无需重复注册
  else {
    // 保持现有注册状态
  }

  // 注册 Codex 适配器
  if (!toolNames.includes('codex')) {
    registry.register(new CodexAdapter());
  }
  // 已注册 Codex 适配器:无需重复注册
  else {
    // 保持现有注册状态
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
 * 执行 switch 快捷方式
 * 找到模型则调用 runSwitchAction,否则输出未找到提示
 *
 * @param name - 用户输入的模型名
 * @param ui - UI 渲染器
 * @return 退出码
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
async function runSwitchShortcut(name: string, ui: UIRenderer): Promise<number> {
  const found = findModelAcrossAllAdapters(name);

  // 未找到:友好提示并退出码 1
  if (!found) {
    printModelNotFoundAllTools(name, ui);
    return EXIT_FAIL;
  }
  // 找到:执行切换
  else {
    await runSwitchAction(found.adapter, found.model, ui);
    return EXIT_OK;
  }
}

/**
 * 执行 test 快捷方式
 * 找到模型则发起一次性 HTTP 测试并显示结果
 *
 * @param name - 用户输入的模型名
 * @param ui - UI 渲染器
 * @return 退出码(测试失败也以退出码 1 反馈)
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
async function runTestShortcut(name: string, ui: UIRenderer): Promise<number> {
  const found = findModelAcrossAllAdapters(name);

  // 未找到模型:与 switch 一致的友好提示
  if (!found) {
    printModelNotFoundAllTools(name, ui);
    return EXIT_FAIL;
  }
  // 找到:执行测试,根据测试结果决定退出码
  else {
    return runTestForModel(found.model, ui);
  }
}

/**
 * 执行 alias 快捷方式(多工具版)
 * 找到模型后调用对应适配器的别名添加逻辑
 *
 * @param modelName - 用户输入的模型名
 * @param alias - 待添加的别名
 * @param ui - UI 渲染器
 * @return 进程退出码
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
async function runAliasShortcutMultiTool(
  modelName: string,
  alias: string,
  ui: UIRenderer
): Promise<number> {
  const found = findModelAcrossAllAdapters(modelName);

  // 未找到:友好提示
  if (!found) {
    printModelNotFoundAllTools(modelName, ui);
    return EXIT_FAIL;
  }
  // 找到:使用对应适配器添加别名
  else {
    return runAliasShortcut(found.adapter, modelName, alias, ui);
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
  const apiType = model.apiType ?? DEFAULT_API_TYPE;
  const modelName = getPrimaryModelName(model);
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
