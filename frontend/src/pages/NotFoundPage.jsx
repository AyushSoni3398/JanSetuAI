import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <div className="text-5xl font-bold text-slate-700">404</div>
      <h2 className="mt-3 text-lg font-semibold text-slate-200">Page not found</h2>
      <p className="mt-1 text-sm text-slate-500">
        That page does not exist. It may have been a district id that is no longer
        in the database.
      </p>
      <Link
        to="/"
        className="mt-5 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        Back to home
      </Link>
    </main>
  );
}
