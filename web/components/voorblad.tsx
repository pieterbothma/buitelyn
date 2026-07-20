import Image from "next/image";
import type { Post } from "@/lib/feed";

const dateFmt = new Intl.DateTimeFormat("af-ZA", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function afDate(iso: string) {
  return dateFmt.format(new Date(iso)).toUpperCase();
}

function Meta({ post }: { post: Post }) {
  return (
    <p className="flex items-center gap-2 text-xs tracking-[0.18em] text-ink/55">
      <span aria-hidden className="size-1.5 rounded-full bg-red" />
      {afDate(post.isoDate)} · {post.readMinutes} MIN
    </p>
  );
}

function LeadStory({ post }: { post: Post }) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group grid gap-8 md:grid-cols-2 md:items-center"
    >
      {post.image ? (
        <div className="relative aspect-[4/3] border border-ink/20 bg-offwhite">
          <Image
            src={post.image}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div>
        <h3 className="text-4xl font-extrabold leading-[1.02] tracking-[-0.02em] group-hover:underline md:text-5xl">
          {post.title}
        </h3>
        <p className="mt-4 max-w-xl text-lg leading-[1.5] text-ink/70">{post.blurb}</p>
        <div className="mt-5">
          <Meta post={post} />
        </div>
      </div>
    </a>
  );
}

function StoryCard({ post }: { post: Post }) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col border-b border-ink/15 pb-7"
    >
      {post.image ? (
        <div className="relative mb-4 aspect-[4/3] overflow-hidden border border-ink/20 bg-offwhite">
          <Image
            src={post.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div className="mb-4 flex aspect-[4/3] items-center justify-center border border-ink/20 bg-offwhite">
          <span aria-hidden className="size-4 rounded-full bg-red" />
        </div>
      )}
      <h4 className="text-xl font-bold leading-snug group-hover:underline">{post.title}</h4>
      <p className="mt-2 line-clamp-2 text-sm leading-[1.5] text-ink/65">{post.blurb}</p>
      <div className="mt-auto pt-3">
        <Meta post={post} />
      </div>
    </a>
  );
}

export function Voorblad({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  const [lead, ...rest] = posts;
  const today = dateFmt.format(new Date()).toUpperCase();
  return (
    <section className="mx-auto w-full max-w-[1440px] px-6 py-14 md:px-14">
      {/* Masthead: double rules with title + dateline between them */}
      <div className="border-y-2 border-ink">
        <div className="my-1 flex flex-wrap items-baseline justify-between gap-2 border-y border-ink py-3">
          <h2 className="text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">
            Buitelyn
          </h2>
          <p className="text-xs tracking-[0.2em] text-ink/60">
            {today} · BUITELYN.SUBSTACK.COM
          </p>
        </div>
      </div>

      <div className="mt-10">
        <LeadStory post={lead} />
      </div>

      {rest.length > 0 ? (
        <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-10 border-t border-ink/20 pt-10 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <StoryCard key={post.url} post={post} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
