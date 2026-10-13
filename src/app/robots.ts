import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/revendeurs-de-confiance"], disallow: ["/espace", "/pro", "/admin", "/api"] }],
  };
}
