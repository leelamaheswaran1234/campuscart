/* EasyBuy buyer authentication: server-side PHP + MySQL sessions (auth.php). Profile/cart/wishlist: api/buyer-data.php. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const app = $("#app");
  let currentUser = null, csrf = "", requestedSell = false;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function api(action, data) {
    const response = await fetch("auth.php" + (data ? "" : "?role=buyer&action="+encodeURIComponent(action)), {
      method: data ? "POST" : "GET", credentials: "same-origin",
      headers: data ? {"Content-Type":"application/json","X-CSRF-Token":csrf} : {"Accept":"application/json"},
      body: data ? JSON.stringify({...data,action,role:"buyer"}) : undefined
    });
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); }
    catch (_) {
      const looksHtml = /^\s*<!doctype html|^\s*<html/i.test(raw);
      throw new Error(looksHtml
        ? "The authentication URL returned an HTML page instead of JSON. Upload auth.php and api/auth.php to the same project folder and check the hosting PHP configuration."
        : "The authentication server returned an invalid response. Check PHP error logs and api/config.php.");
    }
    if (!response.ok || !result.ok) throw new Error(result.error || "Buyer account request failed.");
    if (result.csrf) csrf=result.csrf;
    return result;
  }
  async function dataApi(data) {
    const response = await fetch("api/buyer-data.php", {
      method: "POST", credentials: "same-origin",
      headers: {"Content-Type":"application/json","X-CSRF-Token":csrf}, body: JSON.stringify(data)
    });
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); }
    catch (_) { throw new Error("The buyer-data API returned an invalid response. Check api/buyer-data.php, PHP error logs, and database settings."); }
    if (!response.ok || !result.ok) throw new Error(result.error || "Could not save to the database.");
    return result;
  }
  const QUESTIONS=["What is your favourite colour?","What was the name of your first school?","What is your favourite food?","What is your childhood nickname?"];
  function updateMenu() {
    document.querySelectorAll("[data-auth-only]").forEach(el => el.hidden=!currentUser);
    document.querySelectorAll("[data-guest-nav]").forEach(el => el.hidden=!!currentUser);
    document.documentElement.classList.toggle("eb-auth-pending",!currentUser && !["login","signup","forgot-password"].includes((location.hash||"#login").slice(1).split("?")[0]));
    window.dispatchEvent(new Event("easybuy:auth-changed"));
  }
  function authShell(kicker,title,subtitle,inner) {
    app.innerHTML=`<section class="eb-auth-wrap"><div class="eb-auth-card"><a class="logo eb-auth-logo" href="#login">easy<b>buy.</b></a><div class="eb-auth-kicker">${kicker}</div><h1>${title}</h1><p class="eb-auth-sub">${subtitle}</p><div id="ebAuthMessage" class="eb-auth-message" role="status" aria-live="polite"></div>${inner}<p class="eb-auth-hint" style="margin-top:18px">Your buyer account is securely stored in the EasyBuy MySQL database.</p></div></section>`;
  }
  function message(t,ok=false){const el=$("#ebAuthMessage");if(el){el.textContent=t;el.className="eb-auth-message "+(ok?"success":"error");}}
  // Older modules (messages, contact) read the signed-in buyer from these browser keys; mirror the database account there.
  function syncLegacyEmail(){
    try{
      const key="easybuy_js_users_v1";let users=[];try{users=JSON.parse(localStorage.getItem(key)||"[]");}catch(_){}
      if(!Array.isArray(users))users=[];
      users=users.filter(u=>!(u&&u.db&&(!currentUser||String(u.email).toLowerCase()!==String(currentUser.email).toLowerCase())));
      if(currentUser){
        sessionStorage.setItem("easybuy_js_session_v1",currentUser.email);
        const i=users.findIndex(u=>u&&String(u.email).toLowerCase()===String(currentUser.email).toLowerCase());
        const rec={name:currentUser.name,email:currentUser.email,db:true};
        if(i>=0)users[i]={...users[i],name:rec.name};else users.push(rec);
      } else sessionStorage.removeItem("easybuy_js_session_v1");
      localStorage.setItem(key,JSON.stringify(users));
    }catch(_){}
  }
  function loginPage(){
    authShell("WELCOME BACK","Login to EasyBuy","Sign in to continue to the campus marketplace.",`<form id="ebLoginForm" class="eb-auth-form"><label>Email address<input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com"></label><label>Password<input name="password" type="password" autocomplete="current-password" required minlength="8"></label><button class="primary" type="submit">Login ↗</button></form><p class="eb-auth-switch"><a href="#forgot-password">Forgot password?</a></p><p class="eb-auth-switch">New to EasyBuy? <a href="#signup">Create an account</a></p>`);
    $("#ebLoginForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector("button");b.disabled=true;message("Checking your account…");try{const r=await api("login",{email:f.elements.email.value.trim().toLowerCase(),password:f.elements.password.value});currentUser=r.buyer;syncLegacyEmail();document.body.classList.remove("eb-guest-mode");updateMenu();location.hash=requestedSell?"#sell":"#home";}catch(err){message(err.message);}finally{b.disabled=false;}});
  }
  function signupPage(){
    authShell("JOIN EASYBUY","Create your account","Create a buyer account to access the marketplace.",`<form id="ebSignupForm" class="eb-auth-form"><label>Your name<input name="name" required minlength="2" maxlength="80" autocomplete="name"></label><label>Email address<input name="email" type="email" required maxlength="254" autocomplete="email"></label><label>Password<input name="password" type="password" required minlength="8" autocomplete="new-password"></label><label>Confirm password<input name="confirm_password" type="password" required minlength="8" autocomplete="new-password"></label><label>Security question (for password recovery)<select name="security_question" required>${QUESTIONS.map(q=>`<option>${q}</option>`).join("")}</select></label><label>Your answer<input name="security_answer" required minlength="2" maxlength="120" autocomplete="off"></label><button class="primary" type="submit">Create account ↗</button></form><p class="eb-auth-switch">Already registered? <a href="#login">Login</a></p>`);
    $("#ebSignupForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector("button");if(f.elements.password.value!==f.elements.confirm_password.value){message("Passwords do not match.");return;}b.disabled=true;message("Creating your account…");try{const r=await api("register",{name:f.elements.name.value.trim(),email:f.elements.email.value.trim().toLowerCase(),password:f.elements.password.value,security_question:f.elements.security_question.value,security_answer:f.elements.security_answer.value});currentUser=r.buyer;syncLegacyEmail();document.body.classList.remove("eb-guest-mode");updateMenu();location.hash=requestedSell?"#sell":"#home";}catch(err){message(err.message);}finally{b.disabled=false;}});
  }
  function forgotPasswordPage(){
    authShell("ACCOUNT RECOVERY","Reset your password","Enter your account email, then answer the security question you chose when you registered.",`<form id="ebRecoverForm" class="eb-auth-form"><label>Email address<input name="email" type="email" required maxlength="254" autocomplete="email"></label><button class="primary" type="submit">Continue ↗</button></form><p class="eb-auth-switch"><a href="#login">Back to login</a></p>`);
    $("#ebRecoverForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget;if(f.dataset.step==="2")return;const b=f.querySelector("button");const email=f.elements.email.value.trim().toLowerCase();b.disabled=true;message("Checking…");
      try{const r=await api("recover_question",{email});message("");f.dataset.step="2";
        f.innerHTML=`<p><strong>${esc(r.question)}</strong></p><label>Your answer<input name="security_answer" required autocomplete="off" maxlength="120"></label><label>New password<input name="new_password" type="password" required minlength="8" autocomplete="new-password"></label><label>Confirm new password<input name="confirm_password" type="password" required minlength="8" autocomplete="new-password"></label><button class="primary" type="submit">Reset password ↗</button>`;
        f.onsubmit=async ev=>{ev.preventDefault();if(f.elements.new_password.value!==f.elements.confirm_password.value){message("Passwords do not match.");return;}const bb=f.querySelector("button");bb.disabled=true;
          try{const rr=await api("recover_reset",{email,security_answer:f.elements.security_answer.value,new_password:f.elements.new_password.value});message(rr.message+" Redirecting to login…",true);setTimeout(()=>{location.hash="#login";},1800);}catch(err){message(err.message);bb.disabled=false;}};
      }catch(err){message(err.message);b.disabled=false;}});
  }
  function accountPage(){
    if(!currentUser){location.hash="#login";return;}
    authShell("YOUR PROFILE","My Account","Your EasyBuy buyer account details.",`<div class="eb-profile"><div class="eb-profile-avatar">${esc((currentUser.name||"U").trim().charAt(0).toUpperCase())}</div><div><h2>${esc(currentUser.name)}</h2><p>${esc(currentUser.email)}</p></div></div><div class="eb-profile-details"><div><span>Account status</span><strong>Logged in</strong></div><div><span>Member since</span><strong>${esc(currentUser.created_at||"Registered")}</strong></div></div><h2 style="margin-top:24px">Profile &amp; delivery details</h2><form id="ebProfileForm" class="eb-auth-form"><label>Full name<input name="name" required minlength="2" maxlength="80" autocomplete="name" value="${esc(currentUser.name)}"></label><label>Phone number<input name="phone" type="tel" maxlength="24" autocomplete="tel" value="${esc(currentUser.phone||"")}"></label><label>College / campus<input name="college" maxlength="100" value="${esc(currentUser.college||"")}"></label><label>City<input name="city" maxlength="80" autocomplete="address-level2" value="${esc(currentUser.city||"")}"></label><label>PIN code<input name="pincode" maxlength="12" autocomplete="postal-code" value="${esc(currentUser.pincode||"")}"></label><label>Delivery address<input name="address" maxlength="500" autocomplete="street-address" value="${esc(currentUser.address||"")}"></label><button class="primary" type="submit">Save profile</button></form><h2 style="margin-top:24px">Change password</h2><form id="ebChangePasswordForm" class="eb-auth-form"><label>Current password<input name="current_password" type="password" required autocomplete="current-password"></label><label>New password<input name="new_password" type="password" minlength="8" required autocomplete="new-password"></label><label>Confirm new password<input name="confirm_password" type="password" minlength="8" required autocomplete="new-password"></label><button class="primary" type="submit">Update password</button></form><div class="eb-auth-actions"><a class="primary" href="#sell">＋ Sell a product</a><button class="secondary" id="ebLogoutBtn" type="button">Logout</button></div><a class="eb-auth-back" href="#home">← Back to marketplace</a>`);
    $("#ebLogoutBtn").addEventListener("click",logout);
    $("#ebProfileForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector("button");b.disabled=true;try{const r=await dataApi({action:"save_profile",name:f.elements.name.value.trim(),phone:f.elements.phone.value.trim(),college:f.elements.college.value.trim(),city:f.elements.city.value.trim(),pincode:f.elements.pincode.value.trim(),address:f.elements.address.value.trim()});currentUser={...currentUser,...r.profile};syncLegacyEmail();window.dispatchEvent(new Event("easybuy:profile-changed"));message(r.message||"Profile saved.",true);}catch(err){message(err.message);}finally{b.disabled=false;}});
    $("#ebChangePasswordForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget;if(f.elements.new_password.value!==f.elements.confirm_password.value){message("Passwords do not match.");return;}try{const r=await api("change_password",{current_password:f.elements.current_password.value,new_password:f.elements.new_password.value});message(r.message,true);f.reset();}catch(err){message(err.message);}});
  }
  async function logout(){try{await api("logout",{});}catch(e){}currentUser=null;csrf="";syncLegacyEmail();if(window.EasyBuyState)window.EasyBuyState.reset();document.body.classList.add("eb-guest-mode");updateMenu();requestedSell=false;location.hash="#login";}
  async function renderRoute(){
    const path=(location.hash||"").slice(1).split("?")[0];
    if(path==="logout"){await logout();return true;}
    try{const r=await api("me");currentUser=r.buyer||null;csrf=r.csrf||"";}catch(e){currentUser=null;csrf="";}
    syncLegacyEmail();updateMenu();
    if(!currentUser){document.body.classList.add("eb-guest-mode");if(path==="signup"){signupPage();return true;}if(path==="forgot-password"){forgotPasswordPage();return true;}if(path!=="login")location.hash="#login";loginPage();return true;}
    document.body.classList.remove("eb-guest-mode");
    if(path==="login"||path==="signup"){location.hash="#home";return true;}
    if(path==="account"){accountPage();return true;}
    return false;
  }
  window.EasyBuyAuth={renderRoute,refresh:async()=>{try{const r=await api("me");currentUser=r.buyer||null;csrf=r.csrf||"";}catch(e){currentUser=null;}syncLegacyEmail();return currentUser;},isLoggedIn:()=>!!currentUser,getBuyer:()=>currentUser,getCsrf:()=>csrf};
  window.addEventListener("hashchange",()=>{renderRoute().then(handled=>{if(handled)window.scrollTo({top:0,behavior:"smooth"});});});
  (async()=>{await renderRoute();document.documentElement.classList.remove("eb-auth-pending");const loader=$("#loading");if(loader){loader.classList.add("hidden");loader.classList.remove("eb-transition-loading");}if(!location.hash||location.hash==="#")location.hash=currentUser?"#home":"#login";})();
})();
