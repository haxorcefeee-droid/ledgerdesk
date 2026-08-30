import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <h1 className="text-3xl">Not found</h1>
      <Link className="mt-6 inline-block text-teal-800 underline" href="/">
        Back to overview
      </Link>
    </div>
  );
}
