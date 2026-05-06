/**
 * 地理位置检测器测试
 * 覆盖 GeoDetector 所有方法分支
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect } from 'vitest';
import { GeoDetector } from '../src/i18n/detector';

describe('GeoDetector', () => {
  const detector = new GeoDetector();

  // 中国范围
  it('中国坐标应返回 zh', () => {
    expect(detector.detectByCoordinates(39.9, 116.4)).toBe('zh');
  });

  it('中国边界坐标应返回 zh', () => {
    expect(detector.detectByCoordinates(3.86, 73.5)).toBe('zh');
    expect(detector.detectByCoordinates(53.55, 135.05)).toBe('zh');
  });

  // 日本范围
  it('日本坐标应返回 ja', () => {
    expect(detector.detectByCoordinates(35.6, 139.6)).toBe('ja');
  });

  it('日本边界坐标应返回 ja', () => {
    expect(detector.detectByCoordinates(35, 140)).toBe('ja');
    expect(detector.detectByCoordinates(40, 145)).toBe('ja');
  });

  // 其他地区
  it('美国坐标应返回 en', () => {
    expect(detector.detectByCoordinates(37.7, -122.4)).toBe('en');
  });

  it('欧洲坐标应返回 en', () => {
    expect(detector.detectByCoordinates(51.5, -0.1)).toBe('en');
  });

  // 无效坐标
  it('无效纬度应返回 en', () => {
    expect(detector.detectByCoordinates(91, 116)).toBe('en');
    expect(detector.detectByCoordinates(-91, 116)).toBe('en');
  });

  it('无效经度应返回 en', () => {
    expect(detector.detectByCoordinates(39, 181)).toBe('en');
    expect(detector.detectByCoordinates(39, -181)).toBe('en');
  });

  it('NaN 坐标应返回 en', () => {
    expect(detector.detectByCoordinates(NaN, 116)).toBe('en');
    expect(detector.detectByCoordinates(39, NaN)).toBe('en');
  });

  it('非数字坐标应返回 en', () => {
    expect(detector.detectByCoordinates('abc' as any, 116)).toBe('en');
    expect(detector.detectByCoordinates(39, 'abc' as any)).toBe('en');
  });

  // 边缘情况
  it('恰好在范围外的坐标应返回 en', () => {
    expect(detector.detectByCoordinates(3.85, 73.5)).toBe('en');
    expect(detector.detectByCoordinates(53.56, 135.05)).toBe('en');
  });

  // 中日重叠区域应优先返回 zh（先判断中国）
  it('中日重叠区域应优先返回 zh', () => {
    expect(detector.detectByCoordinates(30, 130)).toBe('zh');
  });
});
