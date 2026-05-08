import { useEffect } from "react";

interface SEOOptions {
  title?: string;
  description?: string;
  image?: string;
}

const DEFAULT_TITLE = "PUBG Account Manager — Premium Verified PUBG Mobile Accounts";
const DEFAULT_DESCRIPTION = "Pakistan's trusted marketplace for premium PUBG Mobile accounts. Buy verified accounts with rare skins, mythic items, X-Suits, and Glacier weapons.";

function setMeta(selector: string, attr: "name" | "property", attrValue: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function useSEO({ title, description, image }: SEOOptions) {
  useEffect(() => {
    const finalTitle = title ? `${title} — PUBG Account Manager` : DEFAULT_TITLE;
    const finalDescription = description || DEFAULT_DESCRIPTION;

    document.title = finalTitle;
    setMeta('meta[name="description"]', "name", "description", finalDescription);
    setMeta('meta[property="og:title"]', "property", "og:title", finalTitle);
    setMeta('meta[property="og:description"]', "property", "og:description", finalDescription);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", finalTitle);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", finalDescription);
    if (image) {
      setMeta('meta[property="og:image"]', "property", "og:image", image);
      setMeta('meta[name="twitter:image"]', "name", "twitter:image", image);
    }
  }, [title, description, image]);
}
