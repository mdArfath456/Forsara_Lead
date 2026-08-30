// ============================================================
// backend/src/routes/explorium.routes.js
// ============================================================

import express from 'express';

import {
    enrichCompanyFromExplorium,
} from '../controllers/explorium.controller.js';

const router =
    express.Router();

router.post(
    '/enrich',
    enrichCompanyFromExplorium
);

export default router;