/**
 * Codex auth.json 管理模块
 * 负责读取和写入 ~/.codex/auth.json 密钥文件
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import * as fs from 'fs';
import * as path from 'path';

/** JSON 缩进空格数 */
const JSON_INDENT = 2;

/** Codex 配置目录名 */
const CODEX_CONFIG_DIR = '.codex';

/** 默认环境变量密钥名 */
const DEFAULT_ENV_KEY = 'OPENAI_API_KEY';

/**
 * auth.json 结构
 * 支持两种格式：OPENAI_API_KEY 或 api_keys.openai
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
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
 * @return 密钥配置对象，文件不存在或解析失败返回 undefined
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function readAuthConfig(authPath: string): AuthConfig | undefined {
  // 条件：密钥文件不存在
  if (!fs.existsSync(authPath)) {
    return undefined;
  }
  // 替代：读取并解析 JSON
  else {
    try {
      const content = fs.readFileSync(authPath, 'utf-8');
      return JSON.parse(content) as AuthConfig;
    } catch {
      return undefined;
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
 * @date 2026-05-11
 */
export function writeAuthConfig(authPath: string, apiKey: string): void {
  const authDir = path.dirname(authPath);

  // 条件：目录不存在时创建
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  // 替代：目录已存在，无需创建
  else {
    // 目录已存在，无需创建
  }

  // 读取现有密钥配置
  const auth = readAuthConfig(authPath) || {};
  // Codex 使用固定的 OPENAI_API_KEY 字段
  auth[DEFAULT_ENV_KEY] = apiKey;

  // 写入 auth.json
  fs.writeFileSync(authPath, JSON.stringify(auth, null, JSON_INDENT), 'utf-8');
}
