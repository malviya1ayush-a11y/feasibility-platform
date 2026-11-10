import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Feasibility Platform",
  description:
    "Development feasibility intelligence for builders and PMCs in Maharashtra",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
