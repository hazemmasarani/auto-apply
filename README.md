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
- Multiple education and work-experience entries, with repeatable-section filling
- Field matching by labels, names, placeholders, ARIA text, and nearby text
- Option-aware dropdown matching for country/state aliases and saved custom aliases
- A per-page review panel showing proposed values before they are filled
- Automatic initial filling of recognized empty fields, with sidebar controls for edits
- Optional OpenAI-compatible answer generation with a strict grounding prompt
- Encrypted application tracker with draft, in-progress, and applied statuses
- Duplicate detection based on the company, position title, and opening lines of the job description
- No server, analytics, or third-party dependencies

## Install

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this repository.
4. Open the extension, create a passphrase, and save your profile.
5. On an application page, open the extension and choose **Review fields**.

The passphrase is never stored. Your profile and optional API key are encrypted
before being stored; unlocking lasts only for the current browser session.

## Application tracking and browser sync

When you review a job page, the panel can save it as a draft, in progress, or
applied. The extension fingerprints a job with a SHA-256 hash of its company,
title, and the first five non-empty lines of the detected description. Saving a
job with the same fingerprint updates the existing record instead of adding a
duplicate. Each record contains the company, title, application URL, status,
and timestamps.

Application history and an encrypted copy of your profile are stored in
`chrome.storage.sync`. They are available on browsers signed in to the same
browser-sync account after you unlock the extension with the same passphrase.
Browser sync has storage quotas, so it is appropriate for a personal
job-application history, not an unlimited archive. It does not share data with
a different browser account.

## Answer generation

In the profile editor, configure an OpenAI-compatible endpoint and model. The
extension sends the current question, visible job description, and your factual
profile to that endpoint. Generated text is always shown for review and is never
inserted or submitted silently.

If no endpoint is configured, unknown questions remain blank for manual review.

## Dropdown aliases

For dropdowns and autocomplete inputs, the review panel compares the saved
value with the site's actual option labels and values. It recognizes common
country and US-state aliases, compacted names such as `Stonybrook University`,
and phrase matches such as `Stony Brook` → `Stony Brook City`. The extension
uses the site's first best-ranked option and shows that selection in the panel.

For site-specific wording, add a custom alias in the profile editor using:

```text
field | saved value | site option label
country | USA | +1 United States
```

Use `*` as the field only when a mapping is deliberately safe for every
dropdown. If several options match, the extension uses the highest-ranked site
option and keeps that selection visible in the sidebar for review.

## Automatic field filling

When you choose **Review fields**, the extension fills recognized empty fields
from your profile immediately. Existing values on the application page are kept
unchanged. Use the sidebar to edit a proposed value, then click that row's
**Fill this field** button to apply your edit. The extension still never
submits forms and leaves identity documents, financial data, attestations,
demographic questions, signatures, and CAPTCHAs alone.

## Multiple education and work entries

Use **Add education** and **Add work experience** in the profile editor to save
each record. On an application page, the extension fills the entries in page
order. When more records are needed, it clicks clearly labeled page controls
such as **Add education** or **Add work experience** before filling the new
sections. If a site uses an unlabeled generic add button, add the section
yourself and run **Review fields** again.

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
