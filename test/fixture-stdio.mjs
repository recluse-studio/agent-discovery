import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createArchiveServer } from "../src/mcp.mjs";
import { fixtureArchive } from "./fixtures.mjs";

await createArchiveServer(fixtureArchive).connect(new StdioServerTransport());
