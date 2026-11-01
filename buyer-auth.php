<?php
/** Buyer-only compatibility endpoint; all roles share the same auth implementation. */
define('EB_AUTH_ROLE', 'buyer');
require dirname(__DIR__) . '/auth.php';
