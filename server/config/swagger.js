const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '智能工作助手 API',
      version: '1.0.0',
      description: '智能工作助手应用的完整API文档，包含任务规划、文档分析、会议处理、日程同步和微信集成等功能',
      contact: {
        name: '智能工作助手团队',
        email: 'support@intelligent-work-assistant.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: '开发服务器'
      },
      {
        url: 'https://api.intelligent-work-assistant.com',
        description: '生产服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            id: {
              type: 'string',
              description: '用户唯一标识符'
            },
            username: {
              type: 'string',
              description: '用户名',
              minLength: 3,
              maxLength: 20
            },
            email: {
              type: 'string',
              format: 'email',
              description: '电子邮箱地址'
            },
            profile: {
              type: 'object',
              properties: {
                fullName: { type: 'string', description: '用户全名' },
                position: { type: 'string', description: '职位' },
                avatar: { type: 'string', description: '头像URL' }
              }
            },
            wechatBinding: {
              type: 'object',
              properties: {
                isVerified: { type: 'boolean', description: '是否已验证' },
                nickname: { type: 'string', description: '微信昵称' },
                avatar: { type: 'string', description: '微信头像' },
                bindTime: { type: 'string', format: 'date-time', description: '绑定时间' }
              }
            },
            settings: {
              type: 'object',
              properties: {
                language: { type: 'string', description: '语言设置' },
                timezone: { type: 'string', description: '时区设置' },
                theme: { type: 'string', description: '主题设置' },
                notifications: {
                  type: 'object',
                  properties: {
                    email: { type: 'boolean', description: '邮件通知' },
                    wechat: { type: 'boolean', description: '微信通知' },
                    system: { type: 'boolean', description: '系统通知' }
                  }
                }
              }
            }
          }
        },
        Task: {
          type: 'object',
          required: ['title', 'description'],
          properties: {
            id: { type: 'string', description: '任务ID' },
            title: { type: 'string', description: '任务标题' },
            description: { type: 'string', description: '任务描述' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: '任务优先级'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
              description: '任务状态'
            },
            assignee: { type: 'string', description: '任务分配者ID' },
            dueDate: { type: 'string', format: 'date-time', description: '截止时间' },
            tags: { type: 'array', items: { type: 'string' }, description: '任务标签' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
            updatedAt: { type: 'string', format: 'date-time', description: '更新时间' }
          }
        },
        Meeting: {
          type: 'object',
          required: ['title', 'startTime'],
          properties: {
            id: { type: 'string', description: '会议ID' },
            title: { type: 'string', description: '会议标题' },
            description: { type: 'string', description: '会议描述' },
            startTime: { type: 'string', format: 'date-time', description: '开始时间' },
            endTime: { type: 'string', format: 'date-time', description: '结束时间' },
            location: { type: 'string', description: '会议地点' },
            attendees: { type: 'array', items: { type: 'string' }, description: '参会者ID列表' },
            audioFile: { type: 'string', description: '音频文件路径' },
            transcript: { type: 'string', description: '会议转录文本' },
            actionItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  task: { type: 'string', description: '行动项内容' },
                  assignee: { type: 'string', description: '负责人' },
                  dueDate: { type: 'string', format: 'date-time', description: '截止时间' }
                }
              }
            }
          }
        },
        Document: {
          type: 'object',
          required: ['title', 'filePath'],
          properties: {
            id: { type: 'string', description: '文档ID' },
            title: { type: 'string', description: '文档标题' },
            description: { type: 'string', description: '文档描述' },
            filePath: { type: 'string', description: '文件路径' },
            fileType: { type: 'string', description: '文件类型' },
            fileSize: { type: 'number', description: '文件大小（字节）' },
            tags: { type: 'array', items: { type: 'string' }, description: '文档标签' },
            analysis: {
              type: 'object',
              properties: {
                summary: { type: 'string', description: '文档摘要' },
                keyPoints: { type: 'array', items: { type: 'string' }, description: '关键要点' },
                keywords: { type: 'array', items: { type: 'string' }, description: '关键词' }
              }
            },
            uploadedBy: { type: 'string', description: '上传用户ID' },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' }
          }
        },
        Calendar: {
          type: 'object',
          required: ['title', 'startDate'],
          properties: {
            id: { type: 'string', description: '日程ID' },
            title: { type: 'string', description: '事件标题' },
            description: { type: 'string', description: '事件描述' },
            startDate: { type: 'string', format: 'date-time', description: '开始时间' },
            endDate: { type: 'string', format: 'date-time', description: '结束时间' },
            location: { type: 'string', description: '地点' },
            attendees: { type: 'array', items: { type: 'string' }, description: '参与者' },
            type: {
              type: 'string',
              enum: ['meeting', 'task', 'reminder', 'event'],
              description: '事件类型'
            },
            source: {
              type: 'string',
              enum: ['manual', 'google', 'outlook', 'wechat'],
              description: '事件来源'
            },
            isRecurring: { type: 'boolean', description: '是否重复' },
            recurrenceRule: { type: 'string', description: '重复规则' }
          }
        },
        Notification: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            id: { type: 'string', description: '通知ID' },
            title: { type: 'string', description: '通知标题' },
            content: { type: 'string', description: '通知内容' },
            type: {
              type: 'string',
              enum: ['info', 'warning', 'error', 'success'],
              description: '通知类型'
            },
            status: {
              type: 'string',
              enum: ['pending', 'sent', 'failed', 'expired'],
              description: '通知状态'
            },
            channels: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['web', 'wechat', 'email']
              },
              description: '通知渠道'
            },
            scheduledFor: { type: 'string', format: 'date-time', description: '计划发送时间' },
            sentAt: { type: 'string', format: 'date-time', description: '实际发送时间' },
            readAt: { type: 'string', format: 'date-time', description: '阅读时间' },
            retryCount: { type: 'number', description: '重试次数' }
          }
        },
        WechatBinding: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '绑定ID' },
            userId: { type: 'string', description: '用户ID' },
            wechatOpenId: { type: 'string', description: '微信OpenID' },
            bindCode: { type: 'string', description: '绑定码' },
            isVerified: { type: 'boolean', description: '是否已验证' },
            nickname: { type: 'string', description: '微信昵称' },
            avatar: { type: 'string', description: '微信头像' },
            bindTime: { type: 'string', format: 'date-time', description: '绑定时间' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: '错误消息' },
            code: { type: 'string', description: '错误代码' },
            details: { type: 'string', description: '详细信息' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            message: { type: 'string', description: '成功消息' },
            data: { type: 'object', description: '返回数据' }
          }
        },
        Comment: {
          type: 'object',
          required: ['content'],
          properties: {
            id: { type: 'string', description: '评论ID' },
            content: { type: 'string', description: '评论内容' },
            author: { 
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                avatar: { type: 'string' }
              },
              description: '作者信息' 
            },
            attachments: {
              type: 'array',
              items: { type: 'string' },
              description: '附件文件ID列表'
            },
            createdAt: { type: 'string', format: 'date-time', description: '创建时间' },
            updatedAt: { type: 'string', format: 'date-time', description: '更新时间' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', description: '当前页码' },
            limit: { type: 'integer', description: '每页数量' },
            total: { type: 'integer', description: '总记录数' },
            pages: { type: 'integer', description: '总页数' },
            hasNext: { type: 'boolean', description: '是否有下一页' },
            hasPrev: { type: 'boolean', description: '是否有上一页' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions: {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  }
};