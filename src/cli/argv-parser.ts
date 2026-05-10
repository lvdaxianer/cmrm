/**
 * CLI 参数解析器
 * 解析 process.argv.slice(2) 为结构化结果(ParsedArgs 联合类型)
 *
 * 设计目标:
 * - 不依赖任何 IO,纯函数便于单测
 * - 不引入运行时依赖(yargs/commander),保持 zero-dep 原则
 * - 通过联合类型让消费方使用 if/else 分支显式处理每种情况
 *
 * 支持命令:
 *   cmrm                                      → interactive(进入原交互模式)
 *   cmrm --help / -h / help                   → help
 *   cmrm switch <model-name>                  → { kind: 'switch', model }
 *   cmrm test <model-name>                    → { kind: 'test', model }
 *   cmrm alias <model-name> <new-alias>       → { kind: 'alias', model, alias }
 *   cmrm <tool> import <file>                 → { kind: 'import', tool, file }
 *   cmrm <other>                              → { kind: 'unknown', input }
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

/**
 * 解析后的命令行参数
 * 联合类型,每个分支表示一种执行路径
 */
export type ParsedArgs =
  | { kind: 'help' }
  | { kind: 'version' }
  | { kind: 'switch'; model: string }
  | { kind: 'test'; model: string }
  | { kind: 'alias'; model: string; alias: string }
  | { kind: 'setLang'; locale: string }
  | { kind: 'import'; tool: string; file: string }
  | { kind: 'unknown'; input: string }
  | { kind: 'interactive' };

/** 帮助标志集合(所有等价于 --help 的形式) */
const HELP_FLAGS = new Set(['--help', '-h', 'help']);

/** 版本标志集合(所有等价于 --version 的形式) */
const VERSION_FLAGS = new Set(['--version', '-v', '-version', 'version']);

/**
 * 解析 process.argv.slice(2) 为结构化结果
 * 不依赖 IO,纯函数便于单测
 *
 * @param args - process.argv.slice(2) 的副本
 * @return 解析结果
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function parseArgv(args: string[]): ParsedArgs {
  // 无参数:保持现有交互模式
  if (args.length === 0) {
    return { kind: 'interactive' };
  }
  // 有参数:进入子分支判断
  else {
    return parseFirstToken(args);
  }
}

/**
 * 根据首个 token 分发到具体解析逻辑
 *
 * @param args - 完整参数数组(已确认非空)
 * @return 解析结果
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function parseFirstToken(args: string[]): ParsedArgs {
  const first = args[0];
  const rest = args.slice(1);

  // help 标志(--help / -h / help)
  if (HELP_FLAGS.has(first)) {
    return { kind: 'help' };
  }
  // version 标志(--version / -v / version)
  else if (VERSION_FLAGS.has(first)) {
    return { kind: 'version' };
  }
  // switch 子命令
  else if (first === 'switch') {
    return parseSwitch(rest);
  }
  // test 子命令
  else if (first === 'test') {
    return parseTest(rest);
  }
  // alias 子命令
  else if (first === 'alias') {
    return parseAlias(rest);
  }
  // set-lang 子命令
  else if (first === 'set-lang') {
    return parseSetLang(rest);
  }
  // 工具子命令 (claude/codex import <file>)
  else if (first === 'claude' || first === 'codex') {
    return parseToolCommand(first, rest);
  }
  // 其他:未知命令
  else {
    return { kind: 'unknown', input: first };
  }
}

/**
 * 解析 switch <model-name>
 * 缺失模型名时降级为 unknown,提示用户查看 help
 *
 * @param rest - 'switch' 之后的剩余参数
 * @return 解析结果
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function parseSwitch(rest: string[]): ParsedArgs {
  const model = rest[0]?.trim();

  // 缺失模型名:作为未知命令处理(消费方会输出友好提示)
  if (!model) {
    return { kind: 'unknown', input: 'switch (missing model name)' };
  }
  // 输入完整:返回 switch 分支
  else {
    return { kind: 'switch', model };
  }
}

/**
 * 解析 test <model-name>
 * 缺失模型名时降级为 unknown,提示用户查看 help
 *
 * @param rest - 'test' 之后的剩余参数
 * @return 解析结果
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function parseTest(rest: string[]): ParsedArgs {
  const model = rest[0]?.trim();

  // 缺失模型名:作为未知命令处理
  if (!model) {
    return { kind: 'unknown', input: 'test (missing model name)' };
  }
  // 输入完整:返回 test 分支
  else {
    return { kind: 'test', model };
  }
}

/** 支持的语言代码集合 */
const VALID_LOCALES = new Set(['zh', 'en', 'ja']);

/**
 * 解析 set-lang <locale>
 * 缺失 locale 或无效时降级为 unknown
 *
 * @param rest - 'set-lang' 之后的剩余参数
 * @return 解析结果
 * @author lvdaxianerplus
 * @date 2026-05-06
 */
function parseSetLang(rest: string[]): ParsedArgs {
  const locale = rest[0]?.trim();

  // 缺失语言代码:作为未知命令处理
  if (!locale) {
    return { kind: 'unknown', input: 'set-lang (missing locale)' };
  }
  // 无效语言代码:提示可用选项
  else if (!VALID_LOCALES.has(locale)) {
    return { kind: 'unknown', input: `set-lang ${locale} (invalid, must be zh/en/ja)` };
  }
  // 输入完整且有效:返回 setLang 分支
  else {
    return { kind: 'setLang', locale };
  }
}

/**
 * 解析 alias <model-name> <new-alias>
 * 任一参数缺失时降级为 unknown,提示用户查看 help
 *
 * @param rest - 'alias' 之后的剩余参数
 * @return 解析结果
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
function parseAlias(rest: string[]): ParsedArgs {
  const model = rest[0]?.trim();
  const alias = rest[1]?.trim();

  // 缺失模型名 / 别名:作为未知命令处理
  if (!model || !alias) {
    return { kind: 'unknown', input: 'alias (missing model/alias)' };
  }
  // 输入完整:返回 alias 分支
  else {
    return { kind: 'alias', model, alias };
  }
}

/** 支持的工具名称集合 */
const VALID_TOOLS = new Set(['claude', 'codex']);

/**
 * 解析工具子命令
 * 当前支持: <tool> import <file>
 * 未来可扩展其他工具级快捷命令
 *
 * @param tool - 工具名称(claude/codex)
 * @param rest - 工具名之后的剩余参数
 * @return 解析结果
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function parseToolCommand(tool: string, rest: string[]): ParsedArgs {
  const sub = rest[0]?.trim();

  // import 子命令:解析文件路径
  if (sub === 'import') {
    return parseImport(tool, rest.slice(1));
  }
  // 其他工具子命令:视为 unknown
  else {
    return { kind: 'unknown', input: `${tool} ${sub || ''}` };
  }
}

/**
 * 去除字符串首尾引号("或')
 * 兼容 shell 传参时保留引号的场景
 *
 * @param s - 原始字符串
 * @return 去引号后的字符串
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/**
 * 解析 import <file>
 * 缺失文件路径时降级为 unknown
 * 支持引号包裹的路径: cmrm claude import "config.json"
 *
 * @param tool - 工具名称
 * @param rest - 'import' 之后的剩余参数
 * @return 解析结果
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function parseImport(tool: string, rest: string[]): ParsedArgs {
  const raw = rest[0]?.trim();
  const file = raw ? stripQuotes(raw) : '';

  // 缺失文件路径:作为未知命令处理
  if (!file) {
    return { kind: 'unknown', input: `${tool} import (missing file path)` };
  }
  // 输入完整:返回 import 分支
  else {
    return { kind: 'import', tool, file };
  }
}
