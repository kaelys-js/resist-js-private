# Claude Code Prompt: Offline Reference Library — Build Pipeline

Copy everything below the line and paste it into Claude Code as your initial prompt.

---

## Context

I have a master list of ~550 offline reference guides in `Guides.md` (I'll provide the file). Each guide title represents a single, standalone, practical reference document that needs to be written. The end product is a complete offline reference library — a human operating manual covering everyday life, household skills, emergency response, and societal collapse scenarios.

## What I Need You To Build

I need you to set up a **complete, repeatable pipeline** for generating these guides to a consistent, high-quality standard. This means building infrastructure first, then using it. Here's exactly what to create:

---

### Phase 1: Project Structure & Task Tracking

1. **Parse `Guides.md`** and extract every guide title. Each guide belongs to a numbered section.

2. **Create the folder structure:**
```
reference-library/
├── .claude/
│   ├── settings.json          # hooks config
│   └── hooks/
│       ├── pre-write-guide.sh
│       └── post-write-guide.sh
├── CLAUDE.md                  # project memory/instructions
├── Guides.md                  # master list (source of truth)
├── tasks/
│   ├── task-index.json        # master task tracking file
│   └── sections/
│       ├── 01-food-safety.json
│       ├── 02-cooking.json
│       └── ...                # one task file per section
├── templates/
│   └── guide-template.md      # the template every guide follows
├── guides/                    # output directory
│   ├── 01-food-safety/
│   │   ├── when-fruits-are-unripe-ripe-overripe-and-unsafe.md
│   │   └── ...
│   ├── 02-cooking/
│   │   └── ...
│   └── ...
├── scripts/
│   ├── parse-guides.py        # extracts guide titles from Guides.md
│   ├── generate-tasks.py      # creates task JSON files from parsed titles
│   ├── write-guide.py         # the main guide generation script
│   ├── verify-guide.py        # fact-checking and quality verification
│   ├── update-task.py         # updates task status in tracking files
│   └── build-index.py         # generates searchable index and cross-references
└── quality/
    ├── verification-log.json  # log of all verification checks
    └── flagged-guides.json    # guides that need human review
```

3. **Create `task-index.json`** — the master tracking file:
```json
{
  "total_guides": 550,
  "completed": 0,
  "in_progress": 0,
  "flagged": 0,
  "not_started": 550,
  "sections": [
    {
      "id": "01",
      "name": "Food: Safety, Spoilage & Judgment",
      "total": 24,
      "completed": 0,
      "guides": ["when-fruits-are-unripe-ripe-overripe-and-unsafe", ...]
    }
  ]
}
```

4. **Create per-section task files** (e.g., `tasks/sections/01-food-safety.json`):
```json
{
  "section_id": "01",
  "section_name": "Food: Safety, Spoilage & Judgment",
  "guides": [
    {
      "id": "01-001",
      "title": "When Fruits Are Unripe, Ripe, Overripe, and Unsafe",
      "slug": "when-fruits-are-unripe-ripe-overripe-and-unsafe",
      "status": "not_started",
      "tier": 1,
      "output_path": "guides/01-food-safety/when-fruits-are-unripe-ripe-overripe-and-unsafe.md",
      "created_at": null,
      "verified_at": null,
      "flagged": false,
      "flag_reason": null,
      "verification_notes": null,
      "cross_references": []
    }
  ]
}
```

Each guide gets a `tier` assignment:
- **Tier 1** (no research needed — training data is reliable): Cooking, food safety, kitchen ops, household maintenance, cleaning, laundry, vehicle basics, food storage, basic health, budgeting, clothing care, social interaction, information literacy, digital literacy, decision-making
- **Tier 2** (research needed to verify critical facts): First aid, disaster response, water purification, food preservation, fire, shelter, navigation, power systems, tools
- **Tier 3** (requires authoritative sources — high risk of harm if wrong): Emergency childbirth, chronic disease management, NBC events, advanced wound care, medication withdrawal, radiological response, livestock health, community organization during collapse

---

### Phase 2: The Guide Template

Create `templates/guide-template.md` — every guide MUST follow this structure:

```markdown
# [Guide Title]

> **When to use this guide:** [One sentence — the situation that makes you reach for this guide]

> **Confidence level:** [HIGH / MODERATE / USE WITH CAUTION]
> High = well-established knowledge, low risk of error
> Moderate = generally reliable, verify critical details if possible  
> Use With Caution = complex domain, verify with authoritative sources before depending on this in a life-safety situation

---

## The Short Version

[3-5 bullet points. If someone is in a rush or crisis, this is all they read. Must be actionable and complete enough to act on alone.]

---

## The Full Guide

[The complete, detailed guide. Organized by whatever structure fits the topic:
- Step-by-step procedures for how-to guides
- Decision trees or tables for judgment/assessment guides
- Categorized reference for identification guides

Use specific numbers, temperatures, times, measurements where applicable.
No vague advice. No "consult a professional" as a substitute for actual information (though noting when professional help is ideal is fine as an addition, not a replacement).]

---

## Common Mistakes and Dangerous Misconceptions

[3-5 specific things people get wrong about this topic. Not generic safety warnings — actual mistakes that lead to bad outcomes.]

---

## If You Remember Nothing Else

[One paragraph. The single most important takeaway. Written for someone who skimmed everything above.]

---

## Related Guides

- [Guide Title](relative-link) — [one line explaining the connection]
- [Guide Title](relative-link) — [one line explaining the connection]

---

*Confidence: [HIGH/MODERATE/USE WITH CAUTION] | Last generated: [date] | Tier: [1/2/3]*
```

---

### Phase 3: The Guide Writing Process (This is the core — make it a script)

Create `scripts/write-guide.py` that does the following for each guide:

1. **Read the task file** to get the guide title, tier, and section context.

2. **Determine research needs based on tier:**
   - Tier 1: Write directly from knowledge. No web search needed.
   - Tier 2: Use web search to verify critical facts (temperatures, dosages, times, distances, safety thresholds). Include search queries and sources in a verification log.
   - Tier 3: Use web search extensively. Find authoritative sources first (government health agencies, medical references, FEMA, CDC, military field manuals, established trade references). Build the guide FROM sources, not from memory. Log all sources.

3. **Write the guide** following the template exactly.

4. **Run verification** (`scripts/verify-guide.py`):
   - Check: Does it follow the template structure exactly?
   - Check: Are there specific numbers/measurements where the topic demands them?
   - Check: Does the "Short Version" actually stand alone as actionable?
   - Check: Are cross-references to other guides included and valid?
   - Check: For Tier 2/3, were sources actually consulted?
   - Check: Flag any claims that sound confident but couldn't be verified
   - If any check fails, log it to `quality/flagged-guides.json` with the reason

5. **Update the task file** with status, timestamp, and verification notes.

**IMPORTANT: The script should be designed to be run by Claude Code (i.e., `claude -p` or as a subagent).** The actual writing is done by Claude, not by a deterministic script. The script orchestrates the process — reads the task, constructs the prompt with the template and tier-appropriate instructions, calls Claude to write, then runs verification. Think of it as a harness.

---

### Phase 4: Hooks

Create Claude Code hooks in `.claude/settings.json` that enforce the process:

**PostToolUse hook** (matcher: `Write`):
When any file is written to `guides/`, the hook script (`hooks/post-write-guide.sh`) should:
- Verify the written file follows the template structure (has all required sections)
- Verify the file isn't suspiciously short (< 200 words for the Full Guide section)
- Check that the metadata footer is present and correctly formatted
- If verification fails, exit with code 2 and an error message describing what's wrong

**Stop hook** (prompt-based):
Before Claude stops after working on guides, evaluate:
- Was the task tracking file updated?
- Was the verification log updated?
- Are there any guides marked in_progress that weren't completed?
If any of these fail, block the stop and tell Claude to finish the bookkeeping.

---

### Phase 5: CLAUDE.md Project Instructions

Create a `CLAUDE.md` that contains:

```markdown
# Offline Reference Library — Project Instructions

## What This Project Is
A complete offline reference library of ~550 practical guides covering everyday life skills through collapse scenarios. Every guide must be accurate enough to depend on when there's no internet to verify.

## Critical Rules

1. **Never write a guide without reading the template first.** The template is at `templates/guide-template.md`. Every guide follows it exactly.

2. **Respect the tier system.**
   - Tier 1: Write from knowledge. These are topics where training data is reliable.
   - Tier 2: Verify critical facts with web search. Log sources.
   - Tier 3: Build from authoritative sources. These guides can get people hurt or killed if wrong. Use government agencies, medical references, established trade publications. Log everything.

3. **Always update task tracking.** After writing any guide, update the relevant section task file in `tasks/sections/` and the master `tasks/task-index.json`.

4. **Flag uncertainty.** If you're not confident about a claim, flag it. Add the guide to `quality/flagged-guides.json` with a clear reason. A flagged guide with honest uncertainty notes is better than a confidently wrong guide.

5. **Cross-reference generously.** Every guide should link to 2-5 related guides. Use relative paths. If a related guide doesn't exist yet, still add the reference — it'll be valid once that guide is written.

6. **No filler.** No "consult a professional" as a substitute for actual content. No vague advice. No padding. Every sentence must be there for a reason.

7. **Specific over general.** Use actual numbers: temperatures in both °F and °C, times in minutes/hours, distances in both metric and imperial, weights in both systems. "Cook until done" is useless. "Cook until internal temperature reaches 165°F / 74°C" is useful.

## Workflow

To write the next guide:
1. Check `tasks/task-index.json` for the next `not_started` guide
2. Read the template at `templates/guide-template.md`
3. Read the section task file to understand context and related guides
4. Write the guide following the template
5. Save to the correct path in `guides/[section]/[slug].md`
6. Run verification: `python scripts/verify-guide.py [guide-path]`
7. Update task status: `python scripts/update-task.py [guide-id] [status]`

To write a batch:
- Work through one section at a time
- Do all Tier 1 guides in a section first, then Tier 2, then Tier 3
- After completing a section, review cross-references between guides in that section

## Quality Bar

A good guide:
- Can be understood by someone with no prior knowledge of the topic
- Contains enough detail to actually DO the thing, not just understand it conceptually
- Has specific, verifiable numbers where the topic demands them
- Acknowledges limitations and edge cases
- Stands alone — doesn't require reading other guides to be useful (though it links to them for depth)
- Is honest about confidence level

A bad guide:
- Is vague where specificity matters
- Uses "it depends" without then explaining what it depends ON
- Omits critical safety information
- Confidently states something that might be wrong
- Is padded with obvious statements to seem comprehensive
```

---

### Phase 6: Searchability & Index Generation

Create `scripts/build-index.py` that generates:

1. **Master index** (`guides/INDEX.md`) — alphabetical listing of all guides with paths and one-line descriptions

2. **Section indexes** (`guides/[section]/README.md`) — index for each section

3. **Situation index** (`guides/SITUATIONS.md`) — organized by scenario, not by topic:
   ```markdown
   ## The power just went out
   - [How to Assess Refrigerated Food After Power Loss](01-food-safety/...)
   - [How to Function During Extended Power Grid Failure](17-infrastructure/...)
   - [How to Stay Warm Without Power](13-shelter/...)
   - [How to Use Generators Safely](23-power/...)
   - [How to Manage Power Consumption and Prioritize Loads](23-power/...)
   ```

   Situations to index (at minimum):
   - The power just went out
   - Someone is injured
   - There's a fire
   - We're out of water
   - The food might be bad
   - We need to evacuate
   - Someone is sick and we can't get to a doctor
   - We're stuck in extreme cold/heat
   - There's a natural disaster warning
   - We need to cook with limited resources
   - Something in the house is broken
   - We need to leave the area permanently
   - Civil unrest nearby
   - No communication available
   - A child needs care during an emergency

4. **Symptom/problem index** (`guides/PROBLEMS.md`) — organized by problem:
   ```markdown
   ## Food smells weird
   → [When Meat Is Fresh, Aging, Spoiled, or Dangerous](...)
   → [When Dairy Products Are Safe or Spoiled](...)
   → [When Cooking Oils Are Rancid](...)
   ```

5. **Static site generator** (optional, bonus) — a simple script that converts all the markdown into a self-contained HTML folder with offline search. Just HTML + CSS + vanilla JS, no build tools, no dependencies. Works from a USB drive.

---

## How To Run This

After you've built all of the above, DON'T start writing guides yet. Instead:

1. Show me the folder structure
2. Show me the template
3. Show me the CLAUDE.md
4. Show me one example task file
5. Show me the hooks config
6. Pick ONE Tier 1 guide and write it as a proof of concept so I can review quality before you batch anything

Then we iterate on the template and process before scaling up.

---

## Important Notes

- This is a long-running project. The infrastructure matters more than speed. Get the pipeline right first.
- The guides will be written in batches, probably section by section. The system needs to track progress cleanly.
- I will review guides periodically. The flagging system is how you tell me which ones need my attention most.
- Web search is available via Claude Code tools. Use it for Tier 2 and 3. Don't hallucinate facts for topics where being wrong is dangerous.
- If a guide's topic is genuinely beyond what you can write reliably even with research, flag it as Tier 3 and mark it `needs_human_review` instead of writing garbage.
