(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  let mode = "login",
    csrf = "";
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
  async function api(url, opts = {}, retryCsrf = true) {
    const requestOpts = { credentials: "same-origin", ...opts };
    const r = await fetch(url, requestOpts);
    let d;
    const raw = await r.text();
    try {
      d = JSON.parse(raw);
    } catch {
      const preview = raw.replace(/\s+/g, " ").slice(0, 220);
      throw Error(`Server returned non-JSON (HTTP ${r.status}). Check api/config.php and the PHP error log. Response: ${preview || "empty response"}`);
    }
    // Refresh the seller session token once when a hosting/session refresh made
    // the page's token stale. Do not retry login or other requests without a token.
    if (r.status === 419 && retryCsrf && requestOpts.headers && requestOpts.headers["X-CSRF-Token"]) {
      const meResponse = await fetch("../api/auth.php?action=me", { credentials: "same-origin", headers: { "Accept": "application/json" } });
      const meRaw = await meResponse.text();
      let me;
      try { me = JSON.parse(meRaw); } catch { me = null; }
      if (me && me.ok && me.seller && me.csrf) {
        csrf = me.csrf;
        const headers = new Headers(requestOpts.headers);
        headers.set("X-CSRF-Token", csrf);
        return api(url, { ...requestOpts, headers }, false);
      }
      throw Error("Your seller session has expired. Please sign in again.");
    }
    if (!r.ok || d.ok === false) throw Error(d.error || "Request failed");
    return d;
  }
  function notice(id, msg) {
    $(id).textContent = msg || "";
  }
  function setMode(m) {
    mode = m;
    $("#loginTab").classList.toggle("active", m === "login");
    $("#registerTab").classList.toggle("active", m === "register");
    $("#nameWrap").hidden = m !== "register";
    $("#nameWrap input").required = m === "register";
    $("#securityWrap").hidden = m !== "register";
    $("#securityWrap select").required = m === "register";
    $("#securityWrap input").required = m === "register";
    $("#authSubmit").textContent =
      m === "login" ? "Sign in" : "Create seller account";
    $("#authForm [name=password]").autocomplete =
      m === "login" ? "current-password" : "new-password";
    notice("#authNotice", "");
  }
  $("#loginTab").onclick = () => setMode("login");
  $("#registerTab").onclick = () => setMode("register");
  $("#authForm").onsubmit = async (e) => {
    e.preventDefault();
    const b = $("#authSubmit");
    b.disabled = true;
    notice("#authNotice", "Please wait…");
    try {
      const d = await api("../api/auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          ...Object.fromEntries(new FormData(e.target)),
        }),
      });
      csrf = d.csrf;
      showDashboard(d.seller);
    } catch (err) {
      notice("#authNotice", err.message);
    } finally {
      b.disabled = false;
    }
  };
  function showDashboard(s) {
    $("#authView").hidden = true;
    $("#dashboard").hidden = false;
    $("#sellerName").textContent = s.name;
    $("#sellerPhone").value = s.phone || "";
    loadListings();
    loadProductHistory();
    loadSellerOrders();
    loadSellerMessages();
  }
  async function loadListings() {
    const box = $("#listingList");
    box.innerHTML = '<p class="muted">Loading…</p>';
    try {
      const d = await api("../api/my-products.php");
      const ps = d.products;
      $("#totalCount").textContent = ps.length;
      $("#liveCount").textContent = ps.filter(
        (p) => p.status === "active",
      ).length;
      $("#removedCount").textContent = ps.filter(
        (p) => p.status !== "active",
      ).length;
      box.innerHTML = ps.length
        ? ps
            .map(
              (p) =>
                `<div class="listing"><img src="../${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.style.display='none'"><div><strong>${esc(p.name)}</strong><small>${esc(p.category)} · ${esc(p.condition)} · ₹${Number(p.price).toLocaleString("en-IN")}</small><small>${esc(p.college)} · Stock ${Number(p.stock)} · Views ${Number(p.views || 0)}</small><small class="seller-product-rating">${Number(p.reviews || 0) ? `${'★'.repeat(Math.max(0, Math.min(5, Math.round(Number(p.rating) || 0))))}${'☆'.repeat(5-Math.max(0, Math.min(5, Math.round(Number(p.rating) || 0))))} ${Number(p.rating).toFixed(1)} · ${Number(p.reviews)} rating(s)` : '☆☆☆☆☆ No ratings yet'}</small><span class="pill ${p.status === "active" ? "" : "off"}">${esc(p.status)}</span></div><div>${p.status === "active" ? `<button class="outline" data-action="remove" data-id="${p.id}">Unpublish</button>` : `<button class="outline" data-action="restore" data-id="${p.id}">Republish</button>`}</div></div>`,
            )
            .join("")
        : '<p class="muted">No listings yet. Publish your first product.</p>';
    } catch (e) {
      box.innerHTML = `<p class="notice">${esc(e.message)}</p>`;
    }
  }
  $("#contactForm").onsubmit = async (e) => {
    e.preventDefault();
    const b = $("#saveContact");
    b.disabled = true;
    notice("#contactNotice", "Saving contact number…");
    try {
      const d = await api("../api/profile.php", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ phone: $("#sellerPhone").value.trim() }),
      });
      $("#sellerPhone").value = d.phone || "";
      notice("#contactNotice", "✓ " + d.message);
    } catch (err) {
      notice("#contactNotice", err.message);
    } finally {
      b.disabled = false;
    }
  };
  $("#listingList").onclick = async (e) => {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    b.disabled = true;
    try {
      await api("../api/my-products.php", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({
          action: b.dataset.action,
          id: Number(b.dataset.id),
        }),
      });
      await loadListings();
    } catch (e) {
      alert(e.message);
    } finally {
      b.disabled = false;
    }
  };
  $("#productForm").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.submitter;
    b.disabled = true;
    notice("#productNotice", "Publishing to the shared catalogue…");
    try {
      const fd = new FormData(e.target);
      const d = await api("../api/products.php", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf },
        body: fd,
      });
      notice("#productNotice", d.message);
      e.target.reset();
      $("#preview").hidden = true;
      await loadListings();
    } catch (err) {
      notice("#productNotice", err.message);
    } finally {
      b.disabled = false;
    }
  };
  const photoInput = $("#productForm [name=photo]");
  const previewImage = $("#preview");
  let previewObjectUrl = null;
  const showPhotoPreview = () => {
    const f = photoInput.files && photoInput.files[0];
    if (previewObjectUrl) { URL.revokeObjectURL(previewObjectUrl); previewObjectUrl = null; }
    if (!f) { previewImage.hidden = true; previewImage.removeAttribute("src"); return; }
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 4 * 1024 * 1024) {
      notice("#productNotice", f.size > 4 * 1024 * 1024 ? "Photo must be 4 MB or smaller." : "Choose a JPG, PNG or WEBP image.");
      photoInput.value = ""; previewImage.hidden = true; previewImage.removeAttribute("src"); return;
    }
    previewObjectUrl = URL.createObjectURL(f);
    previewImage.onload = () => { previewImage.hidden = false; notice("#productNotice", "Photo ready to publish."); };
    previewImage.onerror = () => { previewImage.hidden = true; notice("#productNotice", "Could not preview this image. Choose another photo."); };
    previewImage.src = previewObjectUrl;
  };
  photoInput.addEventListener("change", showPhotoPreview);
  photoInput.addEventListener("input", showPhotoPreview);
  $("#refresh").onclick = loadListings;
  $("#logout").onclick = async () => {
    try {
      await api("../api/auth.php", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {}
    $("#dashboard").hidden = true;
    $("#authView").hidden = false;
    setMode("login");
  };
  async function loadProductHistory() {
    const box = $("#productHistory");
    if (!box) return;
    try {
      const d = await api("../api/my-products.php?history=1");
      box.innerHTML = d.history.length
        ? d.history
            .map(
              (h) =>
                `<article class="listing"><div><strong>${esc(h.product_name)}</strong><small>${esc(h.action)} · ${esc(h.details)}</small><small>${esc(h.created_at)}</small></div></article>`,
            )
            .join("")
        : '<p class="muted">No product activity recorded yet. New publishing and order events will appear here.</p>';
    } catch (e) {
      box.innerHTML = `<p class="notice">${esc(e.message)}</p>`;
    }
  }
  async function loadSellerOrders() {
    const box = $("#sellerOrders");
    if (!box) return;
    try {
      await api("../api/order-features.php", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ action: "sync_refund_messages" }) });
      const d = await api("../api/orders.php?seller=1");
      const sellerOrders = Array.isArray(d.orders) ? d.orders : [];
      const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
      const valueOf = (o) => (o.items || []).reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 0)), 0);
      const deliveredOrders = sellerOrders.filter(o => String(o.status).toLowerCase() === "delivered");
      const pendingOrders = sellerOrders.filter(o => ["placed", "confirmed", "shipped"].includes(String(o.status).toLowerCase()));
      const completedValue = deliveredOrders.reduce((sum, o) => sum + valueOf(o), 0);
      const pendingValue = pendingOrders.reduce((sum, o) => sum + valueOf(o), 0);
      const unitsSold = deliveredOrders.reduce((sum, o) => sum + (o.items || []).reduce((n, item) => n + Number(item.qty || 0), 0), 0);
      if ($("#salesCompleted")) $("#salesCompleted").textContent = money(completedValue);
      if ($("#salesPending")) $("#salesPending").textContent = money(pendingValue);
      if ($("#salesUnits")) $("#salesUnits").textContent = String(unitsSold);
      if ($("#salesOrderCount")) $("#salesOrderCount").textContent = String(sellerOrders.length);
      if ($("#salesBreakdown")) $("#salesBreakdown").textContent = `${deliveredOrders.length} completed order(s) · ${pendingOrders.length} pending/in-progress order(s) · Cancelled orders excluded. Values are item subtotals for your products, excluding delivery charges.`;
      box.innerHTML = sellerOrders.length
        ? sellerOrders
            .map(
              (o) =>
                `<article class="listing"><div><strong>${esc(o.order_code)} · ${esc(o.customer_name)}</strong><small>${esc(o.customer_phone)} · ${esc(o.delivery_address)}</small><small>${(o.items || []).map((i) => esc(i.name) + " × " + Number(i.qty)).join(", ")}</small><small>Total ₹${Number(o.total).toLocaleString("en-IN")} · ${esc(o.payment_status)}</small><span class="pill">${esc(o.status)}</span></div><div><select data-order-status="${o.id}" aria-label="Update order status"><option ${o.status === "Placed" ? "selected" : ""}>Placed</option><option ${o.status === "Confirmed" ? "selected" : ""}>Confirmed</option><option ${o.status === "Shipped" ? "selected" : ""}>Shipped</option><option ${o.status === "Cancelled" ? "selected" : ""}>Cancelled</option></select><button class="outline" data-save-order="${o.id}">Save status</button>${o.status === "Shipped" ? `<form data-otp-form="${o.id}" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap"><input name="otp" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="Customer delivery OTP" required style="width:150px"><button class="outline">Verify & mark delivered</button></form>` : ""}${["Confirmed","Shipped"].includes(o.status) ? `<form data-shipper-form="${o.id}" style="margin-top:10px;display:grid;gap:6px"><input name="shipperName" maxlength="100" placeholder="Shipper / courier name" required value="${esc(o.shipper_name || "")}"><input name="trackingNumber" maxlength="100" placeholder="Tracking number" value="${esc(o.tracking_number || "")}"><input name="trackingUrl" type="url" maxlength="500" placeholder="Courier tracking URL (e.g. https://courier-site/track)" value="${esc(o.tracking_url || "")}"><button class="outline">Save shipper & tracking</button></form>` : ""}${o.returnRequest ? `<div class="seller-refund-panel" style="margin-top:10px;border:1px solid #dbe5f5;border-radius:12px;padding:12px;background:#f8fbff"><strong>↩ Return & refund process</strong><p><b>Current status:</b> <span class="pill">${esc(o.returnRequest.status)}</span></p><small><b>Customer reason:</b> ${esc(o.returnRequest.reason)}</small><small><b>Refund amount:</b> ₹${Number(o.returnRequest.refund_amount || 0).toLocaleString("en-IN")}</small><div class="seller-refund-steps" style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">${["Requested","Approved","Refunded"].map(st => `<span style="padding:4px 8px;border-radius:20px;background:${(o.returnHistory||[]).some(h=>h.status===st) || o.returnRequest.status===st ? '#dff7e8' : '#eef2f7'};font-size:12px">${(o.returnHistory||[]).some(h=>h.status===st) || o.returnRequest.status===st ? '✓ ' : ''}${st}</span>`).join("")}${o.returnRequest.status === "Rejected" ? '<span style="padding:4px 8px;border-radius:20px;background:#fee2e2;font-size:12px">Rejected</span>' : ""}</div><strong>Update history</strong>${(o.returnHistory || []).length ? (o.returnHistory || []).map(h => `<small>${esc(h.status)} · ${esc(h.created_at)} — ${esc(h.note || "")}</small>`).join("") : `<small>Request created · ${esc(o.returnRequest.created_at || "")}</small>`}${o.returnRequest.status === "Requested" ? `<button class="outline" data-return-status="Approved" data-return-id="${o.returnRequest.id}">Approve return</button><button class="outline" data-return-status="Rejected" data-return-id="${o.returnRequest.id}">Reject return</button>` : ""}${o.returnRequest.status === "Approved" ? `<button class="outline" data-return-status="Refunded" data-return-id="${o.returnRequest.id}">Mark refund processed</button>` : ""}</div>` : ""}${(o.feedback||[]).length ? `<div style="margin-top:10px;border-top:1px solid #ddd;padding-top:10px"><strong>⭐ Customer product ratings</strong>${(o.feedback||[]).map(f=>`<small>${'★'.repeat(Number(f.rating)||0)}${'☆'.repeat(5-(Number(f.rating)||0))} · ${Number(f.rating)||0}/5${f.comment ? ' — '+esc(f.comment) : ''}</small>`).join('')}</div>` : ""}</div></article>`,
            )
            .join("")
        : '<p class="muted">No database orders for your products yet.</p>';
    } catch (e) {
      box.innerHTML = `<p class="notice">${esc(e.message)}</p>`;
    }
  }
  async function loadSellerMessages() {
    const box = $("#sellerMessages");
    if (!box) return;
    try {
      const d = await api("../api/messages.php?seller=1");
      const messages = d.messages || [];
      box.innerHTML = messages.length
        ? `<div class="seller-chat-list">${messages
            .map((m) => {
              const buyer =
                m.sender_role === "buyer" ? m.sender_email : m.recipient_email;
              const mine = m.sender_role !== "buyer";
              const date = new Date(m.created_at);
              const stamp = Number.isNaN(date.getTime())
                ? esc(m.created_at)
                : date.toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
              const isRefund = /refund|return request/i.test(String(m.body || ""));
              return `<article class="seller-chat-card ${isRefund ? "seller-refund-message" : ""}"><div class="seller-chat-head"><span class="seller-chat-avatar">${esc((buyer.split("@")[0] || "B").slice(0, 1).toUpperCase())}</span><div class="seller-chat-person"><strong>${esc(buyer)}</strong><small>${isRefund ? "↩ REFUND / RETURN REQUEST · " : ""}${esc(m.product_code || (m.order_id ? "Order " + m.order_id : "General enquiry"))} · ${stamp}</small></div><span class="seller-chat-role ${mine ? "seller" : "buyer"}">${isRefund ? "Refund alert" : mine ? "Your reply" : "Buyer message"}</span></div><div class="seller-chat-bubble ${mine ? "outgoing" : "incoming"}">${esc(m.body)}</div><form class="seller-reply-form" data-reply-form="${m.id}" data-to="${esc(buyer)}" data-thread="${esc(m.thread_key || "thread-" + m.id)}" data-product="${esc(m.product_code || "")}" data-order="${esc(m.order_id || "")}"><label for="seller-reply-${m.id}">Reply to buyer</label><div class="seller-reply-compose"><textarea id="seller-reply-${m.id}" name="body" maxlength="5000" rows="2" required placeholder="Type a helpful reply…"></textarea><button class="seller-send-btn" aria-label="Send reply" title="Send reply">Send <span aria-hidden="true">➤</span></button></div><small class="seller-reply-hint">Your reply will be saved to the message database.</small></form></article>`;
            })
            .join("")}</div>`
        : '<div class="seller-empty-chat"><span>✉</span><strong>No buyer messages yet</strong><p>When a buyer contacts you about a product or order, the conversation will appear here.</p></div>';
    } catch (e) {
      box.innerHTML = `<div class="seller-empty-chat error"><strong>Could not load messages</strong><p>${esc(e.message)}</p><button class="outline" type="button" id="retrySellerMessages">Try again</button></div>`;
      $("#retrySellerMessages")?.addEventListener("click", loadSellerMessages);
    }
  }
  $("#refreshHistory")?.addEventListener("click", loadProductHistory);
  $("#refreshOrders")?.addEventListener("click", loadSellerOrders);
  $("#refreshOrdersTop")?.addEventListener("click", loadSellerOrders);
  $("#refreshMessages")?.addEventListener("click", loadSellerMessages);
  $("#sellerOrders")?.addEventListener("click", async (e) => {
    const rb = e.target.closest("[data-return-status]");
    if (!rb) return;
    rb.disabled = true;
    try {
      const d = await api("../api/order-features.php", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ action: "return_status", returnId: Number(rb.dataset.returnId), status: rb.dataset.returnStatus }) });
      notice("#globalNotice", d.message || "Return status updated."); await loadSellerOrders();
    } catch (err) { notice("#globalNotice", err.message); rb.disabled = false; }
  });
  $("#sellerOrders")?.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-save-order]");
    if (!b) return;
    const id = b.dataset.saveOrder,
      sel = $(`[data-order-status="${id}"]`);
    b.disabled = true;
    try {
      await api("../api/orders.php", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ orderId: Number(id), status: sel.value }),
      });
      notice("#globalNotice", "Order status updated.");
      await loadSellerOrders();
    } catch (err) {
      notice("#globalNotice", err.message);
    } finally {
      b.disabled = false;
    }
  });
  $("#sellerOrders")?.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-shipper-form]");
    if (!form) return;
    e.preventDefault();
    const b = form.querySelector("button"), fd = new FormData(form);
    b.disabled = true;
    try {
      const d = await api("../api/order-features.php", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify({ action: "shipper_update", orderId: Number(form.dataset.shipperForm), shipperName: fd.get("shipperName"), trackingNumber: fd.get("trackingNumber"), trackingUrl: fd.get("trackingUrl") }) });
      notice("#globalNotice", d.message || "Tracking saved."); await loadSellerOrders();
    } catch (err) { notice("#globalNotice", err.message); }
    finally { b.disabled = false; }
  });
  $("#sellerOrders")?.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-otp-form]");
    if (!form) return;
    e.preventDefault();
    const b = form.querySelector("button");
    b.disabled = true;
    try {
      const d = await api("../api/orders.php", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({
          action: "verify_delivery_otp",
          orderId: Number(form.dataset.otpForm),
          otp: form.elements.otp.value.trim(),
        }),
      });
      notice("#globalNotice", d.message || "Delivery confirmed.");
      await loadSellerOrders();
    } catch (err) {
      notice("#globalNotice", err.message);
    } finally {
      b.disabled = false;
    }
  });
  $("#sellerMessages")?.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-reply-form]");
    if (!form) return;
    e.preventDefault();
    const b = form.querySelector("button"),
      field = form.elements.body,
      original = b.innerHTML;
    b.disabled = true;
    b.innerHTML = "Sending…";
    form.classList.remove("reply-error", "reply-success");
    try {
      await api("../api/messages.php", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({
          to: form.dataset.to,
          body: field.value.trim(),
          threadKey: form.dataset.thread,
          productCode: form.dataset.product || "",
          orderId: form.dataset.order || null,
        }),
      });
      field.value = "";
      form.classList.add("reply-success");
      notice("#globalNotice", "✓ Reply sent and saved.");
      await loadSellerMessages();
    } catch (err) {
      form.classList.add("reply-error");
      let status = form.querySelector(".seller-reply-hint");
      if (status) status.textContent = "Not sent: " + err.message;
      notice("#globalNotice", "Reply was not sent. Please try again.");
    } finally {
      if (b.isConnected) {
        b.disabled = false;
        b.innerHTML = original;
      }
    }
  });
  async function boot() {
    try {
      const d = await api("../api/auth.php?action=me");
      if (d.seller) {
        csrf = d.csrf;
        showDashboard(d.seller);
      } else setMode("login");
    } catch (e) {
      notice("#authNotice", e.message);
    }
  }
  boot();
  if (window.ebSellerMessagePoll) clearInterval(window.ebSellerMessagePoll);
  window.ebSellerMessagePoll = setInterval(() => {
    if (!$("#dashboard").hidden) loadSellerMessages();
  }, 12000);
})();
