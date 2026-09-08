"use strict";
document.addEventListener("DOMContentLoaded", () => {
  const headerHost = document.querySelector("[data-site-header]");
  const footerHost = document.querySelector("[data-site-footer]");
  if (headerHost) headerHost.outerHTML = `<header class="site-header"><div class="shell header-inner"><a class="brand" href="/" aria-label="WidgetYard home"><img src="/assets/logo.svg" alt="WidgetYard" width="214" height="46"></a><button class="menu-button" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button><nav class="site-nav" id="site-nav" aria-label="Primary"><a href="/">Tools</a><a href="/about/">About</a><a class="nav-cta" href="/?q=">Find a tool</a></nav></div></header>`;
  if (footerHost) footerHost.outerHTML = `<footer class="site-footer"><div class="shell footer-grid"><a class="brand footer-brand" href="/"><img src="/assets/logo-light.svg" alt="WidgetYard" width="214" height="46"></a><p>Small tools for getting unstuck.</p><nav aria-label="Footer"><a href="/about/">About</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav><p class="copyright">© <span data-year></span> WidgetYard</p></div></footer>`;
  const menuButton = document.querySelector(".menu-button");
  const nav = document.querySelector(".site-nav");
  if (menuButton && nav) menuButton.addEventListener("click", () => { const open = nav.classList.toggle("is-open"); menuButton.setAttribute("aria-expanded", String(open)); });
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  const search = document.querySelector("#tool-search");
  const cards = [...document.querySelectorAll(".tool-card")];
  const chips = [...document.querySelectorAll(".chip")];
  const status = document.querySelector("#search-status");
  const empty = document.querySelector("#empty-state");
  let category = "all";
  const filterTools = () => {
    const term = (search?.value || "").trim().toLowerCase(); let visible = 0;
    cards.forEach((card) => { const show = card.textContent.toLowerCase().includes(term) && (category === "all" || card.dataset.category === category); card.hidden = !show; if (show) visible++; });
    if (status) status.textContent = `${visible} tool${visible === 1 ? "" : "s"} ready to use`;
    if (empty) empty.hidden = visible !== 0;
  };
  if (search) {
    const initial = new URLSearchParams(location.search).get("q"); if (initial) search.value = initial;
    search.addEventListener("input", filterTools);
    document.addEventListener("keydown", (event) => { if (event.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { event.preventDefault(); search.focus(); } });
    filterTools();
  }
  chips.forEach((chip) => chip.addEventListener("click", () => { category = chip.dataset.filter; chips.forEach((item) => item.classList.toggle("is-active", item === chip)); filterTools(); }));
});
