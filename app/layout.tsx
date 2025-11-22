import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevThreadline - Workflow Analytics",
  description: "Monitor your GitHub and GitLab workflow metrics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

