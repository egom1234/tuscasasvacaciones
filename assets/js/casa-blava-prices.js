window.CASA_BLAVA_PRICES = {
  maxPersonas: 6,
  minNoches:   2,
  cleaning:    0,
  gapCleaning: 60,
  discounts: [
    { minNights: 4, pct: 0.05 },
    { minNights: 7, pct: 0.08 }
  ],
  rates: {
    "1":  { weekday: 90, weekend: 150 },
    "2":  { weekday: 90, weekend: 150 },
    "3":  { weekday: 100, weekend: 150 },
    "4":  { weekday: 110, weekend: 170 },
    "5":  { weekday: 140, weekend: 190 },
    "6":  { weekday: 160, weekend: 200 },
    "7":  240,
    "8":  240,
    "9":  { weekday: 150, weekend: 180 },
    "10": { weekday: 130, weekend: 180 },
    "11": { weekday: 100, weekend: 180 },
    "12": { weekday: 110, weekend: 180 }
  },
  holidays: ['9-24','11-01','12-06','12-07','12-08','12-24','12-25','12-26','12-31'],
  specialDates: {
    "2026-12-31": 400
  }
};
