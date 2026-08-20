/* Een plek wat 'n fetch + JSON-antwoord hanteer.

   Hoekom dit bestaan: oral in die studio's het 'n try/catch die fetch ÉN
   res.json() saam toegevou. 'n 500 gee 'n HTML-foutbladsy terug, res.json()
   gooi op die "<", en die catch het dit as "Netwerkfout" gerapporteer. Die
   spotprent was weke lank stukkend met 'n boodskap wat na die internet gewys
   het terwyl die bediener op sharp geval het — en die eerste vermoede was
   OpenAI.

   Drie mislukkings, drie boodskappe:
     - die fetch self gooi        → daar is regtig geen verbinding nie
     - !res.ok                    → die bediener het geval; wys sy fout of sy status
     - 200 maar nie JSON nie      → die antwoord is nie wat ons verwag nie */

export type Haal<T> = { ok: true; data: T } | { ok: false; fout: string };

export async function haalJson<T>(url: string, init?: RequestInit): Promise<Haal<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    return { ok: false, fout: "Geen verbinding — kyk jou netwerk en probeer weer." };
  }

  /* Eers as teks: 'n foutbladsy is HTML, en res.json() sou hier gooi en die
     status wegsteek wat juis die nuttigste stukkie inligting is. */
  const rou = await res.text();
  let data: unknown = null;
  try {
    data = rou ? JSON.parse(rou) : null;
  } catch {
    /* nie JSON nie — hanteer hieronder */
  }

  const foutVeld = (data as { fout?: unknown } | null)?.fout;
  if (!res.ok) {
    return {
      ok: false,
      fout: typeof foutVeld === "string" ? foutVeld : `Bedienerfout ${res.status}.`,
    };
  }
  if (data === null) {
    return { ok: false, fout: `Onverwagte antwoord van die bediener (${res.status}).` };
  }
  if (typeof foutVeld === "string") return { ok: false, fout: foutVeld };
  return { ok: true, data: data as T };
}
