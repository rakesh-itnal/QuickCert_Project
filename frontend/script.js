const state = {
  templateId: null,
  sourceImageUrl: null,
  imageWidth: 0,
  imageHeight: 0,
  fields: [],
  availableColumns: [],
  selectedFieldId: null,
  activeGesture: null,
};

const templateInput = document.getElementById("templateInput");
const analyzeButton = document.getElementById("analyzeButton");
const saveBlueprintButton = document.getElementById("saveBlueprintButton");
const generatePdfButton = document.getElementById("generatePdfButton");
const fieldList = document.getElementById("fieldList");
const stage = document.getElementById("stage");
const statusNode = document.getElementById("status");

function setStatus(message, tone = "") {
  statusNode.textContent = message;
  statusNode.className = `status ${tone}`.trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function findField(fieldId) {
  return state.fields.find((field) => field.id === fieldId);
}

function stageRect() {
  const image = stage.querySelector("img");
  if (!image) return null;
  return image.getBoundingClientRect();
}

function normalizedToPercent(bbox) {
  // The backend and Gemini both use a top-left-origin 0-1000 coordinate space.
  // The browser can render that cleanly as percentages regardless of image size.
  const [ymin, xmin, ymax, xmax] = bbox;
  return {
    top: `${ymin / 10}%`,
    left: `${xmin / 10}%`,
    width: `${(xmax - xmin) / 10}%`,
    height: `${(ymax - ymin) / 10}%`,
  };
}

function renderFieldList() {
  if (!state.fields.length) {
    fieldList.innerHTML = '<div class="empty-state">No fields yet. Upload a template to begin.</div>';
    return;
  }

  fieldList.innerHTML = "";
  for (const field of state.fields) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `field-pill ${field.type}`;
    item.innerHTML = `
      <strong>${field.label}</strong><br />
      <span>${field.mapping_column || field.manual_text || "Unmapped"}</span>
    `;
    item.addEventListener("click", () => {
      state.selectedFieldId = field.id;
      renderCanvas();
    });
    fieldList.appendChild(item);
  }
}

function createEditorPopover(field, rect) {
  const popover = document.createElement("div");
  popover.className = "editor-popover";

  const mappingValue = field.mapping_column || "";
  const usesOther = !mappingValue && field.manual_text;

  const options = [
    '<option value="">Select a database column</option>',
    ...state.availableColumns.map(
      (column) =>
        `<option value="${column}" ${mappingValue === column ? "selected" : ""}>${column}</option>`
    ),
    `<option value="__other__" ${usesOther ? "selected" : ""}>Other</option>`,
  ].join("");

  popover.innerHTML = `
    <h3>${field.label}</h3>
    <div class="meta">Type: ${field.type}</div>
    <label for="mappingSelect">Map to column</label>
    <select id="mappingSelect">${options}</select>
    <div id="manualTextWrap" style="display:${usesOther ? "block" : "none"}">
      <label for="manualTextInput">Manual text override</label>
      <input id="manualTextInput" type="text" value="${field.manual_text || ""}" placeholder="Enter custom text" />
    </div>
    <button type="button" class="secondary" style="margin-top: 14px; width: 100%;" id="idealBoxButton">Use This As Ideal Size</button>
  `;

  const overlayRect = stage.querySelector(".overlay").getBoundingClientRect();
  const relativeTop = rect.top - overlayRect.top;
  const relativeLeft = rect.left - overlayRect.left;

  popover.style.top = `${Math.min(relativeTop + rect.height + 12, overlayRect.height - 180)}px`;
  popover.style.left = `${Math.min(relativeLeft, overlayRect.width - 290)}px`;

  const select = popover.querySelector("#mappingSelect");
  const manualWrap = popover.querySelector("#manualTextWrap");
  const manualInput = popover.querySelector("#manualTextInput");

  select.addEventListener("change", () => {
    if (select.value === "__other__") {
      field.mapping_column = null;
      manualWrap.style.display = "block";
      field.manual_text = manualInput.value || "";
      manualInput.focus();
    } else {
      field.mapping_column = select.value || null;
      if (select.value) {
        field.manual_text = "";
      }
      manualWrap.style.display = "none";
      renderFieldList();
    }
  });

  if (manualInput) {
    manualInput.addEventListener("input", () => {
      field.mapping_column = null;
      field.manual_text = manualInput.value;
      renderFieldList();
    });
  }

  const idealBoxButton = popover.querySelector("#idealBoxButton");
  if (idealBoxButton) {
    idealBoxButton.addEventListener("click", () => {
      applyIdealBoxSize(field.id);
    });
  }

  return popover;
}

function renderCanvas() {
  if (!state.sourceImageUrl) {
    stage.innerHTML = '<div class="empty-state">The certificate canvas will appear here after Gemini returns recommendations.</div>';
    renderFieldList();
    return;
  }

  stage.innerHTML = `
    <img id="templateImage" src="${state.sourceImageUrl}" alt="Certificate template" />
    <div class="overlay"></div>
  `;

  const overlay = stage.querySelector(".overlay");

  for (const field of state.fields) {
    const box = document.createElement("div");
    box.className = `field-box ${field.type} ${state.selectedFieldId === field.id ? "active" : ""}`;
    box.dataset.fieldId = field.id;

    const style = normalizedToPercent(field.bbox);
    Object.assign(box.style, style);

    box.innerHTML = `
      <span class="field-label">${field.label}</span>
      <span class="resize-handle" data-action="resize"></span>
    `;

    box.addEventListener("pointerdown", (event) => {
      const target = event.target;
      const action = target.dataset.action === "resize" ? "resize" : "drag";
      const imageRect = stageRect();
      if (!imageRect) return;

      // We store the starting bbox in normalized units so drag and resize stay
      // resolution-independent and remain safe after responsive layout changes.
      state.selectedFieldId = field.id;
      state.activeGesture = {
        action,
        fieldId: field.id,
        startX: event.clientX,
        startY: event.clientY,
        startBox: [...field.bbox],
        stageWidth: imageRect.width,
        stageHeight: imageRect.height,
      };
      box.setPointerCapture(event.pointerId);
      renderCanvas();
    });

    box.addEventListener("click", (event) => {
      event.stopPropagation();
      state.selectedFieldId = field.id;
      renderCanvas();
    });

    overlay.appendChild(box);
  }

  if (state.selectedFieldId) {
    const selected = findField(state.selectedFieldId);
    const selectedBox = overlay.querySelector(`[data-field-id="${state.selectedFieldId}"]`);
    if (selected && selectedBox) {
      overlay.appendChild(createEditorPopover(selected, selectedBox.getBoundingClientRect()));
    }
  }

  renderFieldList();
}

function applyIdealBoxSize(sourceFieldId) {
  const sourceField = findField(sourceFieldId);
  if (!sourceField) return;

  const [sourceYMin, sourceXMin, sourceYMax, sourceXMax] = sourceField.bbox;
  const idealHeight = sourceYMax - sourceYMin;
  const idealWidth = sourceXMax - sourceXMin;

  state.fields = state.fields.map((field) => {
    if (field.id === sourceFieldId) {
      return field;
    }

    const [ymin, xmin] = field.bbox;
    const ymax = clamp(ymin + idealHeight, ymin + 8, 1000);
    const xmax = clamp(xmin + idealWidth, xmin + 8, 1000);

    return {
      ...field,
      bbox: [ymin, xmin, Math.round(ymax), Math.round(xmax)],
    };
  });

  setStatus("Applied the selected dimensions to all other fields.", "success");
  renderCanvas();
}

function updateFieldFromGesture(event) {
  const gesture = state.activeGesture;
  if (!gesture) return;

  const field = findField(gesture.fieldId);
  if (!field) return;

  const deltaX = ((event.clientX - gesture.startX) / gesture.stageWidth) * 1000;
  const deltaY = ((event.clientY - gesture.startY) / gesture.stageHeight) * 1000;
  const [ymin, xmin, ymax, xmax] = gesture.startBox;

  if (gesture.action === "drag") {
    const height = ymax - ymin;
    const width = xmax - xmin;
    let nextYMin = clamp(ymin + deltaY, 0, 1000 - height);
    let nextXMin = clamp(xmin + deltaX, 0, 1000 - width);
    field.bbox = [
      Math.round(nextYMin),
      Math.round(nextXMin),
      Math.round(nextYMin + height),
      Math.round(nextXMin + width),
    ];
  } else {
    // Resize only changes the bottom-right corner; the top-left corner remains
    // pinned so users can fine-tune the writable area predictably.
    const nextYMax = clamp(ymax + deltaY, ymin + 8, 1000);
    const nextXMax = clamp(xmax + deltaX, xmin + 8, 1000);
    field.bbox = [ymin, xmin, Math.round(nextYMax), Math.round(nextXMax)];
  }

  renderCanvas();
}

window.addEventListener("pointermove", (event) => {
  if (!state.activeGesture) return;
  updateFieldFromGesture(event);
});

window.addEventListener("pointerup", () => {
  state.activeGesture = null;
});

window.addEventListener("click", (event) => {
  if (!event.target.closest(".field-box") && !event.target.closest(".editor-popover")) {
    state.selectedFieldId = null;
    renderCanvas();
  }
});

function currentBlueprintPayload() {
  return {
    template_id: state.templateId,
    source_image_url: state.sourceImageUrl,
    image_width: state.imageWidth,
    image_height: state.imageHeight,
    fields: state.fields,
  };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.message || "Request failed.");
  }

  return data;
}

analyzeButton.addEventListener("click", async () => {
  const file = templateInput.files[0];
  if (!file) {
    setStatus("Choose a blank certificate image before requesting VLM recommendations.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  analyzeButton.disabled = true;
  setStatus("Uploading template and asking Gemini for candidate fields...");

  try {
    const response = await fetch("/api/recommend-fields", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Failed to recommend fields.");
    }

    state.templateId = data.template_id;
    state.sourceImageUrl = data.source_image_url;
    state.imageWidth = data.image_width;
    state.imageHeight = data.image_height;
    state.fields = data.fields;
    state.availableColumns = data.available_columns || [];
    state.selectedFieldId = null;

    saveBlueprintButton.disabled = false;
    generatePdfButton.disabled = false;
    renderCanvas();
    setStatus(`Gemini returned ${state.fields.length} editable field recommendations.`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    analyzeButton.disabled = false;
  }
});

saveBlueprintButton.addEventListener("click", async () => {
  if (!state.templateId) return;

  saveBlueprintButton.disabled = true;
  setStatus("Saving approved blueprint to the backend cache...");

  try {
    const result = await postJson("/api/blueprints", currentBlueprintPayload());
    setStatus(`${result.message} Blueprint ID: ${result.blueprint_id}`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    saveBlueprintButton.disabled = false;
  }
});

generatePdfButton.addEventListener("click", async () => {
  if (!state.templateId) return;

  generatePdfButton.disabled = true;
  setStatus("Generating transparent A4 overlay PDF with dummy record data...");

  try {
    const result = await postJson("/api/generate-overlay", {
      blueprint: currentBlueprintPayload(),
      record_index: 0,
      debug_guides: false,
    });

    setStatus("Transparent overlay PDF generated successfully.", "success");
    statusNode.innerHTML = `
      Transparent overlay PDF generated successfully.
      <a class="download-link" href="${result.download_url}" target="_blank" rel="noreferrer">Open PDF</a>
    `;
    statusNode.className = "status success";
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    generatePdfButton.disabled = false;
  }
});

renderCanvas();
