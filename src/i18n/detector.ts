/**
 * 地理位置检测器
 * 根据 GPS 坐标或 IP 地址判断用户所在地区，返回推荐语言
 *
 * @author lvdaxianerplus
 * @date 2026-05-05
 */

import { Locale } from './types';

/**
 * 中国经纬度范围
 * 纬度: ~3.86°N to ~53.55°N
 * 经度: ~73.5°E to ~135.05°E
 */
const CHINA_BOUNDS = {
  minLat: 3.86,
  maxLat: 53.55,
  minLon: 73.5,
  maxLon: 135.05,
};

/**
 * 日本经纬度范围
 * 纬度: ~24.39°N to ~45.55°N
 * 经度: ~122.93°E to ~153.99°E
 */
const JAPAN_BOUNDS = {
  minLat: 24.39,
  maxLat: 45.55,
  minLon: 122.93,
  maxLon: 153.99,
};

/**
 * 地理位置检测器类
 * 根据 GPS 坐标判断应使用何种语言
 */
export class GeoDetector {
  /**
   * 根据 GPS 坐标判断语言
   *
   * @param latitude - 纬度
   * @param longitude - 经度
   * @returns 检测到的语言代码，检测失败默认返回 'en'
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  detectByCoordinates(latitude: number, longitude: number): Locale {
    // 验证输入有效性
    if (!this.isValidCoordinate(latitude, longitude)) {
      return 'en';
    }

    // 中国范围
    if (this.isInChina(latitude, longitude)) {
      return 'zh';
    }

    // 日本范围
    if (this.isInJapan(latitude, longitude)) {
      return 'ja';
    }

    // 其他地区默认英语
    return 'en';
  }

  /**
   * 验证坐标是否有效
   *
   * @param latitude - 纬度
   * @param longitude - 经度
   * @returns 是否有效
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  private isValidCoordinate(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !isNaN(latitude) &&
      !isNaN(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  /**
   * 判断坐标是否在中国范围内
   *
   * @param latitude - 纬度
   * @param longitude - 经度
   * @returns 是否在中国
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  private isInChina(latitude: number, longitude: number): boolean {
    return (
      latitude >= CHINA_BOUNDS.minLat &&
      latitude <= CHINA_BOUNDS.maxLat &&
      longitude >= CHINA_BOUNDS.minLon &&
      longitude <= CHINA_BOUNDS.maxLon
    );
  }

  /**
   * 判断坐标是否在日本范围内
   *
   * @param latitude - 纬度
   * @param longitude - 经度
   * @returns 是否在日本
   * @author lvdaxianerplus
   * @date 2026-05-05
   */
  private isInJapan(latitude: number, longitude: number): boolean {
    return (
      latitude >= JAPAN_BOUNDS.minLat &&
      latitude <= JAPAN_BOUNDS.maxLat &&
      longitude >= JAPAN_BOUNDS.minLon &&
      longitude <= JAPAN_BOUNDS.maxLon
    );
  }
}

/**
 * 默认地理位置检测器实例
 */
export const geoDetector = new GeoDetector();
