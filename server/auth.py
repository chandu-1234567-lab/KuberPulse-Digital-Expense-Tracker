"""
Authentication and Authorization Module
JWT verification & bcrypt password encryption
"""

import os
import functools
from datetime import datetime, timedelta, timezone
import jwt
import bcrypt
from flask import request, jsonify, g
from bson import ObjectId
from db import users_col

JWT_SECRET = os.getenv('JWT_SECRET', 'super_secret_jwt_key_expense_tracker_2026_finance_secure')
JWT_ALGORITHM = 'HS256'


def hash_password(password: str) -> str:
    """Hash plaintext password using bcrypt with 10 salt rounds"""
    salt = bcrypt.gensalt(10)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against bcrypt hash"""
    try:
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password)
    except Exception:
        return False


def generate_token(user_id: str) -> str:
    """Generate JWT token valid for 30 days"""
    payload = {
        'id': str(user_id),
        'exp': datetime.now(timezone.utc) + timedelta(days=30),
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def jwt_required(f):
    """
    Decorator for protected routes verifying the Bearer token in headers
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', None)
        if not auth_header:
            return jsonify({
                'success': False,
                'message': 'Not authorized, no token provided'
            }), 401

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({
                'success': False,
                'message': 'Not authorized, invalid token format'
            }), 401

        token = parts[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get('id')
            if not user_id:
                return jsonify({
                    'success': False,
                    'message': 'Token missing user identity'
                }), 401

            user = users_col.find_one({'_id': ObjectId(user_id)})
            if not user:
                return jsonify({
                    'success': False,
                    'message': 'User no longer exists'
                }), 401

            g.user = user
        except jwt.ExpiredSignatureError:
            return jsonify({
                'success': False,
                'message': 'Session expired, please log in again'
            }), 401
        except (jwt.InvalidTokenError, Exception) as e:
            return jsonify({
                'success': False,
                'message': f'Not authorized: {str(e)}'
            }), 401

        return f(*args, **kwargs)

    return decorated
