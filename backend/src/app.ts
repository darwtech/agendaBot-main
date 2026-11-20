/**
 * HopperSoft — Creador: Darwin Chavez
 */
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { appointmentsRouter } from './modules/appointments/appointments.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { conversationsRouter } from './modules/conversations/conversations.routes.js';
import { customersRouter } from './modules/customers/customers.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { tenantsRouter } from './modules/platform/tenants.routes.js';
import { signupRouter } from './modules/platform/signup.routes.js';
import { platformAuthRouter } from './modules/platform/platform-auth.routes.js';
import { scheduleRouter } from './modules/schedule/schedule.routes.js';
import { servicesRouter } from './modules/services/services.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { whatsappRouter } from './modules/whatsapp/whatsapp.routes.js';
import { assistantRouter } from './modules/assistant/assistant.routes.js';
import { errorHandler, routeNotFound } from './shared/http.js';
import { tenantContext } from './shared/tenant.js';
import { loadSession, requireAdmin } from './shared/auth.js';
import { changesStream, notifyOnWrite } from './shared/events.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: env.FRONTEND_URL }));
  app.use(express.json({ limit: '1mb' }));

  // Rutas de cada negocio: /api/t/<slug>/... (todo dentro del schema del negocio)
  const tenant = express.Router({ mergeParams: true });
  tenant.use(tenantContext);
  tenant.use(loadSession);
  tenant.use(notifyOnWrite);
  // Avisos en tiempo real para el panel (citas, clientes, conversaciones).
  tenant.get('/events', requireAdmin, changesStream);
  tenant.use('/auth', authRouter);
  tenant.use('/settings', settingsRouter);
  tenant.use('/services', servicesRouter);
  tenant.use('/schedule', scheduleRouter);
  tenant.use('/customers', customersRouter);
  tenant.use('/appointments', appointmentsRouter);
  tenant.use('/conversations', conversationsRouter);
  tenant.use('/whatsapp', whatsappRouter);
  tenant.use('/assistant', assistantRouter);

  const api = express.Router();
  api.use('/health', healthRouter);
  api.use('/platform/tenants', tenantsRouter);
  api.use('/platform/auth', platformAuthRouter);
  api.use('/signup', signupRouter);
  api.use('/t/:tenant', tenant);
  app.use('/api', api);

  app.use(routeNotFound);
  app.use(errorHandler);
  return app;
}
