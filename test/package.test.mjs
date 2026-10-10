import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { packageRemote, remoteConfigurations } from "../scripts/package-remote.mjs";

test("remote packages contain only the configured service and research skill", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "recluse-package-test-"));
  try {
    const output = await packageRemote("https://connector.example/mcp", temporary);
    for (const format of ["portable", "claude"]) {
      const archive = join(output, "recluse-studio-" + format + ".zip");
      const entries = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8" }).trim().split("\n");
      assert(entries.includes("skills/research-recluse/SKILL.md"));
      assert(entries.every((entry) => /^(plugin\.json|mcp\.json|\.claude-plugin\/|\.mcp\.json|skills\/)/.test(entry)));
    }
    const portable = JSON.parse(await readFile(join(output, "portable/mcp.json"), "utf8"));
    assert.equal(portable.mcpServers["recluse-studio"].url, "https://connector.example/mcp");
    const claude = JSON.parse(await readFile(join(output, "claude/.mcp.json"), "utf8"));
    assert.equal(claude.mcpServers["recluse-studio"].type, "http");
    for (const url of ["http://remote.example/mcp", "https://localhost/mcp", "https://remote.example/other", "https://user:secret@remote.example/mcp"]) {
      assert.throws(() => remoteConfigurations(url));
    }
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
