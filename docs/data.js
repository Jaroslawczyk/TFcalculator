// Данные приблизительные (по сообществу/внутриигровым ориентирам). Всё калибруется во вкладке «Настройки».
const MODES = {
  road:  { name: "Авто (дорога)",   eff: 0.70, stationCost: 20000,   perKm: 40000,  loadMin: 0.3 },
  tram:  { name: "Трамвай",         eff: 0.70, stationCost: 30000,   perKm: 90000,  loadMin: 0.3 },
  rail:  { name: "Поезд (рельсы)",  eff: 0.80, stationCost: 150000,  perKm: 250000, loadMin: 0.7 },
  water: { name: "Корабль",         eff: 0.90, stationCost: 120000,  perKm: 0,      loadMin: 1.5 },
  air:   { name: "Самолёт",         eff: 0.75, stationCost: 500000,  perKm: 0,      loadMin: 1.5 }
};

// kind: freight | pax ; base — условная цена за 1 ед. на «базовой» дистанции (калибруется)
const CARGO = [
  { id: "coal",   name: "Уголь",              kind: "freight", base: 1.0 },
  { id: "ore",    name: "Железная руда",      kind: "freight", base: 1.0 },
  { id: "stone",  name: "Камень",             kind: "freight", base: 0.9 },
  { id: "logs",   name: "Брёвна",             kind: "freight", base: 1.0 },
  { id: "grain",  name: "Зерно",              kind: "freight", base: 1.1 },
  { id: "crude",  name: "Сырая нефть",        kind: "freight", base: 1.2 },
  { id: "oil",    name: "Нефть (после НПЗ)",  kind: "freight", base: 1.4 },
  { id: "steel",  name: "Сталь",              kind: "freight", base: 1.6 },
  { id: "planks", name: "Доски",              kind: "freight", base: 1.5 },
  { id: "fuel",   name: "Топливо",            kind: "freight", base: 1.7 },
  { id: "food",   name: "Продукты",           kind: "freight", base: 1.8 },
  { id: "goods",  name: "Товары",             kind: "freight", base: 2.0 },
  { id: "tools",  name: "Инструменты/машины", kind: "freight", base: 2.2 },
  { id: "mail",   name: "Почта",              kind: "freight", base: 2.0, twoWay: true },
  { id: "pax",    name: "Пассажиры",          kind: "pax",     base: 1.5, twoWay: true }
];

// cap — вместимость (ед., как «Груз 0/4» в окне линии), speed — км/ч (номинал), price — цена, era — ориентир по эре
const VEHICLES = [
  { id: "truck1",  mode: "road",  kind: "freight", name: "Грузовик (ранний, ~1900-30-е)",  cap: 4,  speed: 40,  price: 25000,   era: 1 },
  { id: "truck2",  mode: "road",  kind: "freight", name: "Грузовик (средний, 1950-70-е)",  cap: 10,  speed: 70,  price: 55000,   era: 2 },
  { id: "truck3",  mode: "road",  kind: "freight", name: "Грузовик (современный)",         cap: 16,  speed: 90,  price: 90000,   era: 3 },
  { id: "bus1",    mode: "road",  kind: "pax",     name: "Автобус (ранний)",               cap: 20,  speed: 40,  price: 25000,   era: 1 },
  { id: "bus2",    mode: "road",  kind: "pax",     name: "Автобус (средний)",              cap: 40,  speed: 70,  price: 55000,   era: 2 },
  { id: "bus3",    mode: "road",  kind: "pax",     name: "Автобус (современный)",          cap: 60,  speed: 90,  price: 90000,   era: 3 },
  { id: "tram1",   mode: "tram",  kind: "pax",     name: "Трамвай (классический)",         cap: 40,  speed: 50,  price: 80000,   era: 1 },
  { id: "tram2",   mode: "tram",  kind: "pax",     name: "Трамвай (современный)",          cap: 90, speed: 70,  price: 200000,  era: 3 },
  { id: "train1",  mode: "rail",  kind: "freight", name: "Паровоз + 8 вагонов",            cap: 80, speed: 80,  price: 130000,  era: 1 },
  { id: "train2",  mode: "rail",  kind: "freight", name: "Тепловоз + 10 вагонов",          cap: 160, speed: 120, price: 380000,  era: 2 },
  { id: "train3",  mode: "rail",  kind: "freight", name: "Электровоз + 14 вагонов",        cap: 300, speed: 140, price: 650000,  era: 3 },
  { id: "ptrain1", mode: "rail",  kind: "pax",     name: "Пасс. поезд (паровой, 6 вагонов)", cap: 150, speed: 90,  price: 150000, era: 1 },
  { id: "ptrain2", mode: "rail",  kind: "pax",     name: "Пасс. поезд (электро, 8 вагонов)", cap: 300, speed: 160, price: 600000, era: 2 },
  { id: "ptrain3", mode: "rail",  kind: "pax",     name: "Скоростной поезд",               cap: 400, speed: 250, price: 1400000, era: 3 },
  { id: "ship1",   mode: "water", kind: "freight", name: "Грузовой корабль (ранний)",      cap: 100, speed: 25,  price: 150000,  era: 1 },
  { id: "ship2",   mode: "water", kind: "freight", name: "Грузовой корабль (средний)",     cap: 250, speed: 40,  price: 350000,  era: 2 },
  { id: "ship3",   mode: "water", kind: "freight", name: "Контейнеровоз (современный)",    cap: 500, speed: 55, price: 700000,  era: 3 },
  { id: "pship1",  mode: "water", kind: "pax",     name: "Пасс. судно (раннее)",           cap: 100, speed: 30,  price: 150000,  era: 1 },
  { id: "pship2",  mode: "water", kind: "pax",     name: "Пасс. лайнер",                   cap: 300, speed: 50,  price: 450000,  era: 2 },
  { id: "plane1",  mode: "air",   kind: "freight", name: "Грузовой самолёт (поршневой)",   cap: 20,  speed: 300, price: 350000,  era: 2 },
  { id: "plane2",  mode: "air",   kind: "freight", name: "Грузовой самолёт (реактивный)",  cap: 60,  speed: 750, price: 900000,  era: 3 },
  { id: "pplane1", mode: "air",   kind: "pax",     name: "Пасс. самолёт (поршневой)",      cap: 30,  speed: 320, price: 400000,  era: 2 },
  { id: "pplane2", mode: "air",   kind: "pax",     name: "Пасс. самолёт (реактивный)",     cap: 150, speed: 800, price: 1500000, era: 3 }
];

const DEFAULT_SETTINGS = {
  cal: 1.0,          // общий множитель цены (калибровка по игре)
  difficulty: 1.0,   // множитель сложности
  refSpeed: 60,      // опорная скорость для множителя скорости
  speedExp: 0.5,     // степень влияния номинальной скорости на цену
  yearMin: 12.17,    // длина игрового года в реальных минутах при скорости ×1 (1 день ≈ 2 с)
  uptime: 0.9,       // доля времени ТС в работе (без ремонта/простоев)
  loadFactor: 0.9,   // средняя загрузка
  upkeepRate: 1 / 6, // годовое обслуживание от цены ТС
  perKmCost: 0.000001  // эксплуатация: доля цены ТС за 1 км пробега
};
