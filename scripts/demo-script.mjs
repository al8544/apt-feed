// The demo's script, in order: one entry per scene. The recorder (record-demo.mjs) performs each scene's mouse actions on this schedule,
// and the editor (edit-demo.mjs) cuts the scenes together and zooms only on the actions the recorder logged. Edit the voiceover here.
//   take: which recording it comes from · dur: seconds on screen · fit: the take can't be scheduled (typing, agent wait), so its footage is
//   sped up to fit `dur` · zooms: described in the takes themselves, next to the action they show off.
const P1 = 'FIND YOUR PEOPLE', P2 = 'HUNT TOGETHER', P3 = 'FIND YOUR PLACE';
export const SCENES = [
  { id: 'join', take: 'new-user', dur: 5.5, fit: true, chapter: P1, head: 'Join in seconds', cap: 'Sign up, set your basics, and write how you live.',
    vo: 'Sign up and tell Flock how you live.' },
  { id: 'match', take: 'new-user', dur: 6, chapter: P1, head: 'A match that reads between the lines', cap: 'Hate pets? A pet-friendly flock drops to 26%.',
    vo: 'Say you hate pets, and a pet flock drops to twenty-six percent.' , zooms: ["the 26% match badge"] },
  { id: 'request', take: 'new-user', dur: 5, chapter: P1, head: 'Ask to join any flock', cap: 'Their admin decides, and sees your answers.',
    vo: 'Ask to join any flock. Their admin decides.' , zooms: ["Request to join"] },

  { id: 'rankings', take: 'hunt', dur: 6, chapter: P2, head: 'One home base for the hunt', cap: 'Rankings update live as the flock votes.',
    vo: 'The Flock tab ranks every place by how many of you like it, live.' , zooms: ["the top-ranked place"] },
  { id: 'requests', take: 'in-flock', dur: 6, chapter: P2, head: 'Admins answer join requests', cap: 'See their match and their own words, then approve.',
    vo: 'Admins see who wants in, with their own words, and approve in one tap.' , zooms: ["Approve"] },
  { id: 'members', take: 'in-flock', dur: 7, chapter: P2, head: "Everyone's needs, one tap away", cap: 'Budget, pets, habits, and what they wrote.',
    vo: 'Tap anyone to see their needs: budget, pets, habits, and what they wrote.' , zooms: ["Maya's habits and what she wrote"] },
  { id: 'chat', take: 'in-flock', dur: 7, chapter: P2, head: 'A group chat, built in', cap: 'Open it from the member list. No extra tab.',
    vo: 'A group chat lives right in the member list. No extra tab.' , zooms: ["the Chat button in the member list", "typing to the flock"] },
  { id: 'pins', take: 'in-flock', dur: 6, chapter: P2, head: 'See where everyone commutes', cap: "Each person's pin on one shared map.",
    vo: 'Everyone drops a commute pin, so you see where the flock is headed.' , zooms: ["everyone's commute pins"] },
  { id: 'map', take: 'in-flock', dur: 8, chapter: P2, head: 'Thousands of homes, one glance', cap: 'Zoom out and nearby places merge, like Redfin.',
    vo: 'Real CoStar listings. Zoom out and places merge into a count; zoom in for each price.' , zooms: ["the biggest cluster", "a cluster opening up"] },
  { id: 'swipe', take: 'in-flock', dur: 7, chapter: P2, head: 'Swipe together', cap: 'Thumbs up or down, with a reason. The flock ranks the rest.',
    vo: 'Swipe together. A thumbs-down can say why, and the flock re-checks its picks.' , zooms: ["Yes (thumbs up)", "the reason chips"] },
  { id: 'listing', take: 'hunt', dur: 8, chapter: P2, head: 'Every place, in detail', cap: 'Swipe the gallery, see who liked it, and how far it is from your pin.',
    vo: 'Open a place: swipe the gallery, see who liked it and its distance from your pin, then book a tour.' , zooms: ["swiping the gallery", "distance from your pin", "Book a tour"] },
  { id: 'pick', take: 'hunt', dur: 4, chapter: P2, head: 'Pick places to compare', cap: "Choose up to five from your flock's favorites.",
    vo: 'Pick up to five favorites to compare.' , zooms: ["choosing places"] },
  { id: 'compare', take: 'hunt', dur: 7, chapter: P2, head: 'Compare side by side', cap: "Rent, size, votes, and distance from everyone's pins.",
    vo: "Line them up: rent, size, votes, and distance from everyone's pins." , zooms: ["the Avg distance row", "the Farthest pin row"] },
  { id: 'metrics', take: 'hunt', dur: 4.5, chapter: P2, head: 'Tune what matters', cap: 'Weigh rent, size, votes or distance your way.',
    vo: 'Then weigh what matters to you.' , zooms: ["the Farthest pin switch"] },
  { id: 'tours', take: 'hunt', dur: 6, chapter: P2, head: 'Book tours together', cap: 'Everyone sees the same schedule and RSVPs.',
    vo: 'Book tours together. Everyone sees the schedule and RSVPs.' , zooms: ["opening a tour"] },

  { id: 'dk-ask', take: 'ducktective', dur: 4.3, chapter: P3, head: 'Just ask Ducktective', cap: 'Describe the place in your own words.',
    vo: 'Or just ask Ducktective.' , zooms: ["typing the wish"] },
  { id: 'dk-work', take: 'ducktective', dur: 4, fit: true, chapter: P3, head: 'It searches and checks the aerials', cap: 'CoStar listings plus Vexcel aerial imagery.',
    vo: 'It searches CoStar and checks Vexcel aerials.' , zooms: ["the agent's steps"] },
  { id: 'dk-result', take: 'ducktective', dur: 7.5, chapter: P3, head: 'Ranked picks, with evidence', cap: 'Every number comes from tested code, not the model.',
    vo: 'Ranked picks with evidence. Every number comes from code, not the model.' , zooms: ["the best option", "the aerial evidence"] },
];
export const TITLE = { head: 'Flock', sub: 'Find your people, then find your place.', dur: 3, vo: 'Find your people, then find your place.' };
export const OUTRO = { head: 'Flock', sub: 'Real LA listings from CoStar · Vexcel aerial evidence · LangChain Deep Agents · Supabase', dur: 4,
  vo: 'Built on CoStar data, Vexcel imagery and LangChain Deep Agents.' };
