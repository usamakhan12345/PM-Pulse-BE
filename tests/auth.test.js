const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

describe('Auth API Endpoints', () => {
  beforeAll(async () => {
    // If MongoDB is reachable, connect; otherwise test handles validation schema unit testing
    if (mongoose.connection.readyState === 0) {
      try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jira_slack_clone', {
          serverSelectionTimeoutMS: 2000
        });
      } catch (err) {
        // Mongo offline mode fallback for unit validation tests
      }
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('should reject registration with invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test',
        email: 'invalid-email-address',
        password: '123'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject login with missing credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: '',
        password: ''
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
