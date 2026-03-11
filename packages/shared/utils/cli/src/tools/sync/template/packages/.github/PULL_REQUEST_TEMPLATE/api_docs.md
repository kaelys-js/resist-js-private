### 📚 API Documentation Change

**Affected Endpoint(s):**

* `GET /v2/billing/usage`

**Doc Type:**

* [ ] OpenAPI spec
* [x] Markdown docs
* [x] Usage examples

---

## 🧾 Endpoint Overview

**Description:**
Returns usage and billing data for the authenticated account over a specified date range.

**Version:**
`v2`

**Authentication Required:**
Yes — `Bearer Token` in `Authorization` header

**Rate Limit:**
10 requests per minute per account (enforced via Cloudflare)
Responses include standard headers:

* `X-RateLimit-Limit`
* `X-RateLimit-Remaining`
* `Retry-After` (on 429 responses)

**Response Format:**
`application/json`
Supports caching headers:

* `ETag`
* `Cache-Control: max-age=600` (if usage data is static during range)

---

## 🔍 Query Parameters

| Name         | Type     | Required | Format   | Description                     |
| ------------ | -------- | -------- | -------- | ------------------------------- |
| `start_date` | `string` | ✅        | ISO 8601 | Start of the usage period (UTC) |
| `end_date`   | `string` | ✅        | ISO 8601 | End of the usage period (UTC)   |

> ⚠️ Dates must be within the same calendar year. Future dates are not allowed.

---

## ✅ Successful Response — `200 OK`

```json
{
  "schema_version": "v2.0",
  "total_usage": 3200,
  "currency": "usd",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "breakdown": [
    {
      "id": "api_calls",
      "resource": "api_calls",
      "resource_friendly_name": "API Calls",
      "units": 800,
      "unit_type": "calls",
      "cost": 1200,
      "source": "internal_metering"
    },
    {
      "id": "storage_gb",
      "resource": "storage_gb",
      "resource_friendly_name": "Storage (GB)",
      "units": 200,
      "unit_type": "gb",
      "cost": 1000,
      "source": "gcp_export"
    },
    {
      "id": "bandwidth_gb",
      "resource": "bandwidth_gb",
      "resource_friendly_name": "Bandwidth (GB)",
      "units": 400,
      "unit_type": "gb",
      "cost": 1000,
      "source": "internal_metering"
    }
  ]
}
```
