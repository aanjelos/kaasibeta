function exportData() {
  try {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], {
      type: "application/json",
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-");
    link.download = `kaasi-backup-${timestamp}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification("Data exported.", "success");
  } catch (error) {
    console.error("Export failed:", error);
    showNotification("Data export failed.", "error");
  }
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) {
    if (event && event.target) event.target.value = null;
    return;
  }

  showConfirmationModal(
    "Import Data",
    "Importing data will <strong class='text-warning'>OVERWRITE ALL</strong> current data. This action cannot be undone.<br><br>Are you sure you want to proceed?",
    "Import & Overwrite",
    "Cancel",
    () => {
      // onConfirm
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let importedData = JSON.parse(e.target.result);
          if (importedData && typeof importedData === "object") {
            // Sanitization logic from your previous full script.js
            if (Array.isArray(importedData.transactions)) {
              importedData.transactions.forEach((t) => {
                if (typeof t.amount === "number")
                  t.amount = roundToTwoDecimals(t.amount);
              });
            }
            if (Array.isArray(importedData.accounts)) {
              importedData.accounts.forEach((acc) => {
                if (typeof acc.balance === "number")
                  acc.balance = roundToTwoDecimals(acc.balance);
              });
            }
            if (Array.isArray(importedData.debts)) {
              importedData.debts.forEach((d) => {
                if (typeof d.amount === "number")
                  d.amount = roundToTwoDecimals(d.amount);
                if (typeof d.originalAmount === "number")
                  d.originalAmount = roundToTwoDecimals(d.originalAmount);
                if (typeof d.remainingAmount === "number")
                  d.remainingAmount = roundToTwoDecimals(d.remainingAmount);
              });
            }
            if (Array.isArray(importedData.receivables)) {
              importedData.receivables.forEach((r) => {
                if (typeof r.amount === "number")
                  r.amount = roundToTwoDecimals(r.amount);
                if (typeof r.originalAmount === "number")
                  r.originalAmount = roundToTwoDecimals(r.originalAmount);
                if (typeof r.remainingAmount === "number")
                  r.remainingAmount = roundToTwoDecimals(r.remainingAmount);
              });
            }
            if (Array.isArray(importedData.installments)) {
              importedData.installments.forEach((i) => {
                if (typeof i.monthlyAmount === "number")
                  i.monthlyAmount = roundToTwoDecimals(i.monthlyAmount);
                if (typeof i.originalFullAmount === "number")
                  i.originalFullAmount = roundToTwoDecimals(
                    i.originalFullAmount
                  );
              });
            }
            if (
              importedData.creditCard &&
              typeof importedData.creditCard === "object"
            ) {
              if (typeof importedData.creditCard.limit === "number") {
                importedData.creditCard.limit = roundToTwoDecimals(
                  importedData.creditCard.limit
                );
              }
              if (Array.isArray(importedData.creditCard.transactions)) {
                importedData.creditCard.transactions.forEach((ccTrans) => {
                  if (typeof ccTrans.amount === "number")
                    ccTrans.amount = roundToTwoDecimals(ccTrans.amount);
                  if (typeof ccTrans.paidAmount === "number")
                    ccTrans.paidAmount = roundToTwoDecimals(ccTrans.paidAmount);
                  if (
                    ccTrans.paidAmount >=
                    roundToTwoDecimals(ccTrans.amount - 0.005)
                  ) {
                    ccTrans.paidOff = true;
                    ccTrans.paidAmount = ccTrans.amount;
                  } else {
                    ccTrans.paidOff = false;
                  }
                });
              }
            }

            state = deepMerge(getDefaultState(), importedData);
            ensureDefaultAccounts();
            ensureDefaultCategories();

            state.accounts.forEach((acc) => {
              if (isNaN(acc.balance) || typeof acc.balance !== "number")
                acc.balance = 0;
              else acc.balance = roundToTwoDecimals(acc.balance);
            });

            if (!state.creditCard)
              state.creditCard = { limit: 0, transactions: [] };
            if (
              isNaN(state.creditCard.limit) ||
              typeof state.creditCard.limit !== "number"
            )
              state.creditCard.limit = 0;
            else
              state.creditCard.limit = roundToTwoDecimals(
                state.creditCard.limit
              );

            if (!Array.isArray(state.creditCard.transactions))
              state.creditCard.transactions = [];
            state.creditCard.transactions.forEach((t) => {
              if (typeof t.amount !== "number" || isNaN(t.amount)) t.amount = 0;
              else t.amount = roundToTwoDecimals(t.amount);
              if (typeof t.paidAmount !== "number" || isNaN(t.paidAmount))
                t.paidAmount = 0;
              else t.paidAmount = roundToTwoDecimals(t.paidAmount);
              if (t.paidAmount >= roundToTwoDecimals(t.amount - 0.005)) {
                t.paidOff = true;
                t.paidAmount = t.amount;
              } else {
                t.paidOff = false;
              }
              if (!t.timestamp) t.timestamp = new Date(t.date).getTime();
            });
            state.transactions.forEach((t) => {
              if (!t.timestamp) t.timestamp = new Date(t.date).getTime();
            });
            state.debts.forEach((d) => {
              if (!d.timestamp) d.timestamp = new Date(d.dueDate).getTime();
            });
            state.receivables.forEach((r) => {
              if (!r.timestamp) r.timestamp = new Date(r.dateGiven).getTime();
            });
            state.installments.forEach((i) => {
              if (!i.timestamp) i.timestamp = new Date(i.startDate).getTime();
            });

            if (!state.settings) state.settings = getDefaultState().settings;
            state.settings.initialSetupDone = true;

            saveData();
            initializeUI(true);
            showNotification(
              "Data imported and sanitized successfully. Application refreshed.",
              "success"
            );
            closeModal("settingsModal");
          } else {
            throw new Error(
              "Invalid data structure in imported file. Ensure it's a Kaasi backup."
            );
          }
        } catch (error) {
          console.error("Import failed during processing:", error);
          showNotification(`Import failed: ${error.message}`, "error", 7000);
        } finally {
          if (event && event.target) event.target.value = null;
        }
      };
      reader.onerror = () => {
        showNotification("Failed to read the import file.", "error");
        if (event && event.target) event.target.value = null;
      };
      reader.readAsText(file);
    },
    () => {
      // onCancel
      if (event && event.target) event.target.value = null;
      showNotification("Import cancelled.", "info");
    },
    "btn-primary"
  );
}

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

        // NEW: Add dotted line
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

function initiateDeleteAllData() {
  $("#initiateDeleteBtn").classList.add("hidden");
  $("#deleteConfirmationSection").classList.remove("hidden");
  resetDeleteSlider();
}

function cancelDeleteAllData() {
  $("#initiateDeleteBtn").classList.remove("hidden");
  $("#deleteConfirmationSection").classList.add("hidden");
  resetDeleteSlider();
}
let maxTranslateX = 0;
let isDragging = false;
function setupDeleteSlider() {
  const sliderContainer = $("#deleteSliderContainer");
  const handle = $("#deleteSliderHandle");
  const track = sliderContainer.querySelector(".slide-to-confirm-track");
  if (!sliderContainer || !handle || !track) return;

  let startX = 0;
  let currentTranslateX = 0;

  const calculateMaxTranslate = () => {
    maxTranslateX = sliderContainer.offsetWidth - handle.offsetWidth - 4;
  };

  window.resetDeleteSlider = () => {
    isDragging = false;
    currentTranslateX = 0;
    handle.style.transition =
      "transform 0.2s ease-out, background-color 0.2s ease-out";
    track.style.transition =
      "width 0.2s ease-out, background-color 0.2s ease-out";
    handle.style.transform = `translateX(0px)`;
    track.style.width = `0px`;
    track.style.backgroundColor = "var(--button-success-bg)";
    handle.innerHTML = '<i class="fas fa-arrow-right"></i>';
    handle.style.backgroundColor = "var(--accent-primary)";
    handle.style.cursor = "grab";
    sliderContainer.style.cursor = "pointer";
  };

  const startDrag = (clientX) => {
    calculateMaxTranslate();
    isDragging = true;
    startX = clientX - handle.getBoundingClientRect().left;
    handle.style.transition = "none";
    track.style.transition = "none";
    handle.style.cursor = "grabbing";
    sliderContainer.style.cursor = "grabbing";
  };

  const drag = (clientX) => {
    if (!isDragging) return;
    let newTranslateX =
      clientX - sliderContainer.getBoundingClientRect().left - startX;
    currentTranslateX = Math.max(0, Math.min(newTranslateX, maxTranslateX));
    handle.style.transform = `translateX(${currentTranslateX}px)`;
    track.style.width = `${currentTranslateX + handle.offsetWidth / 2}px`;
  };

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    handle.style.cursor = "grab";
    sliderContainer.style.cursor = "pointer";

    handle.style.transition =
      "transform 0.2s ease-out, background-color 0.2s ease-out";
    track.style.transition =
      "width 0.2s ease-out, background-color 0.2s ease-out";

    if (currentTranslateX >= maxTranslateX - 1) {
      completeDeletion();
    } else {
      resetDeleteSlider();
    }
  };

  handle.addEventListener("mousedown", (e) => startDrag(e.clientX));
  document.addEventListener("mousemove", (e) => {
    if (isDragging) drag(e.clientX);
  });
  document.addEventListener("mouseup", endDrag);

  handle.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      startDrag(e.touches[0].clientX);
    },
    {
      passive: false,
    }
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (isDragging) {
        e.preventDefault();
        drag(e.touches[0].clientX);
      }
    },
    {
      passive: false,
    }
  );
  document.addEventListener("touchend", endDrag);

  window.addEventListener("resize", () => {
    if (
      $("#deleteConfirmationSection") &&
      !$("#deleteConfirmationSection").classList.contains("hidden")
    ) {
      calculateMaxTranslate();
      resetDeleteSlider();
    }
  });
}

function completeDeletion() {
  const handle = $("#deleteSliderHandle");
  const track = $(".slide-to-confirm-track");
  handle.innerHTML = '<i class="fas fa-check"></i>';
  handle.style.backgroundColor = "var(--button-success-bg)";
  track.style.width = "100%";
  track.style.backgroundColor = "var(--button-success-bg)";
  handle.style.transform = `translateX(${maxTranslateX}px)`;
  isDragging = false;
  handle.style.pointerEvents = "none";
  setTimeout(() => {
    localStorage.removeItem(STORAGE_KEY);
    state = getDefaultState();
    ensureDefaultAccounts();
    ensureDefaultCategories();
    initializeUI(true);
    closeModal("settingsModal");
    showNotification("All data deleted.", "success");
    handle.style.pointerEvents = "auto";
  }, 500);
}

