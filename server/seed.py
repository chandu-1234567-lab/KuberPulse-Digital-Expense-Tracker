"""
PyMongo Database Seeder
Digital Expense Tracker — MongoDB CA2 Project
Populates realistic demo financial data using pure PyMongo
"""

import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from datetime import datetime, timezone
import bcrypt
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://127.0.0.1:27017/digital_expense_tracker')


def hash_pwd(password: str) -> str:
    salt = bcrypt.gensalt(10)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def seed_database():
    print(f"[Seed] Connecting to MongoDB via PyMongo: {MONGO_URI} ...")
    client = MongoClient(MONGO_URI)

    try:
        db = client.get_default_database()
        if db is None:
            db = client['digital_expense_tracker']
    except Exception:
        db = client['digital_expense_tracker']

    users_col = db['users']
    transactions_col = db['transactions']
    budgets_col = db['budgets']

    demo_email = 'demo@expensetracker.in'

    # Clear previous demo user data
    existing_user = users_col.find_one({'email': demo_email})
    if existing_user:
        transactions_col.delete_many({'userId': existing_user['_id']})
        budgets_col.delete_many({'userId': existing_user['_id']})
        users_col.delete_one({'_id': existing_user['_id']})
        print(f"[Seed] Cleared previous demo records for {demo_email}")

    now = datetime.now(timezone.utc)
    current_year = now.year
    current_month = now.month  # 1-indexed

    # Create demo user
    user_doc = {
        'name': 'Rohan Sharma',
        'email': demo_email,
        'password': hash_pwd('Password@123'),
        'createdAt': now,
        'updatedAt': now,
    }
    user_res = users_col.insert_one(user_doc)
    user_id = user_res.inserted_id
    print(f"[Seed] Created Demo User: {demo_email} (ID: {user_id})")

    # Helper function to generate safe UTC datetime for past months
    def make_date(year_offset_m: int, day: int):
        m = current_month - year_offset_m
        y = current_year
        while m <= 0:
            m += 12
            y -= 1
        return datetime(y, m, min(day, 28), 12, 0, 0, tzinfo=timezone.utc)

    # Sample Transactions
    sample_transactions = [
        # --- Current Month (offset = 0) ---
        {
            'userId': user_id,
            'type': 'income',
            'amountInPaise': 9500000,  # ₹95,000
            'category': 'Salary',
            'description': 'Monthly Senior Engineer Salary',
            'paymentMethod': 'Bank Transfer',
            'date': make_date(0, 1),
            'notes': 'Credited directly to HDFC salary account',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'income',
            'amountInPaise': 2400000,  # ₹24,000
            'category': 'Freelancing',
            'description': 'React & MongoDB API Consultation',
            'paymentMethod': 'UPI',
            'date': make_date(0, 10),
            'notes': 'Client payment received via Google Pay',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'income',
            'amountInPaise': 1150000,  # ₹11,500
            'category': 'Investments',
            'description': 'Mutual Fund Dividend & Stock Returns',
            'paymentMethod': 'Net Banking',
            'date': make_date(0, 14),
            'notes': 'Zerodha quarterly payout',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 2500000,  # ₹25,000
            'category': 'Rent',
            'description': 'Apartment monthly rent payment',
            'paymentMethod': 'Net Banking',
            'date': make_date(0, 2),
            'notes': 'Paid to landlord via IMPS transfer',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 845000,  # ₹8,450
            'category': 'Groceries',
            'description': 'Blinkit & Nature Basket organic groceries',
            'paymentMethod': 'UPI',
            'date': make_date(0, 4),
            'notes': 'Monthly staples, dry fruits, fresh vegetables',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 420000,  # ₹4,200
            'category': 'Bills',
            'description': 'Electricity & High-speed Fiber Internet',
            'paymentMethod': 'UPI',
            'date': make_date(0, 7),
            'notes': 'Bescom electricity bill + Airtel Xstream 300Mbps',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 680000,  # ₹6,800
            'category': 'Food',
            'description': 'Weekend dinners at fine dining & cafes',
            'paymentMethod': 'Credit Card',
            'date': make_date(0, 11),
            'notes': 'HDFC Regalia Card dining reward',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 350000,  # ₹3,500
            'category': 'Transportation',
            'description': 'Cab fares and vehicle fuel refill',
            'paymentMethod': 'UPI',
            'date': make_date(0, 13),
            'notes': 'Uber trips and Shell petrol refuel',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 540000,  # ₹5,400
            'category': 'Shopping',
            'description': 'Clothing and noise-cancelling headphones',
            'paymentMethod': 'Credit Card',
            'date': make_date(0, 15),
            'notes': 'Amazon Great Indian Festival sale',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 220000,  # ₹2,200
            'category': 'Entertainment',
            'description': 'Netflix, Spotify & IMAX movie tickets',
            'paymentMethod': 'UPI',
            'date': make_date(0, 16),
            'notes': 'Weekend cinema with friends',
            'createdAt': now,
            'updatedAt': now,
        },

        # --- Previous Month (offset = 1) ---
        {
            'userId': user_id,
            'type': 'income',
            'amountInPaise': 9500000,
            'category': 'Salary',
            'description': 'Monthly Salary',
            'paymentMethod': 'Bank Transfer',
            'date': make_date(1, 1),
            'notes': 'Salary deposit',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'income',
            'amountInPaise': 1800000,
            'category': 'Freelancing',
            'description': 'UI/UX Redesign project payment',
            'paymentMethod': 'UPI',
            'date': make_date(1, 18),
            'notes': 'Freelance client invoice settled',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 2500000,
            'category': 'Rent',
            'description': 'Apartment monthly rent',
            'paymentMethod': 'Net Banking',
            'date': make_date(1, 2),
            'notes': 'Monthly rent transfer',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 1120000,
            'category': 'Food',
            'description': 'Eating out & family restaurant celebration',
            'paymentMethod': 'Credit Card',
            'date': make_date(1, 14),
            'notes': 'Barbeque Nation buffet bill',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 750000,
            'category': 'Groceries',
            'description': 'Monthly supermarket supplies',
            'paymentMethod': 'UPI',
            'date': make_date(1, 5),
            'notes': 'D-Mart offline purchase',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 380000,
            'category': 'Bills',
            'description': 'Utility bills & mobile recharges',
            'paymentMethod': 'UPI',
            'date': make_date(1, 8),
            'notes': 'Water + piped gas bill',
            'createdAt': now,
            'updatedAt': now,
        },

        # --- Month - 2 (offset = 2) ---
        {
            'userId': user_id,
            'type': 'income',
            'amountInPaise': 9500000,
            'category': 'Salary',
            'description': 'Monthly Salary',
            'paymentMethod': 'Bank Transfer',
            'date': make_date(2, 1),
            'notes': 'HDFC salary account credit',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 2500000,
            'category': 'Rent',
            'description': 'Apartment monthly rent',
            'paymentMethod': 'Net Banking',
            'date': make_date(2, 2),
            'notes': 'Rent payment',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 890000,
            'category': 'Food',
            'description': 'Swiggy & Zomato food deliveries',
            'paymentMethod': 'UPI',
            'date': make_date(2, 12),
            'notes': 'Online food deliveries',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 1450000,
            'category': 'Travel',
            'description': 'Weekend getaway resort stay',
            'paymentMethod': 'Credit Card',
            'date': make_date(2, 20),
            'notes': 'Coorg resort weekend trip',
            'createdAt': now,
            'updatedAt': now,
        },

        # --- Month - 3 (offset = 3) ---
        {
            'userId': user_id,
            'type': 'income',
            'amountInPaise': 9500000,
            'category': 'Salary',
            'description': 'Monthly Salary',
            'paymentMethod': 'Bank Transfer',
            'date': make_date(3, 1),
            'notes': 'Salary',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 2500000,
            'category': 'Rent',
            'description': 'Apartment monthly rent',
            'paymentMethod': 'Net Banking',
            'date': make_date(3, 2),
            'notes': 'Rent',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 650000,
            'category': 'Food',
            'description': 'Cafes and coffee roasters',
            'paymentMethod': 'UPI',
            'date': make_date(3, 15),
            'notes': 'Third Wave Coffee',
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': 450000,
            'category': 'Healthcare',
            'description': 'Routine health checkup and vitamins',
            'paymentMethod': 'Debit Card',
            'date': make_date(3, 22),
            'notes': 'Apollo pharmacy & diagnostic lab',
            'createdAt': now,
            'updatedAt': now,
        },
    ]

    transactions_res = transactions_col.insert_many(sample_transactions)
    print(f"[Seed] Inserted {len(transactions_res.inserted_ids)} sample transactions via PyMongo.")

    # Budgets for Current Month
    sample_budgets = [
        {
            'userId': user_id,
            'category': 'Food',
            'monthlyLimitInPaise': 800000,  # ₹8,000 limit -> currently spent ₹6,800 (85% => Warning)
            'month': current_month,
            'year': current_year,
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'category': 'Groceries',
            'monthlyLimitInPaise': 1000000,  # ₹10,000 limit -> currently spent ₹8,450 (84.5% => Warning)
            'month': current_month,
            'year': current_year,
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'category': 'Rent',
            'monthlyLimitInPaise': 2500000,  # ₹25,000 limit -> currently spent ₹25,000 (100% => Safe/Exact)
            'month': current_month,
            'year': current_year,
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'category': 'Shopping',
            'monthlyLimitInPaise': 500000,  # ₹5,000 limit -> currently spent ₹5,400 (108% => Exceeded)
            'month': current_month,
            'year': current_year,
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'category': 'Transportation',
            'monthlyLimitInPaise': 600000,  # ₹6,000 limit -> currently spent ₹3,500 (58% => Safe)
            'month': current_month,
            'year': current_year,
            'createdAt': now,
            'updatedAt': now,
        },
        {
            'userId': user_id,
            'category': 'Bills',
            'monthlyLimitInPaise': 500000,  # ₹5,000 limit -> currently spent ₹4,200 (84% => Warning)
            'month': current_month,
            'year': current_year,
            'createdAt': now,
            'updatedAt': now,
        },
    ]

    budgets_res = budgets_col.insert_many(sample_budgets)
    print(f"[Seed] Inserted {len(budgets_res.inserted_ids)} monthly budgets via PyMongo.")

    print("\n" + "=" * 50)
    print("  PYMONGO SEEDING COMPLETE FOR DIGITAL EXPENSE TRACKER")
    print(f"  Database:   digital_expense_tracker")
    print(f"  Driver:     PyMongo (Python {os.sys.version.split()[0]})")
    print("  Demo Login:")
    print(f"    Email:    {demo_email}")
    print("    Password: Password@123")
    print("=" * 50 + "\n")


if __name__ == '__main__':
    seed_database()
