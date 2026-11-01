<?php
require __DIR__.'/_common.php';
$pdo=db(); admin_ready($pdo);
$count=(int)$pdo->query('SELECT COUNT(*) FROM eb_admin_users')->fetchColumn();
$error='';
if ($_SERVER['REQUEST_METHOD']==='POST') {
  $username=trim((string)($_POST['username']??'')); $password=(string)($_POST['password']??'');
  if ($count===0 && ($_POST['mode']??'')==='setup') {
    if (strlen($username)<4 || strlen($username)>80 || strlen($password)<12) $error='Username must be 4+ characters and password must be at least 12 characters.';
    else {
      try { $st=$pdo->prepare('INSERT INTO eb_admin_users(username,password_hash) VALUES(?,?)'); $st->execute([$username,password_hash($password,PASSWORD_DEFAULT)]); $_SESSION['admin_id']=(int)$pdo->lastInsertId(); $_SESSION['admin_username']=$username; session_regenerate_id(true); header('Location: index.php'); exit; }
      catch(Throwable $e) { $error='Admin setup could not finish. Please refresh and try again.'; }
    }
  } else {
    $st=$pdo->prepare('SELECT id,username,password_hash FROM eb_admin_users WHERE username=? LIMIT 1'); $st->execute([$username]); $u=$st->fetch();
    if ($u && password_verify($password,$u['password_hash'])) { session_regenerate_id(true); $_SESSION['admin_id']=(int)$u['id']; $_SESSION['admin_username']=$u['username']; $pdo->prepare('UPDATE eb_admin_users SET last_login_at=NOW() WHERE id=?')->execute([$u['id']]); header('Location: index.php'); exit; }
    $error='Username or password is incorrect.';
  }
}
$isSetup=((int)$pdo->query('SELECT COUNT(*) FROM eb_admin_users')->fetchColumn()===0);
?><!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EasyBuy Admin Access</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f2f6fc;font:15px system-ui;color:#172033}.card{width:min(440px,92vw);background:white;padding:32px;border-radius:22px;box-shadow:0 20px 70px #14284b18}h1{margin:0 0 8px;font-size:27px}.sub{color:#667085;margin:0 0 25px}label{display:block;font-weight:650;margin:15px 0 7px}input{width:100%;padding:13px;border:1px solid #d7dfeb;border-radius:10px;font:inherit}button{margin-top:20px;width:100%;border:0;background:#245ce7;color:white;padding:14px;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer}.err{padding:11px;background:#fff0f0;color:#a12b2b;border-radius:9px;margin-bottom:12px}.note{font-size:12px;color:#7b8494;margin-top:18px;line-height:1.5}.brand{color:#245ce7;font-weight:800;letter-spacing:.04em;margin-bottom:18px}</style></head><body><main class="card"><div class="brand">EASYBUY / ADMIN</div><h1><?= $isSetup?'Create admin account':'Admin sign in' ?></h1><p class="sub"><?= $isSetup?'First-time setup — create your private dashboard login.':'Sign in to view store activity and reports.' ?></p><?php if($error):?><div class="err"><?=admin_e($error)?></div><?php endif;?><form method="post"><input type="hidden" name="mode" value="<?= $isSetup?'setup':'login' ?>"><label>Username</label><input name="username" required minlength="4" autocomplete="username"><label>Password <?= $isSetup?'(12+ characters)':'' ?></label><input type="password" name="password" required <?= $isSetup?'minlength="12"':'' ?> autocomplete="<?= $isSetup?'new-password':'current-password' ?>"><button><?= $isSetup?'Create admin & continue':'Sign in securely' ?></button></form><p class="note">Only the first admin account can be created from this page. After setup, this becomes a normal login page. Use a unique password and HTTPS when hosting publicly.</p></main></body></html>
