import { describe, expect, it } from "vitest";
import { groepeerLeers } from "./oorsig-argief";

const BASIS = "https://mstrumkcyfikbddfmjti.supabase.co";
const leer = (name: string, grootte = 800_000) => ({ name, grootte });

describe("groepeerLeers", () => {
  it("groepeer 'n dag se drie uitgawes in een Dag", () => {
    const dae = groepeerLeers(
      [leer("2026-08-05-oggend.mp3"), leer("2026-08-05-middag.mp3"), leer("2026-08-05-aand.mp3")],
      BASIS
    );
    expect(dae).toHaveLength(1);
    expect(dae[0].datum).toBe("2026-08-05");
    expect(dae[0].snitte).toHaveLength(3);
  });

  it("sorteer uitgawes oggend → middag → aand, NIE alfabeties nie", () => {
    // alfabeties sou "aand" eerste plaas — dit is die bug wat dié toets vang
    const dae = groepeerLeers(
      [leer("2026-08-05-aand.mp3"), leer("2026-08-05-oggend.mp3"), leer("2026-08-05-middag.mp3")],
      BASIS
    );
    expect(dae[0].snitte.map((s) => s.uitgawe)).toEqual(["oggend", "middag", "aand"]);
  });

  it("sorteer dae nuutste eerste", () => {
    const dae = groepeerLeers(
      [leer("2026-08-03-oggend.mp3"), leer("2026-08-06-oggend.mp3"), leer("2026-08-05-oggend.mp3")],
      BASIS
    );
    expect(dae.map((d) => d.datum)).toEqual(["2026-08-06", "2026-08-05", "2026-08-03"]);
  });

  it("hou net die jongste sewe dae", () => {
    const leers = Array.from({ length: 10 }, (_, n) =>
      leer(`2026-08-${String(n + 1).padStart(2, "0")}-oggend.mp3`)
    );
    const dae = groepeerLeers(leers, BASIS);
    expect(dae).toHaveLength(7);
    expect(dae[0].datum).toBe("2026-08-10"); // nuutste
    expect(dae[6].datum).toBe("2026-08-04"); // sewende nuutste
  });

  it("maksDae is instelbaar", () => {
    const leers = Array.from({ length: 5 }, (_, n) =>
      leer(`2026-08-0${n + 1}-oggend.mp3`)
    );
    expect(groepeerLeers(leers, BASIS, 2)).toHaveLength(2);
  });

  it("ignoreer lêers wat nie die patroon pas nie", () => {
    const dae = groepeerLeers(
      [
        leer("2026-08-05-oggend.mp3"),
        leer("willekeurig.txt"),
        leer("2026-08-05.mp3"), // geen uitgawe
        leer("2026-08-05-oggend.wav"), // verkeerde formaat
        leer("2026-08-05-nag.mp3"), // onbekende uitgawe
        leer(".emptyFolderPlaceholder"), // Supabase se eie plekhouer
      ],
      BASIS
    );
    expect(dae).toHaveLength(1);
    expect(dae[0].snitte.map((s) => s.uitgawe)).toEqual(["oggend"]);
  });

  it("gee [] vir 'n leë lys sonder om te gooi", () => {
    expect(groepeerLeers([], BASIS)).toEqual([]);
  });

  it("bou die publieke bucket-URL en behou die grootte", () => {
    const dae = groepeerLeers([leer("2026-08-05-middag.mp3", 1_048_576)], BASIS);
    expect(dae[0].snitte[0].url).toBe(
      `${BASIS}/storage/v1/object/public/markte-oudio/2026-08-05-middag.mp3`
    );
    expect(dae[0].snitte[0].grootte).toBe(1_048_576);
  });

  it("skryf die datum in Afrikaans uit, met die weekdag", () => {
    // 2026-08-05 is 'n Woensdag
    const [dag] = groepeerLeers([leer("2026-08-05-oggend.mp3")], BASIS);
    expect(dag.datumWoorde).toMatch(/Woensdag/i);
    expect(dag.datumWoorde).toMatch(/Augustus/i);
    expect(dag.datumWoorde).toMatch(/2026/);
  });
});
