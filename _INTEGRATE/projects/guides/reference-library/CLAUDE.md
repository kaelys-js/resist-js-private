# Offline Reference Library — Project Instructions

## What This Project Is
A complete offline reference library of ~550 practical guides covering everyday life skills through collapse scenarios. Every guide must be accurate enough to depend on when there's no internet to verify.

## Critical Rules

1. **Never write a guide without reading the template first.** The template is at `templates/guide-template.md`. Every guide follows it exactly.

2. **Respect the tier system.**
   - Tier 1: Write from knowledge. These are topics where training data is reliable.
   - Tier 2: Verify critical facts with web search. Log sources.
   - Tier 3: Build from authoritative sources. These guides can get people hurt or killed if wrong. Use government agencies, medical references, established trade publications. Log everything.

3. **Always update task tracking.** After writing any guide, update the relevant section task file in `tasks/sections/` and the master `tasks/task-index.json`. Use `python scripts/update-task.py <guide-id> <status>` to do this.

4. **Flag uncertainty.** If you're not confident about a claim, flag it. Add the guide to `quality/flagged-guides.json` with a clear reason. A flagged guide with honest uncertainty notes is better than a confidently wrong guide.

5. **Cross-reference generously.** Every guide should link to 2-5 related guides. Use relative paths. If a related guide doesn't exist yet, still add the reference — it'll be valid once that guide is written.

6. **No filler.** No "consult a professional" as a substitute for actual content. No vague advice. No padding. Every sentence must be there for a reason.

7. **Specific over general.** Use actual numbers: temperatures in both F and C, times in minutes/hours, distances in both metric and imperial, weights in both systems. "Cook until done" is useless. "Cook until internal temperature reaches 165F / 74C" is useful.

## Project Structure

```
reference-library/
├── .claude/
│   ├── settings.json          # hooks config
│   └── hooks/
│       └── post-write-guide.sh
├── CLAUDE.md                  # this file
├── tasks/
│   ├── task-index.json        # master task tracking
│   ├── parsed-guides.json     # raw parsed data
│   └── sections/
│       ├── 01-food-safety-spoilage-judgment.json
│       └── ...                # one per section
├── templates/
│   └── guide-template.md      # template every guide follows
├── guides/                    # output directory
│   ├── INDEX.md               # alphabetical master index
│   ├── SITUATIONS.md          # scenario-based index
│   ├── PROBLEMS.md            # problem-based index
│   ├── 01-food-safety-spoilage-judgment/
│   │   ├── README.md          # section index
│   │   └── *.md               # individual guides
│   └── ...
├── scripts/
│   ├── parse-guides.py        # extract titles from Guides.md
│   ├── generate-tasks.py      # create task JSON files
│   ├── write-guide.py         # orchestration harness
│   ├── verify-guide.py        # quality verification
│   ├── update-task.py         # update task status
│   └── build-index.py         # generate indexes
└── quality/
    ├── verification-log.json  # all verification results
    └── flagged-guides.json    # guides needing review
```

## Workflow

### To write the next guide:
1. Check `tasks/task-index.json` for the next `not_started` guide, or use:
   ```
   python scripts/write-guide.py --next
   ```
2. Read the template at `templates/guide-template.md`
3. Read the section task file to understand context and related guides
4. Write the guide following the template exactly
5. Save to the correct path in `guides/[section]/[slug].md`
6. Run verification: `python scripts/verify-guide.py [guide-path] [guide-id]`
7. Update task status: `python scripts/update-task.py [guide-id] completed`

### To write a batch:
- Work through one section at a time
- Do all Tier 1 guides in a section first, then Tier 2, then Tier 3
- After completing a section, run `python scripts/build-index.py --section [id]`
- After completing multiple sections, run `python scripts/build-index.py` to rebuild all indexes

### To check progress:
```
python scripts/write-guide.py --batch 10                # next 10 guides
python scripts/write-guide.py --batch 10 --section 01   # next 10 in section 01
```

### To flag a guide:
```
python scripts/update-task.py [guide-id] flagged --flag-reason "reason here"
python scripts/update-task.py [guide-id] needs_human_review --flag-reason "topic beyond reliable scope"
```

## Quality Bar

A good guide:
- Can be understood by someone with no prior knowledge of the topic
- Contains enough detail to actually DO the thing, not just understand it conceptually
- Has specific, verifiable numbers where the topic demands them
- Acknowledges limitations and edge cases
- Stands alone — doesn't require reading other guides to be useful (though it links to them for depth)
- Is honest about confidence level
- Has a "Short Version" that someone in a crisis could act on immediately

A bad guide:
- Is vague where specificity matters
- Uses "it depends" without then explaining what it depends ON
- Omits critical safety information
- Confidently states something that might be wrong
- Is padded with obvious statements to seem comprehensive
- Says "consult a professional" instead of giving actionable information

## Hooks

The project has two hooks configured in `.claude/settings.json`:

1. **PostToolUse (Write)**: After any file is written to `guides/`, validates template structure, minimum length, and metadata footer. Exits with code 2 if validation fails.

2. **Stop (prompt)**: Before stopping, verifies task tracking and verification logs were updated.
