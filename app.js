(() => {
  const products = window.EASYBUY_PRODUCTS || [];
  const savedListings = (() => {
    try {
      return JSON.parse(localStorage.getItem("eb_listings") || "[]");
    } catch (_) {
      return [];
    }
  })();
  savedListings.forEach((x, i) => {
    const id = x.id || "user-" + (x.createdAt || i);
    if (!products.some((p) => String(p.id) === String(id)))
      products.push({
        id,
        name: x.name,
        category: x.category,
        price: Number(x.price) || 0,
        oldPrice: Number(x.price) || 0,
        condition: x.condition || "Second-hand · Good",
        college: x.college || "Student seller",
        seller_name: x.seller_name || getDisplaySellerName(),
        contact: x.contact || "",
        description: x.description || "",
        subtitle: "Student listing",
        image:
          x.image ||
          "images/categories/" +
            ({
              Electronics: "electronics",
              Books: "books",
              "Stationery Kits": "stationery",
              Calculators: "calculators",
              "Lab Equipment": "lab-equipment",
              Accessories: "accessories",
              "T-Shirts": "clothing",
              Bags: "bags",
            }[x.category] || "accessories") +
            ".svg",
        rating: 5,
        reviews: 0,
        stock: 1,
        specs: {
          Seller: "Student listing",
          Condition: x.condition || "Second-hand · Good",
        },
      });
  });
  const $ = (s) => document.querySelector(s);
  const app = $("#app");
  const readArray = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  };
  // Migrate wishlist data from older builds and normalize both ID-only and
  // object-shaped entries. Older versions used different keys / stored full
  // product objects, which made saved products disappear from the wishlist.
  function readWishlist() {
    const candidates = ["eb_wish", "eb_wishlist", "easybuy_wishlist", "easybuy_wish"];
    let raw = [];
    for (const key of candidates) {
      const value = readArray(key);
      if (value.length) { raw = value; break; }
    }
    const ids = raw.map((item) => {
      if (item && typeof item === "object") {
        return item.id ?? item.productId ?? item.product_id ?? item.code ?? "";
      }
      return item;
    }).filter((id) => id !== null && id !== undefined && String(id).trim() !== "")
      .map((id) => String(id));
    return [...new Set(ids)];
  }
  let cart = readArray("eb_cart"),
    wishlist = readWishlist(),
    orders = readArray("eb_orders"),
    rotation = 0;
  const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Courier tracking must point to an actual external carrier site, never back to this EasyBuy app.
  function getCourierTrackingUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const u = new URL(raw, window.location.href);
      if (!/^https?:$/.test(u.protocol)) return "";
      if (u.origin === window.location.origin) return "";
      if (["localhost", "127.0.0.1", "::1"].includes(u.hostname.toLowerCase())) return "";
      return u.href;
    } catch (_) { return ""; }
  }
  function getDisplaySellerName() {
    try { const email = sessionStorage.getItem("easybuy_js_session_v1"); const users = JSON.parse(localStorage.getItem("easybuy_js_users_v1") || "[]"); const user = Array.isArray(users) ? users.find((u) => u.email === email) : null; return user?.name || "EasyBuy Student Seller"; }
    catch (_) { return "EasyBuy Student Seller"; }
  }
  function dateRange(daysMin, daysMax) {
    const fmt = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const start = new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate() + daysMin);
    const end = new Date(); end.setHours(0,0,0,0); end.setDate(end.getDate() + daysMax);
    return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10), label: `${fmt(start)} – ${fmt(end)}` };
  }
  const EASYBUY_CONTACT = "9629872987";
  const phoneDigits = (p) => EASYBUY_CONTACT.replace(/\D/g, "");
  const phoneForCall = (p) => {
    const d = phoneDigits(p);
    return d ? (d.length === 10 ? "+91" + d : "+" + d) : "";
  };
  const save = () => {
    localStorage.setItem("eb_cart", JSON.stringify(cart));
    localStorage.setItem("eb_wish", JSON.stringify(wishlist));
    localStorage.setItem("eb_orders", JSON.stringify(orders));
    updateCount();
    // buyer-sync.js listens for this to store the cart/wishlist in the MySQL database.
    window.dispatchEvent(new Event("easybuy:state-changed"));
  };
  // Small bridge used by js/buyer-sync.js (cart/wishlist saved in MySQL per buyer account).
  window.EasyBuyState = {
    getCart: () => cart.map((x) => ({ id: String(x.id), qty: Number(x.qty) || 1 })),
    getWishlist: () => wishlist.map(String),
    setState(next) {
      if (Array.isArray(next.cart)) cart = next.cart.map((x) => ({ id: String(x.id), qty: Math.max(1, Number(x.qty) || 1) }));
      if (Array.isArray(next.wishlist)) wishlist = [...new Set(next.wishlist.map(String))];
      try {
        localStorage.setItem("eb_cart", JSON.stringify(cart));
        localStorage.setItem("eb_wish", JSON.stringify(wishlist));
      } catch (_) {}
      updateCount();
      if (/^#(cart|wishlist|checkout)/.test(location.hash)) route(false);
    },
    reset() {
      cart = []; wishlist = []; orders = [];
      ["eb_cart", "eb_wish", "eb_orders"].forEach((k) => { try { localStorage.removeItem(k); } catch (_) {} });
      updateCount();
    },
  };
  function updateCount() {
    $("#cartCount").textContent = cart.reduce((a, b) => a + b.qty, 0);
  }
  function go(hash) {
    location.hash = hash;
  }
  function loader() {
    const l = $("#loading");
    if (!l) return;
    l.classList.remove("hidden");
    l.classList.add("eb-transition-loading");
    const label = $("#loaderLabel");
    if (label) label.textContent = "EASYBUY · MOVING TO YOUR NEXT PAGE";
    clearTimeout(window.ebPageLoaderTimer);
    window.ebPageLoaderTimer = setTimeout(() => {
      l.classList.add("hidden");
      l.classList.remove("eb-transition-loading");
    }, 700);
  }
  function img(p, cls = "") {
    const fallback =
      {
        Calculators: "images/categories/calculators.svg",
        Books: "images/categories/books.svg",
        Bags: "images/categories/bags.svg",
        Electronics: "images/categories/electronics.svg",
        "Lab Equipment": "images/categories/lab-equipment.svg",
        "Stationery Kits": "images/categories/stationery.svg",
        "T-Shirts": "images/categories/clothing.svg",
        Accessories: "images/categories/accessories.svg",
      }[p.category] || "images/categories/accessories.svg";
    return `<img data-eb-product-image="${p.id}" class="${cls}" src="${p.image}" alt="${p.name}" loading="lazy" onerror="if(this.dataset.ebFallback){this.onerror=null;this.style.visibility='hidden'}else{this.dataset.ebFallback='1';this.onerror=null;this.src='${fallback}'}">`;
  }
  function card(p) {
    return `<article class="product-card"><div class="product-image-wrap">${img(p, "product-image")}<span class="tag">${p.condition.split(" · ")[0]}</span><button type="button" class="heart" data-wish="${p.id}" aria-pressed="${wishlist.includes(String(p.id))}" aria-label="${wishlist.includes(String(p.id)) ? "Remove from wishlist" : "Add to wishlist"}">${wishlist.includes(String(p.id)) ? "♥" : "♡"}</button></div><div class="product-name">${p.name}</div><div class="product-category">${p.category}</div><div class="rating">★ ${p.rating} <span style="color:#94a0b2">(${p.reviews} reviews)</span></div><div class="price-row"><span class="price">${money(p.price)}</span><span class="oldprice">${money(p.oldPrice)}</span><span class="discount">${Math.round((1 - p.price / p.oldPrice) * 100)}% off</span></div><div class="sellerline">📍 ${p.college}</div><div class="sellerline eb-seller-name">👤 Published by ${escapeHtml(p.seller_name || p.sellerName || getDisplaySellerName())}</div><div class="eb-availability ${Number(p.stock ?? 1) > 0 ? "available" : "unavailable"}">${Number(p.stock ?? 1) > 0 ? "● Available" : "● Out of stock"}${Number(p.stock ?? 1) > 0 ? ` · ${Number(p.stock ?? 1)} available` : ""}</div><div class="card-actions"><button class="addbtn" data-add="${p.id}" ${Number(p.stock ?? 1) <= 0 ? "disabled" : ""}><span class="eb-add-cart-icon">🛒</span> Add to cart</button><button class="viewbtn" data-view="${p.id}">View product</button></div><div class="eb-contact-actions"><a href="tel:${phoneForCall(p)}" class="eb-call-seller" aria-label="Call EasyBuy contact">☎ Call Now</a></div></article>`;
  }
  function sectionHead(title, sub, link = "View all products", hash = "#shop") {
    return `<div class="sectionhead"><div><h2>${title}</h2><p>${sub}</p></div><a class="textlink" href="${hash}">${link} →</a></div>`;
  }
  function home() {
    const featured = products.slice(0, 8);
    app.innerHTML = `<section class="eb-carousel" id="ebCarousel" aria-label="EasyBuy featured categories"><div class="eb-slides"><article class="eb-slide active" style="--slide-image:url('images/A4 Notebook Set.jpg')"><div class="eb-slide-copy"><span class="eyebrow">✦ MADE FOR CAMPUS LIFE</span><h1>Buy &amp; Sell <span>Everything</span><br>You Need!</h1><p>Books, stationery, electronics, lab equipment, fashion and more — all in one place.</p><div class="hero-actions"><a class="primary" href="#shop">🛒 Shop Now</a><a class="secondary" href="seller/">▦ Start Selling</a></div></div><div class="eb-slide-art"><img src="images/A4 Notebook Set.jpg" alt="Student notebook set"></div></article><article class="eb-slide" style="--slide-image:url('images/Black Ballpoint Pens.jpg')"><div class="eb-slide-copy"><span class="eyebrow">📚 BOOKS · NOTES · IDEAS</span><h1>Make every <span>class count.</span></h1><p>Find affordable notebooks, reference books and stationery from fellow students.</p><div class="hero-actions"><a class="primary" href="#shop?category=Stationery%20Kits">Explore Stationery ↗</a><a class="secondary" href="#shop?category=Books">Browse Books</a></div></div><div class="eb-slide-art"><img src="images/Black Ballpoint Pens.jpg" alt="Stationery pens"></div></article><article class="eb-slide" style="--slide-image:url('images/Power Bank.jpg')"><div class="eb-slide-copy"><span class="eyebrow">✦ LEARN · BUILD · CREATE</span><h1>Study smarter with <span>student tech.</span></h1><p>Discover calculators, electronics and lab essentials at student-friendly prices.</p><div class="hero-actions"><a class="primary" href="#shop?category=Electronics">Shop Electronics ↗</a><a class="secondary" href="#shop?category=Calculators">Calculators</a></div></div><div class="eb-slide-art"><img src="images/Power Bank.jpg" alt="Portable power bank"></div></article><article class="eb-slide" style="--slide-image:url('images/Classic Campus T-shirt.jpg')"><div class="eb-slide-copy"><span class="eyebrow">✦ STYLE · COMFORT · YOU</span><h1>Campus style, <span>your budget.</span></h1><p>Browse everyday wear, bags and accessories from your student community.</p><div class="hero-actions"><a class="primary" href="#shop?category=T-Shirts">Shop Fashion ↗</a><a class="secondary" href="#shop?category=Bags">Browse Bags</a></div></div><div class="eb-slide-art"><img src="images/Classic Campus T-shirt.jpg" alt="Campus T-shirt"></div></article><article class="eb-slide" style="--slide-image:url('images/Anti-splash Backpack.jpg')"><div class="eb-slide-copy"><span class="eyebrow">✦ JOIN THE STUDENT COMMUNITY</span><h1>Good finds. <span>Better deals.</span></h1><p>Buy, sell and reuse campus essentials — all in one marketplace.</p><div class="hero-actions"><a class="primary" href="#shop">Shop Now ↗</a><a class="secondary" href="seller/">Open Seller Studio</a></div><div class="hero-mini-trust">✓ Student community &nbsp; · &nbsp; ✓ Affordable finds &nbsp; · &nbsp; ✓ Reuse more</div></div><div class="eb-slide-art"><img src="images/Anti-splash Backpack.jpg" alt="Student backpack"></div></article></div><button class="eb-carousel-arrow prev" type="button" aria-label="Previous slide">‹</button><button class="eb-carousel-arrow next" type="button" aria-label="Next slide">›</button><div class="eb-carousel-dots" aria-label="Choose slide"><button class="active" aria-label="Slide 1"></button><button aria-label="Slide 2"></button><button aria-label="Slide 3"></button><button aria-label="Slide 4"></button><button aria-label="Slide 5"></button></div><span class="eb-slide-count">1/5</span></section><section class="section"><div class="wrap">${sectionHead("Shop by category", "Find what you need for your next class.")}<div class="category-grid">${[
      ["Books", "📚", "Textbooks & guides"],
      ["Stationery Kits", "✏️", "Classroom basics"],
      ["Calculators", "🧮", "Maths essentials"],
      ["Lab Equipment", "🧪", "Practical essentials"],
      ["Electronics", "🎧", "Tech for study"],
      ["Accessories", "🎒", "Daily campus life"],
      ["T-Shirts", "👕", "Everyday wear"],
      ["Bags", "👜", "Carry it all"],
    ]
      .map(
        (c, i) =>
          `<a class="category" href="#shop?category=${encodeURIComponent(c[0])}"><img src="${products[[1, 5, 0, 4, 3, 11, 9, 2][i]].image}" onerror="this.onerror=null;this.src='images/categories/${["books", "stationery", "calculators", "lab-equipment", "electronics", "accessories", "clothing", "bags"][i]}.svg'" alt="${c[0]}"><div><strong>${c[0]}</strong><small>${c[2]} →</small></div></a>`,
      )
      .join(
        "",
      )}</div></div></section><section class="section"><div class="wrap"><div class="deals"><div><span class="eyebrow" style="background:#ffffff1c;color:#fff">CAMPUS DEALS</span><h2>Small prices. Big semester energy.</h2><p>Pre-loved finds and affordable new essentials.</p></div><div class="deal-clock"><div class="timebox"><span id="hh">08</span><small>HOURS</small></div><div class="timebox"><span id="mm">24</span><small>MIN</small></div><div class="timebox"><span id="ss">59</span><small>SEC</small></div></div><a href="#shop" class="primary" style="background:#fff;color:#183c70;position:relative;z-index:2">Shop deals →</a></div></div></section><section class="section"><div class="wrap">${sectionHead("Picked for student life", "Popular essentials at approachable prices.")}<div class="product-grid">${featured.map(card).join("")}</div></div></section><section class="section"><div class="wrap"><div class="campus-band"><div><h3>Got something you no longer use?</h3><p>List textbooks, gadgets, and campus essentials for other students.</p></div><a class="primary" href="#sell">List a product free ↗</a></div></div></section>`;
    startClock();
    initEasyBuyCarousel();
  }
  function startClock() {
    let end = Date.now() + 8 * 3600000 + 24 * 60000 + 59000;
    setInterval(() => {
      let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      if ($("#hh")) {
        $("#hh").textContent = String(Math.floor(s / 3600)).padStart(2, "0");
        $("#mm").textContent = String(Math.floor((s % 3600) / 60)).padStart(
          2,
          "0",
        );
        $("#ss").textContent = String(s % 60).padStart(2, "0");
      }
    }, 1000);
  }
  function shop() {
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    let category = params.get("category") || "All";
    app.innerHTML = `<div class="wrap page-title"><span class="eyebrow">THE CAMPUS MARKETPLACE</span><h1>Find your next good thing.</h1><p style="color:var(--muted)">Affordable products listed by students. Tap a product to view full details.</p><div class="filters"><input id="shopSearch" placeholder="Search name, category or college…"><select id="catFilter"><option>All</option>${[...new Set(products.map((p) => p.category))].map((c) => `<option ${c === category ? "selected" : ""}>${c}</option>`).join("")}</select><select id="conditionFilter"><option value="All">Any condition</option><option>First-hand</option><option>Second-hand</option></select><select id="sortFilter"><option value="featured">Recommended</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="rating">Top rated</option></select></div><p id="resultCount" style="color:var(--muted);font-size:13px"></p><div class="product-grid" id="shopGrid"></div></div>`;
    const render = () => {
      let q = $("#shopSearch").value.toLowerCase(),
        c = $("#catFilter").value,
        cond = $("#conditionFilter").value,
        sort = $("#sortFilter").value;
      let list = products.filter(
        (p) =>
          (c === "All" || p.category === c) &&
          (cond === "All" || p.condition.startsWith(cond)) &&
          [p.name, p.category, p.college, p.description]
            .join(" ")
            .toLowerCase()
            .includes(q),
      );
      if (sort === "low") list.sort((a, b) => a.price - b.price);
      if (sort === "high") list.sort((a, b) => b.price - a.price);
      if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
      $("#resultCount").textContent = `${list.length} products found`;
      $("#shopGrid").innerHTML = list.length
        ? list.map(card).join("")
        : '<div class="empty">No products found. Try another search or category.</div>';
    };
    ["shopSearch", "catFilter", "conditionFilter", "sortFilter"].forEach((id) =>
      $("#" + id).addEventListener("input", render),
    );
    render();
  }
  function detail(id) {
    const p = products.find((x) => x.id === id);
    if (!p) {
      home();
      return;
    }
    rotation = 0;
    const colleges = [
      ...new Set(products.map((x) => x.college).filter(Boolean)),
    ].sort();
    const campusKey = "eb_product_campus_" + p.id;
    const savedCampus = localStorage.getItem(campusKey) || "";
    const years = [
      "First Year",
      "Second Year",
      "Third Year",
      "Fourth Year",
      "Final Year",
      "Other",
    ];
    const departments = [
      "Computer Science",
      "Information Technology",
      "Electronics & Communication",
      "Electrical & Electronics",
      "Mechanical Engineering",
      "Civil Engineering",
      "Biotechnology",
      "Physics",
      "Chemistry",
      "Commerce",
      "Business Administration",
      "Arts & Humanities",
      "Other",
    ];
    app.innerHTML = `<div class="wrap"><div style="padding-top:25px;color:var(--muted);font-size:13px"><a href="#shop">Shop</a> / ${p.category} / ${p.name}</div><div class="detail-grid"><div class="detail-visual">${img(p, "detail-product")}<div class="rotate-controls"><button id="rotateLeft">↶ Rotate left</button><button id="rotateRight">Rotate right ↷</button><button id="resetRotate">Reset</button></div></div><div class="detail-info"><span class="eyebrow">${p.condition}</span><h1>${p.name}</h1><div class="rating">★ ${p.rating} · ${p.reviews} student reviews</div><div class="price-row"><span class="price">${money(p.price)}</span><span class="oldprice">${money(p.oldPrice)}</span><span class="discount">${Math.round((1 - p.price / p.oldPrice) * 100)}% off</span></div><p class="sellerline eb-seller-name">👤 Published by ${escapeHtml(p.seller_name || p.sellerName || getDisplaySellerName())}</p>${p.pickup_location ? `<section class="eb-panel" style="margin:14px 0;padding:14px"><h3>📍 Seller pickup location</h3><p>${escapeHtml(p.pickup_location)}</p><div class="eb-action-row"><a class="secondary" target="_blank" rel="noopener noreferrer" href="${escapeHtml(p.pickup_map_url || ("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.pickup_location + " " + (p.college || ""))))}">Open pickup map ↗</a><a class="primary" href="#messages?product=${encodeURIComponent(p.id)}&to=${encodeURIComponent(p.seller_email || "")}&name=${encodeURIComponent(p.seller_name || p.sellerName || "Seller")}">Ask seller about pickup</a></div><small>Meet at a public campus location and confirm the pickup time with the seller.</small></section>` : `<section class="eb-panel" style="margin:14px 0;padding:14px"><h3>📍 Pickup location not added yet</h3><p>Message the seller to ask for the public pickup point and map link.</p><a class="primary" href="#messages?product=${encodeURIComponent(p.id)}&to=${encodeURIComponent(p.seller_email || "")}&name=${encodeURIComponent(p.seller_name || p.sellerName || "Seller")}">Ask seller for pickup location</a></section>`}<p>${p.description}</p><p>${p.subtitle}. Student-listed campus essential, priced with student budgets in mind.</p><div class="specs">${Object.entries(
      p.specs,
    )
      .map(
        ([k, v]) =>
          `<div class="specrow"><span>${k}</span><strong>${v}</strong></div>`,
      )
      .join(
        "",
      )}<div class="specrow"><span>Stock status</span><strong class="${Number(p.stock ?? 1) > 0 ? "eb-stock-in" : "eb-stock-out"}">${Number(p.stock ?? 1) > 0 ? `${Number(p.stock)} available` : "Out of stock"}</strong></div><div class="specrow"><span>Category</span><strong>${p.category}</strong></div><div class="specrow"><span>Product ID</span><strong>${p.id}</strong></div>${p.available_sizes ? `<div class="specrow"><span>Available sizes</span><strong>${escapeHtml(p.available_sizes)}</strong></div>` : ""}${p.measurements ? `<div class="specrow"><span>Measurements</span><strong>${escapeHtml(p.measurements)}</strong></div>` : ""}${p.customization_options ? `<div class="specrow"><span>Customization</span><strong>${escapeHtml(p.customization_options)}</strong></div>` : ""}</div><div class="detail-actions"><button class="primary" data-add="${p.id}" ${Number(p.stock ?? 1) <= 0 ? "disabled" : ""}><span class="eb-add-cart-icon">🛒</span> ${Number(p.stock ?? 1) <= 0 ? "Out of stock" : "Add to cart"}</button><button class="secondary" data-buy="${p.id}" ${Number(p.stock ?? 1) <= 0 ? "disabled" : ""}>${Number(p.stock ?? 1) <= 0 ? "Out of stock" : "Buy now →"}</button><button class="secondary" data-wish="${p.id}">${wishlist.includes(String(p.id)) ? "♥ Saved" : "♡ Wishlist"}</button></div><div class="eb-contact-actions eb-detail-contact"><a href="tel:${phoneForCall(p)}" class="eb-call-seller" aria-label="Call EasyBuy contact">☎ Call Now</a></div><div class="detail-message-cta"><a class="primary" href="#messages?product=${encodeURIComponent(p.id)}&to=${encodeURIComponent(p.seller_email || "")}&name=${encodeURIComponent(p.seller_name || p.sellerName || "Seller")}">✉ Message about this product</a><span>Ask a question about this item and view database-confirmed replies in Messages.</span></div><p style="font-size:12px">Safety tip: meet in a public campus location, inspect the item, and avoid paying before verifying it.</p></div></div>
<section class="eb-panel eb-product-campus"><div class="eb-campus-heading"><span class="eyebrow">CAMPUS AVAILABILITY</span><h2>📍 Is this product available at your college?</h2><p>Seller-listed location: <strong>${p.college || "Not provided"}</strong>. This is based on the listing, not live stock verification.</p></div><div class="eb-campus-form"><div class="field"><label for="ebBuyerCollege">Your college</label><select id="ebBuyerCollege"><option value="">Choose your college</option>${colleges.map((c) => `<option value="${c.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" ${c === savedCampus ? "selected" : ""}>${c}</option>`).join("")}<option value="__other__">Other / outside listed colleges</option></select></div><div class="field"><label for="ebBuyerCollegeOther">Other college / location</label><input id="ebBuyerCollegeOther" placeholder="Enter your college or current location"></div><div class="field"><label for="ebBuyerDepartment">Department</label><select id="ebBuyerDepartment"><option value="">Choose department</option>${departments.map((d) => `<option>${d}</option>`).join("")}</select></div><div class="field"><label for="ebBuyerCourse">Course / programme</label><input id="ebBuyerCourse" placeholder="e.g. B.Sc Computer Science, B.E CSE"></div><div class="field"><label for="ebBuyerYear">Year / standard</label><select id="ebBuyerYear"><option value="">Choose year / standard</option>${years.map((y) => `<option>${y}</option>`).join("")}<option>Class 6</option><option>Class 7</option><option>Class 8</option><option>Class 9</option><option>Class 10</option><option>Class 11</option><option>Class 12</option></select></div><div class="field"><label for="ebBuyerClass">Class / section (optional)</label><input id="ebBuyerClass" placeholder="e.g. II-B, Section A"></div><div class="field"><label for="ebBuyerName">Your name (optional)</label><input id="ebBuyerName" placeholder="Name for campus hand-off"></div></div><div id="ebCampusStatus" class="eb-campus-status" role="status" aria-live="polite"><strong>Choose your college</strong><span>We will compare it with the seller-listed college.</span></div><div class="eb-action-row"><button id="ebCheckCampus" class="primary" type="button">Check campus availability</button><button id="ebCampusDirections" class="secondary" type="button">Open college map ↗</button></div><p class="eb-help">If you are outside the seller's college, EasyBuy marks it as “Outside college / Fall-out” and suggests checking a public meeting point or delivery with the seller. The site cannot confirm physical inventory unless the seller confirms it.</p></section>
<section class="section">${sectionHead("You may also like", "More affordable campus essentials")}<div class="product-grid">${products
      .filter((x) => x.category === p.category && x.id !== p.id)
      .slice(0, 4)
      .map(card)
      .join("")}</div></section></div>`;
    const image = $(".detail-product");
    const update = () =>
      (image.style.transform = `rotateY(${rotation}deg) rotateX(${Math.sin((rotation * Math.PI) / 180) * 4}deg)`);
    $("#rotateLeft").onclick = () => {
      rotation -= 30;
      update();
    };
    $("#rotateRight").onclick = () => {
      rotation += 30;
      update();
    };
    $("#resetRotate").onclick = () => {
      rotation = 0;
      update();
    };
    image.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse") {
        let r = image.getBoundingClientRect();
        image.style.transform = `rotateY(${((e.clientX - r.left) / r.width - 0.5) * 18 + rotation}deg) rotateX(${((e.clientY - r.top) / r.height - 0.5) * -12}deg)`;
      }
    });
    image.addEventListener("pointerleave", update);
    const college = $("#ebBuyerCollege"),
      other = $("#ebBuyerCollegeOther"),
      status = $("#ebCampusStatus");
    function checkCampus() {
      const chosen =
        college.value === "__other__" ? other.value.trim() : college.value;
      if (!chosen) {
        status.className = "eb-campus-status is-warning";
        status.innerHTML =
          "<strong>Please choose or enter your college</strong><span>We need a college/location to compare availability.</span>";
        return;
      }
      localStorage.setItem(campusKey, chosen);
      const same = chosen.toLowerCase() === (p.college || "").toLowerCase();
      status.className =
        "eb-campus-status " + (same ? "is-match" : "is-outside");
      status.innerHTML = same
        ? `<strong>✓ Seller-listed at your college</strong><span>${chosen} matches the seller-listed college. Confirm the product is still available with the seller before ordering.</span>`
        : `<strong>↗ Outside college / Fall-out</strong><span>Your selected location is ${chosen}; seller lists this product at ${p.college || "an unspecified college"}. Contact the seller to agree on delivery or a safe public hand-off.</span>`;
      localStorage.setItem(
        "eb_buyer_profile",
        JSON.stringify({
          college: chosen,
          department: $("#ebBuyerDepartment").value,
          course: $("#ebBuyerCourse").value,
          year: $("#ebBuyerYear").value,
          classSection: $("#ebBuyerClass").value,
          name: $("#ebBuyerName").value,
        }),
      );
    }
    $("#ebCheckCampus").onclick = checkCampus;
    college.addEventListener("change", () => {
      other.style.display = college.value === "__other__" ? "" : "none";
      if (college.value && college.value !== "__other__") checkCampus();
    });
    other.style.display = college.value === "__other__" ? "" : "none";
    $("#ebCampusDirections").onclick = () => {
      const chosen =
        college.value === "__other__"
          ? other.value.trim()
          : college.value || p.college || "";
      location.hash = "#location?destination=" + encodeURIComponent(chosen);
    };
    if (savedCampus) checkCampus();
  }
  function add(id) {
    const p = products.find((x) => String(x.id) === String(id));
    if (!p) return;
    const stock = Math.max(0, Number(p.stock ?? 1));
    if (stock <= 0) {
      toast(`${p.name} is out of stock.`);
      return;
    }
    let it = cart.find((x) => String(x.id) === String(id));
    if (it && Number(it.qty) >= stock) {
      toast(`Only ${stock} unit${stock === 1 ? "" : "s"} available for ${p.name}.`);
      return;
    }
    if (it) it.qty++;
    else cart.push({ id: p.id, qty: 1 });
    save();
    document.querySelectorAll("[data-add]").forEach((b) => {
      if (String(b.dataset.add) === String(id)) {
        b.classList.remove("eb-cart-added");
        void b.offsetWidth;
        b.classList.add("eb-cart-added");
      }
    });
    const basket = document.querySelector(".eb-cart-icon");
    if (basket) {
      basket.classList.remove("eb-cart-bounce");
      void basket.offsetWidth;
      basket.classList.add("eb-cart-bounce");
    }
    toast(`${p.name} added to cart 🛒`);
  }
  function wish(id) {
    id = String(id ?? "").trim();
    if (!id) { toast("Could not identify this product. Please refresh and try again."); return; }
    const product = products.find((item) => String(item.id) === id);
    if (!product) { toast("Product not found. Please refresh the catalogue."); return; }
    const alreadySaved = wishlist.includes(id);
    wishlist = alreadySaved
      ? wishlist.filter((savedId) => String(savedId) !== id)
      : [...wishlist, id];
    try { localStorage.setItem("eb_wish", JSON.stringify(wishlist)); }
    catch (_) { toast("Wishlist could not be saved by this browser."); return; }
    updateCount();
    window.dispatchEvent(new Event("easybuy:state-changed"));
    toast(alreadySaved ? "Removed from wishlist" : "Added to wishlist");
    // Keep every matching heart in sync, including the product detail button.
    document.querySelectorAll("[data-wish]").forEach((button) => {
      if (String(button.dataset.wish) !== id) return;
      const saved = wishlist.includes(id);
      button.textContent = button.classList.contains("heart") ? (saved ? "♥" : "♡") : (saved ? "♥ Saved" : "♡ Wishlist");
      button.setAttribute("aria-pressed", String(saved));
      button.setAttribute("aria-label", saved ? "Remove from wishlist" : "Add to wishlist");
    });
    if ((location.hash || "").slice(1).split("?")[0] === "wishlist") wishlistPage();
  }
  function discover() {
    const picks = [...products]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 12);
    const categoryTiles = [
      ["Books", "📚", "Textbooks and guides"],
      ["Stationery Kits", "✏️", "Pens, notebooks and class essentials"],
      ["Calculators", "🧮", "Scientific and desk calculators"],
      ["Lab Equipment", "🧪", "Practical and lab items"],
      ["Electronics", "🎧", "Study tech and accessories"],
      ["Accessories", "🎒", "Everyday campus essentials"],
      ["T-Shirts", "👕", "Campus clothing"],
      ["Bags", "👜", "Backpacks and carry bags"],
    ];
    app.innerHTML = `<div class="wrap page-title"><span class="eyebrow">DISCOVER EASYBUY</span><h1>Discover your next campus essential.</h1><p style="color:var(--muted)">Explore hand-picked products here, or browse categories separately below.</p><section class="section"><div class="sectionhead"><div><h2>Discover products</h2><p>Browse popular student listings.</p></div><a class="textlink" href="#shop">All products →</a></div><div class="product-grid">${picks.map(card).join("")}</div></section><section class="section"><div class="sectionhead"><div><h2>Browse categories</h2><p>Choose a category to filter the catalogue.</p></div></div><div class="category-grid">${categoryTiles.map((c) => `<a class="category" href="#shop?category=${encodeURIComponent(c[0])}"><div class="discover-category-icon">${c[1]}</div><div><strong>${c[0]}</strong><small>${c[2]} →</small></div></a>`).join("")}</div></section></div>`;
  }
  function cartPage() {
    if (!cart.length) {
      app.innerHTML = `<div class="wrap page-title"><h1>Your cart</h1><div class="empty"><div style="font-size:50px">🛒</div><h2>Your cart is waiting for a good find.</h2><p>Add a product and it will appear here with its exact image.</p><a class="primary" href="#shop">Explore products</a></div></div>`;
      return;
    }
    let subtotal = cart.reduce(
      (s, it) =>
        s + (products.find((p) => p.id === it.id)?.price || 0) * it.qty,
      0,
    );
    app.innerHTML = `<div class="wrap page-title"><h1>Your cart</h1><p style="color:var(--muted)">Review your products, then choose how you want to pay.</p><div class="cart-layout"><div>${cart
      .map((it) => {
        let p = products.find((x) => x.id === it.id);
        if (!p) return "";
        return `<div class="cart-item">${img(p)}<div class="cart-item-info"><strong>${p.name}</strong><div style="color:var(--muted);font-size:12px">${p.category} · ${p.condition}</div><div class="price">${money(p.price)}</div><div class="qty"><button data-qty="${p.id}" data-delta="-1" aria-label="Decrease quantity">−</button><strong>${it.qty}</strong><button data-qty="${p.id}" data-delta="1" aria-label="Increase quantity" ${Number(it.qty) >= Number(p.stock ?? 1) ? "disabled title='Maximum stock reached'" : ""}>+</button><small class="eb-cart-stock ${Number(p.stock ?? 1) > 0 ? "" : "unavailable"}">${Number(p.stock ?? 1) > 0 ? `${Number(p.stock)} in stock` : "Out of stock"}</small><button data-remove="${p.id}" style="background:none;color:#d35454;width:auto">Remove</button></div></div></div>`;
      })
      .join(
        "",
      )}</div><aside class="summary"><h3>Order summary</h3><div class="sumrow"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="sumrow"><span>Student delivery</span><strong>Arrange on campus</strong></div><div class="sumrow sumtotal"><span>Total</span><span>${money(subtotal)}</span></div><button class="primary" id="checkout" style="width:100%;margin-top:15px">Continue to payment →</button><p style="font-size:11px;color:var(--muted)">Cash on Delivery only. Delivery charges depend on your address and order value.</p></aside></div></div>`;
    $("#checkout").onclick = () => go("#checkout");
  }
  function checkoutPage() {
    if (!cart.length) {
      app.innerHTML = `<div class="wrap page-title"><h1>Checkout</h1><div class="empty">Your cart is empty. <a href="#shop">Shop now</a></div></div>`;
      return;
    }
    const subtotal = cart.reduce((sum, it) => sum + (products.find((p) => String(p.id) === String(it.id))?.price || 0) * it.qty, 0);
    const deliveryFee = (address, speed) => (subtotal >= 1500 ? 0 : (/college|campus|hostel|nearby/i.test(address) ? 25 : 60)) + (speed === "fast" ? 49 : 0);
    const standardDates = dateRange(12, 14), fastDates = dateRange(5, 7);
    const initialFee = deliveryFee("", "standard");
    app.innerHTML = `<div class="wrap page-title"><a class="textlink" href="#cart">← Back to cart</a><h1>Checkout</h1><p style="color:var(--muted)">Enter delivery details. Cash on Delivery is the only payment method available in EasyBuy.</p><div class="cart-layout"><form class="formcard" id="paymentForm"><h2>Delivery details</h2><div class="formgrid"><div class="field"><label for="payName">Full name</label><input id="payName" name="name" required maxlength="100" autocomplete="name" placeholder="Your name"></div><div class="field"><label for="payPhone">Mobile number</label><input id="payPhone" name="phone" required inputmode="tel" pattern="[0-9 +()-]{10,16}" autocomplete="tel" placeholder="10-digit mobile number"></div><div class="field" style="grid-column:1/-1"><label for="payAddress">Delivery address / college and meeting spot</label><textarea id="payAddress" name="address" required maxlength="400" placeholder="College, area, hostel or delivery address"></textarea></div></div><h2 style="margin-top:24px">Delivery speed</h2><div class="eb-panel" style="padding:16px;margin:10px 0"><label style="display:flex;gap:10px;align-items:flex-start;margin:10px 0"><input type="radio" name="deliverySpeed" value="standard" checked><span><strong>Standard delivery · 12–14 days</strong><br><small>Estimated ${standardDates.label} · Charge: <b id="standardDeliveryOptionFee">${initialFee ? money(initialFee) : "Free"}</b></small></span></label><label style="display:flex;gap:10px;align-items:flex-start;margin:10px 0"><input type="radio" name="deliverySpeed" value="fast"><span><strong>⚡ Fast delivery · 5–7 days</strong><br><small>Estimated ${fastDates.label} · Charge: <b id="fastDeliveryOptionFee">${deliveryFee("", "fast") ? money(deliveryFee("", "fast")) : "Free"}</b></small></span></label><p id="deliveryEstimate" class="eb-help">Estimated delivery: ${standardDates.label}. Actual delivery depends on the seller and delivery location.</p></div><h2 style="margin-top:24px">Payment method</h2><div class="eb-panel" style="padding:16px;margin:10px 0"><strong>💵 Cash on Delivery (COD)</strong><p style="font-size:13px;margin:8px 0 0;color:var(--muted)">Pay the seller in cash when you receive your order. Online payment is not available inside this app. If you prefer GPay/UPI, contact the seller directly and arrange it with them outside EasyBuy; the app will not process or verify that payment.</p></div><input type="hidden" name="paymentMethod" value="Cash on Delivery"><div class="sumrow"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="sumrow"><span>Delivery charge</span><strong id="deliveryFeeValue">${initialFee ? money(initialFee) : "Free"}</strong></div><div class="sumrow sumtotal"><span>Total</span><strong id="checkoutTotal">${money(subtotal + initialFee)}</strong></div><button class="primary" type="submit" style="width:100%;margin-top:18px">Place COD order →</button><p style="font-size:11px;color:var(--muted);margin-top:12px">Delivery charge is estimated from the address and order value: nearby campus/hostel ₹25, other addresses ₹60, and free delivery for orders of ₹1,500 or more. The final charge is shown before placing the order.</p></form><aside class="summary"><h3>Order summary</h3>${cart.map((it) => { const p = products.find((x) => String(x.id) === String(it.id)); return p ? `<div class="sumrow" style="align-items:center;gap:10px"><div style="flex:1"><span>${p.name}</span><div class="qty" style="margin-top:6px"><button type="button" data-checkout-qty="${p.id}" data-delta="-1" aria-label="Decrease ${p.name} quantity">−</button><strong>${it.qty}</strong><button type="button" data-checkout-qty="${p.id}" data-delta="1" aria-label="Increase ${p.name} quantity" ${Number(it.qty) >= Number(p.stock ?? 1) ? "disabled title='Maximum stock reached'" : ""}>+</button></div></div><strong>${money(p.price * it.qty)}</strong></div>` : ""; }).join("")}<div class="sumrow"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="sumrow"><span>Delivery</span><strong id="summaryDelivery">${initialFee ? money(initialFee) : "Free"}</strong></div><div class="sumrow sumtotal"><span>Total</span><strong id="summaryTotal">${money(subtotal + initialFee)}</strong></div></aside></div></div>`;
    const addressInput = $("#payAddress");
    const selectedSpeed = () => document.querySelector('input[name="deliverySpeed"]:checked')?.value || "standard";
    function refreshDelivery() {
      const speed = selectedSpeed(), fee = deliveryFee(addressInput.value, speed), total = subtotal + fee;
      const standardFee = deliveryFee(addressInput.value, "standard"), fastFee = deliveryFee(addressInput.value, "fast");
      $("#standardDeliveryOptionFee").textContent = standardFee ? money(standardFee) : "Free";
      $("#fastDeliveryOptionFee").textContent = fastFee ? money(fastFee) : "Free";
      $("#deliveryFeeValue").textContent = fee ? money(fee) : "Free";
      $("#summaryDelivery").textContent = fee ? money(fee) : "Free";
      $("#checkoutTotal").textContent = $("#summaryTotal").textContent = money(total);
      $("#deliveryEstimate").textContent = speed === "fast" ? `Estimated delivery: ${fastDates.label} (5–7 days). Actual delivery depends on the seller and location.` : `Estimated delivery: ${standardDates.label} (12–14 days). Actual delivery depends on the seller and location.`;
    }
    addressInput.addEventListener("input", refreshDelivery);
    document.querySelectorAll('input[name="deliverySpeed"]').forEach((radio) => radio.addEventListener("change", refreshDelivery));
    $("#paymentForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!e.target.reportValidity()) return;
      const f = new FormData(e.target), email = sessionStorage.getItem("easybuy_js_session_v1");
      if (!email) { toast("Please login before placing an order."); go("#login"); return; }
      const customer = { name: String(f.get("name")).trim(), phone: String(f.get("phone")).trim(), address: String(f.get("address")).trim() };
      const speed = selectedSpeed(), estimate = speed === "fast" ? fastDates : standardDates;
      const payload = { email, customer, paymentMethod: "Cash on Delivery", deliverySpeed: speed, estimatedDeliveryStart: estimate.start, estimatedDeliveryEnd: estimate.end, items: cart.map((it) => { const p = products.find((x) => String(x.id) === String(it.id)); return { id: String(it.id), qty: Number(it.qty), price: Number(p?.price || 0), name: String(p?.name || it.id), category: String(p?.category || "Accessories"), image: String(p?.image || ""), stock: Number(p?.stock ?? 1) }; }) };
      const btn = e.target.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Saving order…";
      try {
        const response = await fetch("api/orders.php", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Order could not be saved");
        const order = { ...result.order, items: payload.items, total: result.order.total, customer };
        payload.items.forEach((orderedItem) => { const liveMatch = String(orderedItem.id).match(/^LIVE-(\d+)$/); if (!liveMatch) return; const listed = products.find((item) => String(item.id) === String(orderedItem.id)); if (listed) listed.stock = Math.max(0, Number(listed.stock ?? 0) - Number(orderedItem.qty || 0)); });
        orders.unshift(order); cart = []; save();
        go("#order-success?order=" + encodeURIComponent(result.order.orderNo || result.order.order_code || ""));
      } catch (err) { toast("Order not saved: " + err.message); btn.disabled = false; btn.textContent = "Place COD order →"; }
    });
  }
  async function cancelOrderFromHistory(code, button) {
    const email = sessionStorage.getItem("easybuy_js_session_v1") || "";
    if (!email) {
      toast("Please sign in to view your orders.");
      return;
    }
    if (
      !confirm(
        "Cancel order " + code + "? This is only available before shipping.",
      )
    )
      return;
    button.disabled = true;
    try {
      const r = await fetch("api/orders.php", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          email,
          orderCode: code,
          reason: "Cancelled from My Orders",
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || "Could not cancel order");
      toast(d.message || "Order cancelled");
      ordersPage();
    } catch (e) {
      toast(e.message);
    } finally {
      button.disabled = false;
    }
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cancel-order]");
    if (b) {
      e.preventDefault();
      cancelOrderFromHistory(b.dataset.cancelOrder, b);
    }
  });
  function sell() {
    app.innerHTML = `<div class="wrap page-title"><h1>Sell to your campus.</h1><p style="color:var(--muted)">Publish your product and it will appear in the EasyBuy catalogue and your listing history on this browser.</p><form class="formcard" id="sellForm"><div class="formgrid"><div class="field"><label>Product name</label><input name="name" required maxlength="100" placeholder="e.g. Physics textbook"></div><div class="field"><label>Category</label><select name="category">${[...new Set(products.map((p) => p.category))].map((c) => `<option>${c}</option>`).join("")}</select></div><div class="field"><label>Price (₹)</label><input name="price" type="number" min="1" max="100000" required placeholder="150"></div><div class="field"><label>Condition</label><select name="condition"><option>Second-hand · Very good</option><option>Second-hand · Good</option><option>First-hand · New</option></select></div><div class="field"><label>College</label><input name="college" required maxlength="100" placeholder="Your college name"></div><div class="field"><label>Contact handle (optional)</label><input name="contact" maxlength="100" placeholder="Student contact handle"></div></div><div class="field"><label>Product photo</label><input name="imageFile" id="sellImage" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required><small style="color:var(--muted)">Upload a clear real photo of the item you are selling. JPG, PNG, WEBP or GIF; maximum 1.5 MB.</small><img id="sellPreview" alt="Selected product preview" style="display:none;max-width:180px;max-height:180px;object-fit:contain;border-radius:12px"></div><div class="field"><label>Description</label><textarea name="description" required maxlength="1200" placeholder="Describe condition, age, included items…"></textarea></div><button class="primary" type="submit">Publish product ↗</button><p style="font-size:12px;color:var(--muted)">This JavaScript-only version saves products in this browser. They will appear in Shop after publishing, but not on other devices.</p></form><div id="myListings"></div></div>`;
    let selectedImage = "";
    const fileInput = $("#sellImage");
    fileInput.onchange = () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        selectedImage = "";
        $("#sellPreview").style.display = "none";
        return;
      }
      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
        toast("Please choose a JPG, PNG, WEBP or GIF image");
        fileInput.value = "";
        return;
      }
      if (file.size > 1500000) {
        toast("Please choose an image smaller than 1.5 MB");
        fileInput.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        selectedImage = String(reader.result || "");
        $("#sellPreview").src = selectedImage;
        $("#sellPreview").style.display = "block";
      };
      reader.readAsDataURL(file);
    };
    $("#sellForm").onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.target),
        name = String(f.get("name") || "").trim(),
        price = Number(f.get("price"));
      if (!name || !Number.isFinite(price) || price < 1) {
        toast("Enter a product name and valid price");
        return;
      }
      if (!selectedImage) {
        toast("Please upload a product photo before publishing");
        return;
      }
      const id =
          "user-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        category = String(f.get("category")),
        condition = String(f.get("condition")),
        college = String(f.get("college") || "").trim(),
        description = String(f.get("description") || "").trim(),
        fallback =
          "images/categories/" +
          ({
            Electronics: "electronics",
            Books: "books",
            "Stationery Kits": "stationery",
            Calculators: "calculators",
            "Lab Equipment": "lab-equipment",
            Accessories: "accessories",
            "T-Shirts": "clothing",
            Bags: "bags",
          }[category] || "accessories") +
          ".svg";
      const listing = {
        id,
        name,
        category,
        price,
        oldPrice: price,
        condition,
        college,
        seller_name: getDisplaySellerName(),
        contact: String(f.get("contact") || ""),
        description,
        image: selectedImage || fallback,
        date: new Date().toLocaleString(),
        createdAt: Date.now(),
      };
      let mine;
      try {
        mine = JSON.parse(localStorage.getItem("eb_listings") || "[]");
        if (!Array.isArray(mine)) mine = [];
        mine.unshift(listing);
        localStorage.setItem("eb_listings", JSON.stringify(mine));
      } catch (err) {
        toast("Storage is full. Try a smaller product image.");
        return;
      }
      products.unshift({
        id,
        name,
        category,
        price,
        oldPrice: price,
        condition,
        college,
        seller_name: listing.seller_name,
        contact: listing.contact,
        description,
        subtitle: "Student listing",
        image: listing.image,
        rating: 5,
        reviews: 0,
        stock: 1,
        specs: { Seller: "Student listing", Condition: condition },
      });
      e.target.reset();
      selectedImage = "";
      $("#sellPreview").style.display = "none";
      renderMine();
      toast(
        "Product published! It is now available in Shop and product search.",
      );
    };
    function renderMine() {
      const mine = (() => {
        try {
          return JSON.parse(localStorage.getItem("eb_listings") || "[]");
        } catch (_) {
          return [];
        }
      })();
      $("#myListings").innerHTML = mine.length
        ? `<h2 style="margin-top:30px">Your published products</h2>` +
          mine
            .map(
              (x) =>
                `<div class="cart-item"><img src="${x.image || "images/categories/accessories.svg"}" alt="${x.name}" onerror="this.onerror=null;this.src='images/categories/accessories.svg'"><div class="cart-item-info"><strong>${x.name}</strong><div>${x.category} · ${x.condition} · ${x.college}</div><div class="sellerline">👤 Published by ${escapeHtml(x.seller_name || getDisplaySellerName())}</div><b>${money(x.price)}</b><div style="color:var(--muted);font-size:12px">Published ${x.date || ""}</div><a class="textlink" href="#product?id=${encodeURIComponent(x.id)}">View product →</a></div></div>`,
            )
            .join("")
        : '<div class="empty" style="margin-top:25px">You have not published any products yet.</div>';
    }
    renderMine();
  }
  async function trackingPage(orderNo) {
    const email = sessionStorage.getItem("easybuy_js_session_v1");
    if (!email) {
      go("#login");
      return;
    }
    app.innerHTML = `<div class="wrap page-title"><a class="textlink" href="#orders">← My Orders</a><h1>Track your order</h1><p>Loading order details…</p></div>`;
    try {
      const r = await fetch(
        `api/orders.php?email=${encodeURIComponent(email)}`,
        { credentials: "same-origin" },
      );
      const raw = await r.text();
      let d;
      try { d = JSON.parse(raw); }
      catch (_) {
        const preview = raw.replace(/\s+/g, " ").slice(0, 220);
        throw new Error(`Tracking API returned non-JSON (HTTP ${r.status}). Check /ready/api/health.php and PHP error log. Response: ${preview || "empty response"}`);
      }
      if (!r.ok || !d.ok) throw new Error(d.error || `Could not load orders (HTTP ${r.status})`);
      if (!orderNo) {
        const list = Array.isArray(d.orders) ? d.orders : [];
        app.innerHTML = `<div class="wrap page-title"><a class="textlink" href="#orders">← My Orders</a><span class="eyebrow">ORDER TRACKING</span><h1>Choose an order to track</h1><p style="color:var(--muted)">Select one of your orders to see shipping status, shipper name and tracking updates.</p>${list.length ? `<div class="eb-my-products-list">${list.map((item) => `<article class="cart-item"><div class="cart-item-info"><strong>Order ${escapeHtml(item.order_code || item.orderNo || item.id)}</strong><p>Status: ${escapeHtml(item.status || "Placed")} · ${new Date(item.created_at || item.date).toLocaleDateString("en-IN")}</p><p>Total: ${money(Number(item.total || 0))}</p><button type="button" class="primary" data-track-order="${escapeHtml(item.order_code || item.orderNo || item.id)}">Track this order →</button></div></article>`).join("")}</div>` : `<div class="empty"><h2>No orders yet</h2><p>Place an order first, then you can track it here.</p><a class="primary" href="#shop">Browse products</a></div>`}</div>`;
        return;
      }
      const o = d.orders.find(
        (x) =>
          String(x.order_code || x.orderNo) === String(orderNo) ||
          String(x.id) === String(orderNo),
      );
      if (!o) {
        app.innerHTML = `<div class="wrap page-title"><h1>Order not found</h1><p>This order is not available in your account.</p><a class="primary" href="#orders">Back to My Orders</a></div>`;
        return;
      }
      const stages = ["Placed", "Confirmed", "Shipped", "Delivered"];
      const current = stages.indexOf(o.status);
      const isCancelled = o.status === "Cancelled";
      app.innerHTML = `<div class="wrap page-title"><a class="textlink" href="#orders">← My Orders</a><span class="eyebrow">ORDER TRACKING</span><h1>${o.order_code || o.orderNo}</h1><p>Placed ${new Date(o.created_at || o.date).toLocaleString()}</p><section class="eb-panel" style="margin:22px 0"><h2>Status timeline</h2><div class="eb-tracking-timeline">${stages.map((x, i) => `<div class="eb-track-step ${i <= current ? "done" : ""}"><span>${i < current ? "✓" : i + 1}</span><strong>${x}</strong></div>`).join("")}</div><p><strong>Current status:</strong> ${o.status}</p>${(o.estimated_delivery_start || o.estimatedDeliveryStart) && (o.estimated_delivery_end || o.estimatedDeliveryEnd) ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin:16px 0"><h3 style="margin:0 0 8px">📦 Expected delivery</h3><p style="font-size:18px;font-weight:800;margin:0">${new Date((o.estimated_delivery_start || o.estimatedDeliveryStart) + "T12:00:00").toLocaleDateString("en-IN", {day:"numeric",month:"long",year:"numeric"})} – ${new Date((o.estimated_delivery_end || o.estimatedDeliveryEnd) + "T12:00:00").toLocaleDateString("en-IN", {day:"numeric",month:"long",year:"numeric"})}</p><p style="margin:6px 0 0">Delivery speed: ${(o.delivery_speed || o.deliverySpeed) === "fast" ? "⚡ Fast delivery (5–7 days)" : "Standard delivery (12–14 days)"}</p></div>` : `<p class="eb-help">Expected delivery dates are not available for this older order.</p>`}${isCancelled ? '<p class="eb-help">This order was cancelled. Check My Orders for details.</p>' : ""}<p>${o.customer_name || o.customer?.name || ""} · ${o.customer_phone || o.customer?.phone || ""}</p><p>${o.delivery_address || o.customer?.address || ""}</p></section>${o.deliveryOtp ? `<section class="eb-panel" style="margin:18px 0;border:1px solid #2874f0"><h2>🔐 Delivery OTP</h2><p>Show this code to the seller only when you receive the product.</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#185adb">${o.deliveryOtp}</div><p class="eb-help">Demo delivery code. SMS delivery is not configured in this project.</p></section>` : ""}${o.deliveryOtpVerified ? '<section class="eb-panel"><h2>✓ Product received</h2><p>Your delivery OTP was verified. EasyBuy has saved a delivery confirmation message.</p></section>' : ""}<section class="eb-panel"><h2>Products</h2>${(o.items || []).map((it) => `<div class="cart-item"><img src="${it.image || "images/categories/accessories.svg"}" alt="" onerror="this.src='images/categories/accessories.svg'"><div class="cart-item-info"><strong>${it.name || it.product_name}</strong><p>${it.category || ""} · Qty ${it.qty || it.quantity}</p><b>${money(Number(it.price || it.unit_price) * (Number(it.qty || it.quantity) || 1))}</b></div></div>`).join("")}<h2>Total: ${money(o.total)}</h2><p>Payment: ${o.payment_method || o.paymentMethod} · ${o.payment_status || o.paymentStatus}</p><a class="primary" href="api/invoice.php?email=${encodeURIComponent(email)}&order=${encodeURIComponent(o.order_code || o.orderNo)}">⬇ Download Invoice PDF</a></section><section class="eb-panel" style="margin-top:20px"><h2>Shipping & tracking</h2><p><strong>Shipper:</strong> ${escapeHtml(o.shipperName || "Not assigned yet")}</p><p><strong>Tracking number:</strong> ${escapeHtml(o.trackingNumber || "Not available")}</p>${getCourierTrackingUrl(o.trackingUrl) ? `<p><a class="primary" target="_blank" rel="noopener noreferrer" href="${escapeHtml(getCourierTrackingUrl(o.trackingUrl))}">Open courier tracking ↗</a></p>` : (o.trackingUrl ? `<p class="eb-help">Courier tracking link is not valid. Seller must enter the courier company's real website URL (not an EasyBuy localhost tracking link).</p>` : "")}<h3>Tracking updates</h3>${(o.tracking || []).map((t) => `<p><strong>${escapeHtml(t.status)}</strong> · ${new Date(t.created_at).toLocaleString()}<br>${escapeHtml(t.note || "")}</p>`).join("") || "<p>Order created successfully.</p>"}</section>${o.status === "Delivered" && !o.returnRequest ? `<section class="eb-panel" style="margin-top:20px"><h2>Return request (within 48 hours)</h2><p>Received: ${o.receivedAt ? new Date(o.receivedAt.replace(" ","T")).toLocaleString("en-IN") : "Delivery confirmed"}. Return eligibility is checked by the server.</p><form id="ebReturnForm"><label>Reason for return<textarea name="reason" minlength="5" maxlength="500" required placeholder="Tell us why you want to return this item"></textarea></label><button class="primary">Submit return request</button><p id="ebReturnNotice" role="status"></p></form></section>` : o.returnRequest ? `<section class="eb-panel" style="margin-top:20px"><h2>Return & refund status</h2><p><strong>${escapeHtml(o.returnRequest.status)}</strong> · ${escapeHtml(o.returnRequest.reason)}</p><p>Refund amount: ${money(Number(o.returnRequest.refund_amount || 0))}</p><h3>Refund update history</h3>${(o.returnHistory || []).length ? (o.returnHistory || []).map(h => `<p><strong>${escapeHtml(h.status)}</strong> · ${new Date(h.created_at).toLocaleString("en-IN")}<br>${escapeHtml(h.note || "Status updated")}</p>`).join("") : `<p class="eb-help">Request created · ${new Date(o.returnRequest.created_at).toLocaleString("en-IN")}. Further updates will appear here.</p>`}</section>` : ""}${o.status === "Delivered" ? `<section class="eb-panel" style="margin-top:20px"><h2>Rate your purchase</h2>${(o.items || []).map(it => { const existing=(o.feedback||[]).find(f=>String(f.product_code)===String(it.id)); return `<form class="ebFeedbackForm" data-product-code="${escapeHtml(it.id)}" style="border-top:1px solid #e5e7eb;padding:12px 0"><strong>${escapeHtml(it.name || it.product_name)}</strong>${existing ? `<p>Saved rating: ${"★".repeat(Number(existing.rating))}${"☆".repeat(5-Number(existing.rating))} · ${escapeHtml(existing.comment || "")}</p>` : `<label>Rating <select name="rating" required><option value="">Choose stars</option><option value="1">1 star</option><option value="2">2 stars</option><option value="3">3 stars</option><option value="4">4 stars</option><option value="5">5 stars</option></select></label><label>Feedback <textarea name="comment" maxlength="1000" placeholder="Share your experience"></textarea></label><button class="secondary">Save rating</button>`}</form>`; }).join("")}<p id="ebFeedbackNotice" role="status"></p></section>` : ""}</div>`;
      const returnForm = document.querySelector("#ebReturnForm");
      returnForm?.addEventListener("submit", async (ev) => { ev.preventDefault(); const notice=document.querySelector("#ebReturnNotice"); try { const rr=await fetch("api/order-features.php",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"return_request",email,orderCode:o.order_code||o.orderNo,reason:new FormData(returnForm).get("reason")})}); const rd=await rr.json(); if(!rr.ok||!rd.ok) throw new Error(rd.error||"Return request failed"); notice.textContent=rd.message; trackingPage(orderNo); } catch(err) { notice.textContent=err.message; } });
      document.querySelectorAll(".ebFeedbackForm").forEach(form => form.addEventListener("submit", async ev => { ev.preventDefault(); const fd=new FormData(form); try { const rr=await fetch("api/order-features.php",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"feedback",email,orderCode:o.order_code||o.orderNo,productCode:form.dataset.productCode,rating:fd.get("rating"),comment:fd.get("comment")})}); const rd=await rr.json(); if(!rr.ok||!rd.ok) throw new Error(rd.error||"Feedback failed"); document.querySelector("#ebFeedbackNotice").textContent=rd.message; trackingPage(orderNo); } catch(err) { document.querySelector("#ebFeedbackNotice").textContent=err.message; } }));
    } catch (e) {
      app.innerHTML = `<div class="wrap page-title"><h1>Tracking unavailable</h1><p>${e.message}. Make sure XAMPP MySQL is running and the database is configured.</p><a class="primary" href="#orders">Back to My Orders</a></div>`;
    }
  }
  function orderSuccessPage(orderCode) {
    const email = sessionStorage.getItem("easybuy_js_session_v1") || "";
    app.innerHTML = `<div class="wrap page-title"><section class="eb-panel" style="max-width:760px;margin:30px auto;text-align:center;padding:clamp(24px,5vw,54px)"><div style="width:84px;height:84px;border-radius:50%;display:grid;place-items:center;background:#dcfce7;color:#15803d;font-size:48px;font-weight:900;margin:0 auto 20px">✓</div><span class="eyebrow">EASYBUY ORDER CONFIRMATION</span><h1 style="margin:10px 0">Order placed successfully!</h1><p style="color:var(--muted)">Your order has been saved. Keep your order ID for tracking.</p><div style="display:inline-block;background:#f1f5f9;border-radius:12px;padding:14px 22px;margin:14px 0"><small style="display:block;color:var(--muted)">ORDER ID</small><strong style="font-size:20px">${String(orderCode || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])}</strong></div><p id="ebSuccessDetails" style="color:var(--muted)">Loading saved order details…</p><div class="eb-action-row" style="justify-content:center;margin-top:22px"><a class="primary" href="#orders">View My Orders →</a><a class="secondary" href="#shop">Continue shopping</a></div></section></div>`;
    if (!email || !orderCode) {
      $("#ebSuccessDetails").textContent = "Order confirmed.";
      return;
    }
    fetch(`api/orders.php?email=${encodeURIComponent(email)}`, {
      credentials: "same-origin",
    })
      .then((r) => r.json())
      .then((d) => {
        const o = (d.orders || []).find(
          (x) => (x.order_code || x.orderNo) === orderCode,
        );
        if (o && $("#ebSuccessDetails"))
          $("#ebSuccessDetails").textContent =
            `${(o.items || []).length} item(s) · Total ${money(Number(o.total) || 0)} · Payment: ${o.payment_method || o.paymentMethod || "—"}`;
      })
      .catch(() => {
        if ($("#ebSuccessDetails"))
          $("#ebSuccessDetails").textContent =
            "Order saved. You can review its details in My Orders.";
      });
  }
  function ordersPage() {
    const email = sessionStorage.getItem("easybuy_js_session_v1") || "";
    app.innerHTML = `<div class="wrap page-title"><span class="eyebrow">ORDER CENTRE</span><h1>My Orders</h1><p style="color:var(--muted)">View product details, follow delivery progress, and download your invoice.</p><div id="ebOrdersList">Loading saved orders…</div></div>`;
    const render = (list) => {
      orders = list;
      save();
      const box = $("#ebOrdersList");
      if (!box) return;
      box.innerHTML = list.length
        ? list
            .map((o) => {
              const code = o.order_code || o.orderNo || o.id;
              const items = o.items || [];
              const first = items[0] || {};
              const firstId = first.id || first.product_code || "";
              return `<article class="eb-panel" style="margin:16px 0"><div class="sectionhead"><div><span class="eyebrow">ORDER ID</span><h2>${code}</h2><p>${new Date(o.created_at || o.date || Date.now()).toLocaleString()}</p>${(o.estimated_delivery_start || o.estimatedDeliveryStart) ? `<p><strong>📦 Expected delivery:</strong> ${new Date((o.estimated_delivery_start || o.estimatedDeliveryStart) + "T12:00:00").toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})} – ${new Date((o.estimated_delivery_end || o.estimatedDeliveryEnd) + "T12:00:00").toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})} · ${(o.delivery_speed || o.deliverySpeed) === "fast" ? "⚡ Fast" : "Standard"}</p>` : ""}</div><strong class="eb-order-status">${o.status || "Placed"}</strong></div><div>${items.map((it) => `<div class="cart-item"><img src="${it.image || "images/categories/accessories.svg"}" alt="" onerror="this.src='images/categories/accessories.svg'"><div class="cart-item-info"><strong>${it.name || it.product_name || it.id}</strong><div>${it.category || ""} · Qty ${it.qty || it.quantity || 1}</div><b>${money(Number(it.price || it.unit_price || 0) * Number(it.qty || it.quantity || 1))}</b></div></div>`).join("")}</div><div class="sumrow sumtotal"><span>Order total</span><strong>${money(o.total)}</strong></div><p>Payment: ${o.payment_method || o.paymentMethod || "—"} · ${o.payment_status || o.paymentStatus || "—"}</p><div class="eb-action-row"><button class="primary" type="button" data-track-order="${code}">Track Order</button>${firstId ? `<a class="secondary" href="#product?id=${encodeURIComponent(firstId)}">View Product</a>` : ""}<a class="secondary" href="api/invoice.php?email=${encodeURIComponent(email)}&order=${encodeURIComponent(code)}">⬇ Download Invoice PDF</a>${["Placed", "Confirmed"].includes(o.status) ? `<button class="secondary" type="button" data-cancel-order="${code}">Cancel order</button>` : ""}</div></article>`;
            })
            .join("")
        : '<div class="empty">No database orders found yet. Place an order after setting up MySQL.</div>';
    };
    fetch(`api/orders.php?email=${encodeURIComponent(email)}`, {
      credentials: "same-origin",
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "Failed");
        render(d.orders || []);
      })
      .catch(() => render(orders.filter((o) => o.orderNo || o.order_code)));
  }
  function toast(msg) {
    let t = $("#toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.style.cssText =
        "position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:10000;background:#14213d;color:white;padding:13px 19px;border-radius:12px;box-shadow:0 10px 35px #14213d33;font-weight:700;font-size:13px";
      document.body.append(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    clearTimeout(window.ebToastTimer);
    window.ebToastTimer = setTimeout(() => (t.style.opacity = "0"), 2200);
  }
  function wishlistPage() {
    const saved = wishlist
      .map((id) => products.find((p) => String(p.id) === String(id)))
      .filter(Boolean);
    app.innerHTML = `<div class="wrap page-title"><span class="eyebrow">YOUR SAVED FINDS</span><h1>My Wishlist</h1><p style="color:var(--muted)">Products you save will be waiting here when you need them.</p>${saved.length ? `<div class="sectionhead"><div><h2>Saved products</h2><p>${saved.length} product${saved.length === 1 ? "" : "s"} in your wishlist</p></div><button class="secondary" id="clearWishlist" type="button">Clear wishlist</button></div><div class="product-grid">${saved.map(card).join("")}</div>` : `<div class="empty"><div style="font-size:50px">♡</div><h2>Your wishlist is empty</h2><p>Tap the heart on any product to save it here.</p><a class="primary" href="#shop">Explore products</a></div>`}</div>`;
    const clear = $("#clearWishlist");
    if (clear)
      clear.addEventListener("click", () => {
        wishlist = [];
        save();
        wishlistPage();
        toast("Wishlist cleared");
      });
  }
  function myProductsPage() {
    const mine = readArray("eb_listings");
    app.innerHTML = `<div class="wrap page-title"><span class="eyebrow">SELLER STUDIO</span><h1>My Products</h1><p style="color:var(--muted)">Products you have published from this browser.</p><div class="eb-action-row"><a class="primary" href="#sell">＋ Sell a product</a><a class="secondary" href="seller/">Open Seller Dashboard</a></div>${mine.length ? `<div class="sectionhead"><div><h2>Your published listings</h2><p>${mine.length} product${mine.length === 1 ? "" : "s"}</p></div></div><div class="eb-my-products-list">${mine.map((x) => `<article class="cart-item"><img src="${x.image || "images/categories/accessories.svg"}" alt="${String(x.name || "Product").replace(/[&<>"]/g, "")}" onerror="this.onerror=null;this.src='images/categories/accessories.svg'"><div class="cart-item-info"><strong>${String(x.name || "Untitled product")}</strong><div>${String(x.category || "") } · ${String(x.condition || "")}</div><b>${money(Number(x.price) || 0)}</b><div style="color:var(--muted);font-size:12px">Published ${String(x.date || "")}</div><a class="textlink" href="#product?id=${encodeURIComponent(x.id || "")}">View product →</a></div></article>`).join("")}</div>` : `<div class="empty"><h2>No products published yet</h2><p>Start by adding your first campus listing.</p><a class="primary" href="#sell">Sell a product</a></div>`}</div>`;
  }
  function recordProductHistory(id) {
    if (id === undefined || id === null || String(id) === "") return;
    let history = [];
    try {
      const stored = JSON.parse(
        localStorage.getItem("eb_product_history") || "[]",
      );
      if (Array.isArray(stored)) history = stored.map(String);
    } catch (_) {}
    history = [String(id), ...history.filter((x) => x !== String(id))].slice(
      0,
      24,
    );
    try {
      localStorage.setItem("eb_product_history", JSON.stringify(history));
    } catch (_) {}
  }
  function productHistoryPage() {
    let ids = [];
    try {
      const stored = JSON.parse(
        localStorage.getItem("eb_product_history") || "[]",
      );
      ids = Array.isArray(stored) ? stored.map(String) : [];
    } catch (_) {
      ids = [];
    }
    const seen = ids
      .map((id) => products.find((p) => String(p.id) === id))
      .filter(Boolean);
    app.innerHTML = `<section class="section"><div class="wrap"><div class="page-title"><span class="eyebrow">YOUR ACTIVITY</span><h1>Product History</h1><p style="color:var(--muted)">Recently viewed products are saved on this device.</p></div><div class="sectionhead"><div><h2>Recently viewed</h2><p>${seen.length} product${seen.length === 1 ? "" : "s"} in your history</p></div>${seen.length ? '<button class="secondary" id="clearProductHistory" type="button">Clear history</button>' : ""}</div>${seen.length ? `<div class="product-grid">${seen.map(card).join("")}</div>` : `<div class="eb-history-empty"><div class="eb-history-icon">◷</div><h3>No product history yet</h3><p>Open any product from Shop and it will appear here, so you can find it again easily.</p><a class="primary" href="#shop">Explore products</a></div>`}</div></section>`;
    const clear = $("#clearProductHistory");
    if (clear)
      clear.addEventListener("click", () => {
        localStorage.removeItem("eb_product_history");
        productHistoryPage();
        toast("Product history cleared");
      });
  }
  async function messagesPage() {
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    const productId = params.get("product") || "";
    const product = products.find(x => String(x.id) === productId);
    const to = params.get("to") || (product && product.seller_email) || "";
    const sellerName = params.get("name") || (product && (product.seller_name || product.sellerName)) || "Seller";
    const key = "eb_buyer_email";
    const savedEmail = localStorage.getItem(key) || "";
    app.innerHTML = `<div class="wrap page-title"><span class="eyebrow">EASYBUY MESSAGES</span><h1>Message the seller</h1><p>Ask about product details, pickup point, map location, or refund updates. Messages are saved in the EasyBuy database.</p>${product ? `<section class="eb-panel"><strong>${escapeHtml(product.name)}</strong><p>${escapeHtml(product.college || "College not provided")}</p></section>` : ""}<form class="formcard" id="buyerMessageForm"><div class="field"><label>Your email</label><input type="email" name="email" required value="${escapeHtml(savedEmail)}" placeholder="you@example.com"></div><div class="field"><label>Seller email</label><input type="email" name="to" required value="${escapeHtml(to)}" placeholder="Seller email from product listing" ${to ? "readonly" : ""}></div><div class="field"><label>Message</label><textarea name="body" minlength="2" maxlength="5000" required placeholder="Hi, can you share the public pickup location and Google Maps link?"></textarea></div><button class="primary" type="submit">Send message</button><p id="buyerMessageNotice" role="status"></p></form><section class="eb-panel" style="margin-top:18px"><div class="sectionhead"><div><h2>Conversation history</h2><p>Enter your email above to load saved messages.</p></div><button class="secondary" id="loadBuyerMessages" type="button">Refresh messages</button></div><div id="buyerMessageHistory">No messages loaded yet.</div></section></div>`;
    const form = document.querySelector("#buyerMessageForm");
    async function loadHistory() {
      const email = String(form.elements.email.value || "").trim().toLowerCase();
      if (!email) return;
      try {
        const r = await fetch(`api/messages.php?email=${encodeURIComponent(email)}`, {credentials:"same-origin", headers:{Accept:"application/json"}});
        const d = await r.json(); if (!r.ok || !d.ok) throw new Error(d.error || "Could not load messages");
        const relevant = (d.messages || []).filter(m => !to || m.sender_email === to || m.recipient_email === to);
        document.querySelector("#buyerMessageHistory").innerHTML = relevant.length ? relevant.map(m => `<article style="border-bottom:1px solid #e5e7eb;padding:10px 0"><strong>${escapeHtml(m.sender_role === "seller" ? "Seller" : "You")}</strong><small> · ${new Date(m.created_at).toLocaleString("en-IN")}</small><p>${escapeHtml(m.body)}</p></article>`).join("") : "No messages yet for this seller.";
      } catch (err) { document.querySelector("#buyerMessageHistory").textContent = err.message; }
    }
    document.querySelector("#loadBuyerMessages").addEventListener("click", loadHistory);
    form.addEventListener("submit", async ev => {
      ev.preventDefault(); const b=form.querySelector("button[type=submit]"); b.disabled=true;
      const email=String(form.elements.email.value||"").trim().toLowerCase(); localStorage.setItem(key,email);
      try {
        const r=await fetch("api/messages.php",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({email,to:String(form.elements.to.value||"").trim().toLowerCase(),body:String(form.elements.body.value||"").trim(),productCode:productId,threadKey:""})});
        const d=await r.json(); if(!r.ok||!d.ok) throw new Error(d.error||"Message could not be sent");
        document.querySelector("#buyerMessageNotice").textContent="Message sent and saved."; form.elements.body.value=""; await loadHistory();
      } catch(err) { document.querySelector("#buyerMessageNotice").textContent=err.message; } finally { b.disabled=false; }
    });
    await loadHistory();
  }
  function route(showLoader = true) {
    let hash = location.hash || "#home";
    let [path] = hash.slice(1).split("?");
    // Authentication routes are rendered only by auth.js. Without this guard,
    // the marketplace router can replace the login form with the home page.
    if (["login", "signup", "account", "logout"].includes(path)) return;
    if (path === "refunds") return;
    if (showLoader) loader();
    if (path === "messages") messagesPage();
    else if (path === "shop") shop();
    else if (path === "discover") discover();
    else if (path === "cart") cartPage();
    else if (path === "wishlist") wishlistPage();
    else if (path === "checkout") checkoutPage();
    else if (path === "order-success")
      orderSuccessPage(
        new URLSearchParams(hash.split("?")[1] || "").get("order") || "",
      );
    else if (path === "sell") sell();
    else if (path === "my-products") myProductsPage();
    else if (path === "orders") ordersPage();
    else if (path === "tracking")
      trackingPage(
        new URLSearchParams(hash.split("?")[1] || "").get("order") || "",
      );
    else if (path === "product-history") productHistoryPage();
    else if (path === "product") {
      const viewedId = new URLSearchParams(hash.split("?")[1] || "").get("id");
      if (viewedId) recordProductHistory(viewedId);
      detail(viewedId);
    } else home();
    initEasyBuyCarousel();
    updateCount();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target : e.target?.parentElement;
    if (!target) return;
    const tr = target.closest("[data-track-order]");
    if (tr) {
      e.preventDefault();
      go("#tracking?order=" + encodeURIComponent(tr.dataset.trackOrder));
      return;
    }
    let a = target.closest("[data-add]");
    if (a) {
      e.preventDefault();
      add(a.dataset.add);
      return;
    }
    let w = target.closest("[data-wish]");
    if (w) {
      e.preventDefault();
      e.stopPropagation();
      wish(w.dataset.wish);
      return;
    }
    let v = target.closest("[data-view]");
    if (v) {
      e.preventDefault();
      const target = "#product?id=" + encodeURIComponent(v.dataset.view);
      if (String(v.dataset.view).startsWith("LIVE-")) fetch("api/product-view.php", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ productId: String(v.dataset.view) }) }).catch(() => {});
      if (location.hash === target) {
        recordProductHistory(v.dataset.view);
        detail(v.dataset.view);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else go(target);
      return;
    }
    let cq = target.closest("[data-checkout-qty]");
    if (cq) {
      const item = cart.find((x) => String(x.id) === String(cq.dataset.checkoutQty));
      const product = products.find((x) => String(x.id) === String(cq.dataset.checkoutQty));
      if (!item || !product) return;
      const nextQty = Number(item.qty) + Number(cq.dataset.delta);
      const stock = Math.max(0, Number(product.stock ?? 1));
      if (nextQty > stock) { toast(`Only ${stock} unit${stock === 1 ? "" : "s"} available.`); return; }
      if (nextQty <= 0) cart = cart.filter((x) => x !== item); else item.qty = nextQty;
      const form = document.querySelector("#paymentForm");
      const values = form ? Object.fromEntries(new FormData(form).entries()) : {};
      save();
      checkoutPage();
      const newForm = document.querySelector("#paymentForm");
      if (newForm) {
        Object.entries(values).forEach(([key, value]) => { const field = newForm.elements.namedItem(key); if (!field) return; if (field instanceof RadioNodeList) { [...field].forEach((el) => { if (el.value === value) el.checked = true; }); } else field.value = value; });
        newForm.querySelector('input[name="deliverySpeed"]:checked')?.dispatchEvent(new Event("change", { bubbles: true }));
        newForm.querySelector('[name="address"]')?.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return;
    }
    let q = target.closest("[data-qty]");
    if (q) {
      let it = cart.find((x) => String(x.id) === String(q.dataset.qty));
      const p = products.find((x) => String(x.id) === String(q.dataset.qty));
      if (!it || !p) return;
      const nextQty = Number(it.qty) + Number(q.dataset.delta);
      const stock = Math.max(0, Number(p.stock ?? 1));
      if (nextQty > stock) {
        toast(`Only ${stock} unit${stock === 1 ? "" : "s"} available.`);
        return;
      }
      if (nextQty <= 0) cart = cart.filter((x) => x !== it);
      else it.qty = nextQty;
      save();
      cartPage();
      return;
    }
    let r = e.target.closest("[data-remove]");
    if (r) {
      cart = cart.filter((x) => x.id !== r.dataset.remove);
      save();
      cartPage();
      return;
    }
    let b = e.target.closest("[data-buy]");
    if (b) {
      const id = b.dataset.buy;
      const product = products.find((p) => String(p.id) === String(id));
      if (product && Number(product.stock ?? 1) > 0) {
        cart = [{ id: product.id, qty: 1 }];
        save();
        go("#checkout");
      } else toast("This product is out of stock.");
    }
  });
  window.addEventListener("hashchange", () => route());
  $("#navSearch").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      go("#shop");
      setTimeout(() => {
        if ($("#shopSearch")) {
          $("#shopSearch").value = e.target.value;
          $("#shopSearch").dispatchEvent(new Event("input"));
        }
      }, 120);
    }
  });
  updateCount();
  route(false);
  // Auto-rotating homepage category carousel; pause while hovered/focused.
  function initEasyBuyCarousel() {
    const root = document.querySelector("#ebCarousel");
    if (!root || root.dataset.ready) return;
    root.dataset.ready = "1";
    const slides = [...root.querySelectorAll(".eb-slide")],
      dots = [...root.querySelectorAll(".eb-carousel-dots button")];
    if (window.ebCarouselTimer) clearInterval(window.ebCarouselTimer);
    let idx = 0;
    const show = (n) => {
      idx = (n + slides.length) % slides.length;
      slides.forEach((el, i) => el.classList.toggle("active", i === idx));
      dots.forEach((el, i) => el.classList.toggle("active", i === idx));
      const count = root.querySelector(".eb-slide-count");
      if (count) count.textContent = idx + 1 + "/" + slides.length;
    };
    const start = () => {
      clearInterval(window.ebCarouselTimer);
      window.ebCarouselTimer = setInterval(() => show(idx + 1), 4000);
    };
    root.querySelector(".prev")?.addEventListener("click", () => {
      show(idx - 1);
      start();
    });
    root.querySelector(".next")?.addEventListener("click", () => {
      show(idx + 1);
      start();
    });
    dots.forEach((d, i) =>
      d.addEventListener("click", () => {
        show(i);
        start();
      }),
    );
    root.addEventListener("mouseenter", () =>
      clearInterval(window.ebCarouselTimer),
    );
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", () =>
      clearInterval(window.ebCarouselTimer),
    );
    root.addEventListener("focusout", start);
    show(0);
    start();
  }
  initEasyBuyCarousel();
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-contact-missing]");
    if (a) {
      e.preventDefault();
      alert(
        "Seller contact number is not available for this listing yet. Please open View product or message the seller if contact details are shown.",
      );
    }
  });
  // Load seller-published database products into the same catalogue used by cart and checkout.
  // IDs are returned as LIVE-<database id>, which api/orders.php maps back to products.seller_id.
  fetch("api/products.php", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  })
    .then((r) =>
      r.ok ? r.json() : Promise.reject(new Error("Live catalogue unavailable")),
    )
    .then((d) => {
      if (!d || !d.ok || !Array.isArray(d.products)) return;
      let changed = false;
      d.products.forEach((p) => {
        const existing = products.find((item) => String(item.id) === String(p.id));
        if (existing) {
          existing.stock = Number(p.stock ?? 0);
          existing.price = Number(p.price) || 0;
          if (p.oldPrice !== undefined && p.oldPrice !== null) existing.oldPrice = Number(p.oldPrice) || 0;
          if (p.seller_name) existing.seller_name = p.seller_name;
          if (p.seller_email) existing.seller_email = p.seller_email;
          if (p.contact) existing.contact = p.contact;
          existing.name = String(p.name || existing.name);
          existing.image = String(p.image || existing.image);
          existing.category = String(p.category || existing.category);
          existing.condition = String(p.condition || existing.condition);
          existing.college = String(p.college || existing.college);
          existing.pickup_location = String(p.pickup_location || existing.pickup_location || "");
          existing.pickup_map_url = String(p.pickup_map_url || existing.pickup_map_url || "");
        } else {
          products.push({
            ...p,
            id: String(p.id),
            price: Number(p.price) || 0,
            oldPrice: Number(p.oldPrice ?? p.price) || 0,
            stock: Number(p.stock ?? 1),
            image: String(p.image || "images/categories/accessories.svg"),
            condition: String(p.condition || "Second-hand · Good"),
            college: String(p.college || "Student seller"),
            rating: Number(p.rating) || 0,
            reviews: Number(p.reviews) || 0,
          });
          changed = true;
        }
      });
      // Re-render current view so updated database stock and sold-out states are visible.
      route(false);
    })
    .catch(() => {
      /* Keep the existing catalogue usable when MySQL is unavailable. */
    });
})();
