'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const apiRoutes = require('./routes');
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');
const workforceRoutes = require('./routes/workforce.routes');
const materialRoutes = require('./routes/material.routes');
const equipmentRoutes = require('./routes/equipment.routes');
const dailyReportRoutes = require('./routes/dailyReport.routes');
const issueRoutes = require('./routes/issue.routes');
const safetyRoutes = require('./routes/safety.routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.set('env', env.nodeEnv);
app.disable('x-powered-by');

// --- Global middleware ---
app.use(helmet());
app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

// --- Routes ---
app.use(`${env.apiPrefix}/auth`, authRoutes);
app.use(`${env.apiPrefix}/projects`, projectRoutes);
app.use(`${env.apiPrefix}/tasks`, taskRoutes);
app.use(`${env.apiPrefix}/workforce`, workforceRoutes);
app.use(`${env.apiPrefix}/materials`, materialRoutes);
app.use(`${env.apiPrefix}/equipment`, equipmentRoutes);
app.use(`${env.apiPrefix}/reports`, dailyReportRoutes);
app.use(`${env.apiPrefix}/issues`, issueRoutes);
app.use(`${env.apiPrefix}/safety`, safetyRoutes);
app.use(env.apiPrefix, apiRoutes);

// --- Fallbacks ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;
