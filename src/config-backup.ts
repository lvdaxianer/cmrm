/**
 * 配置备份模块
 * 负责 settings.json 的自动备份功能
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import * as fs from 'fs';
import * as path from 'path';

/** ISO 日期字符串切片长度（取 YYYY-MM-DD 部分） */
const DATE_SLICE_LENGTH = 10;
/** 备份序号填充位数 */
const BACKUP_SEQ_DIGITS = 2;
/** 十进制解析基数 */
const DECIMAL_RADIX = 10;
/** 默认备份序号起始值 */
const DEFAULT_BACKUP_SEQ = -1;

/**
 * 配置备份类
 * 管理 settings.json 的自动备份逻辑
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export class ConfigBackup {
  /**
   * 构造函数
   *
   * @param settingsPath - settings.json 文件路径
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  constructor(private readonly settingsPath: string) {}

  /**
   * 备份当前 settings.json
   * 备份格式: settings.json.backup.YYYYMMDDNN (NN 为当天递增序号)
   *
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  backupSettings(): void {
    // 条件: 文件不存在，无需备份
    if (!fs.existsSync(this.settingsPath)) {
      return;
    }

    const dateStr = new Date().toISOString().slice(0, DATE_SLICE_LENGTH).replace(/-/g, '');
    const backupDir = path.dirname(this.settingsPath);
    const baseName = `settings.json.backup.${dateStr}`;

    const maxSeq = this.findMaxBackupSequence(backupDir, dateStr);
    const seqStr = String(maxSeq + 1).padStart(BACKUP_SEQ_DIGITS, '0');
    const backupPath = path.join(backupDir, `${baseName}${seqStr}`);

    fs.copyFileSync(this.settingsPath, backupPath);
  }

  /**
   * 从单个文件名中提取备份序号
   *
   * @param file - 文件名
   * @param pattern - 备份文件名正则
   * @return 序号，不匹配返回 undefined
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private extractBackupSequence(file: string, pattern: RegExp): number | undefined {
    const match = file.match(pattern);
    // 条件: 文件名匹配备份模式，提取序号
    if (match) {
      return parseInt(match[1], DECIMAL_RADIX);
    }
    // 替代: 文件名不匹配备份模式，返回 undefined
    else {
      return undefined;
    }
  }

  /**
   * 更新最大备份序号
   *
   * @param currentMax - 当前最大值
   * @param seq - 新序号
   * @return 更新后的最大值
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private updateMaxSequence(currentMax: number, seq: number): number {
    // 条件: 当前序号大于已记录的最大值
    if (seq > currentMax) {
      return seq;
    }
    // 替代: 当前序号不大于最大值，保持原值
    else {
      return currentMax;
    }
  }

  /**
   * 查找当天已有备份的最大序号
   *
   * @param backupDir - 备份目录路径
   * @param dateStr - 日期字符串（YYYYMMDD 格式）
   * @return 当天已有备份的最大序号，无备份时返回 -1
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  private findMaxBackupSequence(backupDir: string, dateStr: string): number {
    let maxSeq = DEFAULT_BACKUP_SEQ;
    const pattern = new RegExp(`^settings\\.json\\.backup\\.${dateStr}(\\d{${BACKUP_SEQ_DIGITS}})$`);

    // 条件: 备份目录存在，扫描已有备份文件
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      for (const file of files) {
        const seq = this.extractBackupSequence(file, pattern);
        // 条件: 提取到有效序号
        if (seq !== undefined) {
          maxSeq = this.updateMaxSequence(maxSeq, seq);
        }
        // 替代: 文件名不匹配备份模式，跳过
        else {
          // 非备份文件，忽略
        }
      }
    }
    // 替代: 备份目录不存在，无需扫描
    else {
      // 目录不存在，无已有备份
    }

    return maxSeq;
  }
}
