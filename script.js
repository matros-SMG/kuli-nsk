(() => {
  const $ = (id) => document.getElementById(id);
  const SITE = window.SITE, CATALOG = window.CATALOG;
  const cart = {}; // id -> количество

  const fmtRub = (n) => Math.round(n).toLocaleString("ru-RU").replace(/ /g, " ") + " руб.";
  const fmtQty = (q, unit) => String(q).replace(".", ",") + " " + unit + ".";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const MINUS = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 12h12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>';
  const PLUS = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>';

  // ---- каталог ----
  const list = $("catalogList");
  list.innerHTML = CATALOG.map((p) => `
    <li class="card" data-id="${p.id}">
      ${p.photo ? `<img class="card__img" src="${p.photo}" alt="${esc(p.name)}" loading="lazy" width="400" height="300">` : `<div class="card__ph">Фото скоро добавим</div>`}
      <div class="card__body">
        <h3>${esc(p.name)}</h3>
        <p class="card__desc">${esc(p.desc)}</p>
        <div class="card__row">
          <span class="price">${p.price} руб. <small>/ ${p.unit}.</small></span>
          <span class="qty">
            <button type="button" data-act="dec" aria-label="Убрать ${esc(p.name)}" disabled>${MINUS}</button>
            <output data-q>0</output>
            <button type="button" data-act="inc" aria-label="Добавить ${esc(p.name)}">${PLUS}</button>
          </span>
        </div>
      </div>
    </li>`).join("");

  function setQty(id, q) {
    const p = CATALOG.find((x) => x.id === id);
    q = Math.max(0, Math.round(q * 2) / 2);
    if (p.step === 1) q = Math.round(q);
    if (q > 99) q = 99;
    if (q) cart[id] = q; else delete cart[id];
    render();
  }

  list.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const id = b.closest(".card").dataset.id;
    const p = CATALOG.find((x) => x.id === id);
    const cur = cart[id] || 0;
    setQty(id, cur + (b.dataset.act === "inc" ? p.step : -p.step));
  });

  const cartList = $("cartList");
  cartList.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const id = b.closest("li").dataset.id;
    const p = CATALOG.find((x) => x.id === id);
    setQty(id, (cart[id] || 0) + (b.dataset.act === "inc" ? p.step : -p.step));
  });

  // ---- сообщение ----
  function buildMessage() {
    const lines = ["Здравствуйте! Хочу заказать в Кули:"];
    let total = 0;
    CATALOG.forEach((p) => {
      const q = cart[p.id];
      if (!q) return;
      const sum = q * p.price;
      total += sum;
      lines.push(`- ${p.name}: ${fmtQty(q, p.unit)} x ${p.price} руб. = ${fmtRub(sum)}`);
    });
    lines.push("Итого: " + fmtRub(total));
    const c = $("comment").value.trim();
    lines.push("Комментарий (надпись, время, аллергии): " + (c || "-"));
    return lines.join("\n");
  }

  function render() {
    let total = 0, count = 0;
    CATALOG.forEach((p) => {
      const q = cart[p.id] || 0;
      const card = list.querySelector(`[data-id="${p.id}"]`);
      card.querySelector("[data-q]").textContent = q ? String(q).replace(".", ",") + " " + p.unit + "." : "0";
      card.querySelector('[data-act="dec"]').disabled = !q;
      total += q * p.price;
      if (q) count++;
    });
    $("emptyCart").hidden = count > 0;
    $("cartBox").hidden = count === 0;
    $("cartbar").hidden = count === 0;
    $("cartbarText").textContent = "Заказ: " + fmtRub(total);
    $("totalSum").textContent = fmtRub(total);
    cartList.innerHTML = CATALOG.filter((p) => cart[p.id]).map((p) => `
      <li data-id="${p.id}">
        <div class="cart__name"><b>${esc(p.name)}</b><span>${p.price} руб. / ${p.unit}.</span></div>
        <span class="qty">
          <button type="button" data-act="dec" aria-label="Убрать ${esc(p.name)}">${MINUS}</button>
          <output>${String(cart[p.id]).replace(".", ",")} ${p.unit}.</output>
          <button type="button" data-act="inc" aria-label="Добавить ${esc(p.name)}">${PLUS}</button>
        </span>
        <span class="cart__sum">${fmtRub(cart[p.id] * p.price)}</span>
      </li>`).join("");
    updateMessage();
  }

  function updateMessage() {
    const msg = buildMessage();
    $("msgPreview").textContent = msg;
    $("waBtn").href = "https://wa.me/" + SITE.wa + "?text=" + encodeURIComponent(msg);
  }
  $("comment").addEventListener("input", updateMessage);

  $("copyBtn").addEventListener("click", async () => {
    const msg = buildMessage();
    let ok = false;
    try { await navigator.clipboard.writeText(msg); ok = true; } catch (_) {}
    if (!ok) {
      const ta = document.createElement("textarea");
      ta.value = msg; ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch (_) {}
      ta.remove();
    }
    const l = $("copyLabel");
    l.textContent = ok ? "Скопировано" : "Не вышло, скопируйте из текста ниже";
    if (!ok) document.querySelector(".preview").open = true;
    setTimeout(() => { l.textContent = "Скопировать текст"; }, 2200);
  });

  // ---- отзывы ----
  $("reviewsList").innerHTML = window.REVIEWS.map((r) => `
    <li class="review"><span class="stars" aria-label="5 из 5"></span>
      <p>${esc(r.text)}</p><cite>${esc(r.author)}, ${esc(r.date)}</cite></li>`).join("");

  // ---- галерея и лупа ----
  const G = window.GALLERY;
  const LENS = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.500" cy="10.500" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 15l5 5M10.500 8v5M8 10.500h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
  $("galleryList").innerHTML = G.map((g, i) => `
    <li><button type="button" data-i="${i}" aria-label="Открыть крупно: ${esc(g.alt)}">
      <img src="${g.src}" alt="${esc(g.alt)}" loading="lazy" width="300" height="400"><span class="lens">${LENS}</span></button></li>`).join("");

  const lb = $("lb"), lbImg = $("lbImg"), stage = $("lbStage");
  let cur = 0, LIST = G;
  function show(i) {
    cur = (i + LIST.length) % LIST.length;
    stage.classList.remove("is-zoom");
    lbImg.src = LIST[cur].src; lbImg.alt = LIST[cur].alt;
    $("lbCap").textContent = LIST[cur].alt + " (" + (cur + 1) + " из " + LIST.length + ")";
  }
  function open(i) { show(i); lb.hidden = false; document.body.style.overflow = "hidden"; $("lbClose").focus(); }
  function close() { lb.hidden = true; document.body.style.overflow = ""; document.dispatchEvent(new Event("lb:closed")); }
  window.openPhotos = (list, i) => { LIST = list; open(i); };
  $("galleryList").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (b) { LIST = G; open(+b.dataset.i); }
  });
  $("lbClose").addEventListener("click", close);
  $("lbPrev").addEventListener("click", () => show(cur - 1));
  $("lbNext").addEventListener("click", () => show(cur + 1));
  lbImg.addEventListener("click", () => {
    const z = stage.classList.toggle("is-zoom");
    if (z) { stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2; stage.scrollTop = (stage.scrollHeight - stage.clientHeight) / 2; }
  });
  stage.addEventListener("click", (e) => { if (e.target === stage) close(); });
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(cur - 1);
    if (e.key === "ArrowRight") show(cur + 1);
  });

  render();
})();
