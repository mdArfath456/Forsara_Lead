# Explorium Lead Extractor Update

## Main workflow

Search company -> select company -> create lead -> automatically queue enrichment -> company data + people + contact details + public project research.

## Explorium APIs used

- `POST /v1/businesses/match`
- `POST /v1/businesses/firmographics/enrich`
- `POST /v1/businesses/technographics/enrich`
- `POST /v1/businesses/funding_and_acquisition/enrich`
- `POST /v1/businesses/company_hierarchies/bulk_enrich` (optional)
- `POST /v1/prospects`
- `POST /v1/prospects/profiles/enrich`
- `POST /v1/prospects/contacts_information/enrich`

## Project intelligence

The app crawls the selected company's public website, common project/case-study/news paths and sitemap URLs. Every stored result keeps its source URL. It does not invent projects.

## Environment

```env
EXPLORIUM_API_KEY=
EXPLORIUM_MAX_POC_ENRICH=15
EXPLORIUM_ENABLE_HIERARCHY=true
```

Keep API keys in `backend/.env`; never put them in the React frontend.
