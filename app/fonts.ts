import { Cormorant_Garamond, Figtree } from "next/font/google";

// The site's faces, shared by the landing page and the navbar so each loads once.
export const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-sky-serif",
});
export const sans = Figtree({ subsets: ["latin"], variable: "--font-sky-sans" });
