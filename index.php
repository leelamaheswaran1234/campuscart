<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="#1749b5">
    <title>EasyBuy Seller Studio</title>
    <link rel="stylesheet" href="seller.css"><style>@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;600;700;800&display=swap');

:root {
    --blue: #2874f0;
    --navy: #14213d;
    --cyan: #dff7ff;
    --peach: #fff0e8;
    --purple: #eee8ff;
    --ink: #1c2940;
    --muted: #718096;
    --paper: #f6f9ff;
    --white: #fff;
    --line: #e4ebf5;
    --shadow: 0 18px 48px #1d477b12
}

* {
    box-sizing: border-box
}

html {
    scroll-behavior: smooth
}

body {
    margin: 0;
    font-family: 'DM Sans', sans-serif;
    color: var(--ink);
    background: var(--paper)
}

a {
    color: inherit;
    text-decoration: none
}

button,
input,
select {
    font: inherit
}

button {
    cursor: pointer;
    border: 0
}

.wrap {
    width: min(1180px, 92%);
    margin: auto
}

.topline {
    background: var(--navy);
    color: #eaf3ff;
    text-align: center;
    padding: 8px;
    font-size: 12px;
    letter-spacing: .2px
}

.navbar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: #ffffffed;
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--line)
}

.navinner {
    min-height: 76px;
    display: flex;
    align-items: center;
    gap: 24px
}

.logo {
    font: 800 25px Manrope;
    color: var(--navy);
    letter-spacing: -1px
}

.logo b {
    color: var(--blue)
}

.navlinks {
    display: flex;
    gap: 21px;
    align-items: center;
    font-weight: 600;
    font-size: 14px;
    margin-left: auto
}

.navlinks a:hover {
    color: var(--blue)
}

.navactions {
    display: flex;
    gap: 10px;
    align-items: center
}

.search {
    width: 210px;
    border: 1px solid var(--line);
    background: #f7faff;
    border-radius: 13px;
    padding: 11px 13px;
    outline: none
}

.pillbtn,
.primary,
.secondary {
    border-radius: 12px;
    padding: 12px 17px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: .2s
}

.primary {
    background: var(--blue);
    color: white;
    box-shadow: 0 8px 18px #2874f026
}

.primary:hover {
    transform: translateY(-2px);
    background: #155ed8
}

.secondary {
    background: #fff;
    border: 1px solid var(--line);
    color: var(--ink)
}

.secondary:hover {
    border-color: var(--blue);
    color: var(--blue)
}

.cartbtn {
    background: var(--navy);
    color: #fff;
    border-radius: 12px;
    padding: 11px 14px;
    font-weight: 700
}

.hero {
    padding: 52px 0 34px
}

.hero-grid {
    display: grid;
    grid-template-columns: 1.05fr .95fr;
    gap: 34px;
    align-items: center
}

.eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #e5f1ff;
    color: #2467c9;
    border-radius: 99px;
    padding: 8px 12px;
    font-weight: 700;
    font-size: 12px
}

.hero h1 {
    font: 800 clamp(38px, 5vw, 62px)/1.06 Manrope;
    letter-spacing: -2.5px;
    margin: 19px 0 16px;
    color: var(--navy)
}

.hero h1 span {
    color: var(--blue)
}

.hero p {
    font-size: 17px;
    line-height: 1.7;
    color: #66758b;
    max-width: 540px
}

.hero-actions {
    display: flex;
    gap: 12px;
    margin-top: 25px;
    flex-wrap: wrap
}

.hero-stats {
    display: flex;
    gap: 25px;
    margin-top: 30px
}

.stat strong {
    display: block;
    font: 800 20px Manrope;
    color: var(--navy)
}

.stat span {
    font-size: 12px;
    color: var(--muted)
}

.hero-art {
    min-height: 400px;
    border-radius: 34px;
    background: linear-gradient(140deg, #dff7ff, #eae8ff 58%, #fff0e8);
    position: relative;
    overflow: hidden;
    padding: 20px;
    display: grid;
    place-items: center
}

.hero-art:before,
.hero-art:after {
    content: '';
    position: absolute;
    border-radius: 50%;
    background: #ffffff77
}

.hero-art:before {
    width: 270px;
    height: 270px;
    top: -80px;
    right: -60px
}

.hero-art:after {
    width: 190px;
    height: 190px;
    bottom: -80px;
    left: -40px
}

.hero-product {
    width: min(72%, 350px);
    position: relative;
    z-index: 2;
    transform: rotateY(-12deg) rotateX(4deg);
    filter: drop-shadow(0 25px 20px #304a6b2c);
    animation: float 5s ease-in-out infinite
}

.float-card {
    position: absolute;
    z-index: 3;
    background: #fff;
    border: 1px solid #ffffffbd;
    box-shadow: var(--shadow);
    border-radius: 16px;
    padding: 12px 15px;
    font-weight: 700;
    font-size: 13px
}

.float-card small {
    display: block;
    color: var(--muted);
    font-weight: 500;
    margin-top: 3px
}

.fc1 {
    top: 35px;
    left: 22px
}

.fc2 {
    right: 20px;
    bottom: 35px
}

.section {
    padding: 34px 0 48px
}

.sectionhead {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 22px
}

.sectionhead h2 {
    font: 800 clamp(25px, 3vw, 34px) Manrope;
    letter-spacing: -1px;
    margin: 0;
    color: var(--navy)
}

.sectionhead p {
    color: var(--muted);
    margin: 7px 0 0
}

.textlink {
    color: var(--blue);
    font-weight: 700
}

.category-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px
}

.category {
    border-radius: 20px;
    padding: 18px;
    background: #fff;
    border: 1px solid var(--line);
    display: flex;
    align-items: center;
    gap: 14px;
    transition: .25s;
    cursor: pointer
}

.category:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow);
    border-color: #bcd5ff
}

.category img {
    width: 65px;
    height: 65px;
    object-fit: contain;
    border-radius: 15px;
    background: #f4f8ff
}

.category strong {
    display: block;
    font-size: 14px
}

.category small {
    display: block;
    color: var(--muted);
    margin-top: 5px
}

.product-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px
}

.product-card {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 12px;
    position: relative;
    transition: transform .25s, box-shadow .25s;
    transform-style: preserve-3d;
    perspective: 1000px
}

.product-card:hover {
    transform: translateY(-6px) rotateX(2deg) rotateY(-2deg);
    box-shadow: 0 20px 40px #163d701b
}

.product-image-wrap {
    background: linear-gradient(145deg, #f0f7ff, #fff2ed);
    border-radius: 15px;
    overflow: hidden;
    position: relative;
    cursor: pointer
}

.product-image {
    display: block;
    width: 100%;
    aspect-ratio: 1.13;
    object-fit: contain;
    transition: transform .5s;
    transform-style: preserve-3d
}

.product-card:hover .product-image {
    transform: scale(1.045) rotateY(-5deg)
}

.tag {
    position: absolute;
    top: 10px;
    left: 10px;
    background: #fff;
    border-radius: 99px;
    padding: 6px 9px;
    font-size: 10px;
    font-weight: 800;
    color: #356
}

.heart {
    position: absolute;
    top: 9px;
    right: 9px;
    background: #fff;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    font-size: 17px;
    box-shadow: 0 3px 10px #2342
}

.product-name {
    font-weight: 800;
    margin: 12px 2px 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis
}

.product-category {
    font-size: 11px;
    color: var(--muted)
}

.rating {
    font-size: 12px;
    color: #9a6a0b;
    margin: 7px 2px
}

.price-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 7px 2px
}

.price {
    font-weight: 800;
    font-size: 20px;
    color: var(--navy)
}

.oldprice {
    font-size: 12px;
    color: #99a3b4;
    text-decoration: line-through
}

.discount {
    font-size: 11px;
    font-weight: 800;
    color: #0d956c
}

.sellerline {
    font-size: 11px;
    color: var(--muted);
    margin: 8px 2px
}

.card-actions {
    display: flex;
    gap: 7px;
    margin-top: 11px
}

.card-actions button {
    flex: 1;
    padding: 10px 6px;
    font-size: 12px;
    border-radius: 10px
}

.addbtn {
    background: #e8f1ff;
    color: #215fbe;
    font-weight: 800
}

.viewbtn {
    background: var(--navy);
    color: #fff;
    font-weight: 800
}

.deals {
    border-radius: 28px;
    background: linear-gradient(110deg, #172846, #254f89);
    padding: 28px;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    overflow: hidden;
    position: relative
}

.deals:after {
    content: '☾';
    font-size: 210px;
    position: absolute;
    right: 18%;
    top: -80px;
    color: #ffffff0c
}

.deals h2 {
    font: 800 30px Manrope;
    margin: 0
}

.deals p {
    color: #d4e5ff
}

.deal-clock {
    display: flex;
    gap: 9px
}

.timebox {
    background: #ffffff1b;
    border: 1px solid #ffffff2b;
    border-radius: 12px;
    padding: 12px;
    min-width: 55px;
    text-align: center;
    font-weight: 800
}

.timebox small {
    display: block;
    font-size: 9px;
    font-weight: 500;
    color: #c9dbf4
}

.campus-band {
    background: #e8f7ff;
    border-radius: 24px;
    padding: 25px;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: center
}

.campus-band h3 {
    font: 800 23px Manrope;
    margin: 0
}

.campus-band p {
    color: #60738b;
    margin: 7px 0 0
}

.footer {
    background: #101e35;
    color: #dce7f6;
    margin-top: 45px;
    padding: 42px 0 20px
}

.footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 35px
}

.footer h3 {
    color: white
}

.footer p,
.footer a {
    color: #b8c7dc;
    font-size: 13px;
    line-height: 1.8
}

.footerlinks {
    display: grid;
    gap: 6px
}

.copyright {
    border-top: 1px solid #ffffff20;
    margin-top: 28px;
    padding-top: 17px;
    font-size: 12px;
    color: #91a4bf
}

.page-title {
    padding: 35px 0 20px
}

.page-title h1 {
    font: 800 36px Manrope;
    margin: 0;
    color: var(--navy)
}

.filters {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin: 15px 0 24px
}

.filters input,
.filters select {
    border: 1px solid var(--line);
    border-radius: 12px;
    background: white;
    padding: 11px 13px
}

.detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 35px;
    padding: 35px 0
}

.detail-visual {
    background: linear-gradient(145deg, #dff7ff, #f3edff, #fff1e8);
    border-radius: 28px;
    position: relative;
    padding: 30px;
    display: grid;
    place-items: center;
    min-height: 400px;
    perspective: 1100px;
    overflow: hidden
}

.detail-visual img {
    width: min(100%, 480px);
    max-height: 430px;
    object-fit: contain;
    transition: transform .35s;
    transform-style: preserve-3d;
    filter: drop-shadow(0 25px 20px #263a5b25)
}

.rotate-controls {
    position: absolute;
    bottom: 17px;
    display: flex;
    gap: 8px
}

.rotate-controls button {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 9px 12px;
    font-weight: 700
}

.detail-info h1 {
    font: 800 35px Manrope;
    line-height: 1.15;
    margin: 12px 0
}

.detail-info .price {
    font-size: 30px
}

.detail-info p {
    color: #65748b;
    line-height: 1.8
}

.specs {
    border-top: 1px solid var(--line);
    margin-top: 22px
}

.specrow {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    padding: 12px 0;
    border-bottom: 1px solid var(--line);
    font-size: 13px
}

.specrow span:first-child {
    color: var(--muted)
}

.detail-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    flex-wrap: wrap
}

.cart-layout {
    display: grid;
    grid-template-columns: 1.5fr .8fr;
    gap: 24px
}

.cart-item {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 17px;
    padding: 14px;
    display: flex;
    gap: 15px;
    align-items: center;
    margin-bottom: 12px
}

.cart-item img {
    width: 100px;
    height: 95px;
    object-fit: contain;
    border-radius: 12px;
    background: #f3f7ff
}

.cart-item-info {
    flex: 1
}

.qty {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px
}

.qty button {
    background: #eaf2ff;
    border-radius: 7px;
    width: 27px;
    height: 27px
}

.summary {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 22px;
    height: max-content
}

.summary h3 {
    margin-top: 0
}

.sumrow {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    color: #64738a
}

.sumtotal {
    border-top: 1px solid var(--line);
    font-size: 20px;
    font-weight: 800;
    color: var(--navy)
}

.formcard {
    max-width: 760px;
    margin: 20px auto;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 22px;
    padding: 25px
}

.formgrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px
}

.field {
    display: grid;
    gap: 7px;
    margin-bottom: 14px
}

.field label {
    font-weight: 700;
    font-size: 13px
}

.field input,
.field textarea,
.field select {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 11px;
    padding: 12px;
    outline: none
}

.field textarea {
    min-height: 100px;
    resize: vertical
}

.empty {
    padding: 50px;
    text-align: center;
    color: var(--muted);
    background: #fff;
    border-radius: 20px
}

.loading-screen {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #f6f9ff;
    display: grid;
    place-items: center;
    transition: opacity .35s, visibility .35s
}

.loading-screen.hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none
}

.moon {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: #e9f1ff;
    box-shadow: 0 0 0 12px #2874f012, 0 0 60px #2874f045;
    position: relative;
    animation: moonPulse 1.6s ease-in-out infinite
}

.moon:after {
    content: '';
    position: absolute;
    width: 84px;
    height: 84px;
    top: -7px;
    left: 24px;
    background: #f6f9ff;
    border-radius: 50%
}

.loader-label {
    margin-top: 25px;
    text-align: center;
    color: #55709a;
    font-weight: 700;
    letter-spacing: 1px;
    font-size: 12px
}

@keyframes moonPulse {
    50% {
        transform: scale(1.07);
        box-shadow: 0 0 0 19px #2874f00a, 0 0 75px #2874f05c
    }
}

@keyframes float {
    50% {
        transform: translateY(-10px) rotateY(-8deg) rotateX(4deg)
    }
}

@media(max-width:980px) {
    .navinner {
        flex-wrap: wrap;
        padding: 12px 0
    }

    .navlinks {
        order: 3;
        width: 100%;
        justify-content: center;
        gap: 16px;
        flex-wrap: wrap
    }

    .navactions {
        margin-left: auto
    }

    .search {
        width: 150px
    }

    .hero-grid {
        grid-template-columns: 1fr 1fr
    }

    .category-grid {
        grid-template-columns: repeat(2, 1fr)
    }

    .product-grid {
        grid-template-columns: repeat(3, 1fr)
    }
}

@media(max-width:700px) {
    .navinner {
        gap: 10px
    }

    .logo {
        font-size: 22px
    }

    .navlinks {
        font-size: 12px;
        gap: 12px
    }

    .navactions .search {
        display: none
    }

    .hero {
        padding-top: 28px
    }

    .hero-grid,
    .detail-grid,
    .cart-layout {
        grid-template-columns: 1fr
    }

    .hero-art {
        min-height: 310px
    }

    .hero-stats {
        gap: 16px
    }

    .product-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px
    }

    .product-card {
        padding: 8px;
        border-radius: 16px
    }

    .product-name {
        font-size: 13px
    }

    .card-actions {
        flex-direction: column
    }

    .card-actions button {
        padding: 9px
    }

    .deals {
        align-items: flex-start;
        flex-direction: column
    }

    .deal-clock {
        gap: 6px
    }

    .timebox {
        min-width: 47px;
        padding: 9px
    }

    .campus-band {
        align-items: flex-start;
        flex-direction: column
    }

    .footer-grid {
        grid-template-columns: 1fr
    }

    .detail-visual {
        min-height: 310px
    }

    .detail-info h1 {
        font-size: 29px
    }

    .formgrid {
        grid-template-columns: 1fr
    }

    .cart-item {
        align-items: flex-start
    }

    .cart-item img {
        width: 75px;
        height: 75px
    }

    .section {
        padding: 25px 0 35px
    }

    .sectionhead {
        align-items: flex-start;
        flex-direction: column
    }

    .category {
        padding: 12px;
        gap: 10px
    }

    .category img {
        width: 48px;
        height: 48px
    }

    .category strong {
        font-size: 12px
    }
}

@media(prefers-reduced-motion:reduce) {

    *,
    *:before,
    *:after {
        animation-duration: .01ms !important;
        transition-duration: .01ms !important;
        scroll-behavior: auto !important
    }
}


/* EasyBuy side navigation and connected features — inherits the original theme */
.eb-menu-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--line);
    background: #fff;
    color: var(--navy);
    border-radius: 11px;
    padding: 10px 12px;
    font-weight: 800;
    cursor: pointer;
    white-space: nowrap
}

.eb-menu-toggle:hover {
    border-color: #bcd5ff;
    background: #f4f8ff
}

.eb-menu-label {
    font-size: 12px
}

.eb-side-overlay {
    position: fixed;
    inset: 0;
    z-index: 10020;
    background: #0d1c34a8;
    opacity: 0;
    visibility: hidden;
    transition: opacity .22s, visibility .22s
}

.eb-side-overlay.open {
    opacity: 1;
    visibility: visible
}

.eb-sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: min(340px, 88vw);
    overflow: auto;
    background: #fff;
    padding: 20px 16px;
    box-shadow: 15px 0 50px #10234225;
    transform: translateX(-102%);
    transition: transform .25s
}

.eb-side-overlay.open .eb-sidebar {
    transform: translateX(0)
}

.eb-side-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 4px 18px;
    border-bottom: 1px solid var(--line)
}

.eb-side-head .logo {
    color: var(--navy);
    font-size: 25px
}

.eb-side-close {
    width: 35px;
    height: 35px;
    border-radius: 10px;
    background: #f1f5fb;
    color: var(--navy);
    font-size: 25px;
    cursor: pointer
}

.eb-side-caption {
    font-size: 10px;
    letter-spacing: 1.2px;
    color: #8190a5;
    font-weight: 900;
    margin: 20px 8px 8px
}

.eb-side-categories,
.eb-side-tools {
    display: grid;
    gap: 3px
}

.eb-side-categories a,
.eb-side-tools a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 10px;
    border-radius: 10px;
    color: var(--navy);
    font-weight: 700;
    font-size: 13px
}

.eb-side-categories a:hover,
.eb-side-tools a:hover {
    background: #edf5ff;
    color: #1e63c7
}

.eb-side-categories a>span:first-child {
    width: 24px;
    text-align: center;
    font-size: 17px
}

.eb-side-arrow {
    margin-left: auto;
    color: #98a6ba;
    font-size: 20px
}

.eb-side-tools a>span {
    flex: 1
}

.eb-side-note {
    background: #f2f7ff;
    color: #64748b;
    border-radius: 12px;
    padding: 12px;
    font-size: 11px;
    line-height: 1.6;
    margin-top: 20px
}

.eb-menu-open {
    overflow: hidden
}

.eb-feature-grid {
    display: grid;
    grid-template-columns: minmax(280px, .8fr) minmax(0, 1.2fr);
    gap: 20px;
    margin-bottom: 22px
}

.eb-panel {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 22px;
    margin-bottom: 20px;
    box-shadow: 0 6px 25px #1d3b6508
}

.eb-panel h2 {
    font: 800 21px Manrope;
    margin: 0 0 10px;
    color: var(--navy)
}

.eb-panel h3 {
    color: var(--navy)
}

.eb-panel .field {
    margin: 15px 0
}

.eb-panel .field label {
    display: block
}

.eb-panel input,
.eb-panel select {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 11px;
    padding: 12px;
    background: #fff;
    color: var(--navy);
    font: inherit
}

.eb-action-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 14px
}

.eb-action-row .primary,
.eb-action-row .secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    padding: 12px 15px;
    text-decoration: none;
    font-weight: 800;
    font-size: 13px;
    cursor: pointer
}

.eb-action-row .secondary {
    border: 1px solid var(--line);
    background: #fff;
    color: var(--navy)
}

.eb-help {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.6
}

.eb-map-panel iframe {
    display: none;
    width: 100%;
    height: 350px;
    border: 0;
    border-radius: 14px;
    background: #f0f5fc
}

.eb-map-placeholder {
    height: 350px;
    border-radius: 14px;
    background: linear-gradient(140deg, #eaf5ff, #f4f0ff);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 15px
}

.eb-map-pin {
    font-size: 45px
}

.eb-map-placeholder h3 {
    margin: 10px 0 4px
}

.eb-map-placeholder p {
    color: var(--muted);
    font-size: 13px
}

.eb-college-list {
    margin-top: 6px
}

.eb-college-chips {
    display: flex;
    gap: 9px;
    flex-wrap: wrap;
    margin-top: 15px
}

.eb-college-chip {
    border: 1px solid var(--line);
    border-radius: 999px;
    background: #f7faff;
    color: var(--navy);
    padding: 9px 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer
}

.eb-college-chip:hover {
    background: #e6f0ff;
    border-color: #bcd5ff
}

.eb-tracking-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    flex-wrap: wrap
}

.eb-tracking-top h2 {
    margin-bottom: 4px
}

.eb-order-card {
    display: flex;
    gap: 15px;
    padding: 18px 0;
    border-top: 1px solid var(--line)
}

.eb-order-icon {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    background: #edf5ff;
    border-radius: 14px;
    font-size: 22px
}

.eb-order-info {
    flex: 1;
    min-width: 0
}

.eb-order-info p {
    font-size: 13px;
    line-height: 1.6;
    color: #61718a
}

.eb-order-line {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap
}

.eb-status {
    font-size: 11px;
    background: #eaf8f1;
    color: #12805c;
    border-radius: 99px;
    padding: 5px 9px;
    font-weight: 800
}

.eb-progress {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
    margin: 14px 0
}

.eb-progress span {
    font-size: 10px;
    color: #8b98aa;
    background: #f0f3f8;
    border-radius: 99px;
    padding: 7px 9px
}

.eb-progress span.done {
    color: #087f5b;
    background: #e4f7ee
}

.eb-track-help {
    background: #f3f8ff
}

.eb-empty {
    text-align: center;
    padding: 35px 15px
}

.eb-empty>div {
    font-size: 42px
}

.eb-empty p {
    color: var(--muted);
    font-size: 13px
}

.eb-wiki-search {
    display: flex;
    gap: 10px;
    margin-top: 12px
}

.eb-wiki-search input {
    flex: 1
}

.eb-wiki-search button {
    white-space: nowrap
}

.eb-wiki-results {
    display: grid;
    gap: 12px;
    margin-top: 18px
}

.eb-wiki-card {
    display: flex;
    gap: 16px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 16px
}

.eb-wiki-card img {
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: 12px;
    background: #f0f5fb
}

.eb-wiki-card h3 {
    margin: 0 0 7px;
    font-size: 17px
}

.eb-wiki-card h3 a {
    color: var(--navy)
}

.eb-wiki-card p {
    font-size: 13px;
    color: #62728a;
    line-height: 1.65;
    margin: 0 0 8px
}

.eb-wiki-card .textlink {
    font-size: 12px
}

@media(max-width:850px) {
    .eb-feature-grid {
        grid-template-columns: 1fr
    }

    .eb-map-panel iframe,
    .eb-map-placeholder {
        height: 300px
    }

    .eb-menu-label {
        display: none
    }

    .eb-menu-toggle {
        padding: 10px
    }

    .eb-menu-toggle span:first-child {
        font-size: 18px
    }
}

@media(max-width:560px) {
    .eb-panel {
        padding: 16px;
        border-radius: 16px
    }

    .eb-wiki-search {
        flex-direction: column
    }

    .eb-wiki-card {
        padding: 12px;
        gap: 10px
    }

    .eb-wiki-card img {
        width: 72px;
        height: 72px
    }

    .eb-wiki-card h3 {
        font-size: 14px
    }

    .eb-order-card {
        gap: 10px
    }

    .eb-order-icon {
        width: 38px;
        height: 38px
    }

    .eb-action-row>* {
        flex: 1
    }

    .eb-map-panel iframe,
    .eb-map-placeholder {
        height: 250px
    }
}


/* EasyBuy account pages — matching the existing blue/white theme */
#ebAccountLinks {
    display: grid;
    gap: 4px;
    padding: 8px 0;
    border-top: 1px solid var(--line);
    margin-top: 8px
}

#ebAccountLinks a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 13px;
    border-radius: 12px;
    color: var(--ink);
    font-weight: 600;
    font-size: 14px
}

#ebAccountLinks a:hover {
    background: #eaf2ff;
    color: var(--blue)
}

.eb-auth-wrap {
    min-height: 62vh;
    padding: 46px 16px 70px;
    display: grid;
    place-items: center;
    background: radial-gradient(ellipse at top left, #e1f2ff 0, transparent 48%), var(--paper)
}

.eb-auth-card {
    width: min(100%, 490px);
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 25px;
    padding: clamp(24px, 5vw, 42px);
    box-shadow: 0 22px 70px #173b6812
}

.eb-auth-logo {
    display: inline-block;
    margin-bottom: 28px
}

.eb-auth-kicker {
    color: var(--blue);
    font-size: 11px;
    letter-spacing: 1.6px;
    font-weight: 800
}

.eb-auth-card h1 {
    font: 800 clamp(28px, 4vw, 36px)/1.15 Manrope;
    color: var(--navy);
    letter-spacing: -1px;
    margin: 9px 0 10px
}

.eb-auth-sub {
    color: var(--muted);
    font-size: 14px;
    line-height: 1.65;
    margin: 0 0 22px
}

.eb-auth-form {
    display: grid;
    gap: 16px
}

.eb-auth-form label {
    display: grid;
    gap: 7px;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink)
}

.eb-auth-form input {
    width: 100%;
    min-width: 0;
    padding: 13px 14px;
    border: 1px solid #dbe5f2;
    border-radius: 12px;
    background: #fbfdff;
    outline: none;
    color: var(--ink)
}

.eb-auth-form input:focus {
    border-color: var(--blue);
    box-shadow: 0 0 0 3px #2874f018
}

.eb-auth-form .primary {
    width: 100%;
    margin-top: 4px
}

.eb-auth-hint {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.55;
    margin: 0
}

.eb-auth-switch {
    text-align: center;
    font-size: 13px;
    color: var(--muted);
    margin: 21px 0 16px
}

.eb-auth-switch a,
.eb-auth-back {
    color: var(--blue);
    font-weight: 700
}

.eb-auth-back {
    display: inline-block;
    font-size: 13px;
    margin-top: 10px
}

.eb-auth-message {
    display: none;
    border-radius: 11px;
    padding: 10px 12px;
    margin: 0 0 13px;
    font-size: 13px;
    line-height: 1.5
}

.eb-auth-message:not(:empty) {
    display: block
}

.eb-auth-message.error {
    color: #9d2424;
    background: #fff0f0
}

.eb-auth-message.success {
    color: #146c43;
    background: #e9f9f0
}

.eb-profile {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 17px;
    background: #f5f8ff;
    border: 1px solid var(--line);
    border-radius: 17px;
    margin: 22px 0
}

.eb-profile-avatar {
    width: 58px;
    height: 58px;
    flex: 0 0 58px;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #2874f0, #65b5ff);
    color: white;
    border-radius: 18px;
    font: 800 25px Manrope
}

.eb-profile h2 {
    font: 800 20px Manrope;
    color: var(--navy);
    margin: 0 0 5px;
    overflow-wrap: anywhere
}

.eb-profile p {
    font-size: 13px;
    color: var(--muted);
    margin: 0;
    overflow-wrap: anywhere
}

.eb-profile-details {
    display: grid;
    gap: 10px;
    margin: 18px 0 23px
}

.eb-profile-details>div {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid var(--line);
    font-size: 13px
}

.eb-profile-details span {
    color: var(--muted)
}

.eb-profile-details strong {
    text-align: right;
    overflow-wrap: anywhere
}

.eb-auth-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap
}

.eb-auth-actions>* {
    flex: 1
}

.eb-sell-notice {
    padding: 12px 14px;
    margin-top: 15px;
    background: #e9f9f0;
    border: 1px solid #c8efda;
    color: #146c43;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 700
}

@media(max-width:600px) {
    .eb-auth-wrap {
        padding: 26px 12px 45px
    }

    .eb-auth-card {
        border-radius: 19px
    }

    .eb-auth-actions {
        display: grid
    }

    .eb-profile-details>div {
        align-items: flex-start;
        flex-direction: column;
        gap: 4px
    }

    .eb-profile-details strong {
        text-align: left
    }
}

/* EasyBuy login gate, page-transition loader, and animated cart */
html.eb-auth-pending body> :not(#loading) {
    visibility: hidden !important
}

html.eb-auth-pending #loading {
    visibility: visible !important;
    opacity: 1 !important
}

body.eb-guest-mode .topline,
body.eb-guest-mode .navbar,
body.eb-guest-mode .footer {
    display: none !important
}

body.eb-guest-mode #app {
    min-height: 100vh;
    display: grid;
    align-items: center
}

.eb-loader-scene {
    width: 220px;
    height: 125px;
    margin: auto;
    position: relative;
    overflow: hidden
}

.eb-loader-moon {
    position: absolute;
    left: 12px;
    top: 10px;
    width: 47px;
    height: 47px;
    border-radius: 50%;
    background: #e5efff;
    box-shadow: 0 0 0 9px #2874f014, 0 0 28px #2874f044;
    animation: ebMoonGlow 1.5s ease-in-out infinite
}

.eb-loader-moon:after {
    content: "";
    position: absolute;
    width: 44px;
    height: 44px;
    left: 13px;
    top: -5px;
    background: #f6f9ff;
    border-radius: 50%
}

.eb-loader-flower {
    position: absolute;
    right: 25px;
    top: 0;
    color: #ff91b6;
    font-size: 34px;
    transform-origin: center;
    animation: ebFlowerSpin 3s linear infinite
}

.eb-loader-track {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 23px;
    height: 3px;
    background: #dce8fb;
    border-radius: 8px
}

.eb-running-basket {
    position: absolute;
    left: 0;
    top: -29px;
    font-size: 27px;
    filter: drop-shadow(0 4px 3px #15386b22);
    animation: ebBasketRun 1.25s ease-in-out infinite alternate
}

.loader-label {
    margin-top: 10px
}

@keyframes ebBasketRun {
    from {
        left: 0;
        transform: translateY(0) rotate(-8deg)
    }

    to {
        left: calc(100% - 31px);
        transform: translateY(-5px) rotate(8deg)
    }
}

@keyframes ebFlowerSpin {
    to {
        transform: rotate(360deg)
    }
}

@keyframes ebMoonGlow {
    50% {
        transform: scale(1.08);
        box-shadow: 0 0 0 14px #2874f00b, 0 0 42px #2874f066
    }
}

.eb-add-cart-icon {
    display: inline-block;
    margin-right: 5px;
    transform-origin: 50% 85%
}

.eb-cart-added .eb-add-cart-icon {
    animation: ebAddToBasket .55s ease
}

.eb-cart-icon {
    display: inline-block;
    transform-origin: 50% 80%
}

.eb-cart-bounce {
    animation: ebCartBounce .55s ease
}

@keyframes ebAddToBasket {
    0% {
        transform: translateY(-9px) rotate(-15deg) scale(.85)
    }

    55% {
        transform: translateY(2px) rotate(12deg) scale(1.18)
    }

    100% {
        transform: translateY(0) rotate(0) scale(1)
    }
}

@keyframes ebCartBounce {

    0%,
    100% {
        transform: translateY(0) rotate(0)
    }

    35% {
        transform: translateY(-7px) rotate(-12deg)
    }

    70% {
        transform: translateY(1px) rotate(8deg)
    }
}

@media(prefers-reduced-motion:reduce) {

    .eb-loader-moon,
    .eb-loader-flower,
    .eb-running-basket,
    .eb-cart-added .eb-add-cart-icon,
    .eb-cart-bounce {
        animation: none !important
    }
}

/* Signup confirmation field and reliable product artwork */
.eb-auth-form input[type="password"] {
    letter-spacing: .02em
}

.eb-auth-form input:invalid:not(:placeholder-shown) {
    border-color: #e49b9b
}

.product-image-wrap {
    min-height: 190px;
    background: linear-gradient(145deg, #f2f7ff, #fff9f4)
}

.product-image {
    object-fit: contain;
    object-position: center;
    padding: 8px;
    box-sizing: border-box
}

.hero-product,
.detail-product {
    object-fit: contain
}

#ebMenuToggle {
    box-shadow: 0 5px 18px #1c4b8c12
}

.eb-side-categories a {
    min-height: 42px
}

@media(max-width:600px) {
    .eb-side-categories a {
        padding: 12px 10px
    }

    .product-image-wrap {
        min-height: 150px
    }
}


/* Wishlist interaction: keep the heart above the image and independently clickable. */
.product-image-wrap { cursor: default !important; }
.product-image-wrap .heart { z-index: 10 !important; position: absolute; pointer-events: auto; cursor: pointer; }
.product-image-wrap .product-image { pointer-events: none; }

/* Order page: polished return request and purchase feedback cards only. */
.page-title section.eb-panel:has(#ebReturnForm),
.page-title section.eb-panel:has(.ebFeedbackForm) {
  box-sizing: border-box;
  padding: clamp(20px, 3vw, 30px);
  margin: 24px 0 !important;
  border: 1px solid #e4e9f5;
  border-radius: 22px;
  background: linear-gradient(145deg, #ffffff 0%, #fbfcff 100%);
  box-shadow: 0 12px 32px rgba(30, 55, 105, .07);
}
.page-title section.eb-panel:has(#ebReturnForm) h2,
.page-title section.eb-panel:has(.ebFeedbackForm) h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
  color: #17336c;
  font-size: clamp(21px, 2vw, 27px);
  line-height: 1.3;
  letter-spacing: -.45px;
}
.page-title section.eb-panel:has(#ebReturnForm) h2:before { content: "↩"; display:grid; place-items:center; width:40px; height:40px; flex:0 0 40px; border-radius:13px; background:#eaf1ff; color:#2458d7; font-size:22px; }
.page-title section.eb-panel:has(.ebFeedbackForm) h2:before { content: "★"; display:grid; place-items:center; width:40px; height:40px; flex:0 0 40px; border-radius:13px; background:#fff5d9; color:#c98208; font-size:22px; }
.page-title section.eb-panel:has(#ebReturnForm) > p,
.page-title section.eb-panel:has(.ebFeedbackForm) > p { color:#5c6780; line-height:1.65; }
#ebReturnForm, .ebFeedbackForm { display:grid; gap:14px; margin-top:18px; }
#ebReturnForm label, .ebFeedbackForm label { display:grid; gap:8px; color:#263858; font-weight:700; font-size:14px; }
#ebReturnForm textarea, .ebFeedbackForm textarea,
.ebFeedbackForm select { box-sizing:border-box; width:100%; min-width:0; padding:13px 15px; border:1px solid #dce3f1; border-radius:12px; background:#fff; color:#202d48; font:inherit; line-height:1.5; outline:none; transition:border-color .18s, box-shadow .18s; }
#ebReturnForm textarea, .ebFeedbackForm textarea { min-height:105px; resize:vertical; }
#ebReturnForm textarea:focus, .ebFeedbackForm textarea:focus, .ebFeedbackForm select:focus { border-color:#4777ed; box-shadow:0 0 0 4px rgba(55,102,224,.12); }
#ebReturnForm button, .ebFeedbackForm button { justify-self:start; min-height:46px; padding:12px 20px; border:0; border-radius:12px; background:#285bd8; color:#fff; font-weight:750; cursor:pointer; box-shadow:0 7px 16px rgba(40,91,216,.17); }
#ebReturnForm button:hover, .ebFeedbackForm button:hover { background:#1949bf; transform:translateY(-1px); }
#ebReturnNotice, #ebFeedbackNotice { padding:0; margin:0; color:#2354c5; font-weight:650; }
.ebFeedbackForm { padding:18px 0 !important; border-top:1px solid #e8edf6 !important; }
.ebFeedbackForm > strong { color:#202f50; font-size:17px; margin-bottom:2px; }
.ebFeedbackForm > p { margin:0; padding:12px 14px; border-radius:12px; background:#f4f7ff; color:#34466c; line-height:1.7; }
.ebFeedbackForm > p:first-letter { color:#e7a323; }
@media (min-width:700px) { #ebReturnForm textarea { max-width:100%; } .ebFeedbackForm { grid-template-columns:1fr; } }
@media (max-width:520px) { .page-title section.eb-panel:has(#ebReturnForm), .page-title section.eb-panel:has(.ebFeedbackForm) { padding:18px; border-radius:17px; } #ebReturnForm button, .ebFeedbackForm button { width:100%; justify-self:stretch; } }</style>
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
