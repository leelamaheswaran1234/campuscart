EasyBuy - LOGIN-ONLY patch
Copy these 6 files over your project (same folders), then press Ctrl+F5 in the browser:
  auth.php, api/auth.php, api/buyer-auth.php, api/config.php, api/buyer-data.php, js/auth.js
What it changes: database login/registration for buyers and sellers (auth.php), security question at register,
"Forgot password?" reset for buyers, profile form on the Account page.
Nothing else (index.html, app.js, products, orders, messages, images) is touched.
api/config.php adds the new buyer columns/tables to MySQL automatically on the first request.
Buyers who registered before this patch have no security question and must register again.
