"""
Budgets Blueprint (PyMongo)
Digital Expense Tracker API
"""

from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from pymongo import ReturnDocument, DESCENDING
from db import budgets_col, transactions_col, serialize_doc
from auth import jwt_required

budgets_bp = Blueprint('budgets', __name__, url_prefix='/api/budgets')


def get_month_date_range(year: int, month: int):
    """Calculate UTC start and end datetime for given month and year"""
    start_date = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc) - timedelta(microseconds=1)
    else:
        end_date = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=timezone.utc) - timedelta(microseconds=1)
    return start_date, end_date


@budgets_bp.route('', methods=['GET'])
@jwt_required
def get_budgets():
    now = datetime.now(timezone.utc)
    try:
        query_month = int(request.args.get('month', now.month))
        if not (1 <= query_month <= 12):
            query_month = now.month
    except (ValueError, TypeError):
        query_month = now.month

    try:
        query_year = int(request.args.get('year', now.year))
        if query_year < 2000:
            query_year = now.year
    except (ValueError, TypeError):
        query_year = now.year

    budgets = list(
        budgets_col.find({
            'userId': g.user['_id'],
            'month': query_month,
            'year': query_year,
        }).sort([('createdAt', DESCENDING)])
    )

    start_date, end_date = get_month_date_range(query_year, query_month)

    # PyMongo Aggregation to calculate actual spent per category for this month
    category_spending = list(transactions_col.aggregate([
        {
            '$match': {
                'userId': g.user['_id'],
                'type': 'expense',
                'date': {'$gte': start_date, '$lte': end_date},
            }
        },
        {
            '$group': {
                '_id': '$category',
                'totalSpentPaise': {'$sum': '$amountInPaise'},
            }
        },
    ]))

    spending_map = {item['_id']: item.get('totalSpentPaise', 0) for item in category_spending}

    total_budget_paise = 0
    total_spent_paise = 0
    warning_count = 0
    exceeded_count = 0

    enriched = []
    for b in budgets:
        limit_paise = b.get('monthlyLimitInPaise', 0)
        spent_paise = spending_map.get(b.get('category'), 0)
        remaining_paise = limit_paise - spent_paise
        percentage_used = round((spent_paise / limit_paise * 100), 1) if limit_paise > 0 else 0.0

        status = 'safe'
        if percentage_used >= 100:
            status = 'exceeded'
            exceeded_count += 1
        elif percentage_used >= 80:
            status = 'warning'
            warning_count += 1

        total_budget_paise += limit_paise
        total_spent_paise += spent_paise

        enriched.append({
            '_id': str(b['_id']),
            'category': b.get('category', ''),
            'month': b.get('month', query_month),
            'year': b.get('year', query_year),
            'monthlyLimit': round(limit_paise / 100.0, 2),
            'monthlyLimitInPaise': limit_paise,
            'spent': round(spent_paise / 100.0, 2),
            'spentInPaise': spent_paise,
            'remaining': round(remaining_paise / 100.0, 2),
            'remainingInPaise': remaining_paise,
            'percentageUsed': percentage_used,
            'status': status,
            'createdAt': b.get('createdAt').isoformat() if isinstance(b.get('createdAt'), datetime) else b.get('createdAt', ''),
            'updatedAt': b.get('updatedAt').isoformat() if isinstance(b.get('updatedAt'), datetime) else b.get('updatedAt', ''),
        })

    return jsonify({
        'success': True,
        'month': query_month,
        'year': query_year,
        'summary': {
            'totalBudget': round(total_budget_paise / 100.0, 2),
            'totalSpent': round(total_spent_paise / 100.0, 2),
            'remainingBudget': round((total_budget_paise - total_spent_paise) / 100.0, 2),
            'warningCount': warning_count,
            'exceededCount': exceeded_count,
        },
        'budgets': enriched,
    }), 200


@budgets_bp.route('', methods=['POST'])
@jwt_required
def create_budget():
    data = request.get_json(silent=True) or {}
    category = (data.get('category') or '').strip()
    month = data.get('month')
    year = data.get('year')

    if not category:
        return jsonify({'success': False, 'message': 'Budget category is required'}), 400

    try:
        month = int(month)
        if not (1 <= month <= 12):
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Valid month (1-12) is required'}), 400

    try:
        year = int(year)
        if year < 2000:
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Valid year (2000 or later) is required'}), 400

    # Calculate monthlyLimitInPaise
    limit_in_paise = None
    if 'monthlyLimitInPaise' in data and data['monthlyLimitInPaise'] is not None:
        try:
            limit_in_paise = int(round(float(data['monthlyLimitInPaise'])))
        except (ValueError, TypeError):
            pass
    elif 'monthlyLimit' in data and data['monthlyLimit'] is not None:
        try:
            limit_in_paise = int(round(float(data['monthlyLimit']) * 100))
        except (ValueError, TypeError):
            pass

    if limit_in_paise is None or limit_in_paise < 100:
        return jsonify({'success': False, 'message': 'Monthly limit must be at least ₹1 (100 paise)'}), 400

    # Check unique constraint (one budget per category/month/year per user)
    existing = budgets_col.find_one({
        'userId': g.user['_id'],
        'category': category,
        'month': month,
        'year': year,
    })
    if existing:
        return jsonify({
            'success': False,
            'message': f"Budget already exists for category '{category}' for {month}/{year}. You can edit it instead.",
        }), 400

    now = datetime.now(timezone.utc)
    new_doc = {
        'userId': g.user['_id'],
        'category': category,
        'monthlyLimitInPaise': limit_in_paise,
        'month': month,
        'year': year,
        'createdAt': now,
        'updatedAt': now,
    }

    res = budgets_col.insert_one(new_doc)
    new_doc['_id'] = res.inserted_id

    return jsonify({
        'success': True,
        'message': 'Budget set successfully',
        'budget': serialize_doc(new_doc),
    }), 201


@budgets_bp.route('/<id>', methods=['PUT'])
@jwt_required
def update_budget(id):
    if not ObjectId.is_valid(id):
        return jsonify({'success': False, 'message': 'Invalid budget ID'}), 400

    b = budgets_col.find_one({'_id': ObjectId(id), 'userId': g.user['_id']})
    if not b:
        return jsonify({'success': False, 'message': 'Budget not found or unauthorized'}), 404

    data = request.get_json(silent=True) or {}
    update_fields = {'updatedAt': datetime.now(timezone.utc)}

    if 'category' in data and data['category'].strip():
        update_fields['category'] = data['category'].strip()

    if 'monthlyLimitInPaise' in data and data['monthlyLimitInPaise'] is not None:
        try:
            update_fields['monthlyLimitInPaise'] = int(round(float(data['monthlyLimitInPaise'])))
        except (ValueError, TypeError):
            pass
    elif 'monthlyLimit' in data and data['monthlyLimit'] is not None:
        try:
            update_fields['monthlyLimitInPaise'] = int(round(float(data['monthlyLimit']) * 100))
        except (ValueError, TypeError):
            pass

    updated = budgets_col.find_one_and_update(
        {'_id': ObjectId(id), 'userId': g.user['_id']},
        {'$set': update_fields},
        return_document=ReturnDocument.AFTER,
    )

    return jsonify({
        'success': True,
        'message': 'Budget updated successfully',
        'budget': serialize_doc(updated),
    }), 200


@budgets_bp.route('/<id>', methods=['DELETE'])
@jwt_required
def delete_budget(id):
    if not ObjectId.is_valid(id):
        return jsonify({'success': False, 'message': 'Invalid budget ID'}), 400

    res = budgets_col.delete_one({'_id': ObjectId(id), 'userId': g.user['_id']})
    if res.deleted_count == 0:
        return jsonify({'success': False, 'message': 'Budget not found or unauthorized'}), 404

    return jsonify({
        'success': True,
        'message': 'Budget deleted successfully',
        'id': id,
    }), 200
