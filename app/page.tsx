'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import {
  CURRENT_USER_ID,
  getGroupFeed,
  getStash,
  getStories,
  stash,
  subscribeToGroupSwipes,
  swipe,
  undoSwipe,
  unstash,
  type FeedPost,
  type Story,
} from '@/lib/api';
import { money, specs, timeAgo } from '@/lib/format';
import Avatar from '@/components/Avatar';
import StoryRing from '@/components/StoryRing';
import ListingPhoto from '@/components/ListingPhoto';
import MatchBadge from '@/components/MatchBadge';

// Optimistically flip an id in a Set, then revert if the API call fails.
function useOptimisticSet() {
  const [set, setSet] = useState<Set<string>>(new Set());
  const flip = (id: string, on: boolean) =>
    setSet((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggle = (id: string, call: (on: boolean) => Promise<void>) => {
    const on = !set.has(id);
    flip(id, on);
    call(on).catch(() => flip(id, !on));
  };
  return [set, setSet, toggle] as const;
}

export default function HomePage() {
  const [stories, setStories] = useState<Story[] | null>(null);
  const [feed, setFeed] = useState<FeedPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked, toggleLike] = useOptimisticSet();
  const [stashed, setStashed, toggleStash] = useOptimisticSet();

  useEffect(() => {
    getStories().then(setStories).catch((e) => (setError(e.message), setStories([])));
    getGroupFeed()
      .then((posts) => {
        setFeed(posts);
        setLiked(new Set(posts.filter((p) => p.listing.likedBy.some((u) => u.id === CURRENT_USER_ID)).map((p) => p.listing.id)));
      })
      .catch((e) => (setError(e.message), setFeed([])));
    getStash()
      .then((ls) => setStashed(new Set(ls.map((l) => l.id))))
      .catch(() => {});
  }, [setLiked, setStashed]);

  // Live: when anyone in the crew swipes, refresh the feed and story rings.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeToGroupSwipes(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        getGroupFeed().then(setFeed).catch(() => {});
        getStories().then(setStories).catch(() => {});
      }, 300);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return (
    <main>
      <header className="px-4 pt-[max(8px,env(safe-area-inset-top))] pb-2">
        <h1 className="text-[26px] font-bold tracking-[-1.04px] text-ink">aptHunt</h1>
      </header>

      <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-3 pt-1.5 pb-3">
        {!stories
          ? Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
                <div className="size-[72px] animate-pulse rounded-full bg-surface" />
                <div className="h-3 w-12 animate-pulse rounded bg-surface" />
              </div>
            ))
          : stories.map((s) => (
              <StoryRing
                key={s.user.id}
                user={s.user}
                hasNew={s.hasNew}
                label={s.user.id === CURRENT_USER_ID ? 'your swipes' : s.user.username}
              />
            ))}
      </div>

      <div className="h-[0.5px] bg-line" />

      {error && <p className="px-4 py-3 text-[13px] text-danger">{error}</p>}

      {!feed ? (
        <PostSkeleton />
      ) : feed.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-8 py-16 text-center">
          <p className="text-[15px] font-semibold text-ink">No group swipes yet</p>
          <p className="text-[13px] text-muted">When someone in your crew swipes right, it shows up here.</p>
          <Link href="/reels" className="mt-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">
            Start swiping
          </Link>
        </div>
      ) : (
        feed.map((post) => (
          <Post
            key={post.id}
            post={post}
            liked={liked.has(post.listing.id)}
            stashed={stashed.has(post.listing.id)}
            onLike={() =>
              toggleLike(post.listing.id, (on) => (on ? swipe(post.listing.id, 'right') : undoSwipe(post.listing.id)))
            }
            onStash={() => toggleStash(post.listing.id, (on) => (on ? stash(post.listing.id) : unstash(post.listing.id)))}
          />
        ))
      )}
    </main>
  );
}

function likedByText(post: FeedPost, liked: boolean) {
  const others = post.listing.likedBy.filter((p) => p.id !== CURRENT_USER_ID).map((p) => p.username);
  const names = liked ? ['you', ...others] : others;
  if (!names.length) return null;
  if (names.length === 1) return <>Liked by <b className="font-semibold">{names[0]}</b></>;
  if (names.length === 2)
    return <>Liked by <b className="font-semibold">{names[0]}</b> and <b className="font-semibold">{names[1]}</b></>;
  return (
    <>
      Liked by <b className="font-semibold">{names[0]}</b> and {names.length - 1} others in your group
    </>
  );
}

function Post({
  post,
  liked,
  stashed,
  onLike,
  onStash,
}: {
  post: FeedPost;
  liked: boolean;
  stashed: boolean;
  onLike: () => void;
  onStash: () => void;
}) {
  const { listing, user } = post;
  const photoCount = Math.max(1, listing.photos.length);
  const [photo, setPhoto] = useState(0);

  return (
    <article className="pb-4">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar user={user} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <span className="font-semibold text-ink">{user.id === CURRENT_USER_ID ? 'you' : user.username}</span>{' '}
            <span className="text-muted">swiped right · {timeAgo(post.swipedAt)}</span>
          </p>
          <p className="truncate text-xs text-muted">{listing.neighborhood}, Brooklyn</p>
        </div>
        <MoreHorizontal size={22} className="text-ink" aria-hidden />
      </div>

      <div className="relative aspect-[393/420] w-full">
        <div
          className="no-scrollbar flex size-full snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            setPhoto(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {Array.from({ length: photoCount }, (_, i) => (
            <ListingPhoto key={i} listing={listing} index={i} className="size-full shrink-0 snap-center" />
          ))}
        </div>
        <div className="absolute top-3 right-3 rounded-full bg-black/55 px-[9px] py-1 text-xs font-medium text-white">
          {photo + 1}/{photoCount}
        </div>
        <MatchBadge match={listing.match} className="absolute bottom-3 left-3" />
      </div>

      <div className="flex items-center gap-4 px-3 pt-2.5 pb-1.5">
        <button onClick={onLike} aria-label={liked ? 'Unlike' : 'Like'} aria-pressed={liked}>
          <Heart
            size={26}
            className={liked ? 'text-accent' : 'text-ink'}
            fill={liked ? 'currentColor' : 'none'}
            strokeWidth={liked ? 0 : 1.8}
          />
        </button>
        <MessageCircle size={25} strokeWidth={1.8} className="text-ink" aria-hidden />
        <div className="flex-1" />
        <button onClick={onStash} aria-label={stashed ? 'Remove from stash' : 'Stash'} aria-pressed={stashed}>
          <Bookmark size={25} strokeWidth={1.8} className="text-ink" fill={stashed ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="flex flex-col gap-[3px] px-3">
        {likedByText(post, liked) && <p className="text-[13px] text-ink">{likedByText(post, liked)}</p>}
        <div className="flex items-baseline gap-2 pt-1">
          <p className="text-lg font-bold text-ink">{money(listing.price)}/mo</p>
          <p className="truncate text-sm text-muted">{specs(listing)}</p>
        </div>
        <p className="text-sm text-ink">{listing.address}</p>
      </div>
    </article>
  );
}

function PostSkeleton() {
  return (
    <div className="animate-pulse pb-4">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="size-8 rounded-full bg-surface" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-40 rounded bg-surface" />
          <div className="h-2.5 w-24 rounded bg-surface" />
        </div>
      </div>
      <div className="aspect-[393/420] w-full bg-surface" />
      <div className="flex flex-col gap-2 px-3 pt-4">
        <div className="h-3 w-56 rounded bg-surface" />
        <div className="h-4 w-40 rounded bg-surface" />
      </div>
    </div>
  );
}
