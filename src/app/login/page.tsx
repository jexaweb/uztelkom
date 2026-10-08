"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, LogIn, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!login.trim() || !password) {
      setError("Login va parolni kiriting");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: login.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Login yoki parol noto‘g‘ri");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setError("Server bilan bog‘lanishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
              <LogIn className="h-8 w-8 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-white">
              UZTELECOM
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Boshqaruv paneliga kirish
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Login */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Login
              </label>

              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Loginni kiriting"
                  autoComplete="username"
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-800 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Parol
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolni kiriting"
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-800 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Tekshirilmoqda...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Kirish
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Faqat ruxsat berilgan foydalanuvchilar kirishi mumkin
          </p>
        </div>
      </div>
    </main>
  );
}