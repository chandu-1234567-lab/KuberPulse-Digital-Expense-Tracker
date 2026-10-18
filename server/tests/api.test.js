const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const { Transaction } = require('../models/Transaction');
const Budget = require('../models/Budget');

const TEST_DB_URI = 'mongodb://127.0.0.1:27017/digital_expense_tracker_test';

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_secret_key_12345';
  await mongoose.connect(TEST_DB_URI);
  // Clear any previous test artifacts
  await User.deleteMany({});
  await Transaction.deleteMany({});
  await Budget.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await Transaction.deleteMany({});
  await Budget.deleteMany({});
  await mongoose.connection.close();
});

describe('Digital Expense Tracker API Comprehensive Test Suite', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;
  let createdExpenseId;
  let createdIncomeId;
  let createdBudgetId;

  // ================= 1. AUTHENTICATION & VALIDATION =================
  describe('Authentication Endpoints', () => {
    it('should validate registration input (missing required fields)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'invalid-email',
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should register a new user successfully (User 1)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Aarav Sharma',
        email: 'aarav.sharma@example.com',
        password: 'Password@123',
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('Aarav Sharma');
      expect(res.body.user.password).toBeUndefined(); // Password must not leak
      user1Token = res.body.token;
      user1Id = res.body.user._id;
    });

    it('should prevent registering a duplicate email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Duplicate Aarav',
        email: 'aarav.sharma@example.com',
        password: 'Password@123',
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should register User 2 for data isolation testing', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Priya Patel',
        email: 'priya.patel@example.com',
        password: 'Password@456',
      });
      expect(res.statusCode).toBe(201);
      user2Token = res.body.token;
      user2Id = res.body.user._id;
    });

    it('should login User 1 with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'aarav.sharma@example.com',
        password: 'Password@123',
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should fail login with incorrect password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'aarav.sharma@example.com',
        password: 'WrongPassword',
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fetch current authenticated user profile via /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe('aarav.sharma@example.com');
    });

    it('should deny access without bearer token (Unauthorized test)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ================= 2. TRANSACTIONS & EXPENSE/INCOME MANAGEMENT =================
  describe('Transactions & Financial Operations', () => {
    it('should create an expense and store in integer paise', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          type: 'expense',
          amount: 1450.5, // ₹1450.50 -> 145050 paise
          category: 'Groceries',
          description: 'Weekly organic grocery shopping',
          paymentMethod: 'UPI',
          date: '2026-10-15',
          notes: 'Purchased from local supermarket',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.transaction.amountInPaise).toBe(145050);
      expect(res.body.transaction.amount).toBe(1450.5);
      expect(res.body.transaction.category).toBe('Groceries');
      createdExpenseId = res.body.transaction._id;
    });

    it('should validate transaction input (reject invalid category)', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          type: 'expense',
          amount: 500,
          category: 'NonExistentCategoryXYZ',
          description: 'Test invalid',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should create an income transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          type: 'income',
          amount: 75000, // ₹75,000 -> 7500000 paise
          category: 'Salary',
          description: 'Monthly Tech Lead Salary',
          paymentMethod: 'Bank Transfer',
          date: '2026-10-01',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.transaction.amountInPaise).toBe(7500000);
      expect(res.body.transaction.amount).toBe(75000);
      createdIncomeId = res.body.transaction._id;
    });

    it('should calculate correct income, expense, and net balance summary', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.summary.totalIncome).toBe(75000);
      expect(res.body.summary.totalExpenses).toBe(1450.5);
      expect(res.body.summary.netBalance).toBe(73549.5);
      expect(res.body.transactions.length).toBe(2);
    });

    it('should update an existing expense', async () => {
      const res = await request(app)
        .put(`/api/transactions/${createdExpenseId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          type: 'expense',
          amount: 1600.0,
          category: 'Groceries',
          description: 'Weekly organic grocery shopping (updated with fruits)',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.transaction.amountInPaise).toBe(160000);
      expect(res.body.transaction.amount).toBe(1600);
    });

    it('should verify data isolation: User 2 cannot access or view User 1 transactions', async () => {
      // User 2 lists transactions -> should be empty
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.transactions.length).toBe(0);
      expect(res.body.summary.totalIncome).toBe(0);

      // User 2 tries to read User 1's transaction by ID
      const singleRes = await request(app)
        .get(`/api/transactions/${createdExpenseId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(singleRes.statusCode).toBe(404);

      // User 2 tries to delete User 1's transaction
      const deleteRes = await request(app)
        .delete(`/api/transactions/${createdExpenseId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(deleteRes.statusCode).toBe(404);
    });

    it('should export transactions as CSV format', async () => {
      const res = await request(app)
        .get('/api/transactions/export/csv')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Transaction ID,Date,Type,Category');
      expect(res.text).toContain('Salary');
      expect(res.text).toContain('Groceries');
    });

    it('should delete an expense', async () => {
      const res = await request(app)
        .delete(`/api/transactions/${createdExpenseId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion from database
      const checkRes = await request(app)
        .get(`/api/transactions/${createdExpenseId}`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(checkRes.statusCode).toBe(404);
    });
  });

  // ================= 3. BUDGET MANAGEMENT & 80% THRESHOLD ALERTS =================
  describe('Budget Planning and Spending Calculations', () => {
    beforeAll(async () => {
      // Add an expense for Food in October 2026: ₹8,500
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          type: 'expense',
          amount: 8500,
          category: 'Food',
          description: 'Dining out and food delivery',
          date: '2026-10-10',
        });
    });

    it('should create a budget with monthly limit of ₹10,000 for Food in Oct 2026', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          category: 'Food',
          monthlyLimit: 10000, // ₹10,000
          month: 10,
          year: 2026,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.budget.monthlyLimitInPaise).toBe(1000000);
      createdBudgetId = res.body.budget._id;
    });

    it('should trigger warning when spending exceeds 80% (₹8,500 spent of ₹10,000 = 85%)', async () => {
      const res = await request(app)
        .get('/api/budgets?month=10&year=2026')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.budgets.length).toBe(1);
      const foodBudget = res.body.budgets[0];
      expect(foodBudget.category).toBe('Food');
      expect(foodBudget.monthlyLimit).toBe(10000);
      expect(foodBudget.spent).toBe(8500);
      expect(foodBudget.remaining).toBe(1500);
      expect(foodBudget.percentageUsed).toBe(85);
      expect(foodBudget.status).toBe('warning'); // >= 80%
      expect(res.body.summary.warningCount).toBe(1);
    });

    it('should trigger exceeded status when spending exceeds 100%', async () => {
      // Add another ₹2,000 to Food -> Total ₹10,500 spent (105%)
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          type: 'expense',
          amount: 2000,
          category: 'Food',
          description: 'Weekend dinner party',
          date: '2026-10-18',
        });

      const res = await request(app)
        .get('/api/budgets?month=10&year=2026')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      const foodBudget = res.body.budgets[0];
      expect(foodBudget.spent).toBe(10500);
      expect(foodBudget.percentageUsed).toBe(105);
      expect(foodBudget.status).toBe('exceeded'); // >= 100%
      expect(res.body.summary.exceededCount).toBe(1);
    });
  });

  // ================= 4. DASHBOARD AGGREGATIONS =================
  describe('Dashboard Analytics & Summaries', () => {
    it('should return complete dashboard summary statistics', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalIncome).toBeDefined();
      expect(res.body.data.totalExpenses).toBeDefined();
      expect(res.body.data.monthlySavings).toBeDefined();
      expect(res.body.data.recentTransactions).toBeDefined();
      expect(Array.isArray(res.body.data.recentTransactions)).toBe(true);
    });

    it('should return analytics charts data (category distribution, monthly comparison)', async () => {
      const res = await request(app)
        .get('/api/dashboard/analytics?timeframe=monthly')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.expenseByCategory).toBeDefined();
      expect(res.body.data.monthlyComparison).toBeDefined();
      expect(res.body.data.paymentMethods).toBeDefined();
    });
  });
});
