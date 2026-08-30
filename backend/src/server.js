import MongoStore from 'connect-mongo';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import session from 'express-session';

import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { router } from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { sanitizeInput } from './middleware/sanitizeInput.js';
import { startScheduler } from './services/scheduler.js';
import exploriumRoutes from './routes/explorium.routes.js';

async function main() {
  await connectDB();
  startScheduler();

  const app = express();
  const isProd = env.nodeEnv === 'production';

  if (isProd) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(sanitizeInput);

  app.use(
    session({
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: env.mongoUri,
        collectionName: 'sessions', // separate from your app collections, auto-created
        ttl: 60 * 60 * 8, // 8h — matches cookie maxAge below, in seconds not ms
      }),
      cookie: {
        httpOnly: true,
        secure: env.nodeEnv === 'production',
        sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 8, // 8h — internal staff workday session
      },
    })
  );

  // Protect provider-backed endpoints specifically — discovery/enrichment
  // calls cost money per request, so throttle harder than general CRUD.
  const providerLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
  app.use('/api/search', providerLimiter);
  app.use('/api/leads/:id/enrich', providerLimiter);

  app.use('/api', router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.use(
    '/api/explorium',
    exploriumRoutes
  );
  app.listen(env.port, () => {
    console.log(`[server] listening on port ${env.port} (${env.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
