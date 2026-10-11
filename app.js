// Spendings Tracker - Full Application Logic
// Handles Data State, LocalStorage, Chart.js Visuals, PWA, Filters & Budget

(function () {
  'use strict';

  // --- Constants & Categories ---
  const STORAGE_KEY_EXPENSES = 'spendings_tracker_items_v1';
  const STORAGE_KEY_BUDGET = 'spendings_tracker_monthly_budget_v1';
  const STORAGE_KEY_THEME = 'spendings_tracker_theme_v1';

  const CATEGORY_COLORS = {
    'Food & Dining': '#f97316',      // Orange
    'Groceries': '#10b981',          // Emerald
    'Travel & Fuel': '#3b82f6',       // Blue
    'Bills & Utilities': '#8b5cf6',   // Purple
    'Shopping': '#ec4899',           // Pink
    'Entertainment': '#eab308',      // Amber
    'Health': '#06b6d4',             // Cyan
    'Others': '#64748b'              // Slate
  };

  const CATEGORY_ICONS = {
    'Food & Dining': '🍔',
    'Groceries': '🛒',
    'Travel & Fuel': '🚗',
    'Bills & Utilities': '⚡',
    'Shopping': '🛍️',
    'Entertainment': '🎬',
    'Health': '💊',
    'Others': '📦'
  };

  const DEFAULT_SAMPLE_DATA = [
    { id: 'exp_1', title: 'Groceries Supermarket', amount: 3450.00, category: 'Groceries', paymentMode: 'UPI', date: '2026-10-02', notes: 'Monthly essentials' },
    { id: 'exp_2', title: 'Shell Petrol Bunk', amount: 1800.00, category: 'Travel & Fuel', paymentMode: 'Credit Card', date: '2026-10-04', notes: 'Car tank full' },
    { id: 'exp_3', title: 'Swiggy Dinner', amount: 620.00, category: 'Food & Dining', paymentMode: 'UPI', date: '2026-10-05', notes: 'Weekend meal' },
    { id: 'exp_4', title: 'Electricity Bill TNEB', amount: 2150.00, category: 'Bills & Utilities', paymentMode: 'NetBanking', date: '2026-10-07', notes: 'Bi-monthly power' },
    { id: 'exp_5', title: 'Amazon Clothes & Shoes', amount: 4200.00, category: 'Shopping', paymentMode: 'Credit Card', date: '2026-10-08', notes: 'Festival sale' },
    { id: 'exp_6', title: 'Movie Tickets & Popcorn', amount: 950.00, category: 'Entertainment', paymentMode: 'UPI', date: '2026-10-10', notes: 'PVR multiplex' },
    { id: 'exp_7', title: 'Pharmacy Apollo Meds', amount: 740.00, category: 'Health', paymentMode: 'UPI', date: '2026-10-11', notes: 'Routine check' },
    { id: 'exp_8', title: 'Cafe Coffee Day', amount: 380.00, category: 'Food & Dining', paymentMode: 'Cash', date: '2026-10-11', notes: 'Team meetup' },
    // September sample for month comparison
    { id: 'exp_9', title: 'BigBasket Monthly', amount: 4800.00, category: 'Groceries', paymentMode: 'UPI', date: '2026-09-05', notes: 'Sept Grocery' },
    { id: 'exp_10', title: 'Wi-Fi Fiber Internet', amount: 1178.00, category: 'Bills & Utilities', paymentMode: 'UPI', date: '2026-09-10', notes: 'Airtel Broadband' },
    { id: 'exp_11', title: 'Fuel Car', amount: 2000.00, category: 'Travel & Fuel', paymentMode: 'UPI', date: '2026-09-18', notes: 'Sept Fuel' }
  ];

  // --- State ---
  let expenses = [];
  let monthlyBudget = 35000; // Default ₹35,000 target
  let selectedMonth = 'all'; // 'all' or 'YYYY-MM'
  let selectedCategory = 'all';
  let searchQuery = '';
  let deferredPrompt = null;

  // Chart Instances
  let donutChart = null;
  let lineTrendChart = null;
  let paymentBarChart = null;
  let monthlyBarChart = null;

  // --- DOM Elements ---
  const kpiTotalSpent = document.getElementById('kpiTotalSpent');
  const kpiExpenseCount = document.getElementById('kpiExpenseCount');
  const kpiRemainingBudget = document.getElementById('kpiRemainingBudget');
  const budgetProgressBar = document.getElementById('budgetProgressBar');
  const kpiBudgetMessage = document.getElementById('kpiBudgetMessage');
  const kpiDailyAvg = document.getElementById('kpiDailyAvg');
  const kpiProjectedTotal = document.getElementById('kpiProjectedTotal');
  const kpiTopCategory = document.getElementById('kpiTopCategory');
  const kpiTopCategoryAmount = document.getElementById('kpiTopCategoryAmount');
  const peakDayLabel = document.getElementById('peakDayLabel');
  const categoryChartTotal = document.getElementById('categoryChartTotal');

  const monthDropdownBtn = document.getElementById('monthDropdownBtn');
  const monthDropdownMenu = document.getElementById('monthDropdownMenu');
  const selectedMonthLabel = document.getElementById('selectedMonthLabel');

  const moreMenuBtn = document.getElementById('moreMenuBtn');
  const moreMenuDropdown = document.getElementById('moreMenuDropdown');
  const searchInput = document.getElementById('searchInput');
  const categoryFilterPills = document.getElementById('categoryFilterPills');

  const expenseTableBody = document.getElementById('expenseTableBody');
  const mobileExpenseCardList = document.getElementById('mobileExpenseCardList');
  const emptyState = document.getElementById('emptyState');
  const tableItemCount = document.getElementById('tableItemCount');

  // Modals
  const expenseModal = document.getElementById('expenseModal');
  const openAddModalBtn = document.getElementById('openAddModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const expenseForm = document.getElementById('expenseForm');
  const modalTitle = document.getElementById('modalTitle');
  const expenseIdInput = document.getElementById('expenseId');
  const formAmount = document.getElementById('formAmount');
  const formTitle = document.getElementById('formTitle');
  const formCategory = document.getElementById('formCategory');
  const formPaymentMode = document.getElementById('formPaymentMode');
  const formDate = document.getElementById('formDate');
  const formNotes = document.getElementById('formNotes');

  const budgetModal = document.getElementById('budgetModal');
  const setBudgetOption = document.getElementById('setBudgetOption');
  const closeBudgetModalBtn = document.getElementById('closeBudgetModalBtn');
  const cancelBudgetBtn = document.getElementById('cancelBudgetBtn');
  const saveBudgetBtn = document.getElementById('saveBudgetBtn');
  const budgetInput = document.getElementById('budgetInput');

  const exportCsvOption = document.getElementById('exportCsvOption');
  const backupJsonOption = document.getElementById('backupJsonOption');
  const restoreJsonInput = document.getElementById('restoreJsonInput');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');
  const installAppOption = document.getElementById('installAppOption');

  // Import Bank Statement Elements
  const openImportModalBtn = document.getElementById('openImportModalBtn');
  const menuImportStatementBtn = document.getElementById('menuImportStatementBtn');
  const importModal = document.getElementById('importModal');
  const closeImportModalBtn = document.getElementById('closeImportModalBtn');
  const cancelImportBtn = document.getElementById('cancelImportBtn');
  const confirmImportBtn = document.getElementById('confirmImportBtn');
  const dropzoneContainer = document.getElementById('dropzoneContainer');
  const bankStatementFileInput = document.getElementById('bankStatementFileInput');
  const importStatusBanner = document.getElementById('importStatusBanner');
  const importStatusText = document.getElementById('importStatusText');
  const detectedBankTag = document.getElementById('detectedBankTag');
  const importPreviewContainer = document.getElementById('importPreviewContainer');
  const importPreviewTableBody = document.getElementById('importPreviewTableBody');
  const parsedDebitCount = document.getElementById('parsedDebitCount');
  const parsedTotalAmount = document.getElementById('parsedTotalAmount');

  let parsedExpensesToImport = [];

  // --- Helper: Format Currency (INR) ---
  function formatINR(val) {
    const num = Number(val) || 0;
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatCompactINR(val) {
    const num = Number(val) || 0;
    if (num >= 10000000) return '₹' + (num / 10000000).toFixed(2) + ' Cr';
    if (num >= 100000) return '₹' + (num / 100000).toFixed(2) + ' L';
    if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + ' k';
    return '₹' + num.toFixed(0);
  }

  function formatDate(dStr) {
    if (!dStr) return '-';
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return dStr;
    } catch (e) {
      return dStr;
    }
  }

  // --- Initialize State ---
  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EXPENSES);
      if (stored) {
        expenses = JSON.parse(stored);
      } else {
        expenses = [...DEFAULT_SAMPLE_DATA];
        saveData();
      }

      const storedBudget = localStorage.getItem(STORAGE_KEY_BUDGET);
      if (storedBudget) {
        monthlyBudget = Number(storedBudget) || 35000;
      }
    } catch (e) {
      console.error('Failed to load data:', e);
      expenses = [...DEFAULT_SAMPLE_DATA];
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to save expenses:', e);
    }
  }

  function saveBudget() {
    try {
      localStorage.setItem(STORAGE_KEY_BUDGET, monthlyBudget.toString());
    } catch (e) {
      console.error('Failed to save budget:', e);
    }
  }

  // --- Unique Month Aggregates ---
  function getAvailableMonths() {
    const monthSet = new Set();
    expenses.forEach((item) => {
      if (item.date && item.date.length >= 7) {
        monthSet.add(item.date.substring(0, 7)); // 'YYYY-MM'
      }
    });
    return Array.from(monthSet).sort().reverse();
  }

  function getMonthName(ym) {
    if (!ym || ym === 'all') return 'All Months';
    const [year, month] = ym.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  // --- Render Month Filter Dropdown ---
  function renderMonthDropdown() {
    const months = getAvailableMonths();
    monthDropdownMenu.innerHTML = '';

    // "All Months" option
    const allBtn = document.createElement('button');
    allBtn.className = `w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg flex items-center justify-between ${selectedMonth === 'all' ? 'text-emerald-500 font-bold bg-emerald-500/10' : 'text-slate-700 dark:text-slate-200'}`;
    allBtn.innerHTML = `<span>All Months</span> ${selectedMonth === 'all' ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}`;
    allBtn.onclick = () => {
      selectedMonth = 'all';
      selectedMonthLabel.textContent = 'All Months';
      monthDropdownMenu.classList.add('hidden');
      refreshView();
    };
    monthDropdownMenu.appendChild(allBtn);

    // Each Month option
    months.forEach((ym) => {
      const btn = document.createElement('button');
      const isSelected = selectedMonth === ym;
      btn.className = `w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg flex items-center justify-between ${isSelected ? 'text-emerald-500 font-bold bg-emerald-500/10' : 'text-slate-700 dark:text-slate-200'}`;
      btn.innerHTML = `<span>${getMonthName(ym)}</span> ${isSelected ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}`;
      btn.onclick = () => {
        selectedMonth = ym;
        selectedMonthLabel.textContent = getMonthName(ym);
        monthDropdownMenu.classList.add('hidden');
        refreshView();
      };
      monthDropdownMenu.appendChild(btn);
    });

    if (window.lucide) lucide.createIcons();
  }

  // --- Filter Logic ---
  function getFilteredExpenses() {
    return expenses.filter((item) => {
      // Month Filter
      if (selectedMonth !== 'all') {
        if (!item.date || !item.date.startsWith(selectedMonth)) return false;
      }
      // Category Filter
      if (selectedCategory !== 'all') {
        if (item.category !== selectedCategory) return false;
      }
      // Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        const matchCat = (item.category || '').toLowerCase().includes(q);
        const matchMode = (item.paymentMode || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNotes && !matchCat && !matchMode) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // --- Update Dashboard KPIs ---
  function updateKPIs(filteredList) {
    const totalSpent = filteredList.reduce((acc, cur) => acc + (Number(cur.amount) || 0), 0);
    const count = filteredList.length;

    kpiTotalSpent.textContent = formatINR(totalSpent);
    kpiExpenseCount.textContent = `${count} transaction${count === 1 ? '' : 's'}`;

    // Budget Calculations
    const targetBudget = monthlyBudget;
    const remaining = targetBudget - totalSpent;
    const pctUsed = targetBudget > 0 ? (totalSpent / targetBudget) * 100 : 0;

    if (remaining >= 0) {
      kpiRemainingBudget.textContent = formatINR(remaining);
      kpiRemainingBudget.className = 'text-xl sm:text-2xl lg:text-3xl font-extrabold mono text-emerald-500';
      budgetProgressBar.className = 'bg-emerald-500 h-full transition-all duration-500';
    } else {
      kpiRemainingBudget.textContent = '-' + formatINR(Math.abs(remaining));
      kpiRemainingBudget.className = 'text-xl sm:text-2xl lg:text-3xl font-extrabold mono text-rose-500';
      budgetProgressBar.className = 'bg-rose-500 h-full transition-all duration-500';
    }

    budgetProgressBar.style.width = Math.min(100, Math.max(0, pctUsed)) + '%';
    kpiBudgetMessage.innerHTML = `
      <span>Target: ${formatINR(targetBudget)}</span>
      <span class="${pctUsed > 100 ? 'text-rose-500 font-bold' : ''}">${pctUsed.toFixed(1)}% used</span>
    `;

    // Daily Average & Projected Spend
    let daysInPeriod = 30;
    let daysPassed = 1;
    const now = new Date();

    if (selectedMonth === 'all') {
      const dates = filteredList.map(e => new Date(e.date)).filter(d => !isNaN(d));
      if (dates.length >= 2) {
        const minD = new Date(Math.min(...dates));
        const maxD = new Date(Math.max(...dates));
        const diffDays = Math.max(1, Math.round((maxD - minD) / (1000 * 60 * 60 * 24)));
        daysPassed = diffDays;
      } else {
        daysPassed = 1;
      }
    } else {
      const [y, m] = selectedMonth.split('-').map(Number);
      daysInPeriod = new Date(y, m, 0).getDate();
      if (y === now.getFullYear() && (m - 1) === now.getMonth()) {
        daysPassed = Math.max(1, now.getDate());
      } else {
        daysPassed = daysInPeriod;
      }
    }

    const dailyAvg = count > 0 ? (totalSpent / daysPassed) : 0;
    kpiDailyAvg.textContent = formatINR(dailyAvg);
    const projected = dailyAvg * daysInPeriod;
    kpiProjectedTotal.textContent = `Projected: ${formatINR(projected)}`;

    // Top Category
    const catMap = {};
    filteredList.forEach(item => {
      catMap[item.category] = (catMap[item.category] || 0) + item.amount;
    });

    let topCat = 'None';
    let topCatAmt = 0;
    for (const [cat, amt] of Object.entries(catMap)) {
      if (amt > topCatAmt) {
        topCatAmt = amt;
        topCat = cat;
      }
    }

    if (topCatAmt > 0) {
      const topCatPct = totalSpent > 0 ? ((topCatAmt / totalSpent) * 100).toFixed(1) : 0;
      kpiTopCategory.textContent = `${CATEGORY_ICONS[topCat] || '📦'} ${topCat}`;
      kpiTopCategoryAmount.textContent = `${formatINR(topCatAmt)} (${topCatPct}%)`;
    } else {
      kpiTopCategory.textContent = 'None';
      kpiTopCategoryAmount.textContent = '₹0.00 (0%)';
    }

    categoryChartTotal.textContent = formatINR(totalSpent);
  }

  // --- Render Visual Charts ---
  function updateCharts(filteredList) {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9';

    // 1. Donut Chart: Category Breakdown
    const catMap = {};
    filteredList.forEach(item => {
      catMap[item.category] = (catMap[item.category] || 0) + item.amount;
    });

    const catLabels = Object.keys(catMap);
    const catData = Object.values(catMap);
    const catColors = catLabels.map(l => CATEGORY_COLORS[l] || '#10b981');

    const donutCtx = document.getElementById('categoryDonutChart').getContext('2d');
    const noCatEl = document.getElementById('noCategoryData');

    if (catData.length === 0) {
      noCatEl.classList.remove('hidden');
    } else {
      noCatEl.classList.add('hidden');
    }

    if (donutChart) donutChart.destroy();
    donutChart = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catData,
          backgroundColor: catColors,
          borderColor: isDark ? '#0b0f17' : '#ffffff',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 10,
              color: textColor,
              font: { size: 10, family: 'Plus Jakarta Sans', weight: '600' }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${formatINR(ctx.raw)}`
            }
          }
        },
        cutout: '68%'
      }
    });

    // 2. Line Chart: Daily Spending Trend
    const dateMap = {};
    filteredList.forEach(item => {
      dateMap[item.date] = (dateMap[item.date] || 0) + item.amount;
    });

    const sortedDates = Object.keys(dateMap).sort();
    const trendValues = sortedDates.map(d => dateMap[d]);

    // Find peak day
    let peakDay = '-';
    let peakAmt = 0;
    sortedDates.forEach(d => {
      if (dateMap[d] > peakAmt) {
        peakAmt = dateMap[d];
        peakDay = `${formatDate(d)} (${formatINR(peakAmt)})`;
      }
    });
    peakDayLabel.textContent = `Peak: ${peakDay}`;

    const trendCtx = document.getElementById('dailyTrendChart').getContext('2d');
    const noTrendEl = document.getElementById('noTrendData');

    if (trendValues.length === 0) {
      noTrendEl.classList.remove('hidden');
    } else {
      noTrendEl.classList.add('hidden');
    }

    if (lineTrendChart) lineTrendChart.destroy();
    lineTrendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: sortedDates.map(d => {
          const parts = d.split('-');
          return `${parts[2]}/${parts[1]}`;
        }),
        datasets: [{
          label: 'Daily Spend (₹)',
          data: trendValues,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointRadius: trendValues.length > 20 ? 1 : 3,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 10 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 10 },
              callback: (val) => formatCompactINR(val)
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Spent: ${formatINR(ctx.raw)}`
            }
          }
        }
      }
    });

    // 3. Bar Chart: Payment Modes
    const paymentMap = { 'UPI': 0, 'Credit Card': 0, 'Debit Card': 0, 'Cash': 0, 'NetBanking': 0 };
    filteredList.forEach(item => {
      paymentMap[item.paymentMode] = (paymentMap[item.paymentMode] || 0) + item.amount;
    });

    const paymentCtx = document.getElementById('paymentModeChart').getContext('2d');
    const noPaymentEl = document.getElementById('noPaymentData');
    const payVals = Object.values(paymentMap);

    if (payVals.every(v => v === 0)) {
      noPaymentEl.classList.remove('hidden');
    } else {
      noPaymentEl.classList.add('hidden');
    }

    if (paymentBarChart) paymentBarChart.destroy();
    paymentBarChart = new Chart(paymentCtx, {
      type: 'bar',
      data: {
        labels: ['UPI', 'Credit Card', 'Debit Card', 'Cash', 'NetBanking'],
        datasets: [{
          data: [
            paymentMap['UPI'],
            paymentMap['Credit Card'],
            paymentMap['Debit Card'],
            paymentMap['Cash'],
            paymentMap['NetBanking']
          ],
          backgroundColor: ['#10b981', '#6366f1', '#3b82f6', '#f59e0b', '#8b5cf6'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 10, weight: '500' } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 10 },
              callback: (val) => formatCompactINR(val)
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${formatINR(ctx.raw)}`
            }
          }
        }
      }
    });

    // 4. Bar Chart: Month-over-Month Comparison
    const allMonthMap = {};
    expenses.forEach(item => {
      if (item.date && item.date.length >= 7) {
        const ym = item.date.substring(0, 7);
        allMonthMap[ym] = (allMonthMap[ym] || 0) + item.amount;
      }
    });

    const sortedMonths = Object.keys(allMonthMap).sort();
    const monthlyCtx = document.getElementById('monthlyCompareChart').getContext('2d');
    const noMonthEl = document.getElementById('noMonthlyData');

    if (sortedMonths.length === 0) {
      noMonthEl.classList.remove('hidden');
    } else {
      noMonthEl.classList.add('hidden');
    }

    if (monthlyBarChart) monthlyBarChart.destroy();
    monthlyBarChart = new Chart(monthlyCtx, {
      type: 'bar',
      data: {
        labels: sortedMonths.map(ym => {
          const [y, m] = ym.split('-');
          return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        }),
        datasets: [{
          label: 'Total Spent',
          data: sortedMonths.map(ym => allMonthMap[ym]),
          backgroundColor: '#3b82f6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 10 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 10 },
              callback: (val) => formatCompactINR(val)
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Total: ${formatINR(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  // --- Render Expense Table & Mobile Cards ---
  function renderExpenseList(filteredList) {
    tableItemCount.textContent = filteredList.length;

    if (filteredList.length === 0) {
      expenseTableBody.innerHTML = '';
      mobileExpenseCardList.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    // Desktop Table Rows
    expenseTableBody.innerHTML = filteredList.map(item => {
      const catColor = CATEGORY_COLORS[item.category] || '#10b981';
      const catIcon = CATEGORY_ICONS[item.category] || '📦';
      return `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
          <td class="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
            ${formatDate(item.date)}
          </td>
          <td class="py-3 px-4 text-slate-900 dark:text-white font-semibold">
            ${item.title}
            ${item.notes ? `<div class="text-[11px] text-slate-400 font-normal truncate max-w-xs">${item.notes}</div>` : ''}
          </td>
          <td class="py-3 px-4">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style="background-color: ${catColor}15; color: ${catColor}; border: 1px solid ${catColor}30;">
              <span>${catIcon}</span>
              <span>${item.category}</span>
            </span>
          </td>
          <td class="py-3 px-4">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              ${item.paymentMode}
            </span>
          </td>
          <td class="py-3 px-4 text-right mono font-bold text-slate-900 dark:text-white text-sm">
            ${formatINR(item.amount)}
          </td>
          <td class="py-3 px-4 text-right whitespace-nowrap">
            <button onclick="window.editExpense('${item.id}')" class="p-1.5 text-slate-400 hover:text-blue-500 rounded transition" title="Edit">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="window.deleteExpense('${item.id}')" class="p-1.5 text-slate-400 hover:text-rose-500 rounded transition" title="Delete">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Mobile Card List
    mobileExpenseCardList.innerHTML = filteredList.map(item => {
      const catColor = CATEGORY_COLORS[item.category] || '#10b981';
      const catIcon = CATEGORY_ICONS[item.category] || '📦';
      return `
        <div class="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style="background-color: ${catColor}15;">
              ${catIcon}
            </div>
            <div class="min-w-0">
              <h4 class="text-xs font-bold text-slate-900 dark:text-white truncate">${item.title}</h4>
              <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                <span>${formatDate(item.date)}</span>
                <span>•</span>
                <span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">${item.paymentMode}</span>
              </div>
              ${item.notes ? `<p class="text-[10px] text-slate-400 truncate mt-0.5">${item.notes}</p>` : ''}
            </div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-sm font-extrabold mono text-slate-900 dark:text-white">
              ${formatINR(item.amount)}
            </div>
            <div class="flex items-center justify-end gap-1 mt-1">
              <button onclick="window.editExpense('${item.id}')" class="p-1 text-slate-400 hover:text-blue-500 rounded">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="window.deleteExpense('${item.id}')" class="p-1 text-slate-400 hover:text-rose-500 rounded">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  // --- Master View Refresh ---
  function refreshView() {
    renderMonthDropdown();
    const filtered = getFilteredExpenses();
    updateKPIs(filtered);
    updateCharts(filtered);
    renderExpenseList(filtered);
  }

  // --- Add / Edit Expense Logic ---
  function openAddModal() {
    modalTitle.innerHTML = `<i data-lucide="plus-circle" class="w-5 h-5 text-emerald-500"></i> Add New Expense`;
    expenseIdInput.value = '';
    expenseForm.reset();
    formDate.value = new Date().toISOString().split('T')[0];
    expenseModal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
    formAmount.focus();
  }

  window.editExpense = function (id) {
    const item = expenses.find(e => e.id === id);
    if (!item) return;

    modalTitle.innerHTML = `<i data-lucide="edit-3" class="w-5 h-5 text-blue-500"></i> Edit Expense`;
    expenseIdInput.value = item.id;
    formAmount.value = item.amount;
    formTitle.value = item.title;
    formCategory.value = item.category;
    formPaymentMode.value = item.paymentMode;
    formDate.value = item.date;
    formNotes.value = item.notes || '';

    expenseModal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
    formAmount.focus();
  };

  window.deleteExpense = function (id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    expenses = expenses.filter(e => e.id !== id);
    saveData();
    refreshView();
  };

  function closeModal() {
    expenseModal.classList.add('hidden');
  }

  // Form Submit
  expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = expenseIdInput.value;
    const amount = parseFloat(formAmount.value);
    const title = formTitle.value.trim();
    const category = formCategory.value;
    const paymentMode = formPaymentMode.value;
    const date = formDate.value;
    const notes = formNotes.value.trim();

    if (isNaN(amount) || amount <= 0 || !title || !date) {
      alert('Please fill all required fields with valid details.');
      return;
    }

    if (id) {
      // Edit
      const index = expenses.findIndex(e => e.id === id);
      if (index !== -1) {
        expenses[index] = { id, title, amount, category, paymentMode, date, notes };
      }
    } else {
      // Create
      const newExpense = {
        id: 'exp_' + Date.now(),
        title,
        amount,
        category,
        paymentMode,
        date,
        notes
      };
      expenses.unshift(newExpense);
    }

    saveData();
    closeModal();
    refreshView();
  });

  // Quick Amount Buttons
  document.querySelectorAll('.quick-amt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const addVal = parseFloat(btn.dataset.amt) || 0;
      const current = parseFloat(formAmount.value) || 0;
      formAmount.value = (current + addVal).toFixed(2);
    });
  });

  // --- Budget Modal Logic ---
  setBudgetOption.addEventListener('click', () => {
    budgetInput.value = monthlyBudget;
    budgetModal.classList.remove('hidden');
    moreMenuDropdown.classList.add('hidden');
    budgetInput.focus();
  });

  function closeBudgetModal() {
    budgetModal.classList.add('hidden');
  }

  closeBudgetModalBtn.addEventListener('click', closeBudgetModal);
  cancelBudgetBtn.addEventListener('click', closeBudgetModal);

  saveBudgetBtn.addEventListener('click', () => {
    const val = parseFloat(budgetInput.value);
    if (!isNaN(val) && val >= 0) {
      monthlyBudget = val;
      saveBudget();
      closeBudgetModal();
      refreshView();
    } else {
      alert('Please enter a valid monthly budget amount.');
    }
  });

  // --- Export CSV ---
  exportCsvOption.addEventListener('click', () => {
    moreMenuDropdown.classList.add('hidden');
    if (expenses.length === 0) {
      alert('No expense data to export.');
      return;
    }

    const headers = ['ID', 'Date', 'Merchant_Title', 'Category', 'Payment_Mode', 'Amount_INR', 'Notes'];
    const rows = expenses.map(e => [
      e.id,
      e.date,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${e.paymentMode}"`,
      e.amount,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Spendings_Backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // --- Backup JSON ---
  backupJsonOption.addEventListener('click', () => {
    moreMenuDropdown.classList.add('hidden');
    const dataObj = {
      version: 1,
      exportedAt: new Date().toISOString(),
      monthlyBudget,
      expenses
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataObj, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `Spendings_Tracker_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // --- Restore JSON ---
  restoreJsonInput.addEventListener('change', (e) => {
    moreMenuDropdown.classList.add('hidden');
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && Array.isArray(parsed.expenses)) {
          expenses = parsed.expenses;
          if (parsed.monthlyBudget) monthlyBudget = parsed.monthlyBudget;
          saveData();
          saveBudget();
          refreshView();
          alert('Backup restored successfully!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // --- Theme Toggle (Standalone Swinglytics Style) ---
  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'dark');
      document.getElementById('themeColorMeta').setAttribute('content', '#0b0f17');
      if (themeIconSun) themeIconSun.classList.remove('hidden');
      if (themeIconMoon) themeIconMoon.classList.add('hidden');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'light');
      document.getElementById('themeColorMeta').setAttribute('content', '#ffffff');
      if (themeIconSun) themeIconSun.classList.add('hidden');
      if (themeIconMoon) themeIconMoon.classList.remove('hidden');
    }
    refreshView();
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      applyTheme(!isDark);
    });
  }

  // Initialize Theme
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
  if (savedTheme === 'light') {
    applyTheme(false);
  } else {
    applyTheme(true);
  }

  // --- Category Filter Pills ---
  categoryFilterPills.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const cat = btn.dataset.cat;
    selectedCategory = cat;

    // Active pill styles
    categoryFilterPills.querySelectorAll('button').forEach(b => {
      b.className = 'px-2.5 py-1 rounded-lg font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0';
    });
    btn.className = 'px-2.5 py-1 rounded-lg font-semibold bg-emerald-500 text-slate-950 transition shrink-0 active:scale-95';

    refreshView();
  });

  // --- Search Input ---
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    refreshView();
  });

  // --- Dropdown Toggles & Click Outside ---
  monthDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    monthDropdownMenu.classList.toggle('hidden');
    moreMenuDropdown.classList.add('hidden');
  });

  moreMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    moreMenuDropdown.classList.toggle('hidden');
    monthDropdownMenu.classList.add('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!monthDropdownContainer.contains(e.target)) {
      monthDropdownMenu.classList.add('hidden');
    }
    if (!moreMenuContainer.contains(e.target)) {
      moreMenuDropdown.classList.add('hidden');
    }
  });

  // --- Modal Event Listeners ---
  openAddModalBtn.addEventListener('click', openAddModal);
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);

  // --- Bank Statement Parsing & Auto-Categorization Logic ---
  
  // Smart rule-based merchant & category identifier for Indian Transactions
  function categorizeTransaction(narration) {
    const text = (narration || '').toLowerCase();
    
    // Food & Dining
    if (/swiggy|zomato|mcdonald|kfc|domino|starbucks|pizza|burger|cafe|tea|coffee|restaurant|hotel|baker|dhaba|eats|biryani|subway/.test(text)) {
      return 'Food & Dining';
    }
    // Groceries
    if (/blinkit|zepto|instamart|bigbasket|supermarket|dmart|reliance fresh|spencer|provision|vegetable|fruit|dairy|milk|kirana|nilgiris/.test(text)) {
      return 'Groceries';
    }
    // Travel & Fuel
    if (/petrol|fuel|hpcl|bpcl|iocl|shell|uber|ola|rapido|irctc|railway|makemytrip|indigo|air india|fastag|toll|parking|metro|flight/.test(text)) {
      return 'Travel & Fuel';
    }
    // Bills & Utilities
    if (/bescom|tneb|electricity|airtel|jio|vodafone|vi|broadband|wifi|water|gas|indane|bharat gas|billdesk|recharge|dth|tata play|lic|insurance|rent/.test(text)) {
      return 'Bills & Utilities';
    }
    // Shopping
    if (/amazon|flipkart|myntra|ajio|zara|h&m|decathlon|croma|reliance digital|meesho|nykaa|shoppers stop|lifestyle|westside|cloth|fashion/.test(text)) {
      return 'Shopping';
    }
    // Entertainment
    if (/netflix|spotify|hotstar|prime|youtube|cinema|pvr|inox|bookmyshow|game|playstation|disney|ticket|movie/.test(text)) {
      return 'Entertainment';
    }
    // Health
    if (/apollo|pharmacy|medplus|netmeds|1mg|hospital|clinic|doctor|lab|diagnostic|practo|dentist|healthcare/.test(text)) {
      return 'Health';
    }
    return 'Others';
  }

  function detectPaymentMode(narration) {
    const text = (narration || '').toUpperCase();
    if (text.includes('UPI') || text.includes('VPA') || text.includes('GPAY') || text.includes('PAYTM') || text.includes('PHONEPE')) {
      return 'UPI';
    }
    if (text.includes('POS') || text.includes('CARD') || text.includes('ECOM')) {
      return 'Debit Card';
    }
    if (text.includes('ATM') || text.includes('CASH') || text.includes('WDL')) {
      return 'Cash';
    }
    if (text.includes('NEFT') || text.includes('RTGS') || text.includes('IMPS') || text.includes('INB') || text.includes('NETBANKING')) {
      return 'NetBanking';
    }
    return 'UPI';
  }

  // Clean raw bank narration into a readable merchant title
  function cleanMerchantTitle(narration) {
    if (!narration) return 'Expense';
    let s = narration.trim();

    // Standard UPI clean: e.g. "UPI/428394839/SWIGGY/HDFC" or "UPI-ZOMATO-PAY"
    const upiMatch = s.match(/UPI(?:\/|-)[^/]+(?:\/|-)([A-Za-z0-9\s&._-]+)/i);
    if (upiMatch && upiMatch[1]) {
      let candidate = upiMatch[1].replace(/@[a-zA-Z0-9]+/, '').trim();
      if (candidate.length > 2) return candidate;
    }

    // POS e.g. "POS 4012XXXXXXXX1234 RELIANCE RETAIL"
    const posMatch = s.match(/POS\s+[X0-9]+\s+([A-Za-z0-9\s&._-]+)/i);
    if (posMatch && posMatch[1]) {
      return posMatch[1].trim();
    }

    // Strip long reference numbers and bank codes
    s = s.replace(/[\d]{8,}/g, '')
         .replace(/\b(REF|NO|TXN|UTRN|CMS|BIL|IMPS|NEFT|RTGS|NACH|ACH)\b/gi, '')
         .replace(/[\/\\|*_-]+/g, ' ')
         .replace(/\s+/g, ' ')
         .trim();

    return s.length > 3 ? s.substring(0, 35) : narration.substring(0, 35);
  }

  // Parse Indian Date Formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD-MMM-YY, etc.)
  function parseBankDate(dStr) {
    if (!dStr) return new Date().toISOString().split('T')[0];
    const s = dStr.toString().trim();

    // Match DD/MM/YYYY or DD-MM-YYYY
    const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (dmy) {
      let day = dmy[1].padStart(2, '0');
      let month = dmy[2].padStart(2, '0');
      let year = dmy[3];
      if (year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }

    // Match DD-MMM-YYYY or DD MMM YYYY (e.g. 05-Oct-2026 or 05 Oct 2026)
    const monthNames = { jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06', jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12' };
    const dMmmY = s.match(/^(\d{1,2})[\s/-]([A-Za-z]{3})[\s/-](\d{2,4})$/);
    if (dMmmY) {
      let day = dMmmY[1].padStart(2, '0');
      let monKey = dMmmY[2].toLowerCase();
      let month = monthNames[monKey] || '01';
      let year = dMmmY[3];
      if (year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }

    // Match YYYY-MM-DD
    const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) return s;

    return new Date().toISOString().split('T')[0];
  }

  // Clean Indian number string e.g. " 1,450.50 ", " 1450.50 (Dr) "
  function parseAmount(val) {
    if (val === undefined || val === null) return 0;
    let s = val.toString().replace(/,/g, '').replace(/₹/g, '').replace(/[^\d.-]/g, '').trim();
    const num = parseFloat(s);
    return isNaN(num) ? 0 : Math.abs(num);
  }

  // Bank Statement Parser Core
  function processBankStatementRows(rows) {
    if (!rows || rows.length < 2) {
      alert('The uploaded file does not contain valid tabular statement rows.');
      return;
    }

    // 1. Locate Header Row
    let headerRowIdx = -1;
    let detectedBank = 'Standard Statement';
    let dateCol = -1, descCol = -1, debitCol = -1, creditCol = -1, amountCol = -1, typeCol = -1;

    for (let r = 0; r < Math.min(25, rows.length); r++) {
      const row = rows[r].map(c => (c || '').toString().trim().toLowerCase());
      
      // Check bank clues in upper lines or header
      const rowStr = row.join(' ');
      if (rowStr.includes('hdfc')) detectedBank = 'HDFC Bank';
      else if (rowStr.includes('state bank') || rowStr.includes('sbi')) detectedBank = 'State Bank of India (SBI)';
      else if (rowStr.includes('icici')) detectedBank = 'ICICI Bank';
      else if (rowStr.includes('axis')) detectedBank = 'Axis Bank';
      else if (rowStr.includes('kotak')) detectedBank = 'Kotak Mahindra';

      // Look for columns: Date, Narration/Particulars/Description, Withdrawal/Debit, Credit/Deposit
      for (let c = 0; c < row.length; c++) {
        const col = row[c];
        if (dateCol === -1 && (col === 'date' || col.includes('txn date') || col.includes('transaction date') || col.includes('value date'))) {
          dateCol = c;
        }
        if (descCol === -1 && (col.includes('narration') || col.includes('particular') || col.includes('description') || col.includes('details') || col.includes('remarks'))) {
          descCol = c;
        }
        if (debitCol === -1 && (col.includes('debit') || col.includes('withdrawal') || col.includes('dr'))) {
          debitCol = c;
        }
        if (creditCol === -1 && (col.includes('credit') || col.includes('deposit') || col.includes('cr'))) {
          creditCol = c;
        }
        if (amountCol === -1 && (col === 'amount' || col.includes('txn amount'))) {
          amountCol = c;
        }
        if (typeCol === -1 && (col.includes('type') || col.includes('dr/cr'))) {
          typeCol = c;
        }
      }

      if (dateCol !== -1 && (descCol !== -1 || r > 0) && (debitCol !== -1 || amountCol !== -1)) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) {
      // Fallback heuristics: check first 3 columns
      dateCol = 0;
      descCol = 1;
      debitCol = 2;
      headerRowIdx = 0;
    }

    // 2. Extract Debit Transactions
    const extracted = [];
    let totalDebitSum = 0;

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length <= 1) continue;

      const rawDate = row[dateCol];
      const rawDesc = descCol !== -1 ? (row[descCol] || '') : 'Expense';
      
      let debitAmt = 0;

      if (debitCol !== -1) {
        debitAmt = parseAmount(row[debitCol]);
      } else if (amountCol !== -1) {
        const rawAmt = row[amountCol];
        const rawType = typeCol !== -1 ? (row[typeCol] || '').toLowerCase() : '';
        const rawDescLower = rawDesc.toLowerCase();

        // Check if debit or credit
        if (rawType.includes('cr') || rawDescLower.includes('credit') || rawDescLower.includes('salary') || rawDescLower.includes('cashback')) {
          debitAmt = 0; // Skip credits/deposits
        } else {
          debitAmt = parseAmount(rawAmt);
        }
      }

      // Check if this is a genuine debit expense
      if (debitAmt > 0 && rawDate && rawDate.toString().trim() !== '') {
        const parsedDate = parseBankDate(rawDate);
        const category = categorizeTransaction(rawDesc);
        const paymentMode = detectPaymentMode(rawDesc);
        const cleanTitle = cleanMerchantTitle(rawDesc);

        extracted.push({
          id: 'stmt_' + Date.now() + '_' + r,
          title: cleanTitle,
          amount: debitAmt,
          category,
          paymentMode,
          date: parsedDate,
          notes: rawDesc.substring(0, 100)
        });

        totalDebitSum += debitAmt;
      }
    }

    if (extracted.length === 0) {
      alert('No debit/expense transactions could be detected. Please make sure the statement contains withdrawal/debit entries.');
      return;
    }

    // Update UI Preview
    parsedExpensesToImport = extracted;
    detectedBankTag.textContent = detectedBank;
    importStatusText.textContent = `Successfully found ${extracted.length} debit transactions`;
    parsedDebitCount.textContent = extracted.length;
    parsedTotalAmount.textContent = `Total: ${formatINR(totalDebitSum)}`;

    importPreviewTableBody.innerHTML = extracted.slice(0, 50).map(item => `
      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
        <td class="py-1.5 px-3 whitespace-nowrap text-slate-500">${formatDate(item.date)}</td>
        <td class="py-1.5 px-3 truncate max-w-xs text-slate-900 dark:text-white font-semibold">
          ${item.title}
          <div class="text-[10px] text-slate-400 truncate">${item.notes}</div>
        </td>
        <td class="py-1.5 px-3 whitespace-nowrap">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold" style="background-color: ${CATEGORY_COLORS[item.category]}20; color: ${CATEGORY_COLORS[item.category]};">
            ${CATEGORY_ICONS[item.category]} ${item.category}
          </span>
        </td>
        <td class="py-1.5 px-3 text-right mono font-bold text-rose-500 whitespace-nowrap">${formatINR(item.amount)}</td>
      </tr>
    `).join('');

    importStatusBanner.classList.remove('hidden');
    importPreviewContainer.classList.remove('hidden');
    confirmImportBtn.removeAttribute('disabled');
  }

  // File Upload Handlers
  function handleStatementFile(file) {
    if (!file) return;
    
    // Parse using PapaParse
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: function(results) {
        processBankStatementRows(results.data);
      },
      error: function(err) {
        alert('Error parsing CSV file: ' + err.message);
      }
    });
  }

  // Modal Open/Close
  function openImportModal() {
    parsedExpensesToImport = [];
    importStatusBanner.classList.add('hidden');
    importPreviewContainer.classList.add('hidden');
    confirmImportBtn.setAttribute('disabled', 'true');
    bankStatementFileInput.value = '';
    importModal.classList.remove('hidden');
    moreMenuDropdown.classList.add('hidden');
  }

  function closeImportModal() {
    importModal.classList.add('hidden');
  }

  openImportModalBtn.addEventListener('click', openImportModal);
  menuImportStatementBtn.addEventListener('click', openImportModal);
  closeImportModalBtn.addEventListener('click', closeImportModal);
  cancelImportBtn.addEventListener('click', closeImportModal);

  // Dropzone click & drag-and-drop
  dropzoneContainer.addEventListener('click', () => bankStatementFileInput.click());
  bankStatementFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleStatementFile(e.target.files[0]);
    }
  });

  dropzoneContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzoneContainer.classList.add('border-emerald-500', 'bg-emerald-500/10');
  });

  dropzoneContainer.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzoneContainer.classList.remove('border-emerald-500', 'bg-emerald-500/10');
  });

  dropzoneContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneContainer.classList.remove('border-emerald-500', 'bg-emerald-500/10');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleStatementFile(e.dataTransfer.files[0]);
    }
  });

  // Confirm Import
  confirmImportBtn.addEventListener('click', () => {
    if (parsedExpensesToImport.length === 0) return;

    // Prevent duplicate entries by checking date + amount + title
    let addedCount = 0;
    parsedExpensesToImport.forEach(newExp => {
      const isDuplicate = expenses.some(existing => 
        existing.date === newExp.date && 
        Math.abs(existing.amount - newExp.amount) < 0.01 &&
        existing.title === newExp.title
      );
      if (!isDuplicate) {
        expenses.unshift(newExp);
        addedCount++;
      }
    });

    saveData();
    closeImportModal();
    refreshView();
    alert(`Successfully imported ${addedCount} expenses from your bank statement! (${parsedExpensesToImport.length - addedCount} duplicates skipped)`);
  });

  // Close modals on Esc key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeBudgetModal();
      closeImportModal();
      monthDropdownMenu.classList.add('hidden');
      moreMenuDropdown.classList.add('hidden');
    }
  });

  // --- PWA Installation & Service Worker ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW failed', err));
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installAppOption.classList.remove('hidden');
  });

  installAppOption.addEventListener('click', async () => {
    moreMenuDropdown.classList.add('hidden');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installAppOption.classList.add('hidden');
      }
      deferredPrompt = null;
    }
  });

  // --- App Bootstrap ---
  loadData();
  refreshView();

})();
