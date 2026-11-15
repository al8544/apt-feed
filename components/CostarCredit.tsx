// Listing-data credit shown at the bottom of every page.
export default function CostarCredit() {
  return (
    <p className="flex items-center justify-center gap-1.5 py-4 text-xs text-faded">
      Listing data powered by
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/costar-logo.svg" alt="CoStar" height={12} className="h-3 w-auto opacity-60" />
    </p>
  );
}
