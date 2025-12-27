"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Show loading or redirecting state
  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  // If authenticated, we're redirecting (component will unmount)
  if (status === "authenticated") {
    return null;
  }

  // Show the public landing page for unauthenticated users
  return (
    <main className="min-h-screen">
      <section className="max-w-4xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-green-400 to-white bg-clip-text text-transparent">
            The Gap in Modern Tooling
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Writing code is faster than ever, but verifying it requires new techniques. 
            Feedback loops happen too late—only after you've pushed code and lost context. 
            AI code reviews are trained on the entire Internet, and don't focus on nuances of your teams and tech.
          </p>
        </div>

        <div className="space-y-12 mb-16">
          <div>
            <h2 className="text-3xl font-semibold mb-4 text-green-400">From Advice to Authority</h2>
            <p className="text-slate-300 leading-relaxed">
              Threadline doesn't just suggest; it validates. By running during the build process, 
              it creates a traceable audit log of exactly why code was allowed into your main branch.
            </p>
            <p className="text-slate-300 leading-relaxed mt-4">
              Powerful, but you can't audit them. Did they actually check each important thing you care about?
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-semibold mb-4 text-green-400">Deterministic, Not Advisory</h2>
            <p className="text-slate-300 leading-relaxed">
              Unlike chat-based AI that gives different answers each time, Threadline provides consistent, 
              repeatable checks. The same code change will always get the same result—making it suitable 
              for CI/CD pipelines and automated workflows.
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-3 bg-green-400 text-black font-semibold rounded-lg hover:bg-green-500 transition-all"
          >
            Get Started
          </Link>
        </div>
      </section>
    </main>
  );
}
