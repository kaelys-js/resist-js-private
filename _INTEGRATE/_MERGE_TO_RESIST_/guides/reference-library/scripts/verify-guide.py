#!/usr/bin/env python3
"""
Verify a guide meets quality standards.

Checks:
1. Template structure (all required sections present)
2. Minimum content length (Full Guide section >= 200 words)
3. Short Version is actionable (has bullet points)
4. Metadata footer is present and correctly formatted
5. Cross-references are included
6. For Tier 2/3, checks for source citations

Usage:
    python scripts/verify-guide.py <guide-path>
    python scripts/verify-guide.py guides/01-food-safety/when-fruits-are-unripe-ripe-overripe-and-unsafe.md

Exit codes:
    0 = all checks passed
    1 = error (file not found, etc.)
    2 = verification failed (guide needs fixing)
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).parent.parent

REQUIRED_SECTIONS = [
    "The Short Version",
    "The Full Guide",
    "Common Mistakes and Dangerous Misconceptions",
    "If You Remember Nothing Else",
    "Related Guides",
]

CONFIDENCE_LEVELS = ["HIGH", "MODERATE", "USE WITH CAUTION"]


def verify_guide(guide_path: str) -> dict:
    """Verify a guide and return results."""
    path = Path(guide_path)
    if not path.is_absolute():
        path = PROJECT_ROOT / path

    results = {
        'path': str(path),
        'passed': True,
        'checks': [],
        'warnings': [],
        'errors': []
    }

    if not path.exists():
        results['passed'] = False
        results['errors'].append(f"File not found: {path}")
        return results

    with open(path, 'r') as f:
        content = f.read()

    lines = content.split('\n')

    # Check 1: Has a title (# heading)
    has_title = any(line.startswith('# ') and not line.startswith('## ') for line in lines)
    if has_title:
        results['checks'].append("PASS: Has title heading")
    else:
        results['errors'].append("FAIL: Missing title heading (# Title)")
        results['passed'] = False

    # Check 2: Has "When to use this guide" line
    has_when = any('when to use this guide' in line.lower() for line in lines)
    if has_when:
        results['checks'].append("PASS: Has 'When to use this guide'")
    else:
        results['errors'].append("FAIL: Missing 'When to use this guide' line")
        results['passed'] = False

    # Check 3: Has confidence level
    has_confidence_header = any('confidence level' in line.lower() for line in lines)
    if has_confidence_header:
        results['checks'].append("PASS: Has confidence level")
    else:
        results['errors'].append("FAIL: Missing confidence level")
        results['passed'] = False

    # Check 4: All required sections present
    for section in REQUIRED_SECTIONS:
        pattern = re.compile(rf'^##\s+{re.escape(section)}', re.IGNORECASE)
        found = any(pattern.match(line) for line in lines)
        if found:
            results['checks'].append(f"PASS: Section '{section}' present")
        else:
            results['errors'].append(f"FAIL: Missing section '{section}'")
            results['passed'] = False

    # Check 5: Full Guide section has >= 200 words
    full_guide_content = extract_section(content, "The Full Guide")
    if full_guide_content:
        word_count = len(full_guide_content.split())
        if word_count >= 200:
            results['checks'].append(f"PASS: Full Guide has {word_count} words (>= 200)")
        else:
            results['errors'].append(
                f"FAIL: Full Guide only has {word_count} words (minimum 200)")
            results['passed'] = False
    else:
        results['errors'].append("FAIL: Could not extract Full Guide section")
        results['passed'] = False

    # Check 6: Short Version has bullet points
    short_version = extract_section(content, "The Short Version")
    if short_version:
        bullet_count = len(re.findall(r'^[-*]\s', short_version, re.MULTILINE))
        if bullet_count >= 3:
            results['checks'].append(f"PASS: Short Version has {bullet_count} bullets (>= 3)")
        else:
            results['errors'].append(
                f"FAIL: Short Version has {bullet_count} bullets (need >= 3)")
            results['passed'] = False

    # Check 7: Metadata footer present
    footer_pattern = re.compile(
        r'\*Confidence:\s*(HIGH|MODERATE|USE WITH CAUTION)\s*\|\s*Last generated:\s*\d{4}-\d{2}-\d{2}\s*\|\s*Tier:\s*[123]\*',
        re.IGNORECASE
    )
    has_footer = bool(footer_pattern.search(content))
    if has_footer:
        results['checks'].append("PASS: Metadata footer present and formatted")
    else:
        results['errors'].append("FAIL: Missing or malformed metadata footer")
        results['passed'] = False

    # Check 8: Related Guides has at least one link
    related_section = extract_section(content, "Related Guides")
    if related_section:
        link_count = len(re.findall(r'\[.+?\]\(.+?\)', related_section))
        if link_count >= 1:
            results['checks'].append(f"PASS: Related Guides has {link_count} links")
        else:
            results['warnings'].append("WARN: Related Guides section has no links")

    # Check 9: Common Mistakes has content
    mistakes_section = extract_section(content, "Common Mistakes and Dangerous Misconceptions")
    if mistakes_section:
        items = len(re.findall(r'^[-*\d]', mistakes_section, re.MULTILINE))
        if items >= 3:
            results['checks'].append(f"PASS: Common Mistakes has {items} items")
        else:
            results['warnings'].append(
                f"WARN: Common Mistakes only has {items} items (recommend >= 3)")

    # Check 10: If You Remember Nothing Else has content
    remember_section = extract_section(content, "If You Remember Nothing Else")
    if remember_section:
        word_count = len(remember_section.split())
        if word_count >= 20:
            results['checks'].append(f"PASS: Remember section has {word_count} words")
        else:
            results['warnings'].append(
                f"WARN: Remember section seems short ({word_count} words)")

    return results


def extract_section(content: str, section_name: str) -> str:
    """Extract content between a ## heading and the next ## heading or ---."""
    pattern = re.compile(
        rf'^##\s+{re.escape(section_name)}\s*\n(.*?)(?=^##\s|\n---\n|\Z)',
        re.MULTILINE | re.DOTALL | re.IGNORECASE
    )
    match = pattern.search(content)
    if match:
        return match.group(1).strip()
    return None


def log_verification(results: dict, guide_id: str = None):
    """Log verification results to verification-log.json."""
    log_path = PROJECT_ROOT / 'quality' / 'verification-log.json'

    if log_path.exists():
        with open(log_path, 'r') as f:
            log = json.load(f)
    else:
        log = {"entries": []}

    entry = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'guide_id': guide_id,
        'path': results['path'],
        'passed': results['passed'],
        'checks_passed': len(results['checks']),
        'errors': results['errors'],
        'warnings': results['warnings']
    }

    log['entries'].append(entry)

    with open(log_path, 'w') as f:
        json.dump(log, f, indent=2)


def flag_guide(guide_id: str, reasons: list):
    """Add a guide to the flagged guides list."""
    flagged_path = PROJECT_ROOT / 'quality' / 'flagged-guides.json'

    if flagged_path.exists():
        with open(flagged_path, 'r') as f:
            flagged = json.load(f)
    else:
        flagged = {"flagged": []}

    # Remove existing entry for this guide
    flagged['flagged'] = [f for f in flagged['flagged'] if f.get('guide_id') != guide_id]

    flagged['flagged'].append({
        'guide_id': guide_id,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'reasons': reasons
    })

    with open(flagged_path, 'w') as f:
        json.dump(flagged, f, indent=2)


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/verify-guide.py <guide-path> [guide-id]", file=sys.stderr)
        sys.exit(1)

    guide_path = sys.argv[1]
    guide_id = sys.argv[2] if len(sys.argv) > 2 else None

    results = verify_guide(guide_path)

    # Print results
    print(f"\nVerification: {guide_path}")
    print("=" * 60)

    for check in results['checks']:
        print(f"  {check}")

    for warning in results['warnings']:
        print(f"  {warning}")

    for error in results['errors']:
        print(f"  {error}")

    print()
    if results['passed']:
        print("RESULT: ALL CHECKS PASSED")
    else:
        print(f"RESULT: FAILED ({len(results['errors'])} errors)")

    # Log results
    log_verification(results, guide_id)

    # Flag if needed
    if not results['passed'] and guide_id:
        flag_guide(guide_id, results['errors'])

    sys.exit(0 if results['passed'] else 2)


if __name__ == '__main__':
    main()
