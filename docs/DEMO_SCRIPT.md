# Flock demo video: script

About 1:50. Voiceover is about 265 words, read at a relaxed 2.4 words a second. The video is the core experience only: no sign-up, no joining flocks.
Each scene lists the voiceover, what is on screen, and the moments to point the camera at (the mouse goes to these, and the camera pushes in on them).

**Story:** the pain of hunting as a group → Flock is one place to hunt and manage it → home (the ranked list) → scroll for new places → the map → Ducktective →
tours on a shared calendar → compare like PC specs → "this makes hunting with roommates easier."

---

## 1. The problem · 0:00 to 0:16 (16s)

> Finding an apartment with roommates is chaos. There's a spreadsheet nobody updates, listing links buried in the group chat, and four schedules that never line up for a tour. By the time everyone agrees, the place is gone.

**On screen:** no app yet. Made from Figma pieces, a quick pile-up that gets messier with each sentence:
- a spreadsheet with half-empty rows and a "v3 FINAL (2)" tab
- a group chat full of listing links and "did anyone see this one??"
- four overlapping calendars with clashing blocks
- a listing card stamped "NO LONGER AVAILABLE" at the end

**Beats:** one element lands per phrase: spreadsheet on "spreadsheet", chat on "group chat", calendars on "schedules", the stamp on "the place is gone."

## 2. The idea · 0:16 to 0:24 (8s)

> Flock puts the whole hunt in one place. Find apartments, decide together, and manage it all with your roommates.

**On screen:** the clutter sweeps away. The Flock logo and the app (the home screen, still) slide in on the phone. Three words appear in turn: **Find · Decide · Manage**.

## 3. Home: your group's ranked list · 0:24 to 0:38 (14s)

> Your home page is your group's ranked list. Every place the flock has liked, ranked by how many of you want it, so you can see what everyone thinks at a glance. And it updates live.

**On screen:** the Flock tab, scrolled to Flock rankings: five places with prices, "4/5 liked" bars and scores.
**Beats:**
- the cursor rests on the top-ranked place (score and "4/5 liked" bar), zoom in
- ease out; a second place's bar fills as someone votes, to show it's live

## 4. Scroll to find new places · 0:38 to 0:50 (12s)

> Need fresh options? Just scroll. The feed works like the apps you can't put down: a quick yes or nope on every place, and your vote lands on the group's list instantly.

**On screen:** the For you deck, full-screen photos, price and specs.
**Beats:**
- tap **Yes** on one place, zoom in on the buttons
- tap **Nope**, and the "Why the nope?" chips appear: pick "Too far", zoom in on the chips
- cut to the home list with the new vote counted

## 5. Or use the map · 0:50 to 0:59 (9s)

> Prefer to browse by location? The map is still there: nearby places group into counts, and your flock's favorites stand out.

**On screen:** the map over Los Angeles with numbered clusters and green "liked by flock" prices.
**Beats:**
- tap the biggest cluster: the map opens up into individual prices, zoom in
- tap a green price: a place card slides up

## 6. Ducktective · 0:59 to 1:15 (16s)

> And when you know what you want but not where it is, ask Ducktective. Type something like "find me an apartment with a yard." It searches the listings, checks aerial imagery, and gives you ranked picks, with the evidence.

**On screen:** the map search bar.
**Beats:**
- type the wish in the search bar, zoom in on the typing, tap **Ask Ducktective**
- the agent's steps tick by (sped up)
- the best option appears with its evidence lines (for the yard question: what the aerial view shows), zoom in on the evidence

> Note: use the wish that works best on camera. It must not be an address. Test "an apartment with a yard" before filming; the agent states what the aerial imagery does and doesn't show, and says "unknown" rather than guess.

## 7. Tours on a shared calendar · 1:15 to 1:27 (12s)

> When you find one you like, touring is simple. Book a time on the shared calendar, see which slots work for the whole flock, and everyone's RSVP is visible at all times.

**On screen:** a listing → **Book a tour**: the list of open times with "all 5 free" or "Jordan busy" on each. Then the calendar, then a tour's page with the "Going" faces and the **I'm going** switch.
**Beats:**
- zoom in on the "flock free?" labels on the booking times
- zoom in on the **I'm going** switch as it's tapped and a face appears under Going

> Accuracy: the "free" labels come from tours already booked (someone is "busy" if they're on another tour within an hour), not from people's personal calendars. Say "which slots work for the flock," not "syncs everyone's calendars."

## 8. Compare, like PC specs · 1:27 to 1:42 (15s)

> Down to a few favorites? Compare them side by side, like comparing PC specs: rent, size, distance from everyone's commute, votes. The best in each row lights up, and you can weigh what matters most to you.

**On screen:** pick three places, then the compare table.
**Beats:**
- zoom in on the **Avg distance** row, then **Farthest pin**, the best value highlighted green
- open the metrics sheet and flip a switch to change what counts toward "Your score"

## 9. Close · 1:42 to 1:50 (8s)

> Flock makes hunting for an apartment with your roommates finally easy. Find your people, then find your place.

**On screen:** the home list, then the Flock logo on cream. Tagline underneath: *Find your people, then find your place.*
Small line under it: *CoStar listings · Vexcel aerial evidence · LangChain Deep Agents*

---

## Notes for the edit

- **Visual style:** the app's own look: cream background, dark-brown Gaegu type, the rounded phone. Scene 1 is the only one without the app, built from Figma elements.
- **Pacing:** a line of voiceover should still be running when its beat happens (the camera arrives as the cursor arrives, holds through the click, then eases out). Never zoom without the mouse doing something.
- **Not in this cut:** sign-up, the match percentage, joining flocks, admin requests, member details, group chat, commute pins on their own. They're all real, but they're not the core story here. Distance still shows up in Compare.
- **Footage still needed for this script:** the pain-point pile-up (Figma, scene 1), the home list with a live vote (scene 3), the Ducktective **yard** query (scene 6; the current footage uses a different wish), the booking sheet's "flock free?" labels and the RSVP (scene 7). The map, swipe deck and compare footage can be reused.
- **Not updated:** `scripts/demo-script.mjs`, `scripts/record-demo.mjs`, `scripts/edit-demo.mjs` and `recordings/voiceover-script.md` still follow the previous cut. They're left as they were, since the editing will move to DaVinci.
