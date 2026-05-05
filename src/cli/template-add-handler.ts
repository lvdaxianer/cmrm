/**
 * 模板添加子流程
 * 从模板选择到配置收集的完整流程
 *
 * 拆分原因：
 * - add-handler.ts 行数超限（>350 行），将模板相关逻辑独立抽出
 * - 模板选择与自定义添加职责分离，便于单独测试
 *
 * @author lvdaxianerplus
 * @date 2026-05-04
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { ToolAdapter } from '../adapters';
import { UnifiedModelConfig } from '../types';
import { UIRenderer } from './ui';
import { templateManager } from './template-manager';
import { ModelTemplate } from './template-data';
import { buildAddModelQuestionsWithDefaults } from './add-questions';
import { askIndex } from './index-prompt';
import { t } from '../i18n';

/**
 * 选择模板并收集配置
 * 显示模板菜单，用户选择后基于模板默认值收集输入
 *
 * @param adapter - 工具适配器
 * @param ui - UI 渲染器
 * @param templates - 可用模板列表
 * @return 收集到的配置字段映射（含 apiType），取消返回 null
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
export async function selectTemplateAndSave(
  adapter: ToolAdapter,
  ui: UIRenderer,
  templates: ModelTemplate[]
): Promise<Record<string, any> | null> {
  // 显示模板选择菜单并获取用户选择
  const selectedTemplate = await askTemplateSelection(templates);

  // 用户取消选择
  if (!selectedTemplate) {
    return null;
  }
  // 用户选择了模板：基于模板默认值收集配置
  else {
    return collectTemplateResponse(adapter, ui, selectedTemplate);
  }
}

/**
 * 基于模板收集用户配置响应
 * 使用模板默认值构建 inquirer 问题，减少用户输入量
 *
 * @param adapter - 工具适配器
 * @param ui - UI 渲染器
 * @param template - 选中的模型模板
 * @return 收集到的配置字段映射（含 apiType），取消返回 null
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
async function collectTemplateResponse(
  adapter: ToolAdapter,
  ui: UIRenderer,
  template: ModelTemplate
): Promise<Record<string, any> | null> {
  // 使用模板默认值构建 inquirer 问题列表
  const response = await inquirer.prompt(
    buildAddModelQuestionsWithDefaults(templateToDefaults(template)) as any
  );

  // 用户取消（Ctrl+C 等）
  if (Object.keys(response).length === 0) {
    return null;
  }
  // 收集完成：合并模板 apiType 后返回
  else {
    return { ...response, apiType: template.apiType };
  }
}

/**
 * 显示模板索引菜单并获取用户选择
 *
 * @param templates - 模板列表
 * @return 选中的模板，取消返回 null
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
async function askTemplateSelection(templates: ModelTemplate[]): Promise<ModelTemplate | null> {
  // 打印模板选择菜单（含列对齐）
  printTemplateMenu(templates);

  // 提示用户输入索引并校验范围
  const idx = await askIndex(t('template.enterIndex', { count: templates.length }), templates.length);

  // 用户取消或输入无效
  if (idx === null) {
    return null;
  }
  // 返回对应模板
  else {
    return templates[idx - 1] || null;
  }
}

/**
 * 打印模板选择菜单
 * 格式：[idx] 名称  model  (描述)
 * 名称列与模型列自动计算对齐宽度
 *
 * @param templates - 模板列表
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
function printTemplateMenu(templates: ModelTemplate[]): void {
  // 打印菜单标题和操作提示
  console.log(chalk.cyan('\n=== ' + t('template.selectTitle') + ' ==='));
  console.log(chalk.gray(`(${t('tools.selectToolHint')})\n`));

  // 计算列宽：名称列至少 20，模型列至少 15
  const nameWidth = Math.max(20, ...templates.map((t) => t.name.length));
  const modelWidth = Math.max(15, ...templates.map((t) => t.model.length));

  // 逐条打印模板信息
  templates.forEach((template, index) => {
    const idx = index + 1;
    const nameCol = template.name.padEnd(nameWidth);
    const modelCol = chalk.yellow(template.model.padEnd(modelWidth));
    const desc = chalk.gray(`(${template.description})`);
    console.log(chalk.gray(`[${idx}] `) + nameCol + '  ' + modelCol + '  ' + desc);
  });
  console.log('');
}

/**
 * 将模板转换为问题默认值对象
 * 可选模型未单独设置时，默认与主模型保持一致
 *
 * @param template - 模型模板
 * @return 部分 UnifiedModelConfig 默认值
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
function templateToDefaults(template: ModelTemplate): Partial<UnifiedModelConfig> {
  return {
    // 基础字段：直接取自模板
    name: template.name,
    model: template.model,
    baseUrl: template.baseUrl,
    apiType: template.apiType,
    provider: template.provider,
    // 可选模型未单独设置时，默认与主模型保持一致
    haikuModel: template.haikuModel || template.model,
    sonnetModel: template.sonnetModel || template.model,
    opusModel: template.opusModel || template.model,
  };
}
