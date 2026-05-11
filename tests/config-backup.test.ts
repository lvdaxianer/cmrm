/**
 * ConfigManager 备份机制测试
 * 验证 settings.json 每次写入时自动备份,格式为 settings.json.backup.YYYYMMDDNN
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager } from '../src/config';
import { Settings } from '../src/types';

/** 临时测试目录 */
let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmrm-backup-test-'));
});

afterEach(() => {
  // 清理临时目录
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

/**
 * 获取当天的日期字符串 YYYYMMDD
 */
function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * 创建 ConfigManager 实例(使用临时目录)
 */
function createTestConfigManager(): ConfigManager {
  // 通过 monkey-patch 让 ConfigManager 使用临时目录
  const cm = new ConfigManager();
  const testPath = path.join(tempDir, 'settings.json');
  (cm as any).settingsPath = testPath;
  (cm as any).backup.settingsPath = testPath;
  return cm;
}

describe('ConfigManager - backup', () => {
  it('首次 saveSettings 不应产生备份(文件不存在)', () => {
    const cm = createTestConfigManager();
    const settings: Settings = { tools: { claude: { modes: [] } } };

    cm.saveSettings(settings);

    const files = fs.readdirSync(tempDir);
    // 只有 settings.json,没有备份文件
    expect(files).toEqual(['settings.json']);
  });

  it('第二次 saveSettings 应产生备份,格式为 settings.json.backup.YYYYMMDD00', () => {
    const cm = createTestConfigManager();
    const settings1: Settings = { tools: { claude: { modes: [] } } };
    const settings2: Settings = { tools: { claude: { modes: [{ name: 'a', model: 'a', apiKey: 'k', baseUrl: 'u' }] } } };

    cm.saveSettings(settings1);
    cm.saveSettings(settings2);

    const files = fs.readdirSync(tempDir).sort();
    const today = getTodayStr();
    expect(files).toContain('settings.json');
    expect(files).toContain(`settings.json.backup.${today}00`);
  });

  it('多次 saveSettings 应产生递增序号(00, 01, 02)', () => {
    const cm = createTestConfigManager();
    const base: Settings = { tools: { claude: { modes: [] } } };
    const today = getTodayStr();

    // 第 1 次:无备份
    cm.saveSettings(base);
    // 第 2 次:备份 00
    cm.saveSettings(base);
    // 第 3 次:备份 01
    cm.saveSettings(base);
    // 第 4 次:备份 02
    cm.saveSettings(base);

    const files = fs.readdirSync(tempDir).sort();
    expect(files).toContain(`settings.json.backup.${today}00`);
    expect(files).toContain(`settings.json.backup.${today}01`);
    expect(files).toContain(`settings.json.backup.${today}02`);
    expect(files).toContain('settings.json');
    expect(files).toHaveLength(4);
  });

  it('备份文件内容应与原文件一致', () => {
    const cm = createTestConfigManager();
    const settings: Settings = {
      tools: {
        claude: {
          modes: [{ name: 'test', model: 'm', apiKey: 'k', baseUrl: 'u' }],
        },
      },
    };

    cm.saveSettings(settings);
    const originalContent = fs.readFileSync(path.join(tempDir, 'settings.json'), 'utf-8');

    cm.saveSettings({ ...settings, tools: { claude: { modes: [] } } });
    const today = getTodayStr();
    const backupContent = fs.readFileSync(
      path.join(tempDir, `settings.json.backup.${today}00`),
      'utf-8',
    );

    expect(backupContent).toBe(originalContent);
  });
});
