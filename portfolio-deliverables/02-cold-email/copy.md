# Cold Email Workflow

## Card Summary (for the projects grid — shown before the user expands "Dive deeper")

**Title:** Cold Email Workflow

**One-line pitch:** An AI-powered cold email system that personalizes every message with Claude and tracks send state so nobody gets emailed twice.

**Short description (2-3 sentences, for the card body):** Reads leads from a Google Sheet, builds a per-lead prompt with company context, generates the email with Claude Sonnet, sends via Gmail, and marks the row as sent. Safe to stop and restart at any time — already-sent rows get skipped automatically, so no one ever gets emailed twice. Designed as the outreach half of a complete outbound sales pipeline paired with Lead Generation.

**Tags:** `n8n` · `Claude Sonnet` · `Anthropic API` · `Gmail` · `Google Sheets`

---

## Deep Dive (shown after the user clicks "Dive deeper" / "Read more")

## The Pain

Generic mass cold emails get ignored. They arrive in the same batch as every other template and get deleted in one swipe. The only cold emails that actually work are the ones that reference something specific and real about the recipient's business — their product, their recent news, the thing they actually do.

But hand-writing personalized emails does not scale. A human sales rep can write maybe twenty genuinely personalized cold emails in a morning, and even that pace is brutal. Most teams default back to templates, and the open rates show it.

There is also a second, quieter problem: state. When you are sending cold emails in batches, you must track who has already received what, because double-emailing the same person within a week is a fast path to the spam folder and a reputation hit. Tracking that by hand is how mistakes happen.

## The Build

A single n8n workflow reads leads from a Google Sheet, generates a per-lead email with Claude, sends it, and updates the sheet with the send status — all in one loop that is safe to stop and restart at any time.

**Pipeline:**
1. **Read leads** from a Google Sheet. The sheet schema matches what the [Lead Generation System](../01-lead-generation/copy.md) outputs: `first_name`, `last_name`, `email`, `company_name`, `company_website`, `company_description`, `keywords`, plus a `send_status` column for state tracking.
2. **Loop over leads** in batches so errors on one row do not break the whole run.
3. **Is unsent?** — a conditional check on `send_status`. Leads already marked `sent` are skipped and flow back into the loop. This is what makes the workflow resumable: stop it halfway through, start it again, no duplicate emails.
4. **Build email prompt** — a Code node constructs a Claude prompt with the lead's company profile, website, job title, and industry keywords, plus sender details (name, role, company) that were factored out of the prompt so they can be changed in one place without touching the template.
5. **Generate with Claude** — direct HTTP call to the Anthropic Messages API with `claude-sonnet-4`. The system prompt explicitly constrains tone ("warm and genuinely curious, never salesy or robotic"), length (under 130 words), structure (soft CTA, specific reference to the recipient's business), and output format (strict JSON with `subject` and `body` fields).
6. **Parse response** — extracts and validates the JSON. Throws with the raw Claude response attached if parsing fails, so debugging is not a guessing game.
7. **Send via Gmail** — sends the email to the lead's address with the Claude-generated subject and body.
8. **Mark as sent** — updates the same Google Sheet row with `send_status: sent`, which makes step 3 skip this row on the next run.

**Design decisions worth calling out:**
- **Safe to stop and restart at any time.** The "has this been sent?" status lives in the same sheet the workflow reads from, so if you interrupt a run halfway through and restart it later, already-sent rows get skipped automatically. Nobody ever gets emailed twice. This is the kind of detail that separates a demo from something you would trust to run against real contacts.
- **Strict JSON output from the LLM.** The prompt explicitly forbids markdown fences and extra text, and the parse step strips fences as a safety net. LLMs that "almost" return valid JSON are a common source of production breakage; this handles both the happy path and the safety net.
- **Sender details factored out of the prompt template.** To switch from "Alex Chen at Acme" to "your name at your company," you edit three constants at the top of the Code node. No prompt engineering required.

## The Result

- **Personalized at scale** — every email references something specific about the recipient's company, automatically.
- **Zero double-sends** — the sheet-based state tracking means the workflow is safe to re-run, pause, or resume without any manual bookkeeping.
- **Complete audit trail** — every sent row in the sheet shows exactly when it was marked as sent and which email address it went to.
- **Composable with upstream lead generation** — consumes the exact schema the [Lead Generation System](../01-lead-generation/copy.md) produces, so the two workflows form a complete outbound sales pipeline with a clean handoff between them.

## The Demo / Visual

**Architecture:** see `architecture.excalidraw` for the high-level pipeline diagram.

**n8n canvas:** see `assets/n8n-canvas.png` for the annotated workflow screenshot.

**End-to-end test run:** see `assets/demo-recording.mp4` for a screen recording against three to five sample leads showing the full loop — read sheet, generate email, send, mark sent, skip the already-sent row on a second run.

---

### Related project

This workflow is designed to consume leads from the **[Lead Generation System](../01-lead-generation/copy.md)**, but it will work with any Google Sheet whose columns match the expected schema. The two together form a complete outbound sales pipeline: Lead Generation discovers and enriches prospects, Cold Email personalizes and delivers the outreach.
