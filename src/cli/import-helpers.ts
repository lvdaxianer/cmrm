/**
 * 导入处理器辅助函数
 * 封装文件操作、验证、测试连通性等纯逻辑
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import * as fs from 'fs';
import * as path from 'path';
import * as TOML from '@iarna/toml';
import { registry } from '../adapters';
import { ToolAdapter, UnifiedModelConfig } from '../adapters/types';
import { UIRenderer } from './ui';
import { testModelConfig } from '../utils/tester';
import { t } from '../i18n';
import { getPrimaryModelName, validateModelIdentity } from './model-identity';
import { collectAllModels } from './model-finder';
import { validateAlias } from './alias-validator';
import { mapToUnifiedConfig } from './import-config-mappers';

/** TOML 文件扩展名 */
const EXT_TOML = '.toml';

/** 默认 Anthropic API 类型 */
const DEFAULT_API_TYPE_ANTHROPIC = 'anthropic';

/**
 * 获取指定工具的适配器
 *
 * @param toolName - 工具名称
 * @param ui - UI 渲染器
 * @return 适配器实例，未注册返回 undefined
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function resolveAdapter(toolName: string, ui: UIRenderer): ToolAdapter | undefined {
  try {
    // 从注册表获取适配器
    return registry.getAdapter(toolName);
  } catch {
    // 未注册：友好报错
    ui.showError(`Tool adapter not found: ${toolName}`);
    return undefined;
  }
}

/**
 * 检查文件是否存在
 *
 * @param filePath - 文件路径
 * @param ui - UI 渲染器
 * @return 存在 true / 不存在 false
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function checkFileExists(filePath: string, ui: UIRenderer): boolean {
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
 * @return 解析后的对象，失败返回 undefined
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export async function readAndParseFile(
  filePath: string,
  ui: UIRenderer
): Promise<Record<string, any> | undefined> {
  let raw: string;

  // 读取文件内容
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    // 读取失败：提示错误
    ui.showError(t('import.parseFailed', { message: String(err) }));
    return undefined;
  }

  const ext = path.extname(filePath).toLowerCase();

  // 按扩展名分发解析器
  try {
    // TOML 格式
    if (ext === EXT_TOML) {
      return TOML.parse(raw) as Record<string, any>;
    }
    // JSON 格式(默认)
    else {
      return JSON.parse(raw) as Record<string, any>;
    }
  } catch (err) {
    // 解析失败：提示错误
    ui.showError(t('import.parseFailed', { message: String(err) }));
    return undefined;
  }
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
 * @date 2026-05-11
 */
export function validateConfig(
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

/**
 * 验证导入配置的标识唯一性
 *
 * @param config - 待验证的模型配置
 * @param ui - UI 渲染器
 * @return 验证通过返回 true，否则 false
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function validateConfigIdentity(config: UnifiedModelConfig, ui: UIRenderer): boolean {
  const allModels = collectAllModels();
  const identityResult = validateModelIdentity(config, allModels);

  // 标识校验失败
  if (!identityResult.valid) {
    ui.showError(identityResult.error || t('actions.validateFailed'));
    return false;
  }
  // 标识校验通过：继续校验别名
  else {
    return validateImportAliases(config, allModels, ui);
  }
}

/**
 * 验证导入配置中的别名唯一性
 *
 * @param config - 待验证的模型配置
 * @param allModels - 所有已保存模型
 * @param ui - UI 渲染器
 * @return 全部别名校验通过返回 true，否则 false
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function validateImportAliases(
  config: UnifiedModelConfig,
  allModels: UnifiedModelConfig[],
  ui: UIRenderer
): boolean {
  for (const alias of config.aliases ?? []) {
    const aliasResult = validateAlias(alias, allModels, getPrimaryModelName(config));
    // 某个别名校验失败
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
 * @date 2026-05-11
 */
export async function testConnectivity(
  config: UnifiedModelConfig,
  ui: UIRenderer
): Promise<boolean> {
  const apiType = config.apiType ?? DEFAULT_API_TYPE_ANTHROPIC;
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
 * @date 2026-05-11
 */
export function saveAndReport(
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

// 重新导出配置映射函数，保持 import-helpers 作为统一入口
export { mapToUnifiedConfig } from './import-config-mappers';
