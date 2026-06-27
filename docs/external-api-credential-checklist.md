# Active channel credential checklist

This checklist reflects the user's current operation. Do not commit real values. Fill values only in `.env.local` on the computer that runs the automation.

Run this after each update:

```powershell
npm.cmd run check:api-readiness
```

## Current channel map

Active now:

- Naver Place
- Danggeun Ads
- Instagram notices/promotions

Not active now:

- Imweb
- Meta Ads API

Unknown or later:

- Google Ads
- GA4
- Naver SearchAd API, only if paid Naver ads need API reporting

## Safe order from here

1. Track Naver Place as the primary active local channel.
2. Track Danggeun Ads through manual/admin report export first.
3. Track Instagram notices/promotions manually because it is not connected to Meta Ads Manager.
4. Only add Naver SearchAd API if the active Naver Place promotion is managed through Naver's ad platform and API reporting is needed.
5. Keep Meta Ads API and Imweb inactive unless the operating method changes.

## Naver Place

Useful fields:

- `NAVER_PLACE_BUSINESS_NAME`
- `NAVER_PLACE_URL`

Where to find them:

- Naver SmartPlace / Place admin page.
- Public Naver Place page URL for the business.

Automation approach:

- Start with business profile, visit/review/reservation indicators, and manually exported or copied performance notes.
- If paid Naver advertising is being used through Naver SearchAd, collect the SearchAd API keys separately.

## Naver SearchAd API, optional

Official docs: https://naver.github.io/searchad-apidoc/

Required only if API reporting is enabled:

- `NAVER_SEARCHAD_API_KEY`
- `NAVER_SEARCHAD_SECRET_KEY`
- `NAVER_SEARCHAD_CUSTOMER_ID`

Where to find them:

- Naver SearchAd advertiser center, then Tools > API Manager.
- Create an API license and copy the API key, secret key, and customer ID.

Safety notes:

- Reporting first.
- Do not enable bid, budget, campaign, or keyword mutation endpoints without explicit approval.

## Danggeun Ads

Useful fields:

- `DAANGN_BUSINESS_PROFILE_URL`
- `DAANGN_REPORT_SOURCE=manual`

Where to find them:

- Danggeun business profile or ads/admin screen.
- Campaign screenshots, exported reports, or copied summary numbers if available.

Automation approach:

- Treat Danggeun as manual/admin export until a reliable official API or partner route is confirmed for this account.
- Store daily spend, exposure, clicks, inquiries, reservations, and memo fields in a staging table or CSV first.

Safety notes:

- Do not change budgets or campaigns through automation.
- Keep the first version as reporting only.

## Instagram notices/promotions

Useful fields:

- `INSTAGRAM_ACCOUNT_HANDLE`
- `INSTAGRAM_REPORT_SOURCE=manual`

Current boundary:

- Instagram is being used for notices/promotions.
- It is not currently connected to Meta Ads Manager for API reporting.

Automation approach:

- Track posts, promotion dates, spend if any, reach, profile visits, messages, and reservation inquiries manually.
- If the account is later connected to Meta Business / Ads Manager, reopen the Meta Ads API path then.

## Meta Ads API, inactive

Official docs: https://developers.facebook.com/documentation/ads-commerce/marketing-api

Current boundary:

- Do not treat Instagram notices/promotions as Meta Ads API work right now.
- Leave these empty unless the operating method changes:
  - `META_ACCESS_TOKEN`
  - `META_AD_ACCOUNT_ID`
  - `META_BUSINESS_ID`

## Imweb, inactive

Current boundary:

- Imweb is not operated now.
- Leave these empty:
  - `IMWEB_API_KEY`
  - `IMWEB_API_SECRET`

## Google Ads / GA4, later if needed

Google Ads API docs: https://developers.google.com/google-ads/api/docs/get-started/make-first-call
GA4 Data API docs: https://developers.google.com/analytics/devguides/reporting/data/v1

Leave these empty unless Google Ads or GA4 become part of the operation:

- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_REFRESH_TOKEN`
- `GOOGLE_ADS_CUSTOMER_ID`
- `GA4_PROPERTY_ID`

## After channel details are ready

1. Fill only the relevant `.env.local` values.
2. Run `npm.cmd run check:api-readiness`.
3. Add one reporting connector or manual import template at a time.
4. Write fetched/imported raw rows to staging tables first.
5. Compare dashboard output before enabling scheduled ingestion.
