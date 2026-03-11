#!/usr/bin/env python3
"""
Update task status in tracking files.

Usage:
    python scripts/update-task.py <guide-id> <status> [--flag-reason "reason"]

Status values: not_started, in_progress, completed, flagged, needs_human_review

Examples:
    python scripts/update-task.py 01-001 completed
    python scripts/update-task.py 05-003 flagged --flag-reason "Could not verify dosage claims"
    python scripts/update-task.py 06-012 needs_human_review --flag-reason "Topic beyond reliable scope"
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).parent.parent
VALID_STATUSES = ['not_started', 'in_progress', 'completed', 'flagged', 'needs_human_review']


def update_guide_status(guide_id: str, status: str, flag_reason: str = None,
                        verification_notes: str = None):
    """Update a guide's status in its section file and the master index."""
    section_id = guide_id[:2]

    # Find and update section file
    sections_dir = PROJECT_ROOT / 'tasks' / 'sections'
    section_file = None
    section_data = None

    for path in sections_dir.glob('*.json'):
        with open(path, 'r') as f:
            data = json.load(f)
        if data['section_id'] == section_id:
            section_file = path
            section_data = data
            break

    if not section_data:
        print(f"Error: Section {section_id} not found", file=sys.stderr)
        sys.exit(1)

    # Find the guide
    guide = None
    for g in section_data['guides']:
        if g['id'] == guide_id:
            guide = g
            break

    if not guide:
        print(f"Error: Guide {guide_id} not found in section {section_id}", file=sys.stderr)
        sys.exit(1)

    now = datetime.now(timezone.utc).isoformat()
    old_status = guide['status']

    # Update guide fields
    guide['status'] = status

    if status == 'completed':
        guide['verified_at'] = now
        guide['created_at'] = guide.get('created_at') or now
    elif status == 'in_progress':
        guide['created_at'] = now
    elif status in ('flagged', 'needs_human_review'):
        guide['flagged'] = True
        guide['flag_reason'] = flag_reason

    if verification_notes:
        guide['verification_notes'] = verification_notes

    # Write updated section file
    with open(section_file, 'w') as f:
        json.dump(section_data, f, indent=2)

    # Update master index counts
    update_master_index(section_id, section_data)

    print(f"Updated [{guide_id}] {guide['title']}")
    print(f"  Status: {old_status} -> {status}")
    if flag_reason:
        print(f"  Flag reason: {flag_reason}")


def update_master_index(section_id: str, section_data: dict):
    """Recalculate and update the master task-index.json."""
    index_path = PROJECT_ROOT / 'tasks' / 'task-index.json'

    with open(index_path, 'r') as f:
        index = json.load(f)

    # Update section counts
    for section in index['sections']:
        if section['id'] == section_id:
            section['completed'] = sum(
                1 for g in section_data['guides'] if g['status'] == 'completed'
            )
            break

    # Recalculate totals from all section files
    total_completed = 0
    total_in_progress = 0
    total_flagged = 0
    total_not_started = 0

    sections_dir = PROJECT_ROOT / 'tasks' / 'sections'
    for path in sections_dir.glob('*.json'):
        with open(path, 'r') as f:
            data = json.load(f)
        for g in data['guides']:
            if g['status'] == 'completed':
                total_completed += 1
            elif g['status'] == 'in_progress':
                total_in_progress += 1
            elif g['status'] in ('flagged', 'needs_human_review'):
                total_flagged += 1
            else:
                total_not_started += 1

    index['completed'] = total_completed
    index['in_progress'] = total_in_progress
    index['flagged'] = total_flagged
    index['not_started'] = total_not_started

    with open(index_path, 'w') as f:
        json.dump(index, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description='Update guide task status')
    parser.add_argument('guide_id', help='Guide ID (e.g., 01-001)')
    parser.add_argument('status', choices=VALID_STATUSES, help='New status')
    parser.add_argument('--flag-reason', type=str, help='Reason for flagging')
    parser.add_argument('--notes', type=str, help='Verification notes')

    args = parser.parse_args()

    if args.status in ('flagged', 'needs_human_review') and not args.flag_reason:
        print("Error: --flag-reason required for flagged/needs_human_review status",
              file=sys.stderr)
        sys.exit(1)

    update_guide_status(args.guide_id, args.status, args.flag_reason, args.notes)


if __name__ == '__main__':
    main()
