#!/usr/bin/env python3
"""
Parse Guides.md and extract all guide titles with section information.
Outputs a JSON structure used by generate-tasks.py to build task files.
"""

import json
import re
import sys
from pathlib import Path

# Tier assignments by section number
TIER_MAP = {
    # Tier 1: No research needed - training data is reliable
    1: 1,   # Food Safety
    2: 1,   # Cooking
    3: 1,   # Kitchen Tools
    4: 1,   # Kitchen Safety (mostly Tier 1, some overlap)
    7: 1,   # Household Operations
    8: 1,   # Vehicle Operation
    11: 1,  # Food Preservation (basic)
    15: 1,  # Clothing & Gear
    25: 1,  # Psychological Resilience
    29: 1,  # Money & Economics
    30: 1,  # Social Interaction
    31: 1,  # Information Literacy
    32: 1,  # Digital Literacy
    35: 1,  # Time & Scheduling

    # Tier 2: Research needed to verify critical facts
    9: 2,   # Water
    10: 2,  # Food Production
    12: 2,  # Fire & Combustion
    13: 2,  # Shelter
    14: 2,  # Sanitation
    16: 2,  # Natural Disaster Response
    20: 2,  # Navigation
    21: 2,  # Communication
    22: 2,  # Tools & Repairs
    23: 2,  # Power & Energy
    24: 2,  # Security
    26: 2,  # Logistics & Evacuation
    33: 2,  # Documentation & Legal
    34: 2,  # Preparedness Planning
    36: 2,  # Death & Loss

    # Tier 3: Requires authoritative sources - high risk of harm if wrong
    5: 3,   # Human Body & Health
    6: 3,   # Emergency Medical & First Aid
    17: 3,  # Infrastructure Failure
    18: 3,  # Civil Disruption
    19: 3,  # HAZMAT & NBC
    27: 3,  # Childcare & Dependents
    28: 3,  # Community Organization
}

# Override specific guides to higher tiers within otherwise lower-tier sections
TIER_OVERRIDES = {
    # Section 4 (Kitchen Safety) - fire/gas are Tier 2
    "how-to-handle-grease-fires": 2,
    "how-to-use-a-fire-extinguisher-in-a-kitchen": 2,
    "how-to-shut-off-gas-safely": 2,
    "how-to-detect-gas-leaks": 2,
    # Section 11 (Food Preservation) - canning safety is Tier 2
    "how-to-can-food-safely-water-bath-vs-pressure-canning-acidity-rules": 2,
    "how-to-smoke-food-for-preservation-cold-smoke-vs-hot-smoke": 2,
    "how-to-salt-and-cure-food-dry-cure-brine-nitrates": 2,
}


def slugify(title: str) -> str:
    """Convert a guide title to a URL-safe slug."""
    slug = title.lower()
    # Remove parenthetical content for cleaner slugs but keep key info
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug.strip())
    slug = re.sub(r'-+', '-', slug)
    # Truncate very long slugs
    if len(slug) > 80:
        slug = slug[:80].rstrip('-')
    return slug


def section_slug(section_name: str) -> str:
    """Convert a section name to a folder-friendly slug."""
    # Remove the number prefix and clean up
    name = re.sub(r'^\d+\.\s*', '', section_name)
    name = re.sub(r'[^\w\s-]', '', name.lower())
    name = re.sub(r'\s+', '-', name.strip())
    name = re.sub(r'-+', '-', name)
    return name


def parse_guides(guides_path: str) -> dict:
    """Parse Guides.md and return structured data."""
    with open(guides_path, 'r') as f:
        content = f.read()

    sections = []
    current_section = None
    section_num = 0
    total_guides = 0

    for line in content.split('\n'):
        line = line.strip()

        # Stop at Appendix
        if line.startswith('## Appendix'):
            break

        # Match section headers: ## 1. FOOD: SAFETY, SPOILAGE & JUDGMENT
        section_match = re.match(r'^##\s+(\d+)\.\s+(.+)$', line)
        if section_match:
            if current_section:
                sections.append(current_section)
            section_num = int(section_match.group(1))
            section_name = section_match.group(2).strip()

            current_section = {
                'id': f'{section_num:02d}',
                'name': section_name,
                'folder': f'{section_num:02d}-{section_slug(section_name)}',
                'total': 0,
                'completed': 0,
                'guides': [],
                'guide_objects': []
            }
            continue

        # Match guide entries: - How to ... or - When ...
        guide_match = re.match(r'^-\s+(.+)$', line)
        if guide_match and current_section:
            title = guide_match.group(1).strip()
            # Skip subsection headers (### lines) and non-guide entries
            if title.startswith('#'):
                continue

            total_guides += 1
            guide_num = len(current_section['guide_objects']) + 1
            slug = slugify(title)
            guide_id = f'{current_section["id"]}-{guide_num:03d}'

            # Determine tier
            tier = TIER_OVERRIDES.get(slug, TIER_MAP.get(section_num, 2))

            guide_obj = {
                'id': guide_id,
                'title': title,
                'slug': slug,
                'status': 'not_started',
                'tier': tier,
                'output_path': f'guides/{current_section["folder"]}/{slug}.md',
                'created_at': None,
                'verified_at': None,
                'flagged': False,
                'flag_reason': None,
                'verification_notes': None,
                'cross_references': []
            }

            current_section['guide_objects'].append(guide_obj)
            current_section['guides'].append(slug)
            current_section['total'] += 1

    # Don't forget the last section
    if current_section:
        sections.append(current_section)

    return {
        'total_guides': total_guides,
        'completed': 0,
        'in_progress': 0,
        'flagged': 0,
        'not_started': total_guides,
        'sections': sections
    }


def main():
    project_root = Path(__file__).parent.parent
    guides_path = project_root.parent / 'Guides.md'

    if not guides_path.exists():
        print(f"Error: Guides.md not found at {guides_path}", file=sys.stderr)
        sys.exit(1)

    data = parse_guides(str(guides_path))

    # Output the parsed data
    output_path = project_root / 'tasks' / 'parsed-guides.json'
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"Parsed {data['total_guides']} guides across {len(data['sections'])} sections")
    for section in data['sections']:
        tier_counts = {}
        for g in section['guide_objects']:
            tier_counts[g['tier']] = tier_counts.get(g['tier'], 0) + 1
        tier_str = ', '.join(f'T{k}:{v}' for k, v in sorted(tier_counts.items()))
        print(f"  [{section['id']}] {section['name']}: {section['total']} guides ({tier_str})")

    print(f"\nOutput: {output_path}")


if __name__ == '__main__':
    main()
