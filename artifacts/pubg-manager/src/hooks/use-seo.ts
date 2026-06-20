import { useEffect } from "react";

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface SEOAggregateRating {
  ratingValue: number;
  reviewCount: number;
}

interface SEOReview {
  authorName: string;
  ratingValue: number;
  reviewText?: string;
  datePublished: string;
}

interface SEOFaq {
  question: string;
  answer: string;
}

interface SEOOptions {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  type?: "website" | "product";
  price?: string;
  sku?: string;
  breadcrumbs?: BreadcrumbItem[];
  noindex?: boolean;
  aggregateRating?: SEOAggregateRating | null;
  reviews?: SEOReview[];
  faqs?: SEOFaq[];
  isHomepage?: boolean;
}

const SITE_NAME = "CodexStocks";
const DEFAULT_TITLE = "CodexStocks – Trusted PUBG Mobile Account Marketplace";
const DEFAULT_DESCRIPTION =
  "Buy and sell PUBG Mobile accounts safely on CodexStocks. Verified listings, secure transfers, and a beginner-friendly experience you can trust.";
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

function removeJsonLd(id: string) {
  const el = document.head.querySelector<HTMLScriptElement>(`script[data-seo="${id}"]`);
  if (el) el.remove();
}

export function useSEO({
  title,
  description,
  image,
  canonical,
  type = "website",
  price,
  sku,
  breadcrumbs,
  noindex = false,
  aggregateRating,
  reviews,
  faqs,
  isHomepage = false,
}: SEOOptions) {
  const aggKey = aggregateRating
    ? `${aggregateRating.ratingValue}:${aggregateRating.reviewCount}`
    : "none";
  const reviewsKey = reviews?.length ?? 0;
  const faqsKey = faqs?.length ?? 0;

  useEffect(() => {
    const finalTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
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
    setMeta('meta[property="og:type"]', "property", "og:type", type === "product" ? "product" : "website");
    setMeta('meta[property="og:site_name"]', "property", "og:site_name", SITE_NAME);
    setMeta('meta[name="twitter:site"]', "name", "twitter:site", "@codexstocks");
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", finalTitle);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", finalDescription);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", finalImage);

    setCanonical(finalCanonical);

    setMeta('meta[name="robots"]', "name", "robots", noindex ? "noindex, nofollow" : "index, follow");

    if (type === "product" && price) {
      const productData: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: title,
        description: finalDescription,
        image: finalImage,
        url: finalCanonical,
        ...(sku ? { sku } : {}),
        brand: {
          "@type": "Brand",
          name: SITE_NAME,
        },
        offers: {
          "@type": "Offer",
          priceCurrency: "PKR",
          price,
          availability: "https://schema.org/InStock",
          url: finalCanonical,
          seller: {
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
          },
          // Digital delivery — free, instant, no physical shipment.
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: "PK",
            },
            shippingRate: {
              "@type": "MonetaryAmount",
              value: "0",
              currency: "PKR",
            },
            deliveryTime: {
              "@type": "ShippingDeliveryTime",
              handlingTime: {
                "@type": "QuantitativeValue",
                minValue: 0,
                maxValue: 1,
                unitCode: "DAY",
              },
              transitTime: {
                "@type": "QuantitativeValue",
                minValue: 0,
                maxValue: 0,
                unitCode: "DAY",
              },
            },
          },
          // Digital PUBG account credentials are transferred and cannot be
          // returned once delivered. MerchantReturnNotPermitted is accurate.
          // applicableCountry uses ISO 3166-1 alpha-2 codes (major markets).
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: ["PK", "IN", "US", "AE", "GB", "ID", "BD", "SA", "TR", "DE"],
            returnPolicyCategory:
              "https://schema.org/MerchantReturnNotPermitted",
          },
        },
      };

      if (aggregateRating && aggregateRating.reviewCount > 0) {
        productData.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: aggregateRating.ratingValue.toFixed(1),
          reviewCount: aggregateRating.reviewCount,
          bestRating: "5",
          worstRating: "1",
        };
      }

      if (reviews && reviews.length > 0) {
        productData.review = reviews.slice(0, 5).map((r) => ({
          "@type": "Review",
          author: { "@type": "Person", name: r.authorName },
          reviewRating: {
            "@type": "Rating",
            ratingValue: r.ratingValue,
            bestRating: "5",
            worstRating: "1",
          },
          ...(r.reviewText ? { reviewBody: r.reviewText } : {}),
          datePublished: r.datePublished,
        }));
      }

      setJsonLd("product", productData);
    } else {
      removeJsonLd("product");
    }

    if (breadcrumbs && breadcrumbs.length > 0) {
      setJsonLd("breadcrumb", {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      });
    } else {
      removeJsonLd("breadcrumb");
    }

    // FAQPage schema — rich result eligible when ≥1 Q&A provided
    if (faqs && faqs.length > 0) {
      setJsonLd("faq", {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      });
    } else {
      removeJsonLd("faq");
    }

    // Organization schema — homepage only, improves Knowledge Graph eligibility
    if (isHomepage) {
      setJsonLd("organization", {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.png`,
        sameAs: [],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          availableLanguage: ["English", "Urdu"],
        },
      });
    } else {
      removeJsonLd("organization");
    }
  }, [title, description, image, canonical, type, price, sku, breadcrumbs, noindex, aggKey, reviewsKey, faqsKey, isHomepage]);
}
