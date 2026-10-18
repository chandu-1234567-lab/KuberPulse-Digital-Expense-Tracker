const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const { Transaction } = require('./models/Transaction');
const Budget = require('./models/Budget');

dotenv.config();

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/digital_expense_tracker';

const seedData = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('[Seed] Connected to MongoDB database...');

    // Clear existing data for demo account
    const demoEmail = 'demo@expensetracker.in';
    let user = await User.findOne({ email: demoEmail });

    if (user) {
      await Transaction.deleteMany({ userId: user._id });
      await Budget.deleteMany({ userId: user._id });
      await User.deleteOne({ _id: user._id });
      console.log('[Seed] Cleared previous demo user data.');
    }

    // Create demo user
    user = await User.create({
      name: 'Rohan Sharma',
      email: demoEmail,
      password: 'Password@123',
    });

    console.log(`[Seed] Created Demo User: ${user.email} (Password: Password@123)`);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Sample Transactions (Past 4 months)
    const sampleTransactions = [
      // Current Month Incomes
      {
        userId: user._id,
        type: 'income',
        amountInPaise: 9500000, // ₹95,000
        category: 'Salary',
        description: 'Monthly Senior Engineer Salary',
        paymentMethod: 'Bank Transfer',
        date: new Date(currentYear, currentMonth, 1),
        notes: 'Credited directly to HDFC account',
      },
      {
        userId: user._id,
        type: 'income',
        amountInPaise: 2400000, // ₹24,000
        category: 'Freelancing',
        description: 'React Dashboard Consultation',
        paymentMethod: 'UPI',
        date: new Date(currentYear, currentMonth, 12),
        notes: 'Client payment received via Google Pay',
      },
      {
        userId: user._id,
        type: 'income',
        amountInPaise: 1150000, // ₹11,500
        category: 'Investments',
        description: 'Mutual Fund Dividend & Stock Returns',
        paymentMethod: 'Net Banking',
        date: new Date(currentYear, currentMonth, 15),
        notes: 'Zerodha quarterly payout',
      },

      // Current Month Expenses
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 2500000, // ₹25,000
        category: 'Rent',
        description: 'Apartment monthly rent payment',
        paymentMethod: 'Net Banking',
        date: new Date(currentYear, currentMonth, 2),
        notes: 'Paid to landlord via IMPS',
      },
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 845000, // ₹8,450
        category: 'Groceries',
        description: 'Blinkit & Nature Basket organic groceries',
        paymentMethod: 'UPI',
        date: new Date(currentYear, currentMonth, 4),
        notes: 'Monthly staples and fresh produce',
      },
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 420000, // ₹4,200
        category: 'Bills',
        description: 'Electricity & High-speed Fiber Internet',
        paymentMethod: 'UPI',
        date: new Date(currentYear, currentMonth, 7),
        notes: 'Bescom electricity bill + Airtel Xstream',
      },
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 680000, // ₹6,800
        category: 'Food',
        description: 'Weekend dinners at fine dining & cafes',
        paymentMethod: 'Credit Card',
        date: new Date(currentYear, currentMonth, 11),
        notes: 'HDFC Regalia Card',
      },
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 350000, // ₹3,500
        category: 'Transportation',
        description: 'Cab fares and vehicle fuel',
        paymentMethod: 'UPI',
        date: new Date(currentYear, currentMonth, 14),
        notes: 'Uber trips and petrol pump refuel',
      },
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 540000, // ₹5,400
        category: 'Shopping',
        description: 'Clothing and noise-cancelling headphones',
        paymentMethod: 'Credit Card',
        date: new Date(currentYear, currentMonth, 16),
      },
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 220000, // ₹2,200
        category: 'Entertainment',
        description: 'Netflix, Spotify & IMAX movie tickets',
        paymentMethod: 'UPI',
        date: new Date(currentYear, currentMonth, 10),
      },

      // Previous Month (M - 1)
      {
        userId: user._id,
        type: 'income',
        amountInPaise: 9500000,
        category: 'Salary',
        description: 'Monthly Salary',
        paymentMethod: 'Bank Transfer',
        date: new Date(currentYear, currentMonth - 1, 1),
      },
      {
        userId: user._id,
        type: 'income',
        amountInPaise: 1800000,
        category: 'Freelancing',
        description: 'UI/UX Redesign project',
        paymentMethod: 'UPI',
        date: new Date(currentYear, currentMonth - 1, 18),
      },
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 2500000,
        category: 'Rent',
        description: 'Apartment monthly rent',
        paymentMethod: 'Net Banking',
        date: new Date(currentYear, currentMonth - 1, 2),
      },
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 1120000,
        category: 'Food',
        description: 'Eating out and family gathering',
        paymentMethod: 'Credit Card',
        date: new Date(currentYear, currentMonth - 1, 15),
      },
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 750000,
        category: 'Groceries',
        description: 'Monthly groceries',
        paymentMethod: 'UPI',
        date: new Date(currentYear, currentMonth - 1, 5),
      },
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 380000,
        category: 'Bills',
        description: 'Utility bills',
        paymentMethod: 'UPI',
        date: new Date(currentYear, currentMonth - 1, 8),
      },

      // Previous Month (M - 2)
      {
        userId: user._id,
        type: 'income',
        amountInPaise: 9500000,
        category: 'Salary',
        description: 'Monthly Salary',
        paymentMethod: 'Bank Transfer',
        date: new Date(currentYear, currentMonth - 2, 1),
      },
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 2500000,
        category: 'Rent',
        description: 'Apartment monthly rent',
        paymentMethod: 'Net Banking',
        date: new Date(currentYear, currentMonth - 2, 2),
      },
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 890000,
        category: 'Food',
        description: 'Food & Cafes',
        paymentMethod: 'UPI',
        date: new Date(currentYear, currentMonth - 2, 12),
      },
      {
        userId: user._id,
        type: 'expense',
        amountInPaise: 1450000,
        category: 'Travel',
        description: 'Weekend getaway resort stay',
        paymentMethod: 'Credit Card',
        date: new Date(currentYear, currentMonth - 2, 20),
      },
    ];

    await Transaction.insertMany(sampleTransactions);
    console.log(`[Seed] Inserted ${sampleTransactions.length} sample transactions.`);

    // Sample Budgets for Current Month
    const sampleBudgets = [
      {
        userId: user._id,
        category: 'Food',
        monthlyLimitInPaise: 800000, // ₹8,000 limit -> currently spent ₹6,800 (85% => Warning!)
        month: currentMonth + 1,
        year: currentYear,
      },
      {
        userId: user._id,
        category: 'Groceries',
        monthlyLimitInPaise: 1000000, // ₹10,000 limit -> currently spent ₹8,450 (84.5% => Warning!)
        month: currentMonth + 1,
        year: currentYear,
      },
      {
        userId: user._id,
        category: 'Rent',
        monthlyLimitInPaise: 2500000, // ₹25,000 limit -> currently spent ₹25,000 (100% => Safe/Exact)
        month: currentMonth + 1,
        year: currentYear,
      },
      {
        userId: user._id,
        category: 'Shopping',
        monthlyLimitInPaise: 500000, // ₹5,000 limit -> currently spent ₹5,400 (108% => Exceeded!)
        month: currentMonth + 1,
        year: currentYear,
      },
      {
        userId: user._id,
        category: 'Transportation',
        monthlyLimitInPaise: 600000, // ₹6,000 limit -> currently spent ₹3,500 (58% => Safe)
        month: currentMonth + 1,
        year: currentYear,
      },
      {
        userId: user._id,
        category: 'Bills',
        monthlyLimitInPaise: 500000, // ₹5,000 limit -> currently spent ₹4,200 (84% => Warning)
        month: currentMonth + 1,
        year: currentYear,
      },
    ];

    await Budget.insertMany(sampleBudgets);
    console.log(`[Seed] Inserted ${sampleBudgets.length} budgets with safe, warning (>80%), and exceeded states.`);

    console.log('\n=========================================');
    console.log(' SEEDING COMPLETE FOR DIGITAL EXPENSE TRACKER');
    console.log(' Database: digital_expense_tracker');
    console.log(' Demo Login:');
    console.log('   Email:    demo@expensetracker.in');
    console.log('   Password: Password@123');
    console.log('=========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedData();
