EasyBuy – database update (buyer + seller + products, all in one MySQL database)
================================================================================

What this update does
---------------------
1. index.php   – Front controller. Opens the Buyer storefront (index.html is served through it with the login
                 state injected). index.php?view=seller, index.php/seller or the #seller link open the Seller Studio.
                 .htaccess makes index.php the default page (index.html still exists and still works).
2. auth.php    – ONE database login/registration endpoint for buyers and sellers (role=buyer|seller),
                 PHP sessions + password_hash()/password_verify(). api/auth.php and api/buyer-auth.php are now thin
                 wrappers around it, so the Seller Studio and older pages keep working.
3. Buyer profile, cart, wishlist – saved in MySQL (tables buyers, eb_cart_items, eb_wishlist_items) via
                 api/buyer-data.php. js/buyer-sync.js loads them after login, saves every change, and pre-fills
                 checkout from the profile. Items added before login are merged into the account cart.
                 The Account page has a new "Profile & delivery details" form.
4. Orders, tracking, messages, returns, feedback – one database. Buyer identity now always comes from the login
                 session (messages, cancel, return/feedback, invoice no longer trust an e-mail typed in the browser).
                 Order totals use the product price stored in MySQL, and the saved cart is emptied when an order is placed.
5. Default 250 products – api/config.php imports owner-products-seed.json into MySQL once (first request) under the
                 Owner Seller account 227027089@sastra.ac.in. Products keep their ids (EB101 ...), so the storefront shows
                 them once, with the original old price / rating / specs / images. Re-run any time (safe, idempotent):
                 /api/seed-owner-products.php
6. Nothing removed – all images, CSS, js/products.js (800 bundled products), seller studio, admin, SQL files are unchanged.
                 Tables/columns are only ever ADDED (CREATE TABLE IF NOT EXISTS / ADD COLUMN when missing).

OWNER SELLER ACCOUNT (important)
--------------------------------
The seeded owner seller (227027089@sastra.ac.in) is created WITHOUT a password. Open Seller Studio ->
"Create account" with that exact e-mail once; it claims the seeded account (keeps all 250 products) and sets your
password. Nobody else can claim it after that. Until it is claimed, buyers can still order; the owner just cannot log in.
Use the EASYBUY_OWNER_EMAIL environment variable if the owner should use a different address.

Install
-------
1. Back up your current project and MySQL database.
2. Extract this ZIP over a COPY of the project (keep images/ and uploads/).
3. Set the production DB password in api/config.php (or env vars EASYBUY_DB_HOST/NAME/USER/PASS).
4. Open https://YOUR-DOMAIN/api/health.php  -> tables all true, default_catalogue.owner_products = 250.
5. Register a buyer, add to cart/wishlist, place an order; claim the owner seller account and check the order there.

Existing browser-only buyer accounts (old localStorage) are not migrated – those users register once again.
Tested here against a MySQL-compatible server (Dolt 8.0): register/login, profile, cart, wishlist, 250-product seed,
orders, tracking, messages, cancel/restock, OTP delivery, feedback, invoice, and the browser UI flow.
NOT tested on InfinityFree itself (no access to your hosting).
