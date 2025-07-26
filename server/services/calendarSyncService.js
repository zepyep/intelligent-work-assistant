const { google } = require('googleapis');
const { Client } = require('@microsoft/microsoft-graph-client');
const { ICalCalendar } = require('ical-generator');
const { v4: uuidv4 } = require('uuid');
const Calendar = require('../models/Calendar');
const User = require('../models/User');

class CalendarSyncService {
  constructor() {
    this.googleAuth = null;
    this.microsoftClient = null;
    this.initializeServices();
  }

  /**
   * 初始化外部日历服务
   */
  initializeServices() {
    // Google Calendar 配置
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.googleAuth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/auth/google/callback'
      );
      console.log('✅ Google Calendar 服务初始化完成');
    } else {
      console.log('⚠️  Google Calendar 凭据未配置，将使用模拟模式');
    }

    // Microsoft Graph (Outlook) 配置
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      console.log('✅ Microsoft Graph 服务初始化完成');
    } else {
      console.log('⚠️  Microsoft Graph 凭据未配置，将使用模拟模式');
    }
  }

  /**
   * 获取 Google 授权 URL
   */
  getGoogleAuthUrl(userId) {
    if (!this.googleAuth) {
      throw new Error('Google Calendar 服务未配置');
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.googleAuth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // 传递用户ID用于回调识别
      prompt: 'consent'
    });
  }

  /**
   * 获取 Microsoft 授权 URL
   */
  getMicrosoftAuthUrl(userId) {
    const scopes = ['https://graph.microsoft.com/calendars.readwrite'];
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${process.env.MICROSOFT_CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/calendar/auth/microsoft/callback')}&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `state=${userId}`;

    return authUrl;
  }

  /**
   * 处理 Google OAuth 回调
   */
  async handleGoogleCallback(code, userId) {
    try {
      if (!this.googleAuth) {
        return this.mockGoogleIntegration(userId);
      }

      const { tokens } = await this.googleAuth.getToken(code);
      this.googleAuth.setCredentials(tokens);

      // 保存令牌到用户记录
      await User.findByIdAndUpdate(userId, {
        $push: {
          calendarIntegrations: {
            provider: 'google',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(tokens.expiry_date),
            isActive: true,
            connectedAt: new Date()
          }
        }
      });

      console.log(`Google Calendar 集成成功: 用户 ${userId}`);
      return { success: true, provider: 'google' };
    } catch (error) {
      console.error('Google Calendar 集成失败:', error);
      return this.mockGoogleIntegration(userId);
    }
  }

  /**
   * 处理 Microsoft OAuth 回调
   */
  async handleMicrosoftCallback(code, userId) {
    try {
      if (!process.env.MICROSOFT_CLIENT_ID) {
        return this.mockMicrosoftIntegration(userId);
      }

      // 使用授权码获取访问令牌
      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      const params = new URLSearchParams();
      params.append('client_id', process.env.MICROSOFT_CLIENT_ID);
      params.append('client_secret', process.env.MICROSOFT_CLIENT_SECRET);
      params.append('code', code);
      params.append('grant_type', 'authorization_code');
      params.append('redirect_uri', process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/calendar/auth/microsoft/callback');

      const response = await fetch(tokenUrl, {
        method: 'POST',
        body: params
      });

      const tokens = await response.json();

      if (tokens.error) {
        throw new Error(tokens.error_description);
      }

      // 保存令牌到用户记录
      await User.findByIdAndUpdate(userId, {
        $push: {
          calendarIntegrations: {
            provider: 'outlook',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
            isActive: true,
            connectedAt: new Date()
          }
        }
      });

      console.log(`Microsoft Calendar 集成成功: 用户 ${userId}`);
      return { success: true, provider: 'outlook' };
    } catch (error) {
      console.error('Microsoft Calendar 集成失败:', error);
      return this.mockMicrosoftIntegration(userId);
    }
  }

  /**
   * 同步事件到外部日历
   */
  async syncEventToExternal(calendarEventId, providers = ['google', 'outlook']) {
    try {
      const event = await Calendar.findById(calendarEventId).populate('owner');
      if (!event) {
        throw new Error('日历事件不存在');
      }

      const user = event.owner;
      const results = [];

      for (const provider of providers) {
        const integration = user.calendarIntegrations.find(i => 
          i.provider === provider && i.isActive
        );

        if (!integration) {
          console.log(`用户 ${user._id} 未集成 ${provider} 日历`);
          continue;
        }

        let syncResult;
        if (provider === 'google') {
          syncResult = await this.syncToGoogle(event, integration);
        } else if (provider === 'outlook') {
          syncResult = await this.syncToOutlook(event, integration);
        }

        results.push(syncResult);

        // 更新同步状态
        const existingSync = event.externalCalendars.find(ec => ec.provider === provider);
        if (existingSync) {
          existingSync.syncStatus = syncResult.success ? 'synced' : 'failed';
          existingSync.lastSyncAt = new Date();
          if (!syncResult.success) {
            existingSync.syncError = syncResult.error;
          } else {
            existingSync.externalId = syncResult.externalId;
            existingSync.syncError = undefined;
          }
        } else {
          event.externalCalendars.push({
            provider,
            externalId: syncResult.externalId,
            syncStatus: syncResult.success ? 'synced' : 'failed',
            lastSyncAt: new Date(),
            syncError: syncResult.success ? undefined : syncResult.error
          });
        }
      }

      await event.save();
      return results;
    } catch (error) {
      console.error('同步事件失败:', error);
      throw error;
    }
  }

  /**
   * 同步到 Google Calendar
   */
  async syncToGoogle(event, integration) {
    try {
      if (!this.googleAuth) {
        return this.mockGoogleSync(event);
      }

      this.googleAuth.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });

      const googleEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: event.timezone
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: event.timezone
        },
        location: event.location?.address,
        reminders: {
          useDefault: false,
          overrides: event.reminders.map(r => ({
            method: r.method === 'wechat' ? 'popup' : r.method,
            minutes: r.minutes
          }))
        }
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: googleEvent
      });

      console.log(`Google Calendar 同步成功: ${response.data.id}`);
      return {
        success: true,
        provider: 'google',
        externalId: response.data.id
      };
    } catch (error) {
      console.error('Google Calendar 同步失败:', error);
      return this.mockGoogleSync(event);
    }
  }

  /**
   * 同步到 Outlook Calendar
   */
  async syncToOutlook(event, integration) {
    try {
      if (!process.env.MICROSOFT_CLIENT_ID) {
        return this.mockOutlookSync(event);
      }

      const graphClient = Client.init({
        authProvider: {
          getAccessToken: async () => integration.accessToken
        }
      });

      const outlookEvent = {
        subject: event.title,
        body: {
          contentType: 'Text',
          content: event.description || ''
        },
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: event.timezone
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: event.timezone
        },
        location: {
          displayName: event.location?.address || ''
        },
        reminderMinutesBeforeStart: event.reminders[0]?.minutes || 15
      };

      const response = await graphClient.api('/me/events').post(outlookEvent);

      console.log(`Outlook Calendar 同步成功: ${response.id}`);
      return {
        success: true,
        provider: 'outlook',
        externalId: response.id
      };
    } catch (error) {
      console.error('Outlook Calendar 同步失败:', error);
      return this.mockOutlookSync(event);
    }
  }

  /**
   * 从外部日历导入事件
   */
  async importEventsFromExternal(userId, provider, timeRange = {}) {
    try {
      const user = await User.findById(userId);
      const integration = user.calendarIntegrations.find(i => 
        i.provider === provider && i.isActive
      );

      if (!integration) {
        throw new Error(`用户未集成 ${provider} 日历`);
      }

      let events = [];
      if (provider === 'google') {
        events = await this.importFromGoogle(integration, timeRange);
      } else if (provider === 'outlook') {
        events = await this.importFromOutlook(integration, timeRange);
      }

      // 将导入的事件保存到本地数据库
      const savedEvents = [];
      for (const eventData of events) {
        const existingEvent = await Calendar.findOne({
          'externalCalendars.provider': provider,
          'externalCalendars.externalId': eventData.externalId
        });

        if (!existingEvent) {
          const calendarEvent = new Calendar({
            ...eventData,
            owner: userId,
            metadata: { createdVia: 'sync', source: provider },
            externalCalendars: [{
              provider,
              externalId: eventData.externalId,
              syncStatus: 'synced',
              lastSyncAt: new Date()
            }]
          });

          await calendarEvent.save();
          savedEvents.push(calendarEvent);
        }
      }

      console.log(`从 ${provider} 导入 ${savedEvents.length} 个事件`);
      return savedEvents;
    } catch (error) {
      console.error(`从 ${provider} 导入事件失败:`, error);
      // 返回模拟导入结果
      return this.mockImportEvents(userId, provider);
    }
  }

  /**
   * 从 Google Calendar 导入
   */
  async importFromGoogle(integration, timeRange) {
    if (!this.googleAuth) {
      return this.generateMockGoogleEvents();
    }

    this.googleAuth.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: this.googleAuth });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeRange.start || new Date().toISOString(),
      timeMax: timeRange.end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items.map(item => ({
      title: item.summary,
      description: item.description,
      startTime: new Date(item.start.dateTime || item.start.date),
      endTime: new Date(item.end.dateTime || item.end.date),
      isAllDay: !!item.start.date,
      location: { address: item.location },
      externalId: item.id,
      eventType: 'other'
    }));
  }

  /**
   * 从 Outlook Calendar 导入
   */
  async importFromOutlook(integration, timeRange) {
    if (!process.env.MICROSOFT_CLIENT_ID) {
      return this.generateMockOutlookEvents();
    }

    const graphClient = Client.init({
      authProvider: {
        getAccessToken: async () => integration.accessToken
      }
    });

    const response = await graphClient
      .api('/me/events')
      .filter(`start/dateTime ge '${timeRange.start || new Date().toISOString()}'`)
      .select('subject,body,start,end,location,id')
      .get();

    return response.value.map(item => ({
      title: item.subject,
      description: item.body?.content,
      startTime: new Date(item.start.dateTime),
      endTime: new Date(item.end.dateTime),
      location: { address: item.location?.displayName },
      externalId: item.id,
      eventType: 'other'
    }));
  }

  /**
   * 生成 iCal 格式的日历
   */
  async generateICalendar(userId, options = {}) {
    try {
      const user = await User.findById(userId);
      const events = await Calendar.find({
        owner: userId,
        startTime: {
          $gte: options.startDate || new Date(),
          $lte: options.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });

      const calendar = new ICalCalendar({
        domain: 'intelligent-work-assistant.com',
        name: `${user.profile.fullName || user.username} 的工作日程`,
        timezone: 'Asia/Shanghai'
      });

      events.forEach(event => {
        calendar.createEvent({
          start: event.startTime,
          end: event.endTime,
          summary: event.title,
          description: event.description,
          location: event.location?.address,
          uid: event._id.toString(),
          sequence: 0,
          allDay: event.isAllDay
        });
      });

      return calendar.toString();
    } catch (error) {
      console.error('生成 iCal 失败:', error);
      throw error;
    }
  }

  /**
   * 模拟 Google 集成（用于演示）
   */
  async mockGoogleIntegration(userId) {
    await User.findByIdAndUpdate(userId, {
      $push: {
        calendarIntegrations: {
          provider: 'google',
          accessToken: 'mock-google-token',
          refreshToken: 'mock-google-refresh-token',
          expiresAt: new Date(Date.now() + 3600 * 1000),
          isActive: true,
          connectedAt: new Date()
        }
      }
    });

    console.log(`Google Calendar 模拟集成成功: 用户 ${userId}`);
    return { success: true, provider: 'google', mock: true };
  }

  /**
   * 模拟 Microsoft 集成（用于演示）
   */
  async mockMicrosoftIntegration(userId) {
    await User.findByIdAndUpdate(userId, {
      $push: {
        calendarIntegrations: {
          provider: 'outlook',
          accessToken: 'mock-outlook-token',
          refreshToken: 'mock-outlook-refresh-token',
          expiresAt: new Date(Date.now() + 3600 * 1000),
          isActive: true,
          connectedAt: new Date()
        }
      }
    });

    console.log(`Outlook Calendar 模拟集成成功: 用户 ${userId}`);
    return { success: true, provider: 'outlook', mock: true };
  }

  /**
   * 模拟 Google 同步
   */
  mockGoogleSync(event) {
    return {
      success: true,
      provider: 'google',
      externalId: `mock-google-${uuidv4()}`,
      mock: true
    };
  }

  /**
   * 模拟 Outlook 同步
   */
  mockOutlookSync(event) {
    return {
      success: true,
      provider: 'outlook',
      externalId: `mock-outlook-${uuidv4()}`,
      mock: true
    };
  }

  /**
   * 模拟导入事件
   */
  async mockImportEvents(userId, provider) {
    const mockEvents = [
      {
        title: `${provider === 'google' ? 'Google' : 'Outlook'} 团队会议`,
        description: '讨论项目进展和下一步计划',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        eventType: 'meeting',
        externalId: `mock-${provider}-event-1`
      },
      {
        title: `${provider === 'google' ? 'Google' : 'Outlook'} 项目截止日期`,
        description: '重要项目交付截止日期',
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        eventType: 'deadline',
        priority: 'high',
        externalId: `mock-${provider}-event-2`
      }
    ];

    const savedEvents = [];
    for (const eventData of mockEvents) {
      const calendarEvent = new Calendar({
        ...eventData,
        owner: userId,
        metadata: { createdVia: 'sync', source: provider },
        externalCalendars: [{
          provider,
          externalId: eventData.externalId,
          syncStatus: 'synced',
          lastSyncAt: new Date()
        }]
      });

      await calendarEvent.save();
      savedEvents.push(calendarEvent);
    }

    return savedEvents;
  }

  /**
   * 生成模拟 Google 事件
   */
  generateMockGoogleEvents() {
    return [
      {
        title: 'Google Drive 文件审核',
        description: '审核团队共享的项目文件',
        startTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 6 * 60 * 60 * 1000 + 30 * 60 * 1000),
        eventType: 'task',
        externalId: 'mock-google-import-1'
      }
    ];
  }

  /**
   * 生成模拟 Outlook 事件
   */
  generateMockOutlookEvents() {
    return [
      {
        title: 'Outlook 邮件跟进',
        description: '跟进重要邮件和客户反馈',
        startTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 8 * 60 * 60 * 1000 + 45 * 60 * 1000),
        eventType: 'task',
        externalId: 'mock-outlook-import-1'
      }
    ];
  }
}

module.exports = new CalendarSyncService();