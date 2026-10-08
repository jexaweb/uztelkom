export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-500/30">
          <span className="text-2xl font-black text-white">UZ</span>
        </div>

        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600" />
        </div>

        <p className="mt-5 text-sm font-semibold text-slate-700">
          Yuklanmoqda...
        </p>

        <p className="mt-1 text-xs text-slate-400">
          UZTELECOM Dealer Control
        </p>
      </div>
    </div>
  );
}