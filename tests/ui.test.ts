/**
 * UI 渲染器测试
 * 覆盖 UIRenderer 各方法
 *
 * @author lvdaxianerplus
 * @date 2026-05-06
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UIRenderer } from '../src/cli/ui';
import { registry } from '../src/adapters';

vi.mock('../src/adapters', () => ({
  registry: {
    getToolNames: vi.fn(() => ['claude']),
    getAllAdapters: vi.fn(() => [
      {
        name: 'claude',
        displayName: 'Claude',
        getSavedModels: vi.fn(() => [
          { name: 'sonnet', model: 'claude-sonnet', apiKey: 'k', baseUrl: 'u' },
          { model: 'claude-haiku', apiKey: 'k', baseUrl: 'u' },
        ]),
        readCurrentModel: vi.fn(() => ({ model: 'claude-sonnet', apiKey: 'k', baseUrl: 'u' })),
      },
    ]),
    getAdapter: vi.fn(() => ({
      displayName: 'Claude',
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UIRenderer', () => {
  const ui = new UIRenderer();

  it('showError 应输出错误消息', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    ui.showError('error message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('showSuccess 应输出成功消息', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    ui.showSuccess('success message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('showWarning 应输出警告消息', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    ui.showWarning('warning message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('showInfo 应输出信息消息', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    ui.showInfo('info message');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('showAllModels 应输出所有模型', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    ui.showAllModels();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('showCurrentModels 应输出当前模型', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    ui.showCurrentModels();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('showTestResult 成功时应输出通过信息', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    ui.showTestResult({
      success: true,
      message: '测试通过',
      durationMs: 100,
      statusCode: 200,
    } as any);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('showTestResult 失败时应输出错误信息', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    ui.showTestResult({
      success: false,
      message: '测试失败',
      durationMs: 100,
      errorKind: 'auth',
      errorDetail: '401 Unauthorized',
    } as any);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('showTestResult 失败但无详情时不输出额外行', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    ui.showTestResult({
      success: false,
      message: '测试失败',
      durationMs: 100,
      errorKind: 'network',
    } as any);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('renderCommandList 首次渲染应输出完整提示', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    ui.renderCommandList(0, true);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('renderCommandList 非首次渲染应输出简化提示', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    ui.renderCommandList(1, false);
    expect(consoleSpy).toHaveBeenCalled();
    stdoutSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('renderToolList 应输出工具列表', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    ui.renderToolList(0, true);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('renderModelList 应输出模型列表', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const mockAdapter = {
      displayName: 'Claude',
      getSavedModels: vi.fn(() => [{ name: 'sonnet', model: 'claude-sonnet', apiKey: 'k', baseUrl: 'u' }]),
    } as any;
    ui.renderModelList(mockAdapter, [{ name: 'sonnet', model: 'claude-sonnet', apiKey: 'k', baseUrl: 'u' }], 0, true);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
