/**
 * 模型配置导入处理器
 * 处理 `cmrm <tool> import <file>` 的完整导入流程
 *
 * 导入流程:
 * 1. 校验工具名 → 未注册则报错
 * 2. 检查文件存在性 → 不存在则报错
 * 3. 读取文件内容
 * 4. 按扩展名(JSON/TOML)解析
 * 5. 映射为 UnifiedModelConfig
 * 6. validateConfig 验证必填字段
 * 7. testModelConfig 测试连通性
 * 8. 测试通过才 saveModel，否则退出码 1
 *
 * @author lvdaxianerplus
 * @date 2026-05-09
 */

import * as fs from 'fs';
import * as path from 'path';
import * as TOML from '@iarna/toml';
import { registry } from '../adapters';
import { ToolAdapter, UnifiedModelConfig } from '../adapters/types';
import { UIRenderer } from './ui';
import { testModelConfig } from '../utils/tester';
import { t } from '../i18n';
import { getPrimaryModelName, normalizeModelIdentity, validateModelIdentity } from './model-identity';
import { collectAllModels } from './model-finder';
import { validateAlias } from './alias-validator';

/** 退出码:成功 */
const EXIT_OK = 0;

/** 退出码:失败 */
const EXIT_FAIL = 1;

/**
 * 执行导入快捷命令
 * 读取用户提供的模板文件，验证、测试后保存到对应工具的模型列表
 *
 * @param toolName - 工具名称(claude/codex)
 * @param filePath - 模板文件路径
 * @param ui - UI 渲染器
 * @return 进程退出码(0 成功 / 1 失败)
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export async function runImportShortcut(
  toolName: string,
  filePath: string,
  ui: UIRenderer
): Promise<number> {
  // 获取适配器：未注册则报错
  const adapter = resolveAdapter(toolName, ui);
  // 未找到适配器：直接返回失败
  if (!adapter) {
    return EXIT_FAIL;
  }

  // 检查文件是否存在
  const fileExists = checkFileExists(filePath, ui);
  // 文件不存在：直接返回失败
  if (!fileExists) {
    return EXIT_FAIL;
  }

  // 读取并解析文件
  const parsed = await readAndParseFile(filePath, ui);
  // 解析失败：直接返回失败
  if (!parsed) {
    return EXIT_FAIL;
  }

  // 映射为 UnifiedModelConfig
  const config = mapToUnifiedConfig(toolName, parsed);

  // 验证配置完整性
  const valid = validateConfig(adapter, config, ui);
  // 验证失败：直接返回失败
  if (!valid) {
    return EXIT_FAIL;
  }
  else if (!validateConfigIdentity(config, ui)) {
    return EXIT_FAIL;
  }

  // 测试连通性
  const tested = await testConnectivity(config, ui);
  // 测试失败：不保存，直接返回失败
  if (!tested) {
    ui.showError(t('import.testFailed'));
    return EXIT_FAIL;
  }

  // 保存配置
  saveAndReport(adapter, config, ui);
  return EXIT_OK;
}

/**
 * 获取指定工具的适配器
 *
 * @param toolName - 工具名称
 * @param ui - UI 渲染器
 * @return 适配器实例，未注册返回 null
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function resolveAdapter(toolName: string, ui: UIRenderer): ToolAdapter | null {
  try {
    // 从注册表获取适配器
    return registry.getAdapter(toolName);
  } catch {
    // 未注册：友好报错
    ui.showError(`Tool adapter not found: ${toolName}`);
    return null;
  }
}

/**
 * 检查文件是否存在
 *
 * @param filePath - 文件路径
 * @param ui - UI 渲染器
 * @return 存在 true / 不存在 false
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function checkFileExists(filePath: string, ui: UIRenderer): boolean {
  // 文件存在：继续后续流程
  if (fs.existsSync(filePath)) {
    return true;
  }
  // 文件不存在：提示用户
  else {
    ui.showError(t('import.fileNotFound', { file: filePath }));
    return false;
  }
}

/**
 * 读取文件内容并按扩展名解析
 * 支持 .json 和 .toml 两种格式
 *
 * @param filePath - 文件路径
 * @param ui - UI 渲染器
 * @return 解析后的对象，失败返回 null
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
async function readAndParseFile(
  filePath: string,
  ui: UIRenderer
): Promise<Record<string, any> | null> {
  let raw: string;

  // 读取文件内容
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    // 读取失败：提示错误
    ui.showError(t('import.parseFailed', { message: String(err) }));
    return null;
  }

  const ext = path.extname(filePath).toLowerCase();

  // 按扩展名分发解析器
  try {
    // TOML 格式
    if (ext === '.toml') {
      return TOML.parse(raw) as Record<string, any>;
    }
    // JSON 格式(默认)
    else {
      return JSON.parse(raw) as Record<string, any>;
    }
  } catch (err) {
    // 解析失败：提示错误
    ui.showError(t('import.parseFailed', { message: String(err) }));
    return null;
  }
}

/**
 * 将解析后的对象映射为 UnifiedModelConfig
 * 保留所有原始字段，确保必填字段有默认值(空字符串)
 *
 * @param toolName - 工具名称
 * @param parsed - 解析后的原始对象
 * @return UnifiedModelConfig 实例
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function mapToUnifiedConfig(toolName: string, parsed: Record<string, any>): UnifiedModelConfig {
  if (toolName === 'claude') {
    return mapClaudeConfig(parsed);
  }
  else if (toolName === 'codex') {
    return mapCodexConfig(parsed);
  }
  else {
    return finalizeUnifiedConfig({
      ...parsed,
      model: parsed.model ?? '',
      apiKey: parsed.apiKey ?? '',
      baseUrl: parsed.baseUrl ?? '',
    });
  }
}

/**
 * 将 Claude 配置映射为 UnifiedModelConfig
 * 支持统一格式和 ~/.claude/settings.json 的 env/ANTHROPIC_* 格式
 *
 * @param parsed - 解析后的原始对象
 * @return UnifiedModelConfig
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
function mapClaudeConfig(parsed: Record<string, any>): UnifiedModelConfig {
  const env = parsed.env && typeof parsed.env === 'object' ? parsed.env : parsed;

  return finalizeUnifiedConfig({
    ...parsed,
    name: parsed.name,
    model: env.ANTHROPIC_MODEL ?? parsed.model ?? '',
    apiKey: env.ANTHROPIC_AUTH_TOKEN ?? parsed.apiKey ?? '',
    baseUrl: env.ANTHROPIC_BASE_URL ?? parsed.baseUrl ?? '',
    haikuModel: env.ANTHROPIC_DEFAULT_HAIKU_MODEL ?? parsed.haikuModel,
    sonnetModel: env.ANTHROPIC_DEFAULT_SONNET_MODEL ?? parsed.sonnetModel,
    opusModel: env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? parsed.opusModel,
    apiType: parsed.apiType ?? 'anthropic',
  });
}

/**
 * 将 Codex 配置映射为 UnifiedModelConfig
 * 支持统一格式和 ~/.codex/config.toml 的 model_provider/model_providers 格式
 *
 * @param parsed - 解析后的原始对象
 * @return UnifiedModelConfig
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
function mapCodexConfig(parsed: Record<string, any>): UnifiedModelConfig {
  const providerName = parsed.provider ?? parsed.model_provider ?? 'codex';
  const providerConfig =
    parsed.model_providers && parsed.model_providers[providerName]
      ? parsed.model_providers[providerName]
      : {};
  const runtimeBaseUrl =
    parsed.openai_base_url ??
    parsed.openaiBaseUrl ??
    providerConfig.base_url ??
    parsed.baseUrl;

  return finalizeUnifiedConfig({
    ...parsed,
    name: parsed.name,
    model: parsed.model ?? '',
    apiKey: parsed.apiKey ?? '',
    baseUrl: runtimeBaseUrl ?? '',
    provider: providerName,
    modelReasoningEffort:
      parsed.modelReasoningEffort ?? parsed.model_reasoning_effort ?? '',
    disableResponseStorage:
      parsed.disableResponseStorage ?? parsed.disable_response_storage,
    apiType: parsed.apiType ?? 'openai',
  });
}

/**
 * 规范化统一配置
 * 为可选 name 提供 model 兜底，并清理基础字符串字段
 *
 * @param config - 原始统一配置
 * @return 规范化后的配置
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
function finalizeUnifiedConfig(config: UnifiedModelConfig): UnifiedModelConfig {
  const model = typeof config.model === 'string' ? config.model.trim() : '';
  const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : '';
  const baseUrl = typeof config.baseUrl === 'string' ? config.baseUrl.trim() : '';
  return normalizeModelIdentity({
    ...config,
    model,
    apiKey,
    baseUrl,
  });
}

/**
 * 验证配置完整性
 * 委托适配器的 validateConfig 方法检查必填字段
 *
 * @param adapter - 工具适配器
 * @param config - 待验证配置
 * @param ui - UI 渲染器
 * @return 验证通过 true / 失败 false
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function validateConfig(
  adapter: ToolAdapter,
  config: UnifiedModelConfig,
  ui: UIRenderer
): boolean {
  const valid = adapter.validateConfig(config);

  // 验证通过
  if (valid) {
    return true;
  }
  // 验证失败：提示缺少必填字段
  else {
    ui.showError(t('actions.validateFailed'));
    return false;
  }
}

function validateConfigIdentity(config: UnifiedModelConfig, ui: UIRenderer): boolean {
  const allModels = collectAllModels();
  const identityResult = validateModelIdentity(config, allModels);

  if (!identityResult.valid) {
    ui.showError(identityResult.error || t('actions.validateFailed'));
    return false;
  }

  for (const alias of config.aliases ?? []) {
    const aliasResult = validateAlias(alias, allModels, getPrimaryModelName(config));
    if (!aliasResult.valid) {
      ui.showError(aliasResult.error || t('actions.validateFailed'));
      return false;
    }
  }

  return true;
}

/**
 * 测试模型配置连通性
 * 调用 HTTP API 发起一次测试请求
 *
 * @param config - 模型配置
 * @param ui - UI 渲染器
 * @return 测试通过 true / 失败 false
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
async function testConnectivity(
  config: UnifiedModelConfig,
  ui: UIRenderer
): Promise<boolean> {
  const apiType = config.apiType ?? 'anthropic';
  const displayName = config.name || config.model;

  // 显示测试中提示
  ui.showInfo(t('shortcut.testing', { apiType, name: displayName }));

  // 发起测试请求
  const result = await testModelConfig(
    config.model,
    config.apiKey,
    config.baseUrl,
    apiType
  );

  // 显示测试结果
  ui.showTestResult(result);

  return result.success;
}

/**
 * 保存配置并输出成功提示
 *
 * @param adapter - 工具适配器
 * @param config - 已验证且测试通过的模型配置
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
function saveAndReport(
  adapter: ToolAdapter,
  config: UnifiedModelConfig,
  ui: UIRenderer
): void {
  // 持久化到 cmrm 存储
  adapter.saveModel(config);

  // 显示成功消息
  const displayName = config.name || config.model;
  ui.showSuccess(t('import.imported', { name: displayName, tool: adapter.displayName }));
}
