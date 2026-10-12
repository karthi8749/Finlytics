// Spendings Tracker - Full Application Logic
// Handles Data State, LocalStorage, Chart.js Visuals, PWA, Filters & Budget

(function () {
  'use strict';

  // --- Constants & Categories ---
  const STORAGE_KEY_EXPENSES = 'spendings_tracker_items_v1';
  const STORAGE_KEY_BUDGET = 'spendings_tracker_monthly_budget_v1';
  const STORAGE_KEY_THEME = 'spendings_tracker_theme_v1';

  const STORAGE_KEY_CUSTOM_CATS = 'finlytics_custom_categories_v1';

  // Default Categories
  const DEFAULT_CATEGORIES = {
    'Food & Dining': { color: '#f97316', icon: '🍔' },
    'Groceries': { color: '#10b981', icon: '🛒' },
    'Travel & Fuel': { color: '#3b82f6', icon: '🚗' },
    'Bills & Utilities': { color: '#8b5cf6', icon: '⚡' },
    'Shopping': { color: '#ec4899', icon: '🛍️' },
    'Entertainment': { color: '#eab308', icon: '🎬' },
    'Health': { color: '#06b6d4', icon: '💊' },
    'Others': { color: '#64748b', icon: '📦' }
  };

  let CATEGORY_REGISTRY = { ...DEFAULT_CATEGORIES };

  function loadCategories() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_CATS);
      if (raw) {
        const custom = JSON.parse(raw);
        CATEGORY_REGISTRY = { ...DEFAULT_CATEGORIES, ...custom };
      }
    } catch (e) {
      console.warn('Failed to load custom categories', e);
    }
  }

  function saveCategories() {
    localStorage.setItem(STORAGE_KEY_CUSTOM_CATS, JSON.stringify(CATEGORY_REGISTRY));
  }

  // Accessor helpers
  const CATEGORY_COLORS = new Proxy({}, {
    get(target, prop) {
      return CATEGORY_REGISTRY[prop] ? CATEGORY_REGISTRY[prop].color : '#64748b';
    }
  });

  const CATEGORY_ICONS = new Proxy({}, {
    get(target, prop) {
      return CATEGORY_REGISTRY[prop] ? CATEGORY_REGISTRY[prop].icon : '🏷️';
    }
  });

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

        // One-time auto migration: Clean raw bank titles, strip trailing -- from notes, and fix categorization
        let migrated = false;
        expenses.forEach(e => {
          if (!e.notes) e.notes = e.title;

          // Strip trailing dash placeholders from notes e.g. " - -" or " --"
          if (e.notes) {
            const cleanNotes = e.notes.replace(/\s*-\s*-+\s*$/g, '').trim();
            if (cleanNotes !== e.notes) {
              e.notes = cleanNotes;
              migrated = true;
            }
          }

          // Clean merchant title using raw notes or existing title
          const cleaned = cleanMerchantTitle(e.notes || e.title);
          if (cleaned && cleaned !== e.title && cleaned.length >= 2) {
            e.title = cleaned;
            migrated = true;
          }

          // Also auto-fix category if currently Others
          if (e.category === 'Others') {
            const reCat = categorizeTransaction(e.notes || e.title);
            if (reCat !== 'Others') {
              e.category = reCat;
              migrated = true;
            }
          }
        });
        if (migrated) {
          saveData();
          console.log('⚡ Finlytics auto-cleaned existing transactions and categorization!');
        }

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
      <span id="kpiBurnRateEstimate" class="hidden"></span>
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

    // --- Metric 4: Month-over-Month (MoM) % Growth Pill ---
    const kpiMomBadge = document.getElementById('kpiMomBadge');
    const kpiMomComparisonText = document.getElementById('kpiMomComparisonText');

    if (kpiMomBadge) {
      let currentMonthSpent = totalSpent;
      let prevMonthSpent = 0;
      let prevMonthName = '';

      if (selectedMonth === 'all') {
        // Compare latest month with second latest month
        const allMonths = getAvailableMonths();
        if (allMonths.length >= 2) {
          const m1 = allMonths[0]; // newest
          const m2 = allMonths[1]; // previous
          currentMonthSpent = expenses.filter(e => e.date && e.date.startsWith(m1)).reduce((s, e) => s + e.amount, 0);
          prevMonthSpent = expenses.filter(e => e.date && e.date.startsWith(m2)).reduce((s, e) => s + e.amount, 0);
          prevMonthName = getMonthName(m2).split(' ')[0];
        }
      } else {
        // Find previous chronological month
        const [currY, currM] = selectedMonth.split('-').map(Number);
        const prevDate = new Date(currY, currM - 2, 1);
        const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        prevMonthSpent = expenses.filter(e => e.date && e.date.startsWith(prevYm)).reduce((s, e) => s + e.amount, 0);
        prevMonthName = prevDate.toLocaleDateString('en-IN', { month: 'short' });
      }

      if (prevMonthSpent > 0) {
        const diff = currentMonthSpent - prevMonthSpent;
        const pctChange = ((diff / prevMonthSpent) * 100).toFixed(1);
        kpiMomBadge.classList.remove('hidden');

        if (diff > 0) {
          kpiMomBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 flex items-center gap-0.5';
          kpiMomBadge.innerHTML = `<span>+${pctChange}%</span> <span>↑</span>`;
          if (kpiMomComparisonText) kpiMomComparisonText.textContent = `+${formatINR(diff)} vs ${prevMonthName}`;
        } else {
          kpiMomBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center gap-0.5';
          kpiMomBadge.innerHTML = `<span>${pctChange}%</span> <span>↓</span>`;
          if (kpiMomComparisonText) kpiMomComparisonText.textContent = `Saved ${formatINR(Math.abs(diff))} vs ${prevMonthName}`;
        }
      } else {
        kpiMomBadge.classList.add('hidden');
        if (kpiMomComparisonText) kpiMomComparisonText.textContent = `${count} total transactions`;
      }
    }

    // --- Metric 3: Spending Velocity / Burn Rate Alert ---
    const kpiVelocityBadge = document.getElementById('kpiVelocityBadge');
    const kpiBurnRateEstimate = document.getElementById('kpiBurnRateEstimate');

    if (kpiVelocityBadge) {
      if (targetBudget <= 0) {
        kpiVelocityBadge.textContent = 'No Limit Set';
        kpiVelocityBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400';
        if (kpiBurnRateEstimate) kpiBurnRateEstimate.textContent = 'Set monthly budget';
      } else {
        // How many days left in the month
        const daysLeft = Math.max(1, daysInPeriod - daysPassed);
        const remainingBudget = targetBudget - totalSpent;
        
        if (remainingBudget <= 0) {
          kpiVelocityBadge.textContent = 'Budget Exceeded 🔥';
          kpiVelocityBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500';
          if (kpiBurnRateEstimate) kpiBurnRateEstimate.textContent = `Over limit by ${formatINR(Math.abs(remainingBudget))}`;
        } else {
          const burnDaysLeft = dailyAvg > 0 ? (remainingBudget / dailyAvg) : 999;

          if (burnDaysLeft < daysLeft) {
            const outDate = Math.min(daysInPeriod, Math.round(daysPassed + burnDaysLeft));
            kpiVelocityBadge.textContent = `Fast Burn Rate ⚡`;
            kpiVelocityBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400';
            if (kpiBurnRateEstimate) kpiBurnRateEstimate.textContent = `Exhausts around day ${outDate}`;
          } else {
            kpiVelocityBadge.textContent = `Safe Pace 🛡️`;
            kpiVelocityBadge.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400';
            if (kpiBurnRateEstimate) kpiBurnRateEstimate.textContent = `Safe: ₹${(remainingBudget / daysLeft).toFixed(0)}/day left`;
          }
        }
      }
    }
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

    // --- Metric 2: Top 5 Merchants Leaderboard ---
    const topMerchantsList = document.getElementById('topMerchantsList');
    if (topMerchantsList) {
      const merchantMap = {};
      filteredList.forEach(item => {
        const m = (item.title || 'Other').trim();
        merchantMap[m] = (merchantMap[m] || 0) + item.amount;
      });

      const sortedMerchants = Object.entries(merchantMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (sortedMerchants.length === 0) {
        topMerchantsList.innerHTML = `<div class="py-4 text-center text-xs text-slate-400">No merchant transactions in this period</div>`;
      } else {
        const highestAmt = sortedMerchants[0][1] || 1;
        const totalFilterAmt = filteredList.reduce((s, e) => s + e.amount, 0) || 1;

        topMerchantsList.innerHTML = sortedMerchants.map(([mName, mAmt], idx) => {
          const rankColors = ['bg-amber-400 text-slate-950', 'bg-slate-300 text-slate-900', 'bg-amber-600 text-white', 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300', 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'];
          const pctOfTotal = ((mAmt / totalFilterAmt) * 100).toFixed(1);
          const barWidth = Math.min(100, Math.round((mAmt / highestAmt) * 100));

          return `
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="w-4 h-4 rounded-full ${rankColors[idx]} font-extrabold text-[10px] flex items-center justify-center shrink-0">
                    ${idx + 1}
                  </span>
                  <span class="font-semibold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs">${mName}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-[10px] text-slate-400">${pctOfTotal}%</span>
                  <span class="font-bold mono text-slate-900 dark:text-white">${formatINR(mAmt)}</span>
                </div>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" style="width: ${barWidth}%;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // --- Metric 1: Weekend vs Weekday Spend Ratio ---
    const weekdayAmountEl = document.getElementById('weekdayAmount');
    const weekendAmountEl = document.getElementById('weekendAmount');
    const weekdayBar = document.getElementById('weekdayBar');
    const weekendBar = document.getElementById('weekendBar');
    const weekdayPctEl = document.getElementById('weekdayPct');
    const weekendPctEl = document.getElementById('weekendPct');
    const weekendInsightText = document.getElementById('weekendInsightText');

    if (weekdayAmountEl && weekendAmountEl) {
      let weekdaySum = 0;
      let weekendSum = 0;

      filteredList.forEach(item => {
        if (!item.date) return;
        const d = new Date(item.date);
        const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendSum += item.amount;
        } else {
          weekdaySum += item.amount;
        }
      });

      const totalWeekSum = weekdaySum + weekendSum;
      const weekdayPct = totalWeekSum > 0 ? ((weekdaySum / totalWeekSum) * 100) : 50;
      const weekendPct = totalWeekSum > 0 ? ((weekendSum / totalWeekSum) * 100) : 50;

      weekdayAmountEl.textContent = formatINR(weekdaySum);
      weekendAmountEl.textContent = formatINR(weekendSum);

      if (weekdayBar) weekdayBar.style.width = `${weekdayPct.toFixed(1)}%`;
      if (weekendBar) weekendBar.style.width = `${weekendPct.toFixed(1)}%`;

      if (weekdayPctEl) weekdayPctEl.textContent = `${weekdayPct.toFixed(1)}% (${(weekdayPct > 0 ? '5 days/wk' : '')})`;
      if (weekendPctEl) weekendPctEl.textContent = `${weekendPct.toFixed(1)}% (${(weekendPct > 0 ? '2 days/wk' : '')})`;

      if (weekendInsightText) {
        if (totalWeekSum === 0) {
          weekendInsightText.textContent = 'No transaction data available yet.';
        } else if (weekendPct >= 40) {
          weekendInsightText.innerHTML = `⚠️ <strong class="text-pink-400 font-bold">${weekendPct.toFixed(0)}%</strong> of your expenses happen on just 2 weekend days! Consider setting weekend limits.`;
        } else {
          weekendInsightText.innerHTML = `✅ Healthy distribution! <strong class="text-indigo-400 font-bold">${weekdayPct.toFixed(0)}%</strong> of spending happens evenly across weekdays.`;
        }
      }
    }

    // --- Metric 3C: AI Financial Advisor & Savings Insights ---
    renderAISpendingInsights(filteredList);
  }

  // Smart Engine to produce high-value actionable financial advice & leak detection
  function renderAISpendingInsights(filteredList) {
    const aiGrid = document.getElementById('aiInsightsGrid');
    if (!aiGrid) return;

    if (!filteredList || filteredList.length === 0) {
      aiGrid.innerHTML = `
        <div class="col-span-full py-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
          Add or import transactions to activate AI financial analysis & savings recommendations.
        </div>
      `;
      return;
    }

    const totalSpent = filteredList.reduce((acc, c) => acc + (c.amount || 0), 0);
    const insights = [];

    // 1. Food & Dining / Delivery Leak Detection
    const foodItems = filteredList.filter(e => e.category === 'Food & Dining' || /swiggy|zomato|eats|kfc|mcdonald/i.test(e.title || ''));
    const foodSum = foodItems.reduce((s, e) => s + e.amount, 0);
    const foodPct = totalSpent > 0 ? (foodSum / totalSpent) * 100 : 0;

    if (foodPct >= 25 && foodSum > 1500) {
      insights.push({
        type: 'leak',
        icon: 'utensils',
        color: 'rose',
        badge: 'Food Spending Alert',
        title: `High Dining & Delivery (${foodPct.toFixed(0)}%)`,
        desc: `You spent ${formatINR(foodSum)} across ${foodItems.length} transactions. Cooking at home 2 more days/week can save around ~${formatINR(foodSum * 0.35)}/month.`
      });
    }

    // 2. Micro-Transactions / Small Leaks (transactions <= ₹200)
    const microItems = filteredList.filter(e => e.amount <= 200 && e.amount > 0);
    const microSum = microItems.reduce((s, e) => s + e.amount, 0);
    if (microItems.length >= 8 && microSum > 800) {
      insights.push({
        type: 'micro',
        icon: 'coffee',
        color: 'amber',
        badge: 'Small Purchases Leak',
        title: `${microItems.length} Micro-Spends Found`,
        desc: `Quick spends under ₹200 totaled ${formatINR(microSum)}. These silent transactions add up fast without notice.`
      });
    }

    // 3. Top Merchant Dominance
    const merchantMap = {};
    filteredList.forEach(e => {
      const m = (e.title || 'Other').trim();
      merchantMap[m] = (merchantMap[m] || 0) + e.amount;
    });
    const sortedM = Object.entries(merchantMap).sort((a, b) => b[1] - a[1]);
    if (sortedM.length > 0) {
      const [topM, topMAmt] = sortedM[0];
      const mPct = totalSpent > 0 ? (topMAmt / totalSpent) * 100 : 0;
      if (mPct >= 30 && totalSpent > 2000) {
        insights.push({
          type: 'dominance',
          icon: 'target',
          color: 'blue',
          badge: 'Top Payee Concentration',
          title: `${topM} took ${mPct.toFixed(0)}% of funds`,
          desc: `${formatINR(topMAmt)} went to a single payee. Monitor recurring transfers or consolidate vendor payments.`
        });
      }
    }

    // 4. Peak Spending Day of the Week (Option 2)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];

    filteredList.forEach(e => {
      if (!e.date) return;
      const dayIdx = new Date(e.date).getDay();
      if (!isNaN(dayIdx)) {
        dayTotals[dayIdx] += e.amount;
        dayCounts[dayIdx]++;
      }
    });

    let maxDayIdx = 0;
    let maxDayAmt = 0;
    for (let d = 0; d < 7; d++) {
      if (dayTotals[d] > maxDayAmt) {
        maxDayAmt = dayTotals[d];
        maxDayIdx = d;
      }
    }

    if (maxDayAmt > 0 && totalSpent > 0) {
      const peakDayPct = ((maxDayAmt / totalSpent) * 100).toFixed(0);
      const peakName = dayNames[maxDayIdx];
      const isWeekendDay = maxDayIdx === 0 || maxDayIdx === 6;

      insights.push({
        type: 'peak_day',
        icon: 'calendar',
        color: isWeekendDay ? 'rose' : 'blue',
        badge: 'Peak Spend Day 📊',
        title: `${peakName} is your Highest Spend Day (${peakDayPct}%)`,
        desc: `${formatINR(maxDayAmt)} spent across ${dayCounts[maxDayIdx]} transactions on ${peakName}s. Setting a daily limit on this day can save significant funds.`
      });
    }

    // 5. Positive Savings Achievement
    if (monthlyBudget > 0 && totalSpent < (monthlyBudget * 0.75)) {
      const savedProjected = monthlyBudget - totalSpent;
      insights.push({
        type: 'positive',
        icon: 'piggy-bank',
        color: 'emerald',
        badge: 'Savings Milestone',
        title: `Under Target Budget!`,
        desc: `You are maintaining a strong buffer with ${formatINR(savedProjected)} remaining under limit. Recommended: Allocate 50% to mutual funds or emergency fund.`
      });
    }

    // Fallback if very few conditions matched
    if (insights.length < 3) {
      insights.push({
        type: 'general',
        icon: 'sparkles',
        color: 'indigo',
        badge: 'Smart Budget Rule',
        title: '50-30-20 Financial Rule',
        desc: 'Aim for 50% Essentials (Rent, Groceries, Bills), 30% Wants (Dining, Shopping), and 20% Direct Wealth Savings.'
      });
    }

    // Render cards with click support for micro spends
    aiGrid.innerHTML = insights.slice(0, 3).map((item, idx) => {
      const colorMap = {
        rose: { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', badge: 'bg-rose-500/20 text-rose-300' },
        amber: { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
        blue: { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
        emerald: { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
        indigo: { bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300' }
      };
      const theme = colorMap[item.color] || colorMap.indigo;
      const isClickable = item.type === 'micro';

      return `
        <div data-ai-type="${item.type}" class="p-3.5 rounded-xl bg-slate-900/60 dark:bg-slate-900/90 border ${theme.bg} backdrop-blur-sm flex flex-col justify-between space-y-2 hover:border-emerald-500/40 transition ${isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-95 shadow-md shadow-amber-500/5' : ''}">
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.badge}">
                ${item.badge}
              </span>
              <div class="flex items-center gap-1">
                ${isClickable ? '<span class="text-[10px] text-amber-400 font-bold underline mr-1">View All &rarr;</span>' : ''}
                <i data-lucide="${item.icon}" class="w-4 h-4 ${theme.bg.split(' ')[2]}"></i>
              </div>
            </div>
            <h4 class="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>${item.title}</span>
            </h4>
            <p class="text-[11px] text-slate-300/90 leading-relaxed">${item.desc}</p>
          </div>
          ${isClickable ? `
            <div class="pt-1 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-amber-300/80 font-medium">
              <span>Tap to list all ${microItems.length} transactions</span>
              <span>🔍</span>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Attach click listener to micro spends card
    const microCard = aiGrid.querySelector('[data-ai-type="micro"]');
    if (microCard) {
      microCard.addEventListener('click', () => {
        openMicroPurchasesModal(microItems, microSum);
      });
    }

    if (window.lucide) lucide.createIcons();
  }

  // --- Micro-Purchases Breakdown Modal Logic ---
  const microPurchasesModal = document.getElementById('microPurchasesModal');
  const closeMicroModalBtn = document.getElementById('closeMicroModalBtn');
  const doneMicroModalBtn = document.getElementById('doneMicroModalBtn');
  const microModalList = document.getElementById('microModalList');
  const microModalTitle = document.getElementById('microModalTitle');
  const microModalSubtitle = document.getElementById('microModalSubtitle');
  const microModalTotal = document.getElementById('microModalTotal');

  function openMicroPurchasesModal(items, totalSum) {
    if (!microPurchasesModal) return;
    
    microModalTitle.textContent = `${items.length} Micro-Purchases Breakdown`;
    microModalSubtitle.textContent = `All quick expenses ≤ ₹200 from this period`;
    microModalTotal.innerHTML = `Total: <strong class="text-amber-400 font-mono text-sm">${formatINR(totalSum)}</strong>`;

    microModalList.innerHTML = items.map(item => {
      const catColor = CATEGORY_COLORS[item.category] || '#10b981';
      const catIcon = CATEGORY_ICONS[item.category] || '📦';
      const fullTooltip = (item.notes ? `${item.title} — ${item.notes}` : item.title).replace(/"/g, '&quot;');

      return `
        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs" title="${fullTooltip}">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm" style="background-color: ${catColor}20;">
              ${catIcon}
            </span>
            <div class="min-w-0">
              <h5 class="font-bold text-slate-900 dark:text-white truncate">${item.title}</h5>
              <div class="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>${formatDate(item.date)}</span>
                <span>•</span>
                <span class="text-slate-300">${item.paymentMode}</span>
                ${item.notes ? `<span>•</span><span class="truncate max-w-[120px] text-slate-400">${item.notes}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="mono font-bold text-amber-400 text-sm">${formatINR(item.amount)}</span>
          </div>
        </div>
      `;
    }).join('');

    microPurchasesModal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function closeMicroModal() {
    if (microPurchasesModal) microPurchasesModal.classList.add('hidden');
  }

  if (closeMicroModalBtn) closeMicroModalBtn.addEventListener('click', closeMicroModal);
  if (doneMicroModalBtn) doneMicroModalBtn.addEventListener('click', closeMicroModal);

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
      const fullTooltip = (item.notes && item.notes.length > item.title.length ? item.notes : `${item.title}${item.notes ? ' — ' + item.notes : ''}`).replace(/"/g, '&quot;');
      return `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
          <td class="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
            ${formatDate(item.date)}
          </td>
          <td class="py-3 px-4 text-slate-900 dark:text-white font-semibold group cursor-pointer" onclick="window.viewTxnDetails('${item.id}')" title="${fullTooltip}">
            <div class="hover:text-emerald-400 transition inline-flex items-center gap-1.5 flex-wrap">
              <span>${item.title}</span>
              <span class="text-[9px] text-slate-400 group-hover:text-emerald-400 font-normal">🔍</span>
            </div>
            ${item.notes ? `<div class="text-[11px] text-slate-400 font-normal break-words leading-relaxed group-hover:text-slate-300 transition mt-0.5 select-text">${item.notes}</div>` : ''}
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
      const fullTooltip = (item.notes && item.notes.length > item.title.length ? item.notes : `${item.title}${item.notes ? ' — ' + item.notes : ''}`).replace(/"/g, '&quot;');
      return `
        <div class="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-start justify-between gap-3 shadow-sm group" title="${fullTooltip}">
          <div class="flex items-start gap-3 min-w-0 cursor-pointer flex-1" onclick="window.viewTxnDetails('${item.id}')">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5" style="background-color: ${catColor}15;">
              ${catIcon}
            </div>
            <div class="min-w-0 flex-1">
              <h4 class="text-xs font-bold text-slate-900 dark:text-white break-words group-hover:text-emerald-400 transition flex items-center gap-1">
                <span>${item.title}</span>
                <span class="text-[8px] text-slate-400">🔍</span>
              </h4>
              <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                <span>${formatDate(item.date)}</span>
                <span>•</span>
                <span class="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">${item.paymentMode}</span>
              </div>
              ${item.notes ? `<p class="text-[10px] text-slate-400 break-words leading-relaxed mt-1 select-text">${item.notes}</p>` : ''}
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
    renderCategoryFilterPills();
    populateCategoryDropdowns();
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

  // --- Transaction Details Modal Logic ---
  const txnDetailsModal = document.getElementById('txnDetailsModal');
  const closeTxnModalBtn = document.getElementById('closeTxnModalBtn');
  const doneTxnModalBtn = document.getElementById('doneTxnModalBtn');
  const copyTxnNarrationBtn = document.getElementById('copyTxnNarrationBtn');
  const txnModalMerchant = document.getElementById('txnModalMerchant');
  const txnModalDate = document.getElementById('txnModalDate');
  const txnModalAmount = document.getElementById('txnModalAmount');
  const txnModalCategory = document.getElementById('txnModalCategory');
  const txnModalMode = document.getElementById('txnModalMode');
  const txnModalFullMessage = document.getElementById('txnModalFullMessage');

  window.viewTxnDetails = function (id) {
    const item = expenses.find(e => e.id === id);
    if (!item || !txnDetailsModal) return;

    txnModalMerchant.textContent = item.title;
    txnModalDate.textContent = formatDate(item.date);
    txnModalAmount.textContent = formatINR(item.amount);
    txnModalCategory.textContent = `${CATEGORY_ICONS[item.category] || '📦'} ${item.category}`;
    txnModalCategory.style.backgroundColor = `${CATEGORY_COLORS[item.category] || '#10b981'}25`;
    txnModalCategory.style.color = CATEGORY_COLORS[item.category] || '#10b981';
    txnModalMode.textContent = `Paid via ${item.paymentMode}`;

    const rawMsg = item.notes && item.notes.trim() ? item.notes : item.title;
    txnModalFullMessage.textContent = rawMsg;

    txnDetailsModal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  };

  function closeTxnModal() {
    if (txnDetailsModal) txnDetailsModal.classList.add('hidden');
  }

  if (closeTxnModalBtn) closeTxnModalBtn.addEventListener('click', closeTxnModal);
  if (doneTxnModalBtn) doneTxnModalBtn.addEventListener('click', closeTxnModal);

  if (copyTxnNarrationBtn) {
    copyTxnNarrationBtn.addEventListener('click', () => {
      const text = txnModalFullMessage.textContent;
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          alert('Full bank narration copied to clipboard!');
        });
      }
    });
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

  // --- Category UI Renderers ---
  function populateCategoryDropdowns() {
    if (!formCategory) return;
    const currentVal = formCategory.value;
    formCategory.innerHTML = Object.keys(CATEGORY_REGISTRY).map(cat => {
      const icon = CATEGORY_ICONS[cat];
      return `<option value="${cat}">${icon} ${cat}</option>`;
    }).join('');
    if (currentVal && CATEGORY_REGISTRY[currentVal]) {
      formCategory.value = currentVal;
    }
  }

  function renderCategoryFilterPills() {
    if (!categoryFilterPills) return;
    const catKeys = Object.keys(CATEGORY_REGISTRY);

    let pillsHtml = `
      <button data-cat="all" class="px-2.5 py-1 rounded-lg font-semibold ${selectedCategory === 'all' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'} transition shrink-0 active:scale-95">All</button>
    `;

    catKeys.forEach(cat => {
      const isSel = selectedCategory === cat;
      const icon = CATEGORY_ICONS[cat];
      pillsHtml += `
        <button data-cat="${cat}" class="px-2.5 py-1 rounded-lg ${isSel ? 'font-semibold bg-emerald-500 text-slate-950' : 'font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'} transition shrink-0">
          ${icon} ${cat}
        </button>
      `;
    });

    // Add + Category Button
    pillsHtml += `
      <button id="openAddCategoryBtn" type="button" class="px-2.5 py-1 rounded-lg font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition shrink-0 flex items-center gap-1 active:scale-95">
        <span>+ Add Category</span>
      </button>
    `;

    categoryFilterPills.innerHTML = pillsHtml;
  }

  // Pending Batch Update State
  let pendingBatchUpdate = null;

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
        const oldExpense = expenses[index];
        const categoryChanged = oldExpense.category !== category;

        // Check if there are other transactions with same merchant/title with different category
        const matchingOtherExpenses = categoryChanged 
          ? expenses.filter(e => e.id !== id && e.title.toLowerCase().trim() === title.toLowerCase().trim() && e.category !== category)
          : [];

        expenses[index] = { id, title, amount, category, paymentMode, date, notes };
        saveData();
        closeModal();
        refreshView();

        // If category changed and similar transactions exist, ask permission!
        if (matchingOtherExpenses.length > 0) {
          showBatchCategoryPrompt(title, category, matchingOtherExpenses);
          return;
        }
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
      saveData();
      closeModal();
      refreshView();
    }
  });

  // Batch Category Update Modal Logic
  const batchCategoryModal = document.getElementById('batchCategoryModal');
  const batchMerchantName = document.getElementById('batchMerchantName');
  const batchNewCategory = document.getElementById('batchNewCategory');
  const batchMatchCount = document.getElementById('batchMatchCount');
  const batchSkipBtn = document.getElementById('batchSkipBtn');
  const batchConfirmBtn = document.getElementById('batchConfirmBtn');

  function showBatchCategoryPrompt(merchantTitle, newCat, matches) {
    if (!batchCategoryModal) return;
    pendingBatchUpdate = { merchantTitle, newCat, matchIds: matches.map(m => m.id) };
    if (batchMerchantName) batchMerchantName.textContent = merchantTitle;
    if (batchNewCategory) batchNewCategory.textContent = `${CATEGORY_ICONS[newCat] || ''} ${newCat}`;
    if (batchMatchCount) batchMatchCount.textContent = matches.length;
    batchCategoryModal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  function closeBatchCategoryModal() {
    if (batchCategoryModal) batchCategoryModal.classList.add('hidden');
    pendingBatchUpdate = null;
  }

  if (batchSkipBtn) batchSkipBtn.addEventListener('click', closeBatchCategoryModal);
  if (batchConfirmBtn) {
    batchConfirmBtn.addEventListener('click', () => {
      if (pendingBatchUpdate && pendingBatchUpdate.matchIds) {
        let updatedCount = 0;
        expenses.forEach(e => {
          if (pendingBatchUpdate.matchIds.includes(e.id)) {
            e.category = pendingBatchUpdate.newCat;
            updatedCount++;
          }
        });
        saveData();
        refreshView();
        alert(`Success! Updated ${updatedCount} matching transactions for "${pendingBatchUpdate.merchantTitle}" to "${pendingBatchUpdate.newCat}".`);
      }
      closeBatchCategoryModal();
    });
  }

  // Custom Category Modal Logic
  const customCategoryModal = document.getElementById('customCategoryModal');
  const customCategoryForm = document.getElementById('customCategoryForm');
  const newCategoryNameInput = document.getElementById('newCategoryNameInput');
  const newCategoryIconInput = document.getElementById('newCategoryIconInput');
  const newCategoryColorInput = document.getElementById('newCategoryColorInput');
  const closeCategoryModalBtn = document.getElementById('closeCategoryModalBtn');
  const cancelCategoryModalBtn = document.getElementById('cancelCategoryModalBtn');

  function openCategoryModal() {
    if (customCategoryModal) {
      customCategoryForm.reset();
      newCategoryIconInput.value = '🏷️';
      newCategoryColorInput.value = '#10b981';
      customCategoryModal.classList.remove('hidden');
      newCategoryNameInput.focus();
    }
  }

  function closeCategoryModal() {
    if (customCategoryModal) customCategoryModal.classList.add('hidden');
  }

  if (closeCategoryModalBtn) closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
  if (cancelCategoryModalBtn) cancelCategoryModalBtn.addEventListener('click', closeCategoryModal);

  if (customCategoryForm) {
    customCategoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (newCategoryNameInput.value || '').trim();
      const icon = (newCategoryIconInput.value || '').trim() || '🏷️';
      const color = newCategoryColorInput.value || '#10b981';

      if (!name) return;
      if (CATEGORY_REGISTRY[name]) {
        alert('A category with this name already exists!');
        return;
      }

      CATEGORY_REGISTRY[name] = { color, icon };
      saveCategories();
      populateCategoryDropdowns();
      renderCategoryFilterPills();
      refreshView();
      closeCategoryModal();
      alert(`Category "${icon} ${name}" created successfully!`);
    });
  }

  // Quick Amount Buttons
  document.querySelectorAll('.quick-amt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const addVal = parseFloat(btn.dataset.amt) || 0;
      const current = parseFloat(formAmount.value) || 0;
      formAmount.value = (current + addVal).toFixed(2);
    });
  });

  // --- Budget Modal Logic ---
  function openBudgetModal() {
    if (budgetModal) {
      budgetInput.value = monthlyBudget;
      budgetModal.classList.remove('hidden');
      if (moreMenuDropdown) moreMenuDropdown.classList.add('hidden');
      budgetInput.focus();
    }
  }

  setBudgetOption.addEventListener('click', openBudgetModal);

  function closeBudgetModal() {
    if (budgetModal) budgetModal.classList.add('hidden');
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

  // --- Category Filter Pills & Add Category Click ---
  categoryFilterPills.addEventListener('click', (e) => {
    const addBtn = e.target.closest('#openAddCategoryBtn');
    if (addBtn) {
      openCategoryModal();
      return;
    }

    const btn = e.target.closest('button');
    if (!btn || !btn.dataset.cat) return;
    const cat = btn.dataset.cat;
    selectedCategory = cat;

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
    
    // Bank Charges & AMC
    if (/amc|charges|annual maintenance|minimum balance|sms alert|service charge|chg|penal/i.test(text)) {
      return 'Bills & Utilities';
    }
    // Groceries & Supermarkets
    if (/blinkit|zepto|instamart|bigbasket|supermarket|super market|dmart|reliance fresh|spencer|provision|vegetable|fruit|dairy|milk|kirana|nilgiris|hygreva|hygrevar|store|market|grocer|mart/i.test(text)) {
      return 'Groceries';
    }
    // Food & Dining
    if (/swiggy|zomato|mcdonald|kfc|domino|starbucks|pizza|burger|cafe|tea|coffee|restaurant|hotel|baker|dhaba|eats|biryani|subway|iyankar|bakery|mess|canteen|food|sweets|juice|tiffin|bhavan|annapoorna/i.test(text)) {
      return 'Food & Dining';
    }
    // Travel & Fuel
    if (/irctc|railway|train|ticket|petrol|fuel|hpcl|bpcl|iocl|shell|uber|ola|rapido|makemytrip|indigo|air india|fastag|toll|parking|metro|flight/i.test(text)) {
      return 'Travel & Fuel';
    }
    // Bills & Utilities
    if (/bescom|tneb|electricity|airtel|jio|vodafone|vi|broadband|wifi|water|gas|indane|bharat gas|billdesk|recharge|dth|tata play|lic|insurance|rent|interest/i.test(text)) {
      return 'Bills & Utilities';
    }
    // Shopping
    if (/rmkv|fabrics|textile|silks|clothing|apparel|amazon|flipkart|myntra|ajio|zara|h&m|decathlon|croma|reliance digital|meesho|nykaa|shoppers stop|lifestyle|westside|cloth|fashion/i.test(text)) {
      return 'Shopping';
    }
    // Entertainment
    if (/netflix|spotify|hotstar|prime|youtube|cinema|pvr|inox|bookmyshow|game|playstation|disney|theatre/i.test(text)) {
      return 'Entertainment';
    }
    // Health
    if (/apollo|pharmacy|medplus|netmeds|1mg|hospital|clinic|doctor|lab|diagnostic|practo|dentist|healthcare|medlife/i.test(text)) {
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

    // Strip trailing dashes/placeholders like ' - -' or ' --' or ' -'
    s = s.replace(/\s*-\s*-+\s*$/g, '').trim();

    // SBI UPI Slash Format (Very Common in SBI Statements):
    // E.g. "UPI/DR/627335144120/Reeta/YES - -"
    // E.g. "UPI/DR/663979246860/KALA - -"
    // E.g. "UPI/DR/662409905256/HYGREVA/..."
    const sbiSlashUpiMatch = s.match(/UPI\/(?:DR|CR)\/\d+\/([^\/]+)(?:\/([^\/]+))?/i);
    if (sbiSlashUpiMatch && sbiSlashUpiMatch[1]) {
      let candidate = sbiSlashUpiMatch[1].replace(/\s*-\s*-+\s*$/g, '').trim();
      let extra = sbiSlashUpiMatch[2] ? sbiSlashUpiMatch[2].replace(/\s*-\s*-+\s*$/g, '').trim() : '';

      // Ignore known bank codes or generic status
      const bankCodes = /^(YES|HDFC|ICICI|SBI|SBIN|AXIS|UTIB|BARB|KKBK|PUNB|CNRB|PAYTM|AIRP|DR|CR)$/i;
      if (extra && !bankCodes.test(extra) && isNaN(extra)) {
        candidate = candidate + ' (' + extra + ')';
      }

      if (candidate.length >= 2 && !/^\d+$/.test(candidate)) {
        return candidate.length > 35 ? candidate.substring(0, 35) : candidate;
      } else if (candidate.length >= 2) {
        return 'UPI Ref ' + candidate;
      }
    }

    // Specific SBI UPI Hyphen Formats:
    // E.g. "UPI-IRCTC TICKETING-PINELABS.11093315@PINEAXIS-UTIB000SETU-..."
    // E.g. "UPI-RMKV FABRICS PRIVATE-RMKVFABRICSPRIVATELT..."
    // E.g. "UPI-HYGREVAR SUPER MARKE-PAYTMQR6BTVVW5@P..."
    // E.g. "UPI-SRI LAKSHMI IYANKAR -LAKSHMIIYAN@TMB..."
    const sbiUpiPattern = /^UPI-([A-Za-z0-9\s&._-]+?)(?:-(?:[A-Za-z0-9._-]+@[A-Za-z0-9._-]+|[A-Za-z0-9]{10,}))/i;
    const sbiMatch = s.match(sbiUpiPattern);
    if (sbiMatch && sbiMatch[1]) {
      let name = sbiMatch[1].trim();
      if (name.length >= 3) {
        return name.length > 35 ? name.substring(0, 35) : name;
      }
    }

    // Standard UPI clean: e.g. "UPI/428394839/SWIGGY/HDFC" or "UPI-ZOMATO-PAY"
    const upiMatch = s.match(/UPI(?:\/|-)([A-Za-z0-9\s&._-]+?)(?:\/|-|@)/i);
    if (upiMatch && upiMatch[1]) {
      let candidate = upiMatch[1].trim();
      if (candidate.length > 2 && !/^\d+$/.test(candidate) && !/^(DR|CR)$/i.test(candidate)) {
        return candidate.length > 35 ? candidate.substring(0, 35) : candidate;
      }
    }

    // POS e.g. "POS 4012XXXXXXXX1234 RELIANCE RETAIL"
    const posMatch = s.match(/POS\s+[X0-9]+\s+([A-Za-z0-9\s&._-]+)/i);
    if (posMatch && posMatch[1]) {
      return posMatch[1].trim();
    }

    // ATM / Bank Charges
    if (/atm\s+pending\s+amc|annual\s+maintenance|card\s+amc/i.test(s)) {
      return 'SBI Debit Card AMC Charge';
    }

    // Strip date prefixes e.g. "27 09 2026 " or "27/09/2026 "
    s = s.replace(/^\d{1,2}[\s/-]\d{1,2}[\s/-]\d{2,4}\s+/, '');

    // Strip "UPI DR " or "UPI CR " prefixes
    s = s.replace(/^UPI\s*(?:DR|CR)\s*/i, '');

    // Strip long reference numbers and bank codes
    s = s.replace(/[\d]{8,}/g, '')
         .replace(/\b(REF|NO|TXN|UTRN|CMS|BIL|IMPS|NEFT|RTGS|NACH|ACH|SEND MONEY|PAYMENTFORV1)\b/gi, '')
         .replace(/[\/\\|*_-]+/g, ' ')
         .replace(/\s+/g, ' ')
         .trim();

    return s.length >= 2 ? (s.length > 35 ? s.substring(0, 35) : s) : narration.substring(0, 35);
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
        let fullDesc = (rawDesc || '').toString().trim();

        // Check if subsequent rows in Excel/CSV are continuation of description (e.g. SBI multi-row cells)
        while (r + 1 < rows.length) {
          const nextRow = rows[r + 1];
          const nextDate = nextRow ? (nextRow[dateCol] || '').toString().trim() : '';
          const nextAmt = debitCol !== -1 ? parseAmount(nextRow[debitCol]) : (amountCol !== -1 ? parseAmount(nextRow[amountCol]) : 0);
          const nextDesc = descCol !== -1 ? (nextRow[descCol] || '').toString().trim() : '';
          // If no date and no amount, but description exists, it's a continuation line!
          if (!nextDate && nextAmt === 0 && nextDesc && !/statement summary|total|closing balance/i.test(nextDesc)) {
            fullDesc += ' ' + nextDesc;
            r++;
          } else {
            break;
          }
        }

        fullDesc = fullDesc.replace(/\s*-\s*-+\s*$/g, '').trim();
        const parsedDate = parseBankDate(rawDate);
        const category = categorizeTransaction(fullDesc);
        const paymentMode = detectPaymentMode(fullDesc);
        const cleanTitle = cleanMerchantTitle(fullDesc);

        extracted.push({
          id: 'stmt_' + Date.now() + '_' + r,
          title: cleanTitle,
          amount: debitAmt,
          category,
          paymentMode,
          date: parsedDate,
          notes: fullDesc
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
        <td class="py-1.5 px-3 max-w-md text-slate-900 dark:text-white font-semibold">
          <div class="break-words">${item.title}</div>
          <div class="text-[10px] text-slate-400 break-words leading-relaxed mt-0.5">${item.notes}</div>
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

  // Internal default fallback for SBI password-protected statements
  const SBI_DEFAULT_PDF_PASSWORD = '67668231002';
  const statementPasswordInput = document.getElementById('statementPasswordInput');
  const togglePasswordVisibilityBtn = document.getElementById('togglePasswordVisibilityBtn');
  const passwordEyeIcon = document.getElementById('passwordEyeIcon');

  // Toggle show/hide password
  if (togglePasswordVisibilityBtn && statementPasswordInput) {
    togglePasswordVisibilityBtn.addEventListener('click', () => {
      const isPass = statementPasswordInput.type === 'password';
      statementPasswordInput.type = isPass ? 'text' : 'password';
      if (passwordEyeIcon) {
        passwordEyeIcon.setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
        if (window.lucide) lucide.createIcons();
      }
    });
  }

  // --- Multi-Format File Upload Handler (PDF, Excel, CSV) ---
  async function handleStatementFile(file) {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    // Use manually entered password if provided, else use default fallback
    const manualPass = statementPasswordInput ? statementPasswordInput.value.trim() : '';
    const password = manualPass || SBI_DEFAULT_PDF_PASSWORD;

    // 1. PDF Statement (e.g. SBI Password Protected PDF)
    if (fileName.endsWith('.pdf')) {
      await parsePdfBankStatement(file, password);
      return;
    }

    // 2. Excel Statement (SBI .xlsx or .xls)
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      parseExcelBankStatement(file);
      return;
    }

    // 3. CSV / Text Statement
    parseCsvBankStatement(file);
  }

  // Parse CSV
  function parseCsvBankStatement(file) {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: function(results) {
        processBankStatementRows(results.data);
      },
      error: function(err) {
        alert('Error parsing CSV statement: ' + err.message);
      }
    });
  }

  // Parse Excel (.xlsx / .xls) via SheetJS
  function parseExcelBankStatement(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        processBankStatementRows(rows);
      } catch (err) {
        console.error('Excel parse error:', err);
        alert('Failed to read Excel file. If it is password protected, please export as CSV/PDF or check file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // Parse Password-Protected PDF (SBI Format) via PDF.js with Spatial Column Alignment
  async function parsePdfBankStatement(file, password) {
    if (!window.pdfjsLib) {
      alert('PDF Parser engine is still loading. Please try again in a moment.');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        password: password
      });

      loadingTask.onPassword = function(callback, reason) {
        const pass = prompt('Enter Bank Statement PDF Password:', password || '');
        if (pass) {
          callback(pass);
        } else {
          callback('');
        }
      };

      const pdf = await loadingTask.promise;
      const parsedTransactions = [];
      let detectedBankName = 'Bank Statement (PDF)';

      // Collect all pages' line data
      const allPagesLines = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items;
        if (!items || items.length === 0) continue;

        // Group text items by Y position (line grouping with 4px tolerance)
        const lineMap = new Map();
        items.forEach(item => {
          if (!item.str || item.str.trim() === '') return;
          const y = Math.round(item.transform[5]);
          let matchedY = null;
          for (const key of lineMap.keys()) {
            if (Math.abs(key - y) <= 4) {
              matchedY = key;
              break;
            }
          }
          if (matchedY === null) {
            matchedY = y;
            lineMap.set(matchedY, []);
          }
          lineMap.get(matchedY).push({
            str: item.str.trim(),
            x: Math.round(item.transform[4]),
            w: Math.round(item.width)
          });
        });

        // Sort lines top to bottom (descending Y)
        const sortedYKeys = Array.from(lineMap.keys()).sort((a, b) => b - a);
        for (const y of sortedYKeys) {
          const lineItems = lineMap.get(y).sort((a, b) => a.x - b.x);
          allPagesLines.push(lineItems);
        }
      }

      // --- STRATEGY 1: Dynamic Header-Based Column Detection ---
      // Scan lines for a header row that contains keywords like 'date', 'withdrawal'/'debit', 'narration'/'description'
      let headerLineIdx = -1;
      let colBounds = { date: null, narration: null, withdrawal: null, deposit: null, balance: null, refno: null, valueDate: null };

      for (let i = 0; i < allPagesLines.length; i++) {
        const lineItems = allPagesLines[i];
        const fullText = lineItems.map(it => it.str).join(' ').toLowerCase();

        const hasDate = /\bdate\b/.test(fullText);
        const hasWithdrawal = /\b(withdrawal|debit|dr|debit\s*amount)\b/.test(fullText);
        const hasNarration = /\b(narration|description|particulars|details|remark)\b/.test(fullText);

        if (hasDate && (hasWithdrawal || hasNarration)) {
          headerLineIdx = i;

          // Record X positions of each detected column header
          // Also check full line text for multi-word headers that PDF.js may split
          const headerFullText = lineItems.map(it => it.str).join(' ').toLowerCase();
          
          for (const item of lineItems) {
            const lStr = item.str.toLowerCase();
            
            // Value Date column (check item or full line context)
            if (/value/.test(lStr) && /value\s*date/.test(headerFullText)) {
              colBounds.valueDate = { x: item.x, w: item.w };
            }
            // Post Date or just Date column (not Value Date)
            if (/\bdate\b/.test(lStr) && !colBounds.date && !/value/.test(lStr)) {
              // Make sure this isn't the "Date" part of "Value Date"
              const isValueDatePart = colBounds.valueDate && Math.abs(item.x - colBounds.valueDate.x) < 60;
              if (!isValueDatePart) {
                colBounds.date = { x: item.x, w: item.w };
              }
            }
            if (/\b(narration|description|particulars|details|remark)\b/.test(lStr)) {
              colBounds.narration = { x: item.x, w: item.w };
            }
            if (/\b(withdrawal|debit)\b/.test(lStr) && !/credit/.test(lStr)) {
              colBounds.withdrawal = { x: item.x, w: item.w };
            }
            if (/\b(deposit|credit)\b/.test(lStr) && !/debit/.test(lStr)) {
              colBounds.deposit = { x: item.x, w: item.w };
            }
            if (/\b(balance|closing)\b/.test(lStr)) {
              colBounds.balance = { x: item.x, w: item.w };
            }
            if (/\b(ref|chq|cheque)\b/.test(lStr)) {
              colBounds.refno = { x: item.x, w: item.w };
            }
          }
          
          // If no separate Date column found but Value Date exists, use Value Date as the date column
          if (!colBounds.date && colBounds.valueDate) {
            colBounds.date = colBounds.valueDate;
          }

          // Detect bank name from earlier lines
          for (let j = 0; j < Math.min(i, 10); j++) {
            const earlyText = allPagesLines[j].map(it => it.str).join(' ').toLowerCase();
            if (earlyText.includes('state bank')) detectedBankName = 'State Bank of India (SBI)';
            else if (earlyText.includes('hdfc')) detectedBankName = 'HDFC Bank';
            else if (earlyText.includes('icici')) detectedBankName = 'ICICI Bank';
            else if (earlyText.includes('axis')) detectedBankName = 'Axis Bank';
            else if (earlyText.includes('kotak')) detectedBankName = 'Kotak Mahindra Bank';
            else if (earlyText.includes('canara')) detectedBankName = 'Canara Bank';
            else if (earlyText.includes('union bank')) detectedBankName = 'Union Bank';
            else if (earlyText.includes('bank of baroda') || earlyText.includes('bob')) detectedBankName = 'Bank of Baroda';
            else if (earlyText.includes('indian bank')) detectedBankName = 'Indian Bank';
            else if (earlyText.includes('pnb') || earlyText.includes('punjab national')) detectedBankName = 'Punjab National Bank';
          }
          break;
        }
      }

      // Helper: assign a cell value to a column based on X proximity
      function getColumnForX(x) {
        const cols = [];
        if (colBounds.date) cols.push({ name: 'date', cx: colBounds.date.x, w: colBounds.date.w });
        if (colBounds.narration) cols.push({ name: 'narration', cx: colBounds.narration.x, w: colBounds.narration.w });
        if (colBounds.withdrawal) cols.push({ name: 'withdrawal', cx: colBounds.withdrawal.x, w: colBounds.withdrawal.w });
        if (colBounds.deposit) cols.push({ name: 'deposit', cx: colBounds.deposit.x, w: colBounds.deposit.w });
        if (colBounds.balance) cols.push({ name: 'balance', cx: colBounds.balance.x, w: colBounds.balance.w });
        if (colBounds.refno) cols.push({ name: 'refno', cx: colBounds.refno.x, w: colBounds.refno.w });
        if (colBounds.valueDate) cols.push({ name: 'valueDate', cx: colBounds.valueDate.x, w: colBounds.valueDate.w });

        if (cols.length === 0) return null;

        // Find nearest column by X center proximity (with tolerance based on column width)
        let bestCol = null;
        let bestDist = Infinity;
        for (const col of cols) {
          const colCenter = col.cx + col.w / 2;
          const dist = Math.abs(x - col.cx);
          const tolerance = Math.max(col.w, 60);
          if (dist < tolerance && dist < bestDist) {
            bestDist = dist;
            bestCol = col.name;
          }
        }
        return bestCol;
      }

      // Parse data rows using dynamic column bounds
      if (headerLineIdx >= 0) {
        let currentTxn = null;

        for (let i = headerLineIdx + 1; i < allPagesLines.length; i++) {
          const lineItems = allPagesLines[i];
          const fullLineText = lineItems.map(it => it.str).join(' ');

          // Skip header repetitions on subsequent pages
          const fullLower = fullLineText.toLowerCase();
          const hasHeaderKeywords = /\b(narration|withdrawal|deposit|description|particulars|details)\b/.test(fullLower);
          const hasDateKeyword = /\bdate\b/.test(fullLower);
          const hasDebitCredit = /\b(debit|credit)\b/.test(fullLower) && /\bdate\b/.test(fullLower);
          if ((hasHeaderKeywords && hasDateKeyword) || hasDebitCredit) {
            continue;
          }

          // Skip summary/footer lines
          const isSummaryLine = /statement summary|closing balance|page no|from\s*:|to\s*:|branch\s*:|total\s*:|carried forward|opening balance/i.test(fullLineText);
          if (isSummaryLine) continue;

          // Check if line starts with a date
          const firstItem = lineItems[0];
          const dateMatch = firstItem ? firstItem.str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/) : null;
          const dateMatchAlt = firstItem ? firstItem.str.match(/^(\d{1,2})\s*[/-]?\s*([A-Za-z]{3})\s*[/-]?\s*(\d{2,4})$/) : null;

          if ((dateMatch || dateMatchAlt) && (
              (colBounds.date && Math.abs(firstItem.x - colBounds.date.x) < 80) ||
              (colBounds.valueDate && Math.abs(firstItem.x - colBounds.valueDate.x) < 80)
            )) {
            // Flush previous transaction
            if (currentTxn && currentTxn.amount > 0 && currentTxn.isDebit) {
              parsedTransactions.push(currentTxn);
            }

            let rowData = { date: firstItem.str, narration: '', withdrawal: '', deposit: '', balance: '' };

            for (let k = 1; k < lineItems.length; k++) {
              const it = lineItems[k];
              const col = getColumnForX(it.x);
              const isNumeric = /^[\d,]+(?:\.\d{1,2})?$/.test(it.str.replace(/[^\d.,]/g, ''));

              if (col === 'narration') {
                rowData.narration += (rowData.narration ? ' ' : '') + it.str;
              } else if (col === 'withdrawal' && isNumeric) {
                rowData.withdrawal = it.str;
              } else if (col === 'deposit' && isNumeric) {
                rowData.deposit = it.str;
              } else if (col === 'balance' && isNumeric) {
                rowData.balance = it.str;
              } else if (col === 'refno' || col === 'valueDate' || col === 'date') {
                // ignore date/ref columns
              } else if (it.str === '₹' || /^[-–—\s]+$/.test(it.str)) {
                // ignore currency symbol and dash placeholders
              } else if (!isNumeric) {
                // Likely narration text
                rowData.narration += (rowData.narration ? ' ' : '') + it.str;
              }
            }

            // If no withdrawal column was detected in header, try fallback: use numeric items
            if (!colBounds.withdrawal) {
              const numerics = lineItems.filter(it => /^[\d,]+\.\d{2}$/.test(it.str));
              if (numerics.length >= 2) {
                // First number is likely debit/credit, last is balance
                rowData.withdrawal = numerics[0].str;
              }
            }

            const debitAmt = parseAmount(rowData.withdrawal);
            rowData.narration = rowData.narration.replace(/\s*-\s*-+\s*$/g, '').trim();

            currentTxn = {
              date: parseBankDate(rowData.date),
              narration: rowData.narration,
              amount: debitAmt,
              isDebit: debitAmt > 0 && !rowData.deposit
            };

          } else if (currentTxn) {
            // Continuation line: append all text items belonging to transaction
            if (!isSummaryLine) {
              const textOnly = lineItems.filter(it => {
                const isNumeric = /^[\d,]+(?:\.\d{1,2})?$/.test(it.str.replace(/[^\d.,]/g, ''));
                if (colBounds.withdrawal && it.x >= colBounds.withdrawal.x - 20) return false;
                if (colBounds.deposit && it.x >= colBounds.deposit.x - 20) return false;
                if (colBounds.balance && it.x >= colBounds.balance.x - 20) return false;
                if (isNumeric && Math.abs(it.x - (colBounds.balance ? colBounds.balance.x : 500)) < 80) return false;
                if (/^[-–—\s]+$/.test(it.str)) return false;
                return true;
              }).map(it => it.str).join(' ');

              if (textOnly && !/^[\d,]+\.\d{2}$/.test(textOnly.trim())) {
                const cleanCont = textOnly.replace(/\s*-\s*-+\s*$/g, '').trim();
                if (cleanCont) {
                  currentTxn.narration = (currentTxn.narration + ' ' + cleanCont).replace(/\s*-\s*-+\s*$/g, '').trim();
                }
              }
            }
          }
        }

        // Flush last transaction
        if (currentTxn && currentTxn.amount > 0 && currentTxn.isDebit) {
          parsedTransactions.push(currentTxn);
        }
      }

      // --- STRATEGY 2: Fallback text-line based extraction if Strategy 1 found nothing ---
      if (parsedTransactions.length === 0) {
        // Try a simpler approach: scan each line for date + amount patterns
        for (let i = 0; i < allPagesLines.length; i++) {
          const lineItems = allPagesLines[i];
          const fullText = lineItems.map(it => it.str).join(' ');

          // Skip headers/footers
          if (/statement summary|page no|branch\s*:|opening balance/i.test(fullText)) continue;

          // Look for lines starting with a date
          const firstStr = lineItems[0] ? lineItems[0].str : '';
          const dateMatch = firstStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
          const dateMatchAlt = firstStr.match(/^(\d{1,2})\s*[/-]?\s*([A-Za-z]{3})\s*[/-]?\s*(\d{2,4})$/);

          if (dateMatch || dateMatchAlt) {
            // Collect all numbers in the line
            const numericItems = lineItems.filter(it => /^[\d,]+\.\d{2}$/.test(it.str));
            // Collect narration text (non-date, non-numeric items)
            const narrationItems = lineItems.slice(1).filter(it => !/^[\d,]+\.\d{2}$/.test(it.str));
            const narration = narrationItems.map(it => it.str).join(' ');

            if (numericItems.length >= 2) {
              // If there are 2+ numbers, first could be withdrawal, last is balance
              // Try to detect Dr/Cr indicators in the line
              const fullLower = fullText.toLowerCase();
              const hasCr = /\bcr\b|credit|deposit/i.test(fullLower);

              if (!hasCr) {
                const debitAmt = parseAmount(numericItems[0].str);
                if (debitAmt > 0) {
                  parsedTransactions.push({
                    date: parseBankDate(firstStr),
                    narration: narration.trim(),
                    amount: debitAmt,
                    isDebit: true
                  });
                }
              }
            } else if (numericItems.length === 1) {
              // Single amount - check context for debit indicators
              const fullLower = fullText.toLowerCase();
              const isDebit = /\b(dr|debit|withdrawal|paid|purchase|transfer)\b/i.test(fullLower);
              const isCredit = /\b(cr|credit|deposit|received|refund|salary|cashback)\b/i.test(fullLower);

              if (isDebit && !isCredit) {
                const debitAmt = parseAmount(numericItems[0].str);
                if (debitAmt > 0) {
                  parsedTransactions.push({
                    date: parseBankDate(firstStr),
                    narration: narration.trim(),
                    amount: debitAmt,
                    isDebit: true
                  });
                }
              }
            }
          }
        }
      }

      // Convert extracted transactions to dashboard expense format
      if (parsedTransactions.length > 0) {
        let totalDebitSum = 0;
        const formattedExpenses = parsedTransactions
          .filter(t => {
            if (t.amount <= 0 || !t.isDebit) return false;
            // Explicitly exclude non-expense entries
            const narrLower = (t.narration || '').toLowerCase();
            if (narrLower.includes('interest paid') || 
                narrLower.includes('interest credit') || 
                narrLower.includes('statement summary') ||
                narrLower.includes('closing balance')) {
              return false;
            }
            return true;
          })
          .map((t, idx) => {
            const cleanTitle = cleanMerchantTitle(t.narration);
            const category = categorizeTransaction(t.narration);
            const paymentMode = detectPaymentMode(t.narration);
            totalDebitSum += t.amount;

            return {
              id: 'stmt_pdf_' + Date.now() + '_' + idx,
              title: cleanTitle,
              amount: t.amount,
              category: category,
              paymentMode: paymentMode,
              date: t.date,
              notes: t.narration.trim()
            };
          });

        if (formattedExpenses.length > 0) {
          parsedExpensesToImport = formattedExpenses;
          detectedBankTag.textContent = detectedBankName;
          importStatusText.textContent = `Successfully extracted ${formattedExpenses.length} debit transactions`;
          parsedDebitCount.textContent = formattedExpenses.length;
          parsedTotalAmount.textContent = `Total: ${formatINR(totalDebitSum)}`;

          importPreviewTableBody.innerHTML = formattedExpenses.slice(0, 50).map(item => `
            <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
              <td class="py-1.5 px-3 whitespace-nowrap text-slate-500">${formatDate(item.date)}</td>
              <td class="py-1.5 px-3 max-w-md text-slate-900 dark:text-white font-semibold">
                <div class="break-words">${item.title}</div>
                <div class="text-[10px] text-slate-400 break-words leading-relaxed mt-0.5">${item.notes}</div>
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
          return;
        }
      }

      // Final fallback: nothing detected
      alert('Could not detect debit transactions in this PDF. Please try uploading the statement as Excel (.xlsx) or CSV format for better compatibility.');

    } catch (err) {
      console.error('PDF parsing error:', err);
      if (err.name === 'PasswordException') {
        alert('Incorrect PDF password! Please enter the correct password in the box above.');
      } else {
        alert('Could not unlock or extract PDF: ' + err.message);
      }
    }
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

  // --- Live SMS Auto-Sync (Firebase Realtime Database & MacroDroid) ---
  const STORAGE_KEY_SYNC_CONFIG = 'finlytics_sync_config_v1';
  const syncModal = document.getElementById('syncModal');
  const openSyncModalOption = document.getElementById('openSyncModalOption');
  const closeSyncModalBtn = document.getElementById('closeSyncModalBtn');
  const cancelSyncBtn = document.getElementById('cancelSyncBtn');
  const saveSyncConfigBtn = document.getElementById('saveSyncConfigBtn');
  const firebaseDbUrlInput = document.getElementById('firebaseDbUrlInput');
  const firebaseSyncTokenInput = document.getElementById('firebaseSyncTokenInput');
  const syncStatusDot = document.getElementById('syncStatusDot');
  const syncStatusText = document.getElementById('syncStatusText');
  const syncDeviceTag = document.getElementById('syncDeviceTag');
  const macroDroidUrlDisplay = document.getElementById('macroDroidUrlDisplay');
  const testSmsInput = document.getElementById('testSmsInput');
  const testSmsParseBtn = document.getElementById('testSmsParseBtn');

  let firebaseDbInstance = null;
  let firebaseListenerRef = null;

  function loadSyncConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SYNC_CONFIG);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse sync config', e);
    }
    return { dbUrl: '', token: '' };
  }

  function saveSyncConfig(cfg) {
    localStorage.setItem(STORAGE_KEY_SYNC_CONFIG, JSON.stringify(cfg));
  }

  function updateMacroDroidDisplay(dbUrl, token) {
    if (!macroDroidUrlDisplay) return;
    if (dbUrl && token) {
      const cleanUrl = dbUrl.replace(/\/+$/, '');
      const webhookUrl = `${cleanUrl}/incoming_sms.json?auth=${encodeURIComponent(token)}`;
      macroDroidUrlDisplay.innerHTML = `<strong>URL:</strong> <span class="text-white">${webhookUrl}</span><br><strong>Method:</strong> POST<br><strong>Content Type:</strong> application/json<br><strong>Body:</strong> {"sms": "{sms_body}", "sender": "{sms_number}", "time": "{system_time}"}`;
    } else {
      macroDroidUrlDisplay.textContent = 'Configure Firebase DB URL & Token above to generate phone webhook URL';
    }
  }

  // Smart Bank SMS Parser (Strictly SBI Bank Filter)
  function parseBankSmsText(smsText, sender) {
    if (!smsText || typeof smsText !== 'string') return null;
    const clean = smsText.replace(/[\r\n]+/g, ' ').trim();
    const cleanLower = clean.toLowerCase();
    const senderLower = (sender || '').toLowerCase();

    // STRICT SBI FILTER: User specifically requested only SBI SMS to be captured among 3 banks
    // Check if sender or message text belongs to SBI
    const isSbiSender = /sbi|sbin|sbiinb|sbipsg|sbicrd/i.test(senderLower);
    const hasSbiKeyword = /\bsbi\b|state bank of india|sbiinb|\batinb\b|sbicard/i.test(cleanLower);
    
    // If sender is specified and not SBI, or if neither sender nor content indicates SBI, ignore!
    if (!isSbiSender && !hasSbiKeyword) {
      console.log('Skipping SMS: Not from SBI Bank (Filtered out for multi-bank protection).');
      return null;
    }

    // 1. Amount matching (Rs., INR, Rs, ₹)
    const amountMatch = clean.match(/(?:(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)|(?:debited|spent|paid)\s*(?:by|for|of)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?))/i);
    let amount = 0;
    if (amountMatch) {
      const rawAmt = amountMatch[1] || amountMatch[2];
      if (rawAmt) {
        amount = parseFloat(rawAmt.replace(/,/g, ''));
      }
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return null; // Not an expense or debit SMS
    }

    // 2. Debit check (must be debit / spend / transfer / withdrawn)
    const isDebit = /debit|debited|spent|paid|withdrawn|purchase|transferred|sent/i.test(clean);
    const isCredit = /credited|received|refund/i.test(clean);
    if (!isDebit && isCredit) {
      return null; // Ignore credits/deposits
    }

    // 3. Merchant / Recipient extraction
    let merchant = 'Bank Transaction';
    const merchantMatch = clean.match(/(?:to|at|vpa|info|transfer to|paid to)\s+([A-Za-z0-9\.\s@_-]{2,30}?)(?=\s+(?:on|ref|upi|avl|bal|avail|via|\.|\,|$))/i);
    if (merchantMatch && merchantMatch[1]) {
      merchant = merchantMatch[1].trim();
    } else {
      // Fallback: check if UPI transfer
      const upiMatch = clean.match(/UPI\/[A-Za-z0-9]+\/([A-Za-z0-9\s]+)/i);
      if (upiMatch && upiMatch[1]) {
        merchant = upiMatch[1].trim();
      }
    }
    // Clean up merchant name
    merchant = merchant.replace(/^(vpa|info|transfer|ref)\s+/i, '').trim();
    if (merchant.length > 25) merchant = merchant.substring(0, 25);
    if (!merchant) merchant = 'SBI Bank Expense';

    // 4. Category Prediction
    const lowerSms = clean.toLowerCase();
    let category = 'Others';
    if (/swiggy|zomato|kfc|mcdonald|domino|starbucks|restaurant|cafe|hotel|food|biryani|tea/i.test(lowerSms)) {
      category = 'Food & Dining';
    } else if (/blinkit|zepto|instamart|bigbasket|supermarket|dmart|grocery|vegetable|milk|store|ration/i.test(lowerSms)) {
      category = 'Groceries';
    } else if (/petrol|fuel|hpcl|bpcl|iocl|shell|uber|ola|rapido|irctc|metro|toll|fastag|flight|railway/i.test(lowerSms)) {
      category = 'Travel & Fuel';
    } else if (/bescom|tneb|electricity|bill|recharge|jio|airtel|vi|broadband|wifi|gas|water|lic|insurance|emi/i.test(lowerSms)) {
      category = 'Bills & Utilities';
    } else if (/amazon|flipkart|myntra|ajio|meesho|nykaa|zara|h&m|retail|clothing|mall|shopping/i.test(lowerSms)) {
      category = 'Shopping';
    } else if (/bookmyshow|pvr|inox|netflix|prime|hotstar|spotify|cinema|theatre|game/i.test(lowerSms)) {
      category = 'Entertainment';
    } else if (/pharmacy|apollo|medplus|netmeds|1mg|hospital|clinic|doctor|lab|diagnostics/i.test(lowerSms)) {
      category = 'Health';
    }

    // 5. Payment Mode
    let paymentMode = 'UPI';
    if (/credit\s*card/i.test(lowerSms)) {
      paymentMode = 'Credit Card';
    } else if (/debit\s*card|atm|pos/i.test(lowerSms)) {
      paymentMode = 'Debit Card';
    } else if (/netbanking|inb|neft|rtgs|imps/i.test(lowerSms)) {
      paymentMode = 'NetBanking';
    }

    // 6. Date extraction (or today)
    let expenseDate = new Date().toISOString().split('T')[0];
    const dateMatch = clean.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
    if (dateMatch) {
      const p1 = parseInt(dateMatch[1], 10);
      const p2 = parseInt(dateMatch[2], 10);
      let year = parseInt(dateMatch[3], 10);
      if (year < 100) year += 2000;
      // Usually DD-MM-YYYY in India
      const day = p1 <= 31 ? p1 : p2;
      const month = p1 <= 31 ? p2 : p1;
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        expenseDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    return {
      id: 'sms_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: merchant,
      amount: amount,
      category: category,
      paymentMode: paymentMode,
      date: expenseDate,
      notes: `Auto-synced from SMS: "${clean.length > 60 ? clean.substring(0, 57) + '...' : clean}"`
    };
  }

  function initFirebaseSync() {
    const cfg = loadSyncConfig();
    if (firebaseDbUrlInput) firebaseDbUrlInput.value = cfg.dbUrl || '';
    if (firebaseSyncTokenInput) firebaseSyncTokenInput.value = cfg.token || '';
    updateMacroDroidDisplay(cfg.dbUrl, cfg.token);

    if (!cfg.dbUrl) {
      if (syncStatusDot) syncStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-400';
      if (syncStatusText) syncStatusText.textContent = 'Sync: Offline / Not Configured';
      if (syncDeviceTag) syncDeviceTag.textContent = 'Local Only';
      return;
    }

    try {
      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded');
        return;
      }

      // Initialize Firebase App if not already initialized
      if (!firebase.apps.length) {
        firebase.initializeApp({
          databaseURL: cfg.dbUrl
        });
      }

      firebaseDbInstance = firebase.database();
      if (syncStatusDot) syncStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
      if (syncStatusText) syncStatusText.textContent = 'Sync: Live & Listening for Bank SMS';
      if (syncDeviceTag) syncDeviceTag.textContent = 'Google Cloud Active';

      // Detach existing listener if any
      if (firebaseListenerRef) {
        firebaseListenerRef.off();
      }

      // Listen for incoming SMS posted by phone
      firebaseListenerRef = firebaseDbInstance.ref('incoming_sms');

      firebaseListenerRef.limitToLast(5).on('child_added', (snapshot) => {
        const val = snapshot.val();
        if (!val) return;

        // Support string or object format
        const smsContent = typeof val === 'string' ? val : (val.sms || val.text || val.message || '');
        const smsSender = typeof val === 'object' ? (val.sender || val.from || '') : '';
        if (!smsContent) return;

        // Parse SMS content with Strict SBI filter
        const parsed = parseBankSmsText(smsContent, smsSender);
        if (parsed) {
          // Check for duplicate in recent expenses
          const exists = expenses.some(e => 
            e.date === parsed.date && 
            Math.abs(e.amount - parsed.amount) < 0.01 && 
            e.title === parsed.title
          );

          if (!exists) {
            expenses.unshift(parsed);
            saveData();
            refreshView();
            console.log('⚡ Finlytics Live SMS Auto-Logged:', parsed);
          }
        }
      });

    } catch (err) {
      console.error('Firebase sync error:', err);
      if (syncStatusDot) syncStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
      if (syncStatusText) syncStatusText.textContent = 'Sync Error: Check URL or Network';
    }
  }

  // Sync Modal UI Handlers
  function openSyncModal() {
    moreMenuDropdown.classList.add('hidden');
    syncModal.classList.remove('hidden');
    const cfg = loadSyncConfig();
    updateMacroDroidDisplay(cfg.dbUrl, cfg.token);
  }

  function closeSyncModal() {
    syncModal.classList.add('hidden');
  }

  if (openSyncModalOption) openSyncModalOption.addEventListener('click', openSyncModal);
  if (closeSyncModalBtn) closeSyncModalBtn.addEventListener('click', closeSyncModal);
  if (cancelSyncBtn) cancelSyncBtn.addEventListener('click', closeSyncModal);

  if (saveSyncConfigBtn) {
    saveSyncConfigBtn.addEventListener('click', () => {
      const dbUrl = (firebaseDbUrlInput.value || '').trim();
      const token = (firebaseSyncTokenInput.value || '').trim();

      saveSyncConfig({ dbUrl, token });
      updateMacroDroidDisplay(dbUrl, token);
      initFirebaseSync();
      closeSyncModal();
      alert('Google Firebase Live SMS Sync settings saved successfully!');
    });
  }

  if (testSmsParseBtn && testSmsInput) {
    testSmsParseBtn.addEventListener('click', () => {
      const smsText = testSmsInput.value.trim();
      if (!smsText) {
        alert('Please paste a bank SMS first to test parsing!');
        return;
      }

      const parsed = parseBankSmsText(smsText);
      if (!parsed) {
        alert('Could not detect a debit expense in the pasted SMS. Ensure it contains an amount (e.g. Rs 450) and debit keyword.');
        return;
      }

      // Add to expenses
      expenses.unshift(parsed);
      saveData();
      refreshView();
      closeSyncModal();
      alert(`Success! Auto-logged expense:\n• Title: ${parsed.title}\n• Amount: ₹${parsed.amount.toFixed(2)}\n• Category: ${parsed.category}\n• Mode: ${parsed.paymentMode}\n• Date: ${parsed.date}`);
    });
  }

  // Close modals on Esc key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeBudgetModal();
      closeImportModal();
      if (syncModal) closeSyncModal();
      monthDropdownMenu.classList.add('hidden');
      moreMenuDropdown.classList.add('hidden');
    }
  });

  // --- Mobile Bottom Navigation Listeners ---
  const mobileNavHomeBtn = document.getElementById('mobileNavHomeBtn');
  const mobileNavImportBtn = document.getElementById('mobileNavImportBtn');
  const mobileNavAddBtn = document.getElementById('mobileNavAddBtn');
  const mobileNavSyncBtn = document.getElementById('mobileNavSyncBtn');
  const mobileNavBudgetBtn = document.getElementById('mobileNavBudgetBtn');

  if (mobileNavHomeBtn) {
    mobileNavHomeBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  if (mobileNavImportBtn) {
    mobileNavImportBtn.addEventListener('click', openImportModal);
  }
  if (mobileNavAddBtn) {
    mobileNavAddBtn.addEventListener('click', openAddModal);
  }
  if (mobileNavSyncBtn) {
    mobileNavSyncBtn.addEventListener('click', openSyncModal);
  }
  if (mobileNavBudgetBtn) {
    mobileNavBudgetBtn.addEventListener('click', openBudgetModal);
  }

  // Clear All Data
  const clearAllDataOption = document.getElementById('clearAllDataOption');
  if (clearAllDataOption) {
    clearAllDataOption.addEventListener('click', () => {
      moreMenuDropdown.classList.add('hidden');
      if (confirm('Are you sure you want to clear all current expenses? You can re-import your bank statement fresh!')) {
        expenses = [];
        saveData();
        refreshView();
        alert('All expenses have been cleared! You can now import your statement fresh.');
      }
    });
  }

  // --- PWA Installation & Service Worker ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW failed', err));
    });
  }

  // Always show Install App option in the 3-dots menu for mobile users
  if (installAppOption) {
    installAppOption.classList.remove('hidden');
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installAppOption) {
      installAppOption.classList.remove('hidden');
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    console.log('Finlytics was installed successfully!');
  });

  if (installAppOption) {
    installAppOption.addEventListener('click', async () => {
      if (moreMenuDropdown) moreMenuDropdown.classList.add('hidden');
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            installAppOption.classList.add('hidden');
          }
          deferredPrompt = null;
        } catch (err) {
          console.warn('Install prompt error:', err);
          showManualInstallGuide();
        }
      } else {
        showManualInstallGuide();
      }
    });
  }

  function showManualInstallGuide() {
    alert(
      "📱 To Install Finlytics App on Android:\n\n" +
      "1. Tap Chrome's Top-Right 3-Dots (⋮) Menu\n" +
      "2. Tap 'Add to Home screen' or 'Install app'\n\n" +
      "Tip: If you see 'Could not open app', long-press and uninstall any older Finlytics icon first!"
    );
  }

  // --- App Bootstrap ---
  loadData();
  refreshView();
  initFirebaseSync();

})();
