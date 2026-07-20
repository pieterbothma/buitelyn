import type { Post } from "@/lib/feed";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function TickerItem({ post, fresh }: { post: Post; fresh: boolean }) {
  return (
    <span className="flex items-center gap-3 whitespace-nowrap">
      {fresh ? (
        <span
          aria-hidden
          style={{
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderBottom: "8px solid var(--brand-green)",
          }}
        />
      ) : null}
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[15px] font-semibold hover:underline"
      >
        {post.title}
      </a>
      <span aria-hidden className="size-1.5 rounded-full bg-red" />
    </span>
  );
}

export function Ticker({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  const now = Date.now();
  const isFresh = (p: Post) => now - new Date(p.isoDate).getTime() < WEEK_MS;
  return (
    <div className="overflow-hidden border-y border-ink/20 py-3">
      <div className="animate-ticker flex w-max gap-8 pl-8">
        <div className="flex gap-8">
          {posts.map((post) => (
            <TickerItem key={post.url} post={post} fresh={isFresh(post)} />
          ))}
        </div>
        <div className="flex gap-8" aria-hidden>
          {posts.map((post) => (
            <TickerItem key={`${post.url}-dup`} post={post} fresh={isFresh(post)} />
          ))}
        </div>
      </div>
    </div>
  );
}
