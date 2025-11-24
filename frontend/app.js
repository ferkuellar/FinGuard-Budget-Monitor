// Formato esperado del CSV:
// date,category,amount
// 2025-01-01,Marketing,1200
// 2025-01-03,Operación,500

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('csvFile');
  if (!fileInput.files.length) {
    alert('Selecciona un archivo CSV');
    return;
  }

  const file = fileInput.files[0];
  const text = await file.text();

  const rows = parseCsv(text);
  const summary = calculateSummary(rows);
  renderSummary(summary);
  renderByCategory(summary.byCategory);
});

function parseCsv(text) {
  const lines = text.trim().split('\n');
  const [headerLine, ...dataLines] = lines;
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());

  return dataLines.map(line => {
    const cols = line.split(',');
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ? cols[idx].trim() : '';
    });
    row.amount = parseFloat(row.amount || '0');
    return row;
  });
}

function calculateSummary(rows) {
  let total = 0;
  const byCategory = {};

  for (const row of rows) {
    if (isNaN(row.amount)) continue;
    total += row.amount;
    const cat = row.category || 'Sin categoría';
    byCategory[cat] = (byCategory[cat] || 0) + row.amount;
  }

  return { total, byCategory };
}

function renderSummary(summary) {
  const div = document.getElementById('summary');
  div.innerHTML = `
    <p><strong>Gasto total:</strong> $${summary.total.toFixed(2)}</p>
  `;
}

function renderByCategory(byCategory) {
  const tbody = document.querySelector('#categoryTable tbody');
  tbody.innerHTML = '';

  Object.entries(byCategory).forEach(([cat, amount]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cat}</td>
      <td>$${amount.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });
}
