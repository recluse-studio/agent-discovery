# First local build

Verified on 10 October 2026.

- Six archive checks passed: canonical paths and duplicates; article text and attribution; complete splitting of long paragraphs; shared refresh and withdrawn posts; refresh failure; search and curated-topic relations.
- The official MCP client passed tool discovery and all four tools through local stdio and Streamable HTTP. Article pagination, unknown article errors, foreign Host and Origin rejection, invalid JSON, request size, and HTTP method handling passed.
- The remote package check passed. Both generated ZIP formats contained only their manifests, connection configuration, and research skill. The test removed its temporary packages.
- Claude's strict plugin manifest validator passed.
- The live HTTP check loaded 194 public articles and retrieved attributed passages for Donner B1, agent memory, and knowledge management. Exact results are in live-check.json.
- A separate bounded source review confirmed the fixed public-origin boundary, absence of local draft access, attribution extraction, and pagination.

The two portable JSON manifests were checked against the published format by inspection. Automated JSON Schema validation was not run because the available Python environments lacked jsonschema.

Temporary test servers and subprocesses were closed. The public connector has not been hosted or submitted to a provider directory. No Instagram account was created.
