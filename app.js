const $ = id => document.getElementById(id);
const fmt = n => isFinite(n) ? Math.round(n).toLocaleString("ru-RU") : "∞";
const money = n => (n < 0 ? "−" : "") + "$" + fmt(Math.abs(n));
const icon = m => `<svg><use href="#i-${m}"/></svg>`;
let S = Object.assign({}, DEFAULT_SETTINGS);
try { Object.assign(S, JSON.parse(localStorage.getItem("tpf2settings") || "{}")); } catch (e) {}
const saveSettings = () => { try { localStorage.setItem("tpf2settings", JSON.stringify(S)); } catch (e) {} };

// вкладки
$("tabs").querySelectorAll("button").forEach(b => b.onclick = () => {
  $("tabs").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
  document.querySelectorAll("section.tab").forEach(s => s.hidden = s.id !== b.dataset.tab);
  window.scrollTo({ top: 0 });
});

// темы оформления (сохраняются в localStorage)
const THEMES = [
  ["auto", "Как в системе", "#f2eee6", "#151d1a", "#3fcf9b"],
  ["light", "Бумага", "#f2eee6", "#fffdf8", "#1f6f54"],
  ["dark", "Графит", "#0d1311", "#151d1a", "#3fcf9b"],
  ["metro", "Метро", "#eef2f7", "#ffffff", "#1d4ed8"],
  ["desert", "Пустыня", "#f6ece0", "#fffaf3", "#c2410c"],
  ["depot", "Депо", "#15110c", "#1e1912", "#e8a33d"],
  ["night", "Ночной экспресс", "#0f0d1a", "#18152a", "#a78bfa"],
  ["contrast", "Контраст", "#000000", "#0b0b0b", "#ffd400"]
];
let theme = "auto";
try { theme = localStorage.getItem("tpf2theme") || "auto"; } catch (e) {}
function applyTheme(t) {
  theme = t;
  if (t === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  try { localStorage.setItem("tpf2theme", t); } catch (e) {}
  document.querySelectorAll("[data-themes]").forEach(box => box.innerHTML = THEMES.map(([id, nm, a, b, c]) =>
    `<button type="button" class="th ${id === theme ? "on" : ""}" data-t="${id}"><span class="sw"><i style="background:${a}"></i><i style="background:${c}"></i></span>${nm}</button>`).join(""));
  document.querySelectorAll(".th").forEach(b => b.onclick = () => applyTheme(b.dataset.t));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue("--brand").trim();
  if (typeof run === "function" && $("vehicle").value) run();
}
$("themeBtn").onclick = e => { e.stopPropagation(); const p = $("themePop"); p.hidden = !p.hidden; $("themeBtn").setAttribute("aria-expanded", !p.hidden); };
document.addEventListener("click", e => { if (!$("themePop").contains(e.target) && !e.target.closest(".th")) $("themePop").hidden = true; });
document.addEventListener("keydown", e => { if (e.key === "Escape") $("themePop").hidden = true; });

// лайфхаки
const TIPS = [
  ["Старт на коротких линиях", "Грузовики между шахтой и заводом на 5–15 км. Корабли — часто лёгкий ранний профит при большом объёме."],
  ["Не удлиняйте путь", "Оплата идёт по прямой, а расходы — по длине пути. Спрямляйте трассу."],
  ["Скорость под линию", "Дорогой скоростной состав на коротком отрезке не разгоняется, а содержится дороже."],
  ["Следите за загрузкой", "Добавляйте ТС, пока на станции копится груз; убирайте, если ездят пустыми."],
  ["Двухпутка и сигналы", "На загруженных линиях нужны два пути и короткие блок-участки; избегайте ветвлений под потоком."],
  ["Грузовики → рельсы", "Большой поток на дороге забивает станции и пробками съедает прибыль. Переходите на поезда."],
  ["Пассажиры — в обе стороны", "Линии между крупными кварталами; почту возите отдельной грузовой линией."],
  ["Дробите длинные маршруты", "Пересадки оплачиваются по каждому плечу — используйте узловые станции."],
  ["Закрывайте цепочку", "Везите и сырьё, и готовую продукцию: вторая половина цепочки платит больше."],
  ["Обновляйте парк", "Новые модели быстрее и вместительнее, но сначала проверьте окупаемость."],
  ["Займы — под быстрые линии", "Берите кредит на проекты с окупаемостью до ~3 лет."],
  ["Сохраняйтесь", "Перед крупной стройкой — сохранение; строить удобно на паузе."]
];
$("tipGrid").innerHTML = TIPS.map(([t, d]) => `<div class="tip"><b>${t}</b><span>${d}</span></div>`).join("");

// состояние формы
let mode = "road";
$("cargo").innerHTML = CARGO.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
const curCargo = () => CARGO.find(c => c.id === $("cargo").value);

function fillModes() {
  const kind = curCargo().kind;
  const avail = Object.keys(MODES).filter(m => VEHICLES.some(v => v.mode === m && v.kind === kind));
  if (!avail.includes(mode)) mode = avail[0];
  $("modeSeg").innerHTML = Object.keys(MODES).map(m =>
    `<button type="button" data-m="${m}" class="${m === mode ? "on" : ""} ${avail.includes(m) ? "" : "na"}" title="${avail.includes(m) ? "" : "Только пассажиры — нажмите, чтобы переключить"}">${icon(m)}<span>${MODES[m].name.split(" ")[0]}</span></button>`).join("");
  $("modeSeg").querySelectorAll("button").forEach(b => b.onclick = () => {
    mode = b.dataset.m;
    if (!VEHICLES.some(v => v.mode === mode && v.kind === curCargo().kind))
      $("cargo").value = CARGO.find(c => VEHICLES.some(v => v.mode === mode && v.kind === c.kind)).id;
    fillModes(); run();
  });
  const na = Object.keys(MODES).filter(m => !avail.includes(m)).map(m => MODES[m].name.split(" ")[0]);
  $("modeHint").textContent = na.length ? `${na.join(", ")} — только для пассажиров (в игре без модов). Нажмите, чтобы переключить груз.` : "";
  $("vehicle").innerHTML = VEHICLES.filter(v => v.mode === mode && v.kind === kind)
    .map(v => `<option value="${v.id}">${v.name}</option>`).join("");
}
$("cargo").onchange = () => { fillModes(); run(); };
fillModes();

// ползунок + число
function bind(rng, num, out, suffix) {
  const upd = v => { out.textContent = Math.round(v * 10) / 10 + " " + suffix; };
  rng.oninput = () => { num.value = rng.value; upd(+rng.value); run(); };
  num.oninput = () => { if (+num.value > 0) rng.value = num.value; upd(+num.value || 0); run(); };
  upd(+num.value);
}
bind($("distR"), $("dist"), $("distOut"), "км");
bind($("volR"), $("vol"), $("volOut"), "ед./мес");
["path", "infra", "twoway", "vehicle"].forEach(id => $(id).oninput = run);

function params() {
  const dKm = Math.max(0.1, +$("dist").value || 0.1);
  const pk = +$("path").value, inf = $("infra").value.trim();
  return { dKm, pathKm: pk > 0 ? pk : dKm * 1.2, volMonth: Math.max(1, +$("vol").value || 1),
           infra: inf === "" ? null : +inf, twoWay: $("twoway").checked };
}

function paybackInfo(y) {
  if (!isFinite(y)) return ["Не окупается", "bad"];
  if (y < 2) return ["Очень быстро", ""];
  if (y < 5) return ["Хорошо", ""];
  if (y < 10) return ["Долго", ""];
  return ["Очень долго", "bad"];
}

const short = n => {
  const a = Math.abs(n), s = n < 0 ? "−" : "";
  if (a >= 1e6) return s + "$" + +(a / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return s + "$" + Math.round(a / 1e3) + "k";
  return s + "$" + Math.round(a);
};
function niceStep(x) {
  const p = Math.pow(10, Math.floor(Math.log10(x || 1))), f = x / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

// Столбцы: баланс проекта (всё заработанное минус вложения) на конец каждого года.
function chart(r) {
  const W = Math.max(280, ($("result").clientWidth || 600) - 38), H = W < 420 ? 220 : 260;
  const pl = 52, pr = 10, pt = 26, pb = 26, pw = W - pl - pr, ph = H - pt - pb;
  const N = Math.min(15, Math.max(5, isFinite(r.payback) ? Math.ceil(r.payback * 2) : 8));
  const vals = Array.from({ length: N + 1 }, (_, i) => r.profit * i - r.capex);
  const step = niceStep((Math.max(0, ...vals) - Math.min(0, ...vals)) / 4);
  const lo = Math.floor(Math.min(0, ...vals) / step) * step, hi = Math.ceil(Math.max(0, ...vals) / step) * step || step;
  const Y = v => pt + ph * (1 - (v - lo) / (hi - lo)), slot = pw / (N + 1), bw = Math.min(34, slot * 0.62);
  const cx = i => pl + slot * (i + 0.5);
  let g = "";
  for (let v = lo; v <= hi + step / 2; v += step)
    g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" class="${v === 0 ? "zero" : "grid"}"/><text x="${pl - 8}" y="${Y(v) + 4}" text-anchor="end">${short(v)}</text>`;
  const every = N > 10 && W < 500 ? 2 : 1;
  vals.forEach((v, i) => {
    const y = Math.min(Y(v), Y(0)), h = Math.max(1.5, Math.abs(Y(v) - Y(0)));
    g += `<rect x="${cx(i) - bw / 2}" y="${y}" width="${bw}" height="${h}" rx="4" fill="var(${v < 0 ? "--bad" : "--good"})"><title>${i ? i + "-й год" : "Старт"}: ${money(v)}</title></rect>`;
    if (i % every === 0) g += `<text x="${cx(i)}" y="${H - 8}" text-anchor="middle">${i ? i : "старт"}</text>`;
  });
  if (isFinite(r.payback) && r.payback <= N) {
    const x = cx(0) + r.payback * slot, lbl = `окупится за ${r.payback.toFixed(1)} г.`, tw = lbl.length * 6.4 + 16;
    const lx = Math.min(Math.max(x - tw / 2, pl), W - pr - tw);
    g += `<line x1="${x}" x2="${x}" y1="${pt - 4}" y2="${pt + ph}" class="be"/><rect x="${lx}" y="2" width="${tw}" height="20" rx="10" fill="var(--amber)"/><text x="${lx + tw / 2}" y="16" text-anchor="middle" class="bel">${lbl}</text>`;
  }
  return `<p class="chartnote">Вложено <b>${money(r.capex)}</b> на старте. ${r.profit > 0
      ? `Через ${N} лет на счёте проекта будет <b class="pos">${money(vals[N])}</b>.`
      : `Линия убыточна: каждый год минус <b class="neg">${money(-r.profit)}</b>.`}</p>
    <svg class="chart" width="${W}" height="${H}" style="width:${W}px;height:${H}px" viewBox="0 0 ${W} ${H}">${g}</svg>
    <div class="legend"><span><i class="dot" style="background:var(--bad)"></i>ещё не окупилось</span><span><i class="dot" style="background:var(--good)"></i>в плюсе</span><span>по оси X — годы работы</span></div>`;
}
let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(run, 150); });

function run() {
  const cargo = curCargo(), veh = VEHICLES.find(v => v.id === $("vehicle").value);
  if (!veh) return;
  const p = params(), r = evaluate(veh, cargo, p, S);
  const [label, cls] = paybackInfo(r.payback);
  const tot = r.revenue || 1, costPct = Math.min(100, Math.max(0, r.costs / tot * 100));
  $("result").innerHTML = `
    <div class="hero">
      <div><div class="lbl">Окупаемость</div><div class="big">${isFinite(r.payback) ? r.payback.toFixed(1) + " <small style='font-size:.5em;font-weight:700'>лет</small>" : "—"}</div>
        <span class="pill ${cls}">${label}</span></div>
      <div><div class="lbl">Нужно транспорта</div><div class="big">${r.n}</div>
        <div class="sub">интервал ~${r.headwayH.toFixed(1)} ч</div></div>
    </div>
    <div class="grid">
      <div class="m"><span>Цена за 1 ед.</span><b>${money(r.price)}</b></div>
      <div class="m"><span>Выручка / год</span><b>${money(r.revenue)}</b></div>
      <div class="m"><span>Расходы / год</span><b>${money(r.costs)}</b></div>
      <div class="m ${r.profit > 0 ? "pos" : "neg"}"><span>Прибыль / год</span><b>${money(r.profit)}</b></div>
      <div class="m"><span>Вложения</span><b>${money(r.capex)}</b><small>ТС ${money(r.n * veh.price)} · инфра. ${money(r.infra)}</small></div>
      <div class="m"><span>Рейс туда-обратно</span><b>${r.roundTripH.toFixed(1)} ч</b><small>${fmt(r.tripsYear)} рейсов/год на ТС</small></div>
    </div>
    <div class="card"><h3>Выручка и расходы</h3>
      <div class="split"><i class="a" style="width:${costPct}%"></i><i class="b" style="width:${100 - costPct}%"></i></div>
      <div class="legend"><span><i class="dot" style="background:var(--bad)"></i>Расходы <b>${short(r.costs)}</b> (${costPct.toFixed(0)}%)</span><span><i class="dot" style="background:var(--good)"></i>Прибыль <b>${short(r.profit)}</b> (${(100 - costPct).toFixed(0)}%)</span></div></div>
    <div class="card"><h3>Баланс проекта по годам</h3>${chart(r)}</div>
    <div class="advice">${icon("bulb")}<div>${advise(cargo, p.dKm)}</div></div>
    ${r.warnings.map(w => `<div class="warn">⚠ ${w}</div>`).join("")}`;
  renderCompare(cargo, p);
}

function renderCompare(cargo, p) {
  const rows = compareAll(cargo, p, S);
  const finite = rows.filter(r => isFinite(r.payback) && !r.off).map(r => r.payback);
  const maxP = Math.max(...finite, 1);
  $("compareNote").textContent = `${cargo.name} · ${p.dKm} км по прямой · ${p.volMonth} ед./мес`;
  $("compareList").innerHTML = rows.map((r, i) => {
    const w = isFinite(r.payback) ? Math.max(6, 100 - r.payback / (maxP * 1.15) * 100) : 4;
    return `<div class="row ${i === 0 && !r.off ? "best" : ""} ${r.off ? "off" : ""}">
      <div class="ic">${icon(r.veh.mode)}</div>
      <div><div class="nm">${r.veh.name}${i === 0 && !r.off ? '<span class="tag">ЛУЧШИЙ</span>' : ""}</div>
        <div class="md">${MODES[r.veh.mode].name} · нужно ${r.n} шт.</div>
        <div class="bar"><i style="width:${w}%"></i></div></div>
      <div class="num"><b>${isFinite(r.payback) ? r.payback.toFixed(1) + " лет" : "не окупается"}</b><small>${money(r.profit)}/год · вложения ${money(r.capex)}</small></div></div>`;
  }).join("");
}

// настройки
const SET_FIELDS = [
  ["cal", "Калибровка цены (×)"], ["difficulty", "Множитель сложности"], ["refSpeed", "Опорная скорость, км/ч"],
  ["speedExp", "Степень влияния скорости"], ["uptime", "Доля времени в работе (0–1)"],
  ["loadFactor", "Средняя загрузка (0–1)"], ["upkeepRate", "Обслуживание/год от цены ТС"],
  ["perKmCost", "Эксплуатация: доля цены за км"]
];
$("settingsForm").innerHTML = SET_FIELDS.map(([k, l]) =>
  `<label class="fld">${l}<input type="number" inputmode="decimal" step="any" id="s_${k}" value="${S[k]}"></label>`).join("");
SET_FIELDS.forEach(([k]) => $("s_" + k).oninput = e => { const v = parseFloat(e.target.value); if (!isNaN(v)) { S[k] = v; saveSettings(); run(); } });
$("resetSettings").onclick = () => { S = Object.assign({}, DEFAULT_SETTINGS); saveSettings(); SET_FIELDS.forEach(([k]) => $("s_" + k).value = S[k]); run(); };
$("calibrate").onclick = () => {
  const obs = parseFloat($("obsPrice").value);
  if (!(obs > 0)) return;
  const veh = VEHICLES.find(v => v.id === $("vehicle").value);
  const cur = unitPrice(curCargo(), params().dKm, veh, S);
  S.cal *= obs / cur; saveSettings(); $("s_cal").value = S.cal.toFixed(4); run();
};
applyTheme(theme);
run();
