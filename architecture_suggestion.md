# Backend Architecture Refactoring Suggestion

## Overview

This document proposes a refactoring of the `cadastro-de-usuarios-backend` from a single-file architecture to a well-structured **MVC pattern** following Express.js and Prisma best practices (sourced from Context7 documentation).

---

## Current State Analysis

### Current Structure
```
cadastro-de-usuarios-backend/
├── server.js          # ALL code here (~100 lines)
├── package.json
└── prisma/
    └── schema.prisma
```

### Tech Stack
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Express.js | 5.1.0 |
| ORM | Prisma | 6.18.0 |
| Database | MongoDB | - |
| Module System | ES Modules | - |

### Current Issues

| Issue | Description | Impact |
|-------|-------------|--------|
| No separation of concerns | Routes, validation, database queries all in one file | Hard to maintain and test |
| No controller layer | Business logic embedded in route handlers | No reusability |
| No service layer | Prisma queries directly in routes | Tight coupling |
| Inconsistent validation | Only POST has validation; PUT/DELETE have none | Data integrity issues |
| Incomplete error handling | PUT route has no try-catch | App crashes on errors |
| Query filter bug | `if(req.query)` always true (empty object) | Filter logic broken |
| Wrong status codes | PUT returns 201 instead of 200 | API inconsistency |

---

## Proposed Architecture

### New Folder Structure

```
cadastro-de-usuarios-backend/
├── src/
│   ├── app.js                      # Express app configuration
│   ├── server.js                   # Server entry point (minimal)
│   │
│   ├── config/
│   │   └── database.js             # Prisma client singleton
│   │
│   ├── routes/
│   │   ├── index.js                # Route aggregator
│   │   └── user.routes.js          # User-specific routes
│   │
│   ├── controllers/
│   │   └── user.controller.js      # HTTP request/response handling
│   │
│   ├── services/
│   │   └── user.service.js         # Business logic layer
│   │
│   ├── repositories/
│   │   └── user.repository.js      # Data access layer (Prisma queries)
│   │
│   ├── middlewares/
│   │   ├── error.middleware.js     # Centralized error handler
│   │   └── validate.middleware.js  # Validation middleware
│   │
│   ├── validators/
│   │   └── user.validator.js       # express-validator schemas
│   │
│   ├── errors/
│   │   ├── AppError.js             # Custom error class
│   │   └── index.js                # Error types export
│   │
│   └── utils/
│       └── asyncHandler.js         # Async wrapper utility
│
├── prisma/
│   └── schema.prisma               # (unchanged)
│
└── package.json
```

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│                        HTTP Request                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ROUTES (user.routes.js)                                    │
│  - Define endpoints                                          │
│  - Connect validators to controllers                         │
│  - No business logic                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  VALIDATORS (user.validator.js)                              │
│  - Input validation with express-validator                   │
│  - Sanitization                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  CONTROLLERS (user.controller.js)                            │
│  - Handle HTTP request/response                              │
│  - Call services                                             │
│  - Format responses                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  SERVICES (user.service.js)                                  │
│  - Business logic                                            │
│  - Validation rules                                          │
│  - Orchestration                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  REPOSITORIES (user.repository.js)                           │
│  - Data access only                                          │
│  - All Prisma queries isolated here                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        MongoDB                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Database Configuration

**File: `src/config/database.js`**

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
```

---

### 2. Error Classes

**File: `src/errors/AppError.js`**

```javascript
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

**File: `src/errors/index.js`**

```javascript
export { AppError } from './AppError.js';

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos', errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito de dados') {
    super(message, 409);
  }
}
```

---

### 3. Utility Functions

**File: `src/utils/asyncHandler.js`**

```javascript
// Wraps async functions to automatically catch errors
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

---

### 4. Repository Layer

**File: `src/repositories/user.repository.js`**

```javascript
import prisma from '../config/database.js';

export class UserRepository {
  async create(data) {
    return prisma.user.create({ data });
  }

  async findAll(where) {
    return prisma.user.findMany({ where });
  }

  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  async update(id, data) {
    return prisma.user.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.user.delete({ where: { id } });
  }
}
```

---

### 5. Service Layer

**File: `src/services/user.service.js`**

```javascript
import { UserRepository } from '../repositories/user.repository.js';
import { NotFoundError, ConflictError } from '../errors/index.js';

export class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  async create(userData) {
    // Check for duplicate email
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictError('E-mail já cadastrado');
    }
    return this.userRepository.create(userData);
  }

  async findAll(filters) {
    const cleanFilters = this.sanitizeFilters(filters);
    return this.userRepository.findAll(cleanFilters);
  }

  async findById(id) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }
    return user;
  }

  async update(id, userData) {
    // Ensure user exists before update
    await this.findById(id);

    // Check for duplicate email if email is being updated
    if (userData.email) {
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictError('E-mail já cadastrado');
      }
    }

    return this.userRepository.update(id, userData);
  }

  async delete(id) {
    // Ensure user exists before delete
    await this.findById(id);
    return this.userRepository.delete(id);
  }

  // Fix for the query filter bug
  sanitizeFilters(filters) {
    const allowed = ['name', 'email', 'age'];
    const sanitized = {};

    for (const key of allowed) {
      if (filters[key] !== undefined && filters[key] !== '') {
        sanitized[key] = filters[key];
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }
}
```

---

### 6. Controller Layer

**File: `src/controllers/user.controller.js`**

```javascript
import { UserService } from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export class UserController {
  constructor() {
    this.userService = new UserService();
  }

  create = asyncHandler(async (req, res) => {
    const user = await this.userService.create(req.body);
    res.status(201).json(user);
  });

  findAll = asyncHandler(async (req, res) => {
    const filters = req.query;
    const users = await this.userService.findAll(filters);
    res.status(200).json(users);
  });

  findById = asyncHandler(async (req, res) => {
    const user = await this.userService.findById(req.params.id);
    res.status(200).json(user);
  });

  update = asyncHandler(async (req, res) => {
    const user = await this.userService.update(req.params.id, req.body);
    res.status(200).json(user); // Fixed: was 201, should be 200
  });

  delete = asyncHandler(async (req, res) => {
    await this.userService.delete(req.params.id);
    res.status(200).json({ message: 'Usuário deletado com sucesso!' });
  });
}
```

---

### 7. Validators

**File: `src/validators/user.validator.js`**

```javascript
import { body, param, query } from 'express-validator';

export const createUserValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('E-mail é obrigatório')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),

  body('name')
    .trim()
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres')
    .escape(),

  body('age')
    .notEmpty().withMessage('Idade é obrigatória')
    .isInt({ min: 1, max: 150 }).withMessage('Idade deve ser um número entre 1 e 150')
    .toInt()
    .customSanitizer(value => String(value)) // Convert to string for MongoDB
];

export const updateUserValidator = [
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres')
    .escape(),

  body('age')
    .optional()
    .isInt({ min: 1, max: 150 }).withMessage('Idade deve ser um número entre 1 e 150')
    .toInt()
    .customSanitizer(value => String(value))
];

export const idParamValidator = [
  param('id')
    .notEmpty().withMessage('ID é obrigatório')
    .isMongoId().withMessage('ID inválido')
];

export const queryFiltersValidator = [
  query('name').optional().trim().escape(),
  query('email').optional().trim().isEmail().normalizeEmail(),
  query('age').optional().isInt({ min: 1 }).toInt()
];
```

---

### 8. Middlewares

**File: `src/middlewares/validate.middleware.js`**

```javascript
import { validationResult } from 'express-validator';
import { ValidationError } from '../errors/index.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));

    throw new ValidationError('Dados inválidos', errorMessages);
  }

  next();
};
```

**File: `src/middlewares/error.middleware.js`**

```javascript
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/index.js';

export const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', err);

  // Handle Prisma-specific errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors })
    });
  }

  // Handle unexpected errors
  return res.status(500).json({
    success: false,
    message: 'Erro interno do servidor'
  });
};

function handlePrismaError(err, res) {
  switch (err.code) {
    case 'P2002': // Unique constraint violation
      return res.status(409).json({
        success: false,
        message: 'E-mail já cadastrado'
      });

    case 'P2025': // Record not found
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });

    default:
      return res.status(500).json({
        success: false,
        message: 'Erro de banco de dados'
      });
  }
}
```

---

### 9. Routes

**File: `src/routes/user.routes.js`**

```javascript
import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import {
  createUserValidator,
  updateUserValidator,
  idParamValidator
} from '../validators/user.validator.js';
import { validate } from '../middlewares/validate.middleware.js';

const router = Router();
const userController = new UserController();

router.route('/')
  .get(userController.findAll)
  .post(createUserValidator, validate, userController.create);

router.route('/:id')
  .get(idParamValidator, validate, userController.findById)
  .put(idParamValidator, updateUserValidator, validate, userController.update)
  .delete(idParamValidator, validate, userController.delete);

export default router;
```

**File: `src/routes/index.js`**

```javascript
import userRoutes from './user.routes.js';

export default {
  userRoutes
};
```

---

### 10. Application Entry Points

**File: `src/app.js`**

```javascript
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/usuarios', routes.userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;
```

**File: `src/server.js`**

```javascript
import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Package.json Updates

```json
{
  "name": "projeto-fullstack",
  "version": "1.0.0",
  "description": "User registration API with MVC architecture",
  "main": "src/server.js",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.18.0",
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "express-validator": "^7.0.1"
  },
  "devDependencies": {
    "prisma": "^6.18.0"
  }
}
```

---

## Migration Steps

### Phase 1: Setup Foundation
```bash
# Install new dependency
npm install express-validator

# Create folder structure
mkdir -p src/config src/routes src/controllers src/services src/repositories src/middlewares src/validators src/errors src/utils
```

### Phase 2: Create Files (in order)
1. `src/config/database.js`
2. `src/errors/AppError.js`
3. `src/errors/index.js`
4. `src/utils/asyncHandler.js`
5. `src/repositories/user.repository.js`
6. `src/services/user.service.js`
7. `src/controllers/user.controller.js`
8. `src/validators/user.validator.js`
9. `src/middlewares/validate.middleware.js`
10. `src/middlewares/error.middleware.js`
11. `src/routes/user.routes.js`
12. `src/routes/index.js`
13. `src/app.js`
14. `src/server.js`

### Phase 3: Update Configuration
1. Update `package.json` with new scripts and dependencies
2. Test all endpoints
3. Delete old root `server.js`

---

## Verification Checklist

### API Endpoints Testing

| Method | Endpoint | Test Cases |
|--------|----------|------------|
| POST | `/usuarios` | Valid data, missing fields, invalid email, duplicate email |
| GET | `/usuarios` | No filters, with name filter, with email filter |
| GET | `/usuarios/:id` | Valid ID, invalid format, non-existent |
| PUT | `/usuarios/:id` | Partial update, invalid data, non-existent |
| DELETE | `/usuarios/:id` | Existing user, non-existent |

### Error Responses Testing

| Scenario | Expected Status | Expected Message |
|----------|-----------------|------------------|
| Duplicate email | 409 | "E-mail já cadastrado" |
| Invalid ID format | 400 | "ID inválido" |
| User not found | 404 | "Usuário não encontrado" |
| Missing required field | 400 | Field-specific message |
| Invalid email format | 400 | "E-mail inválido" |

---

## Benefits After Refactoring

| Benefit | Description |
|---------|-------------|
| **Testability** | Each layer can be unit tested independently |
| **Maintainability** | Changes isolated to specific files |
| **Scalability** | Easy to add new entities (copy the pattern) |
| **Security** | Centralized validation and sanitization |
| **Error Handling** | Consistent error responses across all endpoints |
| **Separation of Concerns** | Clear responsibility boundaries |
| **Best Practices** | Follows Express.js and Prisma official recommendations |

---

## Code Organization Patterns

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case with suffix | `user.controller.js` |
| Classes | PascalCase | `UserController` |
| Methods | camelCase | `findById` |
| Constants | UPPER_SNAKE_CASE | `MAX_AGE` |

### HTTP Status Codes

| Status | Usage |
|--------|-------|
| 200 | GET, PUT, DELETE success |
| 201 | POST success (resource created) |
| 400 | Validation errors |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 500 | Server errors |

### Response Format

```javascript
// Success (single resource)
{ id: "...", email: "...", name: "...", age: "..." }

// Success (collection)
[{ id: "...", ... }, { id: "...", ... }]

// Success (action)
{ message: "Usuário deletado com sucesso!" }

// Error
{
  success: false,
  message: "Error message",
  errors: [{ field: "email", message: "E-mail inválido" }]
}
```

---

## References

- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Prisma Best Practices](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections)
- [Express Validator Documentation](https://express-validator.github.io/docs/)

---

*Document generated based on Context7 documentation analysis for Express.js 5.x and Prisma 6.x*
