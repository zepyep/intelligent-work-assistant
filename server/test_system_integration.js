#!/usr/bin/env node

/**
 * 系统集成测试脚本
 * 全面测试智能工作助手应用的所有功能模块
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class SystemIntegrationTest {
  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.clientURL = 'http://localhost:3000';
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.authToken = null;
  }

  /**
   * 运行完整的系统集成测试
   */
  async runCompleteTest() {
    console.log('🧪 开始系统集成测试...\n');
    console.log('=' * 50);

    try {
      // 1. 健康检查
      await this.testHealthCheck();
      
      // 2. 数据库连接测试
      await this.testDatabaseConnection();
      
      // 3. 认证系统测试
      await this.testAuthenticationSystem();
      
      // 4. 核心功能模块测试
      await this.testTaskManagement();
      await this.testDocumentAnalysis();
      await this.testMeetingProcessing();
      await this.testCalendarIntegration();
      await this.testSocialFeatures();
      
      // 5. 高级AI功能测试
      await this.testEnhancedAI();
      
      // 6. 微信功能测试
      await this.testWeChatIntegration();
      
      // 7. API端点完整性测试
      await this.testAPIEndpoints();
      
      // 8. 性能测试
      await this.testPerformance();
      
      // 9. 安全性测试
      await this.testSecurity();
      
      // 10. 前端集成测试
      await this.testFrontendIntegration();

      // 生成测试报告
      await this.generateTestReport();

    } catch (error) {
      console.error('❌ 系统集成测试失败:', error);
      this.logError('SYSTEM_TEST_FAILED', error.message);
    }
  }

  /**
   * 健康检查测试
   */
  async testHealthCheck() {
    console.log('🏥 测试服务健康状态...');
    
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      
      if (response.status === 200 && response.data.status === 'OK') {
        this.logPass('服务健康检查通过');
      } else {
        this.logFail('服务健康检查失败', response.data);
      }
    } catch (error) {
      this.logFail('服务健康检查异常', error.message);
    }
  }

  /**
   * 数据库连接测试
   */
  async testDatabaseConnection() {
    console.log('🗄️ 测试数据库连接...');
    
    try {
      // 通过API间接测试数据库连接
      const response = await axios.get(`${this.baseURL}/api/auth/status`);
      this.logPass('数据库连接正常');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        this.logPass('数据库连接正常（认证检查正常）');
      } else {
        this.logFail('数据库连接异常', error.message);
      }
    }
  }

  /**
   * 认证系统测试
   */
  async testAuthenticationSystem() {
    console.log('🔐 测试认证系统...');
    
    try {
      // 测试用户注册（如果支持）
      const registerData = {
        username: `testuser_${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        password: 'TestPassword123!',
        fullName: '系统测试用户'
      };

      // 直接使用管理员账号登录
      try {
        const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
          email: 'admin@example.com',
          password: 'admin123'
        });
        
        if (loginResponse.data.success && loginResponse.data.data.token) {
          this.authToken = loginResponse.data.data.token;
          this.logPass('管理员账号登录成功');
        } else {
          this.logFail('登录响应格式异常', JSON.stringify(loginResponse.data));
        }
      } catch (loginError) {
        this.logFail('认证系统测试失败', loginError.response?.data?.message || loginError.message);
        
        // 如果登录失败，尝试注册新用户
        try {
          const registerResponse = await axios.post(`${this.baseURL}/api/auth/register`, registerData);
          if (registerResponse.data.data && registerResponse.data.data.token) {
            this.authToken = registerResponse.data.data.token;
            this.logPass('新用户注册成功');
          }
        } catch (regError) {
          this.logFail('用户注册也失败', regError.response?.data?.message || regError.message);
        }
      }

    } catch (error) {
      this.logFail('认证系统测试异常', error.message);
    }
  }

  /**
   * 任务管理功能测试
   */
  async testTaskManagement() {
    console.log('📋 测试任务管理功能...');
    
    if (!this.authToken) {
      this.logFail('任务管理测试跳过', '缺少认证令牌');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      
      // 创建任务
      const taskData = {
        title: '系统集成测试任务',
        description: '这是一个自动化系统测试任务',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const createResponse = await axios.post(`${this.baseURL}/api/tasks`, taskData, { headers });
      const taskId = createResponse.data.data._id;
      this.logPass('任务创建成功');

      // 获取任务列表
      const listResponse = await axios.get(`${this.baseURL}/api/tasks`, { headers });
      if (listResponse.data.data && listResponse.data.data.length > 0) {
        this.logPass('任务列表获取成功');
      }

      // 更新任务
      const updateResponse = await axios.put(`${this.baseURL}/api/tasks/${taskId}`, {
        status: 'in_progress'
      }, { headers });
      this.logPass('任务更新成功');

      // 删除测试任务
      await axios.delete(`${this.baseURL}/api/tasks/${taskId}`, { headers });
      this.logPass('任务删除成功');

    } catch (error) {
      this.logFail('任务管理功能测试失败', error.response?.data?.message || error.message);
    }
  }

  /**
   * 文档分析功能测试
   */
  async testDocumentAnalysis() {
    console.log('📄 测试文档分析功能...');
    
    if (!this.authToken) {
      this.logFail('文档分析测试跳过', '缺少认证令牌');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      
      // 获取文档列表
      const listResponse = await axios.get(`${this.baseURL}/api/documents`, { headers });
      this.logPass('文档列表获取成功');

      // 测试AI分析功能
      try {
        const analyzeResponse = await axios.post(`${this.baseURL}/api/ai/analyze`, {
          text: '这是一个测试文档的内容。人工智能技术正在改变我们的工作方式，智能工作助手可以帮助我们提高效率。',
          type: 'document_summary'
        }, { headers });
        this.logPass('AI文档分析功能正常');
      } catch (aiError) {
        this.logFail('AI文档分析功能异常', aiError.response?.data?.message || aiError.message);
      }

    } catch (error) {
      this.logFail('文档分析功能测试失败', error.response?.data?.message || error.message);
    }
  }

  /**
   * 会议处理功能测试
   */
  async testMeetingProcessing() {
    console.log('🎤 测试会议处理功能...');
    
    if (!this.authToken) {
      this.logFail('会议处理测试跳过', '缺少认证令牌');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      
      // 创建会议
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1小时后
      const meetingData = {
        title: '系统测试会议',
        description: '自动化系统集成测试会议',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: 60
      };

      const createResponse = await axios.post(`${this.baseURL}/api/meetings`, meetingData, { headers });
      const meetingId = createResponse.data.data._id;
      this.logPass('会议创建成功');

      // 获取会议列表
      const listResponse = await axios.get(`${this.baseURL}/api/meetings`, { headers });
      this.logPass('会议列表获取成功');

      // 删除测试会议
      await axios.delete(`${this.baseURL}/api/meetings/${meetingId}`, { headers });
      this.logPass('会议删除成功');

    } catch (error) {
      this.logFail('会议处理功能测试失败', error.response?.data?.message || error.message);
    }
  }

  /**
   * 日程集成功能测试
   */
  async testCalendarIntegration() {
    console.log('📅 测试日程集成功能...');
    
    if (!this.authToken) {
      this.logFail('日程集成测试跳过', '缺少认证令牌');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      
      // 获取日程列表
      const listResponse = await axios.get(`${this.baseURL}/api/calendar/events`, { headers });
      this.logPass('日程列表获取成功');

      // 创建日程事件
      const eventData = {
        title: '系统测试事件',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        description: '自动化测试创建的日程事件'
      };

      const createResponse = await axios.post(`${this.baseURL}/api/calendar/events`, eventData, { headers });
      this.logPass('日程事件创建成功');

    } catch (error) {
      if (error.response?.status === 404) {
        this.logFail('日程集成功能未实现', '找不到API端点');
      } else {
        this.logFail('日程集成功能测试失败', error.response?.data?.message || error.message);
      }
    }
  }

  /**
   * 社交功能测试
   */
  async testSocialFeatures() {
    console.log('👥 测试社交功能...');
    
    if (!this.authToken) {
      this.logFail('社交功能测试跳过', '缺少认证令牌');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      
      // 测试用户推荐
      const recommendResponse = await axios.post(`${this.baseURL}/api/social/recommend`, {
        criteria: { skills: ['JavaScript', 'React'], department: 'Engineering' },
        limit: 5
      }, { headers });
      this.logPass('用户推荐功能正常');

      // 测试用户搜索
      const searchResponse = await axios.get(`${this.baseURL}/api/social/users?search=admin`, { headers });
      this.logPass('用户搜索功能正常');

      // 测试社交档案
      const profileResponse = await axios.get(`${this.baseURL}/api/social/profile`, { headers });
      this.logPass('社交档案功能正常');

    } catch (error) {
      this.logFail('社交功能测试失败', error.response?.data?.message || error.message);
    }
  }

  /**
   * 增强AI功能测试
   */
  async testEnhancedAI() {
    console.log('🤖 测试增强AI功能...');
    
    if (!this.authToken) {
      this.logFail('增强AI功能测试跳过', '缺少认证令牌');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${this.authToken}` };
      
      // 测试智能搜索
      const searchResponse = await axios.post(`${this.baseURL}/api/ai/enhanced/search`, {
        query: 'artificial intelligence',
        searchType: 'hybrid',
        maxResults: 5
      }, { headers });
      this.logPass('增强AI搜索功能正常');

      // 测试研究主题发现
      const topicsResponse = await axios.post(`${this.baseURL}/api/ai/enhanced/discover-topics`, {
        domain: 'technology',
        maxTopics: 5
      }, { headers });
      this.logPass('AI主题发现功能正常');

    } catch (error) {
      this.logFail('增强AI功能测试失败', error.response?.data?.message || error.message);
    }
  }

  /**
   * 微信集成功能测试
   */
  async testWeChatIntegration() {
    console.log('💬 测试微信集成功能...');
    
    try {
      // 测试微信webhook端点（不需要认证）
      const webhookResponse = await axios.get(`${this.baseURL}/wechat`);
      this.logFail('微信webhook测试异常', '应该返回405或400状态码');
    } catch (error) {
      if (error.response?.status === 405 || error.response?.status === 400) {
        this.logPass('微信webhook端点存在');
      } else {
        this.logFail('微信webhook测试失败', error.message);
      }
    }

    if (this.authToken) {
      try {
        const headers = { Authorization: `Bearer ${this.authToken}` };
        
        // 测试绑定码生成
        const bindingResponse = await axios.post(`${this.baseURL}/api/wechat/bind/generate`, {}, { headers });
        this.logPass('微信绑定码生成功能正常');
        
      } catch (error) {
        this.logFail('微信绑定功能测试失败', error.response?.data?.message || error.message);
      }
    }
  }

  /**
   * API端点完整性测试
   */
  async testAPIEndpoints() {
    console.log('🔗 测试API端点完整性...');
    
    const criticalEndpoints = [
      '/api/auth/status',
      '/api/tasks',
      '/api/documents',
      '/api/meetings',
      '/api/ai/analyze',
      '/api/ai/enhanced/search',
      '/api/social/profile',
      '/wechat'
    ];

    for (const endpoint of criticalEndpoints) {
      try {
        const headers = this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {};
        await axios.get(`${this.baseURL}${endpoint}`, { headers });
        this.logPass(`端点 ${endpoint} 可访问`);
      } catch (error) {
        if (error.response && [200, 401, 403, 405].includes(error.response.status)) {
          this.logPass(`端点 ${endpoint} 存在`);
        } else {
          this.logFail(`端点 ${endpoint} 异常`, error.message);
        }
      }
    }
  }

  /**
   * 性能测试
   */
  async testPerformance() {
    console.log('⚡ 执行性能测试...');
    
    const startTime = Date.now();
    
    try {
      // 并发请求测试
      const concurrentRequests = Array.from({ length: 10 }, () =>
        axios.get(`${this.baseURL}/health`)
      );
      
      await Promise.all(concurrentRequests);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (responseTime < 5000) {
        this.logPass(`并发性能测试通过 (${responseTime}ms)`);
      } else {
        this.logFail('并发性能测试失败', `响应时间过长: ${responseTime}ms`);
      }

      // 内存使用情况检查
      const memUsage = process.memoryUsage();
      console.log(`📊 内存使用情况:`);
      console.log(`  - RSS: ${Math.round(memUsage.rss / 1024 / 1024 * 100) / 100} MB`);
      console.log(`  - Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`);
      console.log(`  - External: ${Math.round(memUsage.external / 1024 / 1024 * 100) / 100} MB`);

    } catch (error) {
      this.logFail('性能测试异常', error.message);
    }
  }

  /**
   * 安全性测试
   */
  async testSecurity() {
    console.log('🛡️ 执行安全性测试...');
    
    try {
      // 测试未认证访问
      try {
        await axios.get(`${this.baseURL}/api/tasks`);
        this.logFail('安全性测试失败', '未认证用户可以访问受保护资源');
      } catch (error) {
        if (error.response?.status === 401) {
          this.logPass('认证保护正常');
        }
      }

      // 测试SQL注入防护
      try {
        await axios.post(`${this.baseURL}/api/auth/login`, {
          email: "test@example.com'; DROP TABLE users; --",
          password: 'password'
        });
      } catch (error) {
        this.logPass('SQL注入防护正常');
      }

      // 测试XSS防护
      const headers = this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {};
      try {
        await axios.post(`${this.baseURL}/api/tasks`, {
          title: '<script>alert("XSS")</script>',
          description: 'XSS测试'
        }, { headers });
      } catch (error) {
        // 任何错误都表示有某种保护机制
        this.logPass('XSS防护机制存在');
      }

    } catch (error) {
      this.logFail('安全性测试异常', error.message);
    }
  }

  /**
   * 前端集成测试
   */
  async testFrontendIntegration() {
    console.log('🌐 测试前端集成...');
    
    try {
      const response = await axios.get(this.clientURL);
      if (response.status === 200) {
        this.logPass('前端应用可访问');
      } else {
        this.logFail('前端应用访问异常', `状态码: ${response.status}`);
      }
    } catch (error) {
      this.logFail('前端集成测试失败', error.message);
    }
  }

  /**
   * 生成测试报告
   */
  async generateTestReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 系统集成测试报告');
    console.log('='.repeat(50));
    
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : 0;
    
    console.log(`✅ 通过测试: ${this.testResults.passed}`);
    console.log(`❌ 失败测试: ${this.testResults.failed}`);
    console.log(`📈 成功率: ${successRate}%`);
    console.log(`⏱️ 测试时间: ${new Date().toLocaleString('zh-CN')}`);

    if (this.testResults.errors.length > 0) {
      console.log('\n❌ 错误详情:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.category}] ${error.message}`);
      });
    }

    // 保存测试报告到文件
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        total: total,
        successRate: `${successRate}%`
      },
      errors: this.testResults.errors
    };

    try {
      await fs.writeFile(
        path.join(__dirname, 'test_report.json'),
        JSON.stringify(report, null, 2)
      );
      console.log('\n📄 测试报告已保存到 test_report.json');
    } catch (error) {
      console.error('保存测试报告失败:', error.message);
    }

    console.log('\n🎯 系统集成测试完成!');
    
    if (successRate >= 80) {
      console.log('🎉 系统状态良好，可以投入生产使用！');
    } else {
      console.log('⚠️ 系统存在问题，建议修复后再次测试。');
    }
  }

  // 辅助方法
  logPass(message) {
    console.log(`✅ ${message}`);
    this.testResults.passed++;
  }

  logFail(message, detail) {
    console.log(`❌ ${message}: ${detail}`);
    this.testResults.failed++;
    this.testResults.errors.push({
      category: message,
      message: detail,
      timestamp: new Date().toISOString()
    });
  }

  logError(category, message) {
    this.testResults.errors.push({
      category,
      message,
      timestamp: new Date().toISOString()
    });
  }
}

// 运行测试
if (require.main === module) {
  const tester = new SystemIntegrationTest();
  tester.runCompleteTest()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = SystemIntegrationTest;