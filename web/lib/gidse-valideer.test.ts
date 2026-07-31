import { describe, expect, it } from "vitest";
import { valideerGids, type GidsInhoud } from "./gidse-valideer";
import { kryGids } from "./gidse";

const beginner = kryGids("hoe-om-aandele-te-koop")!;
const konsep = kryGids("wat-is-n-dividend")!;

const geldig = (oor: Partial<GidsInhoud> = {}): GidsInhoud => ({
  titel: "Hoe om aandele te koop",
  beskrywing: "'n Rustige verduideliking van hoe die proses in Suid-Afrika werk.",
  intro: "Die eerste aandeel voel groter as wat dit is. Hier is wat werklik gebeur.",
  afdelings: [
    { kop: "Wat 'n aandeel is", paragrawe: ["'n Aandeel is 'n stukkie van 'n maatskappy.", "Dit word op 'n beurs verhandel."] },
    { kop: "Hoe die proses lyk", paragrawe: ["Jy open 'n rekening.", "Daarna plaas jy 'n opdrag."] },
    { kop: "Wat om in gedagte te hou", paragrawe: ["Fooie vreet aan klein bedrae.", "Tyd doen die swaarste werk."] },
  ],
  verwant: ["naspers", "capitec", "sasol"],
  sponsor_konteks: "EasyEquities is een van die platforms waar dit in Afrikaans gedoen kan word.",
  ...oor,
});

describe("valideerGids", () => {
  it("aanvaar geldige inhoud", () => {
    expect(valideerGids(geldig(), beginner)).toEqual([]);
  });

  it("verwerp imperatiewe — die FSCA-grenslyn", () => {
    const stout = geldig({
      afdelings: [{ kop: "Begin", paragrawe: ["Koop jou eerste aandeel vandag."] }, ...geldig().afdelings],
    });
    expect(valideerGids(stout, beginner).join(" ")).toMatch(/imperatief|koop/i);
  });

  it("verwerp Nederlandse/Vlaamse insypeling", () => {
    const stout = geldig({ intro: "Die beurs is een echte achtbaan." });
    expect(valideerGids(stout, beginner).join(" ")).toMatch(/achtbaan/i);
  });

  it("verwerp 'Die Buitelyn'", () => {
    const stout = geldig({ intro: "Die Buitelyn verduidelik dit so." });
    expect(valideerGids(stout, beginner).join(" ")).toMatch(/Die Buitelyn/);
  });

  it("verwerp 'n verwante slug wat nie bestaan nie", () => {
    const stout = geldig({ verwant: ["satrix"] });
    expect(valideerGids(stout, beginner).join(" ")).toMatch(/satrix/);
  });

  it("eis sponsor_konteks op beginnergidse en verbied dit op konsepgidse", () => {
    expect(valideerGids(geldig({ sponsor_konteks: null }), beginner).join(" ")).toMatch(/sponsor_konteks/);
    expect(valideerGids(geldig({ sponsor_konteks: "EasyEquities ..." }), konsep).join(" ")).toMatch(/sponsor_konteks/);
  });

  it("eis minstens drie afdelings en 'n beskrywing", () => {
    expect(valideerGids(geldig({ afdelings: [geldig().afdelings[0]] }), beginner).join(" ")).toMatch(/afdeling/);
    expect(valideerGids(geldig({ beskrywing: "" }), beginner).join(" ")).toMatch(/beskrywing/);
  });

  it("verwerp heeltemal verkeerde vorms sonder om te ontplof", () => {
    expect(valideerGids(null, beginner).length).toBeGreaterThan(0);
    expect(valideerGids("nee", beginner).length).toBeGreaterThan(0);
  });
});
