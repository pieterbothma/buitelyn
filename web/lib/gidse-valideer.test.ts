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

  it("verwerp 'n gegenereerde titel wat self imperatief is", () => {
    const stout = geldig({ titel: "Koop nou jou eerste aandeel" });
    expect(valideerGids(stout, beginner).join(" ")).toMatch(/imperatief|koop/i);
  });

  it("aanvaar die wettige infinitiefkonstruksie in 'n titel", () => {
    const goed = geldig({ titel: "Hoe om aandele te koop" });
    expect(valideerGids(goed, beginner)).toEqual([]);
  });

  it("verwerp velde met die verkeerde tipe sonder om te ontplof", () => {
    const stout = geldig({ titel: 5 as unknown as string, intro: {} as unknown as string });
    const foute = valideerGids(stout, beginner);
    expect(foute.length).toBeGreaterThan(0);
    expect(foute.join(" ")).toMatch(/titel|intro/i);
  });

  it("vang 'n imperatief met 'n diakritiese letter — 'begin belê' wat voorheen nooit kon pas nie", () => {
    const stout = geldig({ intro: "Begin belê vandag met R100." });
    expect(valideerGids(stout, beginner).join(" ")).toMatch(/imperatief|belê/i);
  });

  it("bly 'belê nou' vang — moet nie deur die diakritiese herstel breek nie", () => {
    const stout = geldig({ intro: "Belê nou in die Top 40." });
    expect(valideerGids(stout, beginner).join(" ")).toMatch(/imperatief|belê/i);
  });

  it("aanvaar egte Afrikaanse saamgestelde woorde soos 'koopkrag' en 'verkoopprys'", () => {
    const goedKoopkrag = geldig({ intro: "Inflasie vreet aan jou koopkrag oor tyd." });
    expect(valideerGids(goedKoopkrag, beginner)).toEqual([]);
    const goedVerkoopprys = geldig({ intro: "Die verkoopprys word deur vraag en aanbod bepaal." });
    expect(valideerGids(goedVerkoopprys, beginner)).toEqual([]);
  });

  // Rondte 3: die reël toets nou modus (sinbegin) i.p.v. blote woordverbod.
  // Vyf regte verwerpings, uit die goedgekeurde fiks self.
  describe("sinbegin-toets — vyf regte verwerpings", () => {
    it.each([
      ["Koop jou eerste aandeel vandag."],
      ["Begin belê vandag met R100."],
      ["Belê nou in die Top 40."],
      ["Kry jou rekening reg."],
      ["Dit is maklik. Koop net die ETF."],
    ])("verwerp: %s", (sin) => {
      const stout = geldig({ intro: sin });
      expect(valideerGids(stout, beginner).join(" ")).toMatch(/imperatief/i);
    });
  });

  // Vyf regte aanvaardings — die eerste twee is letterlik van die
  // generator-mislukkings (task-7-report.md): suiwer beskrywende sinne oor
  // hoe koop/verkoop werk, wat voorheen op die kaal woordverbod geval het.
  describe("sinbegin-toets — vyf regte aanvaardings", () => {
    it.each([
      ["Die keuse van watter aandele om te koop is 'n belangrike stap."],
      ["Wanneer jy 'n aandeel koop, betaal jy 'n fooi."],
      ["'n Belegger wat aandele verkoop, ontvang die opbrengs."],
      ["Die koopkrag van die rand het gedaal."],
      ["Om aandele te koop verg 'n rekening."],
    ])("aanvaar: %s", (sin) => {
      const goed = geldig({ intro: sin });
      expect(valideerGids(goed, beginner)).toEqual([]);
    });
  });

  it("vang 'n paragraaf wat self met 'Koop ' begin, al eindig die vorige veld nie op 'n punt nie", () => {
    // Bewys dat die toets per aparte string loop: as ons net oor die
    // saamgevoegde teks sou toets, sou hierdie paragraaf se "Koop" nie as
    // sinbegin tel nie, want die vorige stuk eindig sonder 'n punt.
    const stout = geldig({
      afdelings: [
        { kop: "Fooie", paragrawe: ["Fooie vreet aan klein bedrae sonder 'n punt hier"] },
        { kop: "Volgende stap", paragrawe: ["Koop die aandeel sodra jy reg is."] },
        { kop: "Tyd", paragrawe: ["Tyd doen die swaarste werk."] },
      ],
    });
    expect(valideerGids(stout, beginner).join(" ")).toMatch(/imperatief/i);
  });
});
