# External API credential checklist

This checklist maps the remaining AGP automation credentials to the local `.env.local` keys. Do not commit real values. Fill them only in `.env.local` on the machine that runs the automation.

Run this after each update:

```powershell
npm.cmd run check:api-readiness
```

## Current safe order

1. Meta Ads read-only reporting
2. GA4 and Google Ads
3. Naver SearchAd
4. Imweb
5. Slack notifications, optional

## Meta Ads read-only

Official docs: https://developers.facebook.com/documentation/ads-commerce/marketing-api

Required keys:

- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`

Optional key:

- `META_BUSINESS_ID`

Where to find them:

- Access token: Meta for Developers app with Marketing API permissions. Use a token that can read ad insights for the target ad account.
- Ad account ID: Meta Ads Manager. The account usually appears as `act_<number>` in tools and URLs. Store the value consistently with the connector code that will be added next.
- Business ID: Meta Business settings, if the account is managed through Business Manager.

Safety notes:

- Start with read-only insights permissions.
- Do not grant campaign edit or management permissions until reporting works.

## Google Ads and GA4

Google Ads API docs: https://developers.google.com/google-ads/api/docs/get-started/make-first-call
Google Ads developer token docs: https://developers.google.com/google-ads/api/docs/api-policy/developer-token
GA4 Data API docs: https://developers.google.com/analytics/devguides/reporting/data/v1
GA4 property ID docs: https://developers.google.com/analytics/devguides/reporting/data/v1/property-id

Required keys:

- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_REFRESH_TOKEN`
- `GOOGLE_ADS_CUSTOMER_ID`
- `GA4_PROPERTY_ID`

Where to find them:

- Developer token: Google Ads manager account API Center.
- Client ID and client secret: Google Cloud OAuth client for the same Google account flow.
- Refresh token: generated through OAuth consent for the Google Ads API scopes.
- Customer ID: Google Ads account or manager account ID, usually shown in the account picker.
- GA4 property ID: Google Analytics Admin property details. It is numeric and used as `properties/<GA4_PROPERTY_ID>` in API requests.

Safety notes:

- Use a read-only reporting OAuth scope first where possible.
- Confirm whether the automation should pull Google Ads, GA4, or both before writing connector code.

## Naver SearchAd

Official docs: https://naver.github.io/searchad-apidoc/

Required keys:

- `NAVER_SEARCHAD_API_KEY`
- `NAVER_SEARCHAD_SECRET_KEY`
- `NAVER_SEARCHAD_CUSTOMER_ID`

Optional keys:

- `NAVER_COMMERCE_APPLICATION_ID`
- `NAVER_COMMERCE_APPLICATION_SECRET`

Where to find them:

- Naver SearchAd advertiser center, then Tools > API Manager.
- Create an API license and copy the API key, secret key, and customer ID.

Safety notes:

- SearchAd reporting should be added before any bid, budget, or campaign mutation endpoint.
- Keep commerce credentials separate from SearchAd credentials.

## Imweb

Official docs: https://developers-docs.imweb.me/

Required keys:

- `IMWEB_API_KEY`
- `IMWEB_API_SECRET`

Where to find them:

- Imweb developer or partner/admin area for OpenAPI access.
- Create or issue the API credentials for the target site/store.

Safety notes:

- Start with order/product/customer read endpoints only.
- Confirm the target Imweb site before enabling any write endpoint.

## Slack notifications, optional

Required keys: none.

Optional keys:

- `SLACK_WEBHOOK_URL`
- `SLACK_CHANNEL`

Where to find them:

- Slack app incoming webhook settings for the target workspace and channel.

Safety notes:

- Keep Slack disabled until message contents are reviewed.
- The current automation can run without Slack.

## After credentials are ready

1. Fill `.env.local`.
2. Run `npm.cmd run check:api-readiness`.
3. Add one read-only connector at a time.
4. Write fetched raw rows to staging tables first.
5. Compare dashboard output before enabling scheduled ingestion.
