"""
Transactions Blueprint (PyMongo)
Digital Expense Tracker API
"""

import math
import re
import csv
import io
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, Response, g
from bson import ObjectId
from pymongo import ReturnDocument, ASCENDING, DESCENDING
from db import transactions_col, serialize_doc
from auth import jwt_required

transactions_bp = Blueprint('transactions', __name__, url_prefix='/api/transactions')


def parse_date(date_str):
    """Parse flexible date strings into datetime object"""
    if not date_str:
        return None
    try:
        # Handle 'YYYY-MM-DD'
        if len(date_str) == 10:
            return datetime.strptime(date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        # Handle ISO strings (e.g. '2026-10-18T14:30:00.000Z')
        clean_str = date_str.replace('Z', '+00:00')
        return datetime.fromisoformat(clean_str)
    except Exception:
        try:
            return datetime.strptime(date_str[:10], '%Y-%m-%d').replace(tzinfo=timezone.utc)
        except Exception:
            return None


@transactions_bp.route('', methods=['GET'])
@jwt_required
def get_transactions():
    trans_type = request.args.get('type')
    category = request.args.get('category')
    payment_method = request.args.get('paymentMethod')
    search = request.args.get('search')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    sort_by = request.args.get('sortBy', 'date')
    order = request.args.get('order', 'desc')
    page_str = request.args.get('page', '1')
    limit_str = request.args.get('limit', '10')
    all_param = request.args.get('all', 'false').lower() in ('true', '1')

    query = {'userId': g.user['_id']}

    if trans_type in ('income', 'expense'):
        query['type'] = trans_type

    if category:
        query['category'] = category

    if payment_method:
        query['paymentMethod'] = payment_method

    # Date range filtering
    start_dt = parse_date(start_date)
    end_dt = parse_date(end_date)
    if start_dt or end_dt:
        query['date'] = {}
        if start_dt:
            query['date']['$gte'] = start_dt
        if end_dt:
            # Set to end of day
            end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
            query['date']['$lte'] = end_dt

    # Search keyword
    if search and search.strip():
        sanitized = re.escape(search.strip())
        query['$or'] = [
            {'description': {'$regex': sanitized, '$options': 'i'}},
            {'notes': {'$regex': sanitized, '$options': 'i'}},
        ]

    # Map sort fields
    sort_field = 'date'
    if sort_by == 'amount':
        sort_field = 'amountInPaise'
    elif sort_by == 'createdAt':
        sort_field = 'createdAt'
    elif sort_by == 'category':
        sort_field = 'category'

    sort_direction = ASCENDING if order == 'asc' else DESCENDING

    # Pagination setup
    total = transactions_col.count_documents(query)

    try:
        page_num = max(1, int(page_str))
    except ValueError:
        page_num = 1

    try:
        limit_num = max(1, int(limit_str))
    except ValueError:
        limit_num = 10

    if all_param:
        cursor = transactions_col.find(query).sort([(sort_field, sort_direction), ('_id', DESCENDING)])
        page_limit = total if total > 0 else 1000
        page_num = 1
    else:
        page_limit = limit_num
        skip = (page_num - 1) * page_limit
        cursor = (
            transactions_col.find(query)
            .sort([(sort_field, sort_direction), ('_id', DESCENDING)])
            .skip(skip)
            .limit(page_limit)
        )

    items = list(cursor)

    # PyMongo Aggregation for summary calculation
    agg_summary = list(transactions_col.aggregate([
        {'$match': query},
        {
            '$group': {
                '_id': '$type',
                'totalPaise': {'$sum': '$amountInPaise'},
                'count': {'$sum': 1},
            }
        },
    ]))

    total_income_paise = 0
    total_expense_paise = 0
    for s in agg_summary:
        if s.get('_id') == 'income':
            total_income_paise = s.get('totalPaise', 0)
        elif s.get('_id') == 'expense':
            total_expense_paise = s.get('totalPaise', 0)

    total_pages = math.ceil(total / page_limit) if total > 0 else 1

    return jsonify({
        'success': True,
        'count': len(items),
        'pagination': {
            'total': total,
            'page': page_num,
            'limit': page_limit,
            'totalPages': total_pages,
        },
        'summary': {
            'totalIncome': round(total_income_paise / 100.0, 2),
            'totalExpenses': round(total_expense_paise / 100.0, 2),
            'netBalance': round((total_income_paise - total_expense_paise) / 100.0, 2),
            'totalIncomeInPaise': total_income_paise,
            'totalExpensesInPaise': total_expense_paise,
        },
        'transactions': [serialize_doc(t) for t in items],
    }), 200


@transactions_bp.route('/<id>', methods=['GET'])
@jwt_required
def get_transaction_by_id(id):
    if not ObjectId.is_valid(id):
        return jsonify({'success': False, 'message': 'Invalid transaction ID'}), 400

    t = transactions_col.find_one({'_id': ObjectId(id), 'userId': g.user['_id']})
    if not t:
        return jsonify({'success': False, 'message': 'Transaction not found or unauthorized'}), 404

    return jsonify({
        'success': True,
        'transaction': serialize_doc(t),
    }), 200


@transactions_bp.route('', methods=['POST'])
@jwt_required
def create_transaction():
    data = request.get_json(silent=True) or {}
    trans_type = data.get('type')
    category = (data.get('category') or '').strip()
    description = (data.get('description') or '').strip()
    date_val = data.get('date')
    payment_method = (data.get('paymentMethod') or 'UPI').strip()
    notes = (data.get('notes') or '').strip()

    if trans_type not in ('income', 'expense'):
        return jsonify({'success': False, 'message': 'Transaction type must be either income or expense'}), 400

    if not category:
        return jsonify({'success': False, 'message': 'Category is required'}), 400

    if not description:
        return jsonify({'success': False, 'message': 'Description is required'}), 400

    # Calculate amountInPaise
    amount_in_paise = None
    if 'amountInPaise' in data and data['amountInPaise'] is not None:
        try:
            amount_in_paise = int(round(float(data['amountInPaise'])))
        except (ValueError, TypeError):
            pass
    elif 'amount' in data and data['amount'] is not None:
        try:
            amount_in_paise = int(round(float(data['amount']) * 100))
        except (ValueError, TypeError):
            pass

    if amount_in_paise is None or amount_in_paise < 1:
        return jsonify({'success': False, 'message': 'Amount must be at least ₹0.01 (1 paisa)'}), 400

    trans_date = parse_date(date_val) if date_val else datetime.now(timezone.utc)
    if not trans_date:
        trans_date = datetime.now(timezone.utc)

    now = datetime.now(timezone.utc)
    new_doc = {
        'userId': g.user['_id'],
        'type': trans_type,
        'amountInPaise': amount_in_paise,
        'category': category,
        'description': description,
        'date': trans_date,
        'paymentMethod': payment_method,
        'notes': notes,
        'createdAt': now,
        'updatedAt': now,
    }

    res = transactions_col.insert_one(new_doc)
    new_doc['_id'] = res.inserted_id

    return jsonify({
        'success': True,
        'message': 'Transaction recorded successfully',
        'transaction': serialize_doc(new_doc),
    }), 201


@transactions_bp.route('/<id>', methods=['PUT'])
@jwt_required
def update_transaction(id):
    if not ObjectId.is_valid(id):
        return jsonify({'success': False, 'message': 'Invalid transaction ID'}), 400

    t = transactions_col.find_one({'_id': ObjectId(id), 'userId': g.user['_id']})
    if not t:
        return jsonify({'success': False, 'message': 'Transaction not found or unauthorized'}), 404

    data = request.get_json(silent=True) or {}
    update_fields = {'updatedAt': datetime.now(timezone.utc)}

    if 'type' in data and data['type'] in ('income', 'expense'):
        update_fields['type'] = data['type']

    if 'category' in data and data['category'].strip():
        update_fields['category'] = data['category'].strip()

    if 'description' in data and data['description'].strip():
        update_fields['description'] = data['description'].strip()

    if 'paymentMethod' in data and data['paymentMethod'].strip():
        update_fields['paymentMethod'] = data['paymentMethod'].strip()

    if 'notes' in data:
        update_fields['notes'] = (data['notes'] or '').strip()

    if 'date' in data and data['date']:
        dt = parse_date(data['date'])
        if dt:
            update_fields['date'] = dt

    if 'amountInPaise' in data and data['amountInPaise'] is not None:
        try:
            update_fields['amountInPaise'] = int(round(float(data['amountInPaise'])))
        except (ValueError, TypeError):
            pass
    elif 'amount' in data and data['amount'] is not None:
        try:
            update_fields['amountInPaise'] = int(round(float(data['amount']) * 100))
        except (ValueError, TypeError):
            pass

    updated = transactions_col.find_one_and_update(
        {'_id': ObjectId(id), 'userId': g.user['_id']},
        {'$set': update_fields},
        return_document=ReturnDocument.AFTER,
    )

    return jsonify({
        'success': True,
        'message': 'Transaction updated successfully',
        'transaction': serialize_doc(updated),
    }), 200


@transactions_bp.route('/<id>', methods=['DELETE'])
@jwt_required
def delete_transaction(id):
    if not ObjectId.is_valid(id):
        return jsonify({'success': False, 'message': 'Invalid transaction ID'}), 400

    res = transactions_col.delete_one({'_id': ObjectId(id), 'userId': g.user['_id']})
    if res.deleted_count == 0:
        return jsonify({'success': False, 'message': 'Transaction not found or unauthorized'}), 404

    return jsonify({
        'success': True,
        'message': 'Transaction deleted successfully',
        'id': id,
    }), 200


@transactions_bp.route('/export/csv', methods=['GET'])
@jwt_required
def export_transactions_csv():
    items = list(
        transactions_col.find({'userId': g.user['_id']}).sort([('date', DESCENDING)])
    )

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Header
    writer.writerow([
        'Transaction ID',
        'Date',
        'Type',
        'Category',
        'Description',
        'Amount (Rupees)',
        'Payment Method',
        'Notes',
        'Created At',
    ])

    for t in items:
        date_str = t['date'].strftime('%Y-%m-%d') if isinstance(t.get('date'), datetime) else str(t.get('date', ''))
        created_str = t['createdAt'].isoformat() if isinstance(t.get('createdAt'), datetime) else str(t.get('createdAt', ''))
        amount_rupees = f"{(t.get('amountInPaise', 0) / 100.0):.2f}"

        writer.writerow([
            str(t['_id']),
            date_str,
            t.get('type', '').upper(),
            t.get('category', ''),
            t.get('description', ''),
            amount_rupees,
            t.get('paymentMethod', ''),
            t.get('notes', ''),
            created_str,
        ])

    csv_data = output.getvalue()
    today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    return Response(
        csv_data,
        mimetype='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename="transactions_{today_str}.csv"'
        },
    )
