# Provider submission packet

Prepared on 10 October 2026 for the Recluse Studio public archive connector.

## Materials

- listing.json: listing copy, public website and policy URLs, endpoint, and release notes.
- logo.png: 512 × 512 pixel PNG logo.
- test-cases.json: five positive cases and three negative cases.
- ../submission.json: authentication, data access, and tool summary.
- ../README.md: setup, tool inputs and outputs, request bounds, refresh behavior, and support.
- ../evidence/public-check.json: anonymous public endpoint verification, when present.
- GitHub Releases: portable Agent Plugins and Claude ZIP packages.

## Current portal status

No provider review submission has been sent. The public GitHub release and hosted service are distributed independently of directory review.

| Provider | Submission portal | Observed account step |
| --- | --- | --- |
| OpenAI | https://platform.openai.com/plugins | Microsoft sign-in requests the owner’s fingerprint, PIN, or security key. |
| Claude | https://claude.ai/directory/manage/new | Session requires sign-in again. |
| Muse | https://muse.ai/platform | Connector platform requests sign-in with an email or mobile number. |

## OpenAI

Upload the portable ZIP. Use listing.json and test-cases.json. The portal’s developer verification, selected organization/project, category, domain challenge, and policy attestations depend on the signed-in account. Publish the exact domain challenge supplied by the portal at /.well-known/openai-apps-challenge; no challenge token has been issued yet.

The review also requires a recording that demonstrates the test cases and plugin functionality. Record the supported-platform interaction after connection, then add its accessible URL to demoVideoURL. The MCP verification script supplies service evidence; it does not stand in for that recording.

Sources: https://developers.openai.com/plugins/deploy/submission and https://developers.openai.com/plugins/deploy/connect-chatgpt.

## Claude

Submit the GitHub-hosted plugin bundle or its single remote MCP connector. The plugin includes a source-reading skill. Public tool discovery exposes descriptions, titles, and read-only annotations. The portal requires the developer’s plan/account eligibility, verified contacts and control of the service, and acceptance of the Software Directory Terms.

Sources: https://claude.com/resources/articles/build-plugins-for-claude and https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy.

## Muse

Use the public endpoint, tool documentation, data-handling description, privacy and attribution URLs, support channels, and examples. The signed-in portal requests business verification and authority to submit, developer terms, and reviewer demonstration material. This connector uses public read-only data and requires no integration credentials or user account.

Source: https://muse.ai/platform/docs.

## Data-processing answers

The service receives only the tool arguments used to answer a request. It reads the public Recluse Studio semantic index and article pages. Application code stores article text in memory and does not persist queries or conversations. It has no user database, advertising analytics, private-account integration, purchase tool, or write tool. Hosting providers process request traffic under their own policies. Article content remains attributed to its original author. Cache refresh and tool error behavior are documented in the main README.
