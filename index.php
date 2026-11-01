<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="#1749b5">
    <title>EasyBuy Seller Studio</title>
    <link rel="stylesheet" href="seller.css">
</head>

<body>
    <header><a class="brand" href="../index.php">Easy<span>Buy</span> <small>Seller Studio</small></a><a class="back" href="../index.php">Buyer website ↗</a></header>
    <main>
        <section id="authView" class="auth">
            <div class="intro"><span class="eyebrow">SELL ON EASYBUY</span>
                <h1>Your campus store, in one place.</h1>
                <p>Create a seller account to publish real listings shared with buyers on this EasyBuy installation. Your products and photos are stored on the server database, not just your browser.</p>
                <ul>
                    <li>✓ Publish and manage listings</li>
                    <li>✓ Shared catalogue across devices</li>
                    <li>✓ Seller account with password hashing</li>
                </ul>
            </div>
            <div class="panel">
                <div class="tabs"><button id="loginTab" class="active">Sign in</button><button id="registerTab">Create account</button></div>
                <form id="authForm"><label id="nameWrap" hidden>Full name<input name="name" maxlength="80" autocomplete="name"></label><div id="securityWrap" hidden><label>Security question<select name="security_question"><option value="">Choose a question</option><option value="What is your favourite colour?">What is your favourite colour?</option><option value="What was the name of your first school?">What was the name of your first school?</option><option value="What is your favourite food?">What is your favourite food?</option><option value="What is your childhood nickname?">What is your childhood nickname?</option></select></label><label>Security answer<input name="security_answer" maxlength="120" autocomplete="off" placeholder="Remember your answer"></label><small>Use an answer you can remember. It is stored as a hash.</small></div><label>Email address<input type="email" name="email" required autocomplete="email"></label><label>Password<input type="password" name="password" minlength="8" required autocomplete="current-password"></label><button class="primary" id="authSubmit">Sign in</button>
                    <p class="notice" id="authNotice" role="status"></p>
                    <p style="margin:12px 0 0;text-align:right"><a href="forgot-password.php" style="color:#1749b5;font-weight:700;text-decoration:none">Forgot password?</a></p>
                </form>
            </div>
        </section>
        <section id="dashboard" hidden>
            <div class="dashhead">
                <div><span class="eyebrow">SELLER DASHBOARD</span>
                    <h1>Hello, <span id="sellerName">seller</span></h1>
                    <p>Manage your published products and keep your campus catalogue up to date.</p>
                    <div class="seller-account-actions" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
                        <a href="change-password.html" class="outline" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 16px;border:1px solid #1749b5;border-radius:9px;color:#1749b5;text-decoration:none;font-weight:700;background:#fff;">🔒 Change / Update Password</a>
                    </div>
                </div><button id="logout" class="outline">Sign out</button>
            </div>
            <div class="stats">
                <article><small>Total listings</small><strong id="totalCount">0</strong></article>
                <article><small>Live listings</small><strong id="liveCount">0</strong></article>
                <article><small>Removed listings</small><strong id="removedCount">0</strong></article>
            </div>
            <section class="panel seller-sales-panel" aria-labelledby="salesTitle">
                <div class="listHead"><div><h2 id="salesTitle">Sales & earnings</h2><p class="muted">Calculated from your products in customer orders. Only delivered orders count as completed sales.</p></div><button id="refreshOrdersTop" class="outline" type="button">Refresh sales</button></div>
                <div class="stats sales-stats">
                    <article><small>Completed sales</small><strong id="salesCompleted">₹0</strong></article>
                    <article><small>Pending order value</small><strong id="salesPending">₹0</strong></article>
                    <article><small>Units sold</small><strong id="salesUnits">0</strong></article>
                    <article><small>Total orders</small><strong id="salesOrderCount">0</strong></article>
                </div>
                <p id="salesBreakdown" class="muted" role="status">Sales totals will appear when order data loads.</p>
            </section>
            <section class="panel contact-panel">
                <div>
                    <h2>Seller contact details</h2>
                    <p class="muted">Your number appears with your live products so buyers can call you directly.</p>
                </div>
                <form id="contactForm" class="contact-form"><label>Mobile number<input id="sellerPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" placeholder="9876543210" required></label><button class="primary" id="saveContact" type="submit">Save contact number</button>
                    <p id="contactNotice" class="notice" role="status"></p>
                </form>
            </section>
            <div class="panel" style="margin:20px 0">
                <div class="listHead">
                    <div>
                        <h2>Product history</h2>
                        <p class="muted">Publish, republish, unpublish and order activity.</p>
                    </div><button id="refreshHistory" class="outline" type="button">Refresh history</button>
                </div>
                <div id="productHistory">
                    <p class="muted">Loading history…</p>
                </div>
            </div>
            <div class="panel" style="margin:20px 0">
                <div class="listHead">
                    <div>
                        <h2>Customer orders & tracking</h2>
                        <p class="muted">Update order status; buyers see these updates in My Orders.</p>
                    </div><button id="refreshOrders" class="outline" type="button">Refresh orders</button>
                </div>
                <div id="sellerOrders">
                    <p class="muted">Loading orders…</p>
                </div>
            </div>
            <div class="panel" style="margin:20px 0">
                <div class="listHead">
                    <div>
                        <h2>Buyer messages</h2>
                        <p class="muted">Messages sent through the database-backed inbox.</p>
                    </div><button id="refreshMessages" class="outline" type="button">Refresh messages</button>
                </div>
                <div id="sellerMessages">
                    <p class="muted">Loading messages…</p>
                </div>
            </div>
            <div class="columns">
                <section class="panel">
                    <h2>Publish a product</h2>
                    <p class="muted">Use your own product photo and accurate condition/price.</p>
                    <form id="productForm" enctype="multipart/form-data"><label>Product name<input name="name" maxlength="100" required placeholder="e.g. BCA Java textbook"></label>
                        <div class="two"><label>Category<select name="category" required>
                                    <option>Books</option>
                                    <option>Stationery Kits</option>
                                    <option>Calculators</option>
                                    <option>Lab Equipment</option>
                                    <option>Electronics</option>
                                    <option>Accessories</option>
                                    <option>T-Shirts</option>
                                    <option>Bags</option>
                                </select></label><label>Price (₹)<input type="number" name="price" min="1" max="100000" step="0.01" required></label></div>
                        <div class="two"><label>Condition<select name="condition">
                                    <option>Second-hand · Very good</option>
                                    <option>Second-hand · Good</option>
                                    <option>First-hand · New</option>
                                </select></label><label>Available quantity<input type="number" name="stock" min="1" max="999" value="1" required></label></div><label>College / campus<input name="college" maxlength="100" required placeholder="College name"></label><label>Description<textarea name="description" rows="4" maxlength="2000" placeholder="Condition, edition, included accessories…"></textarea></label><label>Product photo (JPG, PNG, WEBP; max 4 MB)<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required></label><img id="preview" alt="Selected product preview" hidden><button class="primary">Publish listing</button>
                        <p id="productNotice" class="notice" role="status"></p>
                    </form>
                </section>
                <section class="panel">
                    <div class="listHead">
                        <div>
                            <h2>Your listings</h2>
                            <p class="muted">Changes appear in the shared catalogue.</p>
                        </div><button id="refresh" class="outline">Refresh</button>
                    </div>
                    <div id="listingList">
                        <p class="muted">Loading listings…</p>
                    </div>
                </section>
            </div>
        </section>
        <div id="globalNotice" class="globalNotice" role="status"></div>
    </main>
    <footer>EasyBuy Seller Studio · Secure server-side sessions · Never share your password.</footer>
    <script src="seller.js"></script>
    <script src="../js/analytics-tracker.js" defer></script>
</body>

</html>
