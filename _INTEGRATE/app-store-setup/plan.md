# App Store Setup Plan

> **Purpose:** Complete setup for Apple App Store and Google Play Store publishing
> **Scope:** Account creation, app configuration, IAP setup, review preparation

---

## Overview

Mobile app publishing requires setup on two platforms:
1. **Apple App Store Connect** - iOS, iPadOS, macOS apps
2. **Google Play Console** - Android apps

Both integrate with RevenueCat for subscription management (see `payments/plan.md`).

---

## Apple Developer Program

### 1. Enrollment (Manual)

**Prerequisites:**
- Apple ID with 2FA enabled
- D-U-N-S Number for organization enrollment
- Legal entity documentation

**Steps:**
1. Go to [developer.apple.com/enroll](https://developer.apple.com/enroll)
2. Choose "Organization" enrollment ($99/year)
3. Enter D-U-N-S number
4. Provide legal entity details (must match formation docs)
5. Sign Apple Developer Agreement
6. Pay enrollment fee
7. Wait for approval (1-2 weeks typical)

**Important:**
- D-U-N-S lookup: [dnb.com/duns-number](https://www.dnb.com/duns-number.html)
- If no D-U-N-S, request one (free, takes ~30 days)
- Organization name must match D-U-N-S exactly

### 2. App Store Connect Setup

After enrollment approval:

**Team Configuration:**
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Users and Access → Add team members
3. Assign roles:
   - Account Holder (you)
   - Admin (full access)
   - Developer (app management, no financial)
   - Marketing (metadata only)

**Agreements:**
1. Go to Agreements, Tax, and Banking
2. Accept Paid Applications agreement
3. Enter banking information (Mercury USD account)
4. Enter tax information (W-8BEN-E for foreign LLC)

### 3. Create App Record

For each product app:

```
App Store Connect → My Apps → + (New App)

Platform: iOS
Name: [Product Name]
Primary Language: English (US)
Bundle ID: com.yourcompany.productname (create new)
SKU: PRODUCTNAME-IOS
User Access: Full Access
```

**App Information:**
- Subtitle (30 chars)
- Category (primary + secondary)
- Content Rights
- Age Rating questionnaire

**Pricing and Availability:**
- Price: Free (IAP for subscriptions)
- Availability: All territories (or select specific)

### 4. In-App Purchases (Subscriptions)

**Create Subscription Group:**
```
App Store Connect → App → Features → In-App Purchases

+ Subscription Group
  Reference Name: Premium Access

  + Subscription
    Reference Name: Monthly Premium
    Product ID: com.yourcompany.productname.premium.monthly
    Subscription Duration: 1 Month
    Subscription Price: [Set in all territories]

  + Subscription
    Reference Name: Annual Premium
    Product ID: com.yourcompany.productname.premium.annual
    Subscription Duration: 1 Year
    Subscription Price: [Set in all territories]
```

**Subscription Details:**
- Localizations (display name, description)
- Review information (for Apple review)
- Promotional offers (optional)
- Offer codes (optional)

### 5. App Privacy

**Privacy Nutrition Labels:**

Required disclosures for typical SaaS app:

| Data Type | Collection | Usage |
|-----------|------------|-------|
| Email Address | Yes | App Functionality, Account |
| Name | Yes (optional) | App Functionality |
| User ID | Yes | App Functionality |
| Device ID | Yes | Analytics |
| Product Interaction | Yes | Analytics |
| Crash Data | Yes | App Functionality |
| Performance Data | Yes | App Functionality |

**Data Linked to User:**
- Email, Name, User ID

**Data Not Linked to User:**
- Crash Data, Performance Data (if anonymized)

### 6. App Store Assets

**Screenshots (Required):**
- iPhone 6.7" (1290 x 2796 px) - iPhone 15 Pro Max
- iPhone 6.5" (1242 x 2688 px) - iPhone 11 Pro Max
- iPad Pro 12.9" (2048 x 2732 px) - 3rd gen and later

**App Preview Videos (Optional):**
- 15-30 seconds
- Same dimensions as screenshots
- No device frames in video itself

**App Icon:**
- 1024 x 1024 px (no transparency, no rounded corners)

### 7. Review Preparation

**What to Include:**
- Demo account credentials (if login required)
- Notes for reviewers explaining any non-obvious features
- Contact information

**Common Rejection Reasons:**
- Guideline 2.1 - App Completeness (crashes, placeholders)
- Guideline 2.3 - Accurate Metadata (screenshots don't match app)
- Guideline 3.1.1 - In-App Purchase (not using Apple IAP)
- Guideline 4.2 - Minimum Functionality (web wrapper)
- Guideline 5.1.1 - Data Collection (missing privacy policy)

**Review Checklist:**
- [ ] All screens functional (no placeholders)
- [ ] Privacy policy URL in app settings
- [ ] Terms of service URL
- [ ] Login works with demo account
- [ ] All IAP products work
- [ ] No references to other platforms' pricing
- [ ] No external payment links for digital goods

---

## Google Play Console

### 1. Developer Account (Manual)

**Steps:**
1. Go to [play.google.com/console](https://play.google.com/console)
2. Sign in with Google account
3. Accept Developer Distribution Agreement
4. Pay one-time fee ($25)
5. Complete identity verification
6. Set up merchant account (for paid apps/IAP)

**Organization Verification:**
- Required for organization accounts
- D-U-N-S or other business documentation
- Takes 2-7 business days

### 2. Merchant Account Setup

For subscription payments:

1. Play Console → Setup → Payments profile
2. Link or create Google Payments profile
3. Enter business information
4. Add bank account (Mercury USD)
5. Complete tax information

### 3. Create App

```
Google Play Console → All apps → Create app

App name: [Product Name]
Default language: English (United States)
App or game: App
Free or paid: Free (IAP for subscriptions)
```

**Store Listing:**
- Short description (80 chars)
- Full description (4000 chars)
- App icon (512 x 512 px)
- Feature graphic (1024 x 500 px)
- Screenshots (min 2, max 8 per device type)
  - Phone: 320-3840 px, 16:9 or 9:16
  - Tablet: 7" and 10"
  - Chromebook (optional)

### 4. Store Settings

**App Content:**
- Privacy policy URL
- Ads declaration
- App access (if login required, provide credentials)
- Content ratings questionnaire (IARC)
- Target audience (13+ for most SaaS)
- News apps declaration
- COVID-19 apps declaration (if relevant)
- Data safety form

**Data Safety Form:**

| Data Type | Collected | Shared | Required |
|-----------|-----------|--------|----------|
| Email | Yes | No | Yes |
| Name | Yes | No | No |
| User IDs | Yes | No | Yes |
| App interactions | Yes | No | No |
| Crash logs | Yes | No | No |
| Diagnostics | Yes | No | No |

### 5. In-App Products (Subscriptions)

```
Play Console → Monetize → Products → Subscriptions

+ Create subscription
  Product ID: premium_monthly
  Name: Premium Monthly
  Description: Full access to all features

  + Base plan
    Base plan ID: monthly
    Renewal type: Auto-renewing
    Billing period: Monthly
    Price: [Set for all regions]

+ Create subscription
  Product ID: premium_annual
  ...
```

**Important:**
- Product IDs must match what's configured in RevenueCat
- Grace period: Enable (3 days recommended)
- Account hold: Enable (30 days recommended)

### 6. Testing Tracks

**Internal Testing:**
- Up to 100 testers
- Immediate availability
- Use for CI/CD builds

**Closed Testing:**
- Unlimited testers via email list
- Use for beta testing

**Open Testing:**
- Anyone can join via link
- Use for public beta

**Production:**
- Full release
- Staged rollout supported (start at 10%, increase gradually)

### 7. Release Preparation

**Pre-launch Report:**
- Automatic testing on Firebase Test Lab
- Identifies crashes, security issues, accessibility
- Review before production release

**Review Checklist:**
- [ ] Content rating completed
- [ ] Data safety form completed
- [ ] Privacy policy published
- [ ] Screenshots for all device types
- [ ] Feature graphic uploaded
- [ ] App tested on multiple devices
- [ ] All IAP products created and activated

---

## Fastlane Configuration

Automate builds and uploads with Fastlane.

### iOS Fastfile

```ruby
# packages/products/[product]/app/fastlane/Fastfile

default_platform(:ios)

platform :ios do
  desc "Push a new beta build to TestFlight"
  lane :beta do
    setup_ci if ENV['CI']

    # Match for code signing
    match(
      type: "appstore",
      readonly: is_ci,
      app_identifier: "com.yourcompany.productname"
    )

    # Increment build number
    increment_build_number(
      build_number: ENV["BUILD_NUMBER"] || latest_testflight_build_number + 1
    )

    # Build
    build_app(
      workspace: "App.xcworkspace",
      scheme: "App",
      export_method: "app-store"
    )

    # Upload to TestFlight
    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )
  end

  desc "Push a new release to App Store"
  lane :release do
    setup_ci if ENV['CI']

    match(
      type: "appstore",
      readonly: true,
      app_identifier: "com.yourcompany.productname"
    )

    increment_build_number(
      build_number: ENV["BUILD_NUMBER"] || latest_testflight_build_number + 1
    )

    build_app(
      workspace: "App.xcworkspace",
      scheme: "App",
      export_method: "app-store"
    )

    upload_to_app_store(
      submit_for_review: true,
      automatic_release: true,
      precheck_include_in_app_purchases: false,
      submission_information: {
        add_id_info_uses_idfa: false
      }
    )
  end
end
```

### Android Fastfile

```ruby
# packages/products/[product]/app/fastlane/Fastfile

default_platform(:android)

platform :android do
  desc "Build and upload to Play Store internal track"
  lane :beta do
    # Build AAB
    gradle(
      task: "bundle",
      build_type: "Release",
      project_dir: "android"
    )

    # Upload to internal testing
    upload_to_play_store(
      track: "internal",
      aab: "android/app/build/outputs/bundle/release/app-release.aab",
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end

  desc "Promote internal to production"
  lane :release do
    upload_to_play_store(
      track: "internal",
      track_promote_to: "production",
      rollout: "0.1" # 10% rollout
    )
  end

  desc "Increase production rollout"
  lane :rollout do |options|
    percentage = options[:percentage] || "1.0"
    upload_to_play_store(
      track: "production",
      rollout: percentage,
      skip_upload_aab: true
    )
  end
end
```

### Match Setup (iOS Code Signing)

```ruby
# packages/products/[product]/app/fastlane/Matchfile

git_url("git@github.com:yourcompany/certificates.git")
storage_mode("git")

type("appstore")
app_identifier(["com.yourcompany.productname"])
username("apple-developer@yourcompany.com")
team_id("XXXXXXXXXX")
```

### Supply Setup (Android)

```ruby
# packages/products/[product]/app/fastlane/Appfile

json_key_file("google-play-key.json")
package_name("com.yourcompany.productname")
```

---

## GitHub Actions Integration

See `_INTEGRATE/github-workflows/plan.md` for:
- `mobile-beta.yml` - Builds and uploads to TestFlight/Play Internal on push to main
- `mobile-release.yml` - Submits to App Store/Play Store on release tag

### Required Secrets

```
# iOS
MATCH_PASSWORD - Password for Match certificates repo
MATCH_GIT_BASIC_AUTH - Base64 PAT for certificates repo
APP_STORE_CONNECT_API_KEY - App Store Connect API key (JSON)
APPLE_TEAM_ID - Team ID

# Android
GOOGLE_PLAY_JSON_KEY - Service account JSON for Play Console
ANDROID_KEYSTORE - Base64 encoded keystore
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

---

## RevenueCat Integration

Both stores connect to RevenueCat (see `payments/plan.md`):

### iOS Configuration

1. App Store Connect → Keys → In-App Purchase Key
2. Download key file
3. RevenueCat → Project → iOS App → Add App Store Connect API Key

### Android Configuration

1. Play Console → Setup → API access
2. Create service account for RevenueCat
3. Grant "View financial data" permission
4. RevenueCat → Project → Android App → Add Service Account

---

## Review Timeline

**Typical Review Times:**

| Store | Initial Review | Updates |
|-------|---------------|---------|
| App Store | 24-48 hours | 24 hours |
| Google Play | 1-3 days | Hours to 1 day |

**Tips:**
- Submit for review during weekdays (human reviewers)
- Avoid major holidays
- Expedited review available for critical issues (Apple)
- Pre-launch report issues must be addressed (Google)

---

## Checklist

### Apple Developer Program
- [ ] Create Apple ID with 2FA
- [ ] Get D-U-N-S number
- [ ] Enroll in Apple Developer Program (Organization)
- [ ] Wait for approval
- [ ] Accept agreements in App Store Connect
- [ ] Set up banking/tax information
- [ ] Create App Store Connect API key
- [ ] Set up Match for code signing
- [ ] Store credentials in Infisical

### Per-App (iOS)
- [ ] Create bundle ID
- [ ] Create app record in App Store Connect
- [ ] Complete app information
- [ ] Set up subscription products
- [ ] Complete privacy nutrition labels
- [ ] Prepare screenshots and metadata
- [ ] Configure Fastlane
- [ ] Test beta deployment
- [ ] Submit for review

### Google Play
- [ ] Create Google Play developer account
- [ ] Complete identity verification
- [ ] Set up merchant account
- [ ] Create service account for API access
- [ ] Store credentials in Infisical

### Per-App (Android)
- [ ] Create app in Play Console
- [ ] Complete store listing
- [ ] Set up subscription products
- [ ] Complete data safety form
- [ ] Complete content rating
- [ ] Configure Fastlane
- [ ] Test internal track deployment
- [ ] Submit for review

---

## Infisical Secrets Structure

```
app-stores/
├── apple/
│   ├── team-id
│   ├── api-key-id
│   ├── api-key-issuer
│   ├── api-key-content (p8 file content)
│   └── match-password
├── google/
│   ├── service-account-json
│   └── keystore-password
└── [product]/
    ├── ios-bundle-id
    ├── android-package-name
    ├── android-keystore (base64)
    └── android-key-alias
```
