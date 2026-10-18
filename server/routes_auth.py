"""
Authentication Blueprint (PyMongo)
Digital Expense Tracker API
"""

import re
import secrets
from datetime import datetime, timezone, timedelta
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


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').lower().strip()

    if not email or not re.match(EMAIL_REGEX, email):
        return jsonify({'success': False, 'message': 'Please provide a valid email address'}), 400

    user = users_col.find_one({'email': email})
    if not user:
        return jsonify({'success': False, 'message': 'No account found with this email address'}), 404

    # Generate 6-digit secure numeric verification code
    reset_code = f"{secrets.randbelow(900000) + 100000}"
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=15)

    users_col.update_one(
        {'_id': user['_id']},
        {
            '$set': {
                'resetPasswordCode': reset_code,
                'resetPasswordExpires': expires_at,
                'updatedAt': now,
            }
        }
    )

    return jsonify({
        'success': True,
        'message': 'Password reset verification code generated successfully.',
        'code': reset_code,
        'expiresInMinutes': 15,
        'email': email,
    }), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').lower().strip()
    code = (data.get('code') or '').strip()
    new_password = data.get('newPassword') or ''

    if not email:
        return jsonify({'success': False, 'message': 'Email address is required'}), 400

    if not code:
        return jsonify({'success': False, 'message': '6-digit verification code is required'}), 400

    if not new_password or len(new_password) < 6:
        return jsonify({'success': False, 'message': 'New password must be at least 6 characters long'}), 400

    user = users_col.find_one({'email': email})
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    stored_code = user.get('resetPasswordCode')
    stored_expires = user.get('resetPasswordExpires')

    if not stored_code or stored_code != code:
        return jsonify({'success': False, 'message': 'Invalid verification code. Please check and try again.'}), 400

    now = datetime.now(timezone.utc)
    if stored_expires:
        if isinstance(stored_expires, datetime):
            exp_tz = stored_expires if stored_expires.tzinfo else stored_expires.replace(tzinfo=timezone.utc)
            if exp_tz < now:
                return jsonify({'success': False, 'message': 'Verification code has expired. Please request a new one.'}), 400

    # Hash new password and clear reset code
    new_hash = hash_password(new_password)
    users_col.update_one(
        {'_id': user['_id']},
        {
            '$set': {
                'password': new_hash,
                'updatedAt': now,
            },
            '$unset': {
                'resetPasswordCode': '',
                'resetPasswordExpires': '',
            }
        }
    )

    return jsonify({
        'success': True,
        'message': 'Password reset successful! You can now log in with your new password.',
    }), 200

