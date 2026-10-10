import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { PublicArchive } from "./archive.mjs";
import { createArchiveServer } from "./mcp.mjs";

const server = createArchiveServer(new PublicArchive());
await server.connect(new StdioServerTransport());
