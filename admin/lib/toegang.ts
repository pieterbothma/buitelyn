/* Wie mag AP HQ gebruik. Die Supabase-projek is GEDEEL met buitelyn.com se
   publieke /markte-registrasie — enigiemand kan daar 'n rekening skep. 'n
   geldige sessie ("aangemeld") beteken dus NIKS oor of iemand AP HQ mag
   gebruik nie, en hierdie branch voeg kliënt-PII (/bestellings) plus die
   merkGestuur-skryfaksie agter daardie hek. Ons hou dus 'n eksplisiete
   toelatingslys apart van Supabase se auth-status.

   Faal toe, nooit oop nie: as die lys leeg of afwesig is, weier ons almal
   pleks daarvan om almal toe te laat. */
export function toegelaat(epos: string | undefined | null): boolean {
  const lys = (process.env.APHQ_TOEGELATE_EPOSTE ?? "").trim();
  if (!lys) {
    console.error("toegang: APHQ_TOEGELATE_EPOSTE ontbreek — alles geweier");
    return false;
  }
  if (!epos) return false;
  const genormaliseerd = epos.trim().toLowerCase();
  const toegelateLys = lys.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return toegelateLys.includes(genormaliseerd);
}
