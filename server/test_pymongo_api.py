"""
Automated PyMongo API Integration Test Suite
Validates all endpoints without requiring an active external port
"""

import sys
import unittest
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app import app


class PyMongoAPITestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_01_health_check(self):
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'online')
        self.assertIn('PyMongo', data.get('backend', ''))

    def test_02_login_demo_user(self):
        res = self.client.post(
            '/api/auth/login',
            data=json.dumps({
                'email': 'demo@expensetracker.in',
                'password': 'Password@123',
            }),
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertIn('token', data)
        PyMongoAPITestCase.token = data['token']
        PyMongoAPITestCase.user_id = data['user']['_id']

    def test_03_get_me(self):
        res = self.client.get(
            '/api/auth/me',
            headers={'Authorization': f'Bearer {self.token}'},
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data['user']['email'], 'demo@expensetracker.in')

    def test_04_get_transactions(self):
        res = self.client.get(
            '/api/transactions?page=1&limit=5',
            headers={'Authorization': f'Bearer {self.token}'},
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertGreater(data['pagination']['total'], 0)
        self.assertIn('summary', data)
        self.assertIn('totalIncome', data['summary'])

    def test_05_create_and_delete_transaction(self):
        # Create
        res = self.client.post(
            '/api/transactions',
            headers={'Authorization': f'Bearer {self.token}'},
            data=json.dumps({
                'type': 'expense',
                'amountInPaise': 35000,
                'category': 'Food',
                'description': 'PyMongo Test Expense',
                'paymentMethod': 'UPI',
                'notes': 'Unit test verified',
            }),
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 201)
        created = res.get_json()['transaction']
        trans_id = created['_id']
        self.assertEqual(created['amount'], 350.0)

        # Update
        put_res = self.client.put(
            f'/api/transactions/{trans_id}',
            headers={'Authorization': f'Bearer {self.token}'},
            data=json.dumps({'notes': 'Updated note'}),
            content_type='application/json',
        )
        self.assertEqual(put_res.status_code, 200)

        # Delete
        del_res = self.client.delete(
            f'/api/transactions/{trans_id}',
            headers={'Authorization': f'Bearer {self.token}'},
        )
        self.assertEqual(del_res.status_code, 200)

    def test_06_csv_export(self):
        res = self.client.get(
            '/api/transactions/export/csv',
            headers={'Authorization': f'Bearer {self.token}'},
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn('text/csv', res.headers.get('Content-Type', ''))
        self.assertIn('Transaction ID,Date,Type', res.data.decode('utf-8'))

    def test_07_budgets_endpoints(self):
        res = self.client.get(
            '/api/budgets',
            headers={'Authorization': f'Bearer {self.token}'},
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertIn('budgets', data)
        self.assertIn('summary', data)

    def test_08_dashboard_summary(self):
        res = self.client.get(
            '/api/dashboard/summary',
            headers={'Authorization': f'Bearer {self.token}'},
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()['data']
        self.assertIn('totalBalance', data)
        self.assertIn('monthlyIncome', data)
        self.assertIn('recentTransactions', data)
        self.assertIn('budgetProgress', data)

    def test_09_dashboard_analytics(self):
        res = self.client.get(
            '/api/dashboard/analytics?timeframe=monthly',
            headers={'Authorization': f'Bearer {self.token}'},
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()['data']
        self.assertIn('expenseByCategory', data)
        self.assertIn('incomeByCategory', data)
        self.assertIn('monthlyComparison', data)
        self.assertIn('paymentMethods', data)


if __name__ == '__main__':
    unittest.main()
