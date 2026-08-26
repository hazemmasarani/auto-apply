# Job Application Copilot

A local-first Chrome/Edge extension that stores a reusable application profile,
fills common job-application fields, and drafts answers to unusual questions
using only facts you supplied.

The extension deliberately **does not submit applications**, bypass CAPTCHAs, or
answer legal/self-identification questions without review.

## Features

- AES-GCM encrypted profile storage protected by your passphrase
- Contact, education, employment, skills, links, preferences, authorization,
  and reusable standard answers
- Field matching by labels, names, placeholders, ARIA text, and nearby text
- A per-page review panel showing proposed values before they are filled
- Optional OpenAI-compatible answer generation with a strict grounding prompt
- No server, analytics, or third-party dependencies

## Install

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this repository.
4. Open the extension, create a passphrase, and save your profile.
5. On an application page, open the extension and choose **Review fields**.

The passphrase is never stored. Your profile and optional API key are encrypted
in `chrome.storage.local`; unlocking lasts only for the current browser session.

## Answer generation

In the profile editor, configure an OpenAI-compatible endpoint and model. The
extension sends the current question, visible job description, and your factual
profile to that endpoint. Generated text is always shown for review and is never
inserted or submitted silently.

If no endpoint is configured, unknown questions remain blank for manual review.

## Development

This is plain Manifest V3 JavaScript, so no build step is required. Run the
unit tests with:

```powershell
node --test tests/*.test.mjs
```

## Privacy and responsible use

Only use the extension where automation is permitted. Review every proposed
answer. Do not use generated text to misrepresent experience or qualifications.
Avoid storing government IDs, passwords, or banking information in the profile.
Robot to automatically apply on available positions.
