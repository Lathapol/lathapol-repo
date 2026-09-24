import dotenv from 'dotenv';
dotenv.config();
if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== '/toktickit_lab4_test') {
  throw new Error('Tests require the isolated tokttickit Lab 4 database: toktickit_lab4_test.');
}
