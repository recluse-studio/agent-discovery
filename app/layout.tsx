import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Recluse Studio Archive", description: "Search and read Recluse Studio's published articles through its public archive connector.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><header><a href="/">Recluse Studio / Archive</a><a href="https://recluse.studio/blog/">Read the blog ↗</a></header><main>{children}</main><footer><a href="/privacy">Privacy</a><a href="/terms">Use and attribution</a><a href="/support">Support</a><a href="https://github.com/recluse-studio/agent-discovery">GitHub ↗</a></footer></body></html>;
}
