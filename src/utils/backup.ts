/**
 * 备份和合并工具模块
 * 提供配置文件备份和合并功能
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import * as fs from 'fs';
import * as path from 'path';
import * as TOML from '@iarna/toml';
import { UnifiedModelConfig } from '../adapters/types';

/**
 * 格式化日期为 YYYYMMDD 格式
 * 用于生成备份文件名中的日期部分
 *
 * @param date - 日期对象
 * @return 格式化后的日期字符串（如 20260427）
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
function formatDate(date: Date): string {
  // 获取年份
  const year = date.getFullYear();

  // 获取月份并补零
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // 获取日期并补零
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

/**
 * 创建备份目录
 * 在配置文件同目录下创建 .cmrm 目录用于存放备份文件
 *
 * @param configPath - 配置文件绝对路径
 * @return 备份目录路径
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export function createBackupDir(configPath: string): string {
  // 获取配置文件所在目录
  const configDir = path.dirname(configPath);

  // 构建备份目录路径
  const backupDir = path.join(configDir, '.cmrm');

  // 备份目录已存在 - 直接返回路径
  if (fs.existsSync(backupDir)) {
    return backupDir;
  }
  // 备份目录不存在 - 创建目录
  else {
    fs.mkdirSync(backupDir, { recursive: true });
    return backupDir;
  }
}

/**
 * 列出当天的备份文件序号列表
 * 扫描备份目录中当天生成的备份文件，提取序号
 *
 * @param backupDir - 备份目录路径
 * @param configFileName - 配置文件名
 * @param today - 今天日期字符串（YYYYMMDD）
 * @return 备份文件序号数组（可能为空）
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
function listTodayBackups(backupDir: string, configFileName: string, today: string): number[] {
  // 备份目录不存在 - 返回空数组
  if (!fs.existsSync(backupDir)) {
    return [];
  }
  // 备份目录存在 - 扫描文件
  else {
    const prefix = `${configFileName}_${today}`;

    // 列出备份目录中的所有文件
    const files = fs.readdirSync(backupDir);

    // 过滤出当天的备份文件并提取序号
    const sequenceNumbers: number[] = [];

    for (const file of files) {
      // 文件名匹配当天前缀 - 提取序号
      if (file.startsWith(prefix)) {
        // 文件名格式：{configFileName}_{YYYYMMDD}{seq}
        // 需要提取日期后面的两位序号
        const suffix = file.slice(prefix.length);

        // 匹配成功 - 提取并转换序号（suffix应为两位数字）
        if (suffix && /^\d{2}$/.test(suffix)) {
          const seq = parseInt(suffix, 10);
          sequenceNumbers.push(seq);
        }
        // 匹配失败 - 跳过该文件
        else {
          continue;
        }
      }
      // 文件名不匹配 - 跳过
      else {
        continue;
      }
    }

    return sequenceNumbers;
  }
}

/**
 * 获取下一个备份序号
 * 根据当天的备份文件数量确定下一个序号（00-99）
 *
 * @param backupDir - 备份目录路径
 * @param configFileName - 配置文件名
 * @return 下一个备份序号（00-99）
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export function getNextBackupNumber(backupDir: string, configFileName: string): number {
  // 获取今天日期
  const today = formatDate(new Date());

  // 列出当天的备份文件序号
  const sequenceNumbers = listTodayBackups(backupDir, configFileName, today);

  // 有备份文件 - 返回最大序号+1
  if (sequenceNumbers.length > 0) {
    const maxNumber = Math.max(...sequenceNumbers);
    return maxNumber + 1;
  }
  // 无备份文件 - 返回 0
  else {
    return 0;
  }
}

/**
 * 生成备份文件名
 * 根据配置文件名、日期和序号生成标准备份文件名
 *
 * @param configFileName - 配置文件名
 * @param sequenceNumber - 备份序号
 * @return 备份文件名（不含路径）
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
function generateBackupFileName(configFileName: string, sequenceNumber: number): string {
  // 获取今天日期
  const today = formatDate(new Date());

  // 序号补零到两位
  const seq = String(sequenceNumber).padStart(2, '0');

  // 组合生成备份文件名
  return `${configFileName}_${today}${seq}`;
}

/**
 * 备份配置文件
 * 复制当前配置文件到备份目录，使用日期+序号命名
 *
 * @param configPath - 配置文件绝对路径
 * @return 备份文件名（不含路径），文件不存在时返回空字符串
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export function backupConfig(configPath: string): string {
  // 配置文件不存在 - 不需要备份
  if (!fs.existsSync(configPath)) {
    return '';
  }
  // 配置文件存在 - 执行备份
  else {
    // 创建备份目录
    const backupDir = createBackupDir(configPath);

    // 获取配置文件名
    const configFileName = path.basename(configPath);

    // 获取下一个备份序号
    const nextNumber = getNextBackupNumber(backupDir, configFileName);

    // 生成备份文件名
    const backupFileName = generateBackupFileName(configFileName, nextNumber);

    // 备份文件完整路径
    const backupPath = path.join(backupDir, backupFileName);

    // 复制配置文件到备份文件
    fs.copyFileSync(configPath, backupPath);

    return backupFileName;
  }
}

/**
 * 更新 Claude 环境变量字段
 * 将新配置值写入 env 对象
 *
 * @param env - Claude 配置的 env 对象
 * @param config - 新模型配置
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
function updateClaudeEnvFields(env: any, config: UnifiedModelConfig): void {
  // 更新必填字段
  env.ANTHROPIC_MODEL = config.model;
  env.ANTHROPIC_AUTH_TOKEN = config.apiKey;
  env.ANTHROPIC_BASE_URL = config.baseUrl;

  // 更新可选的 Haiku 模型字段
  if (config.haikuModel) {
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = config.haikuModel;
  }
  // 无 Haiku 模型配置 - 不更新该字段
  else {
    // 保持原有值或删除
  }

  // 更新可选的 Sonnet 模型字段
  if (config.sonnetModel) {
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = config.sonnetModel;
  }
  // 无 Sonnet 模型配置 - 不更新该字段
  else {
    // 保持原有值或删除
  }

  // 更新可选的 Opus 模型字段
  if (config.opusModel) {
    env.ANTHROPIC_DEFAULT_OPUS_MODEL = config.opusModel;
  }
  // 无 Opus 模型配置 - 不更新该字段
  else {
    // 保持原有值或删除
  }
}

/**
 * 合并 JSON 配置（Claude）
 * 保留原有配置中非模型相关的字段，只更新模型相关字段
 *
 * @param original - 原配置对象
 * @param newConfig - 新模型配置
 * @return 合并后的配置对象
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export function mergeJsonConfig(original: any, newConfig: UnifiedModelConfig): any {
  // 深拷贝原配置，避免修改原对象
  const merged = JSON.parse(JSON.stringify(original));

  // 确保 env 对象存在
  if (!merged.env) {
    merged.env = {};
  }
  // env 对象已存在 - 使用原有 env
  else {
    // 保持 env 对象
  }

  // 更新 Claude 模型相关字段
  updateClaudeEnvFields(merged.env, newConfig);

  return merged;
}

/**
 * 更新 TOML Provider 配置
 * 将新配置值写入指定 provider 对象
 *
 * @param provider - Provider 配置对象
 * @param config - 新模型配置
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
function updateTomlProvider(provider: any, config: UnifiedModelConfig): void {
  // 更新 API Key
  provider.api_key = config.apiKey;

  // 更新 Base URL（有值时）
  if (config.baseUrl) {
    provider.base_url = config.baseUrl;
  }
  // 无 Base URL - 不更新该字段
  else {
    // 保持原有值
  }
}

/**
 * 合并 TOML 配置（OpenCode）
 * 保留原有配置中其他 provider，只更新选中 provider 和 default_model
 *
 * @param original - 原配置字符串（TOML 格式）
 * @param newConfig - 新模型配置
 * @return 合并后的配置字符串（TOML 格式）
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export function mergeTomlConfig(original: string, newConfig: UnifiedModelConfig): string {
  // 解析原 TOML 配置
  const parsed = TOML.parse(original) as any;

  // 确保 providers 对象存在
  if (!parsed.providers) {
    parsed.providers = {};
  }
  // providers 对象已存在 - 使用原有 providers
  else {
    // 保持 providers 对象
  }

  // 获取 provider 名称（默认使用 newConfig.provider 或 openai）
  const providerName = newConfig.provider || 'openai';

  // 确保 provider 对象存在
  if (!parsed.providers[providerName]) {
    parsed.providers[providerName] = {};
  }
  // provider 对象已存在 - 使用原有 provider
  else {
    // 保持 provider 对象
  }

  // 更新 provider 配置
  const provider = parsed.providers[providerName];
  updateTomlProvider(provider, newConfig);

  // 更新 default_model
  parsed.default_model = newConfig.model;

  // 转换回 TOML 字符串
  return TOML.stringify(parsed);
}

/**
 * 创建默认 OpenCode TOML 配置
 * 当配置文件不存在时使用此方法创建初始配置
 *
 * @param config - 模型配置
 * @return TOML 配置字符串
 * @author lvdaxianerplus
 * @date 2026-04-27
 */
export function createDefaultTomlConfig(config: UnifiedModelConfig): string {
  // 获取 provider 名称
  const providerName = config.provider || 'openai';

  // 构建默认配置结构
  const defaultConfig = {
    providers: {
      [providerName]: {
        api_key: config.apiKey,
        base_url: config.baseUrl,
      },
    },
    default_model: config.model,
  };

  // 转换为 TOML 字符串
  return TOML.stringify(defaultConfig as any);
}