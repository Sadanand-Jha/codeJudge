import { fileURLToPath } from "node:url";

const fluidUnitsPlugin = fileURLToPath(
  new URL("./src/lib/fluid-units.postcss.cjs", import.meta.url)
);

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    [fluidUnitsPlugin]: {},
  },
};

export default config;
