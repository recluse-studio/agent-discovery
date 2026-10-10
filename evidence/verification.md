# Public release verification

Verified 10 October 2026.

- Eleven focused tests pass: extraction and attribution, public-source restrictions, redirect rejection, refresh/removal behavior, search, pagination, package contents, Node stdio/HTTP, and the Web-standard hosted transport.
- Claude’s strict plugin and marketplace manifest validators pass.
- The connected Sites deployment succeeded. The public /api/mcp endpoint passed official MCP client initialization, tool discovery, search, fetch with pagination, latest_posts, and related_posts without credentials.
- The live archive contained 196 published articles. Five positive scenarios and three invalid-request cases passed. Results preserve Drew Wiberg’s byline and the canonical public article URL.
- Public homepage, health, privacy, attribution, support, and favicon routes returned HTTP 200.
- The public page rendered in the browser with Helvetica Neue and a minimum observed text size of 14 pixels. Source CSS defines the shared 12-pixel floor; the page’s narrow-screen rule introduces no smaller font sizes.
- GitHub private vulnerability reporting is enabled.

The Sites-managed /mcp route uses platform authentication. The public read-only connection is /api/mcp; installation files and release packages use that URL.

See public-check.json for the actual live results. Provider directory reviews have not been submitted: their portals require account sign-in. OpenAI’s account-dependent verification, challenge token, and supported-platform demo remain to be completed after login.
