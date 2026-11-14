import { GROUP_ID } from './api';

// The invite link for the current flock: opening it while signed in joins that flock (app/join/[id]).
export const inviteLink = () => (typeof window !== 'undefined' && GROUP_ID ? `${window.location.origin}/join/${GROUP_ID}` : '');

// "Invite friends": native share sheet where available, otherwise copy the link.
export async function inviteFriends(groupName: string): Promise<string | null> {
  const url = inviteLink();
  const text = `Join ${groupName} on Flock and help us find a place!`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Flock', text, url });
      return null;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'Invite link copied';
  } catch {
    return null;
  }
}
