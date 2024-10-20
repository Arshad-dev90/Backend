# VideoTube

VideoTube is a video sharing platform built with Node.js, Express, and MongoDB. This project includes user authentication, video upload, and management functionalities.

## Project Structure

- `src/models/user-models.js`: Defines the user schema and methods for password hashing, token generation, and user authentication.
- `src/app.js`: Sets up the Express application, middleware, and routes.
- `src/middlewares/auth-middleware.js`: Contains middleware for verifying JWT tokens and handling authentication.
- `src/controllers/user-controller.js`: Handles user-related operations such as registration, login, logout, and token refresh.
- `.env`: Environment variables for configuration, including database URI, JWT secrets, and Cloudinary credentials.

## User Model

The user model (`src/models/user-models.js`) defines the schema for user documents in MongoDB. It includes fields for username, email, fullname, avatar, cover image, watch history, password, and refresh token. The model also includes methods for password hashing, token generation, and password validation.

## Authentication Middleware

The authentication middleware (`src/middlewares/auth-middleware.js`) verifies JWT tokens from cookies or authorization headers. It decodes the token, retrieves the user from the database, and attaches the user to the request object.

## User Controller

The user controller (`src/controllers/user-controller.js`) handles user registration, login, logout, and token refresh operations. It includes the following functions:

- `registerUser`: Registers a new user, uploads avatar and cover images to Cloudinary, and saves the user document in the database.
- `loginUser`: Authenticates a user, generates access and refresh tokens, and sets them as cookies.
- `logoutUser`: Logs out a user by clearing the refresh token and cookies.
- `refreshAccessToken`: Refreshes the access token using a valid refresh token.

## Environment Variables

The `.env` file contains environment variables for configuring the application:

- `PORT`: The port on which the server runs.
- `CORS_ORIGIN`: The allowed origin for CORS.
- `MONGODB_URI`: The MongoDB connection URI.
- `ACCESS_JWT_SECRET`: The secret key for signing access tokens.
- `JWT_ACCESS_EXPIRY`: The expiry duration for access tokens.
- `REFRESH_JWT_SECRET`: The secret key for signing refresh tokens.
- `JWT_REFRESH_EXPIRY`: The expiry duration for refresh tokens.
- `CLOUDINARY_CLOUD_NAME`: The Cloudinary cloud name.
- `CLOUDINARY_API_KEY`: The Cloudinary API key.
- `CLOUDINARY_API_SECRET`: The Cloudinary API secret.
- `NODE_ENV`: The environment mode (development or production).

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/videotube.git
   cd videotube
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file and add the required environment variables.

4. Start the server:
   ```bash
   npm start
   ```

5. Access the application at `http://localhost:4000`.

## License

This project is licensed under the MIT License.
