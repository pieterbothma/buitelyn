import { XMLParser } from "fast-xml-parser";

export type Post = {
  title: string;
  blurb: string;
  url: string;
  isoDate: string;
  image: string | null;
  author: string;
  readMinutes: number;
};

export type Channel = {
  tagline: string;
  posts: Post[];
};

const FEED_URL = "https://buitelyn.substack.com/feed";

/* fast-xml-parser wraps CDATA sections; values may arrive as strings,
   numbers, or { __cdata } objects depending on the node — unwrap all. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function text(value: any): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "__cdata" in value) return text(value.__cdata);
  return "";
}

/* Substack's legacy image host 502s on every request (2022-era posts);
   render those entries text-only rather than with broken image boxes. */
const DEAD_IMAGE_HOSTS = new Set(["cdn.substack.com"]);

function imageUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    return DEAD_IMAGE_HOSTS.has(new URL(raw).hostname) ? null : raw;
  } catch {
    return null;
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseFeed(xml: string): Channel {
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: "__cdata",
  });
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel;
  if (!channel) throw new Error("Not an RSS feed");

  const rawItems = channel.item == null ? [] : Array.isArray(channel.item) ? channel.item : [channel.item];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts: Post[] = rawItems.map((item: any) => {
    const content = text(item["content:encoded"]);
    const words = stripTags(content).split(" ").filter(Boolean).length;
    return {
      title: text(item.title),
      blurb: stripTags(text(item.description)),
      url: text(item.link),
      isoDate: new Date(text(item.pubDate)).toISOString(),
      image: imageUrl(item.enclosure?.["@_url"]),
      author: text(item["dc:creator"]) || "Buitelyn",
      readMinutes: Math.max(1, Math.round(words / 220)),
    };
  });

  posts.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());

  return { tagline: stripTags(text(channel.description)), posts };
}

export async function getFeed(): Promise<Channel> {
  const res = await fetch(FEED_URL, {
    next: { revalidate: 600 },
    headers: { "user-agent": "Mozilla/5.0 (compatible; BuitelynWeb/1.0)" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
  return parseFeed(await res.text());
}
