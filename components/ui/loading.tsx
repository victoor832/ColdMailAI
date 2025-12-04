export function LoadingSpinner() {
  return (
    <div className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  );
}

export function LoadingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="w-12 h-12 border-4 border-slate-300 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
        </div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Loading...</p>
      </div>
    </div>
  );
}

export function LoadingButton({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2">
      <LoadingSpinner />
      {children}
    </div>
  );
}
