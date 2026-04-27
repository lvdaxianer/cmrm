/**
 * 备份工具测试
 * 测试 SL-066 ~ SL-075 故事线场景
 *
 * @author lvdaxianerplus
 * @date 2026-04-27
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createBackupDir,
  getNextBackupNumber,
  backupConfig,
  mergeJsonConfig,
} from '../src/utils/backup';
import { UnifiedModelConfig } from '../src/adapters/types';

/**
 * 测试临时目录
 */
const TEST_DIR = path.join(os.tmpdir(), 'cmrm-test-backup');

/**
 * 设置测试环境
 */
beforeEach(() => {
  // 创建测试目录
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
});

/**
 * 清理测试环境
 */
afterEach(() => {
  // 清理测试目录
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

/**
 * 备份目录创建测试
 * 覆盖故事线 SL-066 ~ SL-067
 */
describe('备份目录创建 (SL-066 ~ SL-067)', () => {
  // SL-066: 备份目录已存在
  it('SL-066: 备份目录已存在时直接返回路径', () => {
    const configPath = path.join(TEST_DIR, 'test-config.json');

    // 首次创建备份目录
    const backupDir1 = createBackupDir(configPath);

    // 再次调用（目录已存在）
    const backupDir2 = createBackupDir(configPath);

    // 返回相同路径
    expect(backupDir1).toBe(backupDir2);
    expect(fs.existsSync(backupDir1)).toBe(true);
  });

  // SL-067: 备份目录不存在创建
  it('SL-067: 备份目录不存在时创建目录', () => {
    const configPath = path.join(TEST_DIR, 'new-dir', 'test-config.json');

    // 创建备份目录
    const backupDir = createBackupDir(configPath);

    // 目录存在
    expect(fs.existsSync(backupDir)).toBe(true);
    expect(backupDir).toBe(path.join(TEST_DIR, 'new-dir', '.cmrm'));
  });
});

/**
 * 备份序号获取测试
 * 覆盖故事线 SL-070 ~ SL-071
 */
describe('备份序号获取 (SL-070 ~ SL-071)', () => {
  // SL-070: 当天无备份返回序号0
  it('SL-070: 当天无备份文件时返回序号0', () => {
    const configFileName = 'test-config.json';
    const backupDir = createBackupDir(path.join(TEST_DIR, 'config.json'));

    const nextNumber = getNextBackupNumber(backupDir, configFileName);

    // 无备份时返回 0
    expect(nextNumber).toBe(0);
  });

  // SL-071: 当天有备份返回最大+1
  it('SL-071: 当天有备份文件时返回最大序号+1', () => {
    const configFileName = 'test-config.json';
    const backupDir = createBackupDir(path.join(TEST_DIR, 'config.json'));

    // 创建今天的备份文件 _00, _01
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    fs.writeFileSync(path.join(backupDir, `${configFileName}_${dateStr}00`), '{}');
    fs.writeFileSync(path.join(backupDir, `${configFileName}_${dateStr}01`), '{}');

    const nextNumber = getNextBackupNumber(backupDir, configFileName);

    // 最大序号是1，返回2
    expect(nextNumber).toBe(2);
  });
});

/**
 * 配置备份测试
 * 覆盖故事线 SL-068 ~ SL-069
 */
describe('配置备份 (SL-068 ~ SL-069)', () => {
  // SL-068: 配置文件不存在不备份
  it('SL-068: 配置文件不存在时返回空字符串不备份', () => {
    const configPath = path.join(TEST_DIR, 'non-existent.json');

    const backupFileName = backupConfig(configPath);

    // 返回空字符串
    expect(backupFileName).toBe('');
  });

  // SL-069: 配置文件存在执行备份
  it('SL-069: 配置文件存在时复制到备份文件返回文件名', () => {
    const configPath = path.join(TEST_DIR, 'test-config.json');

    // 创建配置文件
    fs.writeFileSync(configPath, JSON.stringify({ test: 'data' }, null, 2));

    const backupFileName = backupConfig(configPath);

    // 返回备份文件名（非空）
    expect(backupFileName).not.toBe('');
    expect(backupFileName).toMatch(/test-config\.json_\d{8}\d{2}/);

    // 备份文件存在
    const backupDir = path.join(TEST_DIR, '.cmrm');
    const backupPath = path.join(backupDir, backupFileName);
    expect(fs.existsSync(backupPath)).toBe(true);

    // 备份内容与原文件相同
    const backupContent = fs.readFileSync(backupPath, 'utf-8');
    expect(backupContent).toBe(JSON.stringify({ test: 'data' }, null, 2));
  });
});

/**
 * JSON配置合并测试
 */
describe('JSON配置合并', () => {
  // 合并保留原有字段
  it('合并时保留原有非模型字段', () => {
    const original = {
      env: {
        ANTHROPIC_MODEL: 'old-model',
        ANTHROPIC_AUTH_TOKEN: 'old-token',
        ANTHROPIC_BASE_URL: 'https://old-url.com',
        OTHER_FIELD: 'should-keep', // 非模型字段
      },
      otherSection: {
        data: 'value', // 其他section
      },
    };

    const newConfig: UnifiedModelConfig = {
      model: 'new-model',
      apiKey: 'new-key',
      baseUrl: 'https://new-url.com',
    };

    const merged = mergeJsonConfig(original, newConfig);

    // 非模型字段保留
    expect(merged.env.OTHER_FIELD).toBe('should-keep');
    expect(merged.otherSection.data).toBe('value');

    // 模型字段更新
    expect(merged.env.ANTHROPIC_MODEL).toBe('new-model');
    expect(merged.env.ANTHROPIC_AUTH_TOKEN).toBe('new-key');
    expect(merged.env.ANTHROPIC_BASE_URL).toBe('https://new-url.com');
  });

  // 合并添加可选字段
  it('合并时添加可选的haiku/sonnet/opus字段', () => {
    const original = {
      env: {
        ANTHROPIC_MODEL: 'old-model',
      },
    };

    const newConfig: UnifiedModelConfig = {
      model: 'new-model',
      apiKey: 'new-key',
      baseUrl: 'https://new-url.com',
      haikuModel: 'haiku-4-5',
      sonnetModel: 'sonnet-4-5',
      opusModel: 'opus-4-5',
    };

    const merged = mergeJsonConfig(original, newConfig);

    // 可选字段添加
    expect(merged.env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('haiku-4-5');
    expect(merged.env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('sonnet-4-5');
    expect(merged.env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('opus-4-5');
  });

  // 原配置无env时创建env
  it('原配置无env对象时创建env', () => {
    const original = {};

    const newConfig: UnifiedModelConfig = {
      model: 'new-model',
      apiKey: 'new-key',
      baseUrl: 'https://new-url.com',
    };

    const merged = mergeJsonConfig(original, newConfig);

    // env对象存在
    expect(merged.env).toBeDefined();
    expect(merged.env.ANTHROPIC_MODEL).toBe('new-model');
  });
});

