/**
 * 微信消息模板服务
 * 提供丰富的消息模板和格式化功能
 */

class WechatMessageTemplateService {
  constructor() {
    this.maxTextLength = 2048; // 微信文本消息最大长度
  }

  /**
   * 创建欢迎消息
   * @param {Object} user - 用户对象
   * @param {boolean} isNewUser - 是否新用户
   */
  createWelcomeMessage(user, isNewUser = false) {
    if (isNewUser) {
      return `🎉 **欢迎加入智能工作助手！**\n\n👋 你好 ${user.nickname || '朋友'}！\n\n我是您的专属AI工作助手，可以帮您：\n\n📋 **任务管理**\n• 智能规划工作任务\n• 跟踪项目进度\n• 提醒重要事项\n\n📄 **文档处理**\n• 智能分析文档\n• OCR图片识别\n• 资料智能搜索\n\n🎤 **语音助手**\n• 语音转文字\n• 语音创建任务\n• 智能对话交流\n\n📅 **日程管理**\n• 会议安排提醒\n• 日程自动同步\n• 智能时间规划\n\n💡 **使用提示**\n直接发送文字、语音、图片或文档，我都能理解并帮助您处理！\n\n🚀 现在就开始体验吧！`;
    } else {
      return `👋 **欢迎回来！**\n\n很高兴再次为您服务 ${user.nickname || ''}！\n\n💬 您可以：\n• 发送语音或文字与我对话\n• 上传文档进行分析\n• 查看任务和日程\n• 使用菜单快捷功能\n\n❓ 需要帮助随时告诉我！`;
    }
  }

  /**
   * 创建任务卡片消息
   * @param {Object} task - 任务对象
   * @param {string} action - 操作类型 (created, updated, completed)
   */
  createTaskCard(task, action = 'info') {
    const statusIcons = {
      'pending': '🔄',
      'in_progress': '⚙️', 
      'completed': '✅',
      'overdue': '⚠️'
    };

    const priorityIcons = {
      'urgent': '🔴',
      'high': '🟡',
      'medium': '🟢', 
      'low': '🔵'
    };

    const actionTexts = {
      'created': '✨ **任务已创建**',
      'updated': '📝 **任务已更新**',
      'completed': '🎉 **任务已完成**',
      'info': '📋 **任务详情**'
    };

    const statusIcon = statusIcons[task.status] || '📋';
    const priorityIcon = priorityIcons[task.priority] || '🟢';
    const actionText = actionTexts[action] || '📋 **任务信息**';

    let message = `${actionText}\n\n`;
    message += `${statusIcon} **${task.title}**\n`;
    message += `${priorityIcon} 优先级：${this.translatePriority(task.priority)}\n`;
    message += `📊 状态：${this.translateStatus(task.status)}\n`;

    if (task.description) {
      message += `📝 描述：${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}\n`;
    }

    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const isOverdue = dueDate < now;
      const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      
      message += `📅 截止：${dueDate.toLocaleDateString('zh-CN')}`;
      if (isOverdue) {
        message += ` (已逾期 ${Math.abs(daysDiff)} 天)`;
      } else if (daysDiff <= 3) {
        message += ` (还剩 ${daysDiff} 天)`;
      }
      message += '\n';
    }

    if (task.estimatedHours) {
      message += `⏱️ 预估：${task.estimatedHours} 小时\n`;
    }

    message += `\n🔗 任务ID：${task._id.toString().slice(-6)}`;

    return this.truncateMessage(message);
  }

  /**
   * 创建文档分析结果卡片
   * @param {Object} document - 文档对象
   * @param {Object} analysis - 分析结果
   */
  createDocumentAnalysisCard(document, analysis) {
    let message = `📊 **文档分析完成**\n\n`;
    message += `📄 **${document.originalName}**\n`;
    message += `📏 大小：${this.formatFileSize(document.fileSize)}\n`;
    message += `📅 上传：${new Date(document.uploadDate).toLocaleDateString('zh-CN')}\n\n`;

    if (analysis.basic) {
      const basic = analysis.basic;
      
      if (basic.summary) {
        message += `📝 **内容摘要**\n${basic.summary.substring(0, 200)}${basic.summary.length > 200 ? '...' : ''}\n\n`;
      }

      if (basic.keywords && basic.keywords.length > 0) {
        message += `🔖 **关键词**\n${basic.keywords.slice(0, 6).join(' • ')}\n\n`;
      }

      if (basic.statistics) {
        const stats = basic.statistics;
        message += `📊 **文档统计**\n`;
        message += `• 字符数：${stats.characters || stats.wordCount || 'N/A'}\n`;
        message += `• 段落数：${stats.paragraphs || stats.paragraphCount || 'N/A'}\n\n`;
      }
    }

    if (analysis.semantic && analysis.semantic.sentiment) {
      const sentiment = analysis.semantic.sentiment;
      const sentimentIcon = sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😔' : '😐';
      message += `${sentimentIcon} **情感倾向**：${this.translateSentiment(sentiment)}\n\n`;
    }

    if (analysis.topics && analysis.topics.mainTopics) {
      message += `🎯 **主要主题**\n${analysis.topics.mainTopics.slice(0, 3).join(' • ')}\n\n`;
    }

    message += `⚡ 处理完成：${new Date().toLocaleTimeString('zh-CN')}\n`;
    message += `💻 查看详细报告请访问网页端`;

    return this.truncateMessage(message);
  }

  /**
   * 创建日程提醒卡片
   * @param {Object} event - 日程事件
   * @param {number} minutesUntil - 多少分钟后开始
   */
  createScheduleReminderCard(event, minutesUntil = 0) {
    const timeText = minutesUntil === 0 ? '即将开始' : 
                    minutesUntil < 60 ? `${minutesUntil}分钟后` : 
                    `${Math.floor(minutesUntil / 60)}小时${minutesUntil % 60}分钟后`;

    let message = `⏰ **日程提醒**\n\n`;
    message += `📅 **${event.title}**\n`;
    message += `🕐 时间：${new Date(event.startTime).toLocaleString('zh-CN')}\n`;
    message += `⏱️ ${timeText}开始\n`;

    if (event.location) {
      message += `📍 地点：${event.location}\n`;
    }

    if (event.description) {
      message += `📝 备注：${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n`;
    }

    if (event.participants && event.participants.length > 0) {
      message += `👥 参与者：${event.participants.slice(0, 3).join(', ')}${event.participants.length > 3 ? ' 等' : ''}\n`;
    }

    message += `\n💡 **准备建议**\n`;
    message += `• 提前5分钟到达\n`;
    message += `• 确认设备和资料\n`;
    message += `• 查看相关文档\n`;

    return this.truncateMessage(message);
  }

  /**
   * 创建搜索结果卡片
   * @param {Array} results - 搜索结果
   * @param {string} query - 搜索查询
   */
  createSearchResultsCard(results, query) {
    let message = `🔍 **搜索结果**\n查询："${query}"\n\n`;

    if (results.length === 0) {
      message += `📭 未找到相关内容\n\n💡 **建议**：\n• 尝试不同关键词\n• 检查拼写\n• 使用同义词`;
      return message;
    }

    message += `📊 找到 ${results.length} 项结果\n\n`;

    results.forEach((result, index) => {
      if (index >= 5) return; // 最多显示5个结果
      
      const icon = this.getFileIcon(result.fileType || result.type);
      message += `${index + 1}. ${icon} **${result.title}**\n`;
      
      if (result.snippet) {
        message += `📄 ${result.snippet.substring(0, 50)}...\n`;
      }
      
      message += `💯 相关度：${Math.round((result.score || 0.5) * 100)}%\n`;
      message += `📅 ${new Date(result.date || result.createdAt).toLocaleDateString('zh-CN')}\n\n`;
    });

    if (results.length > 5) {
      message += `📋 还有 ${results.length - 5} 项结果未显示\n`;
    }

    message += `💻 查看完整结果请访问网页端`;

    return this.truncateMessage(message);
  }

  /**
   * 创建智能建议卡片
   * @param {Array} suggestions - 建议列表
   * @param {string} context - 上下文信息
   */
  createSuggestionsCard(suggestions, context = '') {
    let message = `💡 **智能建议**\n`;
    
    if (context) {
      message += `基于：${context}\n\n`;
    } else {
      message += `\n`;
    }

    suggestions.forEach((suggestion, index) => {
      const icon = ['🎯', '⚡', '🚀', '💪', '🔧'][index] || '💡';
      message += `${icon} **${suggestion.title || `建议${index + 1}`}**\n`;
      message += `${suggestion.description || suggestion.content || suggestion}\n\n`;
    });

    message += `🤖 由AI智能生成 • ${new Date().toLocaleTimeString('zh-CN')}`;

    return this.truncateMessage(message);
  }

  /**
   * 创建统计报告卡片
   * @param {Object} stats - 统计数据
   * @param {string} period - 统计周期
   */
  createStatsReportCard(stats, period = '今日') {
    let message = `📊 **${period}工作统计**\n\n`;

    if (stats.tasks) {
      message += `📋 **任务完成**\n`;
      message += `✅ 已完成：${stats.tasks.completed || 0} 个\n`;
      message += `⚙️ 进行中：${stats.tasks.inProgress || 0} 个\n`;
      message += `🔄 待开始：${stats.tasks.pending || 0} 个\n\n`;
    }

    if (stats.documents) {
      message += `📄 **文档处理**\n`;
      message += `📥 新增：${stats.documents.uploaded || 0} 个\n`;
      message += `🔍 分析：${stats.documents.analyzed || 0} 个\n\n`;
    }

    if (stats.meetings) {
      message += `📅 **会议安排**\n`;
      message += `🏁 已完成：${stats.meetings.completed || 0} 个\n`;
      message += `⏰ 即将开始：${stats.meetings.upcoming || 0} 个\n\n`;
    }

    if (stats.efficiency) {
      message += `⚡ **效率指数**\n`;
      message += `🎯 任务完成率：${stats.efficiency.taskCompletionRate || 0}%\n`;
      message += `⏱️ 平均响应时间：${stats.efficiency.averageResponseTime || 'N/A'}\n\n`;
    }

    message += `📈 **趋势分析**\n`;
    message += stats.trend || '保持稳定的工作节奏！';

    return this.truncateMessage(message);
  }

  /**
   * 创建错误提示消息
   * @param {string} error - 错误信息
   * @param {string} action - 操作建议
   */
  createErrorMessage(error, action = '请稍后重试') {
    return `❌ **操作失败**\n\n${error}\n\n💡 **建议**：${action}\n\n🛠️ 如问题持续，请联系管理员`;
  }

  /**
   * 创建帮助菜单
   */
  createHelpMenu() {
    return `❓ **使用帮助**\n\n📋 **任务管理**\n• "创建任务 [描述]" - 快速创建任务\n• "我的任务" - 查看任务列表\n• "完成任务 [ID]" - 标记完成\n\n📄 **文档处理**\n• 直接发送文件 - 自动分析\n• 发送图片 - OCR文字识别\n• "分析文档 [名称]" - 深度分析\n\n🔍 **智能搜索**\n• "搜索 [关键词]" - 查找相关内容\n• "相关资料 [主题]" - 发现相关文档\n\n🎤 **语音助手**\n• 发送语音 - 自动识别并执行\n• 语音创建任务、查询信息\n\n📅 **日程管理**\n• "今日日程" - 查看今天安排\n• "明天日程" - 查看明天计划\n\n💬 **AI对话**\n• 直接提问 - AI智能回答\n• 寻求建议和帮助\n\n🚀 **快捷操作**\n使用底部菜单快速访问常用功能！`;
  }

  /**
   * 创建账号绑定引导
   * @param {string} bindingCode - 绑定码
   */
  createBindingGuide(bindingCode) {
    return `🔗 **账号绑定**\n\n您的绑定码：**${bindingCode}**\n\n📱 **绑定步骤**：\n1. 打开网页端 ${process.env.CLIENT_URL || 'https://app.example.com'}\n2. 登录您的账号\n3. 进入"微信绑定"页面\n4. 输入绑定码：${bindingCode}\n5. 点击"确认绑定"\n\n⏰ **注意事项**：\n• 绑定码5分钟内有效\n• 每次只能绑定一个账号\n• 绑定后即可使用所有功能\n\n❓ 遇到问题？回复"帮助"获取更多信息`;
  }

  // 辅助方法
  truncateMessage(message) {
    if (message.length <= this.maxTextLength) {
      return message;
    }
    
    return message.substring(0, this.maxTextLength - 3) + '...';
  }

  translatePriority(priority) {
    const translations = {
      'urgent': '紧急',
      'high': '高',
      'medium': '中',
      'low': '低'
    };
    return translations[priority] || priority;
  }

  translateStatus(status) {
    const translations = {
      'pending': '待开始',
      'in_progress': '进行中',
      'completed': '已完成',
      'overdue': '已逾期'
    };
    return translations[status] || status;
  }

  translateSentiment(sentiment) {
    const translations = {
      'positive': '积极',
      'negative': '消极',
      'neutral': '中性'
    };
    return translations[sentiment] || sentiment;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(fileType) {
    const icons = {
      'pdf': '📄', 'docx': '📄', 'doc': '📄',
      'xlsx': '📊', 'xls': '📊', 'csv': '📊',
      'pptx': '📈', 'ppt': '📈',
      'txt': '📝', 'md': '📝',
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
      'mp3': '🎵', 'wav': '🎵', 'm4a': '🎵',
      'mp4': '🎬', 'avi': '🎬', 'mov': '🎬'
    };
    return icons[fileType?.toLowerCase()] || '📁';
  }
}

module.exports = new WechatMessageTemplateService();