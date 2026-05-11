/**
 * Shell 环境变量写入辅助函数
 * 封装 PowerShell 配置块操作与 Windows 环境变量写入逻辑
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/** PowerShell 编码 */
const POWERSHELL_ENCODING = 'utf-8';

/** 换行符 */
const NEWLINE = '\n';

/** Windows 换行符 */
const WINDOWS_NEWLINE = '\r\n';

/** 空字符串 */
const EMPTY_STRING = '';

/** PowerShell 标记块起始 */
const PS_BLOCK_START = '# >>> cmrm managed env vars >>>';

/** PowerShell 标记块结束 */
const PS_BLOCK_END = '# <<< cmrm managed env vars <<<';

/**
 * 移除 PowerShell 配置块
 *
 * @param content - 原始内容
 * @param psStart - 起始标记
 * @param psEnd - 结束标记
 * @return 清理后的内容
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function removePowerShellBlock(content: string, psStart: string, psEnd: string): string {
  const startIdx = content.indexOf(psStart);

  // 条件：找到起始标记
  if (startIdx !== -1) {
    const endIdx = content.indexOf(psEnd, startIdx);
    // 条件：找到结束标记
    if (endIdx !== -1) {
      return content.slice(0, startIdx) + content.slice(endIdx + psEnd.length);
    }
    // 替代：未找到结束标记，返回原内容
    else {
      return content;
    }
  }
  // 替代：未找到起始标记，返回原内容
  else {
    return content;
  }
}

/**
 * 构建 PowerShell 环境变量块
 *
 * @param envVars - 环境变量键值对
 * @param psStart - 起始标记
 * @param psEnd - 结束标记
 * @return PowerShell 配置块
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildPowerShellBlock(
  envVars: Record<string, string>,
  psStart: string,
  psEnd: string
): string {
  const lines = [psStart];
  for (const [key, value] of Object.entries(envVars)) {
    lines.push(`$env:${key} = "${value}"`);
  }
  lines.push(psEnd);
  lines.push(EMPTY_STRING);

  return lines.join(WINDOWS_NEWLINE);
}

/**
 * 获取 PowerShell profile 路径
 *
 * @return PowerShell profile 路径
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getPowerShellProfilePath(): string {
  const { execSync } = require('child_process');

  try {
    return execSync(
      'powershell -Command "Write-Output $PROFILE"',
      { encoding: POWERSHELL_ENCODING, stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
  } catch {
    return path.join(os.homedir(), 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
  }
}

/**
 * 确保 PowerShell profile 目录存在
 *
 * @param profilePath - profile 路径
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function ensureProfileDir(profilePath: string): void {
  const profileDir = path.dirname(profilePath);
  // 条件：目录不存在
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }
  // 替代：目录已存在，无需操作
  else {
    // 目录已存在，无需操作
  }
}

/**
 * 读取 PowerShell profile 内容
 *
 * @param profilePath - profile 路径
 * @return 文件内容
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function readProfileContent(profilePath: string): string {
  return fs.existsSync(profilePath) ? fs.readFileSync(profilePath, 'utf-8') : EMPTY_STRING;
}

/**
 * 构建新的 profile 内容
 *
 * @param cleanedContent - 清理后的内容
 * @param newBlock - 新环境变量块
 * @return 新内容
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function buildProfileContent(cleanedContent: string, newBlock: string): string {
  const separator = cleanedContent.endsWith(NEWLINE) || cleanedContent === EMPTY_STRING
    ? EMPTY_STRING
    : WINDOWS_NEWLINE;
  return cleanedContent + separator + newBlock;
}

/**
 * 写入环境变量到 Windows PowerShell 配置文件
 * 同时支持写入 PowerShell profile 和注册表（持久化）
 *
 * @param envVars - 环境变量键值对
 * @return PowerShell profile 路径
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function writeWindowsPowerShellProfile(envVars: Record<string, string>): string {
  const profilePath = getPowerShellProfilePath();
  ensureProfileDir(profilePath);

  const originalContent = readProfileContent(profilePath);
  const cleanedContent = removePowerShellBlock(originalContent, PS_BLOCK_START, PS_BLOCK_END);
  const newBlock = buildPowerShellBlock(envVars, PS_BLOCK_START, PS_BLOCK_END);
  const newContent = buildProfileContent(cleanedContent, newBlock);

  fs.writeFileSync(profilePath, newContent, 'utf-8');
  return profilePath;
}

/**
 * 写入单个 Windows 环境变量
 *
 * @param key - 变量名
 * @param value - 变量值
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function writeSingleWindowsEnvVar(key: string, value: string): void {
  const { execSync } = require('child_process');
  const escapedValue = value.replace(/"/g, '\`"');
  const psCommand = `[Environment]::SetEnvironmentVariable('${key}', '${escapedValue}', 'User')`;

  try {
    execSync(
      `powershell -Command "${psCommand}"`,
      { stdio: 'ignore' }
    );
  } catch {
    // PowerShell 方式失败则回退到 setx
    try {
      execSync(`setx ${key} "${value}"`, { stdio: 'ignore' });
    } catch {
      // 静默处理，由调用方提示用户手动设置
    }
  }
}

/**
 * 写入环境变量到 Windows 注册表（永久用户环境变量）
 * 使用 PowerShell [Environment]::SetEnvironmentVariable 避免 setx 截断问题
 *
 * @param envVars - 环境变量键值对
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function writeWindowsEnvVars(envVars: Record<string, string>): void {
  for (const [key, value] of Object.entries(envVars)) {
    writeSingleWindowsEnvVar(key, value);
  }
}
