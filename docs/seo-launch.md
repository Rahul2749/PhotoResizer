# Search launch checklist

Updated 4 November 2026. Domain: https://photoresizekaro.in.

## Implemented

- The editor follows a short descriptive H1. Photo/signature tabs are at the top; presets are optional and colour choices follow the workflow.
- The initial static HTML includes the tool, practical instructions, size guidance and FAQs. Crawlers do not need JavaScript to read that information.
- Each public page has its own title, description, canonical URL and matching social metadata. A 1200 × 630 PNG supplies link previews.
- Schema.org WebSite, WebPage and WebApplication data describe the real free tool. No invented ratings, testimonials or usage totals. Without real qualifying ratings/reviews, this does not promise Google's software-app rich result. FAQ content is provided for readers, without a promised FAQ search feature.
- Existing HTTPS, real 404 statuses, robots.txt, sitemap and immutable static assets remain in place. No tracking scripts or remote fonts were added.

## Verification

The static production build and 22 unit tests passed. Browser checks cover both photo/signature file buttons fitting without scrolling at 360 × 740, 390 × 844 and 1366 × 768. With JavaScript disabled, the descriptive H1, instructions, FAQ answers, metadata and JSON-LD remain in the initial HTML. Social image bytes/dimensions and per-page canonical/social URLs are checked. These are technical/content checks, not a measured ranking or Core Web Vitals score.

The first-screen desktop and phone screenshots are saved as `editor-first-desktop.png` and `editor-first-phone.png` in this directory.

## After deploying this revision

1. Open [Google Search Console](https://search.google.com/search-console/) using your own Google account. Add a **Domain** property for `photoresizekaro.in` and use the exact DNS TXT record Google supplies. The app cannot invent that ownership token. Preserve your existing A/MX/TXT records.
2. Once ownership is verified, submit `https://photoresizekaro.in/sitemap.xml` under Sitemaps. Inspect the homepage with URL Inspection, run the live test, check Google's rendered view, and request indexing if available. Indexing is not guaranteed and repeated requests do not guarantee faster crawling.
3. Inspect `/trust`, `/contact` and other important pages. Confirm titles/descriptions/canonicals reflect the intended live version. Recheck on a phone after deployment.
4. Monitor Search Console's page-indexing, performance and Core Web Vitals reports when data becomes available. Track impressions, clicks and actual search queries. Do not report a fabricated SEO score, ranking, conversion rate or field performance score.
5. Recheck official preset sources before their review deadline. Improve content from real questions sent to support. Add genuinely useful guides as needs emerge; avoid generating near-identical pages for every KB value or claiming every portal accepts the output.
6. Share the tool with relevant communities where useful and permitted. Do not buy links, create fake reviews, or promise first-place rankings.

The interface's Hindi toggle is a session choice on the same canonical URL. Separate translated URLs/hreflang should only be added with maintained, crawlable translations. No unimplemented Hindi URL or SearchAction is advertised.

## References

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): helpful content, discoverability, timing and ranking limitations.
- [Descriptive title links](https://developers.google.com/search/docs/appearance/title-link).
- [Software-app structured data requirements](https://developers.google.com/search/docs/appearance/structured-data/software-app).
