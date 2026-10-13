import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const pg = new EmbeddedPostgres({
  databaseDir: "./data-watcher",
  user: "watcher",
  password: "watcher",
  port: 54329,
  persistent: true,
});

if (!existsSync("./data-watcher/PG_VERSION")) await pg.initialise();
await pg.start();
try {
  await pg.createDatabase("watcher");
} catch {
  /* existe déjà */
}
console.log("POSTGRES READY on 54329");
setInterval(() => {}, 1 << 30);
