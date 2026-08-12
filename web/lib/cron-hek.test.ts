import { describe, expect, it, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { cronGeweier } from "./cron-hek";

/* Die hek het twee kante, en albei moet getoets word:
   toe-val wanneer die geheim ontbreek (dit was die gat), en oop-gaan vir die
   egte cron (anders breek Production stil en niks loop nie). */

const oud = process.env.CRON_SECRET;
afterEach(() => {
  if (oud === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = oud;
});

const versoek = (auth?: string) =>
  new NextRequest("https://www.buitelyn.com/api/cron/nuus", {
    headers: auth ? { authorization: auth } : {},
  });

describe("cronGeweier", () => {
  it("weier met 503 wanneer CRON_SECRET nie gestel is nie", () => {
    delete process.env.CRON_SECRET;
    expect(cronGeweier(versoek())?.status).toBe(503);
  });

  /* Die eintlike gat: tien roetes het teen `Bearer ${undefined}` vergelyk,
     dus het presies hierdie kopstuk deurgekom. */
  it("weier 'Bearer undefined' wanneer CRON_SECRET nie gestel is nie", () => {
    delete process.env.CRON_SECRET;
    expect(cronGeweier(versoek("Bearer undefined"))?.status).toBe(503);
  });

  it("weier 'n verkeerde geheim met 401", () => {
    process.env.CRON_SECRET = "die-regte-een";
    expect(cronGeweier(versoek("Bearer verkeerd"))?.status).toBe(401);
  });

  it("weier wanneer daar glad geen kopstuk is nie", () => {
    process.env.CRON_SECRET = "die-regte-een";
    expect(cronGeweier(versoek())?.status).toBe(401);
  });

  // Die kant wat Production aan die lewe hou.
  it("laat die egte cron deur", () => {
    process.env.CRON_SECRET = "die-regte-een";
    expect(cronGeweier(versoek("Bearer die-regte-een"))).toBeNull();
  });
});
