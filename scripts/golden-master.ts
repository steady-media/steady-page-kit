// scripts/golden-master.ts — Paritätsbeweis: v1 (Git-Ref) und v2 (Arbeitsstand)
// rendern denselben Fixture-Feed; HTML/JSON-Diff modulo ASSET_VERSION/ts/Ports.
// Aufruf: node scripts/golden-master.ts <v1-ref>   (z. B. v1-final)
// Exit 0 = identisch; Exit 1 = Diff (Report in .gm-report/).
import { execSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const REF = process.argv[2];
if (!REF) { console.error("Usage: node scripts/golden-master.ts <v1-ref>"); process.exit(2); }

const FEED_XML = `<?xml version="1.0"?><rss><channel>
<title>GM-Publikation</title><description><![CDATA[GM-Feed.]]></description>
<item><title><![CDATA[Erster Beitrag]]></title><description><![CDATA[Teaser eins.]]></description>
<category>politik</category><media:content url="https://img.example/1.jpg"/>
<link>https://steady.page/p/1</link><guid>guid-eins-001</guid>
<pubDate>Mon, 17 Mar 2025 08:00:00 +0000</pubDate></item>
<item><title><![CDATA[Zweiter Beitrag]]></title><description><![CDATA[Teaser zwei.]]></description>
<category>kultur</category><guid>guid-zwei-002</guid>
<pubDate>Tue, 18 Mar 2025 08:00:00 +0000</pubDate></item>
</channel></rss>`;

const ROUTESET = ["/", "/posts/guid-eins-001", "/rubrik/politik", "/memberships",
  "/rss", "/sitemap.xml", "/robots.txt", "/api/config", "/api/search?q=zweiter",
  "/api/react?g=guid-eins-001"];

function normalize(s: string): string {
  return s
    .replace(/\?v=[A-Za-z0-9-]+/g, "?v=NORM")        // ASSET_VERSION-Buster
    .replace(/"ts":\s*\d+/g, '"ts":0')                // Zeitstempel in JSON
    .replace(/127\.0\.0\.1:\d+/g, "127.0.0.1:0")     // Ports
    .replace(/localhost:\d+/g, "localhost:0");         // Ports in console/HTML
}

async function boot(cmdCwd: string, env: Record<string, string>): Promise<{ base: string; kill: () => void }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["server/node.js"], {
      cwd: cmdCwd, env: { ...process.env, ...env, PORT: "0" }, stdio: ["ignore", "pipe", "inherit"],
    });
    let out = "";
    child.stdout.on("data", (d: Buffer) => {
      out += String(d);
      const m = out.match(/http:\/\/localhost:(\d+)/);
      if (m) resolve({ base: `http://127.0.0.1:${m[1]}`, kill: () => child.kill() });
    });
    child.on("exit", (code: number | null) => reject(new Error(`Server-Exit ${code} vor Port-Meldung:\n${out}`)));
    setTimeout(() => reject(new Error("Boot-Timeout")), 15000);
  });
}

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// 1. Fixture-Feed-Server
const feedSrv = http.createServer((_q, r) => { r.writeHead(200, { "content-type": "application/rss+xml" }); r.end(FEED_XML); });
await new Promise<void>(resolve => feedSrv.listen(0, "127.0.0.1", () => resolve()));
const feedUrl = `http://127.0.0.1:${(feedSrv.address() as { port: number }).port}/rss`;

// 2. v1-Worktree + Injektion (Config rein, sonst rendert v1 ggf. anders)
const wt = mkdtempSync(join(tmpdir(), "gm-v1-"));
execSync(`git worktree add --detach "${wt}" ${REF}`, { stdio: "inherit" });
cpSync(join(ROOT, "kit.config.js"), join(wt, "kit.config.js"));  // gleiche Publisher-Config
const dataDir = mkdtempSync(join(tmpdir(), "gm-data-"));         // GETEILTER KV-Stand
const envBoth: Record<string, string> = {
  FEED_URL: feedUrl,
  KIT_DATA_DIR: dataDir,
  KIT_ADMIN_CODE: "gm-code-123456",
  SITE_ORIGIN: "https://gm.test",
};

let failed = false;
try {
  const v1 = await boot(wt, envBoth);
  const v2 = await boot(ROOT, envBoth);
  mkdirSync(join(ROOT, ".gm-report"), { recursive: true });
  for (const route of ROUTESET) {
    const [a, b] = await Promise.all([fetch(v1.base + route), fetch(v2.base + route)]);
    const [ta, tb] = [normalize(await a.text()), normalize(await b.text())];
    const same = a.status === b.status && ta === tb;
    console.log(`${same ? "✅" : "❌"} ${route}  (v1 ${a.status} / v2 ${b.status})`);
    if (!same) {
      failed = true;
      const slug = route.replace(/[^a-z0-9]+/gi, "_") || "root";
      writeFileSync(join(ROOT, `.gm-report/${slug}.v1.txt`), ta);
      writeFileSync(join(ROOT, `.gm-report/${slug}.v2.txt`), tb);
    }
  }
  v1.kill(); v2.kill();
} finally {
  feedSrv.close();
  execSync(`git worktree remove --force "${wt}"`);
  rmSync(dataDir, { recursive: true, force: true });
}
if (failed) { console.error("\nDiffs unter .gm-report/ — diff <route>.v1.txt <route>.v2.txt"); process.exit(1); }
console.log("\nGolden-Master: v1 und v2 sind verhaltensgleich.");
