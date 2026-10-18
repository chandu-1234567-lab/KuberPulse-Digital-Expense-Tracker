"""
Authentication Blueprint (PyMongo)
Digital Expense Tracker API
"""

import re
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from pymongo import ReturnDocument
from db import users_col, serialize_user
from auth import hash_password, verify_password, generate_token, jwt_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

EMAIL_REGEX = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').lower().strip()
    password = data.get('password') or ''

    if not name:
        return jsonify({'success': False, 'message': 'Please provide a name'}), 400

    if not email or not re.match(EMAIL_REGEX, email):
        return jsonify({'success': False, 'message': 'Please provide a valid email address'}), 400

    if not password or len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400

    # Check if user already exists
    existing = users_col.find_one({'email': email})
    if existing:
        return jsonify({
            'success': False,
            'message': 'A user with this email address already exists'
        }), 400

    now = datetime.now(timezone.utc)
    new_user = {
        'name': name,
        'email': email,
        'password': hash_password(password),
        'createdAt': now,
        'updatedAt': now,
    }

    result = users_col.insert_one(new_user)
    new_user['_id'] = result.inserted_id

    token = generate_token(new_user['_id'])

    return jsonify({
        'success': True,
        'message': 'Registration successful',
        'token': token,
        'user': serialize_user(new_user),
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').lower().strip()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'success': False, 'message': 'Please provide email and password'}), 400

    user = users_col.find_one({'email': email})
    if not user or not verify_password(password, user.get('password', '')):
        return jsonify({'success': False, 'message': 'Invalid email or password credentials'}), 401

    token = generate_token(user['_id'])

    return jsonify({
        'success': True,
        'message': 'Login successful',
        'token': token,
        'user': serialize_user(user),
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required
def get_me():
    return jsonify({
        'success': True,
        'user': serialize_user(g.user),
    }), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required
def update_profile():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').lower().strip()

    update_fields = {'updatedAt': datetime.now(timezone.utc)}

    if name:
        update_fields['name'] = name

    if email and email != g.user.get('email'):
        if not re.match(EMAIL_REGEX, email):
            return jsonify({'success': False, 'message': 'Please provide a valid email address'}), 400

        # Check duplicate
        exists = users_col.find_one({'email': email, '_id': {'$ne': g.user['_id']}})
        if exists:
            return jsonify({
                'success': False,
                'message': 'This email is already in use by another account'
            }), 400

        update_fields['email'] = email

    updated_user = users_col.find_one_and_update(
        {'_id': g.user['_id']},
        {'$set': update_fields},
        return_document=ReturnDocument.AFTER,
    )

    return jsonify({
        'success': True,
        'message': 'Profile updated successfully',
        'user': serialize_user(updated_user),
    }), 200


@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required
def change_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get('currentPassword') or ''
    new_password = data.get('newPassword') or ''

    if not current_password or not new_password:
        return jsonify({
            'success': False,
            'message': 'Both current password and new password are required'
        }), 400

    if len(new_password) < 6:
        return jsonify({
            'success': False,
            'message': 'New password must be at least 6 characters long'
        }), 400

    if not verify_password(current_password, g.user.get('password', '')):
        return jsonify({
            'success': False,
            'message': 'Current password is incorrect'
        }), 400

    users_col.update_one(
        {'_id': g.user['_id']},
        {
            '$set': {
                'password': hash_password(new_password),
                'updatedAt': datetime.now(timezone.utc),
            }
        },
    )

    return jsonify({
        'success': True,
        'message': 'Password changed successfully'
    }), 200
