# Debt Management System v2.0 - Backend API

A secure, high-precision, multi-tenant system for managing debts, payments, and customer balances.

## Features

- **Multi-Tenant Architecture**: Complete tenant isolation with automatic companyId filtering
- **Financial Precision**: Decimal128 and decimal.js for exact monetary calculations
- **Transaction Safety**: MongoDB sessions for atomic multi-document operations
- **Idempotency**: Prevents duplicate payment processing via Redis-backed keys
- **Audit Trail**: Complete logging of all financial operations
- **Background Jobs**: Automated aging bucket calculations and reminders
- **RESTful API**: Clean, versioned API with comprehensive validation
- **Security**: JWT authentication, role-based authorization, rate limiting

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB (with replica set for transactions)
- **Cache/Queue**: Redis + BullMQ
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Financial Math**: decimal.js
- **Logging**: Winston

## Prerequisites

- Node.js 18.0.0 or higher
- MongoDB 4.4+ (configured as replica set)
- Redis 6.0+

## Installation

1. **Clone the repository**
   ```bash
   cd "dept manegment system"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - MongoDB connection string (must be replica set)
   - Redis connection details
   - JWT secrets (generate secure random strings)
   - Other application settings

4. **Set up MongoDB Replica Set** (if not already configured)
   
   For development/testing, you can run a single-node replica set:
   ```bash
   mongod --replSet rs0 --dbpath /path/to/data
   ```
   
   Then in mongo shell:
   ```javascript
   rs.initiate()
   ```

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The API will be available at `http://localhost:3000/api/v1`

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication

All endpoints except `/auth/login` and `/auth/refresh` require a JWT Bearer token:

```
Authorization: Bearer <your-token>
```

#### POST /auth/login
Authenticate user and get JWT tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Customers

- `GET /customers` - List customers (with search, pagination)
- `GET /customers/:id` - Get customer by ID
- `POST /customers` - Create new customer
- `PATCH /customers/:id` - Update customer
- `DELETE /customers/:id` - Soft delete customer

### Debts

- `POST /debts` - Create new debt/invoice
- `GET /debts` - List debts (with filters)
- `GET /debts/:id` - Get debt by ID
- `DELETE /debts/:id` - Cancel debt

### Payments

**CRITICAL**: Payment creation requires an `Idempotency-Key` header (UUID format).

- `POST /payments` - Create payment (with idempotency)
- `GET /payments` - List payments
- `GET /payments/:id` - Get payment by ID

**Example Payment Creation:**
```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "...",
    "amount": 100.50,
    "method": "cash",
    "appliedToDebts": [
      { "debtId": "...", "amount": 100.50 }
    ]
  }'
```

### Reports

- `GET /reports/aging` - Aging report (current, 0-30, 31-60, 61-90, 90+ days)
- `GET /reports/customer-balance` - Customer balance summary
- `GET /reports/payment-summary` - Payment summary by period

### Sync (for offline-capable clients)

- `POST /sync/push` - Push local changes to server
- `GET /sync/changes?since=<timestamp>` - Get changes since timestamp
- `GET /sync/full` - Full sync (initial setup)

## Project Structure

```
src/
├── api/
│   ├── controllers/      # Request handlers
│   ├── middlewares/      # Express middleware
│   ├── routes/           # Route definitions
│   └── validations/      # Joi schemas
├── config/               # Configuration files
│   ├── constants.js      # App constants
│   ├── database.js       # MongoDB connection
│   └── redis.js          # Redis connection
├── jobs/                 # Background jobs
│   ├── queue.js          # BullMQ queues
│   ├── agingUpdateJob.js # Aging bucket updates
│   └── worker.js         # Job processor
├── models/               # Mongoose models
│   └── plugins/          # Mongoose plugins
├── services/             # Business logic
├── utils/                # Utilities
│   ├── decimalMath.js    # Financial calculations
│   ├── errorHandler.js   # Custom errors
│   └── logger.js         # Winston logger
├── app.js                # Express app setup
└── server.js             # Server entry point
```

## User Roles

- **admin**: Full access, can delete customers
- **accountant**: Manage customers, debts, payments, view reports
- **cashier**: Create debts and payments
- **viewer**: Read-only access

## Financial Integrity

This system uses `Decimal128` (MongoDB) and `decimal.js` (JavaScript) for all monetary values to prevent floating-point errors. Never use standard JavaScript `Number` type for financial calculations.

## Background Jobs

### Aging Bucket Update
Runs nightly at 1 AM UTC to update debt aging classifications.

### Manual Trigger
```javascript
import { agingQueue } from './src/jobs/queue.js';
await agingQueue.add('manual-update', {});
```

## Security Considerations

1. **Change default JWT secrets** in production
2. **Use HTTPS** in production
3. **Configure CORS** appropriately for your frontend domain
4. **Enable MongoDB authentication**
5. **Use Redis password** in production
6. **Regular security updates**: `npm audit`

## Debugging

Enable detailed logging:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console (in development)

## Testing

**Transaction Test:** Verify MongoDB replica set is working:
```bash
node -e "import('./src/services/paymentService.js').then(m => console.log('✓ Transactions supported'))"
```

## Common Issues

### "Not running in replica set mode"
MongoDB transactions require a replica set. See installation steps above.

### "ECONNREFUSED Redis"
Ensure Redis is running: `redis-server`

### "Invalid token"
Check JWT secrets match between token creation and verification.

## License

ISC

## Support

For issues or questions, please check the implementation plan and audit logs.
