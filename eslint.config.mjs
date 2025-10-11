import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Prefer warnings for dev ergonomics
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "consistent-return": "warn",
      "no-redeclare": "error",
    },
  },
];

export default eslintConfig;
