/* EasyBuy buyer data sync: profile, cart and wishlist live in MySQL (api/buyer-data.php).
 * The storefront (app.js) still works from in-memory state; this file loads the saved state after login,
 * saves every change back to the database, pre-fills checkout from the profile and routes #seller to the Seller Studio. */
(() => {
  "use strict";
  const boot = window.EASYBUY_BOOT || {};
  const sellerUrl = (boot.routes && boot.routes.seller) || "seller/";
  let syncedFor = null, ready = false, timer = null, profile = null;
  const last = { cart: "", wish: "" };
  const auth = () => window.EasyBuyAuth;
  const state = () => window.EasyBuyState;

  async function request(body, keepalive = false) {
    const response = await fetch("api/buyer-data.php", {
      method: "POST", credentials: "same-origin", keepalive,
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-Token": auth().getCsrf() },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Could not sync with the database.");
    return data;
  }

  async function start(buyer) {
    if (!state()) return;
    syncedFor = buyer.email; ready = false;
    try {
      // Union of what the browser holds (items added before login) and what the database already has.
      const data = await request({ action: "merge", cart: state().getCart(), wishlist: state().getWishlist() });
      if (syncedFor !== buyer.email) return; // logged out / switched account meanwhile
      profile = data.profile || buyer;
      last.cart = JSON.stringify(data.cart); last.wish = JSON.stringify(data.wishlist);
      state().setState({ cart: data.cart, wishlist: data.wishlist });
      ready = true;
      prefillCheckout();
    } catch (err) {
      console.warn("EasyBuy: could not load cart/wishlist from the database.", err);
    }
  }

  function onAuthChanged() {
    const buyer = auth() && auth().getBuyer && auth().getBuyer();
    if (buyer && buyer.email !== syncedFor) start(buyer);
    else if (!buyer && syncedFor) { syncedFor = null; ready = false; profile = null; last.cart = last.wish = ""; }
  }

  async function push(keepalive = false) {
    clearTimeout(timer); timer = null;
    if (!ready || !state() || !auth() || !auth().getBuyer()) return;
    const cart = state().getCart(), wishlist = state().getWishlist();
    const cartJson = JSON.stringify(cart), wishJson = JSON.stringify(wishlist);
    try {
      if (cartJson !== last.cart) { await request({ action: "set_cart", items: cart }, keepalive); last.cart = cartJson; }
      if (wishJson !== last.wish) { await request({ action: "set_wishlist", ids: wishlist }, keepalive); last.wish = wishJson; }
    } catch (err) {
      console.warn("EasyBuy: cart/wishlist were not saved to the database.", err);
    }
  }

  function prefillCheckout() {
    const form = document.querySelector("#paymentForm");
    if (!form || !profile || form.dataset.ebPrefilled) return;
    const set = (name, value) => {
      const el = form.elements[name];
      if (el && !el.value && value) { el.value = value; el.dispatchEvent(new Event("input", { bubbles: true })); }
    };
    set("name", profile.name);
    set("phone", profile.phone);
    set("address", [profile.address, profile.city, profile.pincode].filter(Boolean).join(", "));
    form.dataset.ebPrefilled = "1";
  }

  window.addEventListener("easybuy:auth-changed", onAuthChanged);
  window.addEventListener("easybuy:profile-changed", () => { if (auth() && auth().getBuyer()) profile = auth().getBuyer(); });
  window.addEventListener("easybuy:state-changed", () => { if (ready) { clearTimeout(timer); timer = setTimeout(() => push(), 500); } });
  window.addEventListener("pagehide", () => { if (timer) push(true); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && timer) push(true); });
  window.addEventListener("load", onAuthChanged);

  const app = document.querySelector("#app");
  if (app) new MutationObserver(prefillCheckout).observe(app, { childList: true, subtree: true });

  // Seller routing: #seller (or #seller-studio) opens the Seller Studio.
  const routeSeller = () => { if (/^#seller(-studio)?$/.test(location.hash)) location.href = sellerUrl; };
  window.addEventListener("hashchange", routeSeller);
  routeSeller();
})();
