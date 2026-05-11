/**
 * Shell 环境变量写入模块
 * 负责将 API Key 写入用户 shell 配置文件，兼容 macOS/Linux/Windows
 *
 * @author lvdaxianerplus
 * @date 2026-05-10
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  writeWindowsPowerShellProfile,
  writeWindowsEnvVars,
} from './shell-env-helpers';

/** 换行符 */
const NEWLINE = '\n';

/** 空字符串 */
const EMPTY_STRING = '';

/**
 * 支持的 shell 类型及其配置文件
 */
const SHELL_CONFIG_MAP: Record<string, string> = {
  zsh: '.zshrc',
  bash: '.bashrc',
};

/**
 * 检测当前使用的 shell
 *
 * @return shell 名称（如 'zsh', 'bash'）
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function detectShell(): string {
  const shellPath = process.env.SHELL || EMPTY_STRING;
  const shellName = path.basename(shellPath);

  // 条件：已知 shell 类型
  if (shellName === 'zsh' || shellName === 'bash') {
    return shellName;
  }
  // 替代：默认回退到 zsh（macOS 默认）
  else {
    return 'zsh';
  }
}

/**
 * 获取 shell 配置文件路径
 *
 * @return 配置文件绝对路径
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getShellConfigPath(): string {
  const homeDir = os.homedir();
  const shell = detectShell();
  const configFile = SHELL_CONFIG_MAP[shell] || '.zshrc';

  return path.join(homeDir, configFile);
}

/**
 * 环境变量配置块标记（用于识别和替换）
 */
const ENV_BLOCK_START = '# >>> cmrm managed env vars >>>';
const ENV_BLOCK_END = '# <<< cmrm managed env vars <<<';

/**
 * 构建环境变量配置块
 *
 * @param envVars - 环境变量键值对
 * @return 配置块字符串
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function buildEnvBlock(envVars: Record<string, string>): string {
  const lines = [ENV_BLOCK_START];

  for (const [key, value] of Object.entries(envVars)) {
    lines.push(`export ${key}="${value}"`);
  }

  lines.push(ENV_BLOCK_END);
  lines.push(EMPTY_STRING);

  return lines.join(NEWLINE);
}

/**
 * 从配置文件中移除旧的 cmrm 环境变量块
 *
 * @param content - 文件内容
 * @return 清理后的内容
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function removeOldEnvBlock(content: string): string {
  const startIdx = content.indexOf(ENV_BLOCK_START);

  // 条件：未找到起始标记
  if (startIdx === -1) {
    return content;
  }
  // 替代：找到起始标记，继续查找结束标记
  else {
    const endIdx = content.indexOf(ENV_BLOCK_END, startIdx);

    // 条件：未找到结束标记
    if (endIdx === -1) {
      return content;
    }
    // 替代：找到结束标记，移除整个块
    else {
      // 移除整个块（包括结尾换行）
      const before = content.slice(0, startIdx);
      const after = content.slice(endIdx + ENV_BLOCK_END.length);

      return before + after.replace(/^\n/, EMPTY_STRING);
    }
  }
}

/**
 * 构建追加内容
 *
 * @param cleanedContent - 清理后的内容
 * @param envBlock - 环境变量块
 * @return 新内容
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
function buildNewContent(cleanedContent: string, envBlock: string): string {
  const separator = cleanedContent.endsWith(NEWLINE) || cleanedContent === EMPTY_STRING
    ? EMPTY_STRING
    : NEWLINE;
  return cleanedContent + separator + envBlock;
}

/**
 * 写入环境变量到 shell 配置文件
 * 使用标记块方式，便于后续更新和删除
 *
 * @param envVars - 环境变量键值对
 * @return 写入的配置文件路径
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function writeShellEnvVars(envVars: Record<string, string>): string {
  const configPath = getShellConfigPath();
  const originalContent = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, 'utf-8')
    : EMPTY_STRING;

  // 移除旧的 cmrm 配置块
  const cleanedContent = removeOldEnvBlock(originalContent);

  // 构建新的配置块并追加
  const envBlock = buildEnvBlock(envVars);
  const newContent = buildNewContent(cleanedContent, envBlock);

  fs.writeFileSync(configPath, newContent, 'utf-8');

  return configPath;
}

/**
 * 根据操作系统写入环境变量
 * macOS/Linux: 写入 shell 配置文件（~/.zshrc 或 ~/.bashrc）
 * Windows: 写入 PowerShell profile + 注册表（持久化）
 *
 * @param envVars - 环境变量键值对
 * @return 结果信息（配置文件路径或提示文本）
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function writeEnvVars(envVars: Record<string, string>): { path: string; isRestartNeeded: boolean } {
  const platform = os.platform();

  // 条件：Windows 平台
  if (platform === 'win32') {
    const profilePath = writeWindowsPowerShellProfile(envVars);
    writeWindowsEnvVars(envVars);
    return { path: profilePath, isRestartNeeded: true };
  }
  // 替代：macOS / Linux
  else {
    const configPath = writeShellEnvVars(envVars);
    return { path: configPath, isRestartNeeded: true };
  }
}

/**
 * 获取重启终端提示信息
 *
 * @param configPath - 配置文件路径
 * @return 提示文本
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function getRestartHint(configPath: string): string {
  const platform = os.platform();

  // 条件：Windows 平台
  if (platform === 'win32') {
    return '请重新打开 PowerShell 终端，或执行 ". $PROFILE" 使环境变量生效';
  }
  // 替代：macOS / Linux
  else {
    return `请运行 "source ${path.basename(configPath)}" 或重新打开终端`;
  }
}
