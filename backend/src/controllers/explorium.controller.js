// ============================================================
// backend/src/controllers/explorium.controller.js
// ============================================================

import {
    enrichCompanyAndPeople,
} from '../services/leadProviders/ExploriumProvider.js';

export async function enrichCompanyFromExplorium(
    req,
    res,
    next
) {
    try {
        const {
            name,
            domain,
            website,
        } = req.body;

        if (!name && !domain) {
            return res.status(400).json({
                success: false,
                message:
                    'Company name or domain is required',
            });
        }

        const result =
            await enrichCompanyAndPeople({
                name,
                domain,
                website,
            });

        return res.json(result);
    } catch (error) {
        next(error);
    }
}