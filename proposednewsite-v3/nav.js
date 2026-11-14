/* =========================================================
   NAV MENU (phone only)
   The menu button opens and closes the drop-down inside the
   nav bar. CSS does all the animation; this file only flips
   data-open="true/false" and keeps the screen-reader labels right.
   ========================================================= */

const nav = document.querySelector(".nav");
const toggle = nav.querySelector(".nav__toggle");
const menu = nav.querySelector(".nav__menu");

// Open or close the menu
function setOpen(open) {
  nav.dataset.open = open ? "true" : "false";
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

// Tap the button: flip it
toggle.addEventListener("click", () => {
  setOpen(nav.dataset.open !== "true");
});

// Tap a link in the menu: close it (the page is about to move)
menu.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    setOpen(false);
  }
});

// Tap anywhere outside the bar: close it
document.addEventListener("click", (event) => {
  if (!nav.contains(event.target)) {
    setOpen(false);
  }
});

// Escape key: close it
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setOpen(false);
  }
});

// Widened past phone size: close it, so it isn't stuck open later
window.matchMedia("(max-width: 760px)").addEventListener("change", () => {
  setOpen(false);
});
