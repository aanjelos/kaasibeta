/**
 * charts.js
 * Manages data visualization including charts, graphs, and PDF report generation.
 */
function generateMonthlyPdfReport() {
  if (typeof window.jspdf === "undefined") {
    showNotification("PDF generation library is not loaded.", "error");
    return;
  }

  const { jsPDF } = window.jspdf;
  const activeTab = $("#monthTabs .tab-button.active");

  if (!activeTab) {
    showNotification("Please select a month to generate a report.", "info");
    return;
  }

  const month = parseInt(activeTab.dataset.month);
  const year = parseInt(activeTab.dataset.year);
  const monthName = new Date(year, month).toLocaleString("default", {
    month: "long",
  });

  showNotification(`Generating PDF for ${monthName} ${year}...`, "info", 3000);

  // --- 1. Data Preparation ---
  const transactionsInMonth = state.transactions
    .filter((t) => {
      const tDate = new Date(t.date);
      if (tDate.getFullYear() !== year || tDate.getMonth() !== month) return false;
      if (t.type === "expense" && isCategoryExcluded(t.category || "Other", 'excludeFromReports')) {
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = {};

  transactionsInMonth.forEach((t) => {
    if (t.type === "income") {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
      const category = t.category || "Other";
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += t.amount;
    }
  });
  const netFlow = totalIncome - totalExpense;

  // --- 2. PDF Document Setup ---
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let cursorY = margin;

  // --- Base64 Encoded PNG Logo ---
  const kaasiLogoBase64 =
    "data:image/png;base64,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";

  // --- 3. PDF Content Drawing Functions ---
  const drawHeader = () => {
    doc.addImage(kaasiLogoBase64, "PNG", margin, cursorY - 12, 80, 0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor("#333333");
    doc.text("Monthly Financial Statement", pageWidth / 2, cursorY, {
      align: "center",
    });

    doc.setFontSize(10);
    doc.text(`${monthName} ${year}`, pageWidth - margin, cursorY, {
      align: "right",
    });

    cursorY += 30;
    doc.setDrawColor("#DDDDDD");
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 25;
  };

  const drawFooter = (pageNumber) => {
    const footerY = pageHeight - margin + 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#AAAAAA");
    doc.text(`Page ${pageNumber}`, pageWidth / 2, footerY, { align: "center" });
    doc.text("All amounts in LKR", pageWidth - margin, footerY, {
      align: "right",
    });
    doc.textWithLink("Generated by Kaasi | kaasi.com.lk", margin, footerY, {
      url: "https://kaasi.com.lk",
    });
  };

  const drawSummary = (yPosition) => {
    const boxWidth = (pageWidth - margin * 2 - 20) / 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#666666");
    doc.text("Total Income", margin + boxWidth / 2, yPosition + 15, {
      align: "center",
    });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor("#2a9d8f");
    doc.text(
      formatCurrency(totalIncome),
      margin + boxWidth / 2,
      yPosition + 35,
      { align: "center" }
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#666666");
    doc.text(
      "Total Expenses",
      margin + boxWidth + 10 + boxWidth / 2,
      yPosition + 15,
      { align: "center" }
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor("#e74c3c");
    doc.text(
      formatCurrency(totalExpense),
      margin + boxWidth + 10 + boxWidth / 2,
      yPosition + 35,
      { align: "center" }
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#666666");
    doc.text(
      "Net Flow",
      margin + (boxWidth + 10) * 2 + boxWidth / 2,
      yPosition + 15,
      { align: "center" }
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(netFlow >= 0 ? "#2a9d8f" : "#e74c3c");
    doc.text(
      formatCurrency(netFlow),
      margin + (boxWidth + 10) * 2 + boxWidth / 2,
      yPosition + 35,
      { align: "center" }
    );
  };

  const formatNumberForPdf = (amount) => {
    if (typeof amount !== "number" || isNaN(amount)) amount = 0;
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
  };

  const drawTable = () => {
    // FIXED: Adjusted column widths to fit the page perfectly
    const tableHeaders = ["Date", "Description", "Category", "Debit", "Credit"];
    const colWidths = [60, 215, 100, 70, 70];
    const rowHeight = 20;
    let pageNumber = 1;

    const drawPageContent = () => {
      drawHeader();
      if (pageNumber === 1) {
        drawSummary(cursorY);
        cursorY += 70;
      }
      cursorY += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor("#333333");
      let currentX = margin;
      tableHeaders.forEach((header, i) => {
        let align = "left";
        let xPos = currentX;
        if (i >= 3) {
          align = "right";
          xPos = currentX + colWidths[i];
        }
        doc.text(header, xPos, cursorY, { align: align });
        currentX += colWidths[i];
      });
      cursorY += 5;
      doc.setDrawColor("#DDDDDD");
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += rowHeight;
    };

    drawPageContent();

    transactionsInMonth.forEach((t) => {
      const desc = doc.splitTextToSize(t.description, colWidths[1] - 5);
      const category = doc.splitTextToSize(t.category || "-", colWidths[2] - 5);
      const rowLineCount = Math.max(
        Array.isArray(desc) ? desc.length : 1,
        Array.isArray(category) ? category.length : 1
      );
      const requiredSpace = rowHeight * rowLineCount;

      if (cursorY + requiredSpace > pageHeight - margin - 20) {
        drawFooter(pageNumber);
        doc.addPage();
        pageNumber++;
        cursorY = margin;
        drawPageContent();
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor("#555555");
      let currentX = margin;
      const date = new Date(t.date).toLocaleDateString("en-GB");
      const debit = t.type === "expense" ? formatNumberForPdf(t.amount) : "";
      const credit = t.type === "income" ? formatNumberForPdf(t.amount) : "";

      doc.text(date, currentX, cursorY);
      currentX += colWidths[0];
      doc.text(desc, currentX, cursorY);
      currentX += colWidths[1];
      doc.text(category, currentX, cursorY);
      currentX += colWidths[2];
      doc.text(debit, currentX + colWidths[3], cursorY, { align: "right" });
      currentX += colWidths[3];
      doc.text(credit, currentX + colWidths[4], cursorY, { align: "right" });
      cursorY += requiredSpace;
    });

    if (cursorY > pageHeight - margin - 60) {
      drawFooter(pageNumber);
      doc.addPage();
      pageNumber++;
      cursorY = margin;
      drawHeader();
    }

    cursorY += 20;
    doc.setDrawColor("#333333");
    doc.line(
      pageWidth - margin - colWidths[3] - colWidths[4],
      cursorY,
      pageWidth - margin,
      cursorY
    );
    cursorY += rowHeight;

    doc.setFont("helvetica", "bold");
    doc.text(
      "Totals:",
      pageWidth - margin - colWidths[3] - colWidths[4] - 50,
      cursorY,
      { align: "right" }
    );

    doc.setTextColor("#e74c3c");
    doc.text(
      formatNumberForPdf(totalExpense),
      pageWidth - margin - colWidths[4],
      cursorY,
      { align: "right" }
    );
    doc.setTextColor("#2a9d8f");
    doc.text(formatNumberForPdf(totalIncome), pageWidth - margin, cursorY, {
      align: "right",
    });

    cursorY += 5;
    doc.setDrawColor("#333333");
    doc.line(
      pageWidth - margin - colWidths[3] - colWidths[4],
      cursorY,
      pageWidth - margin,
      cursorY
    );
    doc.line(
      pageWidth - margin - colWidths[3] - colWidths[4],
      cursorY + 2,
      pageWidth - margin,
      cursorY + 2
    );

    drawFooter(pageNumber);

    if (Object.keys(categoryTotals).length > 0) {
      doc.addPage();
      pageNumber++;
      cursorY = margin;
      drawHeader();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor("#333333");
      doc.text("Category Breakdown", pageWidth / 2, cursorY, {
        align: "center",
      });
      cursorY += 30;

      const catTableHeaders = ["Category", "Total Spent"];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(catTableHeaders[0], margin, cursorY);
      doc.text(catTableHeaders[1], pageWidth - margin, cursorY, {
        align: "right",
      });
      cursorY += 5;
      doc.setDrawColor("#DDDDDD");
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += rowHeight;

      const sortedCategories = Object.entries(categoryTotals).sort(
        ([, a], [, b]) => b - a
      );

      sortedCategories.forEach(([category, amount]) => {
        if (cursorY > pageHeight - margin - rowHeight) {
          drawFooter(pageNumber);
          doc.addPage();
          pageNumber++;
          cursorY = margin;
          drawHeader();
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor("#555555");

        const categoryText = category;
        const amountText = formatNumberForPdf(amount);

        doc.text(categoryText, margin, cursorY);
        doc.text(amountText, pageWidth - margin, cursorY, { align: "right" });


        const categoryWidth = doc.getTextWidth(categoryText);
        const amountWidth = doc.getTextWidth(amountText);
        const startX = margin + categoryWidth + 5;
        const endX = pageWidth - margin - amountWidth - 5;

        doc.setLineDashPattern([1, 2], 0);
        doc.setDrawColor("#AAAAAA");
        doc.line(startX, cursorY - 3, endX, cursorY - 3);
        doc.setLineDashPattern([], 0);

        cursorY += rowHeight;
      });
      drawFooter(pageNumber);
    }
  };

  // --- 4. Generate and Save PDF ---
  try {
    drawTable();
    doc.save(`Kaasi-Report-${monthName}-${year}.pdf`);
    if (typeof trackEvent === "function") trackEvent("export_pdf", "Feature Usage");
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    showNotification("An error occurred while generating the PDF.", "error");
  }
}



function renderMonthlyOverviewChart() {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js is not loaded. Cannot render monthly overview chart.");
    return;
  }
  const canvas = $("#monthlyOverviewChart");
  if (!canvas) return;

  const chartTitleEl = $("#dashboardChartTitle");
  const toggleBtn = $("#toggleChartBtn");
  const toggleBtnIcon = toggleBtn ? toggleBtn.querySelector("i") : null;


  const ctx = canvas.getContext("2d");

  // Get theme-dependent colors for grid lines, ticks, etc.
  const computedStyle = getComputedStyle(document.documentElement);
  const chartGridColor =
    computedStyle.getPropertyValue("--chart-grid-color").trim() ||
    "rgba(255,255,255,0.1)";
  const chartTickColor =
    computedStyle.getPropertyValue("--chart-tick-color").trim() || "#aaa";
  const chartLegendColor =
    computedStyle.getPropertyValue("--chart-legend-color").trim() || "#e0e0e0";
  const chartTooltipBg =
    computedStyle.getPropertyValue("--chart-tooltip-bg").trim() ||
    "rgba(0,0,0,0.8)";
  const chartTooltipText =
    computedStyle.getPropertyValue("--chart-tooltip-text").trim() || "#fff";

  // Use CSS variables for income/expense instead of hardcoded hexes
  const incomeColor = computedStyle.getPropertyValue("--chart-income-color").trim() || computedStyle.getPropertyValue("--income-color").trim() || "#2a9d8f";
  const expenseColor = computedStyle.getPropertyValue("--chart-expense-color").trim() || computedStyle.getPropertyValue("--expense-color").trim() || "#e74c3c";

  const hexToRgba = (hex, alpha = 0.3) => {
    let r = 0,
      g = 0,
      b = 0;
    if (hex.length == 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length == 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  let chartLabels, chartDatasets;

  // --- LOGIC FOR MONTHLY (DAILY) EXPENSE VIEW ---
  if (dashboardChartState === "monthly") {
    if (chartTitleEl)
      chartTitleEl.textContent = "Daily Expenses (Current Month)";
    if (toggleBtnIcon) {
      toggleBtnIcon.className = "fas fa-calendar-alt fa-lg";
      toggleBtn.dataset.tooltip = "Switch to Yearly View";
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    chartLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const dailyExpenseData = new Array(daysInMonth).fill(0);

    state.transactions.forEach((t) => {
      const tDate = new Date(t.date);
      if (
        t.type === "expense" &&
        tDate.getMonth() === currentMonth &&
        tDate.getFullYear() === currentYear &&
        !isCategoryExcluded(t.category || "Other", 'excludeFromDashboardCharts')
      ) {
        const dayOfMonth = tDate.getDate();
        dailyExpenseData[dayOfMonth - 1] += t.amount;
      }
    });

    chartDatasets = [
      {
        type: "bar",
        label: "Daily Expense",
        data: dailyExpenseData,
        backgroundColor: hexToRgba(expenseColor, 0.8),
        hoverBackgroundColor: expenseColor,
        borderRadius: 4,
        borderWidth: 0,
      },
    ];

    // --- LOGIC FOR YEARLY (INCOME VS EXPENSE) VIEW ---
  } else {
    if (chartTitleEl)
      chartTitleEl.textContent = "Monthly Income vs Expenses (Last 12 Months)";
    if (toggleBtnIcon) {
      toggleBtnIcon.className = "fas fa-chart-line fa-lg";
      toggleBtn.dataset.tooltip = "Switch to Daily Expense View";
    }

    chartLabels = [];
    const incomeData = [];
    const expenseData = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();

      chartLabels.push(date.toLocaleString("default", { month: "short" }));

      let monthlyIncome = 0;
      let monthlyExpense = 0;
      state.transactions.forEach((t) => {
        const tDate = new Date(t.date);
        if (isNaN(tDate.getTime())) return;
        if (tDate.getFullYear() === year && tDate.getMonth() === month) {
          if (t.type === "income") monthlyIncome += t.amount;
          else if (t.type === "expense" && !isCategoryExcluded(t.category || "Other", 'excludeFromDashboardCharts')) monthlyExpense += t.amount;
        }
      });
      incomeData.push(monthlyIncome);
      expenseData.push(monthlyExpense);
    }

    chartDatasets = [
      {
        label: "Income",
        data: incomeData,
        borderColor: incomeColor,
        backgroundColor: hexToRgba(incomeColor, 0.3),
        fill: true,
        tension: 0.4,
        pointBackgroundColor: incomeColor,
        pointBorderColor: "#fff",
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: incomeColor,
      },
      {
        label: "Expenses",
        data: expenseData,
        borderColor: expenseColor,
        backgroundColor: hexToRgba(expenseColor, 0.3),
        fill: true,
        tension: 0.4,
        pointBackgroundColor: expenseColor,
        pointBorderColor: "#fff",
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: expenseColor,
      },
    ];
  }

  // --- Create or Update the Chart ---
  if (monthlyOverviewChartInstance) {
    // Optimization: Update data and options instead of destroying the canvas
    monthlyOverviewChartInstance.data.labels = chartLabels;
    monthlyOverviewChartInstance.data.datasets = chartDatasets;
    
    // Update theme-dependent options in case the user toggled light/dark mode
    if (monthlyOverviewChartInstance.options && monthlyOverviewChartInstance.options.scales) {
      monthlyOverviewChartInstance.options.scales.x.offset = (dashboardChartState === "monthly");
      monthlyOverviewChartInstance.options.scales.y.ticks.color = chartTickColor;
      monthlyOverviewChartInstance.options.scales.y.grid.color = chartGridColor;
      monthlyOverviewChartInstance.options.scales.x.ticks.color = chartTickColor;
      monthlyOverviewChartInstance.options.plugins.legend.labels.color = chartLegendColor;
      monthlyOverviewChartInstance.options.plugins.tooltip.backgroundColor = chartTooltipBg;
      monthlyOverviewChartInstance.options.plugins.tooltip.titleColor = chartTooltipText;
      monthlyOverviewChartInstance.options.plugins.tooltip.bodyColor = chartTooltipText;
    }
    
    monthlyOverviewChartInstance.update();
  } else {
    monthlyOverviewChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: chartLabels,
        datasets: chartDatasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: chartTickColor,
              callback: (v) =>
                v >= 1000000
                  ? `LKR ${(v / 1000000).toFixed(1)}M`
                  : v >= 1000
                  ? `LKR ${(v / 1000).toFixed(0)}k`
                  : formatCurrency(v),
            },
            grid: { color: chartGridColor, drawBorder: false },
          },
          x: {
            ticks: { color: chartTickColor },
            grid: { display: false },
            offset: (dashboardChartState === "monthly"),
          },
        },
        plugins: {
          legend: {
            position: "top",
            labels: { color: chartLegendColor, usePointStyle: true, boxWidth: 8 },
          },
          tooltip: {
            backgroundColor: chartTooltipBg,
            titleColor: chartTooltipText,
            bodyColor: chartTooltipText,
            padding: 10,
            cornerRadius: 4,
            usePointStyle: true,
            callbacks: {
              label: (c) =>
                `${c.dataset.label || ""}: ${formatCurrency(c.parsed.y)}`,
            },
          },
        },
        interaction: { mode: "index", intersect: false },
      },
    });
  }
}

function renderMonthlyPieChart(data, isUpdate = false) {
  if (typeof Chart === "undefined") {
    console.warn("Chart.js is not loaded. Cannot render monthly pie chart.");
    return;
  }
  const canvas = document.getElementById("monthlyDetailPieChartCanvas");
  if (!canvas || !canvas.getContext) {
    console.error(
      "Canvas for monthly pie chart (id: monthlyDetailPieChartCanvas) not found or invalid."
    );

    if (monthlyPieChartInstance) {
      monthlyPieChartInstance.destroy();
      monthlyPieChartInstance = null;
    }
    return;
  }
  canvas.onmouseleave = () => {
    if (monthlyPieChartInstance && (monthlyPieChartInstance.lockedIndex === undefined || monthlyPieChartInstance.lockedIndex === null)) {
      const dataContainer = document.getElementById("pieChartDataContainer");
      const placeholderContainer = document.getElementById("pieChartPlaceholderContainer");
      if (dataContainer && placeholderContainer) {
        dataContainer.classList.add("hidden");
        placeholderContainer.classList.remove("hidden");
      }
    }
  };

  const ctx = canvas.getContext("2d");

  const computedStyle = getComputedStyle(document.documentElement);
  const chartTooltipBg = computedStyle.getPropertyValue("--chart-tooltip-bg").trim() || "rgba(0,0,0,0.85)";
  const chartTooltipText = computedStyle.getPropertyValue("--chart-tooltip-text").trim() || "#fff";
  const bgTertiary = computedStyle.getPropertyValue("--bg-tertiary").trim() || "#2c2c2c";

  // Refined, cohesive modern palette
  const brandPiePalette = [
    "#e67e26", // Brand Orange
    "#2a9d8f", // Teal
    "#e9c46a", // Soft Yellow
    "#e76f51", // Burnt Orange
    "#3498db", // Blue
    "#9b59b6", // Soft Purple
    "#1abc9c", // Mint
    "#f4a261", // Light Orange
    "#34495e", // Slate
    "#d35400", // Dark Orange
    "#6c7a89", // Gray (usually for "Other")
  ];

  // Group smaller slices into "Other"
  let total = data.values.reduce((sum, val) => sum + val, 0);
  let processedLabels = [];
  let processedValues = [];
  let otherSum = 0;

  for (let i = 0; i < data.values.length; i++) {
    // If slice is less than 2% and we have more than 5 categories, group it
    if (data.values[i] / total < 0.02 && data.values.length > 5) {
      otherSum += data.values[i];
    } else {
      processedLabels.push(data.labels[i]);
      processedValues.push(data.values[i]);
    }
  }

  if (otherSum > 0) {
    processedLabels.push("Other");
    processedValues.push(otherSum);
  }

  const backgroundColors = processedLabels.map((label, index) => {
    if (label === "Other") return "#5e6a75"; // Specific muted color for Other
    return brandPiePalette[index % (brandPiePalette.length - 1)];
  });

  if (monthlyPieChartInstance) {
    monthlyPieChartInstance.data.labels = processedLabels;
    monthlyPieChartInstance.data.datasets[0].data = processedValues;
    monthlyPieChartInstance.data.datasets[0].backgroundColor = backgroundColors;
    monthlyPieChartInstance.update();
  } else {
    monthlyPieChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: processedLabels,
        datasets: [
          {
            label: "Expenses",
            data: processedValues,
            backgroundColor: backgroundColors,
            borderColor: bgTertiary,
            borderWidth: 2,
            hoverOffset: 6,
            borderRadius: 4,
          },
        ],
      },
      options: {
        cutout: "72%",
        animation: isUpdate ? false : { animateRotate: true, animateScale: true },
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, activeElements, chart) => {
          if (activeElements && activeElements.length > 0) {
            const clickedIndex = activeElements[0].index;
            if (chart.lockedIndex === clickedIndex) {
              chart.lockedIndex = null;
            } else {
              chart.lockedIndex = clickedIndex;
            }
          } else {
            chart.lockedIndex = null;
          }
          chart.options.onHover(event, activeElements, chart);
        },
        onHover: (event, activeElements, chart) => {
          const centerInfo = document.getElementById("pieChartCenterInfo");
          const dataContainer = document.getElementById("pieChartDataContainer");
          const placeholderContainer = document.getElementById("pieChartPlaceholderContainer");
          
          const centerTitle = document.getElementById("pieChartCenterTitle");
          const centerValue = document.getElementById("pieChartCenterValue");
          const centerPercentage = document.getElementById("pieChartCenterPercentage");
          
          if (!centerInfo || !dataContainer || !placeholderContainer) return;

          const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);

          const renderDataCenter = (activeIndex) => {
            const dataset = chart.data.datasets[0];
            const label = chart.data.labels[activeIndex];
            const val = dataset.data[activeIndex];
            const color = dataset.backgroundColor[activeIndex];
            
            const percentage = total > 0 ? ((val / total) * 100).toFixed(1) + "%" : "0.0%";

            centerTitle.textContent = label;
            centerValue.textContent = formatCurrency(val);
            
            centerPercentage.textContent = percentage;
            centerPercentage.style.backgroundColor = color + "40"; 
            centerPercentage.style.color = chartTooltipText;

            placeholderContainer.classList.add("hidden");
            dataContainer.classList.remove("hidden");
            centerInfo.classList.remove("opacity-0");
          };

          if (activeElements && activeElements.length > 0) {
            renderDataCenter(activeElements[0].index);
          } else {
            if (chart.lockedIndex !== undefined && chart.lockedIndex !== null) {
              renderDataCenter(chart.lockedIndex);
            } else {
              // Revert to Placeholder
              dataContainer.classList.add("hidden");
              placeholderContainer.classList.remove("hidden");
              centerInfo.classList.remove("opacity-0");
            }
          }
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
          },
        },
      },
    });
    
    // Set initial state
    const centerInfo = document.getElementById("pieChartCenterInfo");
    if (centerInfo) {
      centerInfo.classList.remove("opacity-0");
    }
  }
}

