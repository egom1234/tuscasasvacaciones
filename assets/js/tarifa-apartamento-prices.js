window.TARIFA_APARTAMENTO_PRICES = {
  maxPersonas: 4,
  minNoches:   4,
  cleaning:    50,
  discounts: [
    { minNights: 5, pct: 0.05 },
    { minNights: 6, pct: 0.08 },
    { minNights: 7, pct: 0.11 }
  ],
  rates: {
    "1": 50,  "2": 50,  "3": 50,  "4": 60,
    "5": 80,  "6": 100, "7": 140, "8": 180,
    "9": 100, "10": 80, "11": 60, "12": 60
  }
};
