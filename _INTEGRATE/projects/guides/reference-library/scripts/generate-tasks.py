#!/usr/bin/env python3
"""
Generate task tracking JSON files from parsed guide data.
Creates:
  - tasks/task-index.json (master tracking)
  - tasks/sections/XX-section-name.json (per-section tracking)
  - guides/XX-section-name/ directories
"""

import json
import sys
from pathlib import Path


def main():
    project_root = Path(__file__).parent.parent
    parsed_path = project_root / 'tasks' / 'parsed-guides.json'

    if not parsed_path.exists():
        print("Error: Run parse-guides.py first to generate parsed-guides.json", file=sys.stderr)
        sys.exit(1)

    with open(parsed_path, 'r') as f:
        data = json.load(f)

    # Create task-index.json (master tracking — without guide_objects detail)
    task_index = {
        'total_guides': data['total_guides'],
        'completed': data['completed'],
        'in_progress': data['in_progress'],
        'flagged': data['flagged'],
        'not_started': data['not_started'],
        'sections': []
    }

    sections_dir = project_root / 'tasks' / 'sections'
    sections_dir.mkdir(parents=True, exist_ok=True)

    for section in data['sections']:
        # Add summary to master index
        task_index['sections'].append({
            'id': section['id'],
            'name': section['name'],
            'folder': section['folder'],
            'total': section['total'],
            'completed': section['completed'],
            'guides': section['guides']
        })

        # Create per-section task file
        section_file = {
            'section_id': section['id'],
            'section_name': section['name'],
            'folder': section['folder'],
            'guides': section['guide_objects']
        }

        section_filename = f"{section['folder']}.json"
        section_path = sections_dir / section_filename
        with open(section_path, 'w') as f:
            json.dump(section_file, f, indent=2)

        # Create output directory for guides
        guide_dir = project_root / 'guides' / section['folder']
        guide_dir.mkdir(parents=True, exist_ok=True)

    # Write master index
    index_path = project_root / 'tasks' / 'task-index.json'
    with open(index_path, 'w') as f:
        json.dump(task_index, f, indent=2)

    print(f"Created task-index.json with {data['total_guides']} guides")
    print(f"Created {len(data['sections'])} section task files in tasks/sections/")
    print(f"Created {len(data['sections'])} guide output directories in guides/")

    # Initialize quality tracking files
    quality_dir = project_root / 'quality'
    quality_dir.mkdir(parents=True, exist_ok=True)

    verification_log = quality_dir / 'verification-log.json'
    if not verification_log.exists():
        with open(verification_log, 'w') as f:
            json.dump({"entries": []}, f, indent=2)

    flagged_guides = quality_dir / 'flagged-guides.json'
    if not flagged_guides.exists():
        with open(flagged_guides, 'w') as f:
            json.dump({"flagged": []}, f, indent=2)

    print("Initialized quality tracking files")


if __name__ == '__main__':
    main()
