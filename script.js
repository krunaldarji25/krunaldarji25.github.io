let chartInstance = null;
let currentDate = new Date();
let selectedDate = null;

const DATE_RANGE_START = new Date(2023, 8, 1); // 2023-09-01
const DATE_RANGE_END = new Date(2026, 6 , 29); // 2026-07-29

// Helper function to find column name (case-insensitive)
function findColumn(row, possibleNames) {
  for (let name of possibleNames) {
    if (row.hasOwnProperty(name)) return name;
    const lowerName = name.toLowerCase();
    const foundKey = Object.keys(row).find(k => k.toLowerCase() === lowerName);
    if (foundKey) return foundKey;
  }
  return null;
}

// Format date as YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Initialize calendar on page load
document.addEventListener('DOMContentLoaded', function() {
  renderCalendar();
  
  // Set today as default selected
  const today = new Date();
  if (today >= DATE_RANGE_START && today <= DATE_RANGE_END) {
    selectedDate = new Date(today);
    updateSelectedDateDisplay();
  }
});


function renderCalendar() {
  const calendarDiv = document.getElementById('calendar');
  calendarDiv.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'calendar-header';
  
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '← Prev';
  prevBtn.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  };
  
  const monthYear = document.createElement('h2');
  monthYear.textContent = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next →';
  nextBtn.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  };
  
  header.appendChild(prevBtn);
  header.appendChild(monthYear);
  header.appendChild(nextBtn);
  calendarDiv.appendChild(header);

  // Weekday headers
  const weekdaysDiv = document.createElement('div');
  weekdaysDiv.className = 'weekdays';
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekDays.forEach(day => {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'weekday';
    dayDiv.textContent = day;
    weekdaysDiv.appendChild(dayDiv);
  });
  calendarDiv.appendChild(weekdaysDiv);

  // Days grid
  const daysDiv = document.createElement('div');
  daysDiv.className = 'days';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevLastDay = new Date(year, month, 0);

  // Previous month days
  const prevDaysCount = firstDay.getDay();
  for (let i = prevDaysCount - 1; i >= 0; i--) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day other-month';
    dayDiv.textContent = prevLastDay.getDate() - i;
    daysDiv.appendChild(dayDiv);
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day';
    dayDiv.textContent = i;

    const cellDate = new Date(year, month, i);
    
    // Check if date is today
    const today = new Date();
    if (cellDate.toDateString() === today.toDateString()) {
      dayDiv.classList.add('today');
    }

    // Check if date is selected
    if (selectedDate && cellDate.toDateString() === selectedDate.toDateString()) {
      dayDiv.classList.add('selected');
    }

    // Check if date is in range
    if (cellDate >= DATE_RANGE_START && cellDate <= DATE_RANGE_END) {
      dayDiv.classList.add('has-file');
      dayDiv.style.cursor = 'pointer';
      dayDiv.onclick = () => {
        selectedDate = new Date(cellDate);
        renderCalendar();
        updateSelectedDateDisplay();
        loadFileForDate(selectedDate);
      };
    } else {
      dayDiv.style.opacity = '0.4';
    }

    daysDiv.appendChild(dayDiv);
  }

  // Next month days
  const nextDaysCount = 7 - lastDay.getDay() - 1;
  for (let i = 1; i <= nextDaysCount; i++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day other-month';
    dayDiv.textContent = i;
    daysDiv.appendChild(dayDiv);
  }

  calendarDiv.appendChild(daysDiv);
}

function updateSelectedDateDisplay() {
  let info = document.querySelector('.selected-date');
  if (!info) {
    info = document.createElement('div');
    info.className = 'selected-date';
    document.getElementById('calendar').appendChild(info);
  }
  if (selectedDate) {
    info.textContent = `📅 Selected: ${formatDate(selectedDate)}`;
  }
}

function loadFileForDate(date) {
  const dateStr = formatDate(date);
  const fileName = `SENSEX_${dateStr}_1m.csv`;
  
  // Try to load file from the workspace
  fetch(fileName)
    .then(response => {
      if (!response.ok) {
        throw new Error(`File not found: ${fileName}`);
      }
      return response.text();
    })
    .then(csvData => {
      Papa.parse(csvData, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function (results) {
          processAndDisplayData(results.data, fileName, dateStr);
        },
        error: function (error) {
          alert(`Error parsing CSV: ${error.message}`);
        }
      });
    })
    .catch(error => {
      alert(`Cannot load file: ${fileName}\n\nMake sure the file is in the same directory as this HTML file.`);
      console.error(error);
    });
}

function processAndDisplayData(rawData, fileName, dateStr) {
  if (!rawData || rawData.length === 0) {
    alert("No data found in CSV file");
    return;
  }

  const raw = rawData;
  
  // Detect columns
  const sampleRow = raw[0];
  const datetimeCol = findColumn(sampleRow, ["datetime", "time", "date_time", "timestamp"]);
  const strikeCol = findColumn(sampleRow, ["strike_label", "strike", "strike_type"]);
  const optionCol = findColumn(sampleRow, ["option_type", "type"]);
  const closeCol = findColumn(sampleRow, ["close", "price"]);
  const ivCol = findColumn(sampleRow, ["iv", "volatility", "implied_vol"]);
  const strikePrice = findColumn(sampleRow, ["strike_price", "strike"]);
  const spotCol = findColumn(sampleRow, ["spot", "underlying"]);
  const highCol = findColumn(sampleRow, ["high"]);
  const lowCol = findColumn(sampleRow, ["low"]);

  if (!datetimeCol) {
    alert("Could not find datetime column. Expected: datetime, time, date_time, or timestamp");
    return;
  }

  // Calculate realized move from high/low columns
  const realizedMove = {};
  raw.forEach(row => {
    const dt = row[datetimeCol];
    const high = highCol ? Number(row[highCol]) : null;
    const low = lowCol ? Number(row[lowCol]) : null;
    
    if (high && low) {
      if (!realizedMove[dt]) {
        realizedMove[dt] = { high: high, low: low };
      } else {
        realizedMove[dt].high = Math.max(realizedMove[dt].high, high);
        realizedMove[dt].low = Math.min(realizedMove[dt].low, low);
      }
    }
  });

  // Strike levels to track — ATM plus offsets
  const STRIKE_LEVELS = ["ATM-2", "ATM-1", "ATM", "ATM+1", "ATM+2"];

  // Filter for all relevant strike levels
  const relevantRows = raw.filter(row => {
    const strike = row[strikeCol];
    const type = row[optionCol];
    return strike && STRIKE_LEVELS.includes(strike.toString().trim()) &&
           type && (type.toString().toUpperCase() === "CALL" || type.toString().toUpperCase() === "PUT");
  });

  if (relevantRows.length === 0) {
    alert("No ATM options data found in this file");
    return;
  }

  // Group by datetime × strike_label
  const grouped = {};

  relevantRows.forEach(row => {
    const dt = row[datetimeCol];
    const dtParts = dt.toString().split(" ");
    const date = dtParts[0];
    const time = dtParts[1] || "";
    const strikeLabel = row[strikeCol].toString().trim();

    if (!grouped[dt]) {
      grouped[dt] = {
        datetime: dt,
        date: date,
        time: time,
        spot: spotCol ? row[spotCol] : null,
        realized_move: realizedMove[dt] ? (realizedMove[dt].high - realizedMove[dt].low) : null
      };
      // Init all strike level slots
      STRIKE_LEVELS.forEach(sl => {
        grouped[dt][sl] = { call_close: null, put_close: null, call_iv: null, put_iv: null, atm_strike: null };
      });
    }

    const optionType = row[optionCol].toString().toUpperCase();
    const closePrice = closeCol ? row[closeCol] : null;
    const iv = ivCol ? row[ivCol] : null;
    const sp = strikePrice ? row[strikePrice] : null;

    if (optionType === "CALL") {
      grouped[dt][strikeLabel].call_close = closePrice;
      grouped[dt][strikeLabel].call_iv = iv;
      grouped[dt][strikeLabel].atm_strike = sp;
    }
    if (optionType === "PUT") {
      grouped[dt][strikeLabel].put_close = closePrice;
      grouped[dt][strikeLabel].put_iv = iv;
      if (!grouped[dt][strikeLabel].atm_strike) grouped[dt][strikeLabel].atm_strike = sp;
    }
  });

  const processed = Object.values(grouped)
    .filter(d => d["ATM"].call_close !== null && d["ATM"].put_close !== null)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
    .map(d => {
      const result = {
        datetime: d.datetime,
        date: d.date,
        time: d.time,
        atm_strike: d["ATM"].atm_strike,
        spot: d.spot,
        realized_move: d.realized_move,
        // ATM
        call_close: d["ATM"].call_close,
        put_close: d["ATM"].put_close,
        call_iv: d["ATM"].call_iv,
        put_iv: d["ATM"].put_iv,
        straddle_price: Number(d["ATM"].call_close) + Number(d["ATM"].put_close),
        avg_iv: (Number(d["ATM"].call_iv) + Number(d["ATM"].put_iv)) / 2
      };
      // Offset straddles
      ["ATM-2", "ATM-1", "ATM+1", "ATM+2"].forEach(sl => {
        const s = d[sl];
        if (s && s.call_close !== null && s.put_close !== null) {
          result[`straddle_${sl}`] = Number(s.call_close) + Number(s.put_close);
        } else {
          result[`straddle_${sl}`] = null;
        }
      });
      
      // Combination: ATM + (ATM-1) + (ATM+1)
      if (result.straddle_price !== null && result.straddle_ATM-1 !== null && result[`straddle_ATM+1`] !== null) {
        result.combination_price = result.straddle_price + result[`straddle_ATM-1`] + result[`straddle_ATM+1`];
      } else {
        result.combination_price = null;
      }
      
      return result;
    });

  if (processed.length === 0) {
    alert("No valid ATM straddle data found (missing CALL or PUT pairs)");
    return;
  }

  // Update title with date and file info
  updateHeader(dateStr, fileName, processed);
  renderChart(processed);
  renderTable(processed);
}

function updateHeader(date, fileName, data) {
  const header = document.querySelector("h1");
  const para = document.querySelector("p");
  
  if (header) {
    header.textContent = `ATM Straddle with Time and IV - ${date}`;
  }
  
  if (para) {
    const records = data.length;
    para.textContent = `File: ${fileName} | Records: ${records} | Dates: ${data[0].date} to ${data[data.length - 1].date}`;
  }
}

// Color palette for offset straddles
const OFFSET_COLORS = {
  "ATM-2": { border: "#a78bfa", bg: "rgba(167,139,250,0.10)" },  // violet
  "ATM-1": { border: "#fb923c", bg: "rgba(251,146,60,0.10)" },   // orange
  "ATM+1": { border: "#34d399", bg: "rgba(52,211,153,0.10)" },   // emerald
  "ATM+2": { border: "#f472b6", bg: "rgba(244,114,182,0.10)" }   // pink
};

function renderChart(data) {
  const labels = data.map(d => d.datetime);
  const straddleData = data.map(d => d.straddle_price);
  const combinationData = data.map(d => d.combination_price);
  const avgIvData = data.map(d => d.avg_iv);
  const callIvData = data.map(d => d.call_iv);
  const putIvData = data.map(d => d.put_iv);

  // Build offset straddle datasets
  const offsetDatasets = ["ATM-2", "ATM-1", "ATM+1", "ATM+2"].map(sl => {
    const c = OFFSET_COLORS[sl];
    return {
      label: `${sl} Straddle`,
      data: data.map(d => d[`straddle_${sl}`]),
      yAxisID: "y",
      borderColor: c.border,
      backgroundColor: c.bg,
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.15,
      hidden: true,
      borderDash: sl.startsWith("ATM-") ? [4, 3] : []
    };
  });

  const ctx = document.getElementById("atmChart").getContext("2d");

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "ATM Straddle",
          data: straddleData,
          yAxisID: "y",
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56, 189, 248, 0.15)",
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.15
        },
        {
          label: "ATM + (ATM-1) + (ATM+1) Combination",
          data: combinationData,
          yAxisID: "y",
          borderColor: "#ec4899",
          backgroundColor: "rgba(236, 72, 153, 0.15)",
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.15,
          borderDash: [5, 5]
        },
        ...offsetDatasets,
        {
          label: "Average IV",
          data: avgIvData,
          yAxisID: "y1",
          borderColor: "#f97316",
          backgroundColor: "rgba(249, 115, 22, 0.12)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.15
        },
        {
          label: "Call IV",
          data: callIvData,
          yAxisID: "y1",
          borderColor: "#22c55e",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.15,
          hidden: true
        },
        {
          label: "Put IV",
          data: putIvData,
          yAxisID: "y1",
          borderColor: "#ef4444",
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.15,
          hidden: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb"
          }
        },
        tooltip: {
          callbacks: {
            afterBody: function (items) {
              const i = items[0].dataIndex;
              const d = data[i];
              return [
                `Date: ${d.date}`,
                `Time: ${d.time}`,
                `ATM Strike: ${d.atm_strike}`,
                `Spot: ${Number(d.spot).toFixed(2)}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
            maxTicksLimit: 12
          },
          grid: {
            color: "rgba(148,163,184,0.08)"
          }
        },
        y: {
          position: "left",
          title: {
            display: true,
            text: "Straddle Price",
            color: "#e5e7eb"
          },
          ticks: {
            color: "#93c5fd"
          },
          grid: {
            color: "rgba(148,163,184,0.10)"
          }
        },
        y1: {
          position: "right",
          title: {
            display: true,
            text: "IV",
            color: "#e5e7eb"
          },
          ticks: {
            color: "#fdba74"
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
  
  // Display realized move above chart
  displayRealizedMove(data);
}

function renderTable(data) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  const fmtN = (v) => (v !== null && v !== undefined && !isNaN(Number(v))) ? Number(v).toFixed(2) : 'N/A';

  data.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.date}</td>
      <td>${d.time}</td>
      <td>${d.atm_strike}</td>
      <td>${fmtN(d.spot)}</td>
      <td>${fmtN(d.call_close)}</td>
      <td>${fmtN(d.put_close)}</td>
      <td>${fmtN(d.straddle_price)}</td>
      <td>${fmtN(d['straddle_ATM-2'])}</td>
      <td>${fmtN(d['straddle_ATM-1'])}</td>
      <td>${fmtN(d['straddle_ATM+1'])}</td>
      <td>${fmtN(d['straddle_ATM+2'])}</td>
      <td>${fmtN(d.combination_price)}</td>
      <td>${d.realized_move ? fmtN(d.realized_move) : 'N/A'}</td>
      <td>${fmtN(d.call_iv)}</td>
      <td>${fmtN(d.put_iv)}</td>
      <td>${fmtN(d.avg_iv)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function displayRealizedMove(data) {
  // Find day's highest and lowest spot prices
  const spotPrices = data
    .map(d => Number(d.spot))
    .filter(p => !isNaN(p) && p > 0);
  
  if (spotPrices.length === 0) return;
  
  const dayHigh = Math.max(...spotPrices);
  const dayLow = Math.min(...spotPrices);
  const realizedMove = dayHigh - dayLow;
  
  // Display above chart
  let infoDiv = document.getElementById('realized-move-info');
  if (!infoDiv) {
    infoDiv = document.createElement('div');
    infoDiv.id = 'realized-move-info';
    infoDiv.style.cssText = `
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 12px;
      color: #e2e8f0;
      font-size: 14px;
    `;
    const chartCard = document.querySelector('.chart-wrap').closest('.card');
    chartCard.insertBefore(infoDiv, chartCard.firstChild);
  }
  
  infoDiv.innerHTML = `
    <strong>Realized Move:</strong> Spot Day High: <span style="color: #22c55e">${dayHigh.toFixed(2)}</span> - Spot Day Low: <span style="color: #ef4444">${dayLow.toFixed(2)}</span> = <span style="color: #f97316; font-weight: bold">${realizedMove.toFixed(2)}</span>
  `;
}
