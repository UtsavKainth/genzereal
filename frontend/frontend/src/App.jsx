import React, { useState, useEffect, useRef } from "react";

import {
  Heart,
  ShoppingBag,
  User,
  X,
  Search,
  Menu,
  Star,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Plus,
  Minus,
  Flame,
  AtSign,
  MessageCircle,
  Play,
  Mail,
  Sparkles,
  ArrowRight,
  Check,
  Upload,
  Image as ImageIcon,
  Truck,
} from "lucide-react";
import {
  authApi,
  wishlistApi,
  orderApi,
  productApi,
  saveSession,
  clearSession,
  getToken,
} from "./api";

import ProductReviews from "./components/ProductReviews";
import CheckoutModal from "./components/CheckoutModal";
import MyOrdersModal from "./components/MyOrdersModal";
import AdminDashboard from "./admin/AdminDashboard";
/* ---------------------------------- DATA ---------------------------------- */

/* Only this email unlocks the Admin panel (Navbar "Admin" button + image
   editor). Change it to your own email to become the admin. */
const ADMIN_EMAIL = "ukainth6@gmail.com";

const CATEGORIES = ["All", "Streetwear", "Outerwear", "Bottoms", ];

const GRADIENTS = [
  "linear-gradient(135deg,#FF2E8C,#8657FF)",
  "linear-gradient(135deg,#8657FF,#3A2E6B)",
  "linear-gradient(135deg,#FFC93F,#FF2E8C)",
  "linear-gradient(135deg,#2E2340,#8657FF)",
  "linear-gradient(135deg,#FF2E8C,#FFC93F)",
  "linear-gradient(135deg,#3A2E6B,#FF2E8C)",
];

/* HOW TO SWAP IN YOUR OWN PHOTOS:
   Each product below has an `images` array — just plain strings, one URL
   per photo (front / back / detail, etc). To use your own picture:
     1) In Chrome, right-click any image on the web -> "Copy image address"
     2) Paste that link directly in place of one of the strings below
   OR, from the live Admin panel, you can now upload a photo straight from
   your laptop's file system OR (on mobile) your phone's gallery/camera —
   no link needed.
   `img` (used everywhere else in the app — cards, cart, wishlist) is just
   images[0], so it updates automatically. If a URL is missing or fails to
   load, the card falls back to the gradient + mark placeholder, so nothing
   ever breaks. */
const PRODUCTS = [
  {
    id: 1, name: "Static Wash Oversized Tee", cat: "Streetwear", price: 1299, mrp: 1799, tag: "SALE", rating: 4.8, g: 0, mark: "ST",
    images: [
      "https://i.pinimg.com/1200x/31/3a/b8/313ab84695687da9adb56a9f438e5df0.jpg",
      "https://i.pinimg.com/736x/a6/9d/f1/a69df1d1517f49a933e40dec34781406.jpg",
      "https://i.pinimg.com/736x/9e/1e/05/9e1e0515ead911c619527d02aaa16c2b.jpg",
      "https://i.pinimg.com/736x/5f/f8/d9/5ff8d97347a89db688049b4a1c8c8768.jpg",
    ],
    desc: "Relaxed drape, acid-washed cotton jersey with a boxy oversized cut for that lived-in look."
  },
  {
    id: 2, name: "Chrome Cargo Pants", cat: "Bottoms", price: 2199, mrp: null, tag: "NEW", rating: 4.6, g: 1, mark: "CG",
    images: [
      "https://picsum.photos/seed/CG2v0/600/750",
      "https://picsum.photos/seed/CG2v1/600/750",
      "https://picsum.photos/seed/CG2v2/600/750",
    ],
    desc: "Multi-pocket cargo silhouette in brushed chrome-effect nylon with adjustable ankle cuffs."
  },
  {
    id: 3, name: "Glitch Pullover Hoodie", cat: "Outerwear", price: 2799, mrp: 3499, tag: "SALE", rating: 4.9, g: 2, mark: "GH",
    images: [
      "https://picsum.photos/seed/GH3v0/600/750",
      "https://picsum.photos/seed/GH3v1/600/750",
      "https://picsum.photos/seed/GH3v2/600/750",
    ],
    desc: "Heavyweight fleece hoodie with a fractured glitch-print graphic and kangaroo pocket."
  },
  {
    id: 4, name: "Pixel Dot Beanie", cat: "Accessories", price: 599, mrp: null, tag: "NEW", rating: 4.5, g: 3, mark: "PD",
    images: [
      "https://picsum.photos/seed/PD4v0/600/750",
      "https://picsum.photos/seed/PD4v1/600/750",
      "https://picsum.photos/seed/PD4v2/600/750",
    ],
    desc: "Ribbed knit beanie finished with a pixel-dot jacquard pattern and fold cuff."
  },
  {
    id: 5, name: "Neon Static Crewneck", cat: "Streetwear", price: 1999, mrp: null, tag: null, rating: 4.7, g: 4, mark: "NS",
    images: [
      "https://picsum.photos/seed/NS5v0/600/750",
      "https://picsum.photos/seed/NS5v1/600/750",
      "https://picsum.photos/seed/NS5v2/600/750",
    ],
    desc: "Midweight crewneck with a neon static wash finish and dropped shoulders."
  },
  {
    id: 6, name: "Frame Rate Denim Jacket", cat: "Outerwear", price: 3299, mrp: null, tag: "NEW", rating: 4.8, g: 5, mark: "FR",
    images: [
      "https://picsum.photos/seed/FR6v0/600/750",
      "https://picsum.photos/seed/FR6v1/600/750",
      "https://picsum.photos/seed/FR6v2/600/750",
    ],
    desc: "Rigid denim trucker jacket with frame-rate stitch detailing across the yoke."
  },
  {
    id: 7, name: "Low Fidelity Joggers", cat: "Bottoms", price: 1699, mrp: null, tag: null, rating: 4.4, g: 1, mark: "LF",
    images: [
      "https://picsum.photos/seed/LF7v0/600/750",
      "https://picsum.photos/seed/LF7v1/600/750",
      "https://picsum.photos/seed/LF7v2/600/750",
    ],
    desc: "Tapered joggers in brushed-back fleece with elastic cuffs for an off-duty fit."
  },
  {
    id: 8, name: "Signal Loss Tote", cat: "Accessories", price: 899, mrp: null, tag: null, rating: 4.6, g: 2, mark: "SL",
    images: [
      "https://picsum.photos/seed/SL8v0/600/750",
      "https://picsum.photos/seed/SL8v1/600/750",
      "https://picsum.photos/seed/SL8v2/600/750",
    ],
    desc: "Durable canvas tote with a distressed signal-loss graphic and reinforced straps."
  },
  {
    id: 9, name: "Reboot Windbreaker", cat: "Outerwear", price: 2499, mrp: 2999, tag: "SALE", rating: 4.7, g: 0, mark: "RB",
    images: [
      "https://picsum.photos/seed/RB9v0/600/750",
      "https://picsum.photos/seed/RB9v1/600/750",
      "https://picsum.photos/seed/RB9v2/600/750",
    ],
    desc: "Packable windbreaker with taped seams and a reflective reboot logo hit."
  },
  {
    id: 10, name: "Static Bomber Jacket", cat: "Outerwear", price: 2999, mrp: 3599, tag: "SALE", rating: 4.7, g: 3, mark: "SB",
    images: [
      "https://picsum.photos/seed/SB10v0/600/750",
      "https://picsum.photos/seed/SB10v1/600/750",
      "https://picsum.photos/seed/SB10v2/600/750",
    ],
    desc: "Cropped bomber in ripstop nylon with ribbed cuffs and a hidden interior pocket."
  },
  {
    id: 11, name: "Riot Trench Coat", cat: "Outerwear", price: 4199, mrp: null, tag: "NEW", rating: 4.8, g: 5, mark: "RT",
    images: [
      "https://picsum.photos/seed/RT11v0/600/750",
      "https://picsum.photos/seed/RT11v1/600/750",
      "https://picsum.photos/seed/RT11v2/600/750",
    ],
    desc: "Longline trench with a storm flap and belted waist, cut for oversized layering."
  },
  {
    id: 12, name: "Blackout Parka", cat: "Outerwear", price: 4599, mrp: 5299, tag: "SALE", rating: 4.9, g: 1, mark: "BP",
    images: [
      "https://picsum.photos/seed/BP12v0/600/750",
      "https://picsum.photos/seed/BP12v1/600/750",
      "https://picsum.photos/seed/BP12v2/600/750",
    ],
    desc: "Insulated parka with a fur-trim hood and sealed seams for total blackout weather."
  },
  {
    id: 13, name: "Voltage Puffer Vest", cat: "Outerwear", price: 1899, mrp: null, tag: "NEW", rating: 4.5, g: 4, mark: "VP",
    images: [
      "https://picsum.photos/seed/VP13v0/600/750",
      "https://picsum.photos/seed/VP13v1/600/750",
      "https://picsum.photos/seed/VP13v2/600/750",
    ],
    desc: "Quilted puffer vest with a stand collar, built to layer over hoodies and tees."
  },
  {
    id: 14, name: "Zero Gravity Overshirt", cat: "Outerwear", price: 2299, mrp: null, tag: null, rating: 4.6, g: 0, mark: "ZG",
    images: [
      "https://picsum.photos/seed/ZG14v0/600/750",
      "https://picsum.photos/seed/ZG14v1/600/750",
      "https://picsum.photos/seed/ZG14v2/600/750",
    ],
    desc: "Boxy twill overshirt with dropped shoulders, worn open or buttoned to the collar."
  },
  {
    id: 15, name: "Midnight Varsity Jacket", cat: "Outerwear", price: 3799, mrp: 4299, tag: "SALE", rating: 4.7, g: 2, mark: "MV",
    images: [
      "https://picsum.photos/seed/MV15v0/600/750",
      "https://picsum.photos/seed/MV15v1/600/750",
      "https://picsum.photos/seed/MV15v2/600/750",
    ],
    desc: "Wool-blend varsity jacket with leather sleeves and a chenille chest patch."
  },
  {
    id: 16, name: "Ashwave Utility Jacket", cat: "Outerwear", price: 2699, mrp: null, tag: "NEW", rating: 4.6, g: 3, mark: "AU",
    images: [
      "https://picsum.photos/seed/AU16v0/600/750",
      "https://picsum.photos/seed/AU16v1/600/750",
      "https://picsum.photos/seed/AU16v2/600/750",
    ],
    desc: "Ash-grey utility jacket with a four-pocket front and adjustable waist tabs."
  },
  {
    id: 17, name: "Static Wash Denim", cat: "Bottoms", price: 2399, mrp: null, tag: "NEW", rating: 4.6, g: 5, mark: "SD",
    images: [
      "https://picsum.photos/seed/SD17v0/600/750",
      "https://picsum.photos/seed/SD17v1/600/750",
      "https://picsum.photos/seed/SD17v2/600/750",
    ],
    desc: "Straight-leg denim in an acid-static wash with a stacked ankle break."
  },
  {
    id: 18, name: "Vapor Track Pants", cat: "Bottoms", price: 1599, mrp: 1999, tag: "SALE", rating: 4.5, g: 1, mark: "VT",
    images: [
      "https://picsum.photos/seed/VT18v0/600/750",
      "https://picsum.photos/seed/VT18v1/600/750",
      "https://picsum.photos/seed/VT18v2/600/750",
    ],
    desc: "Tricot track pants with side piping and a snap-button tapered hem."
  },
  {
    id: 19, name: "Rebel Wide-Leg Trousers", cat: "Bottoms", price: 2099, mrp: null, tag: null, rating: 4.4, g: 4, mark: "RW",
    images: [
      "https://picsum.photos/seed/RW19v0/600/750",
      "https://picsum.photos/seed/RW19v1/600/750",
      "https://picsum.photos/seed/RW19v2/600/750",
    ],
    desc: "Drapey wide-leg trousers in a heavy twill with a pressed center crease."
  },
  {
    id: 20, name: "Circuit Board Shorts", cat: "Bottoms", price: 1199, mrp: null, tag: "NEW", rating: 4.5, g: 0, mark: "CB",
    images: [
      "https://picsum.photos/seed/CB20v0/600/750",
      "https://picsum.photos/seed/CB20v1/600/750",
      "https://picsum.photos/seed/CB20v2/600/750",
    ],
    desc: "Mid-thigh cargo shorts with a printed circuit-board lining and snap pockets."
  },
  {
    id: 21, name: "Fracture Skinny Jeans", cat: "Bottoms", price: 1899, mrp: 2299, tag: "SALE", rating: 4.3, g: 2, mark: "FJ",
    images: [
      "https://picsum.photos/seed/FJ21v0/600/750",
      "https://picsum.photos/seed/FJ21v1/600/750",
      "https://picsum.photos/seed/FJ21v2/600/750",
    ],
    desc: "Stretch skinny denim with fracture-print distressing across the knee."
  },
  {
    id: 22, name: "Dust Cloud Sweatpants", cat: "Bottoms", price: 1499, mrp: null, tag: null, rating: 4.6, g: 3, mark: "DC",
    images: [
      "https://picsum.photos/seed/DC22v0/600/750",
      "https://picsum.photos/seed/DC22v1/600/750",
      "https://picsum.photos/seed/DC22v2/600/750",
    ],
    desc: "Garment-dyed fleece sweatpants with a relaxed taper and deep side pockets."
  },
  {
    id: 23, name: "Nightshift Cargo Shorts", cat: "Bottoms", price: 1399, mrp: null, tag: "NEW", rating: 4.4, g: 5, mark: "NC",
    images: [
      "https://picsum.photos/seed/NC23v0/600/750",
      "https://picsum.photos/seed/NC23v1/600/750",
      "https://picsum.photos/seed/NC23v2/600/750",
    ],
    desc: "Ripstop cargo shorts with reflective trim and a drawcord waistband."
  },
  {
    id: 24, name: "Overclock Straight Jeans", cat: "Bottoms", price: 2299, mrp: 2699, tag: "SALE", rating: 4.7, g: 1, mark: "OJ",
    images: [
      "https://picsum.photos/seed/OJ24v0/600/750",
      "https://picsum.photos/seed/OJ24v1/600/750",
      "https://picsum.photos/seed/OJ24v2/600/750",
    ],
    desc: "Rigid straight-leg jeans in a mid-wash indigo with a raw hem finish."
  },
  {
    id: 25, name: "Static Noise Tank", cat: "Streetwear", price: 899, mrp: null, tag: "NEW", rating: 4.5, g: 2, mark: "SN",
    images: [
      "https://picsum.photos/seed/SN25v0/600/750",
      "https://picsum.photos/seed/SN25v1/600/750",
      "https://picsum.photos/seed/SN25v2/600/750",
    ],
    desc: "Ribbed tank with a static-noise wash and dropped armholes for layering."
  },
  {
    id: 26, name: "Broken Signal Longsleeve", cat: "Streetwear", price: 1499, mrp: 1899, tag: "SALE", rating: 4.6, g: 4, mark: "BS",
    images: [
      "https://picsum.photos/seed/BS26v0/600/750",
      "https://picsum.photos/seed/BS26v1/600/750",
      "https://picsum.photos/seed/BS26v2/600/750",
    ],
    desc: "Long-sleeve tee with a cracked signal graphic across the chest and back."
  },
  {
    id: 27, name: "Corrupted Cap", cat: "Accessories", price: 799, mrp: null, tag: "NEW", rating: 4.5, g: 0, mark: "CC",
    images: [
      "https://picsum.photos/seed/CC27v0/600/750",
      "https://picsum.photos/seed/CC27v1/600/750",
      "https://picsum.photos/seed/CC27v2/600/750",
    ],
    desc: "Six-panel cap with a distressed corrupted-pixel embroidery and curved brim."
  },
  {
    id: 28, name: "Feedback Loop Socks", cat: "Accessories", price: 399, mrp: null, tag: null, rating: 4.4, g: 3, mark: "FL",
    images: [
      "https://picsum.photos/seed/FL28v0/600/750",
      "https://picsum.photos/seed/FL28v1/600/750",
      "https://picsum.photos/seed/FL28v2/600/750",
    ],
    desc: "Crew socks in a two-pack with a looping feedback-wave jacquard pattern."
  },
  {
    id: 29, name: "Ghost Frame Sunglasses", cat: "Accessories", price: 1099, mrp: 1399, tag: "SALE", rating: 4.6, g: 5, mark: "GF",
    images: [
      "https://picsum.photos/seed/GF29v0/600/750",
      "https://picsum.photos/seed/GF29v1/600/750",
      "https://picsum.photos/seed/GF29v2/600/750",
    ],
    desc: "Translucent frame sunglasses with UV-400 lenses and a low-bridge fit."
  },
].map((p) => ({ ...p, img: p.images[0] }));

const inr = (n) => `\u20B9${n.toLocaleString("en-IN")}`;

/* --------------------------------- GLOBAL CSS --------------------------------- */

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    :root{
      --void:#0A0A0D;
      --surface:#141218;
      --surface2:#1C1A22;
      --line: rgba(255,255,255,0.09);
      --text:#F3F1F6;
      --muted:#918C9C;
      --pink:#FF2E8C;
      --violet:#8657FF;
      --gold:#FFC93F;
    }
    .gzr{
      background:var(--void);
      color:var(--text);
      font-family:'Inter',sans-serif;
      position:relative;
      min-height:100vh;
      overflow-x:hidden;
    }
    .f-display{ font-family:'Bebas Neue',sans-serif; letter-spacing:0.02em; }
    .f-head{ font-family:'Space Grotesk',sans-serif; }
    .f-mono{ font-family:'JetBrains Mono',monospace; }

    .gzr *{ scrollbar-width: thin; scrollbar-color: var(--violet) var(--surface); }
    .gzr ::-webkit-scrollbar{ width:8px; height:8px; }
    .gzr ::-webkit-scrollbar-track{ background:var(--surface); }
    .gzr ::-webkit-scrollbar-thumb{ background:var(--violet); border-radius:8px; }

    .gzr ::selection{ background:var(--pink); color:#0A0A0D; }

    .gzr :focus-visible{ outline:2px solid var(--gold); outline-offset:3px; border-radius:4px; }

    .grain{
      position:fixed; inset:0; pointer-events:none; z-index:60; opacity:0.05; mix-blend-mode:overlay;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    .text-pink{ color:var(--pink); }
    .text-violet{ color:var(--violet); }
    .text-gold{ color:var(--gold); }
    .text-muted{ color:var(--muted); }
    .bg-surface{ background:var(--surface); }
    .bg-surface2{ background:var(--surface2); }
    .border-line{ border-color:var(--line); }

    .grad-text{
      background:linear-gradient(90deg,var(--pink),var(--gold) 45%,var(--violet) 85%);
      background-size:200% auto;
      -webkit-background-clip:text; background-clip:text; color:transparent;
      animation:gradShift 6s ease-in-out infinite;
    }
    @keyframes gradShift{ 0%,100%{background-position:0% center;} 50%{background-position:100% center;} }

    .btn-primary{
      background:linear-gradient(90deg,var(--pink),var(--violet));
      color:#fff; font-family:'Space Grotesk',sans-serif; font-weight:600;
      transition:transform .25s ease, box-shadow .25s ease, filter .25s ease;
      box-shadow:0 0 0 rgba(255,46,140,0);
    }
    .btn-primary:hover{ transform:translateY(-2px); box-shadow:0 10px 30px -8px rgba(255,46,140,0.5); filter:brightness(1.07); }
    .btn-primary:active{ transform:translateY(0); }

    .btn-ghost{
      border:1px solid var(--line); color:var(--text); font-family:'Space Grotesk',sans-serif; font-weight:600;
      transition:border-color .2s ease, background .2s ease, transform .2s ease;
    }
    .btn-ghost:hover{ border-color:var(--violet); background:rgba(134,87,255,0.08); transform:translateY(-2px); }

    .icon-btn{ position:relative; color:var(--text); transition:color .2s ease, transform .2s ease; }
    .icon-btn:hover{ color:var(--pink); transform:translateY(-1px); }

    .badge-count{
      position:absolute; top:-6px; right:-8px; background:var(--pink); color:#fff;
      font-family:'JetBrains Mono',monospace; font-size:10px; line-height:1;
      width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    }

    /* marquee */
    .marquee-track{ display:flex; width:max-content; }
    .marquee-solid{ animation:mqLeft 26s linear infinite; }
    .marquee-ghost{ animation:mqLeft 55s linear infinite; }
    .gzr:hover .marquee-solid{ animation-play-state:running; }
    @keyframes mqLeft{ from{ transform:translateX(0); } to{ transform:translateX(-50%); } }

    .ghost-text{
      -webkit-text-stroke:1px rgba(255,255,255,0.14);
      color:transparent;
      font-family:'Bebas Neue',sans-serif;
    }

    /* hero blob */
    .blob{
      position:absolute; border-radius:9999px; filter:blur(90px); opacity:0.5;
      animation:blobPulse 8s ease-in-out infinite;
    }
    @keyframes blobPulse{ 0%,100%{ transform:scale(1); opacity:0.45;} 50%{ transform:scale(1.15); opacity:0.65;} }

    /* card */
    .gradient-border{ padding:1px; border-radius:18px; background:linear-gradient(135deg, rgba(255,46,140,0.5), rgba(134,87,255,0.5)); transition:background .3s ease; }
    .card:hover .gradient-border{ background:linear-gradient(135deg,var(--pink),var(--gold),var(--violet)); }
    .card-inner{ background:var(--surface); border-radius:17px; overflow:hidden; }
    .card{ transition:transform .3s ease; }
    .card:hover{ transform:translateY(-6px); }

    .swatch{ position:relative; overflow:hidden; }
    .swatch::after{
      content:''; position:absolute; inset:0;
      background-image:repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 14px);
    }
    .quick-actions{ opacity:0; transform:translateY(6px); transition:opacity .25s ease, transform .25s ease; }
    .card:hover .quick-actions{ opacity:1; transform:translateY(0); }

    .chip{ font-family:'JetBrains Mono',monospace; font-size:12px; letter-spacing:0.03em; transition:all .2s ease; }
    .chip-active{ background:var(--text); color:var(--void) !important; }
    .chip-inactive{ background:transparent; color:var(--muted); border:1px solid var(--line); }
    .chip-inactive:hover{ border-color:var(--violet); color:var(--text); }

    /* drawers */
    .drawer-backdrop{ transition:opacity .3s ease; }
    .drawer-panel{ transition:transform .35s cubic-bezier(.2,.8,.2,1); }

    /* modal */
    .modal-pop{ animation:modalPop .25s cubic-bezier(.2,.8,.2,1); }
    @keyframes modalPop{ from{ opacity:0; transform:scale(0.94) translateY(8px);} to{ opacity:1; transform:scale(1) translateY(0);} }

    /* toast */
    .toast-in{ animation:toastIn .3s cubic-bezier(.2,.8,.2,1); }
    @keyframes toastIn{ from{ opacity:0; transform:translateY(12px) scale(0.95);} to{ opacity:1; transform:translateY(0) scale(1);} }

    input.gzr-input{
      background:var(--surface2); border:1px solid var(--line); color:var(--text);
      transition:border-color .2s ease, box-shadow .2s ease;
    }
    input.gzr-input:focus{ border-color:var(--violet); box-shadow:0 0 0 3px rgba(134,87,255,0.15); outline:none; }
    input.gzr-input::placeholder{ color:var(--muted); }

    /* hero featured card interaction */
    .featured-card{ cursor:pointer; transition:transform .3s ease; }
    .featured-card:hover{ transform:translateY(-4px); }
    .featured-card:hover .featured-cta{ opacity:1; transform:translateY(0); }
    .featured-cta{ opacity:0; transform:translateY(6px); transition:opacity .25s ease, transform .25s ease; }

    /* admin upload dropzone */
    .upload-zone{
      border:1.5px dashed var(--line); border-radius:10px; transition:border-color .2s ease, background .2s ease;
    }
    .upload-zone:hover, .upload-zone.drag-over{
      border-color:var(--violet); background:rgba(134,87,255,0.08);
    }

    @media (prefers-reduced-motion: reduce){
      .marquee-solid,.marquee-ghost,.blob,.grad-text{ animation:none !important; }
    }
  `}</style>
);

/* --------------------------------- SMALL UI BITS --------------------------------- */

/* ProductSwatch renders a real product photo when `img` is provided.
   If `img` is missing, or the URL fails to load, it falls back to the
   original gradient + mark placeholder — so the grid never shows a broken image. */
const ProductSwatch = ({ g, mark, img, alt, className = "" }) => {
  const [errored, setErrored] = useState(false);
  const showImage = Boolean(img) && !errored;

  return (
    <div
      className={`swatch relative flex items-center justify-center ${className}`}
      style={{ background: GRADIENTS[g] }}
    >
      {showImage ? (
        <img
          src={img}
          alt={alt || mark}
          loading="lazy"
          onError={() => setErrored(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <span className="f-display text-8xl text-white/15 select-none">{mark}</span>
      )}
    </div>
  );
};

/* Replace these with your own hoodie photos — in Chrome, right-click any
   image on the web -> "Copy image address" -> paste the link here. */
const FEATURED_IMAGES = [
  "https://res.cloudinary.com/vistaprint/images/w_1024,h_1024,c_scale/f_auto,q_auto/v1737569349/ideas-and-advice-prod/en-us/Front-and-back-hoodie-design-1/Front-and-back-hoodie-design-1.png?_i=AA",
  "https://m.media-amazon.com/images/I/61FMmjvXWvL._AC_UY1100_.jpg",
  "https://m.media-amazon.com/images/I/51SfXVOfKnL._AC_UY1100_.jpg",
];

const FeaturedGallery = ({ images = FEATURED_IMAGES, className = "" }) => {
  const [index, setIndex] = useState(0);

  const nextImage = (e) => { e.stopPropagation(); setIndex((i) => (i + 1) % images.length); };
  const prevImage = (e) => { e.stopPropagation(); setIndex((i) => (i - 1 + images.length) % images.length); };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={images[index]}
        alt={`Product view ${index + 1}`}
        className="w-full h-full object-cover"
      />

      <button
        onClick={prevImage}
        aria-label="Previous image"
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition-colors"
      >
        <ChevronLeft size={16} className="text-white" />
      </button>

      <button
        onClick={nextImage}
        aria-label="Next image"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition-colors"
      >
        <ChevronRight size={16} className="text-white" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setIndex(i); }}
            aria-label={`Go to image ${i + 1}`}
            className="w-1.5 h-1.5 rounded-full transition-all"
            style={{ background: i === index ? "var(--gold)" : "rgba(255,255,255,0.35)", width: i === index ? "16px" : "6px" }}
          />
        ))}
      </div>
    </div>
  );
};

const Stars = ({ rating }) => (
  <div className="flex items-center gap-1">
    <Star size={13} className="text-gold" fill="#FFC93F" />
    <span className="f-mono text-xs text-muted">{rating}</span>
  </div>
);

/* --------------------------------- NAVBAR --------------------------------- */

const Navbar = ({ onCart, onWishlist, onOrders, onLogin, cartCount, wishCount, isLoggedIn, user, onLogout, onMenu, isAdmin, onAdmin }) => (
  <header className="sticky top-0 z-40 border-b border-line" style={{ background: "rgba(10,10,13,0.85)", backdropFilter: "blur(12px)" }}>
    <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <button className="md:hidden icon-btn" onClick={onMenu} aria-label="Open menu">
          <Menu size={22} />
        </button>
        <a href="#top" className="f-head text-xl md:text-2xl font-bold tracking-tight flex items-center gap-1">
          GENZE<span className="grad-text">REAL</span>
        </a>
      </div>

      <nav className="hidden md:flex items-center gap-8 f-head text-sm font-medium text-muted">
        <a href="#collections" className="hover:text-white transition-colors">Collections</a>
        <a href="#drops" className="hover:text-white transition-colors">New Drops</a>
        <a href="#community" className="hover:text-white transition-colors">Community</a>
        <a href="#footer" className="hover:text-white transition-colors">About</a>
      </nav>

      <div className="flex items-center gap-4 md:gap-5">
       {isAdmin && (
  <button
    onClick={onAdmin}
    className="flex items-center gap-1.5 f-mono text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3.5 py-2 rounded-full"
    style={{
      background: "linear-gradient(90deg,var(--gold),var(--pink))",
      color: "#0A0A0D",
    }}
  >
    <Sparkles size={13} />
    <span className="hidden sm:inline">Admin</span>
  </button>
)}
        <button className="icon-btn hidden sm:block" aria-label="Search">
          <Search size={20} />
        </button>
        <button className="icon-btn" onClick={onWishlist} aria-label="Wishlist">
          <Heart size={20} />
          {wishCount > 0 && <span className="badge-count">{wishCount}</span>}
        </button>
        <button className="icon-btn" onClick={onCart} aria-label="Cart">
          <ShoppingBag size={20} />
          {cartCount > 0 && <span className="badge-count">{cartCount}</span>}
        </button>

        {isLoggedIn && (
          <button onClick={onOrders} className="hidden sm:flex items-center gap-1.5 btn-ghost px-3 py-2 rounded-full text-xs">
            <Truck size={15} /> My Orders
          </button>
        )}

        {isLoggedIn ? (
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center f-mono text-xs font-semibold"
              style={{ background: "linear-gradient(135deg,var(--pink),var(--violet))" }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button onClick={onLogout} className="icon-btn" aria-label="Log out" title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button onClick={onLogin} className="hidden sm:flex items-center gap-1.5 btn-ghost px-4 py-2 rounded-full text-sm">
            <User size={16} /> Log In
          </button>
        )}
      </div>
    </div>
  </header>
);

const MobileMenu = ({ open, onClose, isLoggedIn, onLogin, onLogout, user }) => (
  <div
    className={`fixed inset-0 z-50 md:hidden drawer-backdrop ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
    style={{ background: "rgba(0,0,0,0.6)" }}
    onClick={onClose}
  >
    <div
      className="drawer-panel absolute left-0 top-0 h-full w-72 bg-surface p-6 flex flex-col gap-6"
      style={{ transform: open ? "translateX(0)" : "translateX(-100%)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <span className="f-head text-lg font-bold">Menu</span>
        <button onClick={onClose} className="icon-btn" aria-label="Close menu"><X size={20} /></button>
      </div>
      <nav className="flex flex-col gap-4 f-head text-lg">
        <a href="#collections" onClick={onClose}>Collections</a>
        <a href="#drops" onClick={onClose}>New Drops</a>
        <a href="#community" onClick={onClose}>Community</a>
        <a href="#footer" onClick={onClose}>About</a>
      </nav>
      <div className="mt-auto pt-6 border-t border-line">
        {isLoggedIn ? (
          <button onClick={onLogout} className="btn-ghost w-full py-2.5 rounded-full flex items-center justify-center gap-2">
            <LogOut size={16} /> Log out ({user.name})
          </button>
        ) : (
          <button onClick={onLogin} className="btn-primary w-full py-2.5 rounded-full flex items-center justify-center gap-2">
            <User size={16} /> Log In
          </button>
        )}
      </div>
    </div>
  </div>
);

/* --------------------------------- MARQUEE --------------------------------- */

const TICKER_ITEMS = ["NEW DROP EVERY FRIDAY", "AUTHENTIC GEN-Z STREETWEAR", "COD AVAILABLE PAN INDIA"];

const Marquee = () => (
  <div className="relative border-y border-line overflow-hidden" style={{ background: "var(--surface)" }}>
    {/* ghost layer */}
    <div className="absolute inset-0 flex items-center overflow-hidden pointer-events-none select-none">
      <div className="marquee-track marquee-ghost">
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center shrink-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="ghost-text text-7xl md:text-8xl px-6 whitespace-nowrap">REAL ONES ONLY</span>
            ))}
          </div>
        ))}
      </div>
    </div>
    {/* solid layer */}
    <div className="relative py-2.5">
      <div className="marquee-track marquee-solid">
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center shrink-0">
            {TICKER_ITEMS.map((t, i) => (
              <span key={i} className="flex items-center f-mono text-xs md:text-sm tracking-wide px-6 whitespace-nowrap">
                <Sparkles size={13} className="text-gold mr-2" /> {t}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* --------------------------------- HERO --------------------------------- */

const Hero = ({ onShop, featured, inWishlist, onToggleWishlist, onAddToCart, onOpenFeatured }) => (
  <section id="top" className="relative px-5 md:px-8 pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
    <div className="blob w-72 h-72 md:w-96 md:h-96 -top-10 -left-10" style={{ background: "var(--pink)" }} />
    <div className="blob w-72 h-72 md:w-96 md:h-96 top-40 right-0" style={{ background: "var(--violet)", animationDelay: "2s" }} />

    <div className="max-w-7xl mx-auto relative grid md:grid-cols-2 gap-12 items-center">
      <div>
        
        <h1 className="f-display leading-[0.85] text-7xl sm:text-8xl md:text-[7.5rem]">
          <span className="block">WEAR</span>
          <span className="block grad-text">WHAT'S</span>
          <span className="block">REAL.</span>
        </h1>
        <p className="mt-6 text-muted text-base md:text-lg max-w-md">
          No filters,  GenZeReal is streetwear built for the internet generation , loud graphics, honest prices.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button onClick={onShop} className="btn-primary px-7 py-3.5 rounded-full flex items-center gap-2">
            Shop the Drop <ArrowRight size={16} />
          </button>
          <a href="#collections" className="btn-ghost px-7 py-3.5 rounded-full">
            Browse Collections
          </a>
        </div>
      </div>

      <div className="relative">
        <div
          className="gradient-border featured-card"
          role="button"
          tabIndex={0}
          onClick={() => onOpenFeatured(featured)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenFeatured(featured); } }}
          aria-label={`View ${featured.name}`}
        >
          <div className="card-inner p-5 md:p-6">
            <div className="relative">
              <FeaturedGallery images={featured.images} className="h-72 md:h-80 rounded-xl" />
              <button
                onClick={(e) => { e.stopPropagation(); onToggleWishlist(featured.id); }}
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-black/50 backdrop-blur"
                aria-label="Toggle wishlist"
              >
                <Heart size={16} fill={inWishlist ? "#FF2E8C" : "none"} className={inWishlist ? "text-pink" : "text-white"} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="f-head font-semibold">{featured.name}</p>
                <p className="f-mono text-sm text-muted mt-1">Featured this week</p>
              </div>
              <div className="text-right">
                <p className="f-mono text-lg font-semibold text-gold">{inr(featured.price)}</p>
                {featured.mrp && <p className="f-mono text-xs text-muted line-through">{inr(featured.mrp)}</p>}
              </div>
            </div>
            <div className="featured-cta mt-4 flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); onAddToCart(featured); }}
                className="btn-primary flex-1 py-2.5 rounded-full flex items-center justify-center gap-2 text-sm"
              >
                <ShoppingBag size={15} /> Add to Bag
              </button>
              <span className="f-mono text-xs text-muted flex items-center gap-1">
                View details <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* --------------------------------- COLLECTIONS / FILTER --------------------------------- */

/* Add/replace `img` below to change each tile's photo — right-click any
   image on the web -> "Copy image address" -> paste it here. Leave `img`
   blank ("") to fall back to the plain gradient tile. */
const COLLECTIONS = [
  { name: "Streetwear", g: 0, sub: "Everyday statement fits", img: "" },
  { name: "Outerwear", g: 2, sub: "Jackets, hoodies, layers", img: "https://picsum.photos/seed/FR6v0/600/750" },
  { name: "Bottoms", g: 1, sub: "Cargos, joggers, denim", img: "https://picsum.photos/seed/CG2v0/600/750" },
 
];

/* Shows a tile's photo if the link loads; if it 404s or is left blank,
   it silently disappears and the gradient tile underneath still shows. */
const CollectionImage = ({ src, alt }) => {
  const [errored, setErrored] = useState(false);
  if (errored) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
};

/* Clicking a tile no longer jumps to #drops — it opens CategoryModal
   (via onSelect) scoped to just that category's items. */
const CollectionStrip = ({ onSelect, collections }) => {
  return (
    <section id="collections" className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="f-mono text-xs text-violet mb-2">SHOP BY CATEGORY</p>
          <h2 className="f-head text-3xl md:text-4xl font-bold">Collections</h2>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {collections.map((c) => (
          <button
            type="button"
            onClick={() => onSelect(c.name)}
            key={c.name}
            className="card group relative rounded-2xl overflow-hidden h-48 md:h-56 block text-left w-full"
          >
            <div className="absolute inset-0" style={{ background: GRADIENTS[c.g] }} />
            <div className="absolute inset-0 swatch" />
            {c.img && <CollectionImage src={c.img} alt={c.name} />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 p-4">
              <p className="f-head text-lg md:text-xl font-bold">{c.name}</p>
              <p className="f-mono text-xs text-white/70 mt-1">{c.sub}</p>
            </div>
            <ChevronRight size={18} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </section>
  );
};

/* --------------------------------- CATEGORY MODAL --------------------------------- */
/* Step 1 of the drill-down: shows every item inside the tapped category.
   Tapping an item opens ProductDetailModal (step 2) with left/right nav. */

const CategoryModal = ({
  open,
  category,
  products,
  collections,
  onClose,
  onOpenProduct,
  wishlist,
  onToggleWishlist,
  onAddToCart,
  isAdmin,
  onEditImages,
}) => {
  if (!open) return null;

  const meta = collections.find((c) => c.name === category);

  return (
    <div
      className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="modal-pop gradient-border max-w-5xl w-full my-4 sm:my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-inner">
          <div
            className="relative p-6 md:p-8 h-40 md:h-48 flex flex-col justify-end"
            style={{
              background: meta
                ? GRADIENTS[meta.g]
                : undefined,
            }}
          >
            <div className="absolute inset-0 swatch" />

            {meta?.img && (
              <CollectionImage
                src={meta.img}
                alt={category}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-black/30 to-transparent" />

            <div className="absolute top-6 right-6 md:top-8 md:right-8 flex items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    onEditImages &&
                    onEditImages(category)
                  }
                  className="icon-btn bg-black/40 rounded-full h-9 px-3 flex items-center gap-1.5 text-xs f-mono"
                  aria-label={`Edit ${category} photos`}
                  title={`Edit ${category} photos in Admin`}
                >
                  <Upload size={13} />

                  <span className="hidden sm:inline">
                    Edit photos
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="icon-btn bg-black/40 rounded-full w-9 h-9 flex items-center justify-center shrink-0"
                aria-label="Close category"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <p className="f-mono text-xs text-white/70 mb-1">
                {products.length} ITEM
                {products.length !== 1 ? "S" : ""}
              </p>

              <h3 className="f-head text-2xl md:text-3xl font-bold">
                {category}
              </h3>

              <p className="f-mono text-xs text-white/70 mt-1">
                {meta?.sub}
              </p>
            </div>
          </div>

          <div className="p-5 md:p-7">
            {products.length === 0 ? (
              <p className="text-muted text-sm py-10 text-center">
                No items in this category yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                {products.map((p) => (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      onOpenProduct(p)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        onOpenProduct(p);
                      }
                    }}
                    className="card group text-left cursor-pointer"
                  >
                    <div className="gradient-border">
                      <div className="card-inner">
                        <div className="relative">
                          <ProductSwatch
                            g={p.g}
                            mark={p.mark}
                            img={p.img}
                            alt={p.name}
                            className="h-40 md:h-48"
                          />

                          {p.tag && (
                            <span
                              className="absolute top-2 left-2 f-mono text-[9px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background:
                                  p.tag === "SALE"
                                    ? "var(--pink)"
                                    : "var(--gold)",
                                color: "#0A0A0D",
                              }}
                            >
                              {p.tag}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleWishlist(p.id);
                            }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/50 backdrop-blur"
                            aria-label="Toggle wishlist"
                          >
                            <Heart
                              size={13}
                              fill={
                                wishlist.includes(p.id)
                                  ? "#FF2E8C"
                                  : "none"
                              }
                              className={
                                wishlist.includes(p.id)
                                  ? "text-pink"
                                  : "text-white"
                              }
                            />
                          </button>
                        </div>

                        <div className="p-3">
                          <p className="f-head text-sm font-semibold leading-snug line-clamp-2">
                            {p.name}
                          </p>

                          <div className="flex items-center justify-between mt-2">
                            <span className="f-mono text-xs font-semibold text-gold">
                              {inr(p.price)}
                            </span>

                            <ChevronRight
                              size={14}
                              className="text-muted group-hover:text-white transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* --------------------------------- PRODUCT DETAIL MODAL --------------------------------- */
/* Step 2 of the drill-down: full price + description view for one item,
   with left/right arrows to move to the previous/next item within the
   same category (wraps around at the ends). */

/* Opened from a Collections tile -> item. Left/right arrows here flip
   through THIS product's own photos (front / back / detail) — they never
   switch to a different item in the category. `siblings` is kept in case
   you want a "more from this category" strip later; it no longer drives
   the arrows. */
// const ProductDetailModal = ({ open, product, siblings, onClose, onAddToCart, inWishlist, onToggleWishlist, user }) => {
//   const [imgIndex, setImgIndex] = useState(0);

//   // reset to the first photo whenever a different product is opened
//   useEffect(() => { setImgIndex(0); }, [product?.id]);

//   if (!open || !product) return null;

//   const views = product.images && product.images.length ? product.images : [product.img];
//   const goPrevView = () => setImgIndex((i) => (i - 1 + views.length) % views.length);
//   const goNextView = () => setImgIndex((i) => (i + 1) % views.length);

//   return (
//     <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 sm:p-8" style={{ background: "rgba(0,0,0,0.8)" }} onClick={onClose}>
//       <div className="modal-pop gradient-border max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
//         <div className="card-inner grid md:grid-cols-2">
//           <div className="relative">
//             <ProductSwatch key={imgIndex} g={product.g} mark={product.mark} img={views[imgIndex]} alt={`${product.name} — view ${imgIndex + 1}`} className="h-64 md:h-full" />
//             {product.tag && (
//               <span
//                 className="absolute top-4 left-4 f-mono text-[10px] font-semibold px-2.5 py-1 rounded-full"
//                 style={{ background: product.tag === "SALE" ? "var(--pink)" : "var(--gold)", color: "#0A0A0D" }}
//               >
//                 {product.tag}
//               </span>
//             )}

//             {views.length > 1 && (
//               <>
//                 <button
//                   onClick={goPrevView}
//                   aria-label="Previous photo of this item"
//                   className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition-colors"
//                 >
//                   <ChevronLeft size={18} className="text-white" />
//                 </button>
//                 <button
//                   onClick={goNextView}
//                   aria-label="Next photo of this item"
//                   className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition-colors"
//                 >
//                   <ChevronRight size={18} className="text-white" />
//                 </button>
//                 <span className="absolute bottom-3 left-1/2 -translate-x-1/2 f-mono text-[10px] text-white/80 bg-black/50 backdrop-blur px-2.5 py-1 rounded-full">
//                   {imgIndex + 1} / {views.length}
//                 </span>
//               </>
//             )}
//           </div>

//           <div className="p-6 md:p-7 flex flex-col">
//             <div className="flex items-start justify-between gap-3">
//               <p className="f-mono text-[10px] text-muted uppercase tracking-wide">{product.cat}</p>
//               <button onClick={onClose} className="icon-btn shrink-0" aria-label="Close"><X size={20} /></button>
//             </div>

//             <h3 className="f-head text-2xl font-bold mt-2 leading-tight">{product.name}</h3>

//             <div className="mt-2"><Stars rating={product.rating} /></div>

//             <div className="flex items-baseline gap-3 mt-4">
//               <span className="f-mono text-2xl font-semibold text-gold">{inr(product.price)}</span>
//               {product.mrp && <span className="f-mono text-sm text-muted line-through">{inr(product.mrp)}</span>}
//             </div>

//             <p className="text-sm text-muted leading-relaxed mt-4">{product.desc}</p>

//             <div className="mt-auto pt-6 flex items-center gap-3">
//               <button
//                 onClick={() => onAddToCart(product)}
//                 className="btn-primary flex-1 py-3 rounded-full flex items-center justify-center gap-2"
//               >
//                 <ShoppingBag size={16} /> Add to Bag
//               </button>
//               <button
//                 onClick={() => onToggleWishlist(product.id)}
//                 className="w-12 h-12 rounded-full border border-line flex items-center justify-center shrink-0"
//                 aria-label="Toggle wishlist"
//               >
//                 <Heart size={18} fill={inWishlist ? "#FF2E8C" : "none"} className={inWishlist ? "text-pink" : "text-text"} />
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

/* --------------------------------- PRODUCT CARD --------------------------------- */

/* --------------------------------- PRODUCT FULL PAGE --------------------------------- */
/* Used from New Drops: instead of a small centered modal, the item opens as
   its own full-screen page. Left/right arrows here flip through THIS
   product's own photos (front / back / detail) — they never switch to a
   different t-shirt. Below the fold, a "More to explore" grid lets people
   keep browsing by scrolling instead of always hitting Back. */

const ProductFullPage = ({
  open,
  product,
  siblings,
  products,
  onClose,
  onNavigate,
  onAddToCart,
  wishlist,
  onToggleWishlist,
  user,
}) => {
  const [imgIndex, setImgIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError, setSizeError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setImgIndex(0);
    setSelectedSize("");
    setSizeError("");

    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: 0,
        behavior:
          "instant" in document.documentElement.style
            ? "instant"
            : "auto",
      });
    }
  }, [product?.id]);

  if (!open || !product) return null;

  const views =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [product.img].filter(Boolean);

  const goPrevView = () => {
    setImgIndex(
      (currentIndex) =>
        (currentIndex - 1 + views.length) % views.length
    );
  };

  const goNextView = () => {
    setImgIndex(
      (currentIndex) =>
        (currentIndex + 1) % views.length
    );
  };

  const inWishlist = Array.isArray(wishlist)
    ? wishlist.includes(product.id)
    : false;

  const productSizes =
    Array.isArray(product.sizes) && product.sizes.length > 0
      ? product.sizes
      : [
          { size: "S", stock: 0 },
          { size: "M", stock: 0 },
          { size: "L", stock: 0 },
          { size: "XL", stock: 0 },
        ];

  const selectedSizeInfo = productSizes.find(
    (item) => item.size === selectedSize
  );

  const totalStock = productSizes.reduce(
    (sum, item) => sum + Number(item.stock || 0),
    0
  );

  const moreItems = (
    siblings && siblings.length
      ? siblings
      : (products || []).filter(
          (item) => item.cat === product.cat
        )
  ).filter((item) => item.id !== product.id);

  const handleAddToBag = () => {
    if (!selectedSize) {
      setSizeError("Please select a size first.");
      return;
    }

    if (
      !selectedSizeInfo ||
      Number(selectedSizeInfo.stock || 0) <= 0
    ) {
      setSizeError("This size is currently out of stock.");
      return;
    }

    setSizeError("");

    onAddToCart({
      ...product,
      size: selectedSize,
    });
  };

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-[80] overflow-y-auto"
      style={{ background: "var(--void)" }}
    >
      <div className="grain" />

      <div
        className="sticky top-0 z-10 border-b border-line"
        style={{
          background: "rgba(10,10,13,0.9)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="icon-btn flex items-center gap-2 f-head text-sm font-semibold"
          >
            <ChevronLeft size={18} />
            Back to New Drops
          </button>

          <span className="f-head text-sm font-semibold hidden sm:block">
            {product.name}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-14 grid md:grid-cols-2 gap-10 md:gap-14">
        <div>
          <div className="relative">
            <ProductSwatch
              key={`${product.id}-${imgIndex}`}
              g={product.g}
              mark={product.mark}
              img={views[imgIndex]}
              alt={`${product.name} — view ${imgIndex + 1}`}
              className="h-80 sm:h-[26rem] md:h-[34rem] rounded-2xl"
            />

            {product.tag && (
              <span
                className="absolute top-4 left-4 f-mono text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background:
                    product.tag === "SALE"
                      ? "var(--pink)"
                      : "var(--gold)",
                  color: "#0A0A0D",
                }}
              >
                {product.tag}
              </span>
            )}

            {views.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrevView}
                  aria-label="Previous product photo"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-black/55 backdrop-blur border border-white/10 hover:bg-black/75 transition-colors"
                >
                  <ChevronLeft
                    size={20}
                    className="text-white"
                  />
                </button>

                <button
                  type="button"
                  onClick={goNextView}
                  aria-label="Next product photo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-black/55 backdrop-blur border border-white/10 hover:bg-black/75 transition-colors"
                >
                  <ChevronRight
                    size={20}
                    className="text-white"
                  />
                </button>

                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 f-mono text-[10px] text-white/85 bg-black/55 backdrop-blur px-2.5 py-1 rounded-full border border-white/10">
                  {imgIndex + 1} / {views.length}
                </span>
              </>
            )}
          </div>

          {views.length > 1 && (
            <div className="grid grid-cols-4 gap-3 mt-4">
              {views.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-${index}`}
                  onClick={() => setImgIndex(index)}
                  className={`rounded-xl overflow-hidden border transition ${
                    imgIndex === index
                      ? "border-violet-500"
                      : "border-line hover:border-white/40"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} thumbnail ${index + 1}`}
                    className="w-full aspect-square object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <p className="f-mono text-xs text-muted uppercase tracking-wide">
            {product.cat}
          </p>

          <h1 className="f-head text-3xl md:text-4xl font-bold mt-2 leading-tight">
            {product.name}
          </h1>

          <div className="mt-3">
            <Stars rating={product.rating} />
          </div>

          <div className="flex items-baseline gap-3 mt-5">
            <span className="f-mono text-3xl font-semibold text-gold">
              {inr(product.price)}
            </span>

            {product.mrp && (
              <span className="f-mono text-base text-muted line-through">
                {inr(product.mrp)}
              </span>
            )}
          </div>

          <p className="text-muted leading-relaxed mt-5 max-w-md">
            {product.desc}
          </p>

          <div className="mt-7">
            <div className="flex items-center justify-between gap-4">
              <p className="f-head text-sm font-semibold">
                Select Size
              </p>

              {selectedSize && (
                <p className="f-mono text-xs text-violet">
                  Selected: {selectedSize}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-3">
              {productSizes.map((item) => {
                const stock = Number(item.stock || 0);
                const outOfStock = stock <= 0;
                const isSelected =
                  selectedSize === item.size;

                return (
                  <button
                    type="button"
                    key={item.size}
                    disabled={outOfStock}
                    onClick={() => {
                      setSelectedSize(item.size);
                      setSizeError("");
                    }}
                    className={`min-w-12 h-11 px-4 rounded-full border text-sm font-semibold transition ${
                      outOfStock
                        ? "border-white/10 text-white/25 cursor-not-allowed line-through"
                        : isSelected
                          ? "border-violet-500 bg-violet-500 text-white"
                          : "border-line hover:border-violet-500"
                    }`}
                  >
                    {item.size}
                  </button>
                );
              })}
            </div>

            {selectedSizeInfo &&
              Number(selectedSizeInfo.stock || 0) > 0 &&
              Number(selectedSizeInfo.stock || 0) <= 5 && (
                <p className="text-sm text-orange-400 mt-3">
                  Only {selectedSizeInfo.stock} left in size{" "}
                  {selectedSize}
                </p>
              )}

            {selectedSizeInfo &&
              Number(selectedSizeInfo.stock || 0) > 5 && (
                <p className="text-sm text-green-400 mt-3">
                  In stock
                </p>
              )}

            {!selectedSize && totalStock > 0 && (
              <p className="text-xs text-muted mt-3">
                Choose your preferred size before adding to
                the bag.
              </p>
            )}

            {totalStock <= 0 && (
              <p className="text-sm text-red-400 mt-3">
                This product is currently out of stock.
              </p>
            )}

            {sizeError && (
              <p className="text-sm text-red-400 mt-3">
                {sizeError}
              </p>
            )}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddToBag}
              disabled={totalStock <= 0}
              className="btn-primary flex-1 sm:flex-none sm:px-10 py-3.5 rounded-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingBag size={16} />
              {totalStock <= 0
                ? "Out of Stock"
                : "Add to Bag"}
            </button>

            <button
              type="button"
              onClick={() =>
                onToggleWishlist(product.id)
              }
              className="w-12 h-12 rounded-full border border-line flex items-center justify-center shrink-0"
              aria-label="Toggle wishlist"
            >
              <Heart
                size={18}
                fill={
                  inWishlist ? "#FF2E8C" : "none"
                }
                className={
                  inWishlist
                    ? "text-pink"
                    : "text-text"
                }
              />
            </button>
          </div>

          <div className="mt-10 pt-8 border-t border-line grid grid-cols-2 gap-4 f-mono text-xs text-muted">
            <div>
              <span className="block text-white/80 mb-1">
                SKU
              </span>
              {product.mark}-
              {String(product.id).padStart(3, "0")}
            </div>

            <div>
              <span className="block text-white/80 mb-1">
                Shipping
              </span>
              Free over ₹2000
            </div>

            <div>
              <span className="block text-white/80 mb-1">
                Total Stock
              </span>
              {totalStock}
            </div>

            <div>
              <span className="block text-white/80 mb-1">
                Delivery
              </span>
              Usually 4–7 business days
            </div>
          </div>
        </div>
      </div>

      <ProductReviews
        product={product}
        user={user}
      />

      {moreItems.length > 0 && (
        <div className="max-w-6xl mx-auto px-5 md:px-8 pb-16 md:pb-24">
          <div className="border-t border-line pt-10 md:pt-14">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="f-mono text-xs text-violet mb-2">
                  KEEP SCROLLING
                </p>

                <h2 className="f-head text-2xl md:text-3xl font-bold">
                  More {product.cat}
                </h2>
              </div>

              <span className="f-mono text-xs text-muted hidden sm:block">
                {moreItems.length} more item
                {moreItems.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {moreItems.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigate(item)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      onNavigate(item);
                    }
                  }}
                  className="card group text-left cursor-pointer"
                >
                  <div className="gradient-border">
                    <div className="card-inner">
                      <div className="relative">
                        <ProductSwatch
                          g={item.g}
                          mark={item.mark}
                          img={item.img}
                          alt={item.name}
                          className="h-40 md:h-48"
                        />

                        {item.tag && (
                          <span
                            className="absolute top-2 left-2 f-mono text-[9px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background:
                                item.tag === "SALE"
                                  ? "var(--pink)"
                                  : "var(--gold)",
                              color: "#0A0A0D",
                            }}
                          >
                            {item.tag}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleWishlist(item.id);
                          }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-black/50 backdrop-blur"
                          aria-label="Toggle wishlist"
                        >
                          <Heart
                            size={13}
                            fill={
                              wishlist?.includes(item.id)
                                ? "#FF2E8C"
                                : "none"
                            }
                            className={
                              wishlist?.includes(item.id)
                                ? "text-pink"
                                : "text-white"
                            }
                          />
                        </button>
                      </div>

                      <div className="p-3">
                        <p className="f-head text-sm font-semibold leading-snug line-clamp-2">
                          {item.name}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <span className="f-mono text-xs font-semibold text-gold">
                            {inr(item.price)}
                          </span>

                          <ChevronRight
                            size={14}
                            className="text-muted group-hover:text-white transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
const ProductCard = ({ p, inWishlist, onToggleWishlist, onAddToCart, onOpen }) => (
  <button type="button" onClick={() => onOpen(p)} className="card group text-left w-full">
    <div className="gradient-border">
      <div className="card-inner">
        <div className="relative">
          <ProductSwatch g={p.g} mark={p.mark} img={p.img} alt={p.name} className="h-64" />
          {p.tag && (
            <span
              className="absolute top-3 left-3 f-mono text-[10px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: p.tag === "SALE" ? "var(--pink)" : "var(--gold)", color: "#0A0A0D" }}
            >
              {p.tag}
            </span>
          )}
          <div className="quick-actions absolute top-3 right-3 flex flex-col gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWishlist(p.id); }}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-black/50 backdrop-blur"
              aria-label="Toggle wishlist"
            >
              <Heart size={16} fill={inWishlist ? "#FF2E8C" : "none"} className={inWishlist ? "text-pink" : "text-white"} />
            </button>
          </div>
        </div>
        <div className="p-4">
          <p className="f-mono text-[10px] text-muted uppercase tracking-wide">{p.cat}</p>
          <p className="f-head font-semibold mt-1 leading-snug">{p.name}</p>
          <div className="flex items-center justify-between mt-2">
            <Stars rating={p.rating} />
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-baseline gap-2">
              <span className="f-mono font-semibold text-gold">{inr(p.price)}</span>
              {p.mrp && <span className="f-mono text-xs text-muted line-through">{inr(p.mrp)}</span>}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onAddToCart(p); }}
              className="btn-primary w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              aria-label="Add to cart"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  </button>
);

const ProductGrid = ({ products, wishlist, onToggleWishlist, onAddToCart, onOpenProduct }) => {
  const [active, setActive] = useState("All");
  const filtered = active === "All" ? products : products.filter((p) => p.cat === active);

  return (
    <section id="drops" className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
        <div>
          <p className="f-mono text-xs text-pink mb-2">FRESH INVENTORY</p>
          <h2 className="f-head text-3xl md:text-4xl font-bold">New Drops</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`chip px-4 py-2 rounded-full ${active === c ? "chip-active" : "chip-inactive"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {filtered.map((p) => (
          <ProductCard
            key={p.id}
            p={p}
            inWishlist={wishlist.includes(p.id)}
            onToggleWishlist={onToggleWishlist}
            onAddToCart={onAddToCart}
            onOpen={() => onOpenProduct(p, filtered)}
          />
        ))}
      </div>
    </section>
  );
};

/* --------------------------------- COMMUNITY MARQUEE --------------------------------- */

const HANDLES = ["@ANISHA.FITS", "@ROHAN_WEARS", "@KIARA.DROPS", "@DEV_STREETS", "@MEERA.LOOKS", "@ARJUN.CORE"];

const CommunitySection = () => (
  <section id="community" className="py-16 md:py-20 border-y border-line" style={{ background: "var(--surface)" }}>
    <div className="max-w-7xl mx-auto px-5 md:px-8 mb-8">
      <p className="f-mono text-xs text-gold mb-2">#GENZEREAL</p>
      <h2 className="f-head text-3xl md:text-4xl font-bold">Styled by the community</h2>
    </div>
    <div className="overflow-hidden">
      <div className="marquee-track marquee-solid" style={{ animationDuration: "34s" }}>
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center shrink-0">
            {HANDLES.map((h, i) => (
              <div key={i} className="flex items-center gap-3 mx-3">
                <div className="w-40 h-52 rounded-xl swatch flex items-end p-3" style={{ background: GRADIENTS[i % GRADIENTS.length] }}>
                  <span className="f-mono text-xs font-semibold text-white">{h}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* --------------------------------- NEWSLETTER --------------------------------- */

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <section className="max-w-4xl mx-auto px-5 md:px-8 py-20 md:py-28 text-center">
      <h2 className="f-display text-5xl md:text-6xl grad-text">NEVER MISS A DROP</h2>
      <p className="text-muted mt-4 max-w-md mx-auto">Get first access to limited releases, restocks, and Gen-Z-only discounts. No spam, just heat.</p>
      {done ? (
        <div className="mt-7 inline-flex items-center gap-2 f-mono text-sm text-gold">
          <Check size={16} /> You're on the list.
        </div>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); if (email) setDone(true); }}
          className="mt-7 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="gzr-input flex-1 rounded-full px-5 py-3 text-sm"
          />
          <button type="submit" className="btn-primary px-6 py-3 rounded-full whitespace-nowrap">Notify Me</button>
        </form>
      )}
    </section>
  );
};

/* --------------------------------- FOOTER --------------------------------- */

const Footer = () => (
  <footer id="footer" className="border-t border-line pt-14 pb-8 px-5 md:px-8" style={{ background: "var(--surface)" }}>
    <div className="max-w-7xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-10">
      <div>
        <p className="f-head text-xl font-bold mb-3">GENZE<span className="grad-text">REAL</span></p>
        <p className="text-muted text-sm max-w-xs">Streetwear for the internet generation. Designed loud, priced honest.</p>
        <div className="flex gap-3 mt-5">
          {[AtSign, MessageCircle, Play].map((Icon, i) => (
            <a key={i} href="#top" className="icon-btn w-9 h-9 rounded-full border border-line flex items-center justify-center">
              <Icon size={15} />
            </a>
          ))}
        </div>
      </div>
      <div>
        <p className="f-mono text-xs text-muted mb-4">SHOP</p>
        <ul className="space-y-2.5 text-sm">
          <li><a href="#collections" className="hover:text-pink transition-colors">Collections</a></li>
          <li><a href="#drops" className="hover:text-pink transition-colors">New Drops</a></li>
          <li><a href="#drops" className="hover:text-pink transition-colors">Best Sellers</a></li>
        </ul>
      </div>
      <div>
        <p className="f-mono text-xs text-muted mb-4">SUPPORT</p>
        <ul className="space-y-2.5 text-sm">
          <li><a href="#top" className="hover:text-pink transition-colors">Shipping & Returns</a></li>
          <li><a href="#top" className="hover:text-pink transition-colors">Track Order</a></li>
          <li><a href="#top" className="hover:text-pink transition-colors">Size Guide</a></li>
        </ul>
      </div>
      <div>
        <p className="f-mono text-xs text-muted mb-4">CONTACT</p>
        <p className="flex items-center gap-2 text-sm text-muted"><Mail size={14} /> hello@genzereal.in</p>
      </div>
    </div>
    <div className="max-w-7xl mx-auto border-t border-line mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="f-mono text-xs text-muted">\u00A9 2026 GenZeReal. All rights reserved.</p>
      <p className="f-mono text-xs text-muted">Made real, not generated.</p>
    </div>
  </footer>
);

/* --------------------------------- CART DRAWER --------------------------------- */

const CartDrawer = ({ open, onClose, items, onUpdateQty, onRemove, onCheckout }) => {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  return (
    <div className={`fixed inset-0 z-50 drawer-backdrop ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        className="drawer-panel absolute right-0 top-0 h-full w-full sm:w-[26rem] bg-surface flex flex-col"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-line">
          <p className="f-head text-lg font-bold flex items-center gap-2"><ShoppingBag size={18} /> Your Bag ({items.length})</p>
          <button onClick={onClose} className="icon-btn" aria-label="Close cart"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {items.length === 0 && (
            <div className="text-center text-muted mt-16">
              <ShoppingBag size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Your bag is empty. Time to fix that.</p>
            </div>
          )}
          {items.map((i) => (
            <div key={i.id} className="flex gap-3">
              <ProductSwatch g={i.g} mark={i.mark} img={i.img} alt={i.name} className="w-20 h-24 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="f-head text-sm font-semibold truncate">{i.name}</p>
                <p className="f-mono text-xs text-gold mt-1">{inr(i.price)}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border border-line rounded-full">
                    <button onClick={() => onUpdateQty(i.id, -1)} className="w-6 h-6 flex items-center justify-center" aria-label="Decrease quantity"><Minus size={12} /></button>
                    <span className="f-mono text-xs w-6 text-center">{i.qty}</span>
                    <button onClick={() => onUpdateQty(i.id, 1)} className="w-6 h-6 flex items-center justify-center" aria-label="Increase quantity"><Plus size={12} /></button>
                  </div>
                  <button onClick={() => onRemove(i.id)} className="text-xs text-muted hover:text-pink transition-colors">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="p-5 border-t border-line">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted">Subtotal</span>
              <span className="f-mono font-semibold text-lg">{inr(total)}</span>
            </div>
            <button onClick={onCheckout} className="btn-primary w-full py-3 rounded-full">Checkout</button>
          </div>
        )}
      </div>
    </div>
  );
};

/* --------------------------------- WISHLIST DRAWER --------------------------------- */

const WishlistDrawer = ({ open, onClose, items, onRemove, onMoveToCart }) => (
  <div className={`fixed inset-0 z-50 drawer-backdrop ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
    <div
      className="drawer-panel absolute right-0 top-0 h-full w-full sm:w-[26rem] bg-surface flex flex-col"
      style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-5 border-b border-line">
        <p className="f-head text-lg font-bold flex items-center gap-2"><Heart size={18} /> Wishlist ({items.length})</p>
        <button onClick={onClose} className="icon-btn" aria-label="Close wishlist"><X size={20} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {items.length === 0 && (
          <div className="text-center text-muted mt-16">
            <Heart size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nothing saved yet. Tap the heart on anything you love.</p>
          </div>
        )}
        {items.map((i) => (
          <div key={i.id} className="flex gap-3 items-center">
            <ProductSwatch g={i.g} mark={i.mark} img={i.img} alt={i.name} className="w-20 h-24 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="f-head text-sm font-semibold truncate">{i.name}</p>
              <p className="f-mono text-xs text-gold mt-1">{inr(i.price)}</p>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => onMoveToCart(i)} className="text-xs f-mono text-violet hover:text-pink transition-colors">Move to bag</button>
                <button onClick={() => onRemove(i.id)} className="text-xs text-muted hover:text-pink transition-colors">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* --------------------------------- LOGIN MODAL --------------------------------- */

const LoginModal = ({ open, onClose, onLogin }) => {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="modal-pop gradient-border max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="card-inner p-7">
          <div className="flex items-center justify-between mb-6">
            <p className="f-head text-xl font-bold">{mode === "login" ? "Welcome back" : "Create account"}</p>
            <button onClick={onClose} className="icon-btn" aria-label="Close"><X size={20} /></button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setSubmitting(true);
              try {
                await onLogin({ mode, name: name.trim(), email: email.trim(), password });
                setPassword("");
              } catch (err) {
                setError(err.message || "Could not continue");
              } finally {
                setSubmitting(false);
              }
            }}
            className="flex flex-col gap-4"
          >
            {mode === "signup" && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="gzr-input rounded-lg px-4 py-3 text-sm" />
            )}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="gzr-input rounded-lg px-4 py-3 text-sm" />
            <input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (minimum 6 characters)" className="gzr-input rounded-lg px-4 py-3 text-sm" />
            {error && <p className="text-xs text-pink">{error}</p>}
            <button disabled={submitting} type="submit" className="btn-primary py-3 rounded-full mt-1 disabled:opacity-60">
              {submitting ? "Please wait..." : mode === "login" ? "Log In" : "Sign Up"}
            </button>
          </form>
          <p className="text-center text-xs text-muted mt-5">
            {mode === "login" ? "New to GenZeReal?" : "Already have an account?"}{" "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-pink font-medium">
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

/* --------------------------------- TOAST --------------------------------- */

const Toast = ({ message }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[70] toast-in">
      <div className="gradient-border">
        <div className="card-inner px-5 py-3 flex items-center gap-2">
          <Check size={16} className="text-gold" />
          <span className="f-mono text-xs">{message}</span>
        </div>
      </div>
    </div>
  );
};

/* --------------------------------- ADMIN PANEL --------------------------------- */
/* Only reachable when logged in as ADMIN_EMAIL. Lets the store owner either
   paste a fresh image link OR upload a photo straight from their laptop's
   file system (or, on mobile, their phone's gallery/camera) for any
   product or any Collections tile — no code editing required. Changes
   apply instantly to the live storefront (in this session; see the note
   in the panel about making them permanent). */

/* Max upload size kept modest since uploaded photos are held as base64
   data URLs in memory for this session (no server / file storage here). */
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // 3MB — base64 encoding inflates this by ~33%, so this stays safely under the 5MB persistent-storage value limit

/* PERSISTENCE
   Images are saved through the platform's persistent storage (window.storage),
   which is only available when this component is running as a Claude
   artifact. Everything is wrapped so the app still works fine without it —
   edits just won't survive a refresh in that case (same as before).
   Data is stored as "shared" (shared=true) since every visitor to the
   storefront needs to see the same product photos. */
const hasStorage = () => typeof window !== "undefined" && window.storage;

const storageGet = async (key) => {
  if (!hasStorage()) return null;
  try {
    const res = await window.storage.get(key, true);
    return res ? res.value : null;
  } catch {
    return null; // key doesn't exist yet, or storage isn't reachable
  }
};

const storageSet = async (key, value) => {
  if (!hasStorage()) return false;
  try {
    const res = await window.storage.set(key, value, true);
    return Boolean(res);
  } catch (e) {
    console.error("Failed to persist to storage:", key, e);
    return false;
  }
};

const storageDelete = async (key) => {
  if (!hasStorage()) return false;
  try {
    await window.storage.delete(key, true);
    return true;
  } catch (e) {
    console.error("Failed to clear stored value:", key, e);
    return false;
  }
};

const AdminRow = ({ label, sub, currentImg, mark, g, onSave, onReset }) => {
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const savedTimerRef = useRef(null);
  const errorTimerRef = useRef(null);

  useEffect(() => () => {
    clearTimeout(savedTimerRef.current);
    clearTimeout(errorTimerRef.current);
  }, []);

  const flashSaved = () => {
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 1800);
  };

  const flashError = (msg) => {
    setError(msg);
    clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(""), 3000);
  };

  const handleSaveUrl = () => {
    const trimmed = url.trim();
    if (!trimmed || checking) return;
    setChecking(true);
    // Confirm the link actually points to a loadable image before applying it —
    // otherwise a bad/blocked link would silently do nothing and look like
    // "it didn't add" with no explanation.
    const tester = new window.Image();
    tester.onload = () => {
      setChecking(false);
      onSave(trimmed);
      setUrl("");
      flashSaved();
    };
    tester.onerror = () => {
      setChecking(false);
      flashError("Couldn't load that link — make sure it's a direct image URL (ending in .jpg/.png/etc), not a webpage link.");
    };
    tester.src = trimmed;
  };

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      flashError("That file isn't an image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      flashError("Image is too large — try one under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onSave(reader.result);
        flashSaved();
      }
    };
    reader.onerror = () => flashError("Couldn't read that file — try again.");
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    processFile(file);
    e.target.value = ""; // allow picking the same file again later
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    processFile(file);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-start p-3 rounded-xl bg-surface2 border border-line">
      <ProductSwatch g={g} mark={mark} img={currentImg} alt={label} className="w-16 h-20 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="f-head text-sm font-semibold truncate">{label}</p>
        {sub && <p className="f-mono text-xs text-muted mt-0.5 truncate">{sub}</p>}

        {/* Option A: paste a link */}
        <div className="flex items-center gap-2 mt-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveUrl(); }}
            placeholder="Paste image link here"
            className="gzr-input flex-1 rounded-lg px-3 py-2 text-xs"
          />
          <button
            onClick={handleSaveUrl}
            disabled={checking}
            className="btn-primary px-4 py-2 rounded-lg text-xs shrink-0 flex items-center gap-1.5 disabled:opacity-60"
          >
            {saved ? <Check size={13} /> : <Plus size={13} />} {checking ? "Checking..." : saved ? "Saved" : "Add"}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
          <span className="f-mono text-[10px] text-muted">OR</span>
          <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
        </div>

        {/* Option B: upload from this device's files, or a phone's gallery/camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
          className={`upload-zone mt-2 px-3 py-3 flex items-center justify-center gap-2 cursor-pointer ${isDragOver ? "drag-over" : ""}`}
        >
          <Upload size={14} className="text-violet shrink-0" />
          <span className="f-mono text-xs text-muted text-center">
            Upload from device or gallery <span className="hidden sm:inline">— or drag a photo here</span>
          </span>
        </div>

        {error && <p className="f-mono text-[10px] text-pink mt-2">{error}</p>}

        {onReset && (
          <button onClick={onReset} className="f-mono text-[10px] text-muted hover:text-pink transition-colors mt-2">
            Reset to default photo
          </button>
        )}
      </div>
    </div>
  );
};

/* AdminProductRow — same idea as AdminRow, but for products it edits ALL of
   the item's gallery photos (up to 4), not just the cover image. Left/right
   arrows on the thumbnail flip through the photo slots; whichever slot is
   in view is the one the link/upload box updates. */
const AdminProductRow = ({ product, onSave, onReset }) => {
  const [viewIndex, setViewIndex] = useState(0);
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const savedTimerRef = useRef(null);
  const errorTimerRef = useRef(null);

  const images = product.images && product.images.length ? product.images : [product.img];
  const maxSlots = 4;
  const canAddSlot = images.length < maxSlots;
  const currentImg = images[viewIndex];

  useEffect(() => () => {
    clearTimeout(savedTimerRef.current);
    clearTimeout(errorTimerRef.current);
  }, []);

  useEffect(() => { setUrl(""); }, [viewIndex]);

  const flashSaved = () => {
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 1800);
  };

  const flashError = (msg) => {
    setError(msg);
    clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(""), 3000);
  };

  const goPrev = () => setViewIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setViewIndex((i) => (i + 1) % images.length);

  const handleSaveUrl = () => {
    const trimmed = url.trim();
    if (!trimmed || checking) return;
    setChecking(true);
    const tester = new window.Image();
    tester.onload = () => {
      setChecking(false);
      onSave(viewIndex, trimmed);
      setUrl("");
      flashSaved();
    };
    tester.onerror = () => {
      setChecking(false);
      flashError("Couldn't load that link — make sure it's a direct image URL (ending in .jpg/.png/etc), not a webpage link.");
    };
    tester.src = trimmed;
  };

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      flashError("That file isn't an image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      flashError("Image is too large — try one under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onSave(viewIndex, reader.result);
        flashSaved();
      }
    };
    reader.onerror = () => flashError("Couldn't read that file — try again.");
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    processFile(file);
  };

  const handleAddSlot = () => {
    if (!canAddSlot) return;
    setViewIndex(images.length); // move onto the next, not-yet-filled slot
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-start p-3 rounded-xl bg-surface2 border border-line">
      <div className="relative shrink-0 w-20 h-24">
        <ProductSwatch key={viewIndex} g={product.g} mark={product.mark} img={currentImg} alt={product.name} className="w-20 h-24 rounded-lg" />
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              aria-label="Previous photo"
              className="absolute left-0.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <ChevronLeft size={11} className="text-white" />
            </button>
            <button
              onClick={goNext}
              aria-label="Next photo"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <ChevronRight size={11} className="text-white" />
            </button>
          </>
        )}
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 f-mono text-[8px] text-white/90 bg-black/60 px-1.5 py-px rounded-full">
          {viewIndex + 1}/{images.length}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="f-head text-sm font-semibold truncate">{product.name}</p>
        <p className="f-mono text-xs text-muted mt-0.5 truncate">{product.cat} · {inr(product.price)} · editing photo {viewIndex + 1}</p>

        {/* Option A: paste a link, for whichever photo slot is currently in view */}
        <div className="flex items-center gap-2 mt-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveUrl(); }}
            placeholder={`Paste link for photo ${viewIndex + 1}`}
            className="gzr-input flex-1 rounded-lg px-3 py-2 text-xs"
          />
          <button
            onClick={handleSaveUrl}
            disabled={checking}
            className="btn-primary px-4 py-2 rounded-lg text-xs shrink-0 flex items-center gap-1.5 disabled:opacity-60"
          >
            {saved ? <Check size={13} /> : <Plus size={13} />} {checking ? "Checking..." : saved ? "Saved" : "Add"}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
          <span className="f-mono text-[10px] text-muted">OR</span>
          <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
        </div>

        {/* Option B: upload a file for whichever photo slot is currently in view */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
          className={`upload-zone mt-2 px-3 py-3 flex items-center justify-center gap-2 cursor-pointer ${isDragOver ? "drag-over" : ""}`}
        >
          <Upload size={14} className="text-violet shrink-0" />
          <span className="f-mono text-xs text-muted text-center">
            Upload photo {viewIndex + 1} from device or gallery
          </span>
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <div className="flex gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setViewIndex(idx)}
                aria-label={`Go to photo ${idx + 1}`}
                className="w-1.5 h-1.5 rounded-full transition-all"
                style={{ background: idx === viewIndex ? "var(--gold)" : "rgba(255,255,255,0.25)" }}
              />
            ))}
          </div>
          {canAddSlot && (
            <button onClick={handleAddSlot} className="f-mono text-[10px] text-violet hover:text-pink transition-colors">
              + Add photo slot ({images.length}/{maxSlots})
            </button>
          )}
        </div>

        {error && <p className="f-mono text-[10px] text-pink mt-2">{error}</p>}

        {onReset && (
          <button onClick={onReset} className="f-mono text-[10px] text-muted hover:text-pink transition-colors mt-2">
            Reset all photos to default
          </button>
        )}
      </div>
    </div>
  );
};

const AdminPanel = ({ open, onClose, products, collections, onUpdateProductImageAt, onUpdateCollectionImage, onResetProductImages, onResetCollectionImage, initialCategoryFilter }) => {
  const [tab, setTab] = useState("products");
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("All");

  // when opened via a "Edit photos" shortcut from a category page, jump
  // straight to the Products tab pre-filtered to that category
  useEffect(() => {
    if (open && initialCategoryFilter) {
      setTab("products");
      setCatFilter(initialCategoryFilter);
      setQuery("");
    }
  }, [open, initialCategoryFilter]);

  const productCategories = ["All", ...Array.from(new Set(products.map((p) => p.cat)))];

  const filteredProducts = products.filter((p) => {
    const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase());
    const matchesCat = catFilter === "All" || p.cat === catFilter;
    return matchesQuery && matchesCat;
  });

  return (
    <div className={`fixed inset-0 z-[90] drawer-backdrop ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div
        className="drawer-panel absolute right-0 top-0 h-full w-full sm:w-[30rem] bg-surface flex flex-col"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-line">
          <p className="f-head text-lg font-bold flex items-center gap-2"><Sparkles size={18} className="text-gold" /> Admin — Images</p>
          <button onClick={onClose} className="icon-btn" aria-label="Close admin panel"><X size={20} /></button>
        </div>

        <div className="px-5 pt-4 flex gap-2">
          <button onClick={() => setTab("products")} className={`chip px-4 py-2 rounded-full ${tab === "products" ? "chip-active" : "chip-inactive"}`}>Products</button>
          <button onClick={() => setTab("collections")} className={`chip px-4 py-2 rounded-full ${tab === "collections" ? "chip-active" : "chip-inactive"}`}>Collection tiles</button>
        </div>

        {tab === "products" && (
          <div className="px-5 pt-4 flex flex-col gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="gzr-input w-full rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {productCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={`chip px-3 py-1.5 rounded-full ${catFilter === c ? "chip-active" : "chip-inactive"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="f-mono text-[10px] text-muted">
              {filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""} in {catFilter === "All" ? "all categories" : catFilter}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          <p className="f-mono text-[11px] text-muted leading-relaxed flex items-start gap-1.5">
            <ImageIcon size={13} className="shrink-0 mt-0.5" />
            Paste a link, or tap "Upload from device or gallery" to pick a photo straight from this
            computer's files — or, on a phone, from the photo gallery or camera. Either way it updates
            the storefront immediately.
          </p>

          {tab === "products"
            ? filteredProducts.map((p) => (
                <AdminProductRow
                  key={p.id}
                  product={p}
                  onSave={(index, url) => onUpdateProductImageAt(p.id, index, url)}
                  onReset={() => onResetProductImages(p.id)}
                />
              ))
            : collections.map((c) => (
                <AdminRow
                  key={c.name}
                  label={c.name}
                  sub={c.sub}
                  currentImg={c.img}
                  mark={c.name.slice(0, 2).toUpperCase()}
                  g={c.g}
                  onSave={(url) => onUpdateCollectionImage(c.name, url)}
                  onReset={() => onResetCollectionImage(c.name)}
                />
              ))}
        </div>

        <div className="p-4 border-t border-line">
          <p className="f-mono text-[10px] text-muted leading-relaxed">
            Images are saved centrally, so once you update a photo here, every visitor sees it — not
            just this browser tab. This relies on the platform's storage, which is only available while
            this runs as a Claude artifact; if you deploy this app to your own hosting, you'll need to
            connect a real backend (e.g. Supabase, Firebase, or a small API) instead.
          </p>
        </div>
      </div>
    </div>
  );
};

/* --------------------------------- APP --------------------------------- */

/* --------------------------------- APP --------------------------------- */

const FEATURED_PRODUCT_ID = 3; // Glitch Pullover Hoodie

export default function App() {
  const [products, setProducts] = useState(PRODUCTS);
  const [collections, setCollections] = useState(COLLECTIONS);

  useEffect(() => {
    let cancelled = false;

    productApi
      .list()
      .then((data) => {
        if (cancelled) return;

        const databaseProducts = Array.isArray(data.products)
          ? data.products
          : [];

        setProducts(
          databaseProducts.map((product) => ({
            ...product,
            img: product.images?.[0] || "",
            sizes: Array.isArray(product.sizes)
              ? product.sizes
              : [],
          }))
        );
      })
      .catch((error) => {
        console.error(
          "Unable to load MongoDB products:",
          error
        );

        if (!cancelled) {
          setProducts(PRODUCTS);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [adminCategoryFilter, setAdminCategoryFilter] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const isAdmin = Boolean(isLoggedIn && user?.email && user.email.trim().toLowerCase() === ADMIN_EMAIL);

  // Restore a valid logged-in session after refresh and load MongoDB wishlist.
  useEffect(() => {
    if (!getToken()) return;
    authApi.me()
      .then(({ user: savedUser }) => {
        setUser(savedUser);
        setIsLoggedIn(true);
        setWishlist(savedUser.wishlist || []);
      })
      .catch(() => clearSession());
  }, []);

  // On load, pull any previously saved images out of persistent storage and
  // merge them over the defaults — this is what makes an admin's edits show
  // up for every visitor, not just in the tab that made them.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasStorage()) return;

      const productEntries = await Promise.all(
        PRODUCTS.map(async (p) => [p.id, await storageGet(`product-images:${p.id}`)])
      );
      if (!cancelled) {
        setProducts((prev) =>
          prev.map((p) => {
            const entry = productEntries.find(([id]) => id === p.id);
            if (!entry || !entry[1]) return p;
            try {
              const images = JSON.parse(entry[1]);
              if (Array.isArray(images) && images.length) return { ...p, images, img: images[0] };
            } catch {}
            return p;
          })
        );
      }

      const collectionEntries = await Promise.all(
        COLLECTIONS.map(async (c) => [c.name, await storageGet(`collection-image:${c.name}`)])
      );
      if (!cancelled) {
        setCollections((prev) =>
          prev.map((c) => {
            const entry = collectionEntries.find(([name]) => name === c.name);
            if (!entry || !entry[1]) return c;
            return { ...c, img: entry[1] };
          })
        );
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // opens Admin straight into Products, pre-filtered to the given category —
  // used by the "Edit photos" shortcut on a category page
  const openAdminForCategory = (category) => {
    setAdminCategoryFilter(category);
    setActiveCategory(null);
    setShowAdmin(true);
  };

  /* Collections drill-down: tap a tile -> activeCategory opens CategoryModal,
     tap an item inside -> activeProduct opens ProductDetailModal (with
     left/right nav scoped to that same category). */
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const categoryProducts = activeCategory ? products.filter((p) => p.cat === activeCategory) : [];

  /* New Drops (and hero featured card) drill-down: tap a card -> opens
     ProductFullPage, a dedicated full-screen page (not a modal). Left/right
     nav flips through the item's own photos, and a "more to explore" grid
     at the bottom lets people keep scrolling into other items in the same
     category instead of always hitting Back. */
  const [fullPageProduct, setFullPageProduct] = useState(null);
  const [fullPageSiblings, setFullPageSiblings] = useState([]);
  const openFullPageProduct = (p, siblings) => {
    setFullPageProduct(p);
    setFullPageSiblings(siblings || products.filter((x) => x.cat === p.cat));
  };

  const notify = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const addToCart = (p) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...p, qty: 1 }];
    });
    notify(`${p.name} added to bag`);
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const toggleWishlist = async (id) => {
    if (!isLoggedIn) {
      setShowLogin(true);
      notify("Please log in to save wishlist items");
      return;
    }
    const exists = wishlist.includes(id);
    // Optimistic update for a fast UI; rollback if API fails.
    setWishlist((prev) => exists ? prev.filter((x) => x !== id) : [...prev, id]);
    try {
      const data = exists ? await wishlistApi.remove(id) : await wishlistApi.add(id);
      setWishlist(data.wishlist);
      notify(exists ? "Removed from wishlist" : "Added to wishlist");
    } catch (error) {
      setWishlist((prev) => exists ? [...prev, id] : prev.filter((x) => x !== id));
      notify(error.message);
    }
  };

  const moveToCart = async (p) => {
    addToCart(p);
    if (wishlist.includes(p.id)) await toggleWishlist(p.id);
  };

  const checkout = () => {
    if (!isLoggedIn) {
      setShowCart(false);
      setShowLogin(true);
      notify("Please log in before checkout");
      return;
    }

    setShowCart(false);
    setShowCheckout(true);
  };

  const placeOrder = async (checkoutData) => {
    const data = await orderApi.create({
      items: cart.map((item) => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        size: item.size || "Not selected",
        image: item.img,
      })),
      paymentMethod: checkoutData.paymentMethod,
      shippingAddress: {
        line1: checkoutData.line1,
        line2: checkoutData.line2,
        city: checkoutData.city,
        state: checkoutData.state,
        postalCode: checkoutData.postalCode,
        country: "India",
      },
      phone: checkoutData.phone,
      landmark: checkoutData.landmark,
      deliveryInstructions: checkoutData.deliveryInstructions,
    });

    setCart([]);
    setShowCheckout(false);
    notify(`${data.message}. Order: ${data.order.orderNumber}`);
  };

  /* Admin edits: swap a product's cover photo, or a Collections tile's
     photo — either from a pasted URL or an uploaded file (which arrives
     here as a base64 data URL already). State updates immediately so the
     storefront reflects the change right away; the write to persistent
     storage happens alongside it so the change sticks for every visitor. */
  const updateProductImageAt = (id, index, url) => {
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id !== id) return p;
        const images = [...p.images];
        if (index < images.length) images[index] = url; // replace an existing photo
        else images.push(url); // fill a new slot (up to 4)
        return { ...p, images, img: images[0] };
      });
      const updated = next.find((p) => p.id === id);
      if (updated) {
        storageSet(`product-images:${id}`, JSON.stringify(updated.images)).then((ok) => {
          if (!ok && hasStorage()) notify("Saved here, but couldn't sync for other visitors");
        });
      }
      return next;
    });
    notify("Product image updated");
  };
  const updateCollectionImage = (name, url) => {
    setCollections((prev) => prev.map((c) => (c.name === name ? { ...c, img: url } : c)));
    storageSet(`collection-image:${name}`, url).then((ok) => {
      if (!ok && hasStorage()) notify("Saved here, but couldn't sync for other visitors");
    });
    notify("Collection image updated");
  };

  // Reset lets an admin undo a stored override and go back to the shipped
  // default photo — clears it from storage too, not just local state.
  const resetProductImages = (id) => {
    const original = PRODUCTS.find((p) => p.id === id);
    if (!original) return;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, images: original.images, img: original.images[0] } : p)));
    storageDelete(`product-images:${id}`);
    notify("Reset to default photos");
  };
  const resetCollectionImage = (name) => {
    const original = COLLECTIONS.find((c) => c.name === name);
    if (!original) return;
    setCollections((prev) => prev.map((c) => (c.name === name ? { ...c, img: original.img } : c)));
    storageDelete(`collection-image:${name}`);
    notify("Reset to default photo");
  };

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));
  const featuredProduct = products.find((p) => p.id === FEATURED_PRODUCT_ID) || products[0];

  return (
    <div className="gzr">
      <GlobalStyle />
      <div className="grain" />

      <Navbar
        onCart={() => setShowCart(true)}
        onWishlist={() => setShowWishlist(true)}
        onOrders={() => setShowOrders(true)}
        onLogin={() => setShowLogin(true)}
        onLogout={async () => { try { await authApi.logout(); } catch {} clearSession(); setIsLoggedIn(false); setUser(null); setWishlist([]); notify("Logged out"); }}
        onMenu={() => setShowMobileMenu(true)}
        cartCount={cart.reduce((s, i) => s + i.qty, 0)}
        wishCount={wishlist.length}
        isLoggedIn={isLoggedIn}
        user={user || { name: "" }}
        isAdmin={isAdmin}
        onAdmin={() => setShowAdmin(true)}
      />

      <Marquee />

      <Hero
        onShop={() => document.getElementById("drops")?.scrollIntoView({ behavior: "smooth" })}
        featured={featuredProduct}
        inWishlist={wishlist.includes(featuredProduct.id)}
        onToggleWishlist={toggleWishlist}
        onAddToCart={addToCart}
        onOpenFeatured={(p) => openFullPageProduct(p, products.filter((x) => x.cat === p.cat))}
      />

      <CollectionStrip onSelect={(cat) => setActiveCategory(cat)} collections={collections} />

      <ProductGrid products={products} wishlist={wishlist} onToggleWishlist={toggleWishlist} onAddToCart={addToCart} onOpenProduct={openFullPageProduct} />

      <CommunitySection />

      <Newsletter />

      <Footer />

      <CartDrawer
        open={showCart}
        onClose={() => setShowCart(false)}
        items={cart}
        onUpdateQty={updateQty}
        onRemove={removeFromCart}
        onCheckout={checkout}
      />
      <CheckoutModal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        cart={cart}
        user={user}
        onPlaceOrder={placeOrder}
      />

      <MyOrdersModal
        open={showOrders}
        onClose={() => setShowOrders(false)}
        notify={notify}
      />

      <WishlistDrawer
        open={showWishlist}
        onClose={() => setShowWishlist(false)}
        items={wishlistProducts}
        onRemove={toggleWishlist}
        onMoveToCart={moveToCart}
      />
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onLogin={async ({ mode, name, email, password }) => {
          const data = mode === "signup"
            ? await authApi.register({ name, email, password })
            : await authApi.login({ email, password });
          saveSession(data);
          setIsLoggedIn(true);
          setUser(data.user);
          setWishlist(data.user.wishlist || []);
          setShowLogin(false);
          const admin = data.user?.email?.trim().toLowerCase() === ADMIN_EMAIL;
          notify(admin ? "Welcome back, admin" : `Welcome, ${data.user.name}`);
        }}
      />
      <MobileMenu
        open={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        isLoggedIn={isLoggedIn}
        user={user || { name: "" }}
        onLogin={() => { setShowMobileMenu(false); setShowLogin(true); }}
        onLogout={async () => { try { await authApi.logout(); } catch {} clearSession(); setIsLoggedIn(false); setUser(null); setWishlist([]); setShowMobileMenu(false); notify("Logged out"); }}
      />

      <CategoryModal
        open={Boolean(activeCategory)}
        category={activeCategory}
        products={categoryProducts}
        collections={collections}
        onClose={() => setActiveCategory(null)}
        onOpenProduct={(p) => openFullPageProduct(p, products.filter((item) => item.cat === p.cat))}
        wishlist={wishlist}
        onToggleWishlist={toggleWishlist}
        onAddToCart={addToCart}
        isAdmin={isAdmin}
        onEditImages={openAdminForCategory}
      />

      <ProductFullPage
        open={Boolean(fullPageProduct)}
        product={fullPageProduct}
        siblings={fullPageSiblings}
        products={products}
        onClose={() => setFullPageProduct(null)}
        onNavigate={(p) => openFullPageProduct(p, products.filter((x) => x.cat === p.cat))}
        onAddToCart={addToCart}
        wishlist={wishlist}
        onToggleWishlist={toggleWishlist}
        user={user}
      />

      <AdminDashboard
  open={showAdmin}
  onClose={() => {
    setShowAdmin(false);
    setAdminCategoryFilter(null);
  }}
/>
      <Toast message={toast} />
    </div>
  );
}