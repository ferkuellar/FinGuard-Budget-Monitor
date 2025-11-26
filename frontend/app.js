// URL base de tu API Gateway (stage $default)
const API_BASE_URL = "https://a4opn7hce8.execute-api.us-east-1.amazonaws.com";
const TENANT_ID = "empresa-demo";

// Configuración de paginación
const PAGE_SIZE = 10;
let previewRows = [];
let currentPage = 1;
let previewDiv = null;

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const statusDiv = document.getElementById("status");
  previewDiv = document.getElementById("preview");

  function setStatus(message, type = "info") {
    statusDiv.textContent = message;
    statusDiv.classList.remove("status--ok", "status--error");

    if (type === "ok") statusDiv.classList.add("status--ok");
    if (type === "error") statusDiv.classList.add("status--error");
  }

  // Parse simple de CSV -> [{ date, category, amount }, ...]
  function parseCsv(text) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const header = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase());

    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length < 3) continue;

      const row = {};
      for (let j = 0; j < header.length && j < parts.length; j++) {
        row[header[j]] = parts[j];
      }

      const date = row.date;
      const category = row.category || "Sin categoría";

      // Normalizamos amount: permitimos 1.234,56 o 1234.56
      let amountRaw = (row.amount || "0").replace(/\s/g, "");
      amountRaw = amountRaw.replace(",", ".");
      const amount = parseFloat(amountRaw);

      if (!date || isNaN(amount)) continue;

      rows.push({ date, category, amount });
    }

    return rows;
  }

  // Render del preview con paginación
  function renderPreview() {
    const total = previewRows.length;

    if (!total) {
      previewDiv.textContent = "Aún no se ha cargado ningún archivo.";
      return;
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, total);

    let html = "<h3>Filas detectadas</h3><ul>";

    for (let i = start; i < end; i++) {
      const r = previewRows[i];
      html += `<li>
        <span>${r.date}</span>
        <span class="category">${r.category}</span>
        <span class="amount">${r.amount.toFixed(2)}</span>
      </li>`;
    }

    html += "</ul>";
    html += `<div class="meta">
      Filas válidas: <strong>${total}</strong> — mostrando ${start + 1}-${end}
      (página ${currentPage}/${totalPages})
    </div>`;

    // Controles de paginación
    html += `
      <div class="pager">
        <button type="button"
                class="btn-secondary"
                onclick="changePage(-1)"
                ${currentPage === 1 ? "disabled" : ""}>
          ⟵ Anterior
        </button>
        <button type="button"
                class="btn-secondary"
                onclick="changePage(1)"
                ${currentPage === totalPages ? "disabled" : ""}>
          Siguiente ⟶
        </button>
      </div>
    `;

    previewDiv.innerHTML = html;
  }

  // Hacemos la función de cambio de página accesible desde el HTML
  window.changePage = function (delta) {
    if (!previewRows.length) return;
    const totalPages = Math.ceil(previewRows.length / PAGE_SIZE);
    currentPage = Math.min(Math.max(1, currentPage + delta), totalPages || 1);
    renderPreview();
  };

  uploadBtn.addEventListener("click", () => {
    const file = fileInput.files[0];

    if (!file) {
      alert("Selecciona un archivo CSV primero.");
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const csvText = e.target.result;
        const rows = parseCsv(csvText);

        if (!rows.length) {
          setStatus(
            "El CSV no contiene filas válidas (revisa formato).",
            "error"
          );
          previewRows = [];
          renderPreview();
          return;
        }

        // Guardamos filas para paginación
        previewRows = rows;
        currentPage = 1;
        renderPreview();

        const payload = {
          tenantId: TENANT_ID,
          rows: rows,
        };

        setStatus("Enviando datos a AWS…");
        uploadBtn.disabled = true;

        const response = await fetch(`${API_BASE_URL}/ingest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const text = await response.text();
          console.error("Respuesta no OK:", response.status, text);
          setStatus(
            `Error al enviar datos (HTTP ${response.status}). Revisa CloudWatch Logs.`,
            "error"
          );
          uploadBtn.disabled = false;
          return;
        }

        const data = await response.json();
        console.log("Respuesta API:", data);
        setStatus(
          data.message || "Datos ingresados correctamente en DynamoDB.",
          "ok"
        );
        uploadBtn.disabled = false;
      } catch (err) {
        console.error("Error general:", err);
        setStatus("Ocurrió un error al procesar o enviar el archivo.", "error");
        uploadBtn.disabled = false;
      }
    };

    reader.onerror = () => {
      setStatus("No se pudo leer el archivo CSV.", "error");
    };

    reader.readAsText(file);
  });
});
