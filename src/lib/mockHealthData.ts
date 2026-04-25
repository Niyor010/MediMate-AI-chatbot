// Lightweight mock data generator for health dashboards
export function generateTimeseries(days = 90) {
  const today = new Date();
  const timeseries = [];
  let cumulative = 900000000;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const daily = Math.floor(400000 + Math.random() * 600000);
    cumulative += daily;
    timeseries.push({ date, daily, cumulative });
  }
  return timeseries;
}

export function getMockVaccination(range = 90) {
  const timeseries = generateTimeseries(range);
  const cumulative = timeseries[timeseries.length - 1].cumulative;
  const mockStates = [
    { state: "Maharashtra", doses: 120000000 },
    { state: "Uttar Pradesh", doses: 110000000 },
    { state: "Bihar", doses: 80000000 },
    { state: "West Bengal", doses: 70000000 },
    { state: "Karnataka", doses: 50000000 },
    { state: "Tamil Nadu", doses: 48000000 },
    { state: "Gujarat", doses: 42000000 },
    { state: "Rajasthan", doses: 39000000 },
    { state: "Madhya Pradesh", doses: 36000000 },
    { state: "Andhra Pradesh", doses: 34000000 },
  ];

  const totals = {
    doses_administered: cumulative,
    daily_doses: timeseries[timeseries.length - 1].daily,
    daily_7avg: Math.round(
      timeseries.slice(-7).reduce((s, x) => s + x.daily, 0) /
        Math.min(7, timeseries.length)
    ),
    coverage_percent: 75.3,
    fully_vaccinated: Math.round(cumulative * 0.6),
  };

  return {
    totals,
    states: mockStates,
    timeseries,
    updated_at: new Date().toISOString(),
  };
}

export function getMockAlerts() {
  return [
    {
      id: "alert-1",
      title: "Dengue advisory: increased cases reported in Mumbai",
      date: new Date().toISOString().slice(0, 10),
      severity: "high",
      source: "MoHFW",
      description:
        "Local health authorities advise vector control and early medical attention for fever cases.",
    },
    {
      id: "alert-2",
      title: "Seasonal influenza spike in Delhi NCR",
      date: new Date().toISOString().slice(0, 10),
      severity: "medium",
      source: "State Health Dept",
      description: "Hospitals report a modest uptick in influenza-like illness.",
    },
    {
      id: "alert-3",
      title: "Water-borne illness advisory in coastal areas",
      date: new Date().toISOString().slice(0, 10),
      severity: "low",
      source: "Local Municipality",
      description: "Advisory: boil water notices for affected zones.",
    },
  ];
}

export function getMockNews() {
  return [
    {
      source: "Times Of India",
      title: "Ahmedabad reports 106 diarrhoea,22 typhoid cases in first 5 days.",
      description:"Ahmedabad reported 106 diarrhoea and 22 typhoid cases in the first five days, raising early public health concerns.",
      url: "https://timesofindia.indiatimes.com/city/ahmedabad/ahmedabad-reports-106-diarrhoea-22-typhoid-cases-in-first-5-days/articleshow/130069741.cms?utm_source=chatgpt.com",
      publishedAt: "2026-04-07"
    },
    {
      source: "Times of India",
      title: "11.3 lakh infans,24 lakh children vaccinated in 2025-26:Gujarat Govt.",
      description: "Gujarat government reports vaccinating 11.3 lakh infants and 24 lakh children in 2025–26 under its immunization drive.",
      url: "https://timesofindia.indiatimes.com/city/ahmedabad/11-3-lakh-infants-24-lakh-children-vaccinated-in-2025-26-gujarat-govt/articleshow/129594737.cms?utm_source=chatgpt.com",
      publishedAt: "2026-03-16"
    },
    {
      source: "Tribune India",
      title: "HPV vaccine hesitancy rising in India due to misinformation: AIIMS doc",
      description: "Misinformation is driving rising hesitancy toward the HPV vaccine in India, despite its proven safety and role in preventing cervical cancer.",
      url: "https://share.google/G6tASbb38CF1a8XKp",
      publishedAt: "2026-04-07"
    },
    {
      source:"India today",
      title:"Takeda Dengue vaccine recommmended for india amid rising dengue cases.",
      description:"Takeda’s dengue vaccine is recommended for India to help tackle rising dengue cases.",
      url:"https://share.google/pxQ13hzZrKDqjWxM0",
      publishedAt: "2026-03-30"
    },
  ];
}

export default {
  generateTimeseries,
  getMockVaccination,
  getMockAlerts,
  getMockNews,
};