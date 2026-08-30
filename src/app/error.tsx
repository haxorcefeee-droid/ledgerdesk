"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <h1 className="text-3xl">That did not post</h1>
      <p className="mt-4 text-[var(--muted)]">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="sans mt-6 rounded-md bg-teal-800 px-4 py-2 text-sm text-white"
      >
        Try again
      </button>
    </div>
  );
}
