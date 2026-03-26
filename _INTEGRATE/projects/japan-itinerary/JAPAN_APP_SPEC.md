# Japan Trip App — Claude Code Build Spec

## What to Build

A Capacitor + Framework7 iOS web app for a 15-day Japan trip (April 8–22, 2026). This is a personal travel companion app — offline-first, beautiful, and functional. It replaces a 20-page PDF itinerary.

## Tech Stack

- **Framework7** (latest) — iOS-native feel, built-in tab bar, cards, timelines, lists
- **Capacitor** (latest) — iOS native wrapper, offline storage
- **Vanilla JS or Framework7's built-in reactive** — keep it simple, no React/Vue needed
- **Capacitor Preferences API** — persist checklist state, cost tracking
- **CSS custom properties** — theming (light/dark mode)

## Design System

### Color Palette (Japanese-inspired, extracted from the PDF)
```css
:root {
  /* Light mode */
  --color-navy: #1d3a5e;        /* Headers, primary actions */
  --color-charcoal: #3d4852;    /* Body text */
  --color-slate: #6b7b8c;       /* Secondary text, timestamps */
  --color-cream: #f4f0e8;       /* Card backgrounds, subtle fills */
  --color-warm-white: #faf8f5;  /* Page background */
  --color-vermillion: #c63d3a;  /* Warnings, important badges */
  --color-gold: #b8860b;        /* Accent, highlights */
  --color-info-bg: #eff6ff;     /* Info cards */
  --color-divider: #d4cfc3;     /* Borders, separators */
  
  /* Semantic */
  --color-free: #16a34a;        /* Free admission badge */
  --color-booked: #2563eb;      /* Booked/confirmed state */
  --color-pending: #d97706;     /* Needs booking */
  --color-checked: #16a34a;     /* Checklist completed */
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-navy: #93b4d4;
    --color-charcoal: #d4d4d8;
    --color-slate: #a1a1aa;
    --color-cream: #1c1c1e;
    --color-warm-white: #000000;
    --color-vermillion: #ef6961;
    --color-gold: #d4a017;
    --color-info-bg: #1a2332;
    --color-divider: #2c2c2e;
  }
}
```

### Typography
- Use system `-apple-system, SF Pro` for iOS native feel (don't bundle Poppins — too heavy for an app)
- Headers: 600 weight (semibold)
- Body: 400 weight (regular)
- Small labels/timestamps: 300 weight (light), smaller size

### Design Principles
- **Apple Maps / Apple Notes** feel — generous whitespace, subtle cards, clean lines
- **Japanese aesthetic** — restrained, elegant, occasional vermillion accents
- No heavy decoration. Let content breathe.
- Swipe gestures where natural (timeline cards expand, checklist items swipe to complete)
- Subtle haptic feedback on interactions (Capacitor Haptics)

---

## App Structure — 4 Tabs

### Tab 1: Timeline (Home) — `timeline.html`
The main view. A scrollable day-by-day timeline.

**Layout:**
- Top: Trip header card (compact)
  - "Japan 2026" title
  - "April 8–22 · 15 days" subtitle
  - Countdown badge: "X days to go" (or "Day X of 15" during trip)
  - Flight info: ZG021 out / ZG022 return (small text)
- Below: Day cards in a vertical timeline

**Each Day Card:**
- Header: Day number, date, weekday, theme (e.g. "Day 9 · Thu Apr 16 · Kyoto: Eastern Temples")
- City badge: color-coded by city (Tokyo=blue, Kyoto=green, Osaka=orange, Nara=purple, Travel=gray)
- Collapsed: Shows 2–3 key highlights + stop count
- Expanded (tap to expand): Full timeline of stops:
  - Each stop: time, location name (bold), getting-there directions, tips
  - Cost badge if paid admission (¥500, FREE, etc.)
  - Mini-map link (tap location → opens Apple Maps or Google Maps)
- Meal slots: Green-highlighted dinner/lunch placeholders with suggestions
- "Also Consider" items in a subtle collapsible section

**Interaction:**
- Tap day card → expand/collapse
- During the trip: current day auto-expanded, past days dimmed
- Long-press a stop → options: "Open in Maps", "Copy address", "Mark visited"

### Tab 2: Bookings & Tickets — `bookings.html`
Everything that needs to be booked or purchased, with status tracking.

**Sections:**

**1. Pre-Trip Bookings (action required)**
Cards for each booking with:
- Item name + icon
- Status badge: ✅ Booked / ⏳ Need to Book / 🔴 Urgent
- When to book (deadline)
- Estimated cost
- Booking platform + direct link (Klook, official site, etc.)
- Tap status to cycle: Need to Book → Booked → N/A
- Notes field

Items:
| Item | When | Cost | Platform |
|------|------|------|----------|
| teamLab Borderless | 12 wks ahead (Jan 2026) | ¥3,800–4,800 | Klook (exclusive). Date + 30-min slot. |
| Tokyo Disney | ASAP (sells out) | ¥7,900–10,900 | Klook or tokyodisneyresort.jp |
| USJ Studio Pass | ASAP | ~¥8,600+ | Klook or usj.co.jp |
| USJ Express Pass 7 | ASAP (sells out fast) | ¥10,000–20,000+ | Klook. ESSENTIAL for Nintendo World. |
| Shibuya Sky | 1–2 wks ahead | ¥3,000–3,700 | Klook |
| Tokyo Skytree | 1–2 wks ahead | ¥2,100–3,400 | Klook |
| Zipair flights (ZG021/ZG022) | Done? | ~CAD $600–900 RT | zipair.net |
| eSIM (14-day) | Before departure | ~¥2,000–4,000 | Klook. DOCOMO or SoftBank. |
| Visit Japan Web | 48+ hrs before flight | FREE | vjw.digital.go.jp |
| Mt. Fuji highway bus | 2–4 wks ahead | ~¥4,400 RT | highway-buses.jp or Klook |
| SmartEX registration | Before departure | FREE | smartex.jp — for Shinkansen bookings |
| Tokyo hotel (6 nights) | ASAP | ¥8,000–15,000/night | Booking.com / Agoda |
| Kyoto hotel (3 nights) | ASAP | ¥8,000–15,000/night | Booking.com / Agoda |
| Osaka hotel (3 nights) | ASAP | ¥8,000–15,000/night | Booking.com / Agoda |

**2. Paid Entry (No Advance Booking — Pay at Door)**
Simple reference list grouped by city:

Tokyo area:
- Art Aquarium Ginza: ¥2,500
- Shibuya Sky: ¥3,000–3,700 (if not pre-booked)
- teamLab Borderless: ¥3,800–4,800 (must pre-book)
- Tokyo Disney: ¥7,900–10,900 (must pre-book)

Kamakura:
- Great Buddha: ¥300
- Hase-dera: ¥400

Kyoto:
- Kiyomizu-dera: ¥500
- Kinkaku-ji: ¥500
- Ryoan-ji: ¥500
- Ninna-ji: ¥500
- Kodai-ji: ¥600
- Sanjusangen-do: ¥600
- Nijo Castle: ¥1,300
- Byodo-in (Uji): ¥700

Nara:
- Todai-ji: ¥600

Osaka:
- Osaka Castle: ¥1,200
- Tsutenkaku Tower: ¥1,200
- Umeda Sky Building: ¥1,500
- Shitenno-ji: ¥300
- Katsuo-ji: ¥400
- USJ Studio Pass: ~¥8,600+ (must pre-book)
- USJ Express Pass: ¥10,000–20,000+ (must pre-book)

**3. Transit Passes**
- JR Pass (14-day): ¥80,000 — ⚠️ NOT RECOMMENDED (individual tickets save ¥33,000)
- Suica/Pasmo IC Card: Load ¥5,000–10,000
- Kyoto Bus Day Pass: ¥700/day × 3 days
- SmartEX: Individual Shinkansen tickets (~¥47,000 total)

### Tab 3: Budget — `budget.html`
Cost tracking and summary.

**Top summary card:**
- Estimated total: CAD $2,950–5,250 per person
- Pie/donut chart: Transit / Tickets / Hotels / Food / Misc breakdown

**JR Pass Warning Banner:**
Red card: "JR Pass ¥80,000 is NOT worth it. Individual tickets = ~¥47,000. Save ¥33,000 with SmartEX."

**Expense Categories (expandable):**

1. **Transit (~¥60,000–65,000)**
   - N'EX round trip: ¥6,500
   - Tokyo→Kyoto Shinkansen: ¥13,320
   - Osaka→Tokyo Shinkansen: ¥13,870
   - Kamakura RT: ¥1,840
   - Nara RT: ¥1,420
   - Nara→Osaka: ¥810
   - Tokyo local JR (6 days): ~¥3,000
   - Suica/metro: ¥5,000–10,000
   - Kyoto bus pass (3 days): ¥2,100
   - Mt. Fuji bus RT: ¥4,400
   - Takkyubin × 2: ¥4,000

2. **Tickets & Admissions (~¥37,000–48,000)**
   Full day-by-day list (same as Tab 2 paid entry, but with totals)

3. **Accommodation (~¥96,000–200,000)**
   - Tokyo: 6 nights × ¥8,000–17,000
   - Kyoto: 3 nights × ¥8,000–17,000
   - Osaka: 3 nights × ¥8,000–17,000

4. **Meals (~¥48,000–130,000)**
   - Budget: ~¥3,500/day (konbini, ramen, street food)
   - Mid-range: ~¥10,000/day (sit-down restaurants)

5. **Misc (~¥15,000–30,000)**
   - eSIM: ~¥3,000
   - Souvenirs, drinks, snacks

**Grand Total Table:**
| | Budget | Mid-Range |
|---|--------|-----------|
| Japan expenses | ~¥256,000 | ~¥473,000 |
| Flights | ~CAD $600–900 | ~CAD $600–900 |
| **GRAND TOTAL** | **~CAD $2,950–3,250** | **~CAD $4,950–5,250** |

**Interactive feature:** Each line item has a toggle for "Paid" with optional actual amount input. Running total updates live.

### Tab 4: Checklist — `checklist.html`
Interactive checklist with persistent state (Capacitor Preferences).

**Sections with checkable items:**

**Before Departure — Digital Setup**
- [ ] Register on Visit Japan Web (vjw.digital.go.jp) — Complete 48+ hrs before flight
- [ ] Buy eSIM on Klook (14-day DOCOMO/SoftBank unlimited data)
- [ ] Download apps: Klook, TDR, USJ, SmartEX, Tabelog, Google Maps (offline), Google Translate (offline Japanese)

**Flights & Transit**
- [ ] Confirm ZG021/ZG022 Zipair flights + seat selection
- [ ] Pre-order Zipair meals or plan to bring food from YVR
- [ ] Research JR Pass vs individual tickets (SmartEX app) — Individual recommended, saves ¥33K
- [ ] Book Mt. Fuji highway bus (Shinjuku↔Kawaguchiko)
- [ ] Check Mt. Fuji 5th Station road status (late March 2026)
- [ ] Register on SmartEX for Shinkansen bookings

**Accommodations**
- [ ] Book Tokyo hotel — 6 nights: Apr 9–15 (Shinjuku area recommended)
- [ ] Book Kyoto hotel — 3 nights: Apr 15–18 (near Kyoto Station)
- [ ] Book Osaka hotel — 3 nights: Apr 18–21 (Namba/Dotonbori)
- [ ] Confirm all hotels allow early luggage drop + late check-in
- [ ] Look for hotels with coin laundry

**Tickets & Reservations (Time-Sensitive!)**
- [ ] teamLab Borderless — Book on Klook 12 wks ahead
- [ ] Tokyo Disney — Book on Klook ASAP
- [ ] USJ tickets + Express Pass — Book on Klook ASAP
- [ ] Shibuya Sky — Book on Klook 1–2 wks ahead
- [ ] Tokyo Skytree — Book on Klook 1–2 wks ahead

**Meal Planning**
- [ ] Research + bookmark restaurants (use Tabelog)
- [ ] Fill in meal placeholder blanks in itinerary
- [ ] Pre-order Zipair meals or bring food from YVR

**Packing Essentials**
- [ ] Passport + 2 photocopies
- [ ] Travel insurance documentation
- [ ] Comfortable walking shoes (15,000–25,000 steps/day!)
- [ ] Light rain jacket / compact umbrella
- [ ] Small daypack
- [ ] Portable battery charger (20,000mAh)
- [ ] Pants/shorts covering knees for teamLab (mirrored floors)

**Luggage Logistics**
- [ ] Day 8: Arrange Takkyubin Tokyo→Kyoto (~¥2,000) night before
- [ ] Day 11: Arrange Takkyubin Kyoto→Osaka or use coin lockers
- [ ] Day 15: Carry all luggage on Shinkansen

**Still Deciding**
- [ ] DisneySea vs Disneyland (DisneySea recommended for adults)
- [ ] Verify TeamLab Botanical Garden Osaka still open Apr 2026
- [ ] Check cherry blossom forecast (sakura.weathermap.jp, late March)

**Interaction:**
- Tap to check/uncheck (persists via Capacitor Preferences)
- Progress bar at top showing % complete
- Section headers show X/Y completed
- Swipe item right to mark done (with haptic)

---

## Complete Day-by-Day Itinerary Data

This is the full content for the Timeline tab. Structure each day as a JSON-like data object.

### Day 1 — Wed, April 8 — Travel Day
```
city: "Travel"
theme: "In the Air"
stops: [
  { time: "10:30", location: "Depart YVR", directions: "ZG021 Zipair, Terminal M, Boeing 787-8", tips: "Budget carrier: meals, blankets, bags extra. Pre-order on zipair.net. Charge devices (USB at seat, no outlet). Checked bag must be pre-purchased." },
]
notes: "Cross the International Date Line. Lose 1 calendar day. Arrive Apr 9."
```

### Day 2 — Thu, April 9 — Arrive Tokyo: Asakusa & East Side
```
city: "Tokyo"
theme: "Arrive Tokyo: Asakusa & East Side"
stops: [
  { time: "12:40", location: "Arrive Narita T1", directions: "—", tips: "Immigration (show Visit Japan Web QR) + customs (show 2nd QR). 20–40 min. Activate JR Pass at JR East counter. Get Suica card.", cost: null },
  { time: "14:00", location: "Narita Express → Tokyo", directions: "Walk to B1 JR platform in Narita T1. N'EX to Tokyo Station. ~53 min.", tips: "¥3,250 each way. Consider Takkyubin luggage forwarding (~¥2,000).", cost: 3250 },
  { time: "15:15", location: "Arrive Tokyo Station", directions: "Exit through Marunouchi Central exit.", tips: "Navigate to hotel. Drop bags or use coin lockers." },
  { time: "16:30", location: "Senso-ji Temple", directions: "Metro to Asakusa station. Walk 5 min.", tips: "Tokyo's oldest temple (645 AD). Kaminarimon gate. Free. Open 24h but shops close ~5pm.", cost: 0 },
  { time: "16:45", location: "Nakamise-dori", directions: "Through the gate, straight ahead.", tips: "200m shopping street. Snacks: melon pan, ningyo-yaki, kibidango." },
  { time: "17:30", location: "Sumida River Walk", directions: "Walk east toward Skytree.", tips: "Views of Skytree + Asahi Beer Hall (golden flame building)." },
  { time: "18:30", location: "Tokyo Skytree area", directions: "Cross river, 10 min walk.", tips: "Tokyo Solamachi mall at base. Observation deck ¥2,100–3,400 (optional).", cost: 2100 },
]
dinner: "Asakusa area. Try: Monjayaki or tempura."
```

### Day 3 — Fri, April 10 — Ueno, Yanaka, Akihabara & West
```
city: "Tokyo"
theme: "Ueno, Yanaka, Akihabara & West"
stops: [
  { time: "8:00", location: "Ueno Park", directions: "JR Yamanote to Ueno. Park entrance right outside.", tips: "Cherry blossom epicenter in April. Shinobazu Pond. Free." },
  { time: "9:30", location: "Ameyoko Market", directions: "South side of Ueno Station, under the tracks.", tips: "Bustling market street. Street food, dried goods, bargain clothes." },
  { time: "10:30", location: "Yanaka Ginza", directions: "Walk north ~15 min through Ueno Park, or JR to Nippori.", tips: "Old-Tokyo shotengai. Cats everywhere. Great snacks. Yanaka Cemetery if cherry blossom season." },
  { time: "13:00", location: "Akihabara", directions: "JR Yamanote from Ueno (2 stops).", tips: "Electronics, anime, manga, arcades. Don Quijote for tax-free souvenirs (bring passport)." },
  { time: "14:00", location: "Akihabara exploration", directions: "Walk the main strip + side streets.", tips: "Retro game shops, maid cafes, capsule toy machines (gachapon)." },
  { time: "15:00", location: "Gotokuji Temple", directions: "Setagaya line from Sangenjaya or Odakyu to Gotokuji Stn (~30 min).", tips: "Maneki-neko (beckoning cat) temple. Hundreds of cat statues. Free. Buy a cat for ¥300–5,000." },
  { time: "17:00", location: "Koenji", directions: "JR Chuo line from Shinjuku (~10 min).", tips: "Vintage shopping, retro toys, similar to Akihabara but less touristy." },
]
dinner: "Ueno or Koenji area."
```

### Day 4 — Sat, April 11 — Harajuku, Shibuya & Shinjuku
```
city: "Tokyo"
theme: "Harajuku, Shibuya & Shinjuku"
stops: [
  { time: "8:00", location: "Meiji Shrine", directions: "JR Yamanote to Harajuku. Enter through the torii on the south side.", tips: "Shinto shrine in forest. Free. Weekend: may see wedding processions. ¥500 entry to inner garden." },
  { time: "9:15", location: "Takeshita Street", directions: "Exit shrine south, cross bridge to Takeshita.", tips: "Teen fashion, crepes, quirky shops. Overwhelming but fun." },
  { time: "9:45", location: "Cat Street", directions: "Turn right from bottom of Takeshita.", tips: "Quieter, more upscale boutiques." },
  { time: "10:30", location: "Omotesando", directions: "Walk south from Cat Street.", tips: "Tokyo's Champs-Élysées. Flagship stores. Architecture tour." },
  { time: "11:15", location: "Shibuya Crossing", directions: "Walk south or JR to Shibuya.", tips: "World's busiest crossing. Best photo: Shibuya Sky or Starbucks 2F." },
  { time: "12:00", location: "Hachiko Statue", directions: "Shibuya Station exit.", tips: "Famous loyal dog statue. Quick photo." },
  { time: "12:30", location: "Shibuya lunch", directions: "—", tips: "Try: Genki Sushi (conveyor belt), Afuri Ramen (yuzu), or explore depachika (basement food halls)." },
  { time: "14:00", location: "Shibuya Sky", directions: "Shibuya Scramble Square 14F–46F.", tips: "¥3,000+. Book on Klook. 360° views including Mt. Fuji on clear days.", cost: 3000 },
  { time: "15:30", location: "Shimokitazawa", directions: "Keio Inokashira line from Shibuya (~3 min).", tips: "Bohemian village. Vintage shops, indie cafes, live music. Tokyo's Brooklyn." },
  { time: "17:30", location: "Shinjuku Gyoen", directions: "Walk or metro to Shinjuku-gyoenmae (~20 min).", tips: "¥500 entry. Closes 6pm. Gorgeous cherry blossoms. No alcohol." },
  { time: "19:00", location: "Kabukicho / Golden Gai", directions: "Walk north from Shinjuku Station east exit.", tips: "Kabukicho: neon nightlife district. Golden Gai: 200+ tiny bars in 6 narrow alleys. ¥500–1,000 cover." },
]
dinner: "Golden Gai or Omoide Yokocho. Yakitori + highball."
```

### Day 5 — Sun, April 12 — Ginza, Imperial Palace & Waterfront
```
city: "Tokyo"
theme: "Ginza, Imperial Palace & Waterfront"
stops: [
  { time: "7:30", location: "Tsukiji Outer Market", directions: "Metro to Tsukiji. Walk 3 min.", tips: "Inner market moved to Toyosu but outer market thrives. Breakfast: tamagoyaki, fresh sashimi, oysters." },
  { time: "9:00", location: "Hama-rikyu Gardens", directions: "Walk south from Tsukiji (~10 min).", tips: "Edo-era garden on Tokyo Bay. Matcha tea house on the pond." },
  { time: "9:30", location: "Art Aquarium Ginza", directions: "Within Ginza area.", tips: "Goldfish art museum. ~¥2,500. Beautiful photo-ops.", cost: 2500 },
  { time: "10:30", location: "Ginza shopping", directions: "Walk the main Chuo-dori.", tips: "Flagship stores, Uniqlo 12-floor, Itoya stationery." },
  { time: "11:00", location: "Kabuki-za Theatre", directions: "Ginza 4-chome crossing.", tips: "Even without seeing a show, admire the architecture." },
  { time: "12:30", location: "Imperial Palace East Gardens", directions: "Metro to Otemachi. Walk to Ote-mon gate.", tips: "Free. Beautiful grounds. Closed Mon/Fri. Foundation stones of old Edo Castle keep." },
  { time: "14:00", location: "teamLab Borderless", directions: "Azabudai Hills. Metro to Kamiyacho or Roppongi 1-chome.", tips: "¥3,800–4,800. Book on Klook months ahead. 2+ hours. Wear dark clothes + pants (mirrored floors).", cost: 3800 },
  { time: "17:00", location: "Odaiba", directions: "Yurikamome line from Shimbashi.", tips: "Rainbow Bridge views. Replica Statue of Liberty. DiverCity (Gundam statue). Sunset views." },
]
dinner: "Odaiba or back in Ginza."
```

### Day 6 — Mon, April 13 — Tokyo Disney (Full Day)
```
city: "Tokyo"
theme: "Tokyo Disney (Full Day)"
stops: [
  { time: "7:30", location: "Travel to Maihama", directions: "JR Keiyo/Musashino line to Maihama Station.", tips: "DisneySea entrance right at station. Disneyland needs monorail 1 stop." },
  { time: "8:00", location: "Tokyo Disney", directions: "At Maihama Station.", tips: "BOOK ON KLOOK ASAP. ¥7,900–10,900. April = peak. Download TDR app. Budget ¥10,000–15,000 total.", cost: 10000 },
  { time: "21:00", location: "Return to hotel", directions: "JR back to Tokyo area.", tips: "Parks close 9–10pm. Consider staying for fireworks." },
]
notes: "DisneySea recommended for adults. Use DPA (¥2,000/ride) for popular attractions."
```

### Day 7 — Tue, April 14 — Kamakura Day Trip + Tokyo Catch-Up
```
city: "Tokyo"
theme: "Kamakura Day Trip + Tokyo Catch-Up"
stops: [
  { time: "8:00", location: "Train to Kamakura", directions: "JR Yokosuka line from Tokyo Station (~1 hr). ¥950 one-way.", tips: "Sit right side for ocean views after Ofuna." },
  { time: "9:15", location: "Tsurugaoka Hachimangu", directions: "Walk 10 min straight from Kamakura Stn up Wakamiya-oji.", tips: "Kamakura's most important shrine. Free. Impressive approach through 3 torii gates." },
  { time: "10:15", location: "Great Buddha (Kotoku-in)", directions: "Enoden line to Hase Stn (~5 min) or walk 25 min.", tips: "13m bronze Buddha (1252 AD). ¥300. Go inside for ¥50.", cost: 300 },
  { time: "11:00", location: "Hase-dera Temple", directions: "Walk 5 min from Great Buddha.", tips: "Beautiful hilltop temple. Ocean views. Jizo statues. ¥400.", cost: 400 },
  { time: "12:00", location: "Komachi-dori lunch", directions: "Enoden back to Kamakura Stn. Shopping street right outside.", tips: "Try shirasu-don (raw whitebait). Kamakura's signature dish." },
  { time: "14:00", location: "Return to Tokyo", directions: "JR Yokosuka line back (~1 hr).", tips: "" },
  { time: "15:30", location: "Kiyosumi Gardens", directions: "Metro to Kiyosumi-shirakawa.", tips: "Beautiful Edo-era stroll garden. ¥150. Blue Bottle Coffee HQ nearby." },
  { time: "17:00", location: "Nakameguro", directions: "Metro Hibiya line to Naka-Meguro (~20 min).", tips: "Cherry blossom famous (Meguro River). Trendy cafes, boutiques. Onibus Coffee, Starbucks Reserve." },
]
dinner: "Nakameguro area."
```

### Day 8 — Wed, April 15 — Mt. Fuji → Shinkansen to Kyoto
```
city: "Travel"
theme: "Mt. Fuji → Shinkansen to Kyoto"
stops: [
  { time: "7:00", location: "Check out + Takkyubin", directions: "Hotel front desk.", tips: "Send main luggage to Kyoto hotel via Takkyubin (~¥2,000). Take daypack only.", cost: 2000 },
  { time: "9:00", location: "Highway bus to Kawaguchiko", directions: "Busta Shinjuku (4F). Bus ~2 hrs.", tips: "Book ahead on highway-buses.jp or Klook. ~¥2,200 one-way.", cost: 4400 },
  { time: "11:00", location: "Mt. Fuji area", directions: "Kawaguchiko area.", tips: "Chureito Pagoda (iconic photo spot, 400 steps). Oishi Park. Kawaguchiko Music Forest." },
  { time: "14:00", location: "Bus back to Shinjuku", directions: "Return bus ~2 hrs.", tips: "" },
  { time: "16:30", location: "Shinkansen to Kyoto", directions: "Tokyo Station → Kyoto Station. Hikari ~2hr15. Book via SmartEX.", tips: "~¥13,320. Mt. Fuji views: sit right side (Row E). Buy ekiben at Tokyo Station Gransta.", cost: 13320 },
  { time: "18:45", location: "Arrive Kyoto", directions: "Kyoto Station. Hotel shuttle or bus/taxi.", tips: "Pick up Kyoto Bus Day Pass at station info desk. Collect Takkyubin luggage at hotel." },
]
dinner: "Ekiben on Shinkansen or Kyoto upon arrival."
```

### Day 9 — Thu, April 16 — Kyoto: Eastern Temples & Gion
```
city: "Kyoto"
theme: "Eastern Temples & Gion"
stops: [
  { time: "7:00", location: "Kiyomizu-dera", directions: "Bus #206 from Kyoto Stn to Kiyomizu-michi (~15 min). Walk 10 min uphill.", tips: "¥500. Packed by 9am. Famous wooden stage (13m). Cherry blossom views.", cost: 500 },
  { time: "8:30", location: "Sannenzaka / Ninenzaka", directions: "Walk downhill from Kiyomizu-dera.", tips: "Atmospheric stone-paved lanes. Traditional shops. Free." },
  { time: "9:00", location: "Yasaka Pagoda", directions: "Continue downhill.", tips: "5-story pagoda. Iconic Kyoto photo. Free (exterior only)." },
  { time: "9:30", location: "Kodai-ji", directions: "5 min walk.", tips: "Zen temple, gardens. ¥600. Night illuminations in spring.", cost: 600 },
  { time: "9:45", location: "Maruyama Park", directions: "Adjacent.", tips: "Famous weeping cherry tree. Peak in early April. Free." },
  { time: "10:30", location: "Philosopher's Path", directions: "Bus or walk north (~20 min).", tips: "2km canal-side path. Cherry blossom lined. Free. Cat-friendly." },
  { time: "12:30", location: "Gion district", directions: "Bus #100 south or walk.", tips: "Geisha district. Hanamikoji-dori for photos. Don't block or touch geiko/maiko." },
  { time: "14:30", location: "Yasaka Shrine", directions: "West end of Maruyama Park.", tips: "Shinto shrine. Free. Connected to Maruyama Park. Cherry blossoms." },
  { time: "15:30", location: "Kennin-ji Temple", directions: "Walk south from Yasaka Shrine (~5 min).", tips: "Oldest Zen temple in Kyoto. Twin Dragons ceiling painting. Free grounds." },
  { time: "17:00", location: "Sanjusangen-do", directions: "Bus south (~10 min).", tips: "1,001 golden Kannon statues in 120m hall. ¥600. No photos inside.", cost: 600 },
]
dinner: "Gion or Pontocho area. Try yudofu (simmered tofu)."
```

### Day 10 — Fri, April 17 — Kyoto: Northern Temples
```
city: "Kyoto"
theme: "Northern Temples"
stops: [
  { time: "8:00", location: "Kinkaku-ji (Golden Pavilion)", directions: "Bus #205 from Kyoto Stn (~30 min).", tips: "¥500. Gold-leaf pavilion reflected in mirror pond. Arrives 8:30am ideal.", cost: 500 },
  { time: "9:15", location: "Ryoan-ji", directions: "Walk west ~15 min or bus #59.", tips: "Famous rock garden (15 stones, never all visible from one point). ¥500.", cost: 500 },
  { time: "10:15", location: "Ninna-ji", directions: "Walk south ~10 min.", tips: "UNESCO site. Late-blooming cherry trees (Omuro zakura). ¥500.", cost: 500 },
  { time: "11:15", location: "Daitoku-ji", directions: "Bus east to Daitoku-ji-mae.", tips: "Vast Zen complex. Sub-temples: Zuiho-in (¥400), Koto-in (¥400)." },
  { time: "13:00", location: "Nijo Castle", directions: "Bus #12 south or subway to Nijo-jo mae.", tips: "¥1,300. Nightingale floors (squeak when walked on). Ninomaru Palace.", cost: 1300 },
  { time: "15:30", location: "Nishiki Market", directions: "Walk or bus to Shijo area. Nishiki runs E–W between Shijo-dori.", tips: "'Kyoto's Kitchen.' 400m covered market. Try: yuba, pickles, dango, matcha treats." },
  { time: "17:00", location: "Pontocho Alley", directions: "Walk east from Nishiki to Kamo River.", tips: "Narrow dining alley along Kamo River. Many restaurants with riverside seating (summer only)." },
]
dinner: "Pontocho or Nishiki area. Consider kaiseki splurge (¥10,000–20,000)."
```

### Day 11 — Sat, April 18 — Arashiyama, Fushimi Inari & Uji
```
city: "Kyoto"
theme: "Arashiyama, Fushimi Inari & Uji"
stops: [
  { time: "6:30", location: "Travel to Arashiyama", directions: "JR Sagano line from Kyoto Stn to Saga-Arashiyama (~15 min).", tips: "GO EARLY. Bamboo Grove packed by 9am." },
  { time: "7:00", location: "Arashiyama Bamboo Grove", directions: "Walk north from station (~10 min).", tips: "Iconic bamboo forest. Free. Best photos at 7am before crowds." },
  { time: "8:00", location: "Tenryu-ji Temple", directions: "Adjacent to Bamboo Grove.", tips: "UNESCO site. Beautiful garden. ¥500.", cost: 500 },
  { time: "8:45", location: "Togetsukyo Bridge", directions: "Walk south to river.", tips: "Iconic bridge with mountain backdrop. Free. Great photo spot." },
  { time: "9:15", location: "Iwatayama Monkey Park", directions: "South side of bridge, hike up ~20 min.", tips: "¥550. Wild monkeys with Kyoto city views. Feed them from inside enclosure.", cost: 550 },
  { time: "10:30", location: "Travel to Fushimi Inari", directions: "JR to Inari Stn (~20 min).", tips: "" },
  { time: "11:00", location: "Fushimi Inari Taisha", directions: "Right outside Inari Station.", tips: "10,000 vermillion torii gates. FREE. Full hike ~2-3 hrs. Go at least to Yotsutsuji intersection (~45 min) for views." },
  { time: "13:30", location: "Travel to Uji", directions: "JR Nara line from Inari to Uji (~20 min).", tips: "Famous for matcha tea." },
  { time: "14:00", location: "Byodo-in", directions: "Walk from Uji Stn (~10 min).", tips: "¥700. Phoenix Hall (on ¥10 coin). Beautiful gardens.", cost: 700 },
  { time: "15:30", location: "Uji matcha street", directions: "Along Byodo-in Omotesando.", tips: "Matcha everything: parfaits, soft serve, soba. Nakamura Tokichi is legendary." },
  { time: "17:00", location: "Travel to Osaka", directions: "JR to Osaka Station or Keihan to Yodoyabashi.", tips: "Check into Osaka hotel. ~1 hr transit." },
]
dinner: "Osaka: Dotonbori for first Osaka meal. Takoyaki + okonomiyaki."
```

### Day 12 — Sun, April 19 — Nara (AM) → Osaka (PM)
```
city: "Nara/Osaka"
theme: "Nara (AM) → Osaka (PM)"
stops: [
  { time: "7:30", location: "Train to Nara", directions: "JR or Kintetsu from Osaka (~45 min). Kintetsu is closer to deer park.", tips: "" },
  { time: "8:30", location: "Nara Park & Deer", directions: "Walk from either station.", tips: "1,000+ free-roaming deer. Buy shika senbei (deer crackers) ¥200. They bow for food!" },
  { time: "9:45", location: "Todai-ji", directions: "Walk through park north.", tips: "World's largest wooden building. ¥600. Great Buddha inside. Squeeze through nostril pillar.", cost: 600 },
  { time: "10:30", location: "Kasuga Taisha", directions: "Walk east through park (~15 min).", tips: "3,000 stone/bronze lanterns. February and August: all lit. Free grounds." },
  { time: "12:30", location: "Return to Osaka", directions: "JR or Kintetsu to Osaka (~45 min).", tips: "Lunch: kakinoha sushi in Nara before leaving." },
  { time: "13:30", location: "Osaka Castle", directions: "JR Osaka Loop to Osakajokoen Stn.", tips: "¥1,200 museum. City views from top. Nishinomaru Garden ¥350 (cherry blossoms).", cost: 1200 },
  { time: "15:00", location: "Shinsekai", directions: "Metro to Ebisucho or walk from Tennoji.", tips: "Retro neon district. Tsutenkaku Tower ¥1,200. Kushikatsu (NEVER double-dip!).", cost: 1200 },
  { time: "16:00", location: "Tsutenkaku Tower", directions: "In Shinsekai.", tips: "¥1,200. Rub Billiken statue's feet for good luck.", cost: 1200 },
  { time: "17:00", location: "Umeda Sky Building", directions: "JR to Osaka/Umeda Stn. Walk northwest 10 min.", tips: "¥1,500. Floating Garden Observatory. Sunset timing ideal.", cost: 1500 },
  { time: "19:00", location: "Dotonbori", directions: "Metro Midosuji line to Namba.", tips: "Osaka's famous neon food street. Glico Running Man sign. Canal walk." },
]
dinner: "Dotonbori. Takoyaki, okonomiyaki, kushikatsu."
```

### Day 13 — Mon, April 20 — Osaka: Temples, Shrines & Minoo Falls
```
city: "Osaka"
theme: "Temples, Shrines & Minoo Falls"
stops: [
  { time: "8:00", location: "Shitenno-ji", directions: "Metro to Shitennoji-mae-yuhigaoka.", tips: "Japan's oldest Buddhist temple (593 AD). ¥300.", cost: 300 },
  { time: "9:00", location: "Isshin-ji Temple", directions: "Walk south ~5 min.", tips: "Unique: Buddhist statues made from cremated bones (okotsu-butsu). Free. Haunting and beautiful." },
  { time: "10:00", location: "Sumiyoshi Taisha", directions: "Nankai line or tram to Sumiyoshi Taisha.", tips: "One of Japan's oldest shrines. Arched Taikobashi bridge. Free." },
  { time: "11:15", location: "Kuromon Market", directions: "Metro to Nippombashi. Walk 3 min.", tips: "'Osaka's Kitchen.' Fresh seafood, street food. Try: tuna sashimi, grilled king crab legs." },
  { time: "12:00", location: "Lunch at Kuromon", directions: "In the market.", tips: "Eat as you walk. Uni (sea urchin), tamagoyaki, fresh fruit." },
  { time: "13:00", location: "Minoo Falls", directions: "Metro to Umeda, then Hankyu Minoo line to Minoo Stn. Walk 40 min to falls.", tips: "Beautiful forested gorge. 33m waterfall. Free. Try momiji tempura (fried maple leaves)." },
  { time: "15:00", location: "Katsuo-ji Temple", directions: "Bus from Minoo or taxi (~15 min).", tips: "Temple of victory. Daruma dolls everywhere. Beautiful grounds. ¥400.", cost: 400 },
]
dinner: "Namba area. Try gyoza or yakiniku."
```

### Day 14 — Tue, April 21 — USJ (Full Day)
```
city: "Osaka"
theme: "Universal Studios Japan (Full Day)"
stops: [
  { time: "7:30", location: "Travel to USJ", directions: "JR Osaka Loop to Universal City Stn.", tips: "" },
  { time: "8:00", location: "Universal Studios Japan", directions: "Walk from Universal City Stn.", tips: "~¥8,600+ entry + ¥10,000–20,000+ Express Pass. April = very busy. Express Pass ESSENTIAL.", cost: 20000 },
  { time: "19:00", location: "CityWalk dinner", directions: "Universal CityWalk shops.", tips: "Post-park dinner + shopping." },
  { time: "19:15", location: "Travel to Osaka", directions: "JR to Namba/hotel area.", tips: "One last Japanese meal." },
]
notes: "Priority: Super Nintendo World (timed entry via Express Pass). Harry Potter Forbidden Journey. Buy Power-Up Band (¥4,200) for Mario Kart."
```

### Day 15 — Wed, April 22 — Travel Home
```
city: "Travel"
theme: "Travel Home"
stops: [
  { time: "8:00", location: "Last morning in Osaka", directions: "—", tips: "Any last shopping or sightseeing." },
  { time: "10:00", location: "Shinkansen to Tokyo", directions: "Shin-Osaka → Tokyo. Hikari ~2h40. SmartEX.", tips: "~¥13,870. Reserve seat.", cost: 13870 },
  { time: "12:40", location: "N'EX to Narita", directions: "Tokyo Stn → Narita T1. ~53 min.", tips: "¥3,250. Last convenience store shopping at station.", cost: 3250 },
  { time: "13:45", location: "Arrive Narita T1", directions: "Terminal 1.", tips: "Tax refund counter if needed. Duty free shopping." },
  { time: "15:55", location: "Depart NRT → YVR", directions: "ZG022 Zipair.", tips: "~8h35 flight. Arrive ~08:30 same day (gain a day crossing date line)." },
]
```

---

## Implementation Notes

### Offline-First Strategy
1. **All itinerary data baked into the app** as JS/JSON — no network needed
2. **Capacitor Preferences API** for persistent state (checklist, booking status, cost tracking)
3. **Service Worker** for PWA-style caching if accessing via browser
4. **Pre-cache map tiles?** No — just use deep links to Apple Maps / Google Maps. They have their own offline maps.

### Map Integration
- Each stop with a location should have a small map icon
- Tap → opens Apple Maps (iOS) or Google Maps with the location name + "Japan"
- Use Capacitor App Launcher or simple `maps://` / `comgooglemaps://` URL schemes
- No embedded maps needed (saves complexity + offline works better)

### Data Structure
```javascript
// Central data store - all itinerary content lives here
const TRIP_DATA = {
  meta: {
    title: "Japan 2026",
    startDate: "2026-04-08",
    endDate: "2026-04-22",
    days: 15,
    flights: {
      outbound: { code: "ZG021", airline: "Zipair", from: "YVR", to: "NRT", depart: "10:30", arrive: "12:40+1", duration: "10h 15m" },
      return: { code: "ZG022", airline: "Zipair", from: "NRT", to: "YVR", depart: "15:55", arrive: "08:30", duration: "8h 35m" },
    }
  },
  days: [ /* Day objects as above */ ],
  bookings: [ /* Booking items with status */ ],
  paidEntry: [ /* Grouped by city */ ],
  budget: { /* Category breakdowns */ },
  checklist: { /* Sections with items */ },
};
```

### State Management
```javascript
// Use Capacitor Preferences for persistence
import { Preferences } from '@capacitor/preferences';

// Save checklist state
await Preferences.set({ key: 'checklist', value: JSON.stringify(checklistState) });

// Save booking statuses
await Preferences.set({ key: 'bookings', value: JSON.stringify(bookingStatuses) });

// Save cost tracking
await Preferences.set({ key: 'expenses', value: JSON.stringify(expenses) });
```

### Framework7 Components to Use
- **Tabs** (bottom tab bar) — 4 tabs
- **Timeline** — for day-by-day view
- **Cards** — for day summaries, booking items
- **List** — for checklist items with checkboxes
- **Accordion** — for expandable day details
- **Chip/Badge** — for cost tags, city labels, booking status
- **Progressbar** — for checklist completion
- **Action Sheet** — for map/copy options on long-press
- **Toast** — for "saved" confirmations

### Build & Deploy
```bash
npm create framework7 # Choose "Tabs" template, Capacitor, iOS
# Copy data + components into project
npx cap add ios
npx cap open ios # Opens Xcode
# Build → deploy to device
```

---

## Files to Provide Claude Code

When starting the Claude Code session, provide:
1. **This spec file** (JAPAN_APP_SPEC.md)
2. **JAPAN_TRIP_CONTEXT.md** (for reference/fact-checking)
3. Say: "Build this Framework7 + Capacitor iOS app following the spec. Start with `npm create framework7`, then implement all 4 tabs with the complete data."
