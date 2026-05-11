/**
 * 模型模板管理器
 * 负责模板配置文件的读写与热加载
 *
 * 设计要点：
 * - 模板数据优先从 GitHub 远程拉取，实现独立更新
 * - 每次调用 getTemplates() 都重新读取本地文件，实现热更新
 * - 首次启动时异步拉取远程模板，失败则回退到内置默认
 * - 用户自定义模板保存在 ~/.cmrm/templates.json
 *
 * @author lvdaxianerplus
 * @date 2026-05-04
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ModelTemplate, BUILT_IN_TEMPLATES } from './template-data';
import { fetchRemoteTemplateJson } from './template-fetcher';

/**
 * 模板配置文件结构
 */
interface TemplatesConfig {
  /** 配置版本号，用于未来迁移 */
  version: number;
  /** 模板列表 */
  templates: ModelTemplate[];
}

/** 默认配置版本 */
const DEFAULT_VERSION = 1;

/** JSON 缩进空格数 */
const JSON_INDENT = 2;

/** 空数组长度 */
const EMPTY_ARRAY_LENGTH = 0;

/** 配置目录名 */
const CONFIG_DIR_NAME = '.cmrm';

/** 配置文件名 */
const CONFIG_FILE_NAME = 'templates.json';

/**
 * 模型模板管理器
 * 管理 ~/.cmrm/templates.json 的读写，支持热加载与远程拉取
 *
 * @author lvdaxianerplus
 * @date 2026-05-04
 */
export class TemplateManager {
  /** 模板配置文件路径 */
  private readonly templatesPath: string;

  /**
   * 构造函数
   * 初始化模板配置文件路径
   *
   * @author lvdaxianerplus
   * @date 2026-05-04
   */
  constructor() {
    this.templatesPath = path.join(os.homedir(), CONFIG_DIR_NAME, CONFIG_FILE_NAME);
  }

  /**
   * 检查模板配置文件是否存在
   *
   * @return true 表示文件存在
   * @author lvdaxianerplus
   * @date 2026-05-04
   */
  hasTemplatesFile(): boolean {
    return fs.existsSync(this.templatesPath);
  }

  /**
   * 获取模板配置文件路径
   *
   * @return 绝对路径
   * @author lvdaxianerplus
   * @date 2026-05-04
   */
  getTemplatesPath(): string {
    return this.templatesPath;
  }

  /**
   * 热加载模板列表
   * 每次调用都重新读取本地文件，确保修改后立即生效
   *
   * @return 模板数组，文件不存在或解析失败时返回内置默认模板
   * @author lvdaxianerplus
   * @date 2026-05-04
   */
  getTemplates(): ModelTemplate[] {
    // 本地配置文件不存在：直接返回内置默认模板
    if (!this.hasTemplatesFile()) {
      return [...BUILT_IN_TEMPLATES];
    }
    // 配置文件存在：尝试读取并解析
    else {
      return this.parseLocalTemplates();
    }
  }

  /**
   * 读取并解析本地模板配置文件
   * 处理文件读取、JSON 解析与格式校验
   *
   * @return 解析后的模板数组，任何失败均回退到内置默认
   * @author lvdaxianerplus
   * @date 2026-05-04
   */
  private parseLocalTemplates(): ModelTemplate[] {
    try {
      // 读取本地配置文件原始内容
      const raw = fs.readFileSync(this.templatesPath, 'utf-8');
      // 将 JSON 字符串解析为配置对象
      const parsed = JSON.parse(raw) as TemplatesConfig;

      // 校验 templates 字段：必须为数组且非空
      if (Array.isArray(parsed.templates) && parsed.templates.length > EMPTY_ARRAY_LENGTH) {
        // 校验通过：返回文件中的模板列表
        return parsed.templates;
      }
      // 格式异常：templates 不是数组或为空，回退到内置默认
      else {
        return [...BUILT_IN_TEMPLATES];
      }
    }
    // 读取或解析失败：文件损坏、权限不足或 JSON 非法，回退到内置默认
    catch {
      return [...BUILT_IN_TEMPLATES];
    }
  }

  /**
   * 根据 ID 查找模板
   * 每次调用都重新读取文件，保证热更新
   *
   * @param id - 模板唯一标识
   * @return 匹配的模板，未找到返回 undefined
   * @author lvdaxianerplus
   * @date 2026-05-04
   */
  getTemplateById(id: string): ModelTemplate | undefined {
    const templates = this.getTemplates();
    return templates.find((t) => t.id === id);
  }

  /**
   * 从 GitHub 远程拉取最新模板
   * 拉取成功后保存到本地配置文件
   *
   * @return true 表示拉取成功并保存，false 表示失败
   * @author lvdaxianerplus
   * @date 2026-05-04
   */
  async fetchRemoteTemplates(): Promise<boolean> {
    // 发起远程模板拉取请求，获取原始 JSON 字符串
    const json = await fetchRemoteTemplateJson();

    // 拉取失败：网络异常或请求超时
    if (json === undefined) {
      return false;
    }
    // 拉取成功：解析 JSON 并保存到本地
    else {
      return this.parseAndSaveRemoteTemplates(json);
    }
  }

  /**
   * 解析远程模板 JSON 并保存到本地
   * 校验响应体格式，确保 templates 数组有效
   *
   * @param json - 远程获取的 JSON 字符串
   * @return true 表示解析并保存成功，false 表示格式校验失败
   * @author lvdaxianerplus
   * @date 2026-05-04
   */
  private parseAndSaveRemoteTemplates(json: string): boolean {
    try {
      // 解析 JSON 字符串为配置对象
      const parsed = JSON.parse(json) as TemplatesConfig;

      // 校验 templates 字段：必须为数组且非空
      if (!Array.isArray(parsed.templates) || parsed.templates.length === EMPTY_ARRAY_LENGTH) {
        return false;
      }
      // 校验通过：保存到本地配置文件
      else {
        this.saveTemplates(parsed.templates);
        return true;
      }
    }
    // JSON 解析失败：响应体格式非法
    catch {
      return false;
    }
  }

  /**
   * 初始化默认模板到配置文件
   * 优先尝试远程拉取，失败则用内置默认
   *
   * @return 初始化结果：'remote'=远程拉取成功，'builtin'=远程失败回退到内置，'existing'=本地已存在
   * @author lvdaxianerplus
   * @date 2026-05-04
   */
  async initializeDefaults(): Promise<'remote' | 'builtin' | 'existing'> {
    // 本地已存在配置文件：不覆盖，保留用户自定义
    if (this.hasTemplatesFile()) {
      return 'existing';
    }
    // 本地不存在：尝试远程拉取或回退内置
    else {
      return this.fetchOrFallback();
    }
  }

  /**
   * 尝试远程拉取，失败则回退到内置默认
   * 封装远程拉取与回退逻辑，保持 initializeDefaults 的线性可读性
   *
   * @return 'remote' 表示拉取成功，'builtin' 表示回退到内置
   * @author lvdaxianerplus
   * @date 2026-05-04
   */
  private async fetchOrFallback(): Promise<'remote' | 'builtin'> {
    // 发起远程模板拉取请求
    const fetched = await this.fetchRemoteTemplates();

    // 远程拉取成功：模板已自动保存到本地
    if (fetched) {
      return 'remote';
    }
    // 远程拉取失败：使用内置默认模板初始化本地文件
    else {
      this.saveTemplates([...BUILT_IN_TEMPLATES]);
      return 'builtin';
    }
  }

  /**
   * 强制刷新模板（重新从远程拉取并覆盖本地）
   * 用于手动更新模板到最新版本
   *
   * @return true 表示刷新成功，false 表示失败
   * @author lvdaxianerplus
   * @date 2026-05-04
   */
  async refreshTemplates(): Promise<boolean> {
    // 发起远程模板拉取请求
    const fetched = await this.fetchRemoteTemplates();

    // 拉取成功：已自动保存到本地
    if (fetched) {
      return true;
    }
    // 拉取失败：检查本地是否存在兜底配置
    else {
      return this.fallbackIfNoLocal();
    }
  }

  /**
   * 本地无文件时使用内置默认兜底
   * 确保即使远程拉取失败，用户也始终有可用模板
   *
   * @return 始终返回 false（表示刷新未成功）
   * @author lvdaxianerplus
   * @date 2026-05-04
   */
  private fallbackIfNoLocal(): boolean {
    // 本地也无配置文件时：用内置默认兜底
    if (!this.hasTemplatesFile()) {
      this.saveTemplates([...BUILT_IN_TEMPLATES]);
    }
    // 本地已有文件：保留现有配置，仅标记刷新失败
    else {
      // 不执行任何操作，保持现有模板不变
    }

    return false;
  }

  /**
   * 保存模板列表到配置文件
   * 自动创建目录（如果不存在），写入带版本号的 JSON
   *
   * @param templates - 要保存的模板数组
   * @author lvdaxianerplus
   * @date 2026-05-04
   */
  saveTemplates(templates: ModelTemplate[]): void {
    // 获取配置文件所在目录路径
    const dir = path.dirname(this.templatesPath);

    // 目录不存在时递归创建
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // 目录已存在：直接继续写入
    else {
      // 无需创建目录
    }

    // 组装带版本号的配置对象
    const config: TemplatesConfig = {
      version: DEFAULT_VERSION,
      templates,
    };

    // 序列化为格式化的 JSON 并写入文件
    fs.writeFileSync(this.templatesPath, JSON.stringify(config, null, JSON_INDENT), 'utf-8');
  }
}

/**
 * 全局模板管理器实例
 * 单例模式，供各处复用
 */
export const templateManager = new TemplateManager();
