"""
Digital Expense Tracker — Python & PyMongo REST API Server
MongoDB Continuous Assessment 2 (CA2) Project
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from db import init_indexes
from routes_auth import auth_bp
from routes_transactions import transactions_bp
from routes_budgets import budgets_bp
from routes_dashboard import dashboard_bp

app = Flask(__name__)

# Configure CORS
allowed_origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]
client_url = os.getenv('CLIENT_URL')
if client_url and client_url not in allowed_origins:
    allowed_origins.append(client_url)

CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)

# Initialize MongoDB PyMongo indexes
init_indexes()

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(transactions_bp)
app.register_blueprint(budgets_bp)
app.register_blueprint(dashboard_bp)


# Root Health Check & API Directory
@app.route('/', methods=['GET'])
def root_index():
    return jsonify({
        'status': 'online',
        'project': 'Digital Expense Tracker API',
        'backend': 'Python / Flask with PyMongo Driver',
        'database': 'digital_expense_tracker (MongoDB 8.x)',
        'version': '1.0.0',
        'endpoints': {
            'auth': '/api/auth (register, login, me, profile, change-password)',
            'transactions': '/api/transactions (CRUD, pagination, filters, export/csv)',
            'budgets': '/api/budgets (CRUD, spending tracking, 80% alerts)',
            'dashboard': '/api/dashboard (summary, analytics)',
        },
    }), 200


# 404 Error Handler
@app.errorhandler(404)
def not_found_handler(e):
    return jsonify({
        'success': False,
        'message': 'Resource not found',
    }), 404


# 500 Central Error Handler
@app.errorhandler(500)
def server_error_handler(e):
    return jsonify({
        'success': False,
        'message': f'Internal Server Error: {str(e)}',
    }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f'[Server] Digital Expense Tracker PyMongo API running on port {port}')
    print(f'[Server] Connected to MongoDB database: digital_expense_tracker')
    app.run(host='0.0.0.0', port=port, debug=True)
