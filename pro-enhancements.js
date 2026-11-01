/* EasyBuy product enhancements: API-backed Discover and persistent chat UI. */
(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
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
  const currentEmail = () =>
    (sessionStorage.getItem("easybuy_js_session_v1") || "")
      .trim()
      .toLowerCase();
  const userList = () => {
    try {
      return JSON.parse(localStorage.getItem("easybuy_js_users_v1") || "[]");
    } catch {
      return [];
    }
  };
  const currentUser = () =>
    userList().find(
      (u) => String(u.email || "").toLowerCase() === currentEmail(),
    ) || null;
  const app = () => $("#app");
  function discoverPage() {
    const host = app();
    if (!host) return;
    host.innerHTML = `<section class="eb-research-page"><div class="eb-research-hero"><span class="eb-research-kicker">EASYBUY · DISCOVER</span><h1>Research smarter.</h1><p>Search the web for study resources, product knowledge, and useful references.</p>
 <form id="ebResearchForm" class="eb-research-form"><label class="sr-only" for="ebResearchQuery">Research topic</label><input id="ebResearchQuery" name="q" maxlength="160" minlength="2" required placeholder="Try “Python programming for beginners”"><button type="submit">⌕ Research</button></form>
 <p class="eb-research-note">Uses free Wikipedia search by default, or broader web results when a Brave API key is configured. Every result links to its source.</p></div>
 <div class="eb-research-results-wrap"><div class="eb-research-toolbar"><div><span class="eyebrow">WEB RESEARCH</span><h2 id="ebResearchHeading">Explore a topic</h2></div><span id="ebResearchCount" class="eb-research-count"></span></div>
 <div id="ebResearchStatus" class="eb-research-status" role="status" aria-live="polite">Enter a topic above to see source-linked results.</div><div id="ebResearchResults" class="eb-research-results"></div></div></section>`;
    const form = $("#ebResearchForm"),
      input = $("#ebResearchQuery"),
      status = $("#ebResearchStatus"),
      results = $("#ebResearchResults"),
      heading = $("#ebResearchHeading"),
      count = $("#ebResearchCount");
    async function search(q) {
      heading.textContent = "Results for “" + q + "”";
      count.textContent = "";
      results.innerHTML = "";
      status.className = "eb-research-status is-loading";
      status.innerHTML =
        '<span class="eb-spinner"></span> Searching trusted web sources…';
      form.querySelector("button").disabled = true;
      try {
        const r = await fetch("api/discover.php?q=" + encodeURIComponent(q), {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });
        const d = await r.json();
        if (!r.ok || !d.ok)
          throw new Error(d.error || "Research search failed.");
        if (!d.results.length) {
          status.className = "eb-research-status";
          status.textContent =
            "No results found for this topic. Try different keywords.";
          return;
        }
        status.className = "eb-research-status is-success";
        status.textContent =
          "Search complete. Open a source to read the full article.";
        count.textContent = d.results.length + " sources";
        if (d.note) {
          const note = document.createElement("p");
          note.className = "eb-research-note";
          note.textContent = d.note;
          status.appendChild(note);
        }
        results.innerHTML = d.results
          .map(
            (x, i) =>
              `<article class="eb-research-card"><span class="eb-research-index">${String(i + 1).padStart(2, "0")}</span><div class="eb-research-card-body"><h3><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.title)}</a></h3><p>${esc(x.summary || "No summary provided by the source.")}</p><a class="eb-source-link" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><span>↗</span> ${esc(x.source || x.url)}</a></div></article>`,
          )
          .join("");
      } catch (err) {
        status.className = "eb-research-status is-error";
        status.innerHTML = `<span>${esc(err.message || "Could not complete the search.")}</span> <button type="button" id="ebResearchRetry">Try again</button>`;
        $("#ebResearchRetry")?.addEventListener("click", () => search(q));
      } finally {
        form.querySelector("button").disabled = false;
      }
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q.length < 2) {
        status.className = "eb-research-status is-error";
        status.textContent = "Please enter at least 2 characters.";
        return;
      }
      search(q);
    });
    const initial = new URLSearchParams(location.hash.split("?")[1] || "").get(
      "q",
    );
    if (initial) {
      input.value = initial;
      search(initial);
    }
  }
  const savedReplies = [
    ["Availability", "Hi! Is this item still available? Please let me know."],
    [
      "Condition",
      "Hi! Could you share more details about the item’s condition and any defects?",
    ],
    [
      "Pickup",
      "Hi! What public campus location and time would work for pickup?",
    ],
    ["Price", "Hi! Is the listed price negotiable? Thank you."],
  ];
  function messagesPage() {
    const host = app();
    if (!host) return;
    const user = currentUser();
    if (!user) {
      host.innerHTML = `<div class="wrap page-title"><h1>Messages</h1><div class="empty"><h2>Sign in to message students</h2><p>Log in first so your conversation can be associated with your account.</p><a class="primary" href="#login">Go to login</a></div></div>`;
      return;
    }
    host.innerHTML = `<section class="eb-chat-page eb-wa-page"><div class="eb-wa-shell">
  <aside class="eb-wa-sidebar"><div class="eb-wa-sidebar-head"><div class="eb-wa-profile"><span class="eb-wa-my-avatar">${esc((user.name || user.email || "Y").slice(0, 1).toUpperCase())}</span><div><strong>EasyBuy Chat</strong><small>Student marketplace</small></div></div><button type="button" id="ebWaNew" class="eb-wa-new" title="Start a new chat" aria-label="Start a new chat">＋</button></div>
   <div class="eb-wa-search"><span>⌕</span><input id="ebWaSearch" type="search" placeholder="Search conversations"></div>
   <div id="ebWaContacts" class="eb-wa-contacts"><div class="eb-wa-list-empty"><span class="eb-spinner"></span> Loading chats…</div></div>
   <div class="eb-wa-new-form" id="ebWaNewForm" hidden><div class="eb-wa-form-head"><strong>Start a new chat</strong><button type="button" id="ebWaCancelNew" aria-label="Cancel">×</button></div><label for="ebWaTo">Recipient email</label><input id="ebWaTo" type="email" maxlength="254" placeholder="student@example.com"><label for="ebWaProduct">Product ID (optional)</label><input id="ebWaProduct" maxlength="80" placeholder="Product ID"><label for="ebWaQuick">Quick reply</label><select id="ebWaQuick"><option value="">Choose saved reply…</option>${savedReplies.map((x, i) => `<option value="${i}">${esc(x[0])}</option>`).join("")}</select><button type="button" id="ebWaStart" class="eb-wa-start">Open chat</button><p id="ebWaNewError"></p></div>
  </aside>
  <section class="eb-wa-conversation"><header class="eb-wa-chat-head" id="ebWaChatHead"><div class="eb-wa-chat-placeholder-avatar">✉</div><div><strong>Select a conversation</strong><small>Your buyer and seller messages</small></div><button type="button" id="ebWaRefresh" title="Refresh chats" aria-label="Refresh chats">↻</button></header>
   <div class="eb-wa-messages" id="ebWaMessages"><div class="eb-wa-welcome"><div class="eb-wa-welcome-mark">EB</div><h2>Buy. Sell. Chat.</h2><p>Choose a conversation on the left or start a new chat with a student.</p><span>🔒 Messages are saved through the EasyBuy server.</span></div></div>
   <form class="eb-wa-composer" id="ebWaComposer"><button type="button" id="ebWaQuickButton" title="Saved replies" aria-label="Saved replies">☰</button><textarea id="ebWaBody" rows="1" maxlength="5000" placeholder="Type a message" disabled required></textarea><button type="submit" id="ebWaSend" disabled aria-label="Send message">➤</button><div id="ebWaStatus" role="status" aria-live="polite"></div></form>
   <div class="eb-wa-quick-replies" id="ebWaQuickReplies" hidden>${savedReplies.map((x, i) => `<button type="button" data-reply="${i}">${esc(x[0])}</button>`).join("")}</div>
  </section></div></section>`;
    const contacts = $("#ebWaContacts"),
      messages = $("#ebWaMessages"),
      body = $("#ebWaBody"),
      composer = $("#ebWaComposer"),
      status = $("#ebWaStatus");
    let rows = [],
      groups = [],
      activeKey = "",
      activeRecipient = "",
      activeProduct = "",
      busy = false;
    const email = String(user.email || "").toLowerCase();
    const fmtTime = (v) => {
      const d = new Date(v);
      return isNaN(d)
        ? ""
        : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };
    const fmtDay = (v) => {
      const d = new Date(v);
      return isNaN(d)
        ? ""
        : d.toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year:
              d.getFullYear() !== new Date().getFullYear()
                ? "numeric"
                : undefined,
          });
    };
    function groupRows(all) {
      const map = new Map();
      all.forEach((m) => {
        const sender = String(m.sender_email || "").toLowerCase(),
          recipient = String(m.recipient_email || "").toLowerCase();
        const other = sender === email ? recipient : sender;
        const product = String(m.product_code || "");
        const key = [other, product].join("|");
        if (!map.has(key)) map.set(key, { key, other, product, messages: [] });
        map.get(key).messages.push(m);
      });
      return [...map.values()].sort(
        (a, b) =>
          new Date(b.messages[b.messages.length - 1].created_at) -
          new Date(a.messages[a.messages.length - 1].created_at),
      );
    }
    function paintContacts() {
      const term = ($("#ebWaSearch").value || "").trim().toLowerCase();
      const shown = groups.filter((g) =>
        (g.other + " " + g.product + " " + (g.messages.at(-1)?.body || ""))
          .toLowerCase()
          .includes(term),
      );
      if (!shown.length) {
        contacts.innerHTML = `<div class="eb-wa-list-empty"><strong>${term ? "No matching chats" : "No chats yet"}</strong><p>${term ? "Try another search." : "Click ＋ to message a buyer or seller."}</p></div>`;
        return;
      }
      contacts.innerHTML = shown
        .map((g) => {
          const last = g.messages[g.messages.length - 1] || {
            body: "Start a new conversation",
            created_at: "",
          };
          const mine = String(last.sender_email || "").toLowerCase() === email;
          return `<button type="button" class="eb-wa-contact ${g.key === activeKey ? "active" : ""}" data-thread="${esc(g.key)}"><span class="eb-wa-contact-avatar">${esc((g.other || "?").slice(0, 1).toUpperCase())}</span><span class="eb-wa-contact-copy"><span class="eb-wa-contact-line"><strong>${esc(g.other)}</strong><time>${esc(fmtTime(last.created_at))}</time></span><span class="eb-wa-contact-preview">${mine ? "You: " : ""}${esc(last.body || "")}</span><span class="eb-wa-contact-product">${g.product ? "Product · " + esc(g.product) : "EasyBuy conversation"}</span></span></button>`;
        })
        .join("");
    }
    function paintConversation() {
      const g = groups.find((x) => x.key === activeKey);
      if (!g) {
        $("#ebWaChatHead").innerHTML =
          '<button type="button" class="eb-wa-back" id="ebWaBackChat" aria-label="Back to chats">‹</button><div class="eb-wa-chat-placeholder-avatar">✉</div><div><strong>Select a conversation</strong><small>Your buyer and seller messages</small></div><button type="button" id="ebWaRefresh" title="Refresh chats" aria-label="Refresh chats">↻</button>';
        $("#ebWaRefresh").addEventListener("click", refresh);
        $("#ebWaBackChat").addEventListener("click", () =>
          host
            .querySelector(".eb-wa-shell")
            ?.classList.remove("eb-wa-show-chat"),
        );
        messages.innerHTML =
          '<div class="eb-wa-welcome"><div class="eb-wa-welcome-mark">EB</div><h2>Buy. Sell. Chat.</h2><p>Choose a conversation on the left or start a new chat with a student.</p><span>🔒 Messages are saved through the EasyBuy server.</span></div>';
        body.disabled = true;
        $("#ebWaSend").disabled = true;
        return;
      }
      activeRecipient = g.other;
      activeProduct = g.product;
      const last = g.messages[g.messages.length - 1];
      $("#ebWaChatHead").innerHTML =
        `<button type="button" class="eb-wa-back" id="ebWaBackChat" aria-label="Back to chats">‹</button><span class="eb-wa-contact-avatar large">${esc((g.other || "?").slice(0, 1).toUpperCase())}</span><div class="eb-wa-chat-person"><strong>${esc(g.other)}</strong><small>${g.product ? "Product ID · " + esc(g.product) : "EasyBuy private conversation"}</small></div><button type="button" id="ebWaRefresh" title="Refresh chats" aria-label="Refresh chats">↻</button>`;
      $("#ebWaRefresh").addEventListener("click", refresh);
      $("#ebWaBackChat").addEventListener("click", () =>
        host.querySelector(".eb-wa-shell")?.classList.remove("eb-wa-show-chat"),
      );
      messages.innerHTML =
        `<div class="eb-wa-date-chip">${esc(fmtDay(g.messages[0].created_at))}</div>` +
        g.messages
          .map((m) => {
            const mine = String(m.sender_email || "").toLowerCase() === email;
            return `<div class="eb-wa-message-row ${mine ? "outgoing" : "incoming"}"><article class="eb-wa-bubble"><p>${esc(m.body)}</p><time>${esc(fmtTime(m.created_at))} ${mine ? '<span aria-label="sent">✓✓</span>' : ""}</time></article></div>`;
          })
          .join("");
      messages.scrollTop = messages.scrollHeight;
      body.disabled = false;
      $("#ebWaSend").disabled = false;
    }
    function selectThread(key) {
      activeKey = key;
      const g = groups.find((x) => x.key === key);
      if (g) {
        activeRecipient = g.other;
        activeProduct = g.product;
        $("#ebWaTo").value = g.other;
        $("#ebWaProduct").value = g.product;
      }
      host.querySelector(".eb-wa-shell")?.classList.add("eb-wa-show-chat");
      paintContacts();
      paintConversation();
      status.textContent = "";
    }
    async function refresh() {
      try {
        const r = await fetch(
          "api/messages.php?email=" + encodeURIComponent(email),
          {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
          },
        );
        const d = await r.json();
        if (!r.ok || !d.ok)
          throw new Error(d.error || "Could not load messages.");
        rows = d.messages || [];
        groups = groupRows(rows);
        paintContacts();
        if (activeKey && !groups.some((g) => g.key === activeKey))
          activeKey = "";
        if (!activeKey && groups.length) activeKey = groups[0].key;
        paintContacts();
        paintConversation();
      } catch (err) {
        contacts.innerHTML = `<div class="eb-wa-list-empty error"><strong>Could not load chats</strong><p>${esc(err.message || "Database connection failed.")}</p><button type="button" id="ebWaRetry">Try again</button></div>`;
        $("#ebWaRetry")?.addEventListener("click", refresh);
      }
    }
    contacts.addEventListener("click", (e) => {
      const b = e.target.closest("[data-thread]");
      if (b) selectThread(b.dataset.thread);
    });
    $("#ebWaSearch").addEventListener("input", paintContacts);
    $("#ebWaNew").addEventListener("click", () => {
      $("#ebWaNewForm").hidden = false;
      $("#ebWaTo").focus();
    });
    $("#ebWaCancelNew").addEventListener("click", () => {
      $("#ebWaNewForm").hidden = true;
      $("#ebWaNewError").textContent = "";
    });
    $("#ebWaStart").addEventListener("click", () => {
      const to = $("#ebWaTo").value.trim().toLowerCase(),
        product = $("#ebWaProduct").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to === email) {
        $("#ebWaNewError").textContent =
          "Enter a valid email different from your own.";
        return;
      }
      activeRecipient = to;
      activeProduct = product;
      activeKey = [to, product].join("|");
      if (!groups.some((g) => g.key === activeKey))
        groups.unshift({ key: activeKey, other: to, product, messages: [] });
      paintContacts();
      host.querySelector(".eb-wa-shell")?.classList.add("eb-wa-show-chat");
      $("#ebWaChatHead").innerHTML =
        `<button type="button" class="eb-wa-back" id="ebWaBackChat" aria-label="Back to chats">‹</button><span class="eb-wa-contact-avatar large">${esc(to.slice(0, 1).toUpperCase())}</span><div class="eb-wa-chat-person"><strong>${esc(to)}</strong><small>${product ? "Product ID · " + esc(product) : "New EasyBuy conversation"}</small></div><button type="button" id="ebWaRefresh" title="Refresh chats">↻</button>`;
      $("#ebWaRefresh").addEventListener("click", refresh);
      $("#ebWaBackChat").addEventListener("click", () =>
        host.querySelector(".eb-wa-shell")?.classList.remove("eb-wa-show-chat"),
      );
      messages.innerHTML =
        '<div class="eb-wa-welcome compact"><h2>Start the conversation</h2><p>Say hello to ' +
        esc(to) +
        ".</p></div>";
      body.disabled = false;
      $("#ebWaSend").disabled = false;
      $("#ebWaNewForm").hidden = true;
      body.focus();
    });
    $("#ebWaQuickButton").addEventListener("click", () => {
      $("#ebWaQuickReplies").hidden = !$("#ebWaQuickReplies").hidden;
    });
    $("#ebWaQuickReplies").addEventListener("click", (e) => {
      const b = e.target.closest("[data-reply]");
      if (!b) return;
      body.value = savedReplies[Number(b.dataset.reply)]?.[1] || "";
      $("#ebWaQuickReplies").hidden = true;
      body.focus();
    });
    $("#ebWaQuick").addEventListener("change", (e) => {
      const item = savedReplies[Number(e.target.value)];
      if (item) {
        body.value = item[1];
        $("#ebWaNewError").textContent =
          "Quick reply added. Open the chat to send it.";
      }
    });
    composer.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (busy) return;
      const text = body.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.className = "is-error";
        status.textContent = "Your login email is unavailable. Please log out and sign in again.";
        return;
      }
      if (!activeRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(activeRecipient)) {
        status.textContent = "Choose a conversation or enter a valid recipient email first.";
        return;
      }
      if (activeRecipient.toLowerCase() === email) {
        status.className = "is-error";
        status.textContent = "Enter the other student’s email, not your own.";
        return;
      }
      if (!text) {
        status.textContent = "Type a message first.";
        return;
      }
      busy = true;
      $("#ebWaSend").disabled = true;
      status.className = "is-loading";
      status.textContent = "Sending…";
      try {
        const payload = {
          email,
          to: activeRecipient,
          body: text,
          productCode: activeProduct || "",
        };
        const r = await fetch("api/messages.php", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        const d = await r.json();
        if (!r.ok || !d.ok)
          throw new Error(d.error || "Message could not be saved.");
        body.value = "";
        status.className = "is-sent";
        status.textContent = "Message sent";
        await refresh();
        activeKey = [activeRecipient, activeProduct].join("|");
        paintContacts();
        paintConversation();
      } catch (err) {
        status.className = "is-error";
        status.textContent =
          "Not sent: " + (err.message || "Server or database error.");
      } finally {
        busy = false;
        $("#ebWaSend").disabled = !activeRecipient;
        body.focus();
      }
    });
    refresh();
    if (window.ebChatPoll) clearInterval(window.ebChatPoll);
    window.ebChatPoll = setInterval(() => {
      if (location.hash.startsWith("#messages")) refresh();
      else clearInterval(window.ebChatPoll);
    }, 12000);
  }
  function routeEnhancements() {
    const path = (location.hash || "#home").slice(1).split("?")[0];
    if (path === "discover") discoverPage();
    if (path === "messages") messagesPage();
  }
  window.addEventListener("hashchange", routeEnhancements);
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", routeEnhancements);
  else routeEnhancements();
})();
