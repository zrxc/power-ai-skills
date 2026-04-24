/**
 * 渲染服务模块
 * 功能：提供模板渲染和占位符替换功能
 */

/**
 * 格式化列表行
 * @param {string[]} lines - 行数组
 * @returns {string} 格式化的列表字符串
 */
function formatBulletLines(lines) {
  return lines.map((line) => `- ${line}`).join("\n");
}

/**
 * 格式化源列表
 * @param {string[]} sources - 源数组
 * @returns {string} 格式化源列表字符串
 */
function formatSourceList(sources) {
  return sources.map((source) => `\`${source}\``).join("、");
}

/**
 * 格式化角色标签
 * @param {string} roleLabel - 角色标签
 * @returns {string} 格式化的角色标签
 */
function formatRoleLabel(roleLabel) {
  return /[A-Za-z]/.test(roleLabel) ? `${roleLabel} ` : roleLabel;
}

function buildConversationCaptureLines() {
  return [
    "Only ask to capture a session summary after a task is truly complete and clearly project-related.",
    "Do not ask for capture during chat, explanations, incomplete work, or low-value one-off edits.",
    "If the user confirms capture, output only one marked summary block using `<<<POWER_AI_SESSION_SUMMARY_V1` and `>>>`.",
    "Do not write `.power-ai/conversations` files directly. Let the wrapper or CLI consume the marked block.",
    "Use `.power-ai/shared/conversation-capture.md` and `.power-ai/references/conversation-capture-contract.md` as the capture policy and schema reference."
  ];
}

/**
 * 创建渲染服务
 * @param {object} options - 配置选项
 * @param {object} options.context - 应用上下文
 * @returns {object} 渲染服务对象
 */
export function createRenderingService({ context }) {
  /**
   * 解析模板定义
   * @param {string|object} templateOrOutput - 模板名称或输出路径
   * @returns {object} 模板定义对象
   */
  function resolveTemplateDefinition(templateOrOutput) {
    if (!templateOrOutput) throw new Error("Missing managed template definition");
    // 如果是字符串，尝试从输出路径映射中查找
    if (typeof templateOrOutput === "string") {
      const resolvedTemplate = context.templateByOutputMap.get(templateOrOutput);
      if (!resolvedTemplate) throw new Error(`Unknown managed template output: ${templateOrOutput}`);
      return resolvedTemplate;
    }
    return templateOrOutput;
  }

  /**
   * 构建执行流程行
   * @param {object} tool - 工具对象
   * @returns {string[]} 执行流程行数组
   */
  function buildExecutionFlowLines(tool) {
    const sharedExecutionFlow = context.toolRegistry.instructionRendering?.sharedExecutionFlow || [];
    const introLines = tool?.instructionLoading?.executionFlowIntro || [];
    return [...introLines, ...sharedExecutionFlow];
  }

  /**
   * 构建读取优先级行
   * @param {object} tool - 工具对象
   * @returns {string[]} 读取优先级行数组
   */
  function buildReadPriorityLines(tool) {
    const instructionLoading = tool?.instructionLoading;
    if (!instructionLoading) return [];

    const primarySources = instructionLoading.primarySources || [];
    const supplementalSources = instructionLoading.supplementalSources || [];
    const primaryLabel = formatSourceList(primarySources);
    const supplementalLabel = formatSourceList(supplementalSources);
    const lines = [];
    const formattedRoleLabel = formatRoleLabel(instructionLoading.roleLabel);

    // 根据主入口类型生成对应的说明
    if (instructionLoading.primarySourceType === "file") {
      lines.push(`${formattedRoleLabel}先读取当前 ${primaryLabel} 作为工具原生入口文件。`);
    } else if (instructionLoading.primarySourceType === "directory") {
      lines.push(`${formattedRoleLabel}先读取 ${primaryLabel} 作为工具原生规则目录。`);
    } else if (instructionLoading.primarySourceType === "mixed") {
      lines.push(`${formattedRoleLabel}先读取 ${primaryLabel} 作为工具原生入口与规则目录。`);
    } else {
      throw new Error(`Unsupported instructionLoading.primarySourceType: ${instructionLoading.primarySourceType}`);
    }

    // 添加补充来源说明
    if (supplementalSources.length > 0) {
      lines.push(`如果项目根目录存在 ${supplementalLabel}，把它作为共享补充规则继续读取，但不覆盖 ${primaryLabel} 已声明的工具级执行流程。`);
    }

    // 添加路由和 skill 读取说明
    lines.push(`然后读取 \`${instructionLoading.routingPath}\` 做 skill 路由，再读取命中的主 skill、辅助 skill 和 \`references/\`。`);

    // 添加项目私有覆盖说明
    let finalLine = `如果 \`${instructionLoading.projectLocalPath}\` 下存在项目私有补充，优先用它覆盖企业公共 skill 的业务细节；如有冲突，优先级按 ${(instructionLoading.conflictPriority || []).join(" > ")} 执行。`;
    if (instructionLoading.overrideNote) finalLine = `${finalLine}${instructionLoading.overrideNote}`;
    lines.push(finalLine);

    return lines;
  }

  /**
   * 渲染管理模板
   * @param {string|object} templateOrOutput - 模板名称或输出路径
   * @param {string} templateContent - 模板内容
   * @returns {string} 渲染后的内容
   */
  function renderManagedTemplate(templateOrOutput, templateContent) {
    const templateDefinition = resolveTemplateDefinition(templateOrOutput);
    const tool = context.registryToolMap.get(templateDefinition.ownerTool);
    let renderedContent = templateContent;
    
    // 占位符渲染器映射
    const placeholderRenderers = new Map([
      [context.executionFlowPlaceholder, () => formatBulletLines(buildExecutionFlowLines(tool))],
      [context.readPriorityPlaceholder, () => formatBulletLines(buildReadPriorityLines(tool))],
      [context.conversationCapturePlaceholder, () => formatBulletLines(buildConversationCaptureLines())]
    ]);

    // 遍历模板定义中的占位符并替换
    for (const placeholderName of templateDefinition.placeholders || []) {
      const placeholderToken = `{{${placeholderName}}}`;
      const renderPlaceholder = placeholderRenderers.get(placeholderToken);
      if (!renderPlaceholder) throw new Error(`Unsupported placeholder ${placeholderToken} in template ${templateDefinition.name}`);
      if (renderedContent.includes(placeholderToken)) renderedContent = renderedContent.replace(placeholderToken, renderPlaceholder());
    }

    return renderedContent;
  }

  return {
    renderManagedTemplate
  };
}
