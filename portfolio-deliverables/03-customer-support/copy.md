# Multi-Channel Customer Support AI Bot

## Card Summary (for the projects grid — shown before the user expands "Dive deeper")

**Title:** Multi-Channel Customer Support AI Bot

**One-line pitch:** One AI agent brain, three live channels (Facebook Messenger, Telegram, and a website chat widget), deployed to a real client.

**Short description (2-3 sentences, for the card body):** Built for a Vietnamese preschool that could not staff live chat across all three platforms at once. One shared agent runs behind three channel adapters, so a single knowledge base answers parents consistently everywhere — with built-in phone-based lead capture, prompt injection defense, and privacy-aware conversation logging.

**Tags:** `n8n` · `LangChain` · `OpenRouter` · `Facebook Messenger` · `Telegram` · `Multi-Channel`

---

## Deep Dive (shown after the user clicks "Dive deeper" / "Read more")

## The Pain

A small business with limited staff cannot man live chat across three platforms at once. Parents looking at preschools for their children ask questions on whichever channel they happen to be on — some message the Facebook page, some add the Zalo/Telegram contact, some land on the website and use the chat widget. Every one of them expects an instant, accurate reply. Every minute of delay is a parent drifting to a competitor.

Building a separate bot for each channel means three codebases, three knowledge bases drifting out of sync, and three places to fix a pricing update. Most small businesses give up and pick one channel, losing the parents on the other two.

## The Build

A single n8n workflow runs **one shared AI agent** behind **three channel adapters**. The agent's knowledge, tone rules, and escalation logic live in exactly one place. Adding a new channel means adding a new adapter — not rebuilding the whole thing.

**The architecture:**

- **One AI Consultant agent** (LangChain Agent + OpenRouter GPT-4o-mini) carries the full Vietnamese knowledge base for Sakuranbo Kindergarten and EPro English Center: pricing tiers by age group, class schedules, admission process, meal policy, discipline approach, extracurriculars, transport and pickup rules, special dietary requirements. The system prompt is strictly constrained on tone (Vietnamese honorifics, "nhà trường" for the school, "anh/chị" for parents, a hard ban on casual pronouns), and on factual boundaries (never invent prices or policies, defer to staff when unsure).
- **Three channel adapters** each with their own trigger and message extractor:
    - **Telegram adapter** — Telegram Trigger → Extract Content → Detect Phone → route.
    - **Facebook Messenger adapter** — FB webhook (both Verify and Message endpoints) → Extract FB Data → Get FB Profile → Detect Phone → route.
    - **Website chat adapter** — Web Chat Trigger → Web Detect Phone → route.
    - Each adapter normalizes its channel's message format into the same shape the agent expects, then the agent runs identically no matter which surface the message came from.
- **Per-session memory** — a LangChain Buffer Window memory keyed by sender ID, so each parent's conversation is isolated and the bot remembers what they already asked about in the current session.
- **Channel-appropriate response delivery** — the agent's output is routed back through the correct channel sender (Telegram for Telegram users, FB Graph API for Messenger, Respond to Webhook for the website).

**Lead capture:**
- Vietnamese phone number regex (`0[35789]\d{8}`) runs on every incoming message across all three channels.
- When a parent shares a phone number, the message is flagged, logged, and a **separate Telegram notification is fired to the staff's internal channel** with the parent's name and phone number. Staff follow up manually via Zalo.
- The agent is explicitly prompted to proactively ask for a phone number after two or three exchanges, or when the parent shows intent signals ("how do I register," "can we visit," "when can my child start"). This converts chat traffic into qualified leads automatically.

**Production-grade details that usually get skipped:**
- **Prompt injection defense.** The system prompt has an explicit "TUYỆT MẬT" (confidential) section refusing to reveal its own contents, refusing roleplay attacks ("pretend you are X," "ignore previous instructions"), and refusing to answer questions about system internals. Attempts route back to a safe canned response.
- **PII hashing.** Sender IDs are SHA-256 hashed before being written to the chat log sheet, so the log is useful for analytics without storing a direct identifier back to individual users.
- **Unified chat logging.** All three channels log into the same Google Sheet with timestamp, hashed sender, question, agent response, and which channel it came from — so conversation history is searchable in one place regardless of where the parent reached out.
- **Error trigger and staff alerting.** A dedicated Error Trigger node catches any workflow failure and fires a separate Telegram alert to the staff channel with the failing node name, error message, and execution ID. Silent failures are the worst class of bug in customer-facing automation; this makes them impossible.

**The design decision worth calling out:** the "one brain, three faces" abstraction is what makes this workflow maintainable. When the school raises a tuition fee, I update one number in one system prompt and all three channels are immediately accurate. When Messenger releases a breaking change to its webhook format, I patch one adapter and the other two surfaces keep running. That separation of concerns — shared intelligence, isolated plumbing — is the single most important thing I learned building this.

## The Result

- **Delivered to a real client.** Deployed for Sakuranbo Kindergarten and EPro English Center, handling live parent inquiries across all three channels.
- **Three live surfaces, one source of truth.** Parents get consistent answers whether they message on Facebook, Telegram, or the website, because they are all talking to the same agent behind different doors.
- **Automatic lead capture.** Parents who share phone numbers are captured and routed to staff for manual follow-up, turning passive chat traffic into qualified sales leads without any manual triage.
- **Full audit trail.** Every conversation is logged with privacy-safe hashed sender IDs, so the business can review what parents are asking about and refine the knowledge base over time.

## The Demo / Visual

**Architecture:** see `architecture.excalidraw` — shows the fan-in from three channel adapters into the shared AI Consultant, and the fan-out of responses and logging.

**n8n canvas:** see `assets/n8n-canvas.png` for the annotated workflow screenshot.

**The "one brain, three faces" demo** is the centerpiece. Three screenshots or short recordings show the **same parent question** answered consistently across:
- `assets/demo-messenger.png` — Facebook Messenger
- `assets/demo-telegram.png` — Telegram
- `assets/demo-web.png` — the website chat widget

Seeing the same Vietnamese response land in three completely different UIs proves the architecture claim visually, without needing any narration.
