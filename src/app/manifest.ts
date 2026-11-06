import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "English Mastery",
    short_name: "Mastery",
    description: "Personal AI English coach — C2, TOEFL iBT and teaching skills.",
    start_url: "/today",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
