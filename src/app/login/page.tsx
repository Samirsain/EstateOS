import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#0066cc] text-base font-bold text-white shadow-md">
            3%
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight-apple text-[#1d1d1f]">
            3% Real Estate
          </h1>
          <p className="mt-1 text-xs text-[#7a7a7a]">
            Sign in to the office management console.
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <LoginForm next={next ?? "/dashboard"} />
        </div>

        <p className="mt-6 text-center text-xs text-ink-muted">
          Access is role based. Contact the Managing Director for an account.
        </p>
      </div>
    </main>
  );
}
