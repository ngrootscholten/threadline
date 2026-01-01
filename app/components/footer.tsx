"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export function Footer() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && session;

  return (
    <footer className="border-t border-slate-800 mt-24">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-slate-500">
            <p>Threadline - Active Documentation, Parallel AI Checks, and Full Auditability</p>
          </div>
          <div className="flex items-center gap-6">
            {isAuthenticated && (
              <Link
                href="/product"
                className="text-slate-400 hover:text-white transition-colors"
              >
                How It Works
              </Link>
            )}
            <Link
              href="/docs/getting-started"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Help
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

