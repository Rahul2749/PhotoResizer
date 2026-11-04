export default function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    image: <><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/></>,
    shield: <><path d="M12 3 4 6v6c0 4 8 9 8 9s8-5 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></>,
    arrow: <><path d="M4 12h15m-6-6 6 6-6 6"/></>, check: <path d="m5 12 4 4L19 6"/>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/></>,
    rotate: <><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></>,
    sparkle: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.image}</svg>;
}
