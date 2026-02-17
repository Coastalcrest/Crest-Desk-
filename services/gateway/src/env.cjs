// Preload: loads environment variables from root .env before any other module.
// CommonJS to ensure synchronous loading before ESM imports.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
