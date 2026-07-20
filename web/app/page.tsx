import { TopBar } from "@/components/top-bar";
import { Hero } from "@/components/hero";
import { Ticker } from "@/components/ticker";
import { Voorblad } from "@/components/voorblad";
import { Footer } from "@/components/footer";
import { getFeed, type Channel } from "@/lib/feed";

export const revalidate = 600;

const FALLBACK_TAGLINE =
  "Buitelyn sif deur die internasionale stroom van inligting om die goue drade te vind. Ons trek die buitelyne sodat jy duidelik kan sien waarheen die toekoms op pad is.";

const SUBSTACK = "https://buitelyn.substack.com";

export default async function Home() {
  let channel: Channel = { tagline: FALLBACK_TAGLINE, posts: [] };
  try {
    channel = await getFeed();
  } catch {
    // Feed unreachable — render the masthead with a link out instead of erroring.
  }
  const { tagline, posts } = channel;

  return (
    <>
      <TopBar />
      <main className="flex-1">
        <Hero tagline={tagline || FALLBACK_TAGLINE} latestUrl={posts[0]?.url ?? SUBSTACK} />
        <Ticker posts={posts} />
        {posts.length > 0 ? (
          <Voorblad posts={posts} />
        ) : (
          <section className="mx-auto max-w-[1440px] px-6 py-20 text-center md:px-14">
            <p className="text-lg text-ink/70">
              Die voorblad laai nie op die oomblik nie —{" "}
              <a
                href={SUBSTACK}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-4"
              >
                lees op Substack &rarr;
              </a>
            </p>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
