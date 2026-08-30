// ============================================================
// FRONTEND
// src/api/exploriumApi.js
// ============================================================

import apiClient from './apiClient';

export async function enrichCompanyWithExplorium(
    company
) {
    const response =
        await apiClient.post(
            '/explorium/enrich',
            {
                name:
                    company.name,

                domain:
                    company.domain,

                website:
                    company.website,
            }
        );

    return response.data;
}