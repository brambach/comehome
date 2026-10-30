import "dotenv/config";

// Unit tests never touch the dev database or real services.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.MAIL_DRIVER = "console";
process.env.STORAGE_DRIVER = "disk";
process.env.SITE_URL = "https://comehome.test";
