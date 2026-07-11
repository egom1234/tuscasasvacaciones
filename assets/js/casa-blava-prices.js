window.CASA_BLAVA_PRICES = {
  maxPersonas: 6,
  minNoches:   2,
  cleaning:    60,
  discounts: [
    { minNights: 4, pct: 0.05 },
    { minNights: 7, pct: 0.08 }
  ],
  rates: {
    "1":  100,
    "2":  100,
    "3":  110,
    "4":  120,
    "5":  { weekday: 140, weekend: 190 },
    "6":  { weekday: 160, weekend: 200 },
    "7":  250,
    "8":  250,
    "9":  { weekday: 150, weekend: 180 },
    "10": { weekday: 130, weekend: 180 },
    "11": { weekday: 110, weekend: 180 },
    "12": 150
  },
  holidays: ['9-24','11-01','12-06','12-07','12-08','12-24','12-25','12-26','12-31'],
  specialDates: {
    "2026-12-31": 400
  }
};
