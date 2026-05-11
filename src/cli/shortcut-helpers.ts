/**
 * 快捷命令辅助函数
 * 供 shortcut-runner 使用的通用辅助函数
 *
 * @author lvdaxianerplus
 * @date 2026-05-09
 */

import { registry } from '../adapters';
import { UIRenderer } from './ui';
import { listAvailableNames } from './model-finder';
import { t } from '../i18n';

/** 退出码:失败 */
const EXIT_FAIL = 1;

/** 空数组长度 */
const EMPTY_ARRAY_LENGTH = 0;

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
export function reportUnknown(input: string, ui: UIRenderer): number {
  ui.showError(t('fuzzy.unknownCommand', { input }));
  ui.showInfo(t('help.showHelpHint'));
  return EXIT_FAIL;
}

/**
 * 输出"模型未找到"提示并附带所有工具的可用模型清单
 *
 * @param name - 用户尝试查找的名称
 * @param ui - UI 渲染器
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function printModelNotFoundAllTools(name: string, ui: UIRenderer): void {
  ui.showError(t('shortcut.modelNotFound', { name }));

  const adapters = registry.getAllAdapters();
  let hasAnyModel = false;

  // 遍历每个工具列出可用模型
  for (const adapter of adapters) {
    const available = listAvailableNames(adapter);
    if (available.length > EMPTY_ARRAY_LENGTH) {
      hasAnyModel = true;
      ui.showInfo(`[${adapter.displayName}] ${t('shortcut.availableModels')}`);
      available.forEach(n => ui.showInfo(`  - ${n}`));
    }
  }

  // 完全没有模型:引导用户先添加
  if (!hasAnyModel) {
    ui.showInfo(t('shortcut.noModelsHint'));
  }
}
