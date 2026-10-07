// Сеты суши. Меняй тексты, цены и состав здесь.
export const SETS = [
  {
    id: "01",
    kind: 0,
    name: "DRAGON SET",
    jp: "龍",
    tag: "SIGNATURE",
    price: 35,
    pcs: 8,
    kcal: 520,
    spice: 2,
    desc: "Our signature set. Silky salmon and tuna nigiri beside flame-seared dragon rolls, finished with a drop of house chili oil.",
    contents: [
      ["Salmon nigiri", 2],
      ["Tuna nigiri", 2],
      ["Dragon roll — eel, avocado", 4],
    ],
    ingredients: ["Salmon", "Tuna", "Unagi", "Avocado", "Cucumber", "Nori", "Sushi rice"],
    note: "Start with the tuna, finish with the roll. Best eaten within minutes.",
  },
  {
    id: "02",
    kind: 1,
    name: "SAKURA SET",
    jp: "桜",
    tag: "SOFT & FRESH",
    price: 42,
    pcs: 12,
    kcal: 480,
    spice: 0,
    desc: "A gentle set inspired by cherry blossom season: sweet shrimp, cream cheese rolls and pink tobiko, light and delicate.",
    contents: [
      ["Shrimp nigiri", 4],
      ["Salmon & cream cheese roll", 8],
    ],
    ingredients: ["Shrimp", "Salmon", "Cream cheese", "Tobiko", "Cucumber", "Nori", "Sushi rice"],
    note: "Pairs perfectly with green tea. No heat, only freshness.",
  },
  {
    id: "03",
    kind: 2,
    name: "KYOTO SET",
    jp: "京",
    tag: "CLASSIC",
    price: 48,
    pcs: 16,
    kcal: 610,
    spice: 1,
    desc: "A tribute to the old capital: glazed eel, sweet tamago and crisp cucumber rolls, built on tradition.",
    contents: [
      ["Unagi nigiri", 4],
      ["Tamago nigiri", 2],
      ["Cucumber maki", 6],
      ["Avocado maki", 4],
    ],
    ingredients: ["Unagi", "Tamago", "Cucumber", "Avocado", "Sesame", "Nori", "Sushi rice"],
    note: "A little wasabi, a little ginger. Nothing more is needed.",
  },
];

// Футер "О нас" (лампочка). Меняй на свои данные.
export const ABOUT = {
  since: 2019,
  city: "Baku, Azerbaijan",
  address: "Nizami Street 00, Baku",
  hours: "Daily · 12:00 — 23:00",
  phone: "+994 00 000 00 00",
  email: "hello@dragonsushi.az",
  paragraphs: [
    "Dragon Sushi began as a tiny open kitchen with one counter, one knife and one rule: fish is never older than a day.",
    "We cut every piece by hand, press our rice warm, and sear with real fire. The dragon is not just a logo — it is how we think about food: bold, patient and a little dangerous.",
  ],
};