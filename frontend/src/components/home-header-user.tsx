'use client';

import { UserButton, SignOutButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export function HomeHeaderUser() {
  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return (
      <>
        <Link
          href="/sign-in"
          className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-1.5"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="inline-flex h-9 items-center justify-center rounded-full bg-white px-5 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-[0.98]"
        >
          Get started
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        href="/dashboard"
        className="inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 text-xs font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98]"
      >
        Dashboard
      </Link>
      <SignOutButton redirectUrl="/">
        <button className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
          Sign out
        </button>
      </SignOutButton>
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'w-8 h-8 ring-2 ring-white/10 rounded-full',
          },
        }}
      />
    </>
  );
}
