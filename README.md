# AIMConstruction-Backend 

-------- Written By :  https://github.com/mohammadsheakh 


Template Used :  Typescript Backend Boilerplate  https://github.com/bdCalling-Sdt-hub/typescript-backend-boilerplate


I use Inheritance...  Example:: All Service inherits from GenericService.  and Generic Programming here .. 



-------- Written By :  https://github.com/rakibislam2233

backend applications using **Node.js**, **Express**, **TypeScript**, **Mongoose**, **JWT**, **Bcrypt**, **Stripe**, and more. It aims to reduce setup time for new backend projects by providing a preconfigured environment.

## Features

- **Authentication**: Complete system for user registration, login, JWT token-based authentication, and password hashing using **Bcrypt**.
- **File Upload**: Handle file uploads (e.g., profile images) with **Multer**.
- **Rate Limiting**: Protect your app from brute-force attacks using **express-rate-limit**.
- **Logging**: Log API requests and errors with **Winston** and **daily log rotation**.
- **Job Queues**: **Bull** for handling background jobs and task queuing.
- **Email Integration**: Sending emails through **NodeMailer**.
- **CSV Parsing**: Parse CSV files into JSON format using **csv-parser** and **convert-csv-to-json**.
- **Data Validation**: Validate user input using **Zod** and Mongoose schemas.
- **Security**: Use **helmet** for security headers and **xss-clean** for input sanitization.
- **Environment Configuration**: Configure your app easily with environment variables using **dotenv**.

## Tech Stack

- **TypeScript**
- **Node.js**
- **Express**
- **Mongoose**
- **Bcrypt**
- **JWT**
- **NodeMailer**
- **Multer**
- **Logger**
- **Stripe**
- **Winston**
- **dotenv**
- **express-rate-limit**
- **helmet**
- **csv-parser**
- **xss-clean**
- **zod**
- **Socket**

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js**
- **npm** or **yarn**

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/typescript-backend-boilerplate.git
   cd typescript-backend-boilerplate

   ```

2. **Install dependencies:**

   Using npm:

   ```bash
   npm install
   ```

   Using yarn:

   ```bash
   yarn install
   ```

3. **Create a `.env` file:**

In the root directory of the project, create a `.env` file and add the following variables. Adjust the values according to your setup.

```env
# Database Configuration

MONGODB_URL=your_mongodb_url

# JWT Configuration

JWT_ACCESS_SECRET=YOUR_ACCESS_SECRET
JWT_REFRESH_SECRET=YOUR_REFRESH_SECRET
JWT_ACCESS_EXPIRATION_TIME=5d
JWT_REFRESH_EXPIRATION_TIME=365d

# Verify Email and Token

TOKEN_SECRET=YOUR_TOKEN_SECRET
VERIFY_EMAIL_TOKEN_EXPIRATION_TIME=10m
RESET_PASSWORD_TOKEN_EXPIRATION_TIME=5m

# Authentication Settings

MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=1

# OTP Configuration

VERIFY_EMAIL_OTP_EXPIRATION_TIME=10
RESET_PASSWORD_OTP_EXPIRATION_TIME=5
MAX_OTP_ATTEMPTS=5
ATTEMPT_WINDOW_MINUTES=3

# Bcrypt Configuration

BCRYPT_SALT_ROUNDS=12

# SMTP Email Configuration

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=YOUR_SMTP_EMAIL
SMTP_PASSWORD=YOUR_SMTP_PASSWORD
EMAIL_FROM=YOUR_SMTP_EMAIL

# Client URL

CLIENT_URL=http://localhost:3000

# Backend IP

BACKEND_IP=YOUR_BACKEND_IP

# Stripe Configuration

STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET
```

4. **Run the project:**

Using npm:

```bash
npm run dev
```

Using yarn:

```bash
yarn run dev
```

### Running the Tests

Explain how to run the automated tests for this system.

```bash
npm test
```
