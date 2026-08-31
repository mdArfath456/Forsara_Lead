/**
 * Providers return LinkedIn URLs inconsistently: sometimes with no protocol
 * (bare href renders as a broken relative link), sometimes as the raw
 * internal member-id path instead of the human vanity slug. Normalize to a
 * single clean https://www.linkedin.com/... form.
 */
export function normalizeLinkedinUrl(raw) {
    if (!raw) return undefined;
    let url = String(raw).trim();
    if (!url) return undefined;

    // Strip any existing protocol/www so we can rebuild consistently.
    url = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    if (!/^linkedin\.com/i.test(url)) return undefined; // not a linkedin URL at all

    return `https://www.${url}`;
}

/**
 * Given LinkedIn's primary field plus any known variations, prefer a
 * human-readable vanity slug (/in/john-smith) over an internal member-id
 * slug (/in/ACoAAA...), since the latter is uglier to show users even
 * though both resolve correctly.
 */
export function pickBestLinkedinUrl(primary, variations = []) {
    const candidates = [primary, ...variations].filter(Boolean);
    const vanity = candidates.find((u) => !/\/in\/ACoAAA/i.test(u));
    return normalizeLinkedinUrl(vanity || candidates[0]);
}