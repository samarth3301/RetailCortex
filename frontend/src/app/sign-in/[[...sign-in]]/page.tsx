import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src="/Retail_icon.png" alt="RetailCortex Logo" className="w-7 h-7 object-contain" />
          <span className="font-semibold text-white tracking-tight text-lg">RetailCortex</span>
        </div>
        <p className="text-zinc-500 text-sm">Sign in to your workspace</p>
      </div>
      <SignIn />
    </main>
  );
}
