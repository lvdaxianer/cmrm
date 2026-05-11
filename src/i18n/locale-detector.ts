/**
 * 语言环境检测模块
 * 封装地理位置检测与语言环境识别逻辑
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import { Locale } from './types';
import { GeoDetector } from './detector';

/** 默认语言：中文 */
const DEFAULT_LOCALE: Locale = 'zh';

/**
 * 语言环境检测器
 * 封装地理位置检测逻辑，供 I18nManager 使用
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export class LocaleDetector {
  /** 地理位置检测器 */
  private geoDetector: GeoDetector;

  /**
   * 构造函数
   *
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  constructor() {
    this.geoDetector = new GeoDetector();
  }

  /**
   * 尝试通过地理位置检测获取语言
   *
   * @returns 检测到的语言代码，检测失败返回 undefined
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  tryDetectLocale(): Locale | undefined {
    const detectedLocale = this.detectLocaleByGeo();
    // 条件：地理位置检测成功
    if (detectedLocale) {
      return detectedLocale;
    }
    // 替代：地理位置检测失败，返回 undefined
    else {
      return undefined;
    }
  }

  /**
   * 检测地理位置并返回推荐语言
   *
   * @returns 检测到的语言，检测失败返回 undefined
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  detectLocaleByGeo(): Locale | undefined {
    // 注意：这里需要外部传入坐标
    // 当前实现返回 undefined，外部可通过 detectByCoordinates 主动调用
    return undefined;
  }

  /**
   * 根据 GPS 坐标检测语言
   * 供外部调用，用于交互式获取用户位置
   *
   * @param latitude - 纬度
   * @param longitude - 经度
   * @returns 检测到的语言代码，检测失败默认返回 'zh'
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  detectByCoordinates(latitude: number, longitude: number): Locale {
    return this.geoDetector.detectByCoordinates(latitude, longitude);
  }
}

/**
 * 创建默认语言环境检测器实例
 *
 * @returns LocaleDetector 实例
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export function createLocaleDetector(): LocaleDetector {
  return new LocaleDetector();
}
