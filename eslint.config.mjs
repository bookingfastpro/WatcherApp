import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Interface en français : les apostrophes sont omniprésentes et sans risque (React échappe le texte).
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  { ignores: [".next/**", "node_modules/**", "storage/**", "next-env.d.ts", "prisma/*.mjs", "scripts/**/*.mjs"] },
];

export default config;
