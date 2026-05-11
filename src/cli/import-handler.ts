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

import { UIRenderer } from './ui';
import {
  resolveAdapter,
  checkFileExists,
  readAndParseFile,
  mapToUnifiedConfig,
  validateConfig,
  validateConfigIdentity,
  testConnectivity,
  saveAndReport,
} from './import-helpers';

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
  // 标识校验失败：直接返回失败
  else if (!validateConfigIdentity(config, ui)) {
    return EXIT_FAIL;
  }

  // 测试连通性
  const tested = await testConnectivity(config, ui);
  // 测试失败：不保存，直接返回失败
  if (!tested) {
    ui.showError('import.testFailed');
    return EXIT_FAIL;
  }

  // 保存配置
  saveAndReport(adapter, config, ui);
  return EXIT_OK;
}
