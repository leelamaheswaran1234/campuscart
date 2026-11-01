(() => {
  const toggle = document.getElementById("ebMenuToggle");
  const nav = document.getElementById("ebNavPanel");
  if (!toggle || !nav) return;
  const sessionKeys = [
    "easybuy_js_session_v1",
    "eb_user",
    "easybuy_user",
    "eb_session",
  ];
  function hasLogin() {
    for (const key of sessionKeys) {
      try {
        // The JavaScript login stores its active session in sessionStorage as an email string.
        const value =
          key === "easybuy_js_session_v1"
            ? sessionStorage.getItem(key) || localStorage.getItem(key)
            : localStorage.getItem(key);
        if (value && value !== "null" && value !== "undefined") {
          // The local EasyBuy demo session stores a plain email, not JSON.
          if (key === "easybuy_js_session_v1" && typeof value === "string" && value.includes("@")) return true;
          const parsed = JSON.parse(value);
          if (
            typeof parsed === "object" &&
            parsed &&
            (parsed.email || parsed.id || parsed.user || parsed.role)
          )
            return true;
          if (typeof parsed === "string" && parsed.length > 2) return true;
        }
      } catch (_) {}
    }
    return false;
  }
  function syncNav() {
    const loggedIn = hasLogin();
    nav.querySelectorAll("[data-auth-only]").forEach((el) => {
      el.hidden = !loggedIn;
    });
    nav.querySelectorAll("[data-guest-nav]").forEach((el) => {
      el.hidden = loggedIn;
    });
    // Categories stays public; the expanded private menus only appear for a detected session.
  }
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("eb-nav-visible");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Close navigation menu" : "Open navigation menu",
    );
    toggle.textContent = open ? "✕" : "☰";
  });
  const menuButtons = [...nav.querySelectorAll("[data-menu-parent]")];
  function closeDropdowns(except = null) {
    nav.querySelectorAll(".eb-nav-group.eb-open").forEach((group) => {
      if (group === except) return;
      group.classList.remove("eb-open");
      group.querySelector("[data-menu-parent]")?.setAttribute("aria-expanded", "false");
    });
  }
  menuButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const group = button.closest(".eb-nav-group");
      const open = !group.classList.contains("eb-open");
      closeDropdowns(group);
      group.classList.toggle("eb-open", open);
      button.setAttribute("aria-expanded", String(open));
    });
  });
  // Close dropdowns when the user taps anywhere outside the open menu.
  document.addEventListener("click", (event) => {
    if (!nav.contains(event.target)) closeDropdowns();
    else if (!event.target.closest(".eb-nav-group")) closeDropdowns();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDropdowns();
      nav.classList.remove("eb-nav-visible");
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "☰";
    }
  });
  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (link) {
      nav
        .querySelectorAll("a")
        .forEach((a) => a.removeAttribute("aria-current"));
      link.setAttribute("aria-current", "page");
      nav.classList.remove("eb-nav-visible");
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "☰";
    }
  });
  // Lightweight cart micro-interaction when the visible count changes.
  const count = document.getElementById("cartCount");
  if (count && window.MutationObserver) {
    new MutationObserver(() => {
      const cart = count.closest(".cartbtn") || count;
      cart.classList.remove("eb-cart-bump");
      void cart.offsetWidth;
      cart.classList.add("eb-cart-bump");
    }).observe(count, { childList: true, characterData: true, subtree: true });
  }
  window.addEventListener("storage", syncNav);
  window.addEventListener("easybuy:auth-changed", syncNav);
  window.addEventListener("hashchange", () => {
    const current = (location.hash || "#home").split("?")[0];
    nav.querySelectorAll('a[href^="#"]').forEach((a) => {
      if (a.getAttribute("href") === current)
        a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  });
  window.addEventListener("hashchange", syncNav);
  syncNav();
})();
