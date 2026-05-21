/**
 * CLI 参数解析器测试
 * 验证 parseArgv 各分支的解析结果
 *
 * 测试覆盖矩阵:
 *  - 空参数              → interactive
 *  - --help / -h / help  → help
 *  - switch <model>      → { kind: 'switch', model }
 *  - test   <model>      → { kind: 'test',   model }
 *  - alias  <model> <a>  → { kind: 'alias',  model, alias }   (本次新增)
 *  - 缺少模型名/别名     → unknown
 *  - 未识别命令          → unknown
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

import { describe, it, expect } from 'vitest';
import { parseArgv } from '../src/cli/argv-parser';

/**
 * interactive 分支(无任何参数)
 */
describe('parseArgv - interactive', () => {
  // 无参数:返回 interactive
  it('应在无参数时返回 interactive', () => {
    expect(parseArgv([])).toEqual({ kind: 'interactive' });
  });
});

/**
 * help 分支(--help / -h / help)
 */
describe('parseArgv - help', () => {
  // --help 长参数
  it('--help 应返回 help 分支', () => {
    expect(parseArgv(['--help'])).toEqual({ kind: 'help' });
  });

  // -h 短参数
  it('-h 应返回 help 分支', () => {
    expect(parseArgv(['-h'])).toEqual({ kind: 'help' });
  });

  // help 子命令
  it('help 子命令应返回 help 分支', () => {
    expect(parseArgv(['help'])).toEqual({ kind: 'help' });
  });
});

/**
 * switch 分支
 */
describe('parseArgv - switch', () => {
  // 完整 switch 命令
  it('switch <model> 应返回 switch 分支并携带模型名', () => {
    expect(parseArgv(['switch', 'sonnet-4'])).toEqual({
      kind: 'switch',
      model: 'sonnet-4',
    });
  });

  // 缺失模型名:降级 unknown
  it('switch 缺少模型名时应降级为 unknown', () => {
    const result = parseArgv(['switch']);

    expect(result.kind).toBe('unknown');
    if (result.kind === 'unknown') {
      expect(result.input).toContain('switch');
    }
  });

  // 模型名前后有空白:trim 处理
  it('switch <  model  > 应自动 trim', () => {
    expect(parseArgv(['switch', '  gpt-4o  '])).toEqual({
      kind: 'switch',
      model: 'gpt-4o',
    });
  });
});

/**
 * edit 分支
 */
describe('parseArgv - edit', () => {
  // 完整 edit 命令
  it('edit <model> 应返回 edit 分支并携带模型名', () => {
    expect(parseArgv(['edit', 'openrouter/gpt-5.4'])).toEqual({
      kind: 'edit',
      model: 'openrouter/gpt-5.4',
    });
  });

  // 缺失模型名:降级 unknown
  it('edit 缺少模型名时应降级为 unknown', () => {
    const result = parseArgv(['edit']);

    expect(result.kind).toBe('unknown');
    if (result.kind === 'unknown') {
      expect(result.input).toContain('edit');
    }
  });

  // 模型名前后有空白:trim 处理
  it('edit <  model  > 应自动 trim', () => {
    expect(parseArgv(['edit', '  gpt-5.5  '])).toEqual({
      kind: 'edit',
      model: 'gpt-5.5',
    });
  });
});

/**
 * test 分支
 */
describe('parseArgv - test', () => {
  // 完整 test 命令
  it('test <model> 应返回 test 分支并携带模型名', () => {
    expect(parseArgv(['test', 'gpt-4o-mini'])).toEqual({
      kind: 'test',
      model: 'gpt-4o-mini',
    });
  });

  // 缺失模型名:降级 unknown
  it('test 缺少模型名时应降级为 unknown', () => {
    const result = parseArgv(['test']);

    expect(result.kind).toBe('unknown');
    if (result.kind === 'unknown') {
      expect(result.input).toContain('test');
    }
  });
});

/**
 * version 分支(--version / -v / version)
 */
describe('parseArgv - version', () => {
  // --version 长参数
  it('--version 应返回 version 分支', () => {
    expect(parseArgv(['--version'])).toEqual({ kind: 'version' });
  });

  // -v 短参数
  it('-v 应返回 version 分支', () => {
    expect(parseArgv(['-v'])).toEqual({ kind: 'version' });
  });

  // version 子命令
  it('version 子命令应返回 version 分支', () => {
    expect(parseArgv(['version'])).toEqual({ kind: 'version' });
  });
});

/**
 * unknown 分支(其他未识别命令)
 */
describe('parseArgv - unknown', () => {
  // 完全未识别的命令
  it('未识别命令应返回 unknown 并携带原始输入', () => {
    expect(parseArgv(['foobar'])).toEqual({
      kind: 'unknown',
      input: 'foobar',
    });
  });
});

/**
 * alias 分支(cmrm alias <model> <new-alias>)
 */
describe('parseArgv - alias', () => {
  // 完整 alias 命令
  it('alias <model> <alias> 应返回 alias 分支并携带 model 与 alias', () => {
    expect(parseArgv(['alias', 'sonnet-4', 'fast'])).toEqual({
      kind: 'alias',
      model: 'sonnet-4',
      alias: 'fast',
    });
  });

  // 缺失模型名:降级 unknown
  it('alias 缺少模型名时应降级为 unknown', () => {
    const result = parseArgv(['alias']);

    expect(result.kind).toBe('unknown');
    if (result.kind === 'unknown') {
      expect(result.input).toContain('alias');
    }
  });

  // 缺失别名:降级 unknown(只有 model)
  it('alias 缺少别名时应降级为 unknown', () => {
    const result = parseArgv(['alias', 'sonnet-4']);

    expect(result.kind).toBe('unknown');
    if (result.kind === 'unknown') {
      expect(result.input).toContain('alias');
    }
  });

  // 模型名/别名两端有空白:trim 处理
  it('alias 应自动 trim 模型名与别名', () => {
    expect(parseArgv(['alias', '  sonnet-4  ', '  fast  '])).toEqual({
      kind: 'alias',
      model: 'sonnet-4',
      alias: 'fast',
    });
  });

  // 别名为空白字符:trim 后为空,降级 unknown
  it('alias 别名仅含空白时应降级为 unknown', () => {
    const result = parseArgv(['alias', 'sonnet-4', '   ']);

    expect(result.kind).toBe('unknown');
  });
});

/**
 * set-lang 分支(cmrm set-lang <locale>)
 */
describe('parseArgv - setLang', () => {
  // 完整 set-lang 命令
  it('set-lang en 应返回 setLang 分支并携带 locale', () => {
    expect(parseArgv(['set-lang', 'en'])).toEqual({
      kind: 'setLang',
      locale: 'en',
    });
  });

  it('set-lang zh 应返回 setLang 分支并携带 locale', () => {
    expect(parseArgv(['set-lang', 'zh'])).toEqual({
      kind: 'setLang',
      locale: 'zh',
    });
  });

  it('set-lang ja 应返回 setLang 分支并携带 locale', () => {
    expect(parseArgv(['set-lang', 'ja'])).toEqual({
      kind: 'setLang',
      locale: 'ja',
    });
  });

  // 缺失语言代码:降级 unknown
  it('set-lang 缺少 locale 时应降级为 unknown', () => {
    const result = parseArgv(['set-lang']);

    expect(result.kind).toBe('unknown');
    if (result.kind === 'unknown') {
      expect(result.input).toContain('set-lang');
    }
  });

  // 无效语言代码:降级 unknown
  it('set-lang 无效 locale 时应降级为 unknown', () => {
    const result = parseArgv(['set-lang', 'fr']);

    expect(result.kind).toBe('unknown');
    if (result.kind === 'unknown') {
      expect(result.input).toContain('fr');
    }
  });

  // locale 两端有空白:trim 处理
  it('set-lang 应自动 trim locale', () => {
    expect(parseArgv(['set-lang', '  en  '])).toEqual({
      kind: 'setLang',
      locale: 'en',
    });
  });
});

/**
 * import 分支(cmrm <tool> import <file>)
 */
describe('parseArgv - import', () => {
  // 完整 import 命令 (claude)
  it('claude import <file> 应返回 import 分支并携带 tool 与 file', () => {
    expect(parseArgv(['claude', 'import', 'config.json'])).toEqual({
      kind: 'import',
      tool: 'claude',
      file: 'config.json',
    });
  });

  // 完整 import 命令 (codex)
  it('codex import <file> 应返回 import 分支并携带 tool 与 file', () => {
    expect(parseArgv(['codex', 'import', 'config.toml'])).toEqual({
      kind: 'import',
      tool: 'codex',
      file: 'config.toml',
    });
  });

  // 缺失文件路径:降级 unknown
  it('import 缺少文件路径时应降级为 unknown', () => {
    const result = parseArgv(['claude', 'import']);

    expect(result.kind).toBe('unknown');
    if (result.kind === 'unknown') {
      expect(result.input).toContain('import');
    }
  });

  // 工具名有效但子命令不是 import:降级 unknown
  it('claude 未知子命令时应降级为 unknown', () => {
    const result = parseArgv(['claude', 'switch']);

    expect(result.kind).toBe('unknown');
    if (result.kind === 'unknown') {
      expect(result.input).toContain('claude');
    }
  });

  // 文件路径两端有空白:trim 处理
  it('import 应自动 trim 文件路径', () => {
    expect(parseArgv(['claude', 'import', '  config.json  '])).toEqual({
      kind: 'import',
      tool: 'claude',
      file: 'config.json',
    });
  });

  // 双引号包裹:自动去除
  it('import 应支持双引号包裹的路径', () => {
    expect(parseArgv(['claude', 'import', '"config.json"'])).toEqual({
      kind: 'import',
      tool: 'claude',
      file: 'config.json',
    });
  });

  // 单引号包裹:自动去除
  it('import 应支持单引号包裹的路径', () => {
    expect(parseArgv(['codex', 'import', "'config.toml'"])).toEqual({
      kind: 'import',
      tool: 'codex',
      file: 'config.toml',
    });
  });

  // 引号包裹且含空格:正确解析
  it('import 应支持带空格的路径', () => {
    expect(parseArgv(['claude', 'import', '"/path/my config.json"'])).toEqual({
      kind: 'import',
      tool: 'claude',
      file: '/path/my config.json',
    });
  });
});
