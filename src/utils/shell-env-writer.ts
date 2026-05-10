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
 * @date 2026-05-10
 */
export function detectShell(): string {
  const shellPath = process.env.SHELL || '';
  const shellName = path.basename(shellPath);

  // 已知 shell 类型
  if (shellName === 'zsh' || shellName === 'bash') {
    return shellName;
  }

  // 默认回退到 zsh（macOS 默认）
  return 'zsh';
}

/**
 * 获取 shell 配置文件路径
 *
 * @return 配置文件绝对路径
 * @author lvdaxianerplus
 * @date 2026-05-10
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
 * @date 2026-05-10
 */
function buildEnvBlock(envVars: Record<string, string>): string {
  const lines = [ENV_BLOCK_START];

  for (const [key, value] of Object.entries(envVars)) {
    lines.push(`export ${key}="${value}"`);
  }

  lines.push(ENV_BLOCK_END);
  lines.push('');

  return lines.join('\n');
}

/**
 * 从配置文件中移除旧的 cmrm 环境变量块
 *
 * @param content - 文件内容
 * @return 清理后的内容
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
function removeOldEnvBlock(content: string): string {
  const startIdx = content.indexOf(ENV_BLOCK_START);

  if (startIdx === -1) {
    return content;
  }

  const endIdx = content.indexOf(ENV_BLOCK_END, startIdx);

  if (endIdx === -1) {
    return content;
  }

  // 移除整个块（包括结尾换行）
  const before = content.slice(0, startIdx);
  const after = content.slice(endIdx + ENV_BLOCK_END.length);

  return before + after.replace(/^\n/, '');
}

/**
 * 写入环境变量到 shell 配置文件
 * 使用标记块方式，便于后续更新和删除
 *
 * @param envVars - 环境变量键值对
 * @return 写入的配置文件路径
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
export function writeShellEnvVars(envVars: Record<string, string>): string {
  const configPath = getShellConfigPath();
  const originalContent = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, 'utf-8')
    : '';

  // 移除旧的 cmrm 配置块
  const cleanedContent = removeOldEnvBlock(originalContent);

  // 构建新的配置块并追加
  const envBlock = buildEnvBlock(envVars);
  const newContent = cleanedContent + (cleanedContent.endsWith('\n') || cleanedContent === '' ? '' : '\n') + envBlock;

  fs.writeFileSync(configPath, newContent, 'utf-8');

  return configPath;
}

/**
 * 写入环境变量到 Windows PowerShell 配置文件
 * 同时支持写入 PowerShell profile 和注册表（持久化）
 *
 * @param envVars - 环境变量键值对
 * @return PowerShell profile 路径
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
export function writeWindowsPowerShellProfile(envVars: Record<string, string>): string {
  const { execSync } = require('child_process');

  // 获取 PowerShell profile 路径
  let profilePath: string;
  try {
    profilePath = execSync(
      'powershell -Command "Write-Output $PROFILE"',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
  } catch {
    profilePath = path.join(os.homedir(), 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
  }

  // 确保 profile 目录存在
  const profileDir = path.dirname(profilePath);
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  // 读取现有内容
  const originalContent = fs.existsSync(profilePath) ? fs.readFileSync(profilePath, 'utf-8') : '';

  // PowerShell 标记块
  const psStart = '# >>> cmrm managed env vars >>>';
  const psEnd = '# <<< cmrm managed env vars <<<';

  // 移除旧块
  const startIdx = originalContent.indexOf(psStart);
  let cleanedContent = originalContent;
  if (startIdx !== -1) {
    const endIdx = originalContent.indexOf(psEnd, startIdx);
    if (endIdx !== -1) {
      cleanedContent = originalContent.slice(0, startIdx) + originalContent.slice(endIdx + psEnd.length);
    }
  }

  // 构建新的 PowerShell 环境变量块
  const lines = [psStart];
  for (const [key, value] of Object.entries(envVars)) {
    lines.push(`$env:${key} = "${value}"`);
  }
  lines.push(psEnd);
  lines.push('');

  const newBlock = lines.join('\r\n');
  const newContent = cleanedContent + (cleanedContent.endsWith('\n') || cleanedContent === '' ? '' : '\r\n') + newBlock;

  fs.writeFileSync(profilePath, newContent, 'utf-8');

  return profilePath;
}

/**
 * 写入环境变量到 Windows 注册表（永久用户环境变量）
 * 使用 PowerShell [Environment]::SetEnvironmentVariable 避免 setx 截断问题
 *
 * @param envVars - 环境变量键值对
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
export function writeWindowsEnvVars(envVars: Record<string, string>): void {
  const { execSync } = require('child_process');

  for (const [key, value] of Object.entries(envVars)) {
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
}

/**
 * 根据操作系统写入环境变量
 * macOS/Linux: 写入 shell 配置文件（~/.zshrc 或 ~/.bashrc）
 * Windows: 写入 PowerShell profile + 注册表（持久化）
 *
 * @param envVars - 环境变量键值对
 * @return 结果信息（配置文件路径或提示文本）
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
export function writeEnvVars(envVars: Record<string, string>): { path: string; needsRestart: boolean } {
  const platform = os.platform();

  // Windows 平台：同时写入 PowerShell profile 和注册表
  if (platform === 'win32') {
    const profilePath = writeWindowsPowerShellProfile(envVars);
    writeWindowsEnvVars(envVars);
    return { path: profilePath, needsRestart: true };
  }

  // macOS / Linux：写入 shell 配置文件
  const configPath = writeShellEnvVars(envVars);
  return { path: configPath, needsRestart: true };
}

/**
 * 获取重启终端提示信息
 *
 * @param configPath - 配置文件路径
 * @return 提示文本
 * @author lvdaxianerplus
 * @date 2026-05-10
 */
export function getRestartHint(configPath: string): string {
  const platform = os.platform();

  // Windows：提示重新打开 PowerShell
  if (platform === 'win32') {
    return '请重新打开 PowerShell 终端，或执行 ". $PROFILE" 使环境变量生效';
  }

  // macOS / Linux：提示 source 配置文件
  return `请运行 "source ${path.basename(configPath)}" 或重新打开终端`;
}
