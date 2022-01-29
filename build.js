const fs = require("fs");
const path = require("path");

const sounds =
  "{" +
  fs
    .readdirSync("sounds")
    .map((sound) => `"${path.basename(sound, path.extname(sound)).toLowerCase()}": "${sound}"`)
    .join(", ") +
  "}";

if (fs.existsSync("build")) {
  fs.rmSync("build", { recursive: true, force: true });
}
fs.mkdirSync("build");

const index = fs
  .readFileSync("index.html", "utf-8")
  .replace("/*[SOUNDS]*/", `const SOUNDS = JSON.parse(${JSON.stringify(sounds)});`);
fs.writeFileSync("build/index.html", index, "utf-8");
fs.copyFileSync(".nojekyll", "build/.nojekyll");
fs.cpSync("sounds", "build/sounds", { recursive: true });
