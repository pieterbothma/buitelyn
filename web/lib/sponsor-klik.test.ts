import { describe, expect, it } from "vitest";
import { isKruiper, besoekerHash, dagSleutelVan } from "./sponsor-klik";

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

describe("isKruiper", () => {
  it("verwerp bekende kruipers — 'n syfer met Googlebot in is waardeloos", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "facebookexternalhit/1.1",
      "Twitterbot/1.0",
      "WhatsApp/2.23",
      "Mozilla/5.0 (compatible; AhrefsBot/7.0)",
      "python-requests/2.31.0",
      "curl/8.4.0",
      "Mozilla/5.0 (compatible; GPTBot/1.0)",
    ]) {
      expect(isKruiper(ua), ua).toBe(true);
    }
  });

  it("laat regte blaaiers deur", () => {
    expect(isKruiper(CHROME)).toBe(false);
    expect(isKruiper(IPHONE)).toBe(false);
  });

  it("hanteer 'n ontbrekende UA as 'n kruiper", () => {
    expect(isKruiper(null)).toBe(true);
    expect(isKruiper("")).toBe(true);
  });
});

describe("besoekerHash", () => {
  it("is stabiel vir dieselfde besoeker op dieselfde dag", async () => {
    const a = await besoekerHash("41.13.9.2", CHROME, "2026-07-31");
    const b = await besoekerHash("41.13.9.2", CHROME, "2026-07-31");
    expect(a).toBe(b);
  });

  it("verskil die volgende dag — die sout roteer, so niemand word oor tyd gevolg nie", async () => {
    const a = await besoekerHash("41.13.9.2", CHROME, "2026-07-31");
    const b = await besoekerHash("41.13.9.2", CHROME, "2026-08-01");
    expect(a).not.toBe(b);
  });

  it("verskil vir verskillende besoekers", async () => {
    const a = await besoekerHash("41.13.9.2", CHROME, "2026-07-31");
    const b = await besoekerHash("41.13.9.3", CHROME, "2026-07-31");
    expect(a).not.toBe(b);
  });

  it("bevat nooit die rou IP nie", async () => {
    const h = await besoekerHash("41.13.9.2", CHROME, "2026-07-31");
    expect(h).not.toContain("41.13.9.2");
    expect(h).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe("dagSleutelVan", () => {
  it("gebruik die SA-kalenderdag, nie UTC nie", () => {
    // 2026-07-31T23:30Z is reeds 1 Augustus in Johannesburg (UTC+2)
    expect(dagSleutelVan(new Date("2026-07-31T23:30:00Z"))).toBe("2026-08-01");
  });
});
