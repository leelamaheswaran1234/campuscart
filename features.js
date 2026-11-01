(() => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    app = $("#app"),
    products = window.EASYBUY_PRODUCTS || [];
  const categoryOrder = [
    "Books",
    "Stationery Kits",
    "Calculators",
    "Lab Equipment",
    "Electronics",
    "Accessories",
    "T-Shirts",
    "Bags",
  ];
  const categories = categoryOrder.filter((c) =>
    products.some((p) => p.category === c),
  );
  const colleges = [
    "SASTRA University",
    "Anna University",
    "Indian Institute of Technology Madras (IIT Madras)",
    "SRM Institute of Science and Technology",
    "VIT Chennai",
    "University of Madras",
    "Saveetha Institute of Medical and Technical Sciences",
    "Annamalai University",
    "Bharathiar University",
    "Bharathidasan University",
    "Hindustan Institute of Technology and Science",
    "Vel Tech University",
    "Chennai Institute of Technology",
    "Rajalakshmi Engineering College",
    "Sri Sairam Engineering College",
    "R.M.K. Engineering College",
    "Madras Institute of Technology (MIT Chennai)",
    "PSG College of Technology",
    "Kumaraguru College of Technology",
    "Coimbatore Institute of Technology",
    "Loyola College Chennai",
    "Presidency College Chennai",
    "Ethiraj College for Women",
    "DG Vaishnav College",
    "Ambattur, Chennai",
  ];
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const stored = (k, def) => {
    try {
      return JSON.parse(localStorage.getItem(k) || JSON.stringify(def));
    } catch {
      return def;
    }
  };
  function addShell() {
    if ($("#ebFloatingCategories")) return;
    const wrap = document.createElement("div");
    wrap.id = "ebFloatingCategories";
    wrap.className = "eb-floating-categories";
    wrap.innerHTML = `<button id="ebFloatingToggle" class="eb-floating-toggle" type="button" aria-expanded="false" aria-controls="ebFloatingPanel"><span>☷</span><span>Categories</span><span class="eb-floating-chevron">⌄</span></button><div id="ebFloatingPanel" class="eb-floating-panel" hidden><div class="eb-floating-panel-title">Shop by category</div>${categories.map((c) => `<a href="#shop?category=${encodeURIComponent(c)}"><span class="eb-cat-emoji">${{ Electronics: "🎧", Books: "📚", "Stationery Kits": "✏️", Calculators: "🧮", "Lab Equipment": "🧪", Accessories: "🎒", "T-Shirts": "👕", Bags: "👜" }[c] || "🛍️"}</span><span>${esc(c)}</span><span class="eb-side-arrow">›</span></a>`).join("")}<div class="eb-floating-shortcuts" aria-label="Marketplace navigation">
<a href="#home"><span>⌂</span> Home</a>
<a href="#shop"><span>▦</span> All Categories</a>
<a href="#sell"><span>＋</span> Sell Product</a>
<a href="#tracking"><span>⌖</span> Tracking</a>
<a href="#orders"><span>▤</span> Orders</a>
<a href="#location"><span>📍</span> Location / Pickup</a>
<a href="#account"><span>♙</span> My Account</a>
<a href="#orders"><span>◷</span> Order History</a>
<a href="#messages"><span>✉</span> Buyer / Seller Messages</a>
<a href="#refunds"><span>↩</span> Refund Requests</a>
<a href="#logout"><span>↪</span> Logout</a>
</div></div>`;
    document.body.append(wrap);
    const btn = $("#ebFloatingToggle"),
      panel = $("#ebFloatingPanel");
    const close = () => {
      panel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      wrap.classList.remove("expanded");
    };
    btn.addEventListener("click", () => {
      const opening = panel.hidden;
      panel.hidden = !opening;
      btn.setAttribute("aria-expanded", String(opening));
      wrap.classList.toggle("expanded", opening);
    });
    panel
      .querySelectorAll("a")
      .forEach((a) => a.addEventListener("click", close));
    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }
  function pageHead(kicker, title, desc) {
    return `<div class="wrap page-title"><span class="eyebrow">${kicker}</span><h1>${title}</h1><p style="color:var(--muted)">${desc}</p></div>`;
  }
  function mapsSearchUrl(place) {
    return (
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(place)
    );
  }
  function directionsUrl(origin, destination, mode = "driving") {
    return (
      "https://www.google.com/maps/dir/?api=1&origin=" +
      encodeURIComponent(origin) +
      "&destination=" +
      encodeURIComponent(destination) +
      "&travelmode=" +
      encodeURIComponent(mode)
    );
  }
  function collegeOptions() {
    return (
      '<option value="">Choose a college / place</option>' +
      colleges
        .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
        .join("")
    );
  }
  function locationPage() {
    app.innerHTML =
      pageHead(
        "LIVE CAMPUS MAP",
        "College location & directions",
        "Enter a starting point and college. The map geocodes both places and calculates route distance when a routing service supports the selected mode.",
      ) +
      `<div class="wrap"><div class="eb-feature-grid"><section class="eb-panel"><h2>📍 Route planner</h2><form id="ebMapForm"><div class="field"><label for="ebCollege">College / destination</label><select id="ebCollege">${collegeOptions()}</select></div><div class="field"><label for="ebCustomPlace">Or enter exact destination</label><input id="ebCustomPlace" placeholder="College name, campus gate or address"></div><div class="field"><label for="ebOrigin">Starting point</label><input id="ebOrigin" placeholder="Your current location or address" required></div><div class="field"><label for="ebTravelMode">Travel mode</label><select id="ebTravelMode"><option value="driving">🚗 Car / bike (road route)</option><option value="cycling">🚲 Cycle</option><option value="walking">🚶 Walk</option><option value="transit">🚌 Bus / public transport</option></select></div><div class="eb-action-row"><button class="primary" type="submit">Calculate route ↗</button><button class="secondary" id="ebUseLocation" type="button">Use my location</button></div><p class="eb-help" id="ebLocationMsg">Enter your starting point and choose your college. Browser location requires permission.</p><div id="ebRouteSummary" class="eb-route-summary" hidden></div></form></section><section class="eb-panel eb-map-panel"><div id="ebLeafletMap" class="eb-leaflet-map" role="region" aria-label="Interactive college route map"></div><div class="eb-action-row"><a id="ebOpenMap" class="primary" href="https://www.openstreetmap.org/" target="_blank" rel="noopener">Open map ↗</a><a id="ebGetDirections" class="secondary" href="https://www.google.com/maps" target="_blank" rel="noopener">Step-by-step directions ↗</a></div><p class="eb-help">Map data © OpenStreetMap contributors. Route availability depends on public routing servers.</p></section></div><section class="eb-panel eb-college-list"><h2>Popular college destinations</h2><p class="eb-help">Choose a destination, then enter your origin or use device location.</p><div class="eb-college-chips">${colleges
        .slice(0, 16)
        .map(
          (c) =>
            `<button type="button" class="eb-college-chip" data-college="${esc(c)}">${esc(c)}</button>`,
        )
        .join("")}</div></section></div>`;
    const sel = $("#ebCollege"),
      custom = $("#ebCustomPlace"),
      origin = $("#ebOrigin"),
      mode = $("#ebTravelMode"),
      msg = $("#ebLocationMsg"),
      summary = $("#ebRouteSummary");
    let map = null,
      routeLayer = null,
      startMarker = null,
      endMarker = null,
      leafletReady = false;
    const loadCss = () =>
      new Promise((resolve) => {
        if (document.querySelector("link[data-eb-leaflet]")) return resolve();
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        l.dataset.ebLeaflet = "1";
        l.onload = resolve;
        l.onerror = resolve;
        document.head.append(l);
      });
    const loadJs = () =>
      new Promise((resolve, reject) => {
        if (window.L) return resolve();
        const s = document.createElement("script");
        s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.onload = resolve;
        s.onerror = () => reject(Error("Map library could not load"));
        document.head.append(s);
      });
    async function initMap() {
      try {
        await loadCss();
        await loadJs();
        map = L.map("ebLeafletMap").setView([13.0827, 80.2707], 10);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        leafletReady = true;
        setTimeout(() => map.invalidateSize(), 100);
      } catch (e) {
        $("#ebLeafletMap").innerHTML =
          '<div class="eb-map-fallback">Map could not load. Use the directions link below or check internet access.</div>';
      }
    }
    initMap();
    async function geocode(q) {
      if (/^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(q)) {
        const a = q.split(",").map(Number);
        return { lat: a[0], lon: a[1], name: q };
      }
      const u =
        "https://nominatim.openstreetmap.org/search?" +
        new URLSearchParams({ q, format: "jsonv2", limit: "1" });
      const r = await fetch(u, { headers: { Accept: "application/json" } });
      if (!r.ok)
        throw Error("Location search service unavailable (" + r.status + ")");
      const a = await r.json();
      if (!a.length)
        throw Error("Could not find: " + q + ". Add the city or full address.");
      return {
        lat: Number(a[0].lat),
        lon: Number(a[0].lon),
        name: a[0].display_name,
      };
    }
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    async function routeBetween(a, b, profile) {
      const host =
        profile === "driving"
          ? "https://router.project-osrm.org/route/v1/driving/"
          : profile === "cycling"
            ? "https://routing.openstreetmap.de/routed-bike/route/v1/driving/"
            : "https://routing.openstreetmap.de/routed-foot/route/v1/driving/";
      const u =
        host +
        `${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson&steps=false`;
      const r = await fetch(u);
      if (!r.ok) throw Error("Route service unavailable");
      const d = await r.json();
      if (d.code !== "Ok" || !d.routes?.length)
        throw Error("No route found for this travel mode");
      return d.routes[0];
    }
    function mapsDirections(o, d, m) {
      const gm =
        m === "transit"
          ? "transit"
          : m === "walking"
            ? "walking"
            : m === "cycling"
              ? "bicycling"
              : "driving";
      return (
        "https://www.google.com/maps/dir/?api=1&origin=" +
        encodeURIComponent(o) +
        "&destination=" +
        encodeURIComponent(d) +
        "&travelmode=" +
        gm
      );
    }
    async function showMap() {
      const dest = custom.value.trim() || sel.value,
        orig = origin.value.trim(),
        m = mode.value;
      if (!dest || !orig) {
        msg.textContent = "Please enter both starting point and destination.";
        return;
      }
      msg.textContent = "Finding both places…";
      summary.hidden = true;
      $("#ebGetDirections").href = mapsDirections(orig, dest, m);
      $("#ebOpenMap").href =
        "https://www.openstreetmap.org/search?query=" +
        encodeURIComponent(dest);
      try {
        const a = await geocode(orig);
        await wait(1100);
        const b = await geocode(dest);
        if (!leafletReady) await new Promise((r) => setTimeout(r, 500));
        if (leafletReady) {
          if (startMarker) map.removeLayer(startMarker);
          if (endMarker) map.removeLayer(endMarker);
          if (routeLayer) map.removeLayer(routeLayer);
          startMarker = L.marker([a.lat, a.lon])
            .addTo(map)
            .bindPopup("Starting point");
          endMarker = L.marker([b.lat, b.lon])
            .addTo(map)
            .bindPopup("College / destination");
          map.fitBounds(
            [
              [a.lat, a.lon],
              [b.lat, b.lon],
            ],
            { padding: [30, 30] },
          );
        }
        if (m === "transit") {
          msg.textContent =
            "Both places found. Public bus/transit route and live schedules are available in Google Maps.";
          summary.hidden = false;
          summary.innerHTML =
            "<strong>Public transport route</strong><p>Open step-by-step directions to see available bus/train connections and current travel estimates.</p>";
          return;
        }
        msg.textContent = "Calculating " + m + " route…";
        const rt = await routeBetween(a, b, m);
        const km = rt.distance / 1000,
          min = rt.duration / 60;
        if (leafletReady) {
          routeLayer = L.geoJSON(rt.geometry, {
            style: { color: "#2563eb", weight: 5, opacity: 0.85 },
          }).addTo(map);
          map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });
        }
        summary.hidden = false;
        summary.innerHTML = `<div class="eb-route-metrics"><div><small>Route distance</small><strong>${km.toFixed(1)} km</strong></div><div><small>Estimated time</small><strong>${Math.round(min)} min</strong></div></div><p>${esc(m === "driving" ? "Road route" : m === "cycling" ? "Cycling route" : "Walking route")} from ${esc(a.name)} to ${esc(b.name)}. Estimate may change with traffic, route conditions and map data.</p>`;
        msg.textContent =
          "Route calculated successfully. For turn-by-turn directions, open Google Maps.";
      } catch (e) {
        msg.textContent =
          e.message + " You can still open Google Maps for directions.";
        summary.hidden = false;
        summary.innerHTML =
          "<strong>Route estimate unavailable</strong><p>Use the step-by-step directions button. Public geocoding/routing services can be temporarily rate-limited.</p>";
      }
    }
    $("#ebMapForm").addEventListener("submit", (e) => {
      e.preventDefault();
      showMap();
    });
    sel.addEventListener("change", () => {
      if (sel.value) {
        custom.value = "";
      }
    });
    custom.addEventListener("input", () => {
      if (custom.value.trim()) sel.value = "";
    });
    $("#ebUseLocation").addEventListener("click", () => {
      if (!navigator.geolocation) {
        msg.textContent =
          "This browser does not support location. Type your starting point instead.";
        return;
      }
      msg.textContent = "Requesting location permission…";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          origin.value =
            pos.coords.latitude.toFixed(6) +
            "," +
            pos.coords.longitude.toFixed(6);
          msg.textContent =
            "Current location added. Choose a destination and calculate route.";
        },
        (err) => {
          msg.textContent =
            err.code === 1
              ? "Location permission denied. Type your starting point manually."
              : "Could not get location. Allow location permission or type your starting point.";
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    });
    document.querySelectorAll("[data-college]").forEach((b) =>
      b.addEventListener("click", () => {
        sel.value = colleges.includes(b.dataset.college)
          ? b.dataset.college
          : "";
        custom.value = b.dataset.college;
        if (sel.value) custom.value = "";
        msg.textContent =
          "Destination selected. Enter starting point and calculate route.";
        window.scrollTo({ top: 0, behavior: "smooth" });
      }),
    );
  }
  function trackingPage() {
    const orders = stored("eb_orders", []);
    app.innerHTML =
      pageHead(
        "ORDER CENTER",
        "Track your order",
        "Order confirmation, order number and campus hand-off progress for orders created in this browser.",
      ) +
      `<div class="wrap"><div class="eb-panel"><div class="eb-tracking-top"><div><h2>📦 Your orders</h2><p class="eb-help">Status is stored in this browser. It is not a courier tracking feed or seller-confirmed update.</p></div><a href="#orders" class="secondary">View all orders</a></div>${
        orders.length
          ? orders
              .map((o, i) => {
                const items = (o.items || [])
                  .map((it) => {
                    const p = products.find((x) => x.id === it.id);
                    return `${esc(p?.name || it.id)} × ${Number(it.qty) || 1}`;
                  })
                  .join(" · ");
                const status = esc(o.status || "Order confirmed");
                const orderNo = esc(
                  o.orderNo || "EB-" + String(Date.now()).slice(-6 - i),
                );
                return `<article class="eb-order-card"><div class="eb-order-icon">📦</div><div class="eb-order-info"><div class="eb-order-line"><strong>Order #${orderNo}</strong><span class="eb-status">✓ ${status}</span></div><p>${items || "Order items"}</p><p class="eb-help">Placed: ${esc(o.date || "Date unavailable")}</p><strong>₹${Number(o.total || 0).toLocaleString("en-IN")}</strong><div class="eb-confirmed-banner"><span class="eb-confirmed-tick">✓</span><div><strong>Order confirmed</strong><small>Your order has been received successfully.</small></div></div><div class="eb-packing-card"><span class="eb-packing-icon">📦</span><div><strong>Your order is being packed</strong><small>We are preparing your items for the campus hand-off.</small></div></div><div class="eb-progress"><span class="done">✓ Order confirmed</span><span class="done">✓ Packing</span><span>○ Ready for hand-off</span></div><a class="textlink" href="#location">Open college map & directions →</a></div></article>`;
              })
              .join("")
          : '<div class="eb-empty"><div>🛍️</div><h3>No orders to track yet</h3><p>Place an order from your cart and its confirmation will appear here.</p><a class="primary" href="#shop">Browse products</a></div>'
      }</div><div class="eb-panel eb-track-help"><h2>Need to meet the seller?</h2><p>Use the college map to choose a public meeting spot and open route directions.</p><a class="primary" href="#location">Choose college & get directions ↗</a></div></div>`;
  }
  function wikiPage() {
    app.innerHTML =
      pageHead(
        "WIKIPEDIA API",
        "Explore a topic",
        "Search Wikipedia for product background, technology concepts, and study topics.",
      ) +
      `<div class="wrap"><form id="ebWikiForm" class="eb-panel"><label for="ebWikiQuery"><strong>Search Wikipedia</strong></label><div class="eb-wiki-search"><input id="ebWikiQuery" placeholder="e.g. Scientific calculator, computer networks" required><button class="primary" type="submit">Search ↗</button></div><p class="eb-help">Results are retrieved live from the Wikipedia public API. Internet access is required.</p></form><div id="ebWikiResults" class="eb-wiki-results"></div></div>`;
    const form = $("#ebWikiForm"),
      input = $("#ebWikiQuery"),
      results = $("#ebWikiResults");
    const search = async (q) => {
      results.innerHTML = '<div class="eb-panel">Searching Wikipedia…</div>';
      try {
        const url =
          "https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
          encodeURIComponent(q) +
          "&gsrnamespace=0&gsrlimit=8&prop=pageimages%7Cextracts&piprop=thumbnail&pithumbsize=240&exintro=1&explaintext=1&exsentences=3&format=json&origin=*";
        const r = await fetch(url);
        if (!r.ok) throw new Error("Wikipedia request failed");
        const data = await r.json();
        const pages = Object.values(data.query?.pages || {}).sort(
          (a, b) => (a.index || 0) - (b.index || 0),
        );
        if (!pages.length) {
          results.innerHTML =
            '<div class="eb-empty"><h3>No results found</h3><p>Try a shorter keyword.</p></div>';
          return;
        }
        results.innerHTML = pages
          .map(
            (p) =>
              `<article class="eb-wiki-card">${p.thumbnail?.source ? `<img src="${esc(p.thumbnail.source)}" alt="" loading="lazy">` : ""}<div><h3><a href="https://en.wikipedia.org/?curid=${encodeURIComponent(p.pageid)}" target="_blank" rel="noopener">${esc(p.title)} ↗</a></h3><p>${esc(p.extract || "Open the article to read more.")}</p><a class="textlink" href="https://en.wikipedia.org/?curid=${encodeURIComponent(p.pageid)}" target="_blank" rel="noopener">Read article →</a></div></article>`,
          )
          .join("");
      } catch (e) {
        results.innerHTML =
          '<div class="eb-empty"><h3>Could not load Wikipedia</h3><p>Check your internet connection, then search again.</p><button class="secondary" id="ebWikiRetry" type="button">Try again</button></div>';
        $("#ebWikiRetry")?.addEventListener("click", () =>
          search(input.value.trim()),
        );
      }
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q) search(q);
    });
    const initial = new URLSearchParams(location.hash.split("?")[1] || "").get(
      "q",
    );
    if (initial) {
      input.value = initial;
      search(initial);
    }
  }
  function supportPage(kind) {
    const title =
      kind === "help"
        ? "Help centre"
        : kind === "contact"
          ? "Contact EasyBuy"
          : "Share feedback";
    const intro =
      kind === "help"
        ? "Quick answers for shopping, selling, images and campus meet-ups."
        : kind === "contact"
          ? "Use the support form to prepare a message for the EasyBuy project maintainer."
          : "Tell us what works well and what should improve.";
    if (kind === "help") {
      app.innerHTML =
        pageHead("SUPPORT", title, intro) +
        `<div class="wrap"><div class="eb-panel"><h3>How do product images load?</h3><p>Books search Google Books for cover thumbnails. Other categories search Wikimedia Commons. Results load when product cards appear on screen and are cached in this browser.</p><h3>Why can a product keep its local image?</h3><p>If the public API has no relevant result, internet access is blocked, or the API is temporarily limited, EasyBuy keeps the product-specific bundled fallback rather than displaying a misleading image.</p><h3>How do I track an order?</h3><p>Open Orders, then Track order. Order confirmation and packing status are currently stored in this browser; they are not a courier feed.</p><h3>How do I get directions to a college?</h3><p>Open College route map, enter your starting point, choose a college and travel mode, then calculate the route. Bus/train schedules open in Google Maps.</p><h3>How do I sell an item?</h3><p>Open Sell, enter accurate item details, choose a clear product photo and publish. In this JavaScript build, listings are saved in this browser only.</p><a class="primary" href="#feedback">Send feedback ↗</a></div></div>`;
      return;
    }
    if (kind === "contact") {
      app.innerHTML =
        pageHead("SUPPORT", title, intro) +
        `<div class="wrap"><form id="ebContactForm" class="eb-panel"><div class="field"><label>Your email (optional)</label><input id="ebContactEmail" type="email" placeholder="you@example.com"></div><div class="field"><label>Topic</label><select id="ebContactTopic"><option>Product image issue</option><option>Order / tracking question</option><option>Seller / listing issue</option><option>Website feedback</option><option>Other</option></select></div><div class="field"><label>Message</label><textarea id="ebContactMessage" required maxlength="2000" placeholder="Describe how we can help…"></textarea></div><button class="primary" type="submit">Prepare support message ↗</button><p class="eb-help">This static-site package has no configured support inbox or server endpoint. The button opens your email app with the message prepared; set the project maintainer's address in the mailto target before publishing.</p></form></div>`;
      $("#ebContactForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const body =
          "From: " +
          $("#ebContactEmail").value +
          "\nTopic: " +
          $("#ebContactTopic").value +
          "\n\n" +
          $("#ebContactMessage").value;
        const subject = "EasyBuy support: " + $("#ebContactTopic").value;
        const a = document.createElement("a");
        a.href =
          "mailto:?subject=" +
          encodeURIComponent(subject) +
          "&body=" +
          encodeURIComponent(body);
        a.click();
      });
      return;
    }
    app.innerHTML =
      pageHead("YOUR VOICE", title, intro) +
      `<div class="wrap"><form id="ebFeedbackForm" class="eb-panel"><div class="field"><label>How was your experience?</label><select id="ebFeedbackRating"><option>Excellent</option><option>Good</option><option>Okay</option><option>Needs improvement</option></select></div><div class="field"><label>Feedback</label><textarea id="ebFeedbackText" required maxlength="2000" placeholder="Tell us what to improve…"></textarea></div><button class="primary" type="submit">Save feedback ↗</button><p class="eb-help">Feedback is saved in this browser. A shared feedback inbox requires a configured server/API endpoint.</p></form><div id="ebFeedbackSaved"></div></div>`;
    $("#ebFeedbackForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const items = stored("eb_feedback", []);
      items.unshift({
        rating: $("#ebFeedbackRating").value,
        message: $("#ebFeedbackText").value.trim(),
        date: new Date().toISOString(),
      });
      try {
        localStorage.setItem("eb_feedback", JSON.stringify(items));
        $("#ebFeedbackSaved").innerHTML =
          '<div class="eb-panel"><strong>✓ Feedback saved in this browser.</strong></div>';
        e.target.reset();
      } catch (_) {
        $("#ebFeedbackSaved").textContent =
          "Browser storage is full; feedback was not saved.";
      }
    });
  }
  function showFeatureRoute() {
    const path = (location.hash || "#home").slice(1).split("?")[0];
    if (path === "location") {
      locationPage();
      return true;
    }
    if (path === "tracking") {
      trackingPage();
      return true;
    }
    if (path === "wikipedia") {
      wikiPage();
      return true;
    }
    if (path === "help" || path === "contact" || path === "feedback") {
      supportPage(path);
      return true;
    }
    return false;
  }
  // The old floating shortcut panel duplicated the main navigation; keep one menu only.
  window.addEventListener("hashchange", () => {
    if (showFeatureRoute()) window.scrollTo({ top: 0, behavior: "smooth" });
  });
  if (showFeatureRoute()) {
  } else if (!location.hash) location.hash = "#home";
})();
