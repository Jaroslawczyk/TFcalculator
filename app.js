const $ = id => document.getElementById(id);
const fmt = n => isFinite(n) ? Math.round(n).toLocaleString("ru-RU") : "∞";
const money = n => (n < 0 ? "−" : "") + "$" + fmt(Math.abs(n));
let S = Object.assign({}, DEFAULT_SETTINGS);
try { Object.assign(S, JSON.parse(localStorage.getItem("tpf2settings") || "{}")); } catch (e) {}

function saveSettings() { try { localStorage.setItem("tpf2settings", JSON.stringify(S)); } catch (e) {} }

// Вкладки
document.querySelectorAll("nav button").forEach(b => b.onclick = () => {
  document.querySelectorAll("nav button").forEach(x => x.classList.toggle("active", x === b));
  document.querySelectorAll("section.tab").forEach(s => s.hidden = s.id !== b.dataset.tab);
});

// Заполнение селектов
$("cargo").innerHTML = CARGO.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
function fillVehicles() {
  const cargo = CARGO.find(c => c.id === $("cargo").value);
  $("vehicle").innerHTML = VEHICLES.filter(v => v.kind === cargo.kind)
    .map(v => `<option value="${v.id}">${MODES[v.mode].name}: ${v.name}</option>`).join("");
}
$("cargo").onchange = () => { fillVehicles(); run(); };
fillVehicles();

function params() {
  const dKm = Math.max(0.1, +$("dist").value || 0.1);
  const pk = +$("path").value;
  const inf = $("infra").value.trim();
  return { dKm, pathKm: pk > 0 ? pk : dKm * 1.2, volMonth: Math.max(1, +$("vol").value || 1),
           infra: inf === "" ? null : +inf, twoWay: $("twoway").checked };
}

function run() {
  const cargo = CARGO.find(c => c.id === $("cargo").value);
  const veh = VEHICLES.find(v => v.id === $("vehicle").value);
  const p = params();
  const r = evaluate(veh, cargo, p, S);
  const profitCls = r.profit > 0 ? "good" : "bad";
  $("result").innerHTML = `
    <div class="cards">
      <div class="card big"><span>Нужно ТС</span><b>${r.n}</b><small>интервал ~${r.headwayH.toFixed(1)} ч</small></div>
      <div class="card"><span>Цена за 1 ед.</span><b>${money(r.price)}</b></div>
      <div class="card"><span>Выручка / год</span><b>${money(r.revenue)}</b></div>
      <div class="card"><span>Расходы / год</span><b>${money(r.costs)}</b></div>
      <div class="card ${profitCls}"><span>Прибыль / год</span><b>${money(r.profit)}</b></div>
      <div class="card"><span>Вложения</span><b>${money(r.capex)}</b><small>ТС ${money(r.n * veh.price)} + инфра. ${money(r.infra)}</small></div>
      <div class="card ${profitCls}"><span>Окупаемость</span><b>${isFinite(r.payback) ? r.payback.toFixed(1) + " лет" : "не окупается"}</b></div>
      <div class="card"><span>Рейс туда-обратно</span><b>${r.roundTripH.toFixed(1)} ч</b><small>${r.tripsYear.toFixed(0)} рейсов/год на ТС</small></div>
    </div>
    <p class="advice">💡 ${advise(cargo, p.dKm)}</p>
    ${r.warnings.map(w => `<p class="warn">⚠ ${w}</p>`).join("")}`;
  renderCompare(cargo, p);
}

function renderCompare(cargo, p) {
  const rows = compareAll(cargo, p, S);
  $("compareBody").innerHTML = rows.map((r, i) => `
    <tr class="${i === 0 && !r.off ? "best" : ""}" ${r.off ? 'style="opacity:.5" title="Вне оптимальной дистанции"' : ""}>
      <td>${MODES[r.veh.mode].name}</td><td>${r.veh.name}</td><td>${r.n}</td>
      <td>${money(r.profit)}</td><td>${money(r.capex)}</td>
      <td>${isFinite(r.payback) ? r.payback.toFixed(1) : "∞"}</td></tr>`).join("");
  $("compareNote").textContent = `Груз: ${cargo.name}, прямая ${p.dKm} км, путь ${p.pathKm.toFixed(1)} км, ${p.volMonth} ед./мес. Лучший по окупаемости подсвечен.`;
}

["dist", "path", "vol", "infra", "twoway", "vehicle"].forEach(id => $(id).oninput = run);

// Настройки
const SET_FIELDS = [
  ["cal", "Калибровка цены (×)"], ["difficulty", "Множитель сложности"], ["refSpeed", "Опорная скорость, км/ч"],
  ["speedExp", "Степень влияния скорости"], ["uptime", "Доля времени в работе (0–1)"],
  ["loadFactor", "Средняя загрузка (0–1)"], ["upkeepRate", "Обслуживание/год от цены ТС"],
  ["perKmCost", "Эксплуатация: доля цены за км"]
];
$("settingsForm").innerHTML = SET_FIELDS.map(([k, l]) =>
  `<label>${l}<input type="number" step="any" id="s_${k}" value="${S[k]}"></label>`).join("");
SET_FIELDS.forEach(([k]) => $("s_" + k).oninput = e => { const v = parseFloat(e.target.value); if (!isNaN(v)) { S[k] = v; saveSettings(); run(); } });
$("resetSettings").onclick = () => { S = Object.assign({}, DEFAULT_SETTINGS); saveSettings(); SET_FIELDS.forEach(([k]) => $("s_" + k).value = S[k]); run(); };
$("calibrate").onclick = () => {
  const obs = parseFloat($("obsPrice").value);
  if (!(obs > 0)) return;
  const cargo = CARGO.find(c => c.id === $("cargo").value);
  const veh = VEHICLES.find(v => v.id === $("vehicle").value);
  const cur = unitPrice(cargo, params().dKm, veh, S);
  S.cal *= obs / cur; saveSettings(); $("s_cal").value = S.cal.toFixed(4); run();
};
run();
