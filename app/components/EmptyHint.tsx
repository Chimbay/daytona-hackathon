// Shown on the board area until the first card lands.
export default function EmptyHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-zinc-400">
      Press Start mic and talk, or type an idea
    </p>
  );
}
