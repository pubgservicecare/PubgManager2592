import { useEffect } from "react";

interface SEOOptions {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  type?: "website" | "product";
  price?: string;
}

const SITE_NAME = "PUBG Account Manager";
const DEFAULT_TITLE = "PUBG Account Manager — Premium Verified PUBG Mobile Accounts";
const DEFAULT_DESCRIPTION =
  "Pakistan's trusted marketplace for premium PUBG Mobile accounts. Buy verified accounts with rare skins, mythic items, X-Suits, and Glacier weapons.";
const SITE_URL = "https://www.codexstocks.org";

function setMeta(
  selector: string,
  attr: "name" | "property",
  attrValue: string,
  content: string,
) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id: string, data: object) {
  let el = document.head.querySelector<HTMLScriptElement>(`script[data-seo="${id}"]`);
  if (!el) {
    el = document.createElement("script");
    el.setAttribute("type", "application/ld+json");
    el.setAttribute("data-seo", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function useSEO({
  title,
  description,
  image,
  canonical,
  type = "website",
  price,
}: SEOOptions) {
  useEffect(() => {
    const finalTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
    const finalDescription = description || DEFAULT_DESCRIPTION;
    const finalImage = image || `${SITE_URL}/opengraph.jpg`;
    const finalCanonical = canonical
      ? `${SITE_URL}${canonical}`
      : `${SITE_URL}${window.location.pathname}`;

    document.title = finalTitle;

    setMeta('meta[name="description"]', "name", "description", finalDescription);
    setMeta('meta[property="og:title"]', "property", "og:title", finalTitle);
    setMeta('meta[property="og:description"]', "property", "og:description", finalDescription);
    setMeta('meta[property="og:image"]', "property", "og:image", finalImage);
    setMeta('meta[property="og:url"]', "property", "og:url", finalCanonical);
    setMeta('meta[property="og:type"]', "property", "og:type", type === "product" ? "og:product" : "website");
    setMeta('meta[property="og:site_name"]', "property", "og:site_name", SITE_NAME);
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", finalTitle);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", finalDescription);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", finalImage);

    setCanonical(finalCanonical);

    if (type === "product" && price) {
      setJsonLd("product", {
        "@context": "https://schema.org",
        "@type": "Product",
        name: title,
        description: finalDescription,
        image: finalImage,
        url: finalCanonical,
        offers: {
          "@type": "Offer",
          priceCurrency: "PKR",
          price,
          availability: "https://schema.org/InStock",
          seller: {
            "@type": "Organization",
            name: SITE_NAME,
          },
        },
      });
    }
  }, [title, description, image, canonical, type, price]);
}
