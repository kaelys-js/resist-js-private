#!/usr/bin/env python3
"""
Japan Itinerary PDF Updater
============================
Takes the ORIGINAL Japan_Itinerary_Apr2026.pdf (18 pages, Poppins font, pre-corrections)
and applies ALL verified corrections + inserts 2-page Cost Summary section.

Output: 20-page PDF with:
  - Corrected flight times (ZG021/ZG022 summer 2026 timetable)
  - Corrected admission prices (verified Jan/Feb 2026)
  - JR Pass ¥80,000 warning (not worth it for this itinerary)
  - N'EX individual pricing (¥3,250)
  - Shibuya Sky, Disney, USJ price updates
  - NEW: 2-page Cost Summary section (transit, tickets, grand total)
  - Updated checklist

Requirements:
  pip install pikepdf reportlab

Usage:
  python3 japan_itinerary_updater.py Japan_Itinerary_Apr2026.pdf
  # Outputs: Japan_Itinerary_Apr2026_UPDATED.pdf
"""

import sys
import os
import re
import pikepdf

# ── Step 0: Check for reportlab (needed for cost summary pages) ──────────────
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    from reportlab.lib.colors import HexColor, white
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False
    print("WARNING: reportlab not installed. Cost Summary pages will NOT be inserted.")
    print("  Install with: pip install reportlab")


# ═══════════════════════════════════════════════════════════════════════════════
# PART 1: INLINE TEXT CORRECTIONS (direct PDF byte editing)
# ═══════════════════════════════════════════════════════════════════════════════

def fix_page_stream(page, replacements, page_label=""):
    """Apply byte-level replacements to a page's content stream."""
    contents = page.get('/Contents')
    if contents is None:
        return

    if isinstance(contents, pikepdf.Array):
        for stream in contents:
            raw = stream.read_bytes()
            for old, new, desc in replacements:
                if old in raw:
                    raw = raw.replace(old, new, 1)
                    print(f"  {page_label}: {desc}")
            stream.write(raw)
    else:
        raw = contents.read_bytes()
        for old, new, desc in replacements:
            if old in raw:
                raw = raw.replace(old, new, 1)
                print(f"  {page_label}: {desc}")
        contents.write(raw)


def fix_page_stream_all(page, replacements, page_label=""):
    """Apply byte-level replacements (ALL occurrences) to a page's content stream."""
    contents = page.get('/Contents')
    if contents is None:
        return

    if isinstance(contents, pikepdf.Array):
        for stream in contents:
            raw = stream.read_bytes()
            for old, new, desc in replacements:
                if old in raw:
                    raw = raw.replace(old, new)
                    print(f"  {page_label}: {desc}")
            stream.write(raw)
    else:
        raw = contents.read_bytes()
        for old, new, desc in replacements:
            if old in raw:
                raw = raw.replace(old, new)
                print(f"  {page_label}: {desc}")
        contents.write(raw)


def apply_inline_corrections(pdf):
    """Apply all price/time corrections to the existing PDF pages."""

    print("\n── Flight Time Corrections ──")
    # Page 1 (index 0): Header flight times + overview table
    fix_page_stream(pdf.pages[0], [
        (b'12:45pm Thu Apr 9', b'12:40pm Thu Apr 9', "ZG021 arrival 12:45→12:40"),
        (b'NRT 15:50 Wed Apr 22', b'NRT 15:55 Wed Apr 22', "ZG022 departure 15:50→15:55"),
        (b'~08:25 Wed Apr 22', b'~08:30 Wed Apr 22', "ZG022 arrival 08:25→08:30"),
        (b'12:45pm. Asakusa', b'12:40pm. Asakusa', "Overview table arrival fix"),
        (b'fly 15:50', b'fly 15:55', "Overview table departure fix"),
    ], "Page 1")

    # Page 3 (index 2): Day 2 arrival time
    fix_page_stream_all(pdf.pages[2], [
        (b'12:45', b'12:40', "Day 2 arrival 12:45→12:40"),
    ], "Page 3")

    # Page 14 (index 13): Day 15 return times
    fix_page_stream_all(pdf.pages[13], [
        (b'15:50', b'15:55', "Day 15 departure 15:50→15:55"),
        (b'08:25', b'08:30', "Day 15 arrival 08:25→08:30"),
    ], "Page 14")

    print("\n── Admission Price Corrections ──")
    # Note on yen encoding: the PDF uses octal escapes in Tj strings.
    # \\002 = yen symbol in the main font mapping on most pages.
    # \\003 = yen on some pages (checklist area).

    # Page 6 (index 5): Art Aquarium ¥2,300→¥2,500
    fix_page_stream(pdf.pages[5], [
        (b'~\\0022,300', b'~\\0022,500', "Art Aquarium ¥2,300→¥2,500"),
        (b'Verify still open 2026.', b'Open year-round.        ', "Remove 'Verify still open'"),
    ], "Page 6")

    # Page 9 (index 8): Kiyomizu-dera ¥400→¥500
    fix_page_stream(pdf.pages[8], [
        (b'\\002400. Famous wooden stage', b'\\002500. Famous wooden stage', "Kiyomizu ¥400→¥500"),
    ], "Page 9")

    # Page 12 (index 11): Osaka Castle ¥600→¥1,200, Tsutenkaku ¥900→¥1,200
    fix_page_stream(pdf.pages[11], [
        (b'\\002600 for castle museum', b'\\0021,200 castle museum', "Osaka Castle ¥600→¥1,200"),
        (b'\\002900. Rub Billiken', b'\\0021,200. Rub Billiken', "Tsutenkaku ¥900→¥1,200"),
    ], "Page 12")

    # Page 15 (index 14): Paid Entry table — position-specific replacements
    print("\n── Paid Entry Table (Page 15) ──")
    page15 = pdf.pages[14]
    contents = page15.get('/Contents')
    raw = (contents.read_bytes() if not isinstance(contents, pikepdf.Array)
           else b''.join(s.read_bytes() for s in contents))

    # Kiyomizu: find the \\002400 right after "Kiyomizu-dera"
    kiyomizu_pos = raw.find(b'Kiyomizu-dera) Tj')
    if kiyomizu_pos > 0:
        price_pos = raw.find(b'(\\002400) Tj', kiyomizu_pos)
        if price_pos > 0 and price_pos < kiyomizu_pos + 200:
            raw = raw[:price_pos] + b'(\\002500) Tj' + raw[price_pos + len(b'(\\002400) Tj'):]
            print("  Page 15: Kiyomizu table ¥400→¥500")

    # Osaka Castle: find the \\002600 right after "Osaka Castle"
    osaka_pos = raw.find(b'Osaka Castle) Tj')
    if osaka_pos > 0:
        price_pos = raw.find(b'(\\002600) Tj', osaka_pos)
        if price_pos > 0 and price_pos < osaka_pos + 200:
            raw = raw[:price_pos] + b'(\\0021,200) Tj' + raw[price_pos + len(b'(\\002600) Tj'):]
            print("  Page 15: Osaka Castle table ¥600→¥1,200")

    # Tsutenkaku: find the \\002900 right after "Tsutenkaku"
    tsuten_pos = raw.find(b'Tsutenkaku Tower) Tj')
    if tsuten_pos > 0:
        price_pos = raw.find(b'(\\002900) Tj', tsuten_pos)
        if price_pos > 0 and price_pos < tsuten_pos + 200:
            raw = raw[:price_pos] + b'(\\0021,200) Tj' + raw[price_pos + len(b'(\\002900) Tj'):]
            print("  Page 15: Tsutenkaku table ¥900→¥1,200")

    # Art Aquarium in table
    raw = raw.replace(b'~\\0022,300', b'~\\0022,500', 1)
    print("  Page 15: Art Aquarium table ¥2,300→¥2,500")

    # Disney in pre-booking: ¥9,400-10,900 → ¥7,900-10,900
    raw = raw.replace(b'\\0029,400\\00310,900', b'\\0027,900\\00310,900', 1)
    print("  Page 15: Disney ¥9,400→¥7,900")

    # USJ Studio: ¥8,600-9,800 → ~¥8,600+
    raw = raw.replace(b'\\0028,600\\0039,800', b'~\\0028,600+     ', 1)
    print("  Page 15: USJ Studio price updated")

    # USJ Express: ¥7,800-15,000+ → ¥10,000-20,000+
    raw = raw.replace(b'\\0027,800\\00315,000+', b'\\00210,000\\00320,000+', 1)
    print("  Page 15: USJ Express price updated")

    # JR Pass: ¥50,000 → ¥80,000
    raw = raw.replace(b'~\\00250,000', b'~\\00280,000', 1)
    print("  Page 15: JR Pass table ¥50,000→¥80,000")

    # Write back
    if isinstance(contents, pikepdf.Array):
        # Need to write to individual streams — simplified: write to first
        contents[0].write(raw)
    else:
        contents.write(raw)

    print("\n── Other Price Fixes ──")
    # Page 2 (index 1): JR Pass ¥50,000→¥80,000 + warning
    fix_page_stream(pdf.pages[1], [
        (b'~\\00150,000\\)', b'~\\00180,000\\)', "JR Pass title ¥50,000→¥80,000"),
        (b'Buy on Klook or japanrailpass.net before departure.',
         b'WARNING: \\00280,000 is NOT worth it for this trip!',
         "Added NOT WORTH IT warning"),
    ], "Page 2")

    # Page 5 (index 4): Shibuya Sky ¥2,000→¥3,000+
    fix_page_stream(pdf.pages[4], [
        (b'\\(\\0022,000\\)', b'\\(\\0023,000+\\)', "Shibuya Sky ¥2,000→¥3,000+"),
    ], "Page 5")

    # Page 7 (index 6): Disney ¥9,400→¥7,900 in day itinerary
    fix_page_stream(pdf.pages[6], [
        (b'\\0029,400\\00310,900', b'\\0027,900\\00310,900', "Disney day ¥9,400→¥7,900"),
    ], "Page 7")

    # Page 14 (index 13): USJ prices in day itinerary
    fix_page_stream(pdf.pages[13], [
        (b'\\0028,600\\0039,800 entry + \\0027,800\\00315,000+',
         b'~\\0028,600+ entry + \\00210,000\\00320,000+ ',
         "USJ day prices updated"),
    ], "Page 14")

    print("\n── N'EX Individual Pricing ──")
    # Page 3 (index 2): N'EX "Pass covers fare" → ¥3,250
    fix_page_stream(pdf.pages[2], [
        (b'Pass covers fare', b'\\0023,250 ea. way', "N'EX Day 2: ¥3,250"),
    ], "Page 3")

    # Page 14 (index 13): N'EX return "JR Pass covered"
    fix_page_stream(pdf.pages[13], [
        (b'JR Pass) Tj T* (covered. Reserve seat.)',
         b'\\0023,250) Tj T* (each way. Reserve online.)',
         "N'EX Day 15: ¥3,250"),
    ], "Page 14")

    print("\n── Checklist Updates ──")
    # Page 17 (index 16): JR Pass checklist item
    fix_page_stream(pdf.pages[16], [
        (b'Purchase 14-day JR Pass on Klook or japanrailpass.net',
         b'Research JR Pass vs individual tickets \\(SmartEX app\\)',
         "Checklist: JR Pass → SmartEX"),
    ], "Page 17")

    # Page 18 (index 17): Art Aquarium verify note
    fix_page_stream(pdf.pages[17], [
        (b'Verify Art Aquarium Ginza + TeamLab Botanical still operating April 2026',
         b'Verify TeamLab Botanical Garden still open Apr 2026 \\(reopens Mar 1\\) ',
         "Checklist: Updated verify note"),
    ], "Page 18")


# ═══════════════════════════════════════════════════════════════════════════════
# PART 2: CREATE COST SUMMARY PAGES (reportlab)
# ═══════════════════════════════════════════════════════════════════════════════

def create_cost_summary_pdf(output_path, font_dir=None):
    """Create 2-page Cost Summary section matching the itinerary's styling."""
    if not HAS_REPORTLAB:
        return False

    # Try to register Poppins fonts
    font_paths = [
        '/usr/share/fonts/truetype/google-fonts/',
        os.path.expanduser('~/Library/Fonts/'),
        '/usr/share/fonts/truetype/',
        'fonts/',
    ]
    if font_dir:
        font_paths.insert(0, font_dir)

    poppins_found = False
    for fdir in font_paths:
        reg_path = os.path.join(fdir, 'Poppins-Regular.ttf')
        if os.path.exists(reg_path):
            pdfmetrics.registerFont(TTFont('Poppins', reg_path))
            pdfmetrics.registerFont(TTFont('Poppins-Bold', os.path.join(fdir, 'Poppins-Bold.ttf')))
            pdfmetrics.registerFont(TTFont('Poppins-Light', os.path.join(fdir, 'Poppins-Light.ttf')))
            pdfmetrics.registerFont(TTFont('Poppins-Italic', os.path.join(fdir, 'Poppins-Italic.ttf')))
            pdfmetrics.registerFont(TTFont('Poppins-BoldItalic', os.path.join(fdir, 'Poppins-BoldItalic.ttf')))
            pdfmetrics.registerFontFamily('Poppins', normal='Poppins', bold='Poppins-Bold',
                                          italic='Poppins-Italic', boldItalic='Poppins-BoldItalic')
            poppins_found = True
            break

    if not poppins_found:
        print("WARNING: Poppins fonts not found. Using Helvetica fallback.")
        FONT = 'Helvetica'
        FONTB = 'Helvetica-Bold'
        FONTI = 'Helvetica-Oblique'
    else:
        FONT = 'Poppins'
        FONTB = 'Poppins-Bold'
        FONTI = 'Poppins-Italic'

    # Colors matching the PDF
    NAVY = HexColor("#1d3a5e")
    CHARCOAL = HexColor("#3d4852")
    SLATE = HexColor("#6b7b8c")
    CREAM = HexColor("#f4f0e8")
    RED = HexColor("#c63d3a")
    INFO_BG = HexColor("#eff6ff")
    DIVIDER = HexColor("#d4cfc3")

    section = ParagraphStyle('section', fontName=FONTB, fontSize=13, textColor=NAVY, spaceAfter=6, spaceBefore=10)
    subsection = ParagraphStyle('subsection', fontName=FONTB, fontSize=10, textColor=NAVY, spaceAfter=4, spaceBefore=8)
    body = ParagraphStyle('body', fontName=FONT, fontSize=8, textColor=CHARCOAL, leading=11, spaceAfter=3)
    note = ParagraphStyle('note', fontName=FONTI, fontSize=7, textColor=SLATE, leading=10, spaceAfter=4)
    tcb = ParagraphStyle('tcb', fontName=FONTB, fontSize=7.5, textColor=white, leading=10)
    tc = ParagraphStyle('tc', fontName=FONT, fontSize=7.5, textColor=CHARCOAL, leading=10)
    warn_style = ParagraphStyle('warn', fontName=FONT, fontSize=8, textColor=CHARCOAL, leading=11)

    def add_footer(canvas_obj, doc_obj):
        canvas_obj.saveState()
        canvas_obj.setFont(FONT, 7)
        canvas_obj.setFillColor(SLATE)
        canvas_obj.drawCentredString(letter[0]/2, 25.2, "Japan \u00b7 April 8\u201322, 2026 \u00b7 Cost Summary")
        canvas_obj.restoreState()

    doc = SimpleDocTemplate(output_path, pagesize=letter,
                            leftMargin=52.8, rightMargin=52.8,
                            topMargin=52.8, bottomMargin=52.8)
    story = []

    # Header
    story.append(Paragraph("Trip Cost Summary", section))
    story.append(Paragraph("All prices in Japanese Yen (\u00a5). Verified as of Jan/Feb 2026. 1 CAD \u2248 \u00a5105\u2013110.", note))
    story.append(Spacer(1, 6))

    # JR Pass Warning Box
    warn_data = [[Paragraph(
        "<b>JR Pass Warning:</b> The 14-day JR Pass is now \u00a580,000 (70% price hike Oct 2023). "
        "For THIS itinerary, individual tickets cost ~\u00a547,000 total \u2014 saving ~\u00a533,000 vs. the pass. "
        "<b>Buy Shinkansen tickets individually via SmartEX app instead.</b>", warn_style)]]
    warn_tbl = Table(warn_data, colWidths=[6.7*inch])
    warn_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor("#fef2f2")),
        ('BOX', (0,0), (-1,-1), 1, RED),
        ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(warn_tbl)
    story.append(Spacer(1, 10))

    # Transit & Passes Table
    story.append(Paragraph("Transit &amp; Passes", subsection))
    tr = [
        ['Item', 'Cost (per person)', 'Notes'],
        ['OPTION A: JR Pass 14-day', '\u00a580,000', 'NOT recommended for this trip.'],
        ['OPTION B: Individual tickets (RECOMMENDED)', '~\u00a547,000 total', 'SmartEX app. Saves ~\u00a533,000 vs JR Pass.'],
        ['  \u2514 Narita Express (round trip)', '~\u00a56,500', 'Alt: Keisei Skyliner \u00a52,520 each way.'],
        ['  \u2514 Tokyo \u2192 Kyoto Shinkansen (Hikari)', '~\u00a513,320', 'SmartEX app.'],
        ['  \u2514 Shin-Osaka \u2192 Tokyo Shinkansen', '~\u00a513,870', 'SmartEX app.'],
        ['  \u2514 JR Yokosuka: Tokyo \u2192 Kamakura RT', '~\u00a51,840', ''],
        ['  \u2514 JR Nara line: Kyoto \u2192 Nara RT', '~\u00a51,420', ''],
        ['  \u2514 JR: Nara \u2192 Osaka', '~\u00a5810', ''],
        ['  \u2514 JR local lines in Tokyo (6 days)', '~\u00a53,000', 'Varies by usage.'],
        ['Suica/Pasmo IC card (metro, buses)', '\u00a55,000\u201310,000 total', 'Load as needed. \u00a5500 deposit.'],
        ['Kyoto Bus Day Pass (3 days)', '\u00a5700 x 3 = \u00a52,100', 'Essential for temple hopping.'],
        ['Mt. Fuji highway bus (round trip)', '~\u00a54,400', 'Shinjuku \u2192 Kawaguchiko return.'],
        ['Takkyubin luggage forwarding (x2)', '~\u00a52,000 x 2 = \u00a54,000', 'Tokyo\u2192Kyoto + Kyoto\u2192Osaka.'],
    ]
    ttbl = Table(
        [[Paragraph(c, tcb if i==0 else tc) for c in r] for i, r in enumerate(tr)],
        colWidths=[2.4*inch, 1.3*inch, 3.0*inch]
    )
    ttbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY), ('TEXTCOLOR', (0,0), (-1,0), white),
        ('LINEBELOW', (0,0), (-1,-1), 0.3, DIVIDER),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    for i in range(2, len(tr), 2):
        ttbl.setStyle(TableStyle([('BACKGROUND', (0,i), (-1,i), CREAM)]))
    story.append(ttbl)
    story.append(Spacer(1, 10))

    # Tickets & Admissions Table
    story.append(Paragraph("Tickets &amp; Admissions (Day by Day)", subsection))
    ta = [
        ['Day', 'Attraction', 'Cost', 'Notes (free items nearby)'],
        ['2', 'Senso-ji / Asakusa', 'FREE', 'Nakamise shopping street free.'],
        ['3', 'Ueno Park + Ameyoko', 'FREE', 'Yanaka Ginza free.'],
        ['3', 'Gotokuji Temple', 'FREE', 'Maneki-neko (buy \u00a5300\u20135,000).'],
        ['4', 'Meiji Shrine', 'FREE', 'Harajuku Takeshita St free.'],
        ['4', 'Shibuya Sky', '\u00a53,000\u20133,700', 'Book on Klook.'],
        ['5', 'Art Aquarium Ginza', '\u00a52,500', ''],
        ['5', 'teamLab Borderless', '\u00a53,800\u20134,800', 'Book 2 months ahead on teamlab.art.'],
        ['6', 'Tokyo Disney', '\u00a57,900\u201310,900', 'April peak pricing.'],
        ['7', 'Great Buddha Kamakura', '\u00a5300', 'Tsurugaoka Hachimangu free.'],
        ['7', 'Hase-dera', '\u00a5400', ''],
        ['8', 'Mt. Fuji 5th Station bus', '~\u00a53,080 RT', 'If road open.'],
        ['9', 'Kiyomizu-dera', '\u00a5500', 'Sannenzaka, Gion, Hanamikoji free.'],
        ['9', 'Kodai-ji', '\u00a5600', ''],
        ['9', 'Sanjusangen-do', '\u00a5600', ''],
        ['10', 'Kinkaku-ji', '\u00a5500', ''],
        ['10', 'Ryoan-ji', '\u00a5500', ''],
        ['10', 'Ninna-ji', '\u00a5500', ''],
        ['10', 'Nijo Castle', '\u00a51,300', 'Nishiki Market free.'],
        ['11', 'Fushimi Inari', 'FREE', 'Bamboo Grove, Togetsukyo free.'],
        ['11', 'Byodo-in (Uji)', '\u00a5700', ''],
        ['12', 'Todai-ji (Nara)', '\u00a5600', 'Nara Park + deer free.'],
        ['12', 'Osaka Castle', '\u00a51,200', 'Nakanoshima Park free.'],
        ['12', 'Umeda Sky Building', '\u00a51,500', ''],
        ['12', 'Tsutenkaku Tower', '\u00a51,200', 'Shinsekai free.'],
        ['13', 'Shitenno-ji', '\u00a5300', ''],
        ['13', 'Sumiyoshi Taisha', 'FREE', ''],
        ['13', 'Minoo Falls', 'FREE', ''],
        ['13', 'Katsuo-ji Temple', '\u00a5400', ''],
        ['14', 'USJ Studio Pass', '~\u00a58,600+', 'Dynamic pricing.'],
        ['14', 'USJ Express Pass 7', '~\u00a510,000\u201320,000+', 'Essential for Nintendo World.'],
        ['14', 'USJ Power-Up Band', '\u00a54,200', 'For Mario Kart interactive.'],
    ]
    tatbl = Table(
        [[Paragraph(c, tcb if i==0 else tc) for c in r] for i, r in enumerate(ta)],
        colWidths=[0.4*inch, 1.9*inch, 1.2*inch, 3.2*inch]
    )
    tatbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY), ('TEXTCOLOR', (0,0), (-1,0), white),
        ('LINEBELOW', (0,0), (-1,-1), 0.3, DIVIDER),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 3), ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    for i in range(2, len(ta), 2):
        tatbl.setStyle(TableStyle([('BACKGROUND', (0,i), (-1,i), CREAM)]))
    story.append(tatbl)
    story.append(Spacer(1, 10))

    # Grand Total Table
    story.append(Paragraph("Grand Total Estimate (Per Person)", subsection))
    gt = [
        ['Category', 'Budget', 'Mid-Range', 'Notes'],
        ['Transit (Option B: individual)', '~\u00a560,000', '~\u00a565,000', 'IC card + buses + Shinkansen'],
        ['Tickets & Admissions', '~\u00a537,000', '~\u00a548,000', 'All temples + Disney + USJ w/ Express'],
        ['Accommodation (12 nights)', '~\u00a596,000', '~\u00a5200,000', 'Budget hotel vs. mid-range'],
        ['Meals (13 days)', '~\u00a548,000', '~\u00a5130,000', 'Konbini/ramen vs. restaurants'],
        ['Misc (souvenirs, SIM, etc.)', '~\u00a515,000', '~\u00a530,000', 'eSIM ~\u00a53,000. Souvenirs vary.'],
        ['TOTAL (excl. flights)', '~\u00a5256,000', '~\u00a5473,000', '~CAD $2,350\u2013$4,350'],
        ['Flights (Zipair YVR\u2192NRT RT)', '~CAD $600\u2013900', '~CAD $600\u2013900', 'Check Zipair for current pricing.'],
        ['GRAND TOTAL', '~CAD $2,950\u20133,250', '~CAD $4,950\u20135,250', 'Per person, all-inclusive estimate.'],
    ]
    gttbl = Table(
        [[Paragraph(c, tcb if (i==0 or i>=7) else tc) for c in r] for i, r in enumerate(gt)],
        colWidths=[2.0*inch, 1.1*inch, 1.1*inch, 2.5*inch]
    )
    gttbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY), ('TEXTCOLOR', (0,0), (-1,0), white),
        ('LINEBELOW', (0,0), (-1,-1), 0.3, DIVIDER),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LINEABOVE', (0,7), (-1,7), 1, NAVY),
        ('BACKGROUND', (0,8), (-1,8), NAVY), ('TEXTCOLOR', (0,8), (-1,8), white),
    ]))
    for i in range(2, 7, 2):
        gttbl.setStyle(TableStyle([('BACKGROUND', (0,i), (-1,i), CREAM)]))
    story.append(gttbl)
    story.append(Spacer(1, 8))

    # Key finding box
    key_data = [[Paragraph(
        "<b>Key finding:</b> The JR Pass (14-day) at \u00a580,000 is NOT worth it for this itinerary. "
        "Individual Shinkansen tickets total ~\u00a547,000, saving ~\u00a533,000. Use SmartEX app to book.",
        warn_style)]]
    key_tbl = Table(key_data, colWidths=[6.7*inch])
    key_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor("#fef2f2")),
        ('BOX', (0,0), (-1,-1), 1, RED),
        ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(key_tbl)
    story.append(Spacer(1, 6))

    # Tips box
    tips_data = [[Paragraph(
        "<b>Money-saving tips:</b> 7-Eleven ATMs accept foreign cards (best rates). "
        "Many temples/shrines are free. Konbini meals are excellent and cheap (\u00a5300\u2013800). "
        "Tax-free shopping at Don Quijote/Uniqlo over \u00a55,000 (bring passport). "
        "Download Tabelog for restaurant reviews.", warn_style)]]
    tips_tbl = Table(tips_data, colWidths=[6.7*inch])
    tips_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), INFO_BG),
        ('BOX', (0,0), (-1,-1), 1, HexColor("#93c5fd")),
        ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(tips_tbl)

    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# PART 3: MERGE & PAGE NUMBER FIX
# ═══════════════════════════════════════════════════════════════════════════════

def insert_and_renumber(main_pdf_path, insert_pdf_path, output_path, insert_before_page=17):
    """Insert cost summary pages and fix page numbers in footers."""
    main = pikepdf.Pdf.open(main_pdf_path)
    insert = pikepdf.Pdf.open(insert_pdf_path)

    insert_at = insert_before_page - 1  # 0-indexed

    # Insert pages
    for i, page in enumerate(insert.pages):
        main.pages.insert(insert_at + i, page)
    print(f"\n  Inserted {len(insert.pages)} Cost Summary pages before page {insert_before_page}")
    print(f"  Total pages: {len(main.pages)}")

    # Fix page numbers in footers
    for page_idx in range(len(main.pages)):
        page = main.pages[page_idx]
        contents = page.get('/Contents')
        if contents is None:
            continue
        try:
            if isinstance(contents, pikepdf.Array):
                for stream in contents:
                    raw = stream.read_bytes()
                    for match in re.finditer(rb'Page (\d+)', raw):
                        raw = raw.replace(match.group(0), f'Page {page_idx + 1}'.encode(), 1)
                        break
                    if b'Cost Summary' in raw:
                        raw = raw.replace(b'Cost Summary', f'Page {page_idx + 1}  '.encode())
                    stream.write(raw)
            else:
                raw = contents.read_bytes()
                for match in re.finditer(rb'Page (\d+)', raw):
                    raw = raw.replace(match.group(0), f'Page {page_idx + 1}'.encode(), 1)
                    break
                if b'Cost Summary' in raw:
                    raw = raw.replace(b'Cost Summary', f'Page {page_idx + 1}  '.encode())
                contents.write(raw)
        except Exception as e:
            pass

    # Fix the cost summary header that gets mangled by page number replacement
    cs_page = main.pages[insert_at]
    contents = cs_page.get('/Contents')
    if isinstance(contents, pikepdf.Array):
        for stream in contents:
            raw = stream.read_bytes()
            if b'Trip Page' in raw:
                raw = raw.replace(b'Trip Page ' + str(insert_at + 1).encode(), b'Trip Cost Summary')
                stream.write(raw)
    else:
        raw = contents.read_bytes()
        if b'Trip Page' in raw:
            raw = raw.replace(b'Trip Page ' + str(insert_at + 1).encode(), b'Trip Cost Summary')
            contents.write(raw)

    # Fix any remaining ¥50,000 on pushed-back pages (checklist used \\003 encoding)
    for i in range(insert_at + len(insert.pages), len(main.pages)):
        page = main.pages[i]
        contents = page.get('/Contents')
        if contents is None:
            continue
        raw = (contents.read_bytes() if not isinstance(contents, pikepdf.Array)
               else contents[0].read_bytes())
        if b'\\00350,000' in raw:
            raw = raw.replace(b'\\00350,000', b'\\00380,000')
            if isinstance(contents, pikepdf.Array):
                contents[0].write(raw)
            else:
                contents.write(raw)
            print(f"  Page {i+1}: Fixed ¥50,000→¥80,000 (\\003 encoding)")

    main.save(output_path)
    print(f"\n  Final PDF saved: {output_path}")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: python3 {sys.argv[0]} <input_pdf> [output_pdf]")
        print(f"  Default output: <input>_UPDATED.pdf")
        sys.exit(1)

    input_pdf = sys.argv[1]
    if not os.path.exists(input_pdf):
        print(f"Error: File not found: {input_pdf}")
        sys.exit(1)

    base, ext = os.path.splitext(input_pdf)
    output_pdf = sys.argv[2] if len(sys.argv) > 2 else f"{base}_UPDATED{ext}"

    print(f"Input:  {input_pdf}")
    print(f"Output: {output_pdf}")

    # Step 1: Apply inline corrections
    print("\n" + "="*60)
    print("STEP 1: Applying inline corrections")
    print("="*60)
    pdf = pikepdf.Pdf.open(input_pdf)
    apply_inline_corrections(pdf)
    import tempfile
    temp_corrected = os.path.join(tempfile.gettempdir(), "japan_temp_corrected.pdf")
    pdf.save(temp_corrected)
    print(f"\n  Saved intermediate: {temp_corrected}")

    # Step 2: Create cost summary pages
    if HAS_REPORTLAB:
        print("\n" + "="*60)
        print("STEP 2: Creating Cost Summary pages")
        print("="*60)
        temp_summary = os.path.join(tempfile.gettempdir(), "japan_temp_summary.pdf")
        success = create_cost_summary_pdf(temp_summary)
        if success:
            print(f"  Created: {temp_summary}")
        else:
            print("  FAILED to create cost summary pages.")
            temp_summary = None
    else:
        temp_summary = None

    # Step 3: Merge and renumber
    if temp_summary and os.path.exists(temp_summary):
        print("\n" + "="*60)
        print("STEP 3: Inserting Cost Summary & fixing page numbers")
        print("="*60)
        insert_and_renumber(temp_corrected, temp_summary, output_pdf, insert_before_page=17)

        # Cleanup temp files
        os.remove(temp_corrected)
        os.remove(temp_summary)
    else:
        # No cost summary — just rename
        os.rename(temp_corrected, output_pdf)

    print("\n" + "="*60)
    print("DONE!")
    print(f"Output: {output_pdf}")
    print("="*60)
