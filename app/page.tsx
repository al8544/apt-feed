import { redirect } from 'next/navigation';

// The app opens on the established flock's screen; Flock picks lives at /picks.
export default function Home() {
  redirect('/group');
}
