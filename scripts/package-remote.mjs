import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));

export function remoteConfigurations(endpoint) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.pathname !== "/mcp" || url.search || url.hash ||
      url.username || url.password || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("Provide the public HTTPS connector URL ending in /mcp.");
  }
  return {
    portable: {
      $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
      mcpServers: { "recluse-studio": { type: "streamable-http", url: url.href } },
    },
    claude: { mcpServers: { "recluse-studio": { type: "http", url: url.href } } },
  };
}

export async function packageRemote(endpoint, outputRoot = resolve(root, "dist")) {
  const configs = remoteConfigurations(endpoint);
  await mkdir(outputRoot, { recursive: true });
  const output = await mkdtemp(join(outputRoot, "remote-"));
  for (const format of ["portable", "claude"]) {
    const folder = join(output, format);
    await mkdir(folder);
    await cp(join(root, "skills"), join(folder, "skills"), { recursive: true });
    if (format === "portable") {
      await cp(join(root, "plugin.json"), join(folder, "plugin.json"));
      await writeFile(join(folder, "mcp.json"), JSON.stringify(configs.portable, null, 2) + "\n");
    } else {
      await mkdir(join(folder, ".claude-plugin"));
      await cp(join(root, ".claude-plugin/plugin.json"), join(folder, ".claude-plugin/plugin.json"));
      await writeFile(join(folder, ".mcp.json"), JSON.stringify(configs.claude, null, 2) + "\n");
    }
    const files = format === "portable" ? ["plugin.json", "mcp.json", "skills"] : [".claude-plugin", ".mcp.json", "skills"];
    execFileSync("zip", ["-q", "-r", join(output, "recluse-studio-" + format + ".zip"), ...files], { cwd: folder });
  }
  const submission = JSON.parse(await readFile(join(root, "submission.json"), "utf8"));
  await writeFile(join(output, "submission.json"), JSON.stringify({ ...submission, endpoint }, null, 2) + "\n");
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3) throw new Error("Usage: npm run package:remote -- https://your-connector-host/mcp");
  console.log(await packageRemote(process.argv[2]));
}
