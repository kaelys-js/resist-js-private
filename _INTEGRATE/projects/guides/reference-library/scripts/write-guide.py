#!/usr/bin/env python3
"""
Guide writing orchestration harness.

This script is designed to be run by Claude Code (claude -p) or as a subagent.
It reads task data, constructs the writing prompt with template and tier-appropriate
instructions, and outputs the prompt for Claude to execute.

Usage:
    python scripts/write-guide.py <guide-id>           # Write a specific guide
    python scripts/write-guide.py --next                # Write next unstarted guide
    python scripts/write-guide.py --next --section 01   # Next in a specific section
    python scripts/write-guide.py --batch <N>           # Show next N guides to write
    python scripts/write-guide.py --batch <N> --section 01  # Next N in a section

The script:
1. Reads the task file to get guide metadata
2. Reads the template
3. Constructs a detailed writing prompt based on the guide's tier
4. Outputs the prompt (for piping to claude -p) or prints instructions
5. After writing, calls verify-guide.py and update-task.py
"""

import argparse
import json
import sys
import subprocess
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).parent.parent


def load_task_index():
    """Load the master task index."""
    index_path = PROJECT_ROOT / 'tasks' / 'task-index.json'
    with open(index_path, 'r') as f:
        return json.load(f)


def load_section(section_id: str):
    """Load a section task file by section ID."""
    sections_dir = PROJECT_ROOT / 'tasks' / 'sections'
    for path in sections_dir.glob('*.json'):
        with open(path, 'r') as f:
            data = json.load(f)
        if data['section_id'] == section_id:
            return data, path
    return None, None


def find_guide(guide_id: str):
    """Find a guide by its ID across all sections."""
    section_id = guide_id[:2]
    section_data, section_path = load_section(section_id)
    if not section_data:
        return None, None, None
    for guide in section_data['guides']:
        if guide['id'] == guide_id:
            return guide, section_data, section_path
    return None, None, None


def find_next_guide(section_id: str = None):
    """Find the next not_started guide, optionally within a section."""
    index = load_task_index()

    for section in index['sections']:
        if section_id and section['id'] != section_id:
            continue

        section_data, section_path = load_section(section['id'])
        if not section_data:
            continue

        # Prioritize by tier (Tier 1 first, then 2, then 3)
        for tier in [1, 2, 3]:
            for guide in section_data['guides']:
                if guide['status'] == 'not_started' and guide['tier'] == tier:
                    return guide, section_data, section_path

    return None, None, None


def find_next_batch(n: int, section_id: str = None):
    """Find the next N not_started guides."""
    index = load_task_index()
    batch = []

    for section in index['sections']:
        if section_id and section['id'] != section_id:
            continue

        section_data, _ = load_section(section['id'])
        if not section_data:
            continue

        for tier in [1, 2, 3]:
            for guide in section_data['guides']:
                if guide['status'] == 'not_started' and guide['tier'] == tier:
                    batch.append((guide, section_data))
                    if len(batch) >= n:
                        return batch

    return batch


def load_template():
    """Load the guide template."""
    template_path = PROJECT_ROOT / 'templates' / 'guide-template.md'
    with open(template_path, 'r') as f:
        return f.read()


def get_related_guides(section_data: dict, current_slug: str, limit: int = 5):
    """Get related guide titles from the same section."""
    related = []
    for guide in section_data['guides']:
        if guide['slug'] != current_slug:
            related.append({
                'title': guide['title'],
                'slug': guide['slug'],
                'path': guide['output_path']
            })
    return related[:limit]


def build_prompt(guide: dict, section_data: dict, template: str) -> str:
    """Build the writing prompt based on guide tier and metadata."""
    related = get_related_guides(section_data, guide['slug'])
    related_str = '\n'.join(
        f"  - {r['title']} ({r['path']})" for r in related
    )

    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    tier_instructions = {
        1: """TIER 1 INSTRUCTIONS:
This topic is well within reliable training knowledge. Write directly from what you know.
No web search is needed. Focus on being specific, practical, and actionable.
Confidence level should be HIGH unless you have genuine uncertainty about specific claims.""",

        2: """TIER 2 INSTRUCTIONS:
This topic requires verification of critical facts. Before writing:
1. Use web search to verify key numbers: temperatures, dosages, times, distances, safety thresholds.
2. Cross-check any safety-critical claims.
3. Log your search queries and sources in the verification notes.
4. If you can't verify a critical fact, flag it explicitly in the guide.
Confidence level should be MODERATE unless all critical facts are well-verified.""",

        3: """TIER 3 INSTRUCTIONS:
This topic can cause serious harm if the guide is wrong. Build from authoritative sources:
1. Search for authoritative sources FIRST: government health agencies (CDC, WHO, FEMA),
   medical references, military field manuals, established trade publications.
2. Build the guide FROM these sources, not from memory.
3. Log ALL sources with URLs in the verification notes.
4. If authoritative sources conflict, note the disagreement.
5. If you cannot find authoritative backing for a claim, flag it.
6. If the topic is genuinely beyond what you can write reliably, flag the entire guide
   as needs_human_review instead of writing unreliable content.
Confidence level should be USE WITH CAUTION unless you have strong authoritative backing."""
    }

    prompt = f"""You are writing a guide for an offline reference library. This guide must be accurate
enough to depend on when there's no internet to verify.

GUIDE DETAILS:
- Title: {guide['title']}
- ID: {guide['id']}
- Section: {section_data['section_name']}
- Tier: {guide['tier']}
- Output path: {guide['output_path']}

{tier_instructions[guide['tier']]}

TEMPLATE (follow this structure EXACTLY):
---
{template}
---

RELATED GUIDES IN THIS SECTION (use for cross-references):
{related_str}

WRITING RULES:
1. Follow the template structure exactly. Every section must be present.
2. Use specific numbers: temperatures in both F and C, times, weights in both systems.
3. No vague advice. No "consult a professional" as a substitute for content.
4. The "Short Version" must stand alone as actionable.
5. "Common Mistakes" should be SPECIFIC mistakes, not generic warnings.
6. "If You Remember Nothing Else" is ONE paragraph with the single most important takeaway.
7. Related Guides should link to 2-5 guides from the related list above using relative paths.
8. The metadata footer must read:
   *Confidence: [level] | Last generated: {today} | Tier: {guide['tier']}*

Write the complete guide now. Output ONLY the guide content (markdown), nothing else."""

    return prompt


def construct_claude_command(prompt: str, output_path: str) -> str:
    """Construct a claude -p command for writing the guide."""
    # Escape the prompt for shell
    escaped = prompt.replace("'", "'\\''")
    return f"claude -p '{escaped}' > '{output_path}'"


def main():
    parser = argparse.ArgumentParser(description='Guide writing orchestration')
    parser.add_argument('guide_id', nargs='?', help='Specific guide ID to write (e.g., 01-001)')
    parser.add_argument('--next', action='store_true', help='Write the next unstarted guide')
    parser.add_argument('--section', type=str, help='Limit to a specific section (e.g., 01)')
    parser.add_argument('--batch', type=int, help='Show next N guides to write')
    parser.add_argument('--prompt-only', action='store_true',
                        help='Only output the prompt, do not write or verify')
    parser.add_argument('--execute', action='store_true',
                        help='Actually write the guide (calls claude and post-processing)')

    args = parser.parse_args()

    if args.batch:
        batch = find_next_batch(args.batch, args.section)
        if not batch:
            print("No unstarted guides found.")
            sys.exit(0)

        print(f"Next {len(batch)} guides to write:\n")
        for guide, section in batch:
            print(f"  [{guide['id']}] T{guide['tier']} | {guide['title']}")
            print(f"         Section: {section['section_name']}")
            print(f"         Path: {guide['output_path']}")
            print()
        sys.exit(0)

    # Find the guide to write
    if args.guide_id:
        guide, section_data, section_path = find_guide(args.guide_id)
        if not guide:
            print(f"Error: Guide {args.guide_id} not found", file=sys.stderr)
            sys.exit(1)
    elif args.next:
        guide, section_data, section_path = find_next_guide(args.section)
        if not guide:
            print("No unstarted guides found.", file=sys.stderr)
            sys.exit(0)
    else:
        parser.print_help()
        sys.exit(1)

    print(f"Guide: [{guide['id']}] {guide['title']}", file=sys.stderr)
    print(f"Section: {section_data['section_name']}", file=sys.stderr)
    print(f"Tier: {guide['tier']}", file=sys.stderr)
    print(f"Output: {guide['output_path']}", file=sys.stderr)

    template = load_template()
    prompt = build_prompt(guide, section_data, template)

    if args.prompt_only:
        print(prompt)
        sys.exit(0)

    if args.execute:
        # Mark as in_progress
        guide['status'] = 'in_progress'
        with open(section_path, 'w') as f:
            json.dump({'section_id': section_data['section_id'],
                       'section_name': section_data['section_name'],
                       'folder': section_data['folder'],
                       'guides': section_data['guides']}, f, indent=2)

        # Ensure output directory exists
        output_path = PROJECT_ROOT / guide['output_path']
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Write the prompt to a temp file for claude to read
        prompt_file = PROJECT_ROOT / '.claude' / 'current-prompt.txt'
        prompt_file.parent.mkdir(parents=True, exist_ok=True)
        with open(prompt_file, 'w') as f:
            f.write(prompt)

        print(f"\nPrompt written to {prompt_file}", file=sys.stderr)
        print(f"Run: claude -p \"$(cat {prompt_file})\" > {output_path}", file=sys.stderr)

        # If claude CLI is available, execute
        try:
            result = subprocess.run(
                ['claude', '-p', prompt],
                capture_output=True, text=True, timeout=300
            )
            if result.returncode == 0:
                with open(output_path, 'w') as f:
                    f.write(result.stdout)
                print(f"\nGuide written to {output_path}", file=sys.stderr)

                # Run verification
                verify_result = subprocess.run(
                    ['python3', str(PROJECT_ROOT / 'scripts' / 'verify-guide.py'),
                     str(output_path)],
                    capture_output=True, text=True
                )
                print(verify_result.stdout, file=sys.stderr)

                # Update task status
                status = 'completed' if verify_result.returncode == 0 else 'flagged'
                subprocess.run(
                    ['python3', str(PROJECT_ROOT / 'scripts' / 'update-task.py'),
                     guide['id'], status],
                    capture_output=True, text=True
                )
            else:
                print(f"Error from claude: {result.stderr}", file=sys.stderr)
                sys.exit(1)
        except FileNotFoundError:
            print("\nclaude CLI not found. Run manually:", file=sys.stderr)
            print(f"  claude -p \"$(cat {prompt_file})\" > {output_path}", file=sys.stderr)
        except subprocess.TimeoutExpired:
            print("\nTimeout waiting for claude response", file=sys.stderr)
            sys.exit(1)
    else:
        # Default: output the prompt for manual use
        print(f"\n--- PROMPT ---\n", file=sys.stderr)
        print(prompt)
        print(f"\n--- END PROMPT ---", file=sys.stderr)
        print(f"\nTo write this guide, either:", file=sys.stderr)
        print(f"  1. Run: python scripts/write-guide.py {guide['id']} --execute", file=sys.stderr)
        print(f"  2. Pipe: python scripts/write-guide.py {guide['id']} --prompt-only | claude -p > {guide['output_path']}", file=sys.stderr)


if __name__ == '__main__':
    main()
