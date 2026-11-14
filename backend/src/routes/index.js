'use strict';

/**
 * Root API router.
 */
const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const projectRoutes = require('./project.routes');
const taskRoutes = require('./task.routes');
const workforceRoutes = require('./workforce.routes');
const materialRoutes = require('./material.routes');
const equipmentRoutes = require('./equipment.routes');
const dailyReportRoutes = require('./dailyReport.routes');
const issueRoutes = require('./issue.routes');
const safetyRoutes = require('./safety.routes');
const dashboardRoutes = require('./dashboard.routes');
const notificationRoutes = require('./notification.routes');
const clientSummaryRoutes = require('./clientSummary.routes');
const scanRoutes = require('./scan.routes');
const analyticsRoutes = require('./analytics.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/workforce', workforceRoutes);
router.use('/materials', materialRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/reports', dailyReportRoutes);
router.use('/issues', issueRoutes);
router.use('/safety', safetyRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationRoutes);
router.use('/client', clientSummaryRoutes);
router.use('/scan', scanRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
