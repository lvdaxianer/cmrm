/**
 * /test 命令输入校验工具
 * 抽离自 test-handler.ts，控制单文件 ≤ 350 行
 *
 * @author lvdaxianerplus
 * @date 2026-05-03
 */

/**
 * 校验菜单索引输入
 * 必须为 [0, optionCount) 之间的整数
 *
 * @param value - 用户输入字符串
 * @param optionCount - 菜单选项总数（含 exit）
 * @return 合法返回 true，否则返回错误提示文案
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function validateMenuIndex(value: string, optionCount: number): string | true {
  const num = parseInt(value, 10);

  // 输入非法：返回提示语
  if (isNaN(num) || num < 0 || num >= optionCount) {
    return `请输入 0-${optionCount - 1} 之间的数字`;
  }
  // 输入合法：放行
  else {
    return true;
  }
}

/**
 * 校验模型选择索引
 * 必须为 [0, cancelIndex] 之间的整数（含 cancelIndex 表示取消）
 *
 * @param value - 用户输入字符串
 * @param cancelIndex - 取消选项的索引
 * @return 合法返回 true，否则返回错误提示
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function validateModelIndex(value: string, cancelIndex: number): string | true {
  const num = parseInt(value, 10);

  // 输入非法
  if (isNaN(num) || num < 0 || num > cancelIndex) {
    return `请输入 0-${cancelIndex} 之间的数字`;
  }
  // 输入合法
  else {
    return true;
  }
}

/**
 * 校验必填字段
 * 去除首尾空白后非空即合法
 *
 * @param value - 用户输入
 * @param fieldName - 字段名（用于错误提示）
 * @return 合法返回 true，否则返回错误提示
 * @author lvdaxianerplus
 * @date 2026-05-03
 */
export function validateRequired(value: string, fieldName: string): string | true {
  // 去除空白后为空：非法
  if (value.trim() === '') {
    return `${fieldName}为必填字段`;
  }
  // 非空：合法
  else {
    return true;
  }
}
