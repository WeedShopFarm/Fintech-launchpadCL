# Fintech Backend Application

This is a NestJS-based backend application for a fintech platform. It provides various functionalities related to user management, authentication, transactions, and accounts.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Modules](#modules)
- [Environment Variables](#environment-variables)
- [Testing](#testing)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/now10/fintech-launchpad.git
   cd fintech-launchpad/fintech-backend
   ```

2. Install the dependencies:
   ```
   npm install
   ```

## Usage

To start the application, run:
```
npm run start
```

The application will be running on `http://localhost:3000`.

## Modules

- **Auth Module**: Handles user authentication and token management.
- **Users Module**: Manages user-related functionalities.
- **Transactions Module**: Manages transaction-related functionalities.
- **Accounts Module**: Manages account-related functionalities.
- **Config Module**: Handles application configuration.

## Environment Variables

An example of the required environment variables can be found in the `.env.example` file. Make sure to create a `.env` file in the root directory and populate it with the necessary variables.

## Testing

End-to-end tests can be run using:
```
npm run test:e2e
```

Make sure to have the necessary configurations set in `test/jest-e2e.json`.

## License

This project is licensed under the MIT License. See the LICENSE file for details.