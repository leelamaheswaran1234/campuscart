EASYBUY DEPLOYMENT NOTES
========================

Entry pages
-----------
- Buyer/main website: index.php
- Seller entry: sellerindex.php (opens seller/index.php)
- Admin entry: admininex.php (opens admin/index.php)

Authentication and shared MySQL connection
------------------------------------------
Buyer authentication endpoint: auth.php
Seller/API authentication wrapper: api/auth.php
Buyer compatibility endpoint: api/buyer-auth.php
All PHP endpoints use the single connection/schema file:
    api/config.php
The root auth.php is required for the storefront login/register JavaScript.
Keep it in the project root; do not remove or rename it.

The db() function in api/config.php creates one PDO connection and safely
creates/migrates the required tables on first request. Do not create separate
database connection files for buyer, seller, or admin.

Database schema file
--------------------
Import database.sql into the ONE MySQL database selected in your hosting
control panel / phpMyAdmin. The application may also create missing additive
tables when first opened.

Before deploying
----------------
1. Upload the contents of this campuscart folder to your PHP hosting public
   directory (for example, public_html). Keep the folder structure intact.
2. Create one MySQL database and a database user in the hosting control panel.
3. Open api/config.php and set the production values in the non-local branch:
       EASYBUY_DB_HOST (or the $host value)
       EASYBUY_DB_NAME (or the $name value)
       EASYBUY_DB_USER (or the $user value)
       EASYBUY_DB_PASS (or the $pass value)
   Prefer environment variables where your host supports them. The password
   is intentionally not hard-coded in this package.
4. Import database.sql into that same database using phpMyAdmin.
5. Visit /index.php, then test buyer registration/login, seller registration,
   products, orders and tracking. If the auth endpoint is reachable, opening
   /auth.php?action=me&role=buyer should return JSON (not an HTML 404 page).
6. Open /sellerindex.php for the seller area and /admininex.php for the admin
   area. Admin login credentials must be configured/created according to the
   existing admin authentication code.
7. Ensure the hosting plan supports the PHP version required by the code and
   PDO MySQL extension.

Important
---------
- The original HTML/CSS/theme and existing feature files have been preserved.
- This package cannot guarantee a successful live deployment until the hosting
  provider's real database host/name/user/password are configured and the site
  is tested on that host.
- Never share database passwords publicly. If a real password was previously
  placed in source code, rotate it in your hosting control panel.

SELLER SECURITY TOKEN FIX (2026-11-01)
- api/auth.php is pinned to the seller role; buyer authentication remains on api/buyer-auth.php / root auth.php role=buyer.
- Seller Studio refreshes its seller CSRF token once after a 419 response and retries the failed request once.
- Upload the complete project folder together so auth.php, api/auth.php, api/config.php, and seller/seller.js are all from this ZIP.
- If the session has truly expired, sign in again. Configure your hosting database credentials in api/config.php.
