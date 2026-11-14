// "Invite friends" stub: native share sheet where available, otherwise copy the link.
export async function inviteFriends(groupName: string): Promise<string | null> {
  const url = typeof window !== 'undefined' ? window.location.origin : '';
  const text = `Join ${groupName} on aptHunt and help us find a place!`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'aptHunt', text, url });
      return null;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'Invite link copied';
  } catch {
    return null;
  }
}
