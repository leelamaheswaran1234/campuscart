<?php
require __DIR__.'/_common.php'; unset($_SESSION['admin_id'],$_SESSION['admin_username']); header('Location: login.php'); exit;
