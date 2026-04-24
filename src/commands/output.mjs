/**
 * 输出辅助工具模块
 * 功能：提供命令输出格式化和文件写入功能
 */

// 导入必要的模块
import fs from "node:fs";
import path from "node:path";

/**
 * 创建输出辅助工具
 * @param {object} options - 配置选项
 * @param {string} options.projectRoot - 项目根目录路径
 * @param {object} options.selectionService - 工具选择服务
 * @returns {object} 输出辅助工具对象
 */
export function createOutputHelpers({ projectRoot, selectionService }) {
  /**
   * 获取输出格式
   * @returns {string} 输出格式（json、markdown 或 summary）
   */
  function getOutputFormat() {
    // 如果指定了 --json 标志，返回 json 格式
    if (selectionService.hasFlag("--json")) return "json";
    // 获取 --format 选项值，默认为 json
    const rawFormat = (selectionService.getOptionValues("--format")[0] || "json").toLowerCase();
    // 将 md 转换为 markdown
    if (rawFormat === "md") return "markdown";
    return rawFormat;
  }

  /**
   * 获取输出文件路径
   * @returns {string} 输出文件路径，如果未指定则返回空字符串
   */
  function getOutputPath() {
    return selectionService.getOptionValues("--output")[0] || "";
  }

  /**
   * 写入输出文件
   * @param {string} filePath - 相对文件路径
   * @param {string} content - 文件内容
   * @returns {string} 绝对文件路径
   */
  function writeOutputFile(filePath, content) {
    const absolutePath = path.resolve(projectRoot, filePath);
    // 确保目录存在
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    // 写入文件内容
    fs.writeFileSync(absolutePath, content, "utf8");
    return absolutePath;
  }

  /**
   * 发送命令输出
   * 根据配置将输出内容打印到控制台或写入文件
   * @param {string} content - 输出内容
   */
  function emitCommandOutput(content) {
    const outputPath = getOutputPath();
    // 如果没有指定输出路径，直接打印到控制台
    if (!outputPath) {
      console.log(content);
      return;
    }

    // 写入文件并确保内容以换行符结尾
    const absolutePath = writeOutputFile(outputPath, content.endsWith("\n") ? content : `${content}\n`);
    console.log(`Saved output: ${absolutePath}`);
  }

  return {
    getOutputFormat,
    getOutputPath,
    emitCommandOutput
  };
}
