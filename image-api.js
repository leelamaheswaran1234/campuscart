/* EasyBuy live product image API
   Books: Google Books Volume API (front-cover thumbnails only).
   Other categories: Wikimedia Commons MediaSearch API (licensed media, where available).
   Requests are lazy-loaded as product cards enter view; results are cached and image URLs are deduplicated.
   API search results are not guaranteed to match every exact retail SKU; local product art remains fallback.
*/
(() => {
  "use strict";
  const products = window.EASYBUY_PRODUCTS || [];
  const byId = new Map(products.map((p) => [String(p.id), p]));
  const config = window.EASYBUY_IMAGE_API_CONFIG || {};
  if (config.enabled === false) return;
  const cacheKey = "eb_live_product_images_v3";
  const readCache = () => {
    try {
      const v = JSON.parse(localStorage.getItem(cacheKey) || "{}");
      return v && typeof v === "object" ? v : {};
    } catch (_) {
      return {};
    }
  };
  const cache = readCache(),
    usedUrls = new Set();
  Object.values(cache).forEach((v) => {
    const u = typeof v === "string" ? v : v?.url;
    if (u) usedUrls.add(u);
  });
  const pending = new Set(),
    failed = new Set(),
    queue = [];
  let active = 0;
  const MAX_ACTIVE = 2;
  const clean = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const stop = new Set([
    "edition",
    "student",
    "used",
    "new",
    "good",
    "very",
    "with",
    "for",
    "and",
    "the",
    "book",
    "guide",
    "product",
    "campus",
    "college",
    "item",
    "set",
    "pack",
    "model",
  ]);
  const words = (s) =>
    clean(s)
      .split(" ")
      .filter((w) => w.length > 2 && !stop.has(w));
  const isBook = (p) =>
    String(p?.category || "").toLowerCase() === "books" ||
    /\b(book|textbook|programming guide|crash course|complete reference)\b/i.test(
      String(p?.name || ""),
    );
  const categoryTerms = {
    Electronics: "consumer electronics computer accessories",
    Books: "programming textbook front cover",
    "Stationery Kits": "stationery pens pencils notebooks school supplies",
    Calculators: "scientific calculator handheld calculator",
    "Lab Equipment": "laboratory equipment scientific instrument",
    Accessories: "student backpack everyday accessories",
    "T-Shirts": "t shirt clothing apparel",
    Bags: "backpack school bag luggage",
  };
  function apply(id, url) {
    if (!url) return;
    document.querySelectorAll("img[data-eb-product-image]").forEach((img) => {
      if (
        String(img.dataset.ebProductImage) === String(id) &&
        img.dataset.ebApiApplied !== "1"
      ) {
        img.dataset.ebApiApplied = "1";
        img.src = url;
        img.dataset.ebImageSource = "live-api";
      }
    });
  }
  function score(name, title) {
    const a = new Set(words(name)),
      b = new Set(words(title));
    if (!a.size || !b.size) return 0;
    let hit = 0;
    a.forEach((w) => {
      if (b.has(w)) hit++;
    });
    return hit / a.size;
  }
  async function getBook(p) {
    const name = String(p.name || "")
      .replace(/[—–-]\s*(edition|student edition).*$/i, "")
      .trim();
    const url =
      "https://www.googleapis.com/books/v1/volumes?" +
      new URLSearchParams({
        q: "intitle:" + name,
        printType: "books",
        maxResults: "20",
        orderBy: "relevance",
      });
    const r = await fetch(url);
    if (!r.ok) throw Error("Google Books API " + r.status);
    const data = await r.json();
    const candidates = (data.items || [])
      .map((item) => {
        const v = item.volumeInfo || {},
          im = v.imageLinks || {};
        let u =
          im.large ||
          im.medium ||
          im.thumbnail ||
          im.small ||
          im.smallThumbnail ||
          "";
        u = u.replace(/^http:/i, "https:").replace("&edge=curl", "");
        return {
          url: u,
          title: v.title || "",
          score: score(name, v.title || ""),
        };
      })
      .filter((x) => x.url && /^https:\/\//i.test(x.url) && x.score >= 0.3)
      .sort((a, b) => b.score - a.score);
    return candidates.find((x) => !usedUrls.has(x.url)) || null;
  }
  async function getCommons(p) {
    const name = String(p.name || "")
      .replace(/[—–-]\s*(edition|student edition).*$/i, "")
      .trim();
    const cat = String(p.category || "");
    const terms = categoryTerms[cat] || "product photo";
    const q = `filetype:bitmap "${name}" ${terms}`;
    const url =
      "https://commons.wikimedia.org/w/api.php?" +
      new URLSearchParams({
        action: "query",
        format: "json",
        origin: "*",
        generator: "search",
        gsrsearch: q,
        gsrnamespace: "6",
        gsrlimit: "20",
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "720",
      });
    const r = await fetch(url);
    if (!r.ok) throw Error("Wikimedia Commons API " + r.status);
    const data = await r.json();
    const pages = Object.values(data.query?.pages || {})
      .map((page) => {
        const ii = page.imageinfo?.[0] || {},
          meta = ii.extmetadata || {};
        const title = String(page.title || "").replace(/^File:/, "");
        return {
          url: ii.thumburl || ii.url || "",
          title,
          score: score(name, title),
          license: meta.LicenseShortName?.value || "",
          sourcePage: meta.ImageDescription?.source || "",
        };
      })
      .filter((x) => x.url && /^https:\/\//i.test(x.url) && x.score >= 0.22)
      .sort((a, b) => b.score - a.score);
    return pages.find((x) => !usedUrls.has(x.url)) || null;
  }
  async function lookup(p) {
    const id = String(p.id),
      old = cache[id],
      oldUrl = typeof old === "string" ? old : old?.url;
    if (oldUrl) {
      apply(id, oldUrl);
      return;
    }
    if (pending.has(id) || failed.has(id)) return;
    pending.add(id);
    try {
      let result = isBook(p) ? await getBook(p) : await getCommons(p);
      if (result?.url && !usedUrls.has(result.url)) {
        const record = {
          url: result.url,
          source: isBook(p) ? "Google Books" : "Wikimedia Commons",
          title: result.title || p.name,
          license: result.license || "",
        };
        cache[id] = record;
        usedUrls.add(result.url);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(cache));
        } catch (_) {}
        apply(id, result.url);
      } else failed.add(id);
    } catch (err) {
      console.warn(
        "EasyBuy image API unavailable; retaining the product-specific local image:",
        p.name,
        err,
      );
      failed.add(id);
    } finally {
      pending.delete(id);
      active--;
      pump();
    }
  }
  function pump() {
    while (active < MAX_ACTIVE && queue.length) {
      active++;
      lookup(queue.shift());
    }
  }
  const queued = new Set();
  function queueImage(img) {
    const id = String(img.dataset.ebProductImage || ""),
      p = byId.get(id);
    if (!p || queued.has(id) || pending.has(id) || failed.has(id)) return;
    const old = cache[id],
      u = typeof old === "string" ? old : old?.url;
    if (u) {
      apply(id, u);
      return;
    }
    queued.add(id);
    queue.push(p);
    pump();
  }
  function scan() {
    document
      .querySelectorAll("img[data-eb-product-image]")
      .forEach((img) => (observer ? observer.observe(img) : queueImage(img)));
  }
  const observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) =>
            entries.forEach((e) => {
              if (e.isIntersecting) {
                queueImage(e.target);
                observer.unobserve(e.target);
              }
            }),
          { rootMargin: "420px 0px" },
        )
      : null;
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  else scan();
  const target = document.querySelector("#app");
  if (target && "MutationObserver" in window)
    new MutationObserver(scan).observe(target, {
      childList: true,
      subtree: true,
    });
  window.EasyBuyImages = {
    sourceFor: (id) => cache[String(id)] || null,
    clearCache: () => {
      localStorage.removeItem(cacheKey);
      location.reload();
    },
  };
})();
