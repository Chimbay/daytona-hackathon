// Shared class strings. Kept out of Reveal.tsx because exports of a "use client" file become client references on the server.

// Soft translucent card that inherits color and font from whatever page hosts it.
export const surface =
  "rounded-3xl bg-white/45 ring-1 ring-current/10 backdrop-blur-md dark:bg-white/[0.06]";

export const sectionClass =
  "mx-auto w-full max-w-5xl px-4 py-20 font-[inherit] text-current sm:px-6 sm:py-28";

export const eyebrow = "text-xs font-medium uppercase tracking-[0.2em] opacity-80";

export const heading = "mt-3 text-3xl leading-tight font-[inherit] sm:text-4xl";
