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

function chart(r) {
  const W = 300, H = 120, pl = 8, pr = 8, pt = 10, pb = 18;
  const years = Math.min(20, Math.max(5, isFinite(r.payback) ? Math.ceil(r.payback * 1.8) : 10));
  const y0 = -r.capex, y1 = r.profit * years - r.capex;
  const lo = Math.min(y0, y1, 0), hi = Math.max(y0, y1, 0), span = (hi - lo) || 1;
  const X = t => pl + (W - pl - pr) * t / years, Y = v => pt + (H - pt - pb) * (1 - (v - lo) / span);
  const zero = Y(0), end = Y(y1), start = Y(y0);
  let be = "";
  if (isFinite(r.payback) && r.payback <= years) be = `<circle cx="${X(r.payback)}" cy="${zero}" r="4.5" fill="var(--amber)"/><text x="${Math.min(X(r.payback), W - 40)}" y="${zero - 8}">${r.payback.toFixed(1)} г.</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:auto;aspect-ratio:${W}/${H}">
    <line x1="${pl}" x2="${W - pr}" y1="${zero}" y2="${zero}" stroke="var(--line)" stroke-width="1.5" stroke-dasharray="3 3"/>
    <path d="M${X(0)} ${start} L${X(years)} ${end}" stroke="${r.profit > 0 ? "var(--good)" : "var(--bad)"}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${be}<text x="${pl}" y="${H - 4}">0</text><text x="${W - pr - 28}" y="${H - 4}">${years} лет</text></svg>`;
}

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
      <div class="legend"><span><i class="dot" style="background:var(--bad)"></i>Расходы <b>${costPct.toFixed(0)}%</b></span><span><i class="dot" style="background:var(--good)"></i>Остаётся <b>${(100 - costPct).toFixed(0)}%</b></span></div></div>
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
run();
