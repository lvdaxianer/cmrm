/**
 * 适配器注册和导出模块
 * 管理所有可用的工具适配器
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */

import { ToolAdapter, AdapterRegistryInterface } from './types';
import { ClaudeAdapter } from './claude';
import { CodexAdapter } from './codex';

/**
 * 适配器注册表类
 * 管理所有可用的工具适配器，提供获取和注册功能
 *
 * @author lvdaxianerplus
 * @date 2026-05-11
 */
export class AdapterRegistry implements AdapterRegistryInterface {
  /** 适配器存储映射（工具名称 -> 适配器实例） */
  private adapters: Map<string, ToolAdapter> = new Map();

  /**
   * 注册适配器
   *
   * @param adapter - 要注册的适配器实例
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  register(adapter: ToolAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * 获取适配器
   *
   * @param name - 工具名称
   * @return 适配器实例
   * @throws 工具不存在时抛出错误
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  getAdapter(name: string): ToolAdapter {
    const adapter = this.adapters.get(name);
    // 条件：适配器存在
    if (adapter) {
      return adapter;
    }
    // 替代：适配器不存在，抛出异常
    else {
      throw new Error(`Tool adapter not found: ${name}`);
    }
  }

  /**
   * 获取所有适配器
   *
   * @return 所有注册的适配器数组
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  getAllAdapters(): ToolAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * 获取所有工具名称
   *
   * @return 所有注册的工具名称数组
   * @author lvdaxianerplus
   * @date 2026-05-11
   */
  getToolNames(): string[] {
    return Array.from(this.adapters.keys());
  }
}

/** 全局适配器注册表实例 */
export const registry = new AdapterRegistry();

// 导出类型和适配器类
export * from './types';
export { ClaudeAdapter } from './claude';
export { CodexAdapter } from './codex';
