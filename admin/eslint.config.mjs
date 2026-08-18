import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  /* Hou die kaart-renderaar uit die blaaierbundel.
     lib/kaart/render.tsx, raam.tsx en styles/* voer next/og in, wat satori,
     resvg en yoga.wasm saambring. Voer 'n "use client"-komponent hulle in,
     land al daardie kode in die kliëntbundel — en die bou SLAAG stilweg, so
     niks kla nie. Die redigeerder mag net spec.ts, register.ts, beeld.ts en
     tokens.ts invoer; dié is JSX-vry en kliënt-veilig. */
  /* Die kaart-style render deur satori na 'n PNG — daar is geen blaaier, geen
     LCP en geen next/image nie. Die <img>-waarskuwing is hier 'n vals positief. */
  {
    files: ["lib/kaart/**/*.tsx", "lib/*-render.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },

  {
    files: ["components/**/*.ts", "components/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/kaart/render", "@/lib/kaart/raam", "@/lib/kaart/styles/*", "@/lib/kaart-render"],
              message:
                "Bediener-alleen: dit sleep satori/resvg/yoga.wasm die blaaierbundel in. Gebruik @/lib/kaart/spec of @/lib/kaart/register.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
