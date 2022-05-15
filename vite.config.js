import { defineConfig } from "vite";
import { replaceCodePlugin } from "vite-plugin-replace";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL ?? "/";

export default defineConfig(({ mode }) => {
  const sounds = fs
    .readdirSync("public/sounds")
    .map(
      (sound) =>
        `"${path
          .basename(sound, path.extname(sound))
          .toLowerCase()}": "${sound}"`,
    );

  return {
    build: { target: "esnext" },
    base: mode === "development" ? "/" : `${BASE_URL}`,
    plugins: [
      replaceCodePlugin({
        replacements: [
          { from: "__SOUNDS__", to: JSON.stringify(`{${sounds}}`) },
        ],
      }),
    ],
  };
});
