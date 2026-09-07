import { describe, expect, it } from "vitest";
import { normaliseerGifs, type RouAntwoord } from "./klipy";
import rou from "./__fixtures__/klipy-soek.json";

/* Die fixture volg Klipy se gedokumenteerde antwoordvorm (docs.klipy.com,
   nagegaan 2026-08-13). Vervang dit met 'n regte gevangde antwoord sodra
   die produksie-sleutel bestaan. */

describe("normaliseerGifs", () => {
  const bladsy = normaliseerGifs(rou as RouAntwoord);

  it("dra die bladsy-metadata deur", () => {
    expect(bladsy.bladsy).toBe(2);
    expect(bladsy.nogMeer).toBe(true);
  });

  it("gooi advertensies weg", () => {
    // Klipy skuif betaalde items tussen die resultate in — hulle mag nooit in
    // AP se nuusbrief beland nie.
    expect(bladsy.gifs.map((g) => g.titel)).not.toContain("Koop nou");
  });

  it("gooi items sonder 'n .gif weg", () => {
    // Substack se markdown-beeldsintaks speel nie mp4 nie, so 'n item met net
    // video is vir ons waardeloos.
    expect(bladsy.gifs.map((g) => g.id)).not.toContain("8041071659142946");
  });

  it("kies 'n klein webp vir die voorskou en 'n .gif vir die finale beeld", () => {
    const eerste = bladsy.gifs[0];
    expect(eerste.voorskou).toMatch(/sm-hello\.webp$/);
    expect(eerste.volledig).toMatch(/8GCrVAB7\.gif$/);
    expect(eerste.wydte).toBe(320);
    expect(eerste.hoogte).toBe(320);
  });

  it("val terug na 'n groter grootte as die klein een ontbreek", () => {
    const netHd = bladsy.gifs.find((g) => g.titel === "Slegs HD");
    expect(netHd?.volledig).toMatch(/net-hd\.gif$/);
    expect(netHd?.voorskou).toMatch(/net-hd\.gif$/);
  });

  it("oorleef 'n leë of stukkende antwoord", () => {
    expect(normaliseerGifs({} as RouAntwoord).gifs).toEqual([]);
    expect(normaliseerGifs({ data: { data: [] } }).nogMeer).toBe(false);
    expect(normaliseerGifs({ data: { data: [{ id: 1 }] } }).gifs).toEqual([]);
  });
});
