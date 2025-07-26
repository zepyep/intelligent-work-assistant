const request = require('supertest');
const createApp = require('../../server');
const Task = require('../../models/Task');
const User = require('../../models/User');

const app = createApp();

describe('Tasks Routes', () => {
  let testUser, authToken, adminUser, adminToken;

  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = generateAuthToken(testUser);
    adminUser = await createAdminUser();
    adminToken = generateAuthToken(adminUser);
  });

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'This is a test task description',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000), // Tomorrow
        tags: ['test', 'api']
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.description).toBe(taskData.description);
      expect(response.body.data.priority).toBe(taskData.priority);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.createdBy.toString()).toBe(testUser._id.toString());

      // Verify task was created in database
      const task = await Task.findById(response.body.data._id);
      expect(task).toBeTruthy();
      expect(task.title).toBe(taskData.title);
    });

    it('should create task with default values', async () => {
      const taskData = {
        title: 'Minimal Task',
        description: 'Minimal task description'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.data.priority).toBe('medium'); // Default priority
      expect(response.body.data.status).toBe('pending'); // Default status
      expect(response.body.data.tags).toEqual([]); // Default empty tags
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Task without title'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('title');
    });

    it('should validate priority enum values', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          description: 'Test description',
          priority: 'invalid-priority'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Unauthorized Task',
          description: 'Should not be created'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      // Create test tasks
      await Task.create([
        {
          title: 'High Priority Task',
          description: 'Important task',
          priority: 'high',
          status: 'pending',
          createdBy: testUser._id,
          tags: ['urgent', 'important']
        },
        {
          title: 'Completed Task',
          description: 'This task is done',
          priority: 'medium',
          status: 'completed',
          createdBy: testUser._id,
          tags: ['done']
        },
        {
          title: 'Other User Task',
          description: 'Task by another user',
          priority: 'low',
          status: 'pending',
          createdBy: adminUser._id
        }
      ]);
    });

    it('should get all tasks for authenticated user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2); // Only user's own tasks
      expect(response.body.data[0]).toHaveProperty('title');
      expect(response.body.data[0]).toHaveProperty('status');
      expect(response.body.data[0]).toHaveProperty('priority');
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('completed');
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].priority).toBe('high');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/tasks?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 1);
      expect(response.body.pagination).toHaveProperty('total', 2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks/:id', () => {
    let testTask;

    beforeEach(async () => {
      testTask = await Task.create({
        title: 'Test Task',
        description: 'Test task description',
        priority: 'medium',
        createdBy: testUser._id,
        tags: ['test']
      });
    });

    it('should get task by ID for owner', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testTask._id.toString());
      expect(response.body.data.title).toBe(testTask.title);
    });

    it('should not get task from another user', async () => {
      const otherUserTask = await Task.create({
        title: 'Other User Task',
        description: 'Not accessible',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .get(`/api/tasks/${otherUserTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid task ID format', async () => {
      const response = await request(app)
        .get('/api/tasks/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    let testTask;

    beforeEach(async () => {
      testTask = await Task.create({
        title: 'Original Title',
        description: 'Original description',
        priority: 'medium',
        status: 'pending',
        createdBy: testUser._id
      });
    });

    it('should update task successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
        priority: 'high',
        status: 'in_progress',
        tags: ['updated', 'test']
      };

      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.priority).toBe(updateData.priority);
      expect(response.body.data.status).toBe(updateData.status);

      // Verify update in database
      const updatedTask = await Task.findById(testTask._id);
      expect(updatedTask.title).toBe(updateData.title);
    });

    it('should partially update task', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.title).toBe('Original Title'); // Unchanged
    });

    it('should not update task from another user', async () => {
      const otherUserTask = await Task.create({
        title: 'Other User Task',
        description: 'Not updatable',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .put(`/api/tasks/${otherUserTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Hacked Title' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 'invalid-priority' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    let testTask;

    beforeEach(async () => {
      testTask = await Task.create({
        title: 'Task to Delete',
        description: 'This task will be deleted',
        createdBy: testUser._id
      });
    });

    it('should delete task successfully', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify task was deleted from database
      const deletedTask = await Task.findById(testTask._id);
      expect(deletedTask).toBeNull();
    });

    it('should not delete task from another user', async () => {
      const otherUserTask = await Task.create({
        title: 'Other User Task',
        description: 'Cannot be deleted',
        createdBy: adminUser._id
      });

      const response = await request(app)
        .delete(`/api/tasks/${otherUserTask._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      
      // Task should still exist
      const task = await Task.findById(otherUserTask._id);
      expect(task).toBeTruthy();
    });
  });

  describe('POST /api/tasks/ai-planning', () => {
    let aiServiceSpy;

    beforeEach(() => {
      // Mock AI service
      const path = require('path');
      const aiServicePath = path.resolve(__dirname, '../../services/aiService');
      
      try {
        aiServiceSpy = jest.doMock(aiServicePath, () => ({
          generateTaskPlanning: jest.fn().mockResolvedValue({
            plans: [
              {
                id: 'plan-1',
                title: 'Agile Approach',
                description: 'Rapid development with iterative approach',
                duration: '4-6 weeks',
                phases: [
                  {
                    name: 'Planning',
                    duration: '1 week',
                    tasks: ['Requirements gathering', 'Architecture design']
                  }
                ],
                pros: ['Fast delivery', 'Flexible'],
                cons: ['May lack documentation'],
                estimatedCost: 15000,
                riskLevel: 'medium'
              }
            ]
          })
        }));
      } catch (error) {
        // If aiService doesn't exist, create a simple mock
        jest.mock('../../services/aiService', () => ({
          generateTaskPlanning: jest.fn().mockResolvedValue({
            plans: [
              {
                id: 'plan-1',
                title: 'Agile Approach',
                description: 'Rapid development with iterative approach',
                duration: '4-6 weeks',
                phases: [
                  {
                    name: 'Planning',
                    duration: '1 week',
                    tasks: ['Requirements gathering', 'Architecture design']
                  }
                ],
                pros: ['Fast delivery', 'Flexible'],
                cons: ['May lack documentation'],
                estimatedCost: 15000,
                riskLevel: 'medium'
              }
            ]
          })
        }), { virtual: true });
      }
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    it('should generate AI task planning successfully', async () => {
      const requestData = {
        taskDescription: 'Develop a user management system',
        constraints: {
          deadline: '2024-06-01',
          budget: 20000,
          teamSize: 3
        },
        preferences: {
          methodology: 'agile',
          focus: 'speed'
        }
      };

      const response = await request(app)
        .post('/api/tasks/ai-planning')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plans).toHaveLength(1);
      expect(response.body.data.plans[0]).toHaveProperty('title', 'Agile Approach');
      expect(response.body.data.plans[0]).toHaveProperty('phases');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/tasks/ai-planning')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing taskDescription
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks/stats', () => {
    beforeEach(async () => {
      // Create tasks with different statuses and priorities
      await Task.create([
        {
          title: 'Completed High Priority',
          description: 'Done task',
          priority: 'high',
          status: 'completed',
          createdBy: testUser._id,
          createdAt: new Date()
        },
        {
          title: 'Pending Medium Priority',
          description: 'Pending task',
          priority: 'medium',
          status: 'pending',
          createdBy: testUser._id,
          createdAt: new Date()
        },
        {
          title: 'In Progress Low Priority',
          description: 'Working on it',
          priority: 'low',
          status: 'in_progress',
          createdBy: testUser._id,
          createdAt: new Date()
        }
      ]);
    });

    it('should get task statistics successfully', async () => {
      const response = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTasks', 3);
      expect(response.body.data).toHaveProperty('completedTasks', 1);
      expect(response.body.data).toHaveProperty('pendingTasks', 1);
      expect(response.body.data).toHaveProperty('tasksByStatus');
      expect(response.body.data).toHaveProperty('tasksByPriority');
      expect(response.body.data.tasksByStatus.completed).toBe(1);
      expect(response.body.data.tasksByStatus.pending).toBe(1);
      expect(response.body.data.tasksByStatus.in_progress).toBe(1);
    });

    it('should filter stats by period', async () => {
      const response = await request(app)
        .get('/api/tasks/stats?period=week')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTasks');
    });
  });

  describe('POST /api/tasks/:id/comments', () => {
    let testTask;

    beforeEach(async () => {
      testTask = await Task.create({
        title: 'Task with Comments',
        description: 'Task that will have comments',
        createdBy: testUser._id
      });
    });

    it('should add comment to task successfully', async () => {
      const commentData = {
        content: 'This is a test comment',
        attachments: []
      };

      const response = await request(app)
        .post(`/api/tasks/${testTask._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comment.content).toBe(commentData.content);
      expect(response.body.data.comment.author).toBe(testUser._id.toString());

      // Verify task was updated with comment
      const updatedTask = await Task.findById(testTask._id);
      expect(updatedTask.comments).toHaveLength(1);
      expect(updatedTask.comments[0].content).toBe(commentData.content);
    });

    it('should validate comment content', async () => {
      const response = await request(app)
        .post(`/api/tasks/${testTask._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing content
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not add comment to non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post(`/api/tasks/${fakeId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Comment on fake task' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});