#!/usr/bin/env python3
"""
Generate searchable indexes and cross-references for the guide library.

Generates:
1. guides/INDEX.md — alphabetical master listing
2. guides/<section>/README.md — per-section index
3. guides/SITUATIONS.md — organized by real-world scenarios
4. guides/PROBLEMS.md — organized by symptom/problem

Usage:
    python scripts/build-index.py
    python scripts/build-index.py --section 01    # Rebuild one section index only
"""

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent

# Situation mappings: scenario -> list of guide slugs/patterns that apply
SITUATIONS = {
    "The power just went out": [
        ("01", "how-to-assess-refrigerated-food-after-power-loss"),
        ("01", "how-to-assess-frozen-food-after-thawing"),
        ("01", "how-to-store-food-short-term"),
        ("17", "how-to-function-during-extended-power-grid-failure"),
        ("13", "how-to-stay-warm-without-power"),
        ("13", "how-to-stay-cool-without-power"),
        ("23", "how-to-use-generators-safely"),
        ("23", "how-to-manage-power-consumption-and-prioritize-loads"),
        ("32", "how-to-charge-devices-without-grid-power"),
        ("12", "how-to-build-a-fire-indoors-safely"),
    ],
    "Someone is injured": [
        ("06", "how-to-perform-triage"),
        ("06", "how-to-control-bleeding"),
        ("06", "how-to-recognize-and-treat-shock"),
        ("06", "how-to-treat-burns"),
        ("06", "how-to-treat-fractures"),
        ("06", "how-to-clean-and-dress-wounds"),
        ("06", "how-to-improvise-medical-supplies"),
        ("05", "when-to-seek-emergency-care-vs-urgent-care-vs-self-treat"),
    ],
    "There's a fire": [
        ("04", "how-to-handle-grease-fires"),
        ("04", "how-to-use-a-fire-extinguisher-in-a-kitchen"),
        ("12", "how-to-extinguish-fires-safely"),
        ("12", "how-to-identify-fire-classes"),
        ("16", "how-to-survive-and-respond-to-house-fires"),
        ("16", "how-to-survive-and-respond-to-wildfires"),
        ("04", "how-to-prevent-kitchen-fires"),
    ],
    "We're out of water": [
        ("09", "how-to-find-water-in-urban-areas"),
        ("09", "how-to-find-water-in-nature"),
        ("09", "how-to-collect-rainwater"),
        ("09", "how-to-purify-water-by-boiling"),
        ("09", "how-to-purify-water-chemically"),
        ("09", "how-to-build-an-improvised-water-filter"),
        ("09", "how-to-ration-water"),
        ("05", "how-to-assess-dehydration"),
    ],
    "The food might be bad": [
        ("01", "when-meat-is-fresh-aging-spoiled-or-dangerous"),
        ("01", "when-dairy-products-are-safe-or-spoiled"),
        ("01", "when-eggs-are-fresh-old-or-unsafe"),
        ("01", "how-to-assess-canned-and-jarred-foods-for-safety"),
        ("01", "how-to-interpret-expiration-and-best-before-labels"),
        ("01", "how-to-identify-foodborne-illness-symptoms-and-respond"),
        ("01", "when-cooked-food-is-still-safe-at-room-temperature"),
        ("01", "when-cooking-oils-are-rancid"),
    ],
    "We need to evacuate": [
        ("26", "how-to-build-go-bags"),
        ("26", "how-to-evacuate-safely"),
        ("18", "how-to-evacuate-a-city-under-chaotic-conditions"),
        ("28", "how-to-coordinate-evacuation-for-a-group"),
        ("27", "how-to-transport-dependents-safely"),
        ("33", "essential-documents-to-have-ready"),
        ("08", "how-to-drive-in-snow-ice-flood-sand-and-high-wind"),
    ],
    "Someone is sick and we can't get to a doctor": [
        ("05", "when-to-seek-emergency-care-vs-urgent-care-vs-self-treat"),
        ("05", "how-to-manage-colds-and-flu-without-a-doctor"),
        ("05", "how-to-manage-gi-illness"),
        ("05", "how-to-take-vital-signs-without-equipment"),
        ("05", "how-to-assess-dehydration"),
        ("05", "how-to-use-common-otc-medications-effectively"),
        ("05", "when-a-fever-is-concerning"),
    ],
    "We're stuck in extreme cold": [
        ("13", "how-to-stay-warm-without-power"),
        ("13", "how-to-insulate-a-space-without-power"),
        ("15", "how-to-layer-correctly"),
        ("06", "how-to-treat-hypothermia"),
        ("06", "how-to-treat-frostbite"),
        ("13", "how-to-identify-early-heat-stress-and-cold-stress"),
        ("16", "how-to-survive-and-respond-to-extreme-cold-events"),
    ],
    "We're stuck in extreme heat": [
        ("13", "how-to-stay-cool-without-power"),
        ("06", "how-to-treat-heat-exhaustion-and-heat-stroke"),
        ("13", "how-to-identify-early-heat-stress-and-cold-stress"),
        ("09", "how-to-ration-water"),
        ("16", "how-to-survive-and-respond-to-extreme-heat-events"),
        ("05", "how-to-assess-dehydration"),
    ],
    "There's a natural disaster warning": [
        ("16", "how-to-survive-and-respond-to-earthquakes"),
        ("16", "how-to-survive-and-respond-to-tornadoes"),
        ("16", "how-to-survive-and-respond-to-hurricanes"),
        ("16", "how-to-survive-and-respond-to-floods"),
        ("13", "how-to-weatherproof-a-home"),
        ("26", "how-to-evacuate-safely"),
        ("26", "how-to-shelter-in-place"),
        ("34", "how-to-create-emergency-plans-for-your-household"),
    ],
    "We need to cook with limited resources": [
        ("02", "how-to-cook-with-limited-ingredients"),
        ("02", "how-to-cook-without-power"),
        ("02", "how-to-cook-without-recipes"),
        ("02", "how-to-plan-a-meal-from-available-ingredients"),
        ("12", "how-to-build-and-use-improvised-stoves"),
        ("12", "how-to-use-fire-for-cooking-heat-and-water-purification"),
    ],
    "Something in the house is broken": [
        ("07", "how-to-unclog-drains"),
        ("07", "how-to-fix-a-running-toilet"),
        ("07", "how-to-fix-leaking-faucets-and-pipes"),
        ("07", "how-to-safely-reset-a-tripped-breaker"),
        ("07", "how-to-troubleshoot-appliance-failures"),
        ("07", "how-to-patch-drywall-and-plaster"),
        ("07", "how-to-temporarily-seal-leaks"),
    ],
    "We need to leave the area permanently": [
        ("18", "how-to-become-a-refugee-or-displaced-person"),
        ("18", "how-to-establish-yourself-in-a-new-location"),
        ("18", "how-to-cross-borders-during-emergencies"),
        ("26", "how-to-build-go-bags"),
        ("33", "essential-documents-to-have-ready"),
        ("33", "how-to-secure-important-documents"),
        ("29", "how-to-protect-important-financial-records"),
    ],
    "Civil unrest nearby": [
        ("18", "how-to-respond-to-civil-unrest"),
        ("18", "how-to-navigate-curfews-and-movement-restrictions"),
        ("24", "how-to-maintain-situational-awareness"),
        ("24", "how-to-secure-a-home-or-living-space"),
        ("18", "how-to-protect-yourself-during-looting"),
        ("25", "how-to-recognize-and-interrupt-panic"),
        ("24", "how-to-respond-to-civil-unrest-as-a-bystander"),
    ],
    "No communication available": [
        ("21", "how-to-communicate-without-phones-or-internet"),
        ("21", "how-to-use-emergency-radios"),
        ("21", "how-to-signal-for-rescue"),
        ("21", "how-to-establish-communication-plans"),
        ("21", "how-to-leave-messages-and-waypoints"),
        ("32", "how-to-use-mesh-networks-and-offline-communication-apps"),
    ],
    "A child needs care during an emergency": [
        ("27", "how-to-feed-infants-and-young-children-during-disruption"),
        ("27", "how-to-maintain-routine-for-children-under-stress"),
        ("27", "how-to-communicate-with-children-during-emergencies"),
        ("27", "how-to-transport-dependents-safely"),
        ("06", "how-to-handle-pediatric-emergencies"),
        ("27", "how-to-educate-children-without-schools"),
    ],
}

# Problem/symptom mappings
PROBLEMS = {
    "Food smells weird": [
        ("01", "when-meat-is-fresh-aging-spoiled-or-dangerous"),
        ("01", "when-dairy-products-are-safe-or-spoiled"),
        ("01", "when-cooking-oils-are-rancid"),
        ("01", "when-fish-and-seafood-are-fresh-spoiled-or-toxic"),
        ("01", "when-eggs-are-fresh-old-or-unsafe"),
    ],
    "Water looks or smells wrong": [
        ("09", "how-to-detect-contaminated-water"),
        ("09", "how-to-purify-water-by-boiling"),
        ("09", "how-to-purify-water-chemically"),
        ("09", "how-to-respond-to-municipal-water-contamination"),
    ],
    "Someone is bleeding heavily": [
        ("06", "how-to-control-bleeding"),
        ("06", "how-to-recognize-and-treat-shock"),
        ("06", "how-to-clean-and-dress-wounds"),
        ("06", "how-to-close-wounds"),
        ("06", "how-to-improvise-medical-supplies"),
    ],
    "Chest pain or difficulty breathing": [
        ("05", "when-chest-pain-is-an-emergency-vs-benign"),
        ("05", "when-breathing-difficulty-is-an-emergency"),
        ("05", "how-to-recognize-signs-of-heart-attack"),
        ("06", "how-to-perform-cpr"),
        ("06", "how-to-use-an-aed"),
        ("05", "how-to-recognize-anxiety-and-panic-attacks-vs-physical-illness"),
    ],
    "No power and it's getting cold": [
        ("13", "how-to-stay-warm-without-power"),
        ("12", "how-to-build-a-fire-indoors-safely"),
        ("15", "how-to-layer-correctly"),
        ("13", "how-to-insulate-a-space-without-power"),
    ],
    "Pipes are leaking or broken": [
        ("07", "how-to-fix-leaking-faucets-and-pipes"),
        ("07", "how-to-shut-off-water"),
        ("07", "how-to-detect-and-respond-to-water-damage"),
        ("07", "how-to-temporarily-seal-leaks"),
        ("07", "how-to-prevent-frozen-pipes"),
    ],
    "Mold is growing": [
        ("07", "how-to-prevent-and-treat-mold-growth"),
        ("07", "how-to-dry-materials-after-water-damage"),
        ("01", "when-bread-and-grains-are-safe-after-mold-exposure"),
        ("01", "when-cheese-is-safe-despite-mold"),
        ("07", "how-to-maintain-indoor-air-quality"),
    ],
    "Car won't start": [
        ("08", "how-to-jump-start-a-vehicle-safely"),
        ("08", "how-to-diagnose-electrical-problems"),
        ("08", "how-to-diagnose-common-engine-problems"),
        ("08", "how-to-maintain-batteries"),
    ],
    "Someone got bitten or stung": [
        ("06", "how-to-handle-snakebites"),
        ("06", "how-to-handle-venomous-insect-stings"),
        ("06", "how-to-handle-animal-bites"),
        ("05", "how-to-recognize-allergic-reactions-and-anaphylaxis"),
    ],
    "Running out of medication": [
        ("05", "how-to-ration-medications-safely"),
        ("05", "how-to-handle-medication-withdrawal-safely"),
        ("05", "how-to-manage-mental-health-medications-running-out"),
        ("05", "how-to-store-medications-properly"),
    ],
    "Need to make decisions under extreme stress": [
        ("25", "how-to-make-decisions-under-stress"),
        ("25", "how-to-recognize-and-interrupt-panic"),
        ("25", "how-to-avoid-panic-decisions-normalcy-bias-and-sunk-cost-traps"),
        ("25", "how-to-act-when-all-options-are-bad"),
        ("25", "how-to-recognize-cognitive-bias-in-yourself"),
    ],
}


def load_task_index():
    """Load the master task index."""
    with open(PROJECT_ROOT / 'tasks' / 'task-index.json', 'r') as f:
        return json.load(f)


def load_all_guides():
    """Load all guide metadata from section files."""
    guides = []
    sections_dir = PROJECT_ROOT / 'tasks' / 'sections'
    for path in sorted(sections_dir.glob('*.json')):
        with open(path, 'r') as f:
            data = json.load(f)
        for guide in data['guides']:
            guide['_section_name'] = data['section_name']
            guide['_section_id'] = data['section_id']
            guide['_folder'] = data['folder']
            guides.append(guide)
    return guides


def guide_exists(guide: dict) -> bool:
    """Check if a guide file has been written."""
    return (PROJECT_ROOT / guide['output_path']).exists()


def get_first_line_description(guide: dict) -> str:
    """Extract the 'When to use this guide' line from a written guide."""
    path = PROJECT_ROOT / guide['output_path']
    if not path.exists():
        return guide['title']

    with open(path, 'r') as f:
        for line in f:
            if 'when to use this guide' in line.lower():
                # Extract the description after the colon
                match = re.search(r':\*?\*?\s*(.+)', line)
                if match:
                    return match.group(1).strip().rstrip('*')
    return guide['title']


def build_master_index(guides: list) -> str:
    """Build guides/INDEX.md — alphabetical listing."""
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    lines = [
        "# Complete Guide Index",
        "",
        f"*{len(guides)} guides | Last updated: {today}*",
        "",
    ]

    # Count stats
    completed = sum(1 for g in guides if g['status'] == 'completed')
    lines.append(f"**Progress:** {completed}/{len(guides)} guides completed")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Sort alphabetically by title
    sorted_guides = sorted(guides, key=lambda g: g['title'].lower())

    current_letter = ''
    for guide in sorted_guides:
        first_letter = guide['title'][0].upper()
        if first_letter != current_letter:
            current_letter = first_letter
            lines.append(f"## {current_letter}")
            lines.append("")

        status_marker = "" if guide['status'] == 'completed' else " *(not yet written)*"
        if guide_exists(guide):
            lines.append(f"- [{guide['title']}]({guide['output_path'].replace('guides/', '')}){status_marker}")
        else:
            lines.append(f"- {guide['title']}{status_marker}")

    return '\n'.join(lines) + '\n'


def build_section_index(section_id: str, guides: list) -> str:
    """Build guides/<section>/README.md."""
    section_guides = [g for g in guides if g['_section_id'] == section_id]
    if not section_guides:
        return ""

    section_name = section_guides[0]['_section_name']
    completed = sum(1 for g in section_guides if g['status'] == 'completed')

    lines = [
        f"# {section_name}",
        "",
        f"**{completed}/{len(section_guides)} guides completed**",
        "",
        "---",
        "",
    ]

    # Group by tier
    for tier in [1, 2, 3]:
        tier_guides = [g for g in section_guides if g['tier'] == tier]
        if tier_guides:
            tier_label = {1: "Tier 1 (General Knowledge)", 2: "Tier 2 (Verified Facts)",
                          3: "Tier 3 (Authoritative Sources)"}[tier]
            lines.append(f"### {tier_label}")
            lines.append("")
            for guide in tier_guides:
                status = "completed" if guide['status'] == 'completed' else guide['status']
                marker = f" `[{status}]`" if status != 'completed' else ""
                if guide_exists(guide):
                    lines.append(f"- [{guide['title']}]({guide['slug']}.md){marker}")
                else:
                    lines.append(f"- {guide['title']}{marker}")
            lines.append("")

    return '\n'.join(lines) + '\n'


def build_situation_index(guides: list) -> str:
    """Build guides/SITUATIONS.md — organized by real-world scenarios."""
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    lines = [
        "# Situation Index",
        "",
        "*Find guides by what's happening to you right now.*",
        "",
        f"*Last updated: {today}*",
        "",
        "---",
        "",
    ]

    # Build a slug-to-guide lookup
    guide_lookup = {}
    for g in guides:
        guide_lookup[(g['_section_id'], g['slug'])] = g

    for situation, guide_refs in SITUATIONS.items():
        lines.append(f"## {situation}")
        lines.append("")

        for section_id, slug_prefix in guide_refs:
            # Find matching guide (slug may be truncated)
            matched = None
            for g in guides:
                if g['_section_id'] == section_id and g['slug'].startswith(slug_prefix[:40]):
                    matched = g
                    break

            if matched:
                if guide_exists(matched):
                    rel_path = matched['output_path'].replace('guides/', '')
                    lines.append(f"- [{matched['title']}]({rel_path})")
                else:
                    lines.append(f"- {matched['title']} *(not yet written)*")

        lines.append("")

    return '\n'.join(lines) + '\n'


def build_problem_index(guides: list) -> str:
    """Build guides/PROBLEMS.md — organized by symptom/problem."""
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    lines = [
        "# Problem Index",
        "",
        "*Find guides by the problem you're facing.*",
        "",
        f"*Last updated: {today}*",
        "",
        "---",
        "",
    ]

    for problem, guide_refs in PROBLEMS.items():
        lines.append(f"## {problem}")
        lines.append("")

        for section_id, slug_prefix in guide_refs:
            matched = None
            for g in guides:
                if g['_section_id'] == section_id and g['slug'].startswith(slug_prefix[:40]):
                    matched = g
                    break

            if matched:
                if guide_exists(matched):
                    rel_path = matched['output_path'].replace('guides/', '')
                    lines.append(f"- [{matched['title']}]({rel_path})")
                else:
                    lines.append(f"- {matched['title']} *(not yet written)*")

        lines.append("")

    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description='Build guide indexes')
    parser.add_argument('--section', type=str, help='Rebuild only this section index')
    args = parser.parse_args()

    guides = load_all_guides()

    if args.section:
        # Rebuild just one section
        section_guides = [g for g in guides if g['_section_id'] == args.section]
        if section_guides:
            folder = section_guides[0]['_folder']
            readme_path = PROJECT_ROOT / 'guides' / folder / 'README.md'
            content = build_section_index(args.section, guides)
            with open(readme_path, 'w') as f:
                f.write(content)
            print(f"Updated {readme_path}")
        return

    # Build all indexes
    # 1. Master index
    index_content = build_master_index(guides)
    index_path = PROJECT_ROOT / 'guides' / 'INDEX.md'
    with open(index_path, 'w') as f:
        f.write(index_content)
    print(f"Built {index_path}")

    # 2. Section indexes
    index = load_task_index()
    for section in index['sections']:
        folder = section['folder']
        readme_path = PROJECT_ROOT / 'guides' / folder / 'README.md'
        content = build_section_index(section['id'], guides)
        with open(readme_path, 'w') as f:
            f.write(content)
    print(f"Built {len(index['sections'])} section indexes")

    # 3. Situation index
    situation_content = build_situation_index(guides)
    situation_path = PROJECT_ROOT / 'guides' / 'SITUATIONS.md'
    with open(situation_path, 'w') as f:
        f.write(situation_content)
    print(f"Built {situation_path}")

    # 4. Problem index
    problem_content = build_problem_index(guides)
    problem_path = PROJECT_ROOT / 'guides' / 'PROBLEMS.md'
    with open(problem_path, 'w') as f:
        f.write(problem_content)
    print(f"Built {problem_path}")


if __name__ == '__main__':
    main()
