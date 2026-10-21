"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container narrow page-content">
      <div className="empty-state">
        <h1 className="page-title">A little pause.</h1>
        <p>Something didn’t load as expected. Please try again in a moment.</p>
        <button className="button" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
