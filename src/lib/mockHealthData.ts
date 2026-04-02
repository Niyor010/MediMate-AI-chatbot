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
      source: "Health News India",
      title: "New vaccination drive reaches rural districts",
      description:
        "A targeted campaign increases first-dose coverage in remote districts.",
      url: "https://example.com/vaccination-drive",
      publishedAt: new Date().toISOString(),
    },
    {
      source: "Medical Times",
      title: "Study shows improved outcomes with early diagnosis",
      description: "Early screening associated with better recovery rates.",
      url: "https://example.com/early-diagnosis",
      publishedAt: new Date().toISOString(),
    },
    {
      source: "Public Health Desk",
      title: "Advisory: Preventive measures for monsoon-related illnesses",
      description: "Guidance on preventing water-borne and vector-borne diseases.",
      url: "https://example.com/monsoon-advisory",
      publishedAt: new Date().toISOString(),
    },
  ];
}

export default {
  generateTimeseries,
  getMockVaccination,
  getMockAlerts,
  getMockNews,
};
