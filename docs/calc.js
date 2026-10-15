// Чистые функции расчёта (без DOM). Единицы: км, часы игрового времени, $.
function unitPrice(cargo, dKm, veh, S) {
  const speedMult = Math.pow(veh.speed / S.refSpeed, S.speedExp);
  return cargo.base * (300 + dKm * 1000) / 100 * speedMult * S.difficulty * S.cal;
}

function infraCost(mode, pathKm, infraOverride) {
  if (infraOverride != null && !isNaN(infraOverride)) return infraOverride;
  const m = MODES[mode];
  return 2 * m.stationCost + m.perKm * pathKm;
}

// Возвращает полный разбор для одной модели ТС.
function evaluate(veh, cargo, p, S) {
  const m = MODES[veh.mode];
  const pathKm = Math.max(p.pathKm, p.dKm);
  const vEff = veh.speed * m.eff;
  const roundTripH = 2 * pathKm / vEff + 2 * m.loadH;
  const tripsYear = 8760 * S.uptime / roundTripH;
  const legs = (cargo.twoWay || p.twoWay) ? 2 : 1;
  const capYear = veh.cap * tripsYear * legs * S.loadFactor;
  const annual = p.volMonth * 12;
  const n = Math.max(1, Math.ceil(annual / capYear));
  const price = unitPrice(cargo, p.dKm, veh, S);
  const revenue = annual * price;
  const upkeep = n * veh.price * S.upkeepRate;
  const running = n * tripsYear * 2 * pathKm * veh.price * S.perKmCost;
  const costs = upkeep + running;
  const profit = revenue - costs;
  const infra = infraCost(veh.mode, pathKm, p.infra);
  const capex = n * veh.price + infra;
  const payback = profit > 0 ? capex / profit : Infinity;
  const warnings = [];
  if (veh.mode === "road" && n > 12) warnings.push("Много машин на дороге — риск пробок; лучше рельсы или несколько маршрутов.");
  if (veh.mode === "rail" && n > 8) warnings.push("Много поездов: нужна двухпутка и сигналы (блок-участки), иначе встанут.");
  if (veh.mode === "road" && p.dKm > 25) warnings.push("Для авто дистанция велика: дорого по числу ТС и времени.");
  if (veh.mode === "rail" && p.dKm < 4) warnings.push("Для рельсов дистанция мала: инфраструктура не окупится, подойдёт авто.");
  if (veh.mode === "air" && p.dKm < 40) warnings.push("Самолёт эффективен на дальних дистанциях (40+ км).");
  if (p.dKm > 0 && pathKm / p.dKm > 1.6) warnings.push("Путь сильно длиннее прямой: оплата идёт по прямой, а расходы — по пути.");
  return { veh, n, price, revenue, costs, profit, capex, infra, payback, roundTripH, tripsYear,
           headwayH: roundTripH / n, capYear, annual, warnings };
}

function compareAll(cargo, p, S) {
  return VEHICLES.filter(v => v.kind === cargo.kind)
    .map(v => { const r = evaluate(v, cargo, p, S); r.off = (v.mode === "air" && p.dKm < 40) || (v.mode === "rail" && p.dKm < 4) || (v.mode === "road" && p.dKm > 40); return r; })
    .sort((a, b) => (a.off - b.off) || (isFinite(a.payback) ? a.payback : 1e9) - (isFinite(b.payback) ? b.payback : 1e9));
}

// Совет «какой вид и куда» по дистанции и типу груза.
function advise(cargo, dKm) {
  if (cargo.kind === "pax") {
    if (dKm < 6) return "Короткая линия внутри/между кварталами: автобус или трамвай.";
    if (dKm < 25) return "Между соседними городами: автобус (дёшево) или пассажирский поезд, если города крупные.";
    if (dKm < 60) return "Междугородняя: пассажирский поезд; корабль, если города у воды.";
    return "Дальняя: самолёт (аэропорты у крупных городов) или скоростной поезд.";
  }
  if (cargo.id === "mail") return dKm < 30 ? "Почта: грузовик, пересадка на общий поезд." : "Почта: поезд/самолёт на дальние расстояния.";
  if (dKm < 6) return "Очень короткое плечо: грузовик (инфраструктура почти бесплатна).";
  if (dKm < 20) return "Среднее: грузовики окупаются быстро, но при большом потоке (>15 машин) переходите на рельсы.";
  if (dKm < 60) return "Основной диапазон поезда: большой поток, дешёвая тонна-км. Корабль — если есть вода.";
  return "Дальний груз: поезд или корабль (корабль — минимум инфраструктуры); самолёт — только дорогие грузы.";
}
