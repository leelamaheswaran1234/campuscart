/* EasyBuy contact + refund-request demo. Browser storage only; not a live AI, payment gateway, or shared inbox. */
(() => {
  "use strict";
  const app = document.querySelector("#app");
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
  const read = (key, fallback = []) => {
    try {
      const v = JSON.parse(
        localStorage.getItem(key) || JSON.stringify(fallback),
      );
      return v ?? fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };
  const currentUser = () => {
    const email = sessionStorage.getItem("easybuy_js_session_v1");
    if (!email) return null;
    return (
      read("easybuy_js_users_v1", []).find((u) => u.email === email) || null
    );
  };
  const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
  const pageHead = (k, t, d) =>
    `<div class="wrap page-title"><span class="eyebrow">${k}</span><h1>${t}</h1><p style="color:var(--muted)">${d}</p></div>`;
  function requireUser() {
    if (!currentUser()) {
      location.hash = "#login";
      return null;
    }
    return currentUser();
  }
  function getProductOptions() {
    const products = window.EASYBUY_PRODUCTS || [];
    const listings = read("eb_listings", []).map((p, i) => ({
      ...p,
      id: p.id || "user-" + i,
    }));
    const all = [...products, ...listings];
    return (
      '<option value="">Select a product (optional)</option>' +
      all
        .map(
          (p) =>
            `<option value="${esc(p.id)}">${esc(p.name || "Product")} · ${esc(p.category || "Marketplace")}</option>`,
        )
        .join("")
    );
  }
  function messagePage() {
    const user = requireUser();
    if (!user) return;
    const messages = read("eb_student_messages", []).filter(
      (m) => m.from === user.email || m.to === user.email,
    );
    app.innerHTML =
      pageHead(
        "STUDENT MESSAGING",
        "AI Chat Assistant",
        "Choose your language, send a message, and watch the assistant prepare a helpful reply with a typing animation.",
      ) +
      `<div class="wrap eb-contact-layout"><section class="eb-panel eb-contact-form-panel"><h2>✉️ New message</h2><form id="ebMessageForm"><div class="field"><label for="ebMsgTo">Recipient email</label><input id="ebMsgTo" type="email" required maxlength="180" placeholder="student@example.com"></div><div class="field"><label for="ebMsgProduct">Product</label><select id="ebMsgProduct">${getProductOptions()}</select></div><div class="field"><label for="ebMsgTopic">What do you want to discuss?</label><select id="ebMsgTopic"><option value="availability">Check product availability</option><option value="condition">Ask about product condition</option><option value="pickup">Arrange a campus pickup</option><option value="order">Ask about an order</option><option value="custom">Other question</option></select></div><div class="field"><label for="ebMsgLanguage">🌐 Reply language</label><select id="ebMsgLanguage"><option value="en">English</option><option value="ta">தமிழ் (Tamil)</option><option value="tanglish">Tanglish (Tamil + English)</option><option value="hi">हिन्दी (Hindi)</option></select><p class="eb-help">The assistant's demo reply will use this language.</p></div><div class="eb-helper-box"><strong>✨ AI message helper</strong><p>Prepare a polite message draft in your selected language. A demo assistant reply appears after you send it.</p><button class="secondary" type="button" id="ebMakeDraft">✨ Generate message</button><div id="ebDraftLoading" class="eb-typing" hidden><span></span><span></span><span></span><small>Preparing your message…</small></div></div><div class="field"><label for="ebMsgBody">Your message</label><textarea id="ebMsgBody" rows="5" maxlength="2000" required placeholder="Write your message…"></textarea></div><button class="primary" id="ebSendMessage" type="submit">Send message ↗</button><p class="eb-help">Messages are stored locally for this view and submitted to the EasyBuy message database for the selected recipient. Seller must sign in to reply.</p><div id="ebMsgStatus" class="eb-inline-status" role="status"></div></form></section><section class="eb-panel eb-contact-history"><h2>💬 Chat history</h2><div id="ebMessageList">${messageList(messages, user.email)}</div><div id="ebAiLoading" class="eb-ai-loading" hidden><div class="eb-ai-avatar">✨</div><div><strong>EasyBuy AI</strong><p>Thinking of a helpful reply</p><div class="eb-typing"><span></span><span></span><span></span></div></div></div></section></div>`;
    const requestedProduct = new URLSearchParams(
      location.hash.split("?")[1] || "",
    ).get("product");
    if (requestedProduct) {
      const productSelect = document.querySelector("#ebMsgProduct");
      if (productSelect) {
        productSelect.value = requestedProduct;
      }
    }
    const lang = () => document.querySelector("#ebMsgLanguage").value;
    const topic = () => document.querySelector("#ebMsgTopic").value;
    const productName = () => {
      const el = document.querySelector("#ebMsgProduct");
      return el.selectedOptions[0]?.textContent || "this product";
    };
    document.querySelector("#ebMakeDraft").addEventListener("click", () => {
      const loading = document.querySelector("#ebDraftLoading");
      const btn = document.querySelector("#ebMakeDraft");
      loading.hidden = false;
      btn.disabled = true;
      setTimeout(() => {
        const t = topic(),
          p = productName(),
          l = lang();
        const drafts = {
          en: {
            availability: `Hi! I'm interested in ${p}. Is it still available? Thank you.`,
            condition: `Hi! Could you please tell me more about the condition of ${p}? Thank you.`,
            pickup: `Hi! When and where would be a good time to pick up ${p}? Thank you.`,
            order: `Hi! Could you please share an update about my order for ${p}? Thank you.`,
            custom: `Hi! I have a question about ${p}. Could you please help me? Thank you.`,
          },
          ta: {
            availability: `வணக்கம்! ${p} இன்னும் விற்பனைக்கு இருக்கிறதா? நன்றி.`,
            condition: `வணக்கம்! ${p} எந்த நிலையில் இருக்கிறது என்று கொஞ்சம் விவரமாகச் சொல்ல முடியுமா? நன்றி.`,
            pickup: `வணக்கம்! ${p}-ஐ எப்போது, எங்கே வந்து வாங்கிக்கொள்ளலாம்? நன்றி.`,
            order: `வணக்கம்! ${p} தொடர்பான எனது ஆர்டர் நிலையைத் தெரிவிக்க முடியுமா? நன்றி.`,
            custom: `வணக்கம்! ${p} பற்றி ஒரு கேள்வி உள்ளது. உதவ முடியுமா? நன்றி.`,
          },
          tanglish: {
            availability: `Hi! ${p} innum available-ah irukka? Please sollunga. Thanks!`,
            condition: `Hi! ${p} condition eppadi irukku? Konjam details share pannunga. Thanks!`,
            pickup: `Hi! ${p} pickup panna eppo, enga meet pannalaam? Thanks!`,
            order: `Hi! ${p} order status pathi update share pannunga. Thanks!`,
            custom: `Hi! ${p} pathi oru question irukku. Help pannunga please. Thanks!`,
          },
          hi: {
            availability: `नमस्ते! क्या ${p} अभी उपलब्ध है? कृपया बताएं। धन्यवाद।`,
            condition: `नमस्ते! क्या आप ${p} की स्थिति के बारे में थोड़ा बता सकते हैं? धन्यवाद।`,
            pickup: `नमस्ते! ${p} लेने के लिए कब और कहाँ मिल सकते हैं? धन्यवाद।`,
            order: `नमस्ते! क्या आप ${p} के मेरे ऑर्डर का अपडेट दे सकते हैं? धन्यवाद।`,
            custom: `नमस्ते! मुझे ${p} के बारे में एक सवाल पूछना है। कृपया मदद करें। धन्यवाद।`,
          },
        };
        document.querySelector("#ebMsgBody").value = (drafts[l] || drafts.en)[
          t
        ];
        loading.hidden = true;
        btn.disabled = false;
        document.querySelector("#ebMsgBody").focus();
      }, 900);
    });
    document.querySelector("#ebMessageForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const to = document.querySelector("#ebMsgTo").value.trim().toLowerCase();
      if (to === user.email) {
        document.querySelector("#ebMsgStatus").textContent =
          "Choose another student as the recipient.";
        return;
      }
      const all = read("eb_student_messages", []);
      const item = {
        id: "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        from: user.email,
        fromName: user.name,
        to,
        productId: document.querySelector("#ebMsgProduct").value,
        productName: productName(),
        topic: topic(),
        body: document.querySelector("#ebMsgBody").value.trim(),
        language: lang(),
        createdAt: new Date().toISOString(),
        read: false,
      };
      all.unshift(item);
      if (!write("eb_student_messages", all)) {
        document.querySelector("#ebMsgStatus").textContent =
          "Could not save message. Browser storage may be full.";
        return;
      }
      fetch("api/messages.php", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          to,
          body: item.body,
          productCode: item.productId,
          threadKey: item.id,
        }),
      })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok || !d.ok)
            throw new Error(d.error || "Message could not be delivered");
          const st = document.querySelector("#ebMsgStatus");
          if (st)
            st.textContent =
              "Message delivered to EasyBuy database. The seller can reply from Seller Studio.";
        })
        .catch((err) => {
          const st = document.querySelector("#ebMsgStatus");
          if (st)
            st.textContent =
              "Message saved locally, but database delivery failed: " +
              err.message;
        });
      document.querySelector("#ebMsgStatus").textContent =
        "Sending message to seller…";
      document.querySelector("#ebMsgBody").value = "";
      document.querySelector("#ebSendMessage").disabled = true;
      document.querySelector("#ebAiLoading").hidden = false;
      renderMessages(user);
      setTimeout(() => {
        const replies = {
          en: {
            availability: `Thanks for your interest in ${item.productName || "this product"}! Please check with the seller to confirm availability before arranging pickup.`,
            condition: `Thanks for asking! Please request recent photos and details from the seller, and confirm the condition before purchasing.`,
            pickup: `Thanks! Please agree on a public campus meeting point and a convenient time with the seller.`,
            order: `Thanks for reaching out! Please check your My Orders page for the latest status and contact the seller if you need more details.`,
            custom: `Thanks for your message! Please share any extra details so the buyer or seller can help you better.`,
          },
          ta: {
            availability: `${item.productName || "இந்தப் பொருள்"} மீது ஆர்வம் காட்டியதற்கு நன்றி! வாங்க வருவதற்கு முன் விற்பனையாளரிடம் இது இன்னும் கிடைக்கிறதா என்று உறுதிப்படுத்திக்கொள்ளுங்கள்.`,
            condition: `கேட்டதற்கு நன்றி! வாங்குவதற்கு முன் பொருளின் சமீபத்திய புகைப்படங்கள் மற்றும் நிலை விவரங்களை விற்பனையாளரிடம் கேட்டுத் தெரிந்துகொள்ளுங்கள்.`,
            pickup: `நன்றி! விற்பனையாளருடன் பாதுகாப்பான பொது இடத்தையும் உங்களுக்கு ஏற்ற நேரத்தையும் முன்கூட்டியே முடிவு செய்யுங்கள்.`,
            order: `தொடர்பு கொண்டதற்கு நன்றி! சமீபத்திய நிலையை அறிய My Orders பக்கத்தைப் பாருங்கள். கூடுதல் விவரங்களுக்கு விற்பனையாளரைத் தொடர்புகொள்ளலாம்.`,
            custom: `உங்கள் செய்திக்கு நன்றி! வாங்குபவர் அல்லது விற்பனையாளர் உதவ, தேவையான கூடுதல் விவரங்களைப் பகிருங்கள்.`,
          },
          tanglish: {
            availability: `Interest-ku thanks! ${item.productName || "Indha product"} available-ah irukka nu seller-kitta confirm pannitu pickup arrange pannunga.`,
            condition: `Kettadhukku thanks! Buy panradhukku munnaadi latest photos-um condition details-um seller-kitta check pannunga.`,
            pickup: `Thanks! Seller-oda safe public place-um convenient time-um munnaadiye decide pannunga.`,
            order: `Message pannadhukku thanks! Latest status-ku My Orders page check pannunga; extra details-ku seller-a contact pannalaam.`,
            custom: `Thanks for your message! Buyer/seller help panna konjam extra details share pannunga.`,
          },
          hi: {
            availability: `रुचि दिखाने के लिए धन्यवाद! खरीदने या मिलने से पहले विक्रेता से उपलब्धता की पुष्टि कर लें।`,
            condition: `पूछने के लिए धन्यवाद! खरीदने से पहले विक्रेता से हाल की तस्वीरें और वस्तु की स्थिति की जानकारी माँगें।`,
            pickup: `धन्यवाद! विक्रेता के साथ किसी सुरक्षित सार्वजनिक स्थान और सुविधाजनक समय पर मिलने की योजना बनाएँ।`,
            order: `संपर्क करने के लिए धन्यवाद! नवीनतम स्थिति के लिए My Orders पेज देखें और ज़रूरत हो तो विक्रेता से संपर्क करें।`,
            custom: `आपके संदेश के लिए धन्यवाद! खरीदार या विक्रेता आपकी बेहतर मदद कर सकें, इसके लिए कुछ और जानकारी साझा करें।`,
          },
        };
        const chosen =
          (replies[item.language] || replies.en)[item.topic] ||
          replies.en.custom;
        const updated = read("eb_student_messages", []);
        updated.unshift({
          id: "ai-" + Date.now(),
          from: "easybuy-ai@assistant.local",
          fromName: "EasyBuy AI",
          to: user.email,
          productId: item.productId,
          productName: item.productName,
          topic: item.topic,
          body: chosen,
          language: item.language,
          aiReply: true,
          replyTo: item.id,
          createdAt: new Date().toISOString(),
          read: true,
        });
        write("eb_student_messages", updated);
        const loader = document.querySelector("#ebAiLoading");
        if (loader) loader.hidden = true;
        const send = document.querySelector("#ebSendMessage");
        if (send) send.disabled = false;
        const status = document.querySelector("#ebMsgStatus");
        if (status)
          status.textContent =
            "AI reply ready! (Demo response — no live AI connection.)";
        renderMessages(user);
      }, 1700);
    });
  }
  function messageList(messages, email) {
    if (!messages.length)
      return '<p class="eb-help">No messages yet. Send one to start a chat.</p>';
    return messages
      .slice(0, 30)
      .map(
        (m) =>
          `<article class="eb-message-card ${m.aiReply ? "eb-ai-message" : ""}"><div class="eb-message-meta"><strong>${m.aiReply ? "✨ EasyBuy AI" : m.from === email ? "You → " + esc(m.to) : esc(m.fromName || m.from) + " → You"}</strong><time>${esc(new Date(m.createdAt).toLocaleString())}</time></div>${m.productName ? `<p class="eb-message-product">${esc(m.productName)}</p>` : ""}<p>${esc(m.body)}</p><span class="eb-message-status">${m.aiReply ? "Assistant · demo reply" : m.dbMessage ? "Saved to EasyBuy message database" : m.from === email ? "Pending delivery · saved in this browser" : "Saved in this browser"}</span></article>`,
      )
      .join("");
  }
  function renderMessages(user) {
    const box = document.querySelector("#ebMessageList");
    if (!box) return;
    const localRows = () =>
      read("eb_student_messages", []).filter(
        (m) => m.from === user.email || m.to === user.email,
      );
    const paint = (rows) => {
      if (box) box.innerHTML = messageList(rows, user.email);
    };
    paint(localRows());
    // Merge server messages with browser messages. Replacing the local list with DB-only
    // messages used to hide the demo reply immediately after it was created.
    fetch("api/messages.php?email=" + encodeURIComponent(user.email), {
      credentials: "same-origin",
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d.ok)
          throw new Error(d.error || "Message history unavailable");
        return d;
      })
      .then((d) => {
        const dbRows = (d.messages || []).map((m) => ({
          id: "db-" + m.id,
          from: m.sender_email,
          fromName: m.sender_role === "seller" ? "Seller" : m.sender_email,
          to: m.recipient_email,
          productId: m.product_code || "",
          productName: m.product_code || "",
          body: m.body,
          createdAt: m.created_at,
          aiReply: false,
          dbMessage: true,
        }));
        const merged = [...dbRows, ...localRows()];
        const seen = new Set();
        const unique = merged.filter((m) => {
          const key = [
            String(m.from || "").toLowerCase(),
            String(m.to || "").toLowerCase(),
            String(m.body || "").trim(),
          ].join("|");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        unique.sort(
          (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
        );
        paint(unique);
      })
      .catch(() => {
        /* Local chat remains visible when PHP/database is unavailable. */
      });
  }
  function refundsPage() {
    const user = requireUser();
    if (!user) return;
    const orders = read("eb_orders", []);
    const requests = read("eb_refund_requests", []).filter(
      (r) => r.email === user.email,
    );
    const eligible = orders.filter(
      (o) =>
        !["Refund requested", "Refunded", "Cancelled"].includes(
          String(o.status || ""),
        ),
    );
    app.innerHTML =
      pageHead(
        "PAYMENT SUPPORT",
        "Refund requests",
        "Submit a refund request for an order and track its request status. Actual payment refunds require a connected payment provider and server verification.",
      ) +
      `<div class="wrap eb-contact-layout"><section class="eb-panel"><h2>↩ Request a refund</h2>${eligible.length ? `<form id="ebRefundForm"><div class="field"><label for="ebRefundOrder">Order</label><select id="ebRefundOrder" required><option value="">Choose an order</option>${eligible.map((o, i) => `<option value="${i}">${esc(o.id || o.orderId || "Order " + (o.date || i + 1))} · ${money(o.total)} · ${esc(o.status || "Submitted")}</option>`).join("")}</select></div><div class="field"><label for="ebRefundReason">Reason</label><select id="ebRefundReason" required><option value="">Choose a reason</option><option>Item not as described</option><option>Item damaged or faulty</option><option>Order cancelled</option><option>Seller did not respond</option><option>Duplicate payment concern</option><option>Other</option></select></div><div class="field"><label for="ebRefundDetails">Details (optional)</label><textarea id="ebRefundDetails" rows="4" maxlength="1500" placeholder="Explain the issue and any steps already taken…"></textarea></div><button class="primary" type="submit">Submit refund request ↗</button><p class="eb-help">This records a request only. It does not initiate or confirm a bank/Razorpay refund.</p><div id="ebRefundStatus" class="eb-inline-status" role="status"></div></form>` : '<div class="eb-empty-note">No eligible orders were found in this browser. Place a demo order first, or check your order history.</div>'}</section><section class="eb-panel"><h2>📋 Your refund requests</h2><div id="ebRefundList">${refundList(requests)}</div></section></div>`;
    const form = document.querySelector("#ebRefundForm");
    if (form)
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const idx = Number(document.querySelector("#ebRefundOrder").value);
        const order = eligible[idx];
        if (!order) {
          document.querySelector("#ebRefundStatus").textContent =
            "Please choose a valid order.";
          return;
        }
        const all = read("eb_refund_requests", []);
        if (
          all.some(
            (r) =>
              r.email === user.email &&
              String(r.orderKey) ===
                String(order.id || order.orderId || order.date) &&
              !["Rejected", "Closed"].includes(r.status),
          )
        ) {
          document.querySelector("#ebRefundStatus").textContent =
            "A request already exists for this order.";
          return;
        }
        const request = {
          id: "RF-" + Date.now().toString(36).toUpperCase(),
          email: user.email,
          orderKey: order.id || order.orderId || order.date || String(idx),
          orderLabel:
            order.id || order.orderId || "Order " + (order.date || idx + 1),
          amount: Number(order.total) || 0,
          reason: document.querySelector("#ebRefundReason").value,
          details: document.querySelector("#ebRefundDetails").value.trim(),
          status: "Request submitted",
          createdAt: new Date().toISOString(),
        };
        all.unshift(request);
        if (!write("eb_refund_requests", all)) {
          document.querySelector("#ebRefundStatus").textContent =
            "Could not save request. Browser storage may be full.";
          return;
        }
        document.querySelector("#ebRefundStatus").textContent =
          "Refund request saved locally. No money has been refunded.";
        document.querySelector("#ebRefundList").innerHTML = refundList(
          all.filter((r) => r.email === user.email),
        );
        form.reset();
      });
  }
  function refundList(requests) {
    if (!requests.length)
      return '<p class="eb-help">You have not submitted any refund requests yet.</p>';
    return requests
      .map(
        (r) =>
          `<article class="eb-message-card"><div class="eb-message-meta"><strong>${esc(r.id)}</strong><span class="eb-refund-status">${esc(r.status)}</span></div><p><strong>${esc(r.orderLabel)}</strong> · ${money(r.amount)}</p><p>${esc(r.reason)}</p>${r.details ? `<p>${esc(r.details)}</p>` : ""}<time>${esc(new Date(r.createdAt).toLocaleString())}</time></article>`,
      )
      .join("");
  }
  function route() {
    const path = (location.hash || "").slice(1).split("?")[0];
    if (path === "messages") {
      messagePage();
      return;
    }
    if (path === "refunds") {
      refundsPage();
      return;
    }
  }
  window.addEventListener("hashchange", route);
  if (
    ["messages", "refunds"].includes(
      (location.hash || "").slice(1).split("?")[0],
    )
  )
    route();
})();
