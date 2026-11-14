# Apartments.com enrichment: permission record

**Status: the scraper is NOT used.** The team decided (ticket T5) to ship the CoStar kit's own galleries instead, so no
scraping happens and no approval is needed today. `scripts/enrich-apartments-com.ts` stays in the repo, switched off
(`APARTMENTS_COM_ENRICH` must be set to `on`). **If anyone ever turns it on, fill in the evidence below first.**

**Needed before the scraper is run** (docs/DESIGN.md §6.2).

## What was approved

The team's understanding, from the design doc: the HackPrinceton CoStar track organizers gave **verbal / track-channel**
approval to scrape Apartments.com for **listing images and related listing details**, for **hackathon use only**.

## Evidence (fill in; the approval was verbal, so write down where it is)

| | |
|---|---|
| Who approved | _name and role_ |
| When | _date and time_ |
| Where | _Discord link to the message, or a screenshot saved next to this file_ |
| Exact words / scope | _paste the message_ |
| Recorded by | _who wrote this down_ |

If the evidence turns out narrower than "images and related details", trim `lib/enrich/apartments-com.ts` to what it covers.

## Limits we keep regardless

- Hackathon use only. Do not ship scraped content in a public product.
- No personal data (agent names, phones, emails).
- Polite: one request at a time with a 4 to 8 second pause, an honest User-Agent with a contact, robots.txt respected,
  every page cached on disk.
- If a page shows a CAPTCHA or blocks us, the script stops and the app uses the kit photo. We do not work around it.
- Kill switch: `APARTMENTS_COM_ENRICH=off`.
- Photos are hotlinked, not copied (design doc §15 item 5 is still open; copying to Supabase Storage is the more reliable option for a live demo).
