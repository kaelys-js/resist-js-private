# HTML Meta & SEO Lint Rules

Implement the **HTML Meta & SEO** lint rules (120 rules).

Create files in: `_INTEGRATE/linter-test/scripts/rules/html-meta/`

File patterns: `*.html`, `**/app.html`, `**/*.svelte`, `**/*.astro`

**Parsers needed:** HTML parser (htmlparser2/parse5), Svelte compiler, Astro compiler

---

## Already Covered by Other Tools

- **html-validate**: Basic HTML validation
- **axe-core**: Accessibility audits

The rules below focus on **SEO, social sharing, platform-specific meta, and framework patterns**.

---

## Part 1: Core Document Meta

### 1. `html-meta/require-charset`

**What it catches:** Missing character encoding declaration

**Why:** Without charset, browsers may misinterpret characters; security risk (UTF-7 attacks)

**Detection:** No `<meta charset="...">` in document head

```html
<!-- ❌ Bad - no charset -->
<!DOCTYPE html>
<html>
<head>
  <title>Page</title>
</head>

<!-- ❌ Bad - wrong charset -->
<meta charset="iso-8859-1">

<!-- ❌ Bad - old syntax -->
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">

<!-- ✅ Good -->
<meta charset="utf-8">
```

**Error message:** `Missing <meta charset="utf-8">`

**Tip:** `Add <meta charset="utf-8"> as first element in <head>`

**Severity:** error

---

### 2. `html-meta/charset-first`

**What it catches:** Charset declaration not within first 1024 bytes

**Why:** Browsers only scan first 1024 bytes for charset; late declaration causes re-parsing

**Detection:** `<meta charset>` position > 1024 bytes from document start

```html
<!-- ❌ Bad - charset after other elements -->
<!DOCTYPE html>
<html>
<head>
  <title>Very Long Title...</title>
  <meta name="description" content="...">
  <link rel="stylesheet" href="...">
  <meta charset="utf-8">  <!-- Too late! -->
</head>

<!-- ✅ Good - charset first -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Page</title>
  ...
</head>
```

**Error message:** `<meta charset> must be within first 1024 bytes of document`

**Tip:** `Move <meta charset="utf-8"> to be first element in <head>`

**Severity:** error

---

### 3. `html-meta/require-viewport`

**What it catches:** Missing viewport meta tag

**Why:** Required for responsive design on mobile devices

**Detection:** No `<meta name="viewport">` in head

```html
<!-- ❌ Bad - no viewport -->
<head>
  <meta charset="utf-8">
  <title>Page</title>
</head>

<!-- ✅ Good -->
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page</title>
</head>
```

**Error message:** `Missing viewport meta tag`

**Tip:** `Add <meta name="viewport" content="width=device-width, initial-scale=1">`

**Severity:** error

---

### 4. `html-meta/viewport-width`

**What it catches:** Viewport without `width=device-width`

**Why:** Fixed width viewports break responsive design

**Detection:** Viewport meta with `width=` set to fixed pixel value

```html
<!-- ❌ Bad - fixed width -->
<meta name="viewport" content="width=1024">

<!-- ❌ Bad - missing width -->
<meta name="viewport" content="initial-scale=1">

<!-- ✅ Good -->
<meta name="viewport" content="width=device-width, initial-scale=1">
```

**Error message:** `Viewport should use width=device-width, not fixed width`

**Tip:** `Set width=device-width for responsive layout`

**Severity:** error

---

### 5. `html-meta/viewport-initial-scale`

**What it catches:** Viewport without initial-scale

**Why:** Some mobile browsers need initial-scale for proper rendering

**Detection:** Viewport meta without `initial-scale`

```html
<!-- ❌ Bad - no initial-scale -->
<meta name="viewport" content="width=device-width">

<!-- ✅ Good -->
<meta name="viewport" content="width=device-width, initial-scale=1">
```

**Error message:** `Viewport should include initial-scale=1`

**Tip:** `Add initial-scale=1 to viewport`

**Severity:** warning

---

### 6. `html-meta/no-viewport-user-scalable-no`

**What it catches:** Viewport with `user-scalable=no`

**Why:** Prevents users from zooming - accessibility violation (WCAG 1.4.4)

**Detection:** Viewport meta containing `user-scalable=no` or `user-scalable=0`

```html
<!-- ❌ Bad - prevents zoom -->
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">

<!-- ❌ Bad - same thing -->
<meta name="viewport" content="width=device-width, user-scalable=0">

<!-- ✅ Good - allow zoom -->
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- ✅ Good - explicit -->
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=yes">
```

**Error message:** `user-scalable=no prevents zooming - accessibility violation`

**Tip:** `Remove user-scalable=no to allow users to zoom`

**Severity:** error

---

### 7. `html-meta/no-viewport-maximum-scale`

**What it catches:** Viewport with restrictive `maximum-scale`

**Why:** `maximum-scale=1` prevents zooming - accessibility concern

**Detection:** Viewport meta with `maximum-scale` <= 1

```html
<!-- ❌ Bad - prevents zoom -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

<!-- ❌ Bad -->
<meta name="viewport" content="width=device-width, maximum-scale=0.5">

<!-- ✅ Good - no maximum-scale -->
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- ✅ Good - reasonable maximum -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
```

**Error message:** `maximum-scale=${value} restricts zooming - accessibility concern`

**Tip:** `Remove maximum-scale or set to value >= 2`

**Severity:** warning

---

### 8. `html-meta/require-title`

**What it catches:** Missing `<title>` element

**Why:** Title is required for SEO, accessibility, and browser tabs

**Detection:** No `<title>` element in head

```html
<!-- ❌ Bad - no title -->
<head>
  <meta charset="utf-8">
</head>

<!-- ❌ Bad - empty title -->
<head>
  <title></title>
</head>

<!-- ✅ Good -->
<head>
  <meta charset="utf-8">
  <title>Page Title - Site Name</title>
</head>
```

**Error message:** `Missing <title> element`

**Tip:** `Add descriptive <title> in <head>`

**Severity:** error

---

### 9. `html-meta/no-duplicate-title`

**What it catches:** Multiple `<title>` elements

**Why:** Only first title is used; duplicates indicate error

**Detection:** More than one `<title>` element in document

```html
<!-- ❌ Bad - duplicate titles -->
<head>
  <title>First Title</title>
  <title>Second Title</title>  <!-- Ignored -->
</head>

<!-- ❌ Bad - title in body -->
<head>
  <title>Head Title</title>
</head>
<body>
  <title>Body Title</title>  <!-- Wrong location -->
</body>

<!-- ✅ Good -->
<head>
  <title>Single Title</title>
</head>
```

**Error message:** `Multiple <title> elements found - only first is used`

**Tip:** `Remove duplicate <title> elements`

**Severity:** error

---

### 10. `html-meta/require-description`

**What it catches:** Missing meta description

**Why:** Description used by search engines in snippets

**Detection:** No `<meta name="description">` in head

```html
<!-- ❌ Bad - no description -->
<head>
  <title>Page Title</title>
</head>

<!-- ✅ Good -->
<head>
  <title>Page Title</title>
  <meta name="description" content="A concise description of the page content.">
</head>
```

**Error message:** `Missing meta description`

**Tip:** `Add <meta name="description" content="...">`

**Severity:** warning

---

### 11. `html-meta/require-lang`

**What it catches:** `<html>` element without `lang` attribute

**Why:** Language declaration required for accessibility and SEO

**Detection:** `<html>` element without `lang` attribute

```html
<!-- ❌ Bad - no lang -->
<html>
<head>...</head>
</html>

<!-- ❌ Bad - empty lang -->
<html lang="">

<!-- ✅ Good -->
<html lang="en">

<!-- ✅ Good - with region -->
<html lang="en-US">
```

**Error message:** `<html> element missing lang attribute`

**Tip:** `Add lang attribute: <html lang="en">`

**Severity:** error

---

### 12. `html-meta/valid-lang-code`

**What it catches:** Invalid language codes

**Why:** Invalid codes break language detection and assistive technology

**Detection:** `lang` attribute with non-ISO 639-1/639-2 code

```html
<!-- ❌ Bad - invalid code -->
<html lang="english">
<html lang="uk">  <!-- UK is country, not language -->
<html lang="cn">  <!-- CN is country, use zh -->

<!-- ✅ Good -->
<html lang="en">
<html lang="en-GB">
<html lang="zh-CN">
<html lang="pt-BR">
```

**Error message:** `Invalid language code '${code}'`

**Tip:** `Use ISO 639-1 code: ${suggestion}`

**Severity:** error

---

### 13. `html-meta/no-duplicate-meta`

**What it catches:** Duplicate meta tags with same name/property

**Why:** Duplicates cause unpredictable behavior; only one value used

**Detection:** Multiple `<meta>` with same `name` or `property` attribute

```html
<!-- ❌ Bad - duplicate name -->
<meta name="description" content="First description">
<meta name="description" content="Second description">

<!-- ❌ Bad - duplicate property -->
<meta property="og:title" content="First">
<meta property="og:title" content="Second">

<!-- ✅ Good -->
<meta name="description" content="Single description">
<meta property="og:title" content="Single title">

<!-- ✅ OK - different names -->
<meta name="description" content="...">
<meta name="author" content="...">
```

**Error message:** `Duplicate meta ${attr}="${value}" found`

**Tip:** `Remove duplicate meta tags`

**Severity:** error

---

### 14. `html-meta/meta-content-not-empty`

**What it catches:** Meta tags with empty content

**Why:** Empty meta provides no value; likely a mistake

**Detection:** `<meta>` with empty or whitespace-only `content` attribute

```html
<!-- ❌ Bad - empty content -->
<meta name="description" content="">
<meta property="og:title" content="   ">

<!-- ❌ Bad - missing content -->
<meta name="author">

<!-- ✅ Good -->
<meta name="description" content="Actual description">
```

**Error message:** `Meta tag '${name}' has empty content`

**Tip:** `Add content or remove the meta tag`

**Severity:** warning

---

## Part 2: Title & Description Quality

### 15. `html-meta/title-length`

**What it catches:** Title too short or too long for search results

**Why:** Google displays ~50-60 characters; too long gets truncated

**Detection:** Title length outside 30-60 character range

```html
<!-- ❌ Bad - too short -->
<title>Home</title>

<!-- ❌ Bad - too long (will be truncated) -->
<title>The Complete and Comprehensive Guide to Everything You Need to Know About Building Modern Web Applications with JavaScript</title>

<!-- ✅ Good - optimal length -->
<title>Getting Started Guide - MyApp Documentation</title>
```

**Error message:** `Title is ${length} characters - optimal range is 30-60`

**Tip:** `Aim for 30-60 characters including brand name`

**Severity:** warning

---

### 16. `html-meta/title-no-site-name-only`

**What it catches:** Title that's only the site name

**Why:** Every page needs unique, descriptive title

**Detection:** Title matches common site name patterns without page description

```html
<!-- ❌ Bad - just site name -->
<title>MyCompany</title>
<title>MyApp</title>
<title>Home | MyCompany</title>

<!-- ✅ Good - descriptive -->
<title>Getting Started - MyCompany</title>
<title>Pricing Plans | MyApp</title>
<title>Contact Us - MyCompany Support</title>
```

**Error message:** `Title appears to be only site name - add page description`

**Tip:** `Format: Page Description - Site Name`

**Severity:** warning

---

### 17. `html-meta/title-no-special-chars`

**What it catches:** Problematic characters in title

**Why:** Some characters display poorly in search results or tabs

**Detection:** Title containing problematic characters

```html
<!-- ❌ Bad - problematic chars -->
<title>Page Title™ | Site®</title>
<title>Buy Now!!! Amazing Deals***</title>
<title>【Special】Offer「Limited」</title>

<!-- ✅ Good - clean title -->
<title>Page Title - Site</title>
<title>Amazing Deals on Products - Store</title>
```

**Error message:** `Title contains special characters that may display poorly`

**Tip:** `Use standard punctuation: - | :`

**Severity:** warning

---

### 18. `html-meta/description-length`

**What it catches:** Description too short or too long

**Why:** Google displays ~150-160 characters; too long gets truncated

**Detection:** Description length outside 50-160 character range

```html
<!-- ❌ Bad - too short -->
<meta name="description" content="A website.">

<!-- ❌ Bad - too long -->
<meta name="description" content="This is an extremely long description that goes into excessive detail about every single aspect of the page content, including things that aren't really relevant to what users are searching for and will definitely get cut off in search results.">

<!-- ✅ Good -->
<meta name="description" content="Learn how to build modern web applications with our comprehensive guides, tutorials, and API reference documentation.">
```

**Error message:** `Description is ${length} characters - optimal range is 50-160`

**Tip:** `Aim for 50-160 characters with key information first`

**Severity:** warning

---

### 19. `html-meta/description-no-truncation`

**What it catches:** Description that will obviously be truncated

**Why:** Truncated descriptions look unprofessional and may lose meaning

**Detection:** Description that ends mid-sentence or with "..."

```html
<!-- ❌ Bad - already truncated -->
<meta name="description" content="We offer the best services for...">
<meta name="description" content="Our company provides excellent">

<!-- ✅ Good - complete sentence -->
<meta name="description" content="We offer premium web development services for startups and enterprises.">
```

**Error message:** `Description appears truncated - end with complete thought`

**Tip:** `Write complete sentences that work if truncated`

**Severity:** warning

---

### 20. `html-meta/description-no-duplicate-title`

**What it catches:** Description that just repeats the title

**Why:** Wastes opportunity to provide additional information

**Detection:** Description content ~matches title content

```html
<!-- ❌ Bad - same as title -->
<title>Getting Started Guide</title>
<meta name="description" content="Getting Started Guide">

<!-- ✅ Good - expands on title -->
<title>Getting Started Guide</title>
<meta name="description" content="Learn how to install, configure, and deploy your first application in under 10 minutes.">
```

**Error message:** `Description duplicates title - provide additional information`

**Tip:** `Expand on the title with details, benefits, or call-to-action`

**Severity:** warning

---

## Part 3: Open Graph (Facebook/LinkedIn)

### 21. `html-meta/require-og-title`

**What it catches:** Missing `og:title` for social sharing

**Why:** Controls how page appears when shared on Facebook, LinkedIn, etc.

**Detection:** No `<meta property="og:title">` when other OG tags present or page is public

```html
<!-- ❌ Bad - missing og:title -->
<meta property="og:description" content="...">
<meta property="og:image" content="...">

<!-- ✅ Good -->
<meta property="og:title" content="Page Title">
<meta property="og:description" content="...">
<meta property="og:image" content="...">
```

**Error message:** `Missing og:title for social sharing`

**Tip:** `Add <meta property="og:title" content="...">`

**Severity:** warning

---

### 22. `html-meta/require-og-description`

**What it catches:** Missing `og:description`

**Why:** Provides description text in social shares

**Detection:** No `<meta property="og:description">`

```html
<!-- ❌ Bad -->
<meta property="og:title" content="...">
<!-- missing og:description -->

<!-- ✅ Good -->
<meta property="og:title" content="...">
<meta property="og:description" content="Compelling description for social sharing.">
```

**Error message:** `Missing og:description for social sharing`

**Tip:** `Add <meta property="og:description" content="...">`

**Severity:** warning

---

### 23. `html-meta/require-og-image`

**What it catches:** Missing `og:image`

**Why:** Social shares without images get significantly less engagement

**Detection:** No `<meta property="og:image">`

```html
<!-- ❌ Bad - no image -->
<meta property="og:title" content="...">
<meta property="og:description" content="...">

<!-- ✅ Good -->
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="https://example.com/image.jpg">
```

**Error message:** `Missing og:image - social shares without images get less engagement`

**Tip:** `Add <meta property="og:image" content="https://...">`

**Severity:** warning

---

### 24. `html-meta/require-og-url`

**What it catches:** Missing `og:url`

**Why:** Canonical URL for the shared content

**Detection:** No `<meta property="og:url">`

```html
<!-- ❌ Bad -->
<meta property="og:title" content="...">
<!-- missing og:url -->

<!-- ✅ Good -->
<meta property="og:title" content="...">
<meta property="og:url" content="https://example.com/page">
```

**Error message:** `Missing og:url`

**Tip:** `Add <meta property="og:url" content="https://...">`

**Severity:** warning

---

### 25. `html-meta/require-og-type`

**What it catches:** Missing `og:type`

**Why:** Tells platforms what kind of content (website, article, product, etc.)

**Detection:** No `<meta property="og:type">`

```html
<!-- ❌ Bad -->
<meta property="og:title" content="...">
<!-- missing og:type -->

<!-- ✅ Good - for general pages -->
<meta property="og:type" content="website">

<!-- ✅ Good - for blog posts -->
<meta property="og:type" content="article">

<!-- ✅ Good - for products -->
<meta property="og:type" content="product">
```

**Error message:** `Missing og:type`

**Tip:** `Add <meta property="og:type" content="website"> or "article"`

**Severity:** warning

---

### 26. `html-meta/require-og-site-name`

**What it catches:** Missing `og:site_name`

**Why:** Shows the overall site name in addition to page title

**Detection:** No `<meta property="og:site_name">`

```html
<!-- ✅ Good -->
<meta property="og:site_name" content="MyApp">
<meta property="og:title" content="Getting Started - MyApp">
```

**Error message:** `Missing og:site_name`

**Tip:** `Add <meta property="og:site_name" content="Your Site Name">`

**Severity:** info

---

### 27. `html-meta/og-url-absolute`

**What it catches:** Relative URL in `og:url`

**Why:** OG URLs must be absolute for social platforms to resolve

**Detection:** `og:url` not starting with `http://` or `https://`

```html
<!-- ❌ Bad - relative -->
<meta property="og:url" content="/page">
<meta property="og:url" content="page.html">

<!-- ✅ Good - absolute -->
<meta property="og:url" content="https://example.com/page">
```

**Error message:** `og:url must be absolute URL`

**Tip:** `Use full URL: https://example.com/page`

**Severity:** error

---

### 28. `html-meta/og-image-absolute`

**What it catches:** Relative URL in `og:image`

**Why:** Social platforms can't resolve relative image URLs

**Detection:** `og:image` not starting with `http://` or `https://`

```html
<!-- ❌ Bad - relative -->
<meta property="og:image" content="/images/og.jpg">
<meta property="og:image" content="og.jpg">

<!-- ✅ Good - absolute -->
<meta property="og:image" content="https://example.com/images/og.jpg">
```

**Error message:** `og:image must be absolute URL`

**Tip:** `Use full URL: https://example.com/images/...`

**Severity:** error

---

### 29. `html-meta/og-image-dimensions`

**What it catches:** Missing `og:image:width` and `og:image:height`

**Why:** Dimensions help platforms render preview faster without fetching image

**Detection:** Has `og:image` but missing width/height

```html
<!-- ❌ Bad - no dimensions -->
<meta property="og:image" content="https://example.com/image.jpg">

<!-- ✅ Good -->
<meta property="og:image" content="https://example.com/image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

**Error message:** `Missing og:image:width and og:image:height`

**Tip:** `Add dimensions for faster social preview rendering`

**Severity:** info

---

### 30. `html-meta/og-image-size-optimal`

**What it catches:** OG image not optimal size

**Why:** 1200x630 is optimal for Facebook/LinkedIn; smaller images may not display

**Detection:** `og:image:width` < 1200 or `og:image:height` < 630

```html
<!-- ❌ Bad - too small -->
<meta property="og:image:width" content="600">
<meta property="og:image:height" content="315">

<!-- ⚠️ Warning - non-standard ratio -->
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">

<!-- ✅ Good - optimal size (1.91:1 ratio) -->
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

**Error message:** `OG image should be at least 1200x630 for optimal display`

**Tip:** `Use 1200x630 pixels (1.91:1 ratio)`

**Severity:** warning

---

### 31. `html-meta/og-image-alt`

**What it catches:** Missing `og:image:alt`

**Why:** Accessibility - provides alt text for social image

**Detection:** Has `og:image` but missing `og:image:alt`

```html
<!-- ❌ Bad - no alt -->
<meta property="og:image" content="https://example.com/image.jpg">

<!-- ✅ Good -->
<meta property="og:image" content="https://example.com/image.jpg">
<meta property="og:image:alt" content="Screenshot of the dashboard showing analytics">
```

**Error message:** `Missing og:image:alt for accessibility`

**Tip:** `Add <meta property="og:image:alt" content="...">`

**Severity:** warning

---

### 32. `html-meta/og-image-type`

**What it catches:** Missing or invalid `og:image:type`

**Why:** Helps platforms handle image correctly

**Detection:** Missing or invalid MIME type

```html
<!-- ✅ Good -->
<meta property="og:image" content="https://example.com/image.jpg">
<meta property="og:image:type" content="image/jpeg">

<!-- ✅ Good - PNG -->
<meta property="og:image:type" content="image/png">

<!-- ✅ Good - WebP -->
<meta property="og:image:type" content="image/webp">
```

**Error message:** `Consider adding og:image:type`

**Tip:** `Add <meta property="og:image:type" content="image/jpeg">`

**Severity:** info

---

### 33. `html-meta/og-locale`

**What it catches:** Missing `og:locale`

**Why:** Specifies content language for international audiences

**Detection:** No `og:locale` when page has lang attribute

```html
<!-- ✅ Good -->
<meta property="og:locale" content="en_US">

<!-- ✅ Good - with alternates -->
<meta property="og:locale" content="en_US">
<meta property="og:locale:alternate" content="es_ES">
<meta property="og:locale:alternate" content="fr_FR">
```

**Error message:** `Consider adding og:locale`

**Tip:** `Add <meta property="og:locale" content="en_US">`

**Severity:** info

---

## Part 4: Twitter Cards

### 34. `html-meta/require-twitter-card`

**What it catches:** Missing Twitter card meta

**Why:** Controls how links appear on Twitter/X

**Detection:** No `<meta name="twitter:card">`

```html
<!-- ❌ Bad - no twitter card -->
<meta property="og:title" content="...">

<!-- ✅ Good -->
<meta name="twitter:card" content="summary_large_image">
```

**Error message:** `Missing twitter:card meta`

**Tip:** `Add <meta name="twitter:card" content="summary_large_image">`

**Severity:** warning

---

### 35. `html-meta/twitter-card-type-valid`

**What it catches:** Invalid Twitter card type

**Why:** Only specific card types are supported

**Detection:** `twitter:card` with invalid value

**Valid values:** `summary`, `summary_large_image`, `app`, `player`

```html
<!-- ❌ Bad - invalid type -->
<meta name="twitter:card" content="large">
<meta name="twitter:card" content="image">
<meta name="twitter:card" content="article">

<!-- ✅ Good -->
<meta name="twitter:card" content="summary">
<meta name="twitter:card" content="summary_large_image">
```

**Error message:** `Invalid twitter:card type '${value}'`

**Tip:** `Use: summary, summary_large_image, app, or player`

**Severity:** error

---

### 36. `html-meta/twitter-title-length`

**What it catches:** Twitter title too long

**Why:** Twitter truncates titles over 70 characters

**Detection:** `twitter:title` content > 70 characters

```html
<!-- ❌ Bad - too long -->
<meta name="twitter:title" content="This is an extremely long title that will definitely get truncated on Twitter">

<!-- ✅ Good -->
<meta name="twitter:title" content="Getting Started with Our Platform">
```

**Error message:** `twitter:title is ${length} chars - max 70 recommended`

**Tip:** `Keep twitter:title under 70 characters`

**Severity:** warning

---

### 37. `html-meta/twitter-description-length`

**What it catches:** Twitter description too long

**Why:** Twitter truncates descriptions over 200 characters

**Detection:** `twitter:description` content > 200 characters

```html
<!-- ❌ Bad - too long -->
<meta name="twitter:description" content="[200+ character description...]">

<!-- ✅ Good -->
<meta name="twitter:description" content="Learn how to build modern applications with our comprehensive documentation and tutorials.">
```

**Error message:** `twitter:description is ${length} chars - max 200 recommended`

**Tip:** `Keep twitter:description under 200 characters`

**Severity:** warning

---

### 38. `html-meta/twitter-image-size`

**What it catches:** Twitter image wrong size

**Why:** summary_large_image requires specific dimensions

**Detection:** Image dimensions don't meet Twitter requirements

**Requirements:**
- summary: 144x144 to 4096x4096, 1:1 ratio
- summary_large_image: 300x157 minimum, 2:1 ratio preferred

```html
<!-- ❌ Bad - too small for large image -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://example.com/small.jpg">
<!-- Image is 200x100 -->

<!-- ✅ Good -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://example.com/large.jpg">
<!-- Image is 1200x600 (2:1 ratio) -->
```

**Error message:** `Twitter ${card_type} requires minimum ${dimensions}`

**Tip:** `Use 1200x600 for summary_large_image`

**Severity:** warning

---

### 39. `html-meta/twitter-site-handle`

**What it catches:** Missing `twitter:site`

**Why:** Attribution to site's Twitter account

**Detection:** No `twitter:site` when twitter:card present

```html
<!-- ❌ Bad - no attribution -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="...">

<!-- ✅ Good -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@mycompany">
<meta name="twitter:title" content="...">
```

**Error message:** `Missing twitter:site for account attribution`

**Tip:** `Add <meta name="twitter:site" content="@handle">`

**Severity:** info

---

### 40. `html-meta/twitter-creator-handle`

**What it catches:** Missing `twitter:creator` for articles

**Why:** Attribution to content author

**Detection:** Article/blog post without `twitter:creator`

```html
<!-- ✅ Good - for articles/blog posts -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@company">
<meta name="twitter:creator" content="@author">
```

**Error message:** `Consider adding twitter:creator for author attribution`

**Tip:** `Add <meta name="twitter:creator" content="@author">`

**Severity:** info

---

### 41. `html-meta/twitter-image-alt`

**What it catches:** Missing `twitter:image:alt`

**Why:** Accessibility for Twitter images

**Detection:** Has `twitter:image` but missing `twitter:image:alt`

```html
<!-- ❌ Bad - no alt -->
<meta name="twitter:image" content="https://example.com/image.jpg">

<!-- ✅ Good -->
<meta name="twitter:image" content="https://example.com/image.jpg">
<meta name="twitter:image:alt" content="Dashboard screenshot showing key metrics">
```

**Error message:** `Missing twitter:image:alt for accessibility`

**Tip:** `Add <meta name="twitter:image:alt" content="...">`

**Severity:** warning

---

## Part 5: Canonical & URLs

### 42. `html-meta/require-canonical`

**What it catches:** Missing canonical link

**Why:** Prevents duplicate content issues, consolidates SEO signals

**Detection:** No `<link rel="canonical">` in head

```html
<!-- ❌ Bad - no canonical -->
<head>
  <title>Page</title>
</head>

<!-- ✅ Good -->
<head>
  <title>Page</title>
  <link rel="canonical" href="https://example.com/page">
</head>
```

**Error message:** `Missing canonical link`

**Tip:** `Add <link rel="canonical" href="https://...">`

**Severity:** warning

---

### 43. `html-meta/canonical-absolute`

**What it catches:** Relative canonical URL

**Why:** Canonical must be absolute URL

**Detection:** Canonical href not starting with http(s)

```html
<!-- ❌ Bad - relative -->
<link rel="canonical" href="/page">
<link rel="canonical" href="page.html">

<!-- ✅ Good - absolute -->
<link rel="canonical" href="https://example.com/page">
```

**Error message:** `Canonical URL must be absolute`

**Tip:** `Use full URL: https://example.com/page`

**Severity:** error

---

### 44. `html-meta/canonical-self-referencing`

**What it catches:** Canonical pointing to different page

**Why:** Usually canonical should point to self (unless intentional redirect)

**Detection:** Canonical href doesn't match current page URL pattern

```html
<!-- ⚠️ Warning - points elsewhere (verify intentional) -->
<link rel="canonical" href="https://example.com/other-page">

<!-- ✅ Good - self-referencing -->
<!-- On page /getting-started -->
<link rel="canonical" href="https://example.com/getting-started">
```

**Error message:** `Canonical points to different URL - verify intentional`

**Tip:** `Canonical usually points to self unless consolidating duplicates`

**Severity:** info

---

### 45. `html-meta/canonical-matches-og-url`

**What it catches:** Canonical and og:url mismatch

**Why:** These should be consistent to avoid confusion

**Detection:** canonical href != og:url content

```html
<!-- ❌ Bad - mismatch -->
<link rel="canonical" href="https://example.com/page">
<meta property="og:url" content="https://example.com/different-page">

<!-- ✅ Good - matching -->
<link rel="canonical" href="https://example.com/page">
<meta property="og:url" content="https://example.com/page">
```

**Error message:** `Canonical and og:url should match`

**Tip:** `Ensure both point to the same URL`

**Severity:** warning

---

### 46. `html-meta/no-multiple-canonicals`

**What it catches:** Multiple canonical links

**Why:** Only one canonical should exist

**Detection:** More than one `<link rel="canonical">`

```html
<!-- ❌ Bad - multiple -->
<link rel="canonical" href="https://example.com/page">
<link rel="canonical" href="https://example.com/page/">

<!-- ✅ Good - single -->
<link rel="canonical" href="https://example.com/page">
```

**Error message:** `Multiple canonical links found`

**Tip:** `Remove duplicate canonical links`

**Severity:** error

---

### 47. `html-meta/canonical-https`

**What it catches:** Canonical using HTTP instead of HTTPS

**Why:** HTTPS is standard; HTTP canonical may cause issues

**Detection:** Canonical href starting with `http://`

```html
<!-- ❌ Bad - HTTP -->
<link rel="canonical" href="http://example.com/page">

<!-- ✅ Good - HTTPS -->
<link rel="canonical" href="https://example.com/page">
```

**Error message:** `Canonical should use HTTPS`

**Tip:** `Change to https://`

**Severity:** warning

---

## Part 6: Robots & Crawling

### 48. `html-meta/valid-robots-content`

**What it catches:** Invalid robots meta directives

**Why:** Invalid directives are ignored, may not achieve intended effect

**Detection:** robots meta with unrecognized directives

**Valid directives:** `index`, `noindex`, `follow`, `nofollow`, `none`, `noarchive`, `nosnippet`, `noimageindex`, `nocache`, `notranslate`, `noodp`, `unavailable_after`

```html
<!-- ❌ Bad - invalid directive -->
<meta name="robots" content="no-index">  <!-- Should be noindex -->
<meta name="robots" content="donotindex">
<meta name="robots" content="norobots">

<!-- ✅ Good -->
<meta name="robots" content="index, follow">
<meta name="robots" content="noindex, nofollow">
<meta name="robots" content="noindex, follow">
```

**Error message:** `Invalid robots directive '${directive}'`

**Tip:** `Valid directives: index, noindex, follow, nofollow, none, noarchive, nosnippet`

**Severity:** error

---

### 49. `html-meta/no-conflicting-robots`

**What it catches:** Conflicting robots directives

**Why:** `index` and `noindex` together is contradictory

**Detection:** Both `index` and `noindex` or `follow` and `nofollow` in same meta

```html
<!-- ❌ Bad - conflicting -->
<meta name="robots" content="index, noindex">
<meta name="robots" content="follow, nofollow">

<!-- ✅ Good -->
<meta name="robots" content="noindex, follow">
<meta name="robots" content="index, nofollow">
```

**Error message:** `Conflicting robots directives: ${directives}`

**Tip:** `Remove conflicting directive`

**Severity:** error

---

### 50. `html-meta/noindex-warning`

**What it catches:** Page set to noindex

**Why:** Intentional but should be verified - prevents search indexing

**Detection:** `noindex` in robots meta

```html
<!-- ⚠️ Warning - verify intentional -->
<meta name="robots" content="noindex">
<meta name="robots" content="noindex, follow">
<meta name="robots" content="none">

<!-- ✅ OK if intentional - staging, private pages, etc. -->
```

**Error message:** `Page is set to noindex - verify this is intentional`

**Tip:** `Remove noindex if page should appear in search results`

**Severity:** info

---

### 51. `html-meta/googlebot-consistency`

**What it catches:** googlebot meta inconsistent with robots meta

**Why:** Conflicting directives cause unpredictable behavior

**Detection:** `googlebot` meta conflicts with `robots` meta

```html
<!-- ❌ Bad - conflicting -->
<meta name="robots" content="noindex">
<meta name="googlebot" content="index">

<!-- ✅ Good - consistent -->
<meta name="robots" content="noindex">
<meta name="googlebot" content="noindex">

<!-- ✅ Good - googlebot-specific addition -->
<meta name="robots" content="index, follow">
<meta name="googlebot" content="index, follow, max-snippet:150">
```

**Error message:** `googlebot meta conflicts with robots meta`

**Tip:** `Ensure googlebot and robots directives are consistent`

**Severity:** warning

---

### 52. `html-meta/max-snippet-valid`

**What it catches:** Invalid max-snippet value

**Why:** max-snippet requires number of characters or -1

**Detection:** max-snippet with invalid value

```html
<!-- ❌ Bad - invalid -->
<meta name="robots" content="max-snippet:large">
<meta name="robots" content="max-snippet:">

<!-- ✅ Good -->
<meta name="robots" content="max-snippet:-1">  <!-- No limit -->
<meta name="robots" content="max-snippet:0">   <!-- No snippet -->
<meta name="robots" content="max-snippet:150"> <!-- 150 chars -->
```

**Error message:** `Invalid max-snippet value '${value}'`

**Tip:** `Use number (-1 for no limit, 0 for none, or positive number)`

**Severity:** error

---

### 53. `html-meta/max-image-preview-valid`

**What it catches:** Invalid max-image-preview value

**Why:** Only specific values are supported

**Detection:** max-image-preview with invalid value

**Valid values:** `none`, `standard`, `large`

```html
<!-- ❌ Bad -->
<meta name="robots" content="max-image-preview:small">
<meta name="robots" content="max-image-preview:medium">

<!-- ✅ Good -->
<meta name="robots" content="max-image-preview:large">
<meta name="robots" content="max-image-preview:standard">
<meta name="robots" content="max-image-preview:none">
```

**Error message:** `Invalid max-image-preview value '${value}'`

**Tip:** `Use: none, standard, or large`

**Severity:** error

---

### 54. `html-meta/unavailable-after-format`

**What it catches:** Invalid unavailable_after date format

**Why:** Requires RFC 850 date format

**Detection:** unavailable_after with non-RFC-850 date

```html
<!-- ❌ Bad - wrong format -->
<meta name="robots" content="unavailable_after:2024-12-31">
<meta name="robots" content="unavailable_after:Dec 31, 2024">

<!-- ✅ Good - RFC 850 format -->
<meta name="robots" content="unavailable_after: 31 Dec 2024 23:59:59 GMT">
```

**Error message:** `unavailable_after requires RFC 850 date format`

**Tip:** `Format: DD Mon YYYY HH:MM:SS GMT`

**Severity:** error

---

## Part 7: Internationalization (hreflang)

### 55. `html-meta/require-hreflang`

**What it catches:** Multi-language site without hreflang

**Why:** hreflang tells search engines about language variants

**Detection:** Site has multiple language versions but no hreflang links

```html
<!-- ❌ Bad - multi-lang site without hreflang -->
<!-- On /en/page -->
<head>
  <title>Page - English</title>
  <!-- No hreflang! -->
</head>

<!-- ✅ Good -->
<head>
  <link rel="alternate" hreflang="en" href="https://example.com/en/page">
  <link rel="alternate" hreflang="es" href="https://example.com/es/page">
  <link rel="alternate" hreflang="x-default" href="https://example.com/page">
</head>
```

**Error message:** `Multi-language site should have hreflang links`

**Tip:** `Add hreflang links for all language versions`

**Severity:** warning

---

### 56. `html-meta/hreflang-self-reference`

**What it catches:** Missing self-referencing hreflang

**Why:** Each page should include hreflang pointing to itself

**Detection:** hreflang links present but none matches current page

```html
<!-- ❌ Bad - missing self-reference -->
<!-- On /en/page -->
<link rel="alternate" hreflang="es" href="https://example.com/es/page">
<link rel="alternate" hreflang="fr" href="https://example.com/fr/page">
<!-- Missing hreflang="en" for current page! -->

<!-- ✅ Good -->
<link rel="alternate" hreflang="en" href="https://example.com/en/page">
<link rel="alternate" hreflang="es" href="https://example.com/es/page">
<link rel="alternate" hreflang="fr" href="https://example.com/fr/page">
```

**Error message:** `Missing self-referencing hreflang for current page`

**Tip:** `Include hreflang pointing to current page`

**Severity:** error

---

### 57. `html-meta/hreflang-x-default`

**What it catches:** Missing x-default hreflang

**Why:** x-default provides fallback for unsupported languages

**Detection:** hreflang links without x-default

```html
<!-- ❌ Bad - no x-default -->
<link rel="alternate" hreflang="en" href="...">
<link rel="alternate" hreflang="es" href="...">

<!-- ✅ Good -->
<link rel="alternate" hreflang="en" href="...">
<link rel="alternate" hreflang="es" href="...">
<link rel="alternate" hreflang="x-default" href="...">
```

**Error message:** `Missing hreflang="x-default" for language fallback`

**Tip:** `Add <link rel="alternate" hreflang="x-default" href="...">`

**Severity:** warning

---

### 58. `html-meta/hreflang-valid-code`

**What it catches:** Invalid hreflang language codes

**Why:** Invalid codes are ignored by search engines

**Detection:** hreflang value not valid ISO 639-1 or ISO 639-1 + ISO 3166-1 Alpha 2

```html
<!-- ❌ Bad - invalid codes -->
<link rel="alternate" hreflang="english" href="...">
<link rel="alternate" hreflang="uk" href="...">  <!-- UK is country -->
<link rel="alternate" hreflang="en_US" href="...">  <!-- Underscore wrong -->

<!-- ✅ Good -->
<link rel="alternate" hreflang="en" href="...">
<link rel="alternate" hreflang="en-US" href="...">
<link rel="alternate" hreflang="en-GB" href="...">
<link rel="alternate" hreflang="zh-Hans" href="...">
<link rel="alternate" hreflang="pt-BR" href="...">
```

**Error message:** `Invalid hreflang code '${code}'`

**Tip:** `Use ISO 639-1 language code, optionally with ISO 3166-1 region: en-US`

**Severity:** error

---

### 59. `html-meta/hreflang-absolute-url`

**What it catches:** Relative URLs in hreflang

**Why:** hreflang URLs must be absolute

**Detection:** hreflang href not starting with http(s)

```html
<!-- ❌ Bad - relative -->
<link rel="alternate" hreflang="es" href="/es/page">

<!-- ✅ Good - absolute -->
<link rel="alternate" hreflang="es" href="https://example.com/es/page">
```

**Error message:** `hreflang URLs must be absolute`

**Tip:** `Use full URL: https://example.com/...`

**Severity:** error

---

## Part 8: Article Metadata

### 60. `html-meta/article-published-time`

**What it catches:** Article missing published time

**Why:** Published date helps search engines and users

**Detection:** `og:type="article"` without `article:published_time`

```html
<!-- ❌ Bad - article without date -->
<meta property="og:type" content="article">
<meta property="og:title" content="Blog Post">

<!-- ✅ Good -->
<meta property="og:type" content="article">
<meta property="article:published_time" content="2024-01-15T09:00:00Z">
```

**Error message:** `Article missing published_time`

**Tip:** `Add <meta property="article:published_time" content="ISO8601">`

**Severity:** warning

---

### 61. `html-meta/article-modified-time`

**What it catches:** Article missing modified time

**Why:** Shows content freshness

**Detection:** `og:type="article"` without `article:modified_time`

```html
<!-- ✅ Good -->
<meta property="og:type" content="article">
<meta property="article:published_time" content="2024-01-15T09:00:00Z">
<meta property="article:modified_time" content="2024-01-20T14:30:00Z">
```

**Error message:** `Article missing modified_time`

**Tip:** `Add <meta property="article:modified_time" content="ISO8601">`

**Severity:** info

---

### 62. `html-meta/article-author`

**What it catches:** Article missing author

**Why:** Author attribution for articles

**Detection:** `og:type="article"` without `article:author`

```html
<!-- ✅ Good -->
<meta property="og:type" content="article">
<meta property="article:author" content="https://example.com/author/jane">
<!-- Or -->
<meta property="article:author" content="Jane Smith">
```

**Error message:** `Article missing author`

**Tip:** `Add <meta property="article:author" content="...">`

**Severity:** info

---

### 63. `html-meta/article-section`

**What it catches:** Article missing section/category

**Why:** Helps categorize content

**Detection:** `og:type="article"` without `article:section`

```html
<!-- ✅ Good -->
<meta property="og:type" content="article">
<meta property="article:section" content="Technology">
```

**Error message:** `Article missing section`

**Tip:** `Add <meta property="article:section" content="Category">`

**Severity:** info

---

### 64. `html-meta/article-tag`

**What it catches:** Article missing tags

**Why:** Tags help with content discovery

**Detection:** `og:type="article"` without any `article:tag`

```html
<!-- ✅ Good -->
<meta property="og:type" content="article">
<meta property="article:tag" content="JavaScript">
<meta property="article:tag" content="Web Development">
<meta property="article:tag" content="Tutorial">
```

**Error message:** `Consider adding article:tag for content discovery`

**Tip:** `Add <meta property="article:tag" content="Tag">`

**Severity:** info

---

### 65. `html-meta/article-time-format`

**What it catches:** Invalid date format in article times

**Why:** Must be ISO 8601 format

**Detection:** article:published_time or article:modified_time not ISO 8601

```html
<!-- ❌ Bad - wrong format -->
<meta property="article:published_time" content="January 15, 2024">
<meta property="article:published_time" content="2024/01/15">
<meta property="article:published_time" content="15-01-2024">

<!-- ✅ Good - ISO 8601 -->
<meta property="article:published_time" content="2024-01-15">
<meta property="article:published_time" content="2024-01-15T09:00:00Z">
<meta property="article:published_time" content="2024-01-15T09:00:00+00:00">
```

**Error message:** `Article time must be ISO 8601 format`

**Tip:** `Use format: YYYY-MM-DDTHH:MM:SSZ`

**Severity:** error

---

## Part 9: Security Meta

### 66. `html-meta/require-csp`

**What it catches:** Missing Content Security Policy

**Why:** CSP prevents XSS and other injection attacks

**Detection:** No CSP meta tag or header indication

```html
<!-- ❌ Bad - no CSP -->
<head>
  <title>Page</title>
</head>

<!-- ✅ Good - CSP meta tag -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'">

<!-- ✅ Good - via HTTP header (can't detect in HTML, but preferred) -->
```

**Error message:** `Consider adding Content-Security-Policy`

**Tip:** `Add CSP via meta tag or HTTP header`

**Severity:** info

---

### 67. `html-meta/csp-no-unsafe-inline`

**What it catches:** CSP with unsafe-inline

**Why:** unsafe-inline defeats much of CSP's protection

**Detection:** CSP containing `'unsafe-inline'`

```html
<!-- ❌ Bad - unsafe-inline -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'unsafe-inline'">

<!-- ✅ Good - use nonces or hashes -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'nonce-abc123'">
```

**Error message:** `CSP contains 'unsafe-inline' which weakens protection`

**Tip:** `Use nonces or hashes instead of 'unsafe-inline'`

**Severity:** warning

---

### 68. `html-meta/csp-no-unsafe-eval`

**What it catches:** CSP with unsafe-eval

**Why:** unsafe-eval allows eval() which is dangerous

**Detection:** CSP containing `'unsafe-eval'`

```html
<!-- ❌ Bad -->
<meta http-equiv="Content-Security-Policy"
      content="script-src 'self' 'unsafe-eval'">

<!-- ✅ Good -->
<meta http-equiv="Content-Security-Policy"
      content="script-src 'self'">
```

**Error message:** `CSP contains 'unsafe-eval' which allows eval()`

**Tip:** `Remove 'unsafe-eval' and refactor code to not use eval()`

**Severity:** warning

---

### 69. `html-meta/referrer-policy`

**What it catches:** Missing referrer policy

**Why:** Controls what referrer information is sent

**Detection:** No `<meta name="referrer">` or referrer-policy header

```html
<!-- ✅ Good - strict policy -->
<meta name="referrer" content="strict-origin-when-cross-origin">

<!-- ✅ Good - no referrer for privacy -->
<meta name="referrer" content="no-referrer">

<!-- ✅ Good - same origin only -->
<meta name="referrer" content="same-origin">
```

**Error message:** `Consider adding referrer policy`

**Tip:** `Add <meta name="referrer" content="strict-origin-when-cross-origin">`

**Severity:** info

---

### 70. `html-meta/referrer-policy-valid`

**What it catches:** Invalid referrer policy value

**Why:** Invalid values are ignored

**Detection:** referrer meta with unrecognized value

**Valid values:** `no-referrer`, `no-referrer-when-downgrade`, `origin`, `origin-when-cross-origin`, `same-origin`, `strict-origin`, `strict-origin-when-cross-origin`, `unsafe-url`

```html
<!-- ❌ Bad - invalid -->
<meta name="referrer" content="none">
<meta name="referrer" content="no-referer">
<meta name="referrer" content="strict">

<!-- ✅ Good -->
<meta name="referrer" content="strict-origin-when-cross-origin">
```

**Error message:** `Invalid referrer policy '${value}'`

**Tip:** `Use: no-referrer, strict-origin-when-cross-origin, same-origin, etc.`

**Severity:** error

---

### 71. `html-meta/no-referrer-unsafe-url`

**What it catches:** Using unsafe-url referrer policy

**Why:** unsafe-url sends full URL including path and query to all origins

**Detection:** referrer policy set to `unsafe-url`

```html
<!-- ❌ Bad - leaks full URL -->
<meta name="referrer" content="unsafe-url">

<!-- ✅ Good -->
<meta name="referrer" content="strict-origin-when-cross-origin">
```

**Error message:** `unsafe-url referrer policy leaks full URL to all origins`

**Tip:** `Use strict-origin-when-cross-origin instead`

**Severity:** warning

---

### 72. `html-meta/x-frame-options`

**What it catches:** Missing frame protection for non-embedded pages

**Why:** Prevents clickjacking attacks

**Detection:** No X-Frame-Options meta (better via header)

```html
<!-- ✅ Info - consider adding if not meant to be framed -->
<meta http-equiv="X-Frame-Options" content="DENY">
<!-- Or -->
<meta http-equiv="X-Frame-Options" content="SAMEORIGIN">
```

**Error message:** `Consider X-Frame-Options or CSP frame-ancestors to prevent clickjacking`

**Tip:** `Add via HTTP header (preferred) or meta tag`

**Severity:** info

---

### 73. `html-meta/x-content-type-options`

**What it catches:** Missing X-Content-Type-Options

**Why:** Prevents MIME type sniffing attacks

**Detection:** No X-Content-Type-Options meta/header indication

```html
<!-- ✅ Good -->
<meta http-equiv="X-Content-Type-Options" content="nosniff">
```

**Error message:** `Consider X-Content-Type-Options: nosniff`

**Tip:** `Add via HTTP header (preferred)`

**Severity:** info

---

## Part 10: iOS/Safari Meta

### 74. `html-meta/require-apple-touch-icon`

**What it catches:** Missing Apple touch icon

**Why:** Required for iOS home screen bookmark

**Detection:** No `<link rel="apple-touch-icon">`

```html
<!-- ❌ Bad - no icon -->
<head>
  <title>App</title>
</head>

<!-- ✅ Good -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<!-- ✅ Good - with sizes -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

**Error message:** `Missing apple-touch-icon for iOS home screen`

**Tip:** `Add <link rel="apple-touch-icon" href="/apple-touch-icon.png">`

**Severity:** warning

---

### 75. `html-meta/apple-touch-icon-sizes`

**What it catches:** Missing icon size variants

**Why:** Different iOS devices need different sizes

**Detection:** Only one apple-touch-icon without sizes for multiple device support

```html
<!-- ⚠️ Warning - single size -->
<link rel="apple-touch-icon" href="/icon.png">

<!-- ✅ Good - multiple sizes -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180.png">
<link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152.png">
<link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120.png">

<!-- ✅ Good - modern approach (single 180x180) -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

**Error message:** `Consider providing apple-touch-icon sizes for different devices`

**Tip:** `180x180 covers most modern iOS devices`

**Severity:** info

---

### 76. `html-meta/apple-mobile-web-app-capable`

**What it catches:** PWA without iOS standalone mode meta

**Why:** Required for fullscreen PWA on iOS

**Detection:** Has manifest but missing apple-mobile-web-app-capable

```html
<!-- ❌ Bad - PWA without iOS support -->
<link rel="manifest" href="/manifest.json">

<!-- ✅ Good -->
<link rel="manifest" href="/manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
```

**Error message:** `PWA should include apple-mobile-web-app-capable for iOS`

**Tip:** `Add <meta name="apple-mobile-web-app-capable" content="yes">`

**Severity:** warning

---

### 77. `html-meta/apple-mobile-web-app-title`

**What it catches:** Missing iOS app title

**Why:** Provides custom title for iOS home screen (different from <title>)

**Detection:** Has apple-mobile-web-app-capable but no title

```html
<!-- ⚠️ Warning - will use <title> -->
<meta name="apple-mobile-web-app-capable" content="yes">

<!-- ✅ Good - custom short title -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="MyApp">
```

**Error message:** `Consider apple-mobile-web-app-title for iOS home screen`

**Tip:** `Add short app name for iOS home screen`

**Severity:** info

---

### 78. `html-meta/apple-mobile-web-app-status-bar`

**What it catches:** Missing iOS status bar style

**Why:** Controls status bar appearance in standalone mode

**Detection:** Has apple-mobile-web-app-capable but no status-bar-style

```html
<!-- ✅ Good -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">

<!-- ✅ Good - black status bar -->
<meta name="apple-mobile-web-app-status-bar-style" content="black">

<!-- ✅ Good - translucent (content under status bar) -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

**Error message:** `Consider apple-mobile-web-app-status-bar-style for iOS standalone`

**Tip:** `Add status bar style: default, black, or black-translucent`

**Severity:** info

---

### 79. `html-meta/apple-mobile-web-app-status-bar-valid`

**What it catches:** Invalid status bar style value

**Why:** Only specific values are supported

**Detection:** status-bar-style with invalid value

**Valid values:** `default`, `black`, `black-translucent`

```html
<!-- ❌ Bad -->
<meta name="apple-mobile-web-app-status-bar-style" content="white">
<meta name="apple-mobile-web-app-status-bar-style" content="transparent">

<!-- ✅ Good -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

**Error message:** `Invalid status-bar-style '${value}'`

**Tip:** `Use: default, black, or black-translucent`

**Severity:** error

---

### 80. `html-meta/apple-itunes-app`

**What it catches:** Native app without Smart App Banner

**Why:** Promotes native app to iOS Safari users

**Detection:** Site has native app but no apple-itunes-app meta

```html
<!-- ✅ Good - Smart App Banner -->
<meta name="apple-itunes-app" content="app-id=123456789">

<!-- ✅ Good - with affiliate and app-argument -->
<meta name="apple-itunes-app" content="app-id=123456789, affiliate-data=myAffiliateData, app-argument=myURL">
```

**Error message:** `Consider Smart App Banner if you have an iOS app`

**Tip:** `Add <meta name="apple-itunes-app" content="app-id=YOUR_APP_ID">`

**Severity:** info

---

### 81. `html-meta/apple-touch-startup-image`

**What it catches:** PWA without iOS splash screen

**Why:** Shows launch image when opening from home screen

**Detection:** Has apple-mobile-web-app-capable but no startup-image

```html
<!-- ✅ Good - splash screen -->
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="apple-touch-startup-image" href="/splash.png">

<!-- ✅ Good - device-specific splash screens -->
<link rel="apple-touch-startup-image"
      href="/splash-1125x2436.png"
      media="(device-width: 375px) and (device-height: 812px)">
```

**Error message:** `Consider apple-touch-startup-image for iOS PWA launch screen`

**Tip:** `Add splash screen images for iOS PWA`

**Severity:** info

---

### 82. `html-meta/format-detection`

**What it catches:** Missing format-detection control

**Why:** iOS auto-links phone numbers, emails - may not be desired

**Detection:** No format-detection meta

```html
<!-- ✅ Good - disable auto-detection -->
<meta name="format-detection" content="telephone=no">

<!-- ✅ Good - disable multiple -->
<meta name="format-detection" content="telephone=no, email=no, address=no, date=no">

<!-- ✅ Good - explicit enable (default behavior) -->
<meta name="format-detection" content="telephone=yes">
```

**Error message:** `Consider format-detection to control iOS auto-linking`

**Tip:** `Add if you don't want phone numbers auto-linked`

**Severity:** info

---

### 83. `html-meta/supported-color-schemes`

**What it catches:** Missing color scheme declaration

**Why:** Tells iOS/Safari about light/dark mode support

**Detection:** No color-scheme meta

```html
<!-- ✅ Good - supports both -->
<meta name="color-scheme" content="light dark">

<!-- ✅ Good - light only -->
<meta name="color-scheme" content="light">

<!-- ✅ Good - dark only -->
<meta name="color-scheme" content="dark">
```

**Error message:** `Consider color-scheme meta for light/dark mode`

**Tip:** `Add <meta name="color-scheme" content="light dark">`

**Severity:** info

---

### 84. `html-meta/apple-touch-icon-precomposed`

**What it catches:** Using deprecated precomposed icon

**Why:** apple-touch-icon-precomposed is deprecated

**Detection:** `rel="apple-touch-icon-precomposed"`

```html
<!-- ❌ Bad - deprecated -->
<link rel="apple-touch-icon-precomposed" href="/icon.png">

<!-- ✅ Good -->
<link rel="apple-touch-icon" href="/icon.png">
```

**Error message:** `apple-touch-icon-precomposed is deprecated`

**Tip:** `Use rel="apple-touch-icon" instead`

**Severity:** warning

---

## Part 11: Android/Chrome Meta

### 85. `html-meta/require-theme-color`

**What it catches:** Missing theme-color

**Why:** Colors browser UI on Android and other platforms

**Detection:** No `<meta name="theme-color">`

```html
<!-- ❌ Bad - no theme color -->
<head>
  <title>App</title>
</head>

<!-- ✅ Good -->
<meta name="theme-color" content="#4285f4">

<!-- ✅ Good - with media query for dark mode -->
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
```

**Error message:** `Missing theme-color meta`

**Tip:** `Add <meta name="theme-color" content="#hexcolor">`

**Severity:** warning

---

### 86. `html-meta/theme-color-valid`

**What it catches:** Invalid theme-color value

**Why:** Must be valid CSS color

**Detection:** theme-color content not valid color format

```html
<!-- ❌ Bad - invalid -->
<meta name="theme-color" content="blue-ish">
<meta name="theme-color" content="brand-color">
<meta name="theme-color" content="#gggggg">

<!-- ✅ Good -->
<meta name="theme-color" content="#4285f4">
<meta name="theme-color" content="rgb(66, 133, 244)">
<meta name="theme-color" content="hsl(217, 89%, 61%)">
```

**Error message:** `Invalid theme-color value '${value}'`

**Tip:** `Use valid CSS color: hex, rgb(), or hsl()`

**Severity:** error

---

### 87. `html-meta/mobile-web-app-capable`

**What it catches:** PWA without Android standalone meta

**Why:** Counterpart to apple-mobile-web-app-capable for Android

**Detection:** Has manifest and apple meta but no mobile-web-app-capable

```html
<!-- ✅ Good - both platforms -->
<link rel="manifest" href="/manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
```

**Error message:** `Consider mobile-web-app-capable for Android PWA`

**Tip:** `Add <meta name="mobile-web-app-capable" content="yes">`

**Severity:** info

---

### 88. `html-meta/application-name`

**What it catches:** Missing application name

**Why:** Used when pinned/installed on Android

**Detection:** PWA without application-name

```html
<!-- ✅ Good -->
<meta name="application-name" content="MyApp">
```

**Error message:** `Consider application-name for installed app name`

**Tip:** `Add <meta name="application-name" content="App Name">`

**Severity:** info

---

### 89. `html-meta/google-play-app`

**What it catches:** Native Android app without Smart App Banner

**Why:** Promotes native app to Android Chrome users

**Detection:** Site has native app but no google-play-app meta (if detectable)

```html
<!-- ✅ Good - Android Smart App Banner -->
<meta name="google-play-app" content="app-id=com.example.app">
```

**Error message:** `Consider Smart App Banner if you have an Android app`

**Tip:** `Add <meta name="google-play-app" content="app-id=...">`

**Severity:** info

---

### 90. `html-meta/require-manifest`

**What it catches:** PWA without web app manifest

**Why:** Manifest required for installable PWA

**Detection:** Has PWA meta tags but no manifest link

```html
<!-- ❌ Bad - PWA meta without manifest -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#4285f4">

<!-- ✅ Good -->
<link rel="manifest" href="/manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#4285f4">
```

**Error message:** `PWA should have web app manifest`

**Tip:** `Add <link rel="manifest" href="/manifest.json">`

**Severity:** warning

---

## Part 12: Windows/Microsoft Meta

### 91. `html-meta/msapplication-tile-color`

**What it catches:** Missing Windows tile color

**Why:** Background color for Windows tiles/start menu

**Detection:** No msapplication-TileColor

```html
<!-- ✅ Good -->
<meta name="msapplication-TileColor" content="#4285f4">
```

**Error message:** `Consider msapplication-TileColor for Windows tiles`

**Tip:** `Add <meta name="msapplication-TileColor" content="#hexcolor">`

**Severity:** info

---

### 92. `html-meta/msapplication-tile-image`

**What it catches:** Missing Windows tile image

**Why:** Icon for Windows tiles/start menu

**Detection:** No msapplication-TileImage

```html
<!-- ✅ Good -->
<meta name="msapplication-TileImage" content="/mstile-144x144.png">
```

**Error message:** `Consider msapplication-TileImage for Windows tiles`

**Tip:** `Add 144x144 PNG for Windows tiles`

**Severity:** info

---

### 93. `html-meta/msapplication-config`

**What it catches:** Missing browserconfig.xml link

**Why:** Windows can read extended config from browserconfig.xml

**Detection:** No msapplication-config

```html
<!-- ✅ Good -->
<meta name="msapplication-config" content="/browserconfig.xml">
```

**Error message:** `Consider browserconfig.xml for Windows customization`

**Tip:** `Add <meta name="msapplication-config" content="/browserconfig.xml">`

**Severity:** info

---

### 94. `html-meta/msapplication-starturl`

**What it catches:** Missing Windows start URL

**Why:** URL when opening pinned site

**Detection:** Pinned site without msapplication-starturl

```html
<!-- ✅ Good -->
<meta name="msapplication-starturl" content="/">
```

**Error message:** `Consider msapplication-starturl for Windows pinned sites`

**Tip:** `Add <meta name="msapplication-starturl" content="/">`

**Severity:** info

---

### 95. `html-meta/msapplication-navbutton-color`

**What it catches:** Missing Windows navigation button color

**Why:** Colors the back/forward buttons

**Detection:** No msapplication-navbutton-color

```html
<!-- ✅ Good -->
<meta name="msapplication-navbutton-color" content="#4285f4">
```

**Error message:** `Consider msapplication-navbutton-color for Windows`

**Tip:** `Add navigation button color for Windows`

**Severity:** info

---

## Part 13: Verification & Third-Party

### 96. `html-meta/google-site-verification`

**What it catches:** Google Search Console verification

**Why:** Required for Search Console access

**Detection:** Informational - check if present

```html
<!-- ✅ Good -->
<meta name="google-site-verification" content="verification_token">
```

**Error message:** `Consider Google Search Console verification`

**Tip:** `Add from Google Search Console`

**Severity:** info

---

### 97. `html-meta/facebook-domain-verification`

**What it catches:** Facebook domain verification

**Why:** Required for Facebook Business tools

**Detection:** Informational

```html
<!-- ✅ Good -->
<meta name="facebook-domain-verification" content="verification_token">
```

**Error message:** `Consider Facebook domain verification if using FB Business tools`

**Tip:** `Add from Facebook Business Manager`

**Severity:** info

---

### 98. `html-meta/bing-site-verification`

**What it catches:** Bing Webmaster verification

**Why:** Required for Bing Webmaster Tools

**Detection:** Informational

```html
<!-- ✅ Good -->
<meta name="msvalidate.01" content="verification_token">
```

**Error message:** `Consider Bing Webmaster verification`

**Tip:** `Add from Bing Webmaster Tools`

**Severity:** info

---

### 99. `html-meta/yandex-verification`

**What it catches:** Yandex Webmaster verification

**Why:** Required for Yandex Webmaster

**Detection:** Informational

```html
<!-- ✅ Good -->
<meta name="yandex-verification" content="verification_token">
```

**Error message:** `Consider Yandex verification if targeting Russian market`

**Tip:** `Add from Yandex Webmaster`

**Severity:** info

---

### 100. `html-meta/pinterest-verification`

**What it catches:** Pinterest domain verification

**Why:** Required for Pinterest Rich Pins

**Detection:** Informational

```html
<!-- ✅ Good -->
<meta name="p:domain_verify" content="verification_token">
```

**Error message:** `Consider Pinterest verification for Rich Pins`

**Tip:** `Add from Pinterest Business`

**Severity:** info

---

## Part 14: Performance Hints

### 101. `html-meta/preconnect-external`

**What it catches:** External origins without preconnect

**Why:** Preconnect speeds up external resource loading

**Detection:** External scripts/fonts without preconnect

```html
<!-- ❌ Bad - no preconnect -->
<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">

<!-- ✅ Good -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
```

**Error message:** `Consider preconnect to ${origin}`

**Tip:** `Add <link rel="preconnect" href="${origin}">`

**Severity:** info

---

### 102. `html-meta/dns-prefetch`

**What it catches:** External origins without dns-prefetch

**Why:** DNS lookup can be done early for better performance

**Detection:** External resources without dns-prefetch (fallback for older browsers)

```html
<!-- ✅ Good -->
<link rel="dns-prefetch" href="https://cdn.example.com">
<link rel="dns-prefetch" href="https://analytics.example.com">
```

**Error message:** `Consider dns-prefetch for ${origin}`

**Tip:** `Add <link rel="dns-prefetch" href="${origin}">`

**Severity:** info

---

### 103. `html-meta/preload-critical`

**What it catches:** Critical resources not preloaded

**Why:** Preload ensures critical resources load early

**Detection:** Large CSS/fonts in head without preload

```html
<!-- ✅ Good - preload critical resources -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/css/critical.css" as="style">
```

**Error message:** `Consider preloading critical resource ${resource}`

**Tip:** `Add <link rel="preload" href="..." as="...">`

**Severity:** info

---

### 104. `html-meta/preload-as-required`

**What it catches:** Preload without `as` attribute

**Why:** `as` is required for preload to work correctly

**Detection:** `<link rel="preload">` without `as`

```html
<!-- ❌ Bad - no 'as' -->
<link rel="preload" href="/font.woff2">

<!-- ✅ Good -->
<link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/style.css" as="style">
<link rel="preload" href="/script.js" as="script">
```

**Error message:** `Preload requires 'as' attribute`

**Tip:** `Add as="font|style|script|image|fetch"`

**Severity:** error

---

### 105. `html-meta/preload-crossorigin-font`

**What it catches:** Font preload without crossorigin

**Why:** Fonts require crossorigin even for same-origin

**Detection:** Font preload without crossorigin attribute

```html
<!-- ❌ Bad - font without crossorigin -->
<link rel="preload" href="/font.woff2" as="font">

<!-- ✅ Good -->
<link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin>
```

**Error message:** `Font preload requires crossorigin attribute`

**Tip:** `Add crossorigin to font preload`

**Severity:** error

---

### 106. `html-meta/modulepreload`

**What it catches:** ES modules without modulepreload

**Why:** modulepreload is more efficient for ES modules

**Detection:** ES module scripts that could benefit from modulepreload

```html
<!-- ✅ Good -->
<link rel="modulepreload" href="/app.js">
<script type="module" src="/app.js"></script>
```

**Error message:** `Consider modulepreload for ES modules`

**Tip:** `Add <link rel="modulepreload" href="/module.js">`

**Severity:** info

---

### 107. `html-meta/no-preload-unused`

**What it catches:** Preloaded resources not used

**Why:** Unused preloads waste bandwidth

**Detection:** Preload link where resource isn't used in page

```html
<!-- ❌ Bad - preload but never used -->
<link rel="preload" href="/unused.js" as="script">
<!-- Script never appears in page -->

<!-- ✅ Good - preload actually used -->
<link rel="preload" href="/app.js" as="script">
<script src="/app.js"></script>
```

**Error message:** `Preloaded resource '${url}' not used in page`

**Tip:** `Remove unused preload or add resource to page`

**Severity:** warning

---

## Part 15: Favicon & Icons

### 108. `html-meta/require-favicon`

**What it catches:** Missing favicon

**Why:** Favicon shown in browser tabs, bookmarks

**Detection:** No favicon link

```html
<!-- ❌ Bad - no favicon -->
<head>
  <title>Page</title>
</head>

<!-- ✅ Good -->
<link rel="icon" href="/favicon.ico">

<!-- ✅ Good - modern approach -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
```

**Error message:** `Missing favicon`

**Tip:** `Add <link rel="icon" href="/favicon.ico">`

**Severity:** warning

---

### 109. `html-meta/favicon-ico-fallback`

**What it catches:** No .ico fallback for older browsers

**Why:** Some browsers only support .ico format

**Detection:** Has SVG/PNG favicon but no .ico

```html
<!-- ⚠️ Warning - no .ico fallback -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml">

<!-- ✅ Good -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
```

**Error message:** `Consider .ico favicon fallback for older browsers`

**Tip:** `Add <link rel="icon" href="/favicon.ico" sizes="32x32">`

**Severity:** info

---

### 110. `html-meta/favicon-svg`

**What it catches:** No SVG favicon

**Why:** SVG scales perfectly and supports dark mode

**Detection:** Has only .ico/.png favicon, no SVG

```html
<!-- ⚠️ Info - consider SVG -->
<link rel="icon" href="/favicon.ico">

<!-- ✅ Good - SVG with dark mode support -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
```

**Error message:** `Consider SVG favicon for better scaling and dark mode support`

**Tip:** `Add <link rel="icon" href="/favicon.svg" type="image/svg+xml">`

**Severity:** info

---

### 111. `html-meta/favicon-sizes`

**What it catches:** Missing favicon size declarations

**Why:** Different contexts need different sizes

**Detection:** Favicon links without sizes attribute

```html
<!-- ✅ Good - multiple sizes -->
<link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png">
<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
```

**Error message:** `Consider providing multiple favicon sizes`

**Tip:** `Add 16x16 and 32x32 PNG favicons`

**Severity:** info

---

### 112. `html-meta/mask-icon`

**What it catches:** Missing Safari pinned tab icon

**Why:** Safari shows different icon for pinned tabs

**Detection:** No mask-icon for Safari

```html
<!-- ✅ Good -->
<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#4285f4">
```

**Error message:** `Consider mask-icon for Safari pinned tabs`

**Tip:** `Add <link rel="mask-icon" href="/icon.svg" color="#hex">`

**Severity:** info

---

## Part 16: Framework-Specific

### 113. `html-meta/svelte-head-placement`

**What it catches:** Incorrect `<svelte:head>` usage

**Why:** svelte:head must be at component top level

**Detection:** svelte:head inside conditional or loop

```svelte
<!-- ❌ Bad - inside conditional -->
{#if showMeta}
  <svelte:head>
    <title>Page</title>
  </svelte:head>
{/if}

<!-- ✅ Good - top level -->
<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

{#if showContent}
  <div>Content</div>
{/if}
```

**Error message:** `<svelte:head> should be at component top level`

**Tip:** `Move <svelte:head> outside conditionals/loops`

**Severity:** error

---

### 114. `html-meta/svelte-head-no-duplicate`

**What it catches:** Same meta defined in multiple Svelte components

**Why:** Nested svelte:head elements can create duplicates

**Detection:** Same meta name/property in layout and page

```svelte
<!-- ❌ Bad - layout defines description -->
<!-- +layout.svelte -->
<svelte:head>
  <meta name="description" content="Site description">
</svelte:head>

<!-- +page.svelte also defines description -->
<svelte:head>
  <meta name="description" content="Page description">  <!-- Duplicate! -->
</svelte:head>

<!-- ✅ Good - page overrides properly -->
<!-- Use SvelteKit's page data to pass to layout -->
```

**Error message:** `Duplicate meta '${name}' - may appear twice in output`

**Tip:** `Use page data to pass meta to layout, or only define in one place`

**Severity:** warning

---

### 115. `html-meta/sveltekit-app-html`

**What it catches:** Missing required elements in SvelteKit app.html

**Why:** app.html needs specific structure for SvelteKit

**Detection:** app.html without required placeholders

```html
<!-- ❌ Bad - missing placeholders -->
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <div id="app"></div>
</body>
</html>

<!-- ✅ Good - SvelteKit structure -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  %sveltekit.head%
</head>
<body data-sveltekit-preload-data="hover">
  <div style="display: contents">%sveltekit.body%</div>
</body>
</html>
```

**Error message:** `SvelteKit app.html missing ${placeholder}`

**Tip:** `Add %sveltekit.head% in <head> and %sveltekit.body% in <body>`

**Severity:** error

---

### 116. `html-meta/astro-head-in-layout`

**What it catches:** Head elements not in Astro layout

**Why:** Astro pages should use layouts for consistent head

**Detection:** Astro page with direct <head> instead of layout

```astro
<!-- ❌ Bad - head in page -->
---
// page.astro
---
<html>
<head>
  <title>Page</title>
</head>
<body>...</body>
</html>

<!-- ✅ Good - use layout -->
---
// page.astro
import Layout from '../layouts/Layout.astro';
---
<Layout title="Page">
  <main>...</main>
</Layout>
```

**Error message:** `Astro pages should use layouts for <head> content`

**Tip:** `Create a Layout component with head content`

**Severity:** warning

---

### 117. `html-meta/no-hardcoded-origin`

**What it catches:** Hardcoded origin in meta URLs

**Why:** Breaks across environments (dev, staging, prod)

**Detection:** og:url, canonical, etc. with hardcoded domain

```html
<!-- ❌ Bad - hardcoded -->
<meta property="og:url" content="https://mysite.com/page">
<link rel="canonical" href="https://mysite.com/page">
<meta property="og:image" content="https://mysite.com/image.jpg">

<!-- ✅ Good - use environment variable -->
<!-- In SvelteKit -->
<meta property="og:url" content="{$page.url.href}">

<!-- In Astro -->
<meta property="og:url" content={Astro.url.href}>
<link rel="canonical" href={new URL(Astro.url.pathname, Astro.site)}>
```

**Error message:** `Hardcoded origin '${origin}' - use environment variable`

**Tip:** `Use Astro.url, $page.url, or import.meta.env.SITE`

**Severity:** warning

---

## Part 17: Geo & Local SEO

### 118. `html-meta/geo-region`

**What it catches:** Local business without geo meta

**Why:** Helps with local search

**Detection:** Informational for local business sites

```html
<!-- ✅ Good - local business -->
<meta name="geo.region" content="US-CA">
<meta name="geo.placename" content="San Francisco">
<meta name="geo.position" content="37.7749;-122.4194">
<meta name="ICBM" content="37.7749, -122.4194">
```

**Error message:** `Consider geo meta tags for local business SEO`

**Tip:** `Add geo.region, geo.placename, geo.position for local search`

**Severity:** info

---

### 119. `html-meta/geo-position-format`

**What it catches:** Invalid geo.position format

**Why:** Must be "latitude;longitude" format

**Detection:** geo.position not matching format

```html
<!-- ❌ Bad -->
<meta name="geo.position" content="37.7749, -122.4194">  <!-- Comma wrong -->
<meta name="geo.position" content="San Francisco">

<!-- ✅ Good -->
<meta name="geo.position" content="37.7749;-122.4194">
```

**Error message:** `Invalid geo.position format`

**Tip:** `Use format: latitude;longitude (e.g., 37.7749;-122.4194)`

**Severity:** error

---

## Part 18: Deprecated & Obsolete

### 120. `html-meta/no-deprecated-meta`

**What it catches:** Deprecated or obsolete meta tags

**Why:** Waste of bytes, potentially confusing

**Detection:** Known deprecated meta tags

**Deprecated tags:**
- `<meta name="keywords">` - Ignored by all major search engines
- `<meta name="author">` - Not used for SEO
- `<meta name="generator">` - Unnecessary
- `<meta name="revisit-after">` - Never worked
- `<meta name="rating">` - Replaced by SafeSearch
- `<meta http-equiv="imagetoolbar">` - IE only, obsolete
- `<meta http-equiv="X-UA-Compatible">` - Only needed for IE

```html
<!-- ❌ Bad - deprecated -->
<meta name="keywords" content="seo, meta, tags">
<meta name="revisit-after" content="7 days">
<meta http-equiv="imagetoolbar" content="no">

<!-- ✅ Good - remove deprecated tags -->
```

**Error message:** `Deprecated meta tag '${name}' - ${reason}`

**Tip:** `Remove deprecated meta tag`

**Severity:** warning

---

## Detection Helpers

For HTML Meta rules, the linter needs:

1. **HTML Parser** - Parse full HTML document structure
2. **Svelte Compiler** - Extract `<svelte:head>` contents
3. **Astro Compiler** - Parse Astro layouts and frontmatter
4. **Cross-file analysis** - Detect duplicates across layouts/pages
5. **URL validation** - Validate URLs are absolute/valid
6. **Color validation** - Validate CSS color values

### Meta Tag Patterns

```typescript
// Required meta tags
const REQUIRED_META = ['charset', 'viewport', 'description'];

// OG required tags
const OG_REQUIRED = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];

// Twitter required
const TWITTER_REQUIRED = ['twitter:card'];

// Valid robots directives
const ROBOTS_DIRECTIVES = [
  'index', 'noindex', 'follow', 'nofollow', 'none', 'noarchive',
  'nosnippet', 'noimageindex', 'nocache', 'notranslate',
  'max-snippet', 'max-image-preview', 'max-video-preview', 'unavailable_after'
];

// Valid twitter:card types
const TWITTER_CARD_TYPES = ['summary', 'summary_large_image', 'app', 'player'];

// Valid referrer policies
const REFERRER_POLICIES = [
  'no-referrer', 'no-referrer-when-downgrade', 'origin',
  'origin-when-cross-origin', 'same-origin', 'strict-origin',
  'strict-origin-when-cross-origin', 'unsafe-url'
];
```

---

## Summary

| Category | Rule Count | Severity Mix |
|----------|------------|--------------|
| Core Document | 14 | 8 error, 4 warning, 2 info |
| Title & Description | 6 | 6 warning |
| Open Graph | 13 | 3 error, 6 warning, 4 info |
| Twitter Cards | 8 | 2 error, 4 warning, 2 info |
| Canonical & URLs | 6 | 3 error, 2 warning, 1 info |
| Robots & Crawling | 7 | 4 error, 2 warning, 1 info |
| Internationalization | 5 | 2 error, 2 warning, 1 info |
| Article Metadata | 6 | 1 error, 1 warning, 4 info |
| Security | 8 | 2 error, 3 warning, 3 info |
| iOS/Safari | 11 | 2 error, 2 warning, 7 info |
| Android/Chrome | 6 | 1 error, 2 warning, 3 info |
| Windows/Microsoft | 5 | 5 info |
| Verification | 5 | 5 info |
| Performance | 7 | 2 error, 1 warning, 4 info |
| Favicon & Icons | 5 | 1 warning, 4 info |
| Framework-Specific | 5 | 2 error, 3 warning |
| Geo & Local | 2 | 1 error, 1 info |
| Deprecated | 1 | 1 warning |

**Total: 120 rules**

- **Errors:** 33 (must fix)
- **Warnings:** 39 (should fix)
- **Info:** 48 (consider/optional)
