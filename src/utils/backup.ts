/**
 * 备份和合并工具模块
 * 提供配置文件备份和合并功能
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import * as fs from 'fs';
import * as path from 'path';
import { UnifiedModelConfig } from '../adapters/types';

/** 日期数字补零位数 */
const DATE_DIGITS = 2;

/** 日期字符串中年份起始位置 */
const YEAR_START = 0;

/** 日期字符串中年份结束位置 */
const YEAR_END = 4;

/** 日期字符串中月份起始位置 */
const MONTH_START = 4;

/** 日期字符串中月份结束位置 */
const MONTH_END = 6;

/** 日期字符串中日期起始位置 */
const DAY_START = 6;

/** 日期字符串中日期结束位置 */
const DAY_END = 8;

/** 备份序号补零位数 */
const SEQ_DIGITS = 2;

/** 备份序号正则匹配 */
const SEQ_PATTERN = /^\d{2}$/;

/** 十进制基数 */
const DECIMAL_RADIX = 10;

/** JSON 缩进空格数 */
const JSON_INDENT = 2;

/** 备份目录名 */
const BACKUP_DIR_NAME = '.cmrm';

/**
 * 格式化日期为 YYYYMMDD 格式
 * 用于生成备份文件名中的日期部分
 *
 * @param date - 日期对象
 * @return 格式化后的日期字符串（如 20260427）
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function formatDate(date: Date): string {
  // 获取年份
  const year = date.getFullYear();

  // 获取月份并补零
  const month = String(date.getMonth() + 1).padStart(DATE_DIGITS, '0');

  // 获取日期并补零
  const day = String(date.getDate()).padStart(DATE_DIGITS, '0');

  return `${year}${month}${day}`;
}

/**
 * 创建备份目录
 * 在配置文件同目录下创建 .cmrm 目录用于存放备份文件
 *
 * @param configPath - 配置文件绝对路径
 * @return 备份目录路径
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function createBackupDir(configPath: string): string {
  const configDir = path.dirname(configPath);
  const backupDir = path.join(configDir, BACKUP_DIR_NAME);

  // 条件：备份目录已存在
  if (fs.existsSync(backupDir)) {
    return backupDir;
  }
  // 替代：备份目录不存在，创建目录
  else {
    fs.mkdirSync(backupDir, { recursive: true });
    return backupDir;
  }
}

/**
 * 从文件名中提取备份序号
 *
 * @param file - 文件名
 * @param prefix - 当天备份文件前缀
 * @return 序号，不匹配返回 undefined
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function extractSequenceNumber(file: string, prefix: string): number | undefined {
  // 文件名匹配当天前缀
  if (file.startsWith(prefix)) {
    // 文件名格式：{configFileName}_{YYYYMMDD}{seq}
    // 需要提取日期后面的两位序号
    const suffix = file.slice(prefix.length);

    // 条件：匹配成功，提取并转换序号
    if (suffix && SEQ_PATTERN.test(suffix)) {
      return parseInt(suffix, DECIMAL_RADIX);
    }
    // 替代：匹配失败，返回 undefined
    else {
      return undefined;
    }
  }
  // 替代：文件名不匹配，返回 undefined
  else {
    return undefined;
  }
}

/**
 * 提取备份文件序号列表
 *
 * @param files - 文件列表
 * @param prefix - 当天备份文件前缀
 * @return 序号数组
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function extractSequenceNumbers(files: string[], prefix: string): number[] {
  const sequenceNumbers: number[] = [];

  for (const file of files) {
    const seq = extractSequenceNumber(file, prefix);
    // 条件：提取到有效序号
    if (seq !== undefined) {
      sequenceNumbers.push(seq);
    }
    // 替代：无效序号，跳过
    else {
      continue;
    }
  }

  return sequenceNumbers;
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
 * @date 2026-05-11
 */
function listTodayBackups(backupDir: string, configFileName: string, today: string): number[] {
  // 条件：备份目录不存在
  if (!fs.existsSync(backupDir)) {
    return [];
  }
  // 替代：备份目录存在，扫描文件
  else {
    const prefix = `${configFileName}_${today}`;
    const files = fs.readdirSync(backupDir);
    return extractSequenceNumbers(files, prefix);
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
 * @date 2026-05-11
 */
export function getNextBackupNumber(backupDir: string, configFileName: string): number {
  // 获取今天日期
  const today = formatDate(new Date());

  // 列出当天的备份文件序号
  const sequenceNumbers = listTodayBackups(backupDir, configFileName, today);

  // 条件：有备份文件
  if (sequenceNumbers.length > 0) {
    const maxNumber = Math.max(...sequenceNumbers);
    return maxNumber + 1;
  }
  // 替代：无备份文件，返回 0
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
 * @date 2026-05-11
 */
function generateBackupFileName(configFileName: string, sequenceNumber: number): string {
  // 获取今天日期
  const today = formatDate(new Date());

  // 序号补零到两位
  const seq = String(sequenceNumber).padStart(SEQ_DIGITS, '0');

  // 组合生成备份文件名
  return `${configFileName}_${today}${seq}`;
}

/**
 * 执行备份操作
 *
 * @param configPath - 配置文件绝对路径
 * @return 备份文件名（不含路径）
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function performBackup(configPath: string): string {
  const backupDir = createBackupDir(configPath);
  const configFileName = path.basename(configPath);
  const nextNumber = getNextBackupNumber(backupDir, configFileName);
  const backupFileName = generateBackupFileName(configFileName, nextNumber);
  const backupPath = path.join(backupDir, backupFileName);

  fs.copyFileSync(configPath, backupPath);
  return backupFileName;
}

/**
 * 备份配置文件
 * 复制当前配置文件到备份目录，使用日期+序号命名
 *
 * @param configPath - 配置文件绝对路径
 * @return 备份文件名（不含路径），文件不存在时返回空字符串
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function backupConfig(configPath: string): string {
  // 条件：配置文件不存在
  if (!fs.existsSync(configPath)) {
    return '';
  }
  // 替代：配置文件存在，执行备份
  else {
    return performBackup(configPath);
  }
}

/**
 * 更新单个可选字段
 *
 * @param env - Claude 配置的 env 对象
 * @param fieldName - 字段名
 * @param value - 字段值
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function updateOptionalField(env: any, fieldName: string, value: string | undefined): void {
  // 条件：存在有效值
  if (value) {
    env[fieldName] = value;
  }
  // 替代：无有效值，不更新
  else {
    // 保持原有值或删除
  }
}

/**
 * 更新 Claude 环境变量字段
 * 将新配置值写入 env 对象
 *
 * @param env - Claude 配置的 env 对象
 * @param config - 新模型配置
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function updateClaudeEnvFields(env: any, config: UnifiedModelConfig): void {
  // 更新必填字段
  env.ANTHROPIC_MODEL = config.model;
  env.ANTHROPIC_AUTH_TOKEN = config.apiKey;
  env.ANTHROPIC_BASE_URL = config.baseUrl;

  // 更新可选字段
  updateOptionalField(env, 'ANTHROPIC_DEFAULT_HAIKU_MODEL', config.haikuModel);
  updateOptionalField(env, 'ANTHROPIC_DEFAULT_SONNET_MODEL', config.sonnetModel);
  updateOptionalField(env, 'ANTHROPIC_DEFAULT_OPUS_MODEL', config.opusModel);
}

/**
 * 合并 JSON 配置（Claude）
 * 保留原有配置中非模型相关的字段，只更新模型相关字段
 *
 * @param original - 原配置对象
 * @param newConfig - 新模型配置
 * @return 合并后的配置对象
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function mergeJsonConfig(original: any, newConfig: UnifiedModelConfig): any {
  // 深拷贝原配置，避免修改原对象
  const merged = JSON.parse(JSON.stringify(original, null, JSON_INDENT));

  // 条件：env 对象不存在
  if (!merged.env) {
    merged.env = {};
  }
  // 替代：env 对象已存在，使用原有 env
  else {
    // 保持 env 对象
  }

  // 更新 Claude 模型相关字段
  updateClaudeEnvFields(merged.env, newConfig);

  return merged;
}
