const path = require("path");

// Environment loading: Backend/.env takes precedence, then the repo-root
// .env as a fallback. dotenv never overwrites variables that are already
// set, so loading both is safe and supports either layout.
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

// Fail fast in production if the Clerk secret key is not explicitly configured.
if (process.env.NODE_ENV === "production" && !process.env.CLERK_SECRET_KEY) {
  throw new Error(
    "FATAL: CLERK_SECRET_KEY must be set in production. Refusing to start without Clerk credentials."
  );
}

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:8080",

  SUPABASE: {
    URL: process.env.SUPABASE_URL,
    KEY: process.env.SUPABASE_KEY,
    ANON_KEY: process.env.SUPABASE_KEY,
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  DATABASE_URL: process.env.DATABASE_URL,

  CLERK: {
    PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
    SECRET_KEY: process.env.CLERK_SECRET_KEY,
  },

  UPLOAD: {
    DIR: path.join(__dirname, "../../", process.env.UPLOAD_DIR || "uploads"),
    MAX_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"],
  },

  INSTAGRAM: {
    APP_ID: process.env.INSTAGRAM_APP_ID,
    APP_SECRET: process.env.INSTAGRAM_APP_SECRET,
    REDIRECT_URI:
      process.env.INSTAGRAM_REDIRECT_URI ||
      "http://localhost:8080/instagram/callback",
  },
};