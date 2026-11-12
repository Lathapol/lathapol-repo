import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { prisma } from './prisma';
import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (process.env.NODE_ENV === 'production' && !process.env.APP_ORIGIN) {
  throw new Error('APP_ORIGIN must be the public HTTPS origin in production.');
}

const PORT = process.env.PORT || 4000;

const webRoot = path.resolve(__dirname, '../../../client/dist');
if (existsSync(path.join(webRoot, 'index.html'))) {
  app.use(express.static(webRoot, { index: false }));
  app.get(/^\/(?!api(?:\/|$))/, (req, res, next) => {
    if (!req.accepts('html')) return next();
    res.sendFile(path.join(webRoot, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log(`TokTickIT API running on port ${PORT}`);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => server.close(() => void prisma.$disconnect()));
}
