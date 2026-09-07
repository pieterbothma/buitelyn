import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseVoer } from "./youtube";

const voer = readFileSync(new URL("./__fixtures__/youtube-feed.xml", import.meta.url), "utf8");

describe("parseVoer", () => {
  it("gee die JONGSTE video, nie sommer een nie", () => {
    const v = parseVoer(voer);
    expect(v?.id).toBe("17-fx20yILI");
    expect(v?.titel).toBe("Afrikaanse mense: maak asseblief meer AI inhoud");
  });

  it("bou die duimnael uit die video-ID", () => {
    // maxresdefault, nie die voer se hqdefault nie — die fasade wys dit groot.
    expect(parseVoer(voer)?.duimnael).toBe("https://i.ytimg.com/vi/17-fx20yILI/maxresdefault.jpg");
  });

  it("hou die publikasiedatum", () => {
    expect(parseVoer(voer)?.gepubliseer).toContain("2026-08-24");
  });

  it("gee null vir 'n kanaal sonder video's", () => {
    expect(parseVoer('<?xml version="1.0"?><feed><title>Leeg</title></feed>')).toBeNull();
  });

  it("gee null vir wanvormige XML in plaas van om te gooi", () => {
    // 'n Stil YouTube mag nie die tuisblad se markte saam afvat nie.
    expect(parseVoer("<html>foutbladsy")).toBeNull();
    expect(parseVoer("")).toBeNull();
  });

  it("gee null wanneer die inskrywing geen videoId het nie", () => {
    expect(parseVoer("<feed><entry><title>Sonder ID</title></entry></feed>")).toBeNull();
  });
});
