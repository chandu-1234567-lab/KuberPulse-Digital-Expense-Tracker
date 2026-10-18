"""
MongoDB PyMongo Database Connection & Index Configuration
Digital Expense Tracker — CA2 Project
"""

import os
from datetime import datetime, timezone
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://127.0.0.1:27017/digital_expense_tracker')

# Initialize PyMongo Client
client = MongoClient(MONGO_URI)

# Extract database name or default to 'digital_expense_tracker'
try:
    db = client.get_default_database()
    if db is None:
        db = client['digital_expense_tracker']
except Exception:
    db = client['digital_expense_tracker']

# Collections
users_col = db['users']
transactions_col = db['transactions']
budgets_col = db['budgets']


def init_indexes():
    """
    Ensure appropriate indexes are created for optimal MongoDB query performance
    """
    try:
        # User indexes
        users_col.create_index([('email', ASCENDING)], unique=True)

        # Transaction indexes
        transactions_col.create_index([('userId', ASCENDING), ('date', DESCENDING)])
        transactions_col.create_index([('userId', ASCENDING), ('type', ASCENDING), ('category', ASCENDING)])
        transactions_col.create_index([('userId', ASCENDING), ('type', ASCENDING), ('date', DESCENDING)])

        # Budget unique compound index (one budget per category/month/year per user)
        budgets_col.create_index(
            [
                ('userId', ASCENDING),
                ('category', ASCENDING),
                ('month', ASCENDING),
                ('year', ASCENDING),
            ],
            unique=True,
        )
        print('[PyMongo] MongoDB indexes verified successfully.')
    except Exception as e:
        print(f'[PyMongo] Warning creating indexes: {e}')


def serialize_doc(doc):
    """
    Serialize MongoDB BSON document into JSON-safe dictionary
    matching Mongoose virtual fields for frontend compatibility.
    """
    if doc is None:
        return None

    res = {}
    for k, v in doc.items():
        if k == 'password':
            continue  # Never leak password hashes
        elif isinstance(v, ObjectId):
            res[k] = str(v)
        elif isinstance(v, datetime):
            res[k] = v.isoformat()
        elif isinstance(v, list):
            res[k] = [serialize_doc(item) if isinstance(item, dict) else item for item in v]
        elif isinstance(v, dict):
            res[k] = serialize_doc(v)
        else:
            res[k] = v

    # Virtual fields
    if 'amountInPaise' in res:
        res['amount'] = round(res['amountInPaise'] / 100.0, 2)

    if 'monthlyLimitInPaise' in res:
        res['monthlyLimit'] = round(res['monthlyLimitInPaise'] / 100.0, 2)

    return res


def serialize_user(user_doc):
    """
    Return clean public user profile object
    """
    if not user_doc:
        return None
    return {
        '_id': str(user_doc['_id']),
        'name': user_doc.get('name', ''),
        'email': user_doc.get('email', ''),
        'createdAt': user_doc.get('createdAt').isoformat() if isinstance(user_doc.get('createdAt'), datetime) else user_doc.get('createdAt', ''),
        'updatedAt': user_doc.get('updatedAt').isoformat() if isinstance(user_doc.get('updatedAt'), datetime) else user_doc.get('updatedAt', ''),
    }
