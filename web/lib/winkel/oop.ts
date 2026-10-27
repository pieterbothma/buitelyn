/* Die winkel se aan/af-skakelaar (2026-10-27: alles uitverkoop, winkel toe).
   Op false verdwyn elke Winkel-skakel uit die nav en voetstuk, /winkel en sy
   bladsye herlei na die tuisblad, en /api/winkel/tjek weier nuwe bestellings.
   Twee dinge bly doelbewus oop: /winkel/bevestig (Paystack se terugkeerblad —
   iemand wat reeds betaal het, moet sy bevestiging sien) en die Paystack-
   webhook. Weer oop = true en ontplooi. */
export const WINKEL_OOP = false;
