"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main className="status-page" role="alert"><h1>Something interrupted the editor.</h1><p>Your original files are unchanged. Try again, or reload the page and choose the files again. Reloading clears the current edits.</p><button className="choose-button" onClick={reset}>Try again</button><a href="mailto:support@photoresizekaro.in">Contact support</a></main>;
}
