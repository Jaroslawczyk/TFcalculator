// Инструменты под цифры из окон игры: подбор транспорта по «Норме» и пересчёт рецепта завода.
const num = id => Math.max(0, +$(id).value || 0);
const r1 = n => +n.toFixed(1);

function lineTool() {
  const rate = num("lnRate"), n = Math.max(1, num("lnN")), freq = num("lnFreq"), cap = num("lnCap"), need = num("lnNeed");
  const per = rate / n, check = freq > 0 ? cap * DEFAULT_SETTINGS.yearMin / freq : 0;
  if (!per) { $("lnOut").innerHTML = `<p class="warn">Укажите норму больше 0.</p>`; return; }
  const req = Math.ceil(need / per), newFreq = freq * n / req;
  $("lnOut").innerHTML = `
    <div class="tres"><div><span>Норма на 1 ТС</span><b>${r1(per)}</b><small>${r1(rate)} ÷ ${n}</small></div>
      <div class="main"><span>Нужно ТС</span><b>${req}</b><small>${need} ÷ ${r1(per)} → вверх</small></div>
      <div><span>Станет норма</span><b>${fmt(req * per)}</b><small>частота ~${r1(newFreq)} мин</small></div></div>
    <ol class="how">
      <li>Одна машина везёт ${r1(rate)} ÷ ${n} = <b>${r1(per)}</b> ед. в год.</li>
      <li>Нужно ${need} ÷ ${r1(per)} = ${r1(need / per)} → берём <b>${req}</b> (округляем вверх).</li>
      ${check ? `<li>Проверка: ${cap} × 12,17 ÷ ${freq} ≈ <b>${r1(check)}</b> — должно быть близко к норме ${r1(rate)}. ${Math.abs(check - rate) > rate * 0.35 ? "Сильно отличается — проверьте вместимость и частоту." : "Сходится."}</li>` : ""}
      <li>Добавляйте ТС по 1–2 и смотрите, не стоит ли транспорт в очереди на станции. Больше ~10–15 машин на одну дорожную линию — уже пробки, лучше поезд.</li>
    </ol>
    <p class="muted">«Производство 200» у завода — это максимум, а не спрос. Возите столько, сколько реально заберут дальше по цепочке (вкладка «Окна игры»), иначе машины будут ездить полупустыми.</p>`;
}

function recipeTool() {
  const a = Math.max(1, num("rcIn")), b = Math.max(1, num("rcOut")), have = num("rcHave"), need = num("rcNeed");
  $("rcOutBox").innerHTML = `
    <div class="tres"><div class="main"><span>Из ${fmt(have)} сырья выйдет</span><b>${r1(have * b / a)}</b><small>${have} × ${b} ÷ ${a}</small></div>
      <div class="main"><span>Для ${fmt(need)} продукции привезти</span><b>${r1(need * a / b)}</b><small>${need} × ${a} ÷ ${b}</small></div></div>
    <ol class="how">
      <li>Рецепт ${a} → ${b}: на каждую единицу продукции нужно ${r1(a / b)} ед. сырья.</li>
      <li>Если сырья два вида (например, руда + уголь → сталь), считайте каждый вид отдельно по числу его иконок.</li>
      <li>Завод сделает не больше, чем «Производство X/<b>Y</b>» на текущем уровне, и не больше, чем у него заберут.</li>
    </ol>`;
}
["lnRate", "lnN", "lnFreq", "lnCap", "lnNeed"].forEach(id => $(id).oninput = lineTool);
["rcIn", "rcOut", "rcHave", "rcNeed"].forEach(id => $(id).oninput = recipeTool);
lineTool(); recipeTool();
