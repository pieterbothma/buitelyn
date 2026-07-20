import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseFeed } from "./feed";

const fixture = readFileSync(join(__dirname, "__fixtures__", "feed.xml"), "utf8");

describe("parseFeed", () => {
  it("extracts the channel tagline", () => {
    const { tagline } = parseFeed(fixture);
    expect(tagline.toLowerCase()).toContain("buitelyne");
  });

  it("parses all posts with mapped fields", () => {
    const { posts } = parseFeed(fixture);
    expect(posts.length).toBeGreaterThanOrEqual(1);
    const first = posts[0];
    expect(first.title.length).toBeGreaterThan(0);
    expect(first.url).toMatch(/^https:\/\/buitelyn\.substack\.com\/p\//);
    expect(new Date(first.isoDate).getTime()).not.toBeNaN();
    expect(first.readMinutes).toBeGreaterThanOrEqual(1);
    expect(first.author.length).toBeGreaterThan(0);
  });

  it("keeps blurbs as plain text (no tags)", () => {
    const { posts } = parseFeed(fixture);
    for (const post of posts) {
      expect(post.blurb).not.toMatch(/<[a-z][\s\S]*>/i);
    }
  });

  it("sorts posts newest first", () => {
    const { posts } = parseFeed(fixture);
    const times = posts.map((p) => new Date(p.isoDate).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("drops images on Substack's dead legacy CDN host", () => {
    const { posts } = parseFeed(fixture);
    for (const post of posts) {
      if (post.image) {
        expect(new URL(post.image).hostname).not.toBe("cdn.substack.com");
      }
    }
  });

  it("normalises a single-item feed to an array", () => {
    const single = `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title><![CDATA[X]]></title><description><![CDATA[net een buitelyne toets]]></description><item><title><![CDATA[Een]]></title><description><![CDATA[Blurb]]></description><link>https://buitelyn.substack.com/p/een</link><dc:creator><![CDATA[Appel]]></dc:creator><pubDate>Mon, 20 Jul 2026 10:00:00 GMT</pubDate><content:encoded><![CDATA[<p>een twee drie</p>]]></content:encoded></item></channel></rss>`;
    const { posts } = parseFeed(single);
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe("Een");
    expect(posts[0].image).toBeNull();
  });
});
