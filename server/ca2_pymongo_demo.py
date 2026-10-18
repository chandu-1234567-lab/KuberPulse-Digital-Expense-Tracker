"""
Digital Expense Tracker — MongoDB Continuous Assessment 2 (CA2)
Official PyMongo Demonstration & Query Evaluation Script

This script programmatically demonstrates all MongoDB competencies using pure PyMongo:
1. Connection & Server Verification
2. Index Creation & Inspection
3. PyMongo CRUD Operations (insert, query, update, delete)
4. Advanced Querying ($regex, range, logical operators)
5. Multi-stage Aggregation Pipelines ($match, $group, $sort, $project, $avg, $sum)
6. Financial Analytics & Monthly Trend Computation
"""

import os
import sys

# Configure stdout for UTF-8 on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from datetime import datetime, timezone, timedelta
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://127.0.0.1:27017/digital_expense_tracker')


def run_ca2_demonstration():
    print("=" * 70)
    print("  MONGODB CA2 EVALUATION — PYMONGO OPERATIONS & ANALYTICS")
    print("  Project: Digital Expense Tracker Web Application")
    print("=" * 70)

    # 1. Connection
    print("\n[Step 1] Connecting to MongoDB via PyMongo MongoClient...")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    server_info = client.server_info()
    print(f"  -> Connected successfully! MongoDB Engine Version: {server_info.get('version')}")

    db = client['digital_expense_tracker']
    print(f"  -> Target Database: '{db.name}'")
    print(f"  -> Existing Collections: {db.list_collection_names()}")

    # 2. Indexes
    print("\n[Step 2] Verifying & Creating Indexes via PyMongo...")
    db.users.create_index([('email', ASCENDING)], unique=True)
    db.transactions.create_index([('userId', ASCENDING), ('date', DESCENDING)])
    db.transactions.create_index([('userId', ASCENDING), ('type', ASCENDING), ('category', ASCENDING)])
    db.budgets.create_index(
        [('userId', ASCENDING), ('category', ASCENDING), ('month', ASCENDING), ('year', ASCENDING)],
        unique=True
    )
    print("  -> Transaction collection indexes:")
    for idx_name, idx_info in db.transactions.index_information().items():
        print(f"     * {idx_name}: {idx_info.get('key')}")

    # 3. Fetch or Create a test record
    print("\n[Step 3] PyMongo CRUD Operations...")
    user = db.users.find_one({'email': 'demo@expensetracker.in'}) or db.users.find_one()
    if not user:
        print("  -> No user found. Creating a test user...")
        res = db.users.insert_one({
            'name': 'CA2 Evaluator',
            'email': 'ca2_test@expensetracker.in',
            'createdAt': datetime.now(timezone.utc),
            'updatedAt': datetime.now(timezone.utc),
        })
        user_id = res.inserted_id
    else:
        user_id = user['_id']
        print(f"  -> Operating on User: '{user.get('name')}' ({user.get('email')}), ID: {user_id}")

    # Insert One
    now = datetime.now(timezone.utc)
    sample_item = {
        'userId': user_id,
        'type': 'expense',
        'amountInPaise': 45000,  # ₹450.00
        'category': 'Food',
        'description': 'PyMongo Demonstration Cafe Coffee',
        'paymentMethod': 'UPI',
        'notes': 'Recorded during CA2 live execution',
        'date': now,
        'createdAt': now,
        'updatedAt': now,
    }
    insert_res = db.transactions.insert_one(sample_item)
    sample_id = insert_res.inserted_id
    print(f"  [CREATE] insert_one() -> Inserted Document ID: {sample_id}")

    # Find One & Projection
    found_doc = db.transactions.find_one(
        {'_id': sample_id},
        {'description': 1, 'amountInPaise': 1, 'category': 1, 'type': 1}
    )
    print(f"  [READ]   find_one() with projection -> {found_doc}")

    # Update One
    update_res = db.transactions.update_one(
        {'_id': sample_id},
        {'$set': {'amountInPaise': 52000, 'notes': 'Updated via PyMongo update_one()'}}
    )
    print(f"  [UPDATE] update_one() -> matched: {update_res.matched_count}, modified: {update_res.modified_count}")

    # 4. Advanced Queries (Regex search, logical $and/$or, range operators)
    print("\n[Step 4] Advanced PyMongo Queries & Filter Operators...")
    # Regex search
    regex_matches = list(db.transactions.find(
        {'userId': user_id, 'description': {'$regex': r'coffee|grocery|food|salary', '$options': 'i'}},
        {'description': 1, 'amountInPaise': 1, 'category': 1}
    ).limit(3))
    print(f"  -> Regex Search ({len(regex_matches)} sample matches):")
    for doc in regex_matches:
        print(f"     * {doc.get('description')} -> ₹{doc.get('amountInPaise', 0) / 100:.2f} [{doc.get('category')}]")

    # Range and Compound Query
    high_value_expenses = list(db.transactions.find(
        {
            'userId': user_id,
            'type': 'expense',
            'amountInPaise': {'$gte': 500000},  # >= ₹5,000
        },
        {'description': 1, 'amountInPaise': 1, 'paymentMethod': 1}
    ).sort([('amountInPaise', DESCENDING)]).limit(3))
    print(f"  -> High Value Expenses (>= ₹5,000) sorted by amount descending:")
    for doc in high_value_expenses:
        print(f"     * {doc.get('description')} -> ₹{doc.get('amountInPaise', 0) / 100:.2f} ({doc.get('paymentMethod')})")

    # 5. Aggregation Pipelines
    print("\n[Step 5] PyMongo Aggregation Pipelines ($match, $group, $sort, $project)...")

    # 5.1 Financial Summary
    pipeline_summary = [
        {'$match': {'userId': user_id}},
        {
            '$group': {
                '_id': '$type',
                'totalPaise': {'$sum': '$amountInPaise'},
                'count': {'$sum': 1},
                'avgPaise': {'$avg': '$amountInPaise'},
            }
        },
        {
            '$project': {
                'type': '$_id',
                'totalRupees': {'$divide': ['$totalPaise', 100]},
                'avgRupees': {'$round': [{'$divide': ['$avgPaise', 100]}, 2]},
                'count': 1,
                '_id': 0,
            }
        },
    ]
    summary_results = list(db.transactions.aggregate(pipeline_summary))
    print("  -> Aggregate 1: Overall Income vs Expense Totals & Averages:")
    for row in summary_results:
        print(f"     * {row['type'].upper()}: Total ₹{row['totalRupees']:,.2f} across {row['count']} transactions (Avg: ₹{row['avgRupees']:,.2f})")

    # 5.2 Category Breakdown
    pipeline_category = [
        {'$match': {'userId': user_id, 'type': 'expense'}},
        {
            '$group': {
                '_id': '$category',
                'totalPaise': {'$sum': '$amountInPaise'},
                'count': {'$sum': 1},
            }
        },
        {'$sort': {'totalPaise': DESCENDING}},
        {
            '$project': {
                'category': '$_id',
                'totalSpent': {'$divide': ['$totalPaise', 100]},
                'count': 1,
                '_id': 0,
            }
        },
    ]
    category_results = list(db.transactions.aggregate(pipeline_category))
    print("\n  -> Aggregate 2: Expense Distribution by Category:")
    for row in category_results[:5]:
        print(f"     * {row['category']:<15} : ₹{row['totalSpent']:>10,.2f} ({row['count']} entries)")

    # 5.3 Monthly Trends
    pipeline_trends = [
        {'$match': {'userId': user_id}},
        {
            '$group': {
                '_id': {
                    'year': {'$year': '$date'},
                    'month': {'$month': '$date'},
                    'type': '$type',
                },
                'totalPaise': {'$sum': '$amountInPaise'},
            }
        },
        {'$sort': {'_id.year': ASCENDING, '_id.month': ASCENDING}},
    ]
    trends_results = list(db.transactions.aggregate(pipeline_trends))
    print(f"\n  -> Aggregate 3: Multi-Month Cashflow Trend Aggregation:")
    for row in trends_results[:6]:
        y = row['_id']['year']
        m = row['_id']['month']
        t = row['_id']['type']
        amt = row['totalPaise'] / 100.0
        print(f"     * Month {m:02d}/{y} [{t.upper():<7}] : ₹{amt:>10,.2f}")

    # 6. Delete demonstration
    print(f"\n[Step 6] Cleaning up demo transaction {sample_id}...")
    del_res = db.transactions.delete_one({'_id': sample_id})
    print(f"  [DELETE] delete_one() -> deleted count: {del_res.deleted_count}")

    print("\n" + "=" * 70)
    print("  ALL PYMONGO CA2 CHECKS COMPLETED SUCCESSFULLY!")
    print("=" * 70 + "\n")


if __name__ == '__main__':
    run_ca2_demonstration()
