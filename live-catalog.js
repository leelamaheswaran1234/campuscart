// Merge server-published seller listings into the existing EasyBuy catalogue.
// Existing bundled products and buyer-side features remain intact.
(async function () {
  try {
    const response = await fetch("api/products.php", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    const data = await response.json();
    if (!data.ok || !Array.isArray(data.products)) return;
    const products = window.EASYBUY_PRODUCTS;
    if (!Array.isArray(products)) return;
    for (const live of data.products) {
      const id = String(live.id);
      const index = products.findIndex((p) => String(p.id) === id);
      if (index >= 0) products[index] = { ...products[index], ...live };
      else products.unshift(live);
    }
    // Re-render current page so listings published by sellers appear without a reload.
    window.dispatchEvent(
      new CustomEvent("easybuy:live-catalog-loaded", {
        detail: { count: data.products.length },
      }),
    );
    if (location.hash === "#shop" || location.hash.startsWith("#shop?"))
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    else if (!location.hash || location.hash === "#home")
      window.dispatchEvent(new HashChangeEvent("hashchange"));
  } catch (error) {
    // Keep the original catalogue usable if the local API/database is not configured yet.
    console.warn(
      "EasyBuy live catalogue unavailable; showing bundled catalogue.",
      error,
    );
  }
})();
