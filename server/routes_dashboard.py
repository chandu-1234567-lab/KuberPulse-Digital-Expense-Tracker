"""
Dashboard & Analytics Blueprint (PyMongo)
Digital Expense Tracker API
"""

from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g
from pymongo import DESCENDING
from db import transactions_col, budgets_col, serialize_doc
from auth import jwt_required

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


@dashboard_bp.route('/summary', methods=['GET'])
@jwt_required
def get_dashboard_summary():
    user_id = g.user['_id']
    now = datetime.now(timezone.utc)
    current_year = now.year
    current_month = now.month

    # Current month start and end
    start_of_month = datetime(current_year, current_month, 1, 0, 0, 0, tzinfo=timezone.utc)
    if current_month == 12:
        end_of_month = datetime(current_year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc) - timedelta(microseconds=1)
    else:
        end_of_month = datetime(current_year, current_month + 1, 1, 0, 0, 0, tzinfo=timezone.utc) - timedelta(microseconds=1)

    # 1. All-time aggregate
    all_time_stats = list(transactions_col.aggregate([
        {'$match': {'userId': user_id}},
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
    for s in all_time_stats:
        if s.get('_id') == 'income':
            total_income_paise = s.get('totalPaise', 0)
        elif s.get('_id') == 'expense':
            total_expense_paise = s.get('totalPaise', 0)

    total_balance_paise = total_income_paise - total_expense_paise

    # 2. Current month aggregate
    monthly_stats = list(transactions_col.aggregate([
        {
            '$match': {
                'userId': user_id,
                'date': {'$gte': start_of_month, '$lte': end_of_month},
            }
        },
        {
            '$group': {
                '_id': '$type',
                'monthlyPaise': {'$sum': '$amountInPaise'},
            }
        },
    ]))

    current_month_income_paise = 0
    current_month_expense_paise = 0
    for s in monthly_stats:
        if s.get('_id') == 'income':
            current_month_income_paise = s.get('monthlyPaise', 0)
        elif s.get('_id') == 'expense':
            current_month_expense_paise = s.get('monthlyPaise', 0)

    monthly_savings_paise = current_month_income_paise - current_month_expense_paise
    monthly_savings_rate = (
        round((monthly_savings_paise / current_month_income_paise * 100), 1)
        if current_month_income_paise > 0
        else 0.0
    )

    # 3. Current month budgets and spending progress
    current_budgets = list(budgets_col.find({
        'userId': user_id,
        'month': current_month,
        'year': current_year,
    }))

    category_spending = list(transactions_col.aggregate([
        {
            '$match': {
                'userId': user_id,
                'type': 'expense',
                'date': {'$gte': start_of_month, '$lte': end_of_month},
            }
        },
        {
            '$group': {
                '_id': '$category',
                'spentPaise': {'$sum': '$amountInPaise'},
            }
        },
    ]))

    spending_map = {item['_id']: item.get('spentPaise', 0) for item in category_spending}

    total_budget_limit_paise = 0
    total_budget_spent_paise = 0
    warning_alerts = 0
    exceeded_alerts = 0

    budget_progress = []
    for b in current_budgets:
        limit = b.get('monthlyLimitInPaise', 0)
        spent = spending_map.get(b.get('category'), 0)
        pct = round((spent / limit * 100), 1) if limit > 0 else 0.0

        status = 'safe'
        if pct >= 100:
            status = 'exceeded'
            exceeded_alerts += 1
        elif pct >= 80:
            status = 'warning'
            warning_alerts += 1

        total_budget_limit_paise += limit
        total_budget_spent_paise += spent

        budget_progress.append({
            '_id': str(b['_id']),
            'category': b.get('category', ''),
            'monthlyLimit': round(limit / 100.0, 2),
            'spent': round(spent / 100.0, 2),
            'remaining': round((limit - spent) / 100.0, 2),
            'percentageUsed': pct,
            'status': status,
        })

    remaining_monthly_budget_paise = max(0, total_budget_limit_paise - total_budget_spent_paise)

    # 4. Recent transactions (latest 6)
    recent_transactions = list(
        transactions_col.find({'userId': user_id})
        .sort([('date', DESCENDING), ('_id', DESCENDING)])
        .limit(6)
    )

    return jsonify({
        'success': True,
        'data': {
            'totalBalance': round(total_balance_paise / 100.0, 2),
            'totalIncome': round(total_income_paise / 100.0, 2),
            'totalExpenses': round(total_expense_paise / 100.0, 2),
            'monthlyIncome': round(current_month_income_paise / 100.0, 2),
            'monthlyExpenses': round(current_month_expense_paise / 100.0, 2),
            'monthlySavings': round(monthly_savings_paise / 100.0, 2),
            'monthlySavingsRate': monthly_savings_rate,
            'totalBudgetLimit': round(total_budget_limit_paise / 100.0, 2),
            'remainingMonthlyBudget': round(remaining_monthly_budget_paise / 100.0, 2),
            'warningAlerts': warning_alerts,
            'exceededAlerts': exceeded_alerts,
            'budgetProgress': budget_progress,
            'recentTransactions': [serialize_doc(t) for t in recent_transactions],
        },
    }), 200


@dashboard_bp.route('/analytics', methods=['GET'])
@jwt_required
def get_dashboard_analytics():
    user_id = g.user['_id']
    timeframe = request.args.get('timeframe', 'monthly').lower()

    now = datetime.now(timezone.utc)

    if timeframe == 'daily':
        start_date = now - timedelta(days=7)
    elif timeframe == 'weekly':
        start_date = now - timedelta(days=30)
    elif timeframe == 'yearly':
        start_date = datetime(now.year - 3, 1, 1, tzinfo=timezone.utc)
    else:
        # monthly (last 6 months)
        start_m = now.month - 5
        start_y = now.year
        if start_m <= 0:
            start_m += 12
            start_y -= 1
        start_date = datetime(start_y, start_m, 1, tzinfo=timezone.utc)

    # 1. Expense by Category
    category_stats = list(transactions_col.aggregate([
        {
            '$match': {
                'userId': user_id,
                'type': 'expense',
                'date': {'$gte': start_date},
            }
        },
        {
            '$group': {
                '_id': '$category',
                'totalPaise': {'$sum': '$amountInPaise'},
                'count': {'$sum': 1},
            }
        },
        {'$sort': {'totalPaise': DESCENDING}},
    ]))

    total_expense_period = sum(c.get('totalPaise', 0) for c in category_stats)

    expense_by_category = [
        {
            'name': item['_id'],
            'amount': round(item.get('totalPaise', 0) / 100.0, 2),
            'count': item.get('count', 0),
            'percentage': round((item.get('totalPaise', 0) / total_expense_period * 100), 1)
            if total_expense_period > 0
            else 0.0,
        }
        for item in category_stats
    ]

    # 2. Income by Category
    income_category_stats = list(transactions_col.aggregate([
        {
            '$match': {
                'userId': user_id,
                'type': 'income',
                'date': {'$gte': start_date},
            }
        },
        {
            '$group': {
                '_id': '$category',
                'totalPaise': {'$sum': '$amountInPaise'},
                'count': {'$sum': 1},
            }
        },
        {'$sort': {'totalPaise': DESCENDING}},
    ]))

    income_by_category = [
        {
            'name': item['_id'],
            'amount': round(item.get('totalPaise', 0) / 100.0, 2),
            'count': item.get('count', 0),
        }
        for item in income_category_stats
    ]

    # 3. Monthly Income vs Expenses Trend (Last 6 Months)
    start_m6 = now.month - 5
    start_y6 = now.year
    if start_m6 <= 0:
        start_m6 += 12
        start_y6 -= 1
    six_months_ago = datetime(start_y6, start_m6, 1, tzinfo=timezone.utc)

    monthly_trends_data = list(transactions_col.aggregate([
        {
            '$match': {
                'userId': user_id,
                'date': {'$gte': six_months_ago},
            }
        },
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
    ]))

    monthly_comparison = []
    for i in range(5, -1, -1):
        target_m = now.month - i
        target_y = now.year
        if target_m <= 0:
            target_m += 12
            target_y -= 1

        label = f"{MONTH_NAMES[target_m - 1]} {target_y}"

        income_item = next(
            (
                t for t in monthly_trends_data
                if t['_id'].get('year') == target_y
                and t['_id'].get('month') == target_m
                and t['_id'].get('type') == 'income'
            ),
            None,
        )
        expense_item = next(
            (
                t for t in monthly_trends_data
                if t['_id'].get('year') == target_y
                and t['_id'].get('month') == target_m
                and t['_id'].get('type') == 'expense'
            ),
            None,
        )

        inc = round((income_item.get('totalPaise', 0) / 100.0), 2) if income_item else 0.0
        exp = round((expense_item.get('totalPaise', 0) / 100.0), 2) if expense_item else 0.0
        sav = round(inc - exp, 2)

        monthly_comparison.append({
            'month': label,
            'year': target_y,
            'monthIndex': target_m,
            'income': inc,
            'expense': exp,
            'savings': sav,
        })

    # 4. Payment Method Distribution
    payment_stats = list(transactions_col.aggregate([
        {'$match': {'userId': user_id}},
        {
            '$group': {
                '_id': '$paymentMethod',
                'totalPaise': {'$sum': '$amountInPaise'},
                'count': {'$sum': 1},
            }
        },
        {'$sort': {'totalPaise': DESCENDING}},
    ]))

    payment_methods = [
        {
            'name': p.get('_id') or 'Others',
            'amount': round(p.get('totalPaise', 0) / 100.0, 2),
            'count': p.get('count', 0),
        }
        for p in payment_stats
    ]

    return jsonify({
        'success': True,
        'timeframe': timeframe,
        'data': {
            'expenseByCategory': expense_by_category,
            'incomeByCategory': income_by_category,
            'monthlyComparison': monthly_comparison,
            'paymentMethods': payment_methods,
        },
    }), 200
