const path = require("path");
const { spawnSync } = require("child_process");

const target = path.join(__dirname, "create-artist.js");
const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], {
  stdio: "inherit"
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
