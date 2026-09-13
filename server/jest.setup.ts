import dotenv from 'dotenv';
dotenv.config();
if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== '/toktickit_lab3_test') {
  throw new Error('Tests require the isolated tokttickit Lab 3 database: toktickit_lab3_test.');
}
