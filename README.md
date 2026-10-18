# Digital Expense Tracker — Production MERN Stack Web Application

A full-stack, responsive, fintech-grade **Digital Expense Tracker Web Application** built with **React.js, Node.js, Express.js, and MongoDB**.

The application helps users manage daily expenses, income streams, monthly budgets, savings goals, and financial transactions through interactive charts and real-time alerts.

---

## 1. Technology Stack

### Frontend
- **React.js (v19)** with **Vite**: Ultra-fast build tool and developer experience.
- **Tailwind CSS (v4)**: Modern utility-first styling with custom fintech color tokens and glassmorphism.
- **React Router (v7)**: Client-side routing with protected route guards and layout shells.
- **Axios**: HTTP client with automatic JWT Bearer token injection and global error interceptors.
- **Recharts**: Responsive financial visualizations (Pie charts, Bar charts, Area charts).
- **Lucide React**: Clean, modern iconography for financial navigation and indicators.

### Backend
- **Node.js & Express.js**: RESTful API architecture with modular routers and controllers.
- **JWT (JSON Web Tokens)**: Stateless token-based user authentication with 30-day persistence.
- **bcryptjs**: Salt-hashed password encryption (10 salt rounds).
- **Mongoose ODM**: Structured MongoDB schemas, indexes, validation, and virtual rupee conversion.
- **express-rate-limit**: API rate limiting against brute-force attacks on authentication endpoints.
- **CORS**: Secure cross-origin resource sharing.

### Database & Tooling
- **MongoDB Community Server**: Local high-performance NoSQL database running at `mongodb://127.0.0.1:27017`.
- **MongoDB Compass**: Official GUI client to inspect documents, schemas, and indexes.
- **Jest & Supertest**: Automated test suite covering auth, transactions, budgets, isolation, and calculations.

---

## 2. System Architecture & Project Structure

```text
Mongodb_ca2_project/
│
├── client/                               # Frontend React + Vite Application
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── axiosClient.js            # Axios client with JWT interceptor & base URL
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Badge.jsx             # Category & status badges with distinct colors
│   │   │   │   ├── ConfirmDialog.jsx     # Safe deletion modal
│   │   │   │   ├── Modal.jsx             # Accessible backdrop modal dialog
│   │   │   │   ├── StatCard.jsx          # Financial metric card with trends & glowing borders
│   │   │   │   └── Toast.jsx             # Floating toast notification system
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.jsx         # Global shell (sidebar + navbar + quick-add modal)
│   │   │   │   ├── Navbar.jsx            # Top navbar with quick action & theme toggle
│   │   │   │   └── Sidebar.jsx           # Responsive sidebar with active link styling
│   │   │   └── transactions/
│   │   │       └── TransactionFormModal.jsx # Add/Edit income & expense modal
│   │   ├── context/
│   │   │   ├── AuthContext.jsx           # User session, JWT persistence, login, register, logout
│   │   │   └── ThemeContext.jsx          # Dark / Light mode toggle with persistence
│   │   ├── pages/
│   │   │   ├── Analytics.jsx             # Recharts reports (Daily, Weekly, Monthly, Yearly)
│   │   │   ├── Budgets.jsx               # Budget planner with 80% warning and exceeded alerts
│   │   │   ├── Dashboard.jsx             # 5 core cards, 3 Recharts, budget progress, recent logs
│   │   │   ├── Expenses.jsx              # Dedicated expense management with category filters
│   │   │   ├── Income.jsx                # Dedicated income tracking & inflow streams
│   │   │   ├── Login.jsx                 # Fintech login with one-click demo credentials
│   │   │   ├── NotFound.jsx              # 404 error page
│   │   │   ├── Profile.jsx               # Profile, password change & MongoDB Compass guide
│   │   │   ├── Register.jsx              # User registration with password validation
│   │   │   └── Transactions.jsx          # Master table with search, filter, sort, pagination, CSV
│   │   ├── utils/
│   │   │   ├── constants.js              # Categories, payment methods, colors, chart palettes
│   │   │   └── formatters.js             # Indian numbering system currency (₹) & date formatters
│   │   ├── App.jsx                       # Route configuration & route guards
│   │   ├── index.css                     # Design system tokens, fonts, and dark theme
│   │   └── main.jsx                      # React 19 entry point
│   ├── index.html                        # Fonts, meta tags, and favicon
│   ├── package.json
│   └── vite.config.js                    # Vite configuration with Tailwind and API proxy
│
├── server/                               # Backend Express.js REST API
│   ├── config/
│   │   └── db.js                         # Mongoose connection with host and autoIndex
│   ├── controllers/
│   │   ├── authController.js             # Register, login, me, profile, change-password
│   │   ├── budgetController.js           # Budget CRUD, spending computation, 80% warnings
│   │   ├── dashboardController.js        # Summary cards, timeframe trends, category distribution
│   │   └── transactionController.js      # Transaction CRUD, search, filter, sort, pagination, CSV
│   ├── middleware/
│   │   ├── auth.js                       # JWT verification and req.user attachment
│   │   └── errorMiddleware.js            # 404 handler and centralized Mongoose/JWT error catcher
│   ├── models/
│   │   ├── Budget.js                     # Budget schema (unique category per month/year)
│   │   ├── Transaction.js                # Transaction schema with integer paise precision
│   │   └── User.js                       # User schema with bcrypt hash pre-save hook
│   ├── routes/
│   │   ├── authRoutes.js                 # Auth endpoints with express-rate-limit
│   │   ├── budgetRoutes.js               # Protected budget endpoints
│   │   ├── dashboardRoutes.js            # Protected dashboard summary & analytics endpoints
│   │   └── transactionRoutes.js          # Protected transaction endpoints
│   ├── tests/
│   │   └── api.test.js                   # 21 integration tests (Jest + Supertest)
│   ├── validators/
│   │   ├── authValidator.js              # Auth input validations
│   │   ├── budgetValidator.js            # Budget input validations
│   │   └── transactionValidator.js       # Transaction input validations & rupee-to-paise conversion
│   ├── .env.example                      # Sample environment variables
│   ├── .env                              # Active environment variables
│   ├── package.json
│   ├── seed.js                           # Seeder script for realistic demo records
│   └── server.js                         # Express server entry point
│
├── .gitignore
├── package.json                          # Root package.json for concurrent execution
└── README.md
```

---

## 3. Financial Calculations & Data Precision

### Integer Paise Precision
To eliminate floating-point rounding errors common in IEEE-754 arithmetic (e.g., `0.1 + 0.2 = 0.30000000000000004`):
1. All monetary figures are stored in the MongoDB database strictly in integer **paise** (`amountInPaise: 100000` = ₹1,000.00).
2. Incoming amounts in Rupees (e.g., `1450.50`) are parsed and converted using `Math.round(amount * 100)`.
3. Outgoing responses compute Rupee amounts via virtual properties and aggregate queries (`amountInPaise / 100`).

### Indian Numbering System
All amounts are formatted with the Indian Rupee symbol (`₹`) following the Indian numbering system:
- `₹1,50,000.00` (One Lakh Fifty Thousand)
- `₹10,00,000.00` (Ten Lakhs)
- `₹1,00,00,000.00` (One Crore)

---

## 4. Key Features

### 4.1 User Authentication & Data Isolation
- User registration with email format validation and minimum 6-character password check.
- Bcrypt password hashing with 10 salt rounds before database persistence.
- JWT token authentication stored securely in client localStorage with bearer authorization headers.
- Rate limiting on `/api/auth/register` and `/api/auth/login` to prevent brute-force attacks.
- Strict data isolation: Every database query filters by `userId: req.user._id` derived from the verified JWT.

### 4.2 Interactive Financial Dashboard
- **5 Summary StatCards**: Total Balance, Total Income, Total Expenses, Monthly Savings (with % savings rate), and Remaining Monthly Budget.
- **Monthly Income vs Expenses**: Dual-colored BarChart showing cash flow across months.
- **Expense Distribution**: PieChart with category color-coding and percentage breakdown.
- **Budget Consumption Progress**: Real-time progress bars with dynamic color shifts:
  - `< 80%`: Safe (Emerald green)
  - `80% - 100%`: Warning Badge (Amber warning)
  - `> 100%`: Exceeded Badge (Rose red)
- **Recent Transactions**: Instant log with category pills and formatted amounts.

### 4.3 Transaction Management
- Comprehensive data table with server-side pagination, search, category filters, payment method filters, and date range filters.
- Sorting by date or amount in ascending and descending orders.
- Modal forms for creating and editing transactions.
- Confirmation dialogs for safe deletion.
- **Export to CSV**: Download complete transaction histories directly into CSV files for spreadsheet analysis.

### 4.4 Income & Expense Modules
- **Income Management**: Dedicated view for Salaries, Freelancing, Business, Investments, and Gifts.
- **Expense Management**: Dedicated view for Food, Shopping, Transportation, Rent, Bills, Entertainment, Healthcare, Education, Travel, Groceries, and Others.

### 4.5 Budget Planner
- Monthly category budget allocations.
- Automatic computation of actual spend vs planned limits.
- Automated warning alerts whenever category spending exceeds 80% of its budget.
- Month and Year selector for reviewing historical and future budgets.

### 4.6 Analytics & Reports
- Filterable timeframes: **Daily (7 days)**, **Weekly (30 days)**, **Monthly (6 months)**, and **Yearly**.
- Net savings area charts visualizing surplus growth over time.
- Payment channels breakdown (UPI, Credit Card, Debit Card, Net Banking, Cash).

---

## 5. MongoDB Database Schemas

### Database Name
`digital_expense_tracker`

### Connection String
`mongodb://127.0.0.1:27017/digital_expense_tracker`

### Collections

#### 1. Users Collection (`users`)
```json
{
  "_id": "ObjectId",
  "name": "String (Required, Trim, Max 50)",
  "email": "String (Required, Unique, Lowercase, Regex validated)",
  "password": "String (Bcrypt hashed, Excluded by default in queries)",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

#### 2. Transactions Collection (`transactions`)
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (Ref: 'User', Indexed)",
  "type": "String (Enum: ['income', 'expense'])",
  "amountInPaise": "Number (Integer, Min: 1)",
  "category": "String (Required, Trim)",
  "description": "String (Required, Trim, Max 200)",
  "date": "ISODate (Default: Date.now, Indexed)",
  "paymentMethod": "String (Enum: ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash', 'Bank Transfer', 'Others'])",
  "notes": "String (Max 500)",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
*Virtual property:* `amount = amountInPaise / 100`

#### 3. Budgets Collection (`budgets`)
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (Ref: 'User', Indexed)",
  "category": "String (Required, Trim)",
  "monthlyLimitInPaise": "Number (Integer, Min: 100)",
  "month": "Number (1-12)",
  "year": "Number (e.g., 2026)",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```
*Compound Unique Index:* `{ userId: 1, category: 1, month: 1, year: 1 }` prevents duplicate category budgets for the same billing period.

---

## 6. Backend REST API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user | Public (Rate-limited) |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT | Public (Rate-limited) |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Private (Bearer JWT) |
| `PUT` | `/api/auth/profile` | Update user name or email | Private (Bearer JWT) |
| `PUT` | `/api/auth/change-password` | Change user password | Private (Bearer JWT) |

### Transactions
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/transactions` | List transactions (Search, filter, sort, paginate) | Private |
| `POST` | `/api/transactions` | Record a new transaction (Income/Expense) | Private |
| `GET` | `/api/transactions/:id` | Get single transaction by ID | Private |
| `PUT` | `/api/transactions/:id` | Update existing transaction | Private |
| `DELETE` | `/api/transactions/:id` | Delete transaction record | Private |
| `GET` | `/api/transactions/export/csv` | Export user transactions to CSV file | Private |

### Budgets
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/budgets` | Get monthly budgets with spent, remaining & 80% warnings | Private |
| `POST` | `/api/budgets` | Create category monthly budget limit | Private |
| `PUT` | `/api/budgets/:id` | Update budget limit | Private |
| `DELETE` | `/api/budgets/:id` | Delete budget limit | Private |

### Dashboard
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | Get 5 core financial cards, alerts, & recent records | Private |
| `GET` | `/api/dashboard/analytics` | Get Recharts datasets (category pie, cash flow bar, savings trend) | Private |

---

## 7. MongoDB Compass Connection Guide

### Understanding the Difference
- **MongoDB Community Server**: The background database engine daemon (`mongod`) that manages data storage, indexing, transactions, and network connections on port `27017`.
- **MongoDB Compass**: The visual GUI client used by developers and administrators to view databases, run visual queries, analyze indexes, and edit documents.

### Step-by-Step Connection Instructions

1. **Ensure MongoDB Community Server is Running**:
   On Windows, MongoDB runs as an automatic Windows Service named `MongoDB`. You can verify its status via PowerShell:
   ```powershell
   Get-Service -Name '*mongo*'
   ```
   If stopped, start it:
   ```powershell
   net start MongoDB
   ```

2. **Open MongoDB Compass**:
   Launch MongoDB Compass from your desktop or start menu.

3. **Connect to Local MongoDB Instance**:
   In the **New Connection** input box, enter the connection URI:
   ```text
   mongodb://127.0.0.1:27017
   ```
   Click the green **Connect** button.

4. **Locate the Database**:
   On the left sidebar, locate the `digital_expense_tracker` database.

5. **Inspect the Collections**:
   Click into `digital_expense_tracker` to view its three collections:
   - `users`: View registered user documents (passwords stored as `$2a$10$...` hashes).
   - `transactions`: View recorded income and expenses with `amountInPaise`.
   - `budgets`: View category limits and month/year indexes.

6. **Verify Real-Time Synchronization**:
   - Add a transaction in the web application (e.g. `₹500` for `Food`).
   - In MongoDB Compass, click the **Refresh** icon in the `transactions` collection.
   - Observe the new document appearing immediately with `amountInPaise: 50000`.
   - Edit or delete the transaction from the frontend, then refresh Compass to see the document update or delete in real-time.

---

## 8. Installation & Setup Instructions

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- MongoDB Community Server installed and running locally
- npm package manager

### 1. Clone or Open the Project
```bash
cd Mongodb_ca2_project
```

### 2. Install Dependencies
Run npm install in both the server and client folders:

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
cd ..
```

### 3. Backend Environment Configuration
The backend uses a `.env` file located in `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/digital_expense_tracker
JWT_SECRET=super_secret_jwt_key_expense_tracker_2026_finance_secure
CLIENT_URL=http://localhost:5173
```

### 4. Seed Realistic Demo Data (Optional but Recommended)
Populate the database with a pre-configured account having 20+ realistic transactions and budgets across multiple months:
```bash
cd server
npm run seed
cd ..
```

**Demo Account Credentials:**
- **Email:** `demo@expensetracker.in`
- **Password:** `Password@123`

*(You can also use the one-click "Fill Demo" button on the login page!)*

### 5. Running the Application
You can run both the Express backend and React frontend concurrently from the root directory:

```bash
npm run dev
```

Or run them individually in two separate terminals:

**Terminal 1 (Backend Server):**
```bash
cd server
npm run dev
# Server runs on: http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Client runs on: http://localhost:5173
```

---

## 9. Automated Testing

The project includes an integration test suite built with **Jest** and **Supertest**. It tests:
1. Input validation for registration and login
2. Duplicate email registration rejection
3. Bcrypt password verification and secret exclusion
4. JWT token generation and protected route verification
5. Expense creation, rupee-to-paise conversion, and validation
6. Income recording and net balance summary calculations
7. **Strict user data isolation** (verifying User 2 cannot read, edit, or delete User 1's records)
8. CSV report generation
9. Budget creation and **80% warning threshold triggers**
10. Budget **100% exceeded threshold triggers**
11. Dashboard summary and analytics aggregations

### Run Tests:
```bash
cd server
npm test
```

**Test Result Summary:**
```text
PASS tests/api.test.js
  Digital Expense Tracker API Comprehensive Test Suite
    Authentication Endpoints
      √ should validate registration input (missing required fields)
      √ should register a new user successfully (User 1)
      √ should prevent registering a duplicate email
      √ should register User 2 for data isolation testing
      √ should login User 1 with correct credentials
      √ should fail login with incorrect password
      √ should fetch current authenticated user profile via /api/auth/me
      √ should deny access without bearer token (Unauthorized test)
    Transactions & Financial Operations
      √ should create an expense and store in integer paise
      √ should validate transaction input (reject invalid category)
      √ should create an income transaction
      √ should calculate correct income, expense, and net balance summary
      √ should update an existing expense
      √ should verify data isolation: User 2 cannot access or view User 1 transactions
      √ should export transactions as CSV format
      √ should delete an expense
    Budget Planning and Spending Calculations
      √ should create a budget with monthly limit of ₹10,000 for Food in Oct 2026
      √ should trigger warning when spending exceeds 80% (₹8,500 spent of ₹10,000 = 85%)
      √ should trigger exceeded status when spending exceeds 100%
    Dashboard Analytics & Summaries
      √ should return complete dashboard summary statistics
      √ should return analytics charts data (category distribution, monthly comparison)

Test Suites: 1 passed, 1 total
Tests:       21 passed, 21 total
```

---

## 10. Summary of Deliverables

- **Complete Frontend Source Code**: Responsive React + Vite application with Tailwind CSS, Lucide icons, Recharts dashboards, dark/light themes, and CSV export.
- **Complete Backend Source Code**: Production Express.js server with RESTful routes, JWT authentication, rate limiting, and centralized error handling.
- **MongoDB Schemas**: Validated Mongoose models with integer paise precision, indexing, and compound unique constraints.
- **Working REST APIs**: 14+ endpoints covering Authentication, Transactions, Budgets, and Dashboard analytics.
- **Automated Test Suite**: 21 passing Jest tests verifying security, calculations, and data isolation.
- **Compass & Community Server Integration**: Complete setup instructions and verified connectivity on `mongodb://127.0.0.1:27017`.
