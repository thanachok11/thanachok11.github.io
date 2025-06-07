let lineChartInstance = null;
let pieChartInstance = null;

async function loadRiceData() {
    const response = await fetch('rice_data.csv');
    const text = await response.text();
    const rows = text.trim().split('\n');

    console.log("Raw CSV rows:", rows); // ✅ แสดงข้อมูลดิบทั้งหมด

    // อ่านหัวตารางและข้อมูล
    const header = rows[0].split(',').map(h => h.trim());
    const dataRows = rows.slice(1);

    const data = dataRows.map((row, index) => {
        const cols = row.split(',');

        // ถ้า column ราคาอาจมีคอมม่า เช่น "6,615" ให้รวมคอลัมน์ที่เหลือ
        const yearRaw = cols[0];
        const monthRaw = cols[1];
        const product = cols[2];
        const priceRaw = cols.slice(3).join(',').replace(/"/g, ''); // กรณีมีเครื่องหมายคำพูด

        const year = +yearRaw.trim();
        const month = +monthRaw.trim();
        const price = parseFloat(priceRaw.replace(/,/g, ''));

        const entry = {
            year,
            month,
            product: product.trim(),
            price
        };

        console.log(`Row ${index + 1}:`, entry); // ✅ แสดงผลลัพธ์ที่ parse แล้ว

        return entry;
    }).filter(d => !isNaN(d.price));

    console.log("✅ Loaded rice data:", data); // ✅ ข้อมูลที่ผ่านการกรองแล้ว
    return data;
}


function getUniqueYears(data) {
    return [...new Set(data.map(d => d.year))].sort();
}

function filterDataByYear(data, year) {
    return data.filter(d => d.year === year);
}

function renderLineChart(data, year) {
    const canvas = document.getElementById("lineChart");
    console.log("data for chart", data);

    // 🔁 ล้าง Canvas โดยการแทนที่ node เดิม
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);

    const monthlyPrices = new Array(12).fill(null);
    data.forEach(d => {
        monthlyPrices[d.month - 1] = d.price;
    });

    const minPrice = Math.min(...monthlyPrices.filter(p => p !== null));
    const maxPrice = Math.max(...monthlyPrices.filter(p => p !== null));
    const minMonth = monthlyPrices.indexOf(minPrice) + 1;
    const maxMonth = monthlyPrices.indexOf(maxPrice) + 1;

    document.getElementById("minMaxText").textContent =
        `ราคาต่ำสุด: เดือน ${minMonth} (${minPrice.toLocaleString()} บาท), สูงสุด: เดือน ${maxMonth} (${maxPrice.toLocaleString()} บาท)`;

    const ctx = newCanvas.getContext('2d');

    lineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [...Array(12)].map((_, i) => `เดือน ${i + 1}`),
            datasets: [{
                label: `ราคาข้าวเฉลี่ย (บาท/ตัน.) ปี ${year}`,
                data: monthlyPrices,
                borderColor: '#2980b9',
                backgroundColor: 'rgba(41, 128, 185, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `แนวโน้มราคาข้าวรายเดือน ปี ${year}`
                }
            }
        }
    });
}

function renderHighchartsPieChart(data, year) {
    const quarters = { Q1: [], Q2: [], Q3: [], Q4: [] };

    data.forEach(d => {
        if ([1, 2, 3].includes(d.month)) quarters.Q1.push(d.price);
        else if ([4, 5, 6].includes(d.month)) quarters.Q2.push(d.price);
        else if ([7, 8, 9].includes(d.month)) quarters.Q3.push(d.price);
        else if ([10, 11, 12].includes(d.month)) quarters.Q4.push(d.price);
    });

    const quarterLabels = ['Q1', 'Q2', 'Q3', 'Q4'];
    const seriesData = quarterLabels.map(label => {
        const values = quarters[label];
        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        return {
            name: label,
            y: parseFloat(avg.toFixed(2))
        };
    });

    Highcharts.chart('pieChart3D', {
        chart: {
            type: 'pie',
            options3d: { enabled: true, alpha: 45, beta: 0 },
            backgroundColor: null
        },
        title: {
            text: `ราคาข้าวเฉลี่ยรายไตรมาส ปี ${year}`
        },
        tooltip: {
            pointFormat: '<b>{point.y:.2f} บาท</b> ({point.percentage:.1f}%)'
        },
        plotOptions: {
            pie: {
                depth: 45,
                dataLabels: {
                    enabled: true,
                    format: '{point.name}: {point.percentage:.1f} %',
                    style: { color: '#000', fontWeight: 'bold' }
                }
            }
        },
        series: [{
            name: "ราคาเฉลี่ย",
            data: seriesData
        }]
    });
}

(async () => {
    const data = await loadRiceData();
    const years = getUniqueYears(data);

    function updateChart() {
        const selectedYear = +yearSelect.value;
        const filtered = filterDataByYear(data, selectedYear);
        renderHighchartsPieChart(filtered, selectedYear);
    }

    yearSelect.addEventListener("change", updateChart);

    // default
    yearSelect.value = years[0];
    updateChart();
})();

async function init() {
    const data = await loadRiceData();
    const years = getUniqueYears(data);
    const yearSelect = document.getElementById('yearSelect');

    years.forEach(y => {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    });

    function updateCharts(year) {
        const filtered = filterDataByYear(data, +year);
        renderLineChart(filtered, +year);
        renderHighchartsPieChart(filtered, +year);
    }

    updateCharts(years[years.length - 1]);

    yearSelect.addEventListener('change', e => {
        updateCharts(e.target.value);
    });
}

init();
