/**
 * Codex auth.json 管理模块
 * 负责读取和写入 ~/.codex/auth.json 密钥文件
 *
 * @author lvdaxianerplus
 * @date 2026-05-09
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * auth.json 结构
 * 支持两种格式：OPENAI_API_KEY 或 api_keys.openai
 */
export interface AuthConfig {
  /** OpenAI API Key（兼容性格式） */
  OPENAI_API_KEY?: string;
  /** 密钥映射（api_keys.openai 格式） */
  api_keys?: Record<string, string>;
}

/**
 * 读取 auth.json 密钥文件
 *
 * @param authPath - 密钥文件绝对路径
 * @return 密钥配置对象，文件不存在或解析失败返回 null
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function readAuthConfig(authPath: string): AuthConfig | null {
  // 密钥文件不存在
  if (!fs.existsSync(authPath)) {
    return null;
  }
  // 读取并解析 JSON
  else {
    try {
      const content = fs.readFileSync(authPath, 'utf-8');
      return JSON.parse(content) as AuthConfig;
    } catch {
      return null;
    }
  }
}

/**
 * 写入密钥到 auth.json
 * Codex 使用固定的 OPENAI_API_KEY 字段
 *
 * @param authPath - 密钥文件绝对路径
 * @param apiKey - API 密钥
 * @author lvdaxianerplus
 * @date 2026-05-09
 */
export function writeAuthConfig(authPath: string, apiKey: string): void {
  const authDir = path.dirname(authPath);

  // 目录不存在时创建
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // 读取现有密钥配置
  const auth = readAuthConfig(authPath) || {};
  // Codex 使用固定的 OPENAI_API_KEY 字段
  auth.OPENAI_API_KEY = apiKey;

  // 写入 auth.json
  fs.writeFileSync(authPath, JSON.stringify(auth, null, 2), 'utf-8');
}
