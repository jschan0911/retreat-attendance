(function () {
  const scriptUrl = window.APP_CONFIG && window.APP_CONFIG.SCRIPT_URL;
  const keyForm = document.querySelector("#adminKeyForm");
  const keyInput = document.querySelector("#adminKey");
  const message = document.querySelector("#adminMessage");
  const rowsEl = document.querySelector("#responseRows");
  const rowTemplate = document.querySelector("#rowTemplate");
  const searchInput = document.querySelector("#searchInput");
  const refreshButton = document.querySelector("#refreshButton");
  let rows = [];

  const setMessage = (text, type) => {
    message.textContent = text;
    message.className = "form-message";
    if (type) message.classList.add(`is-${type}`);
  };

  const getAdminKey = () => keyInput.value.trim() || sessionStorage.getItem("retreatAdminKey") || "";

  const requestJsonp = (payload) => {
    if (!scriptUrl) return Promise.reject(new Error("Apps Script URL이 설정되지 않았습니다."));

    return new Promise((resolve, reject) => {
      const callbackName = `retreatAdminCallback_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const script = document.createElement("script");
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error("요청 시간이 초과되었습니다."));
      }, 15000);

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        delete window[callbackName];
        script.remove();
      };

      window[callbackName] = (data) => {
        cleanup();
        if (data && data.ok) resolve(data);
        else reject(new Error((data && data.message) || "요청에 실패했습니다."));
      };

      const url = new URL(scriptUrl);
      url.searchParams.set("callback", callbackName);
      url.searchParams.set("payload", JSON.stringify({ ...payload, adminKey: getAdminKey() }));
      script.onerror = () => {
        cleanup();
        reject(new Error("Apps Script에 연결할 수 없습니다."));
      };
      script.src = url.toString();
      document.body.appendChild(script);
    });
  };

  const loadRows = async () => {
    setMessage("목록을 불러오는 중입니다...", "");
    const data = await requestJsonp({ action: "list" });
    rows = data.rows || [];
    sessionStorage.setItem("retreatAdminKey", getAdminKey());
    renderRows();
    setMessage(`${rows.length}명을 불러왔습니다.`, "success");
  };

  const rowMatchesSearch = (row) => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return true;
    return [row.name, row.church, row.gender, row.attendance, row.joinLabel, row.note, row.status]
      .join(" ")
      .toLowerCase()
      .includes(query);
  };

  const renderRows = () => {
    const visibleRows = rows.filter(rowMatchesSearch);
    rowsEl.textContent = "";

    if (!visibleRows.length) {
      const row = document.createElement("tr");
      row.innerHTML = '<td colspan="8" class="empty-cell">표시할 응답이 없습니다.</td>';
      rowsEl.appendChild(row);
      return;
    }

    visibleRows.forEach((data) => {
      const row = rowTemplate.content.firstElementChild.cloneNode(true);
      row.dataset.id = data.id;
      setRowValues(row, data);
      rowsEl.appendChild(row);
    });
  };

  const setRowValues = (row, data) => {
    row.querySelector('[name="name"]').value = data.name || "";
    row.querySelector('[name="church"]').value = data.church || "은정교회";
    row.querySelector('[name="gender"]').value = data.gender || "남";
    row.querySelector('[name="birthYear"]').value = data.birthYear || "";
    row.querySelector('[name="birthYear"]').max = String(new Date().getFullYear());
    row.querySelector('[name="attendance"]').value = data.attendance || "미정";
    row.querySelector('[name="joinDate"]').value = data.joinDate || "";
    row.querySelector('[name="joinPeriod"]').value = data.joinPeriod || "";
    row.querySelector('[name="joinNote"]').value = data.joinNote || "";
    row.querySelector('[name="note"]').value = data.note || "";
    row.querySelector('[name="status"]').value = data.status || "접수";
    row.querySelector('[data-field="submittedAt"]').textContent = data.submittedAt ? `제출 ${data.submittedAt}` : "";
    syncJoinRequired(row);
  };

  const syncJoinRequired = (row) => {
    const attendance = row.querySelector('[name="attendance"]').value;
    const needsJoinInfo = ["부분참", "미정"].includes(attendance);
    row.querySelector('[name="joinDate"]').required = needsJoinInfo;
    row.querySelector('[name="joinPeriod"]').required = needsJoinInfo;
  };

  const collectRowPayload = (row) => ({
    action: "update",
    id: row.dataset.id,
    church: row.querySelector('[name="church"]').value,
    name: row.querySelector('[name="name"]').value,
    gender: row.querySelector('[name="gender"]').value,
    birthYear: row.querySelector('[name="birthYear"]').value,
    attendance: row.querySelector('[name="attendance"]').value,
    joinDate: row.querySelector('[name="joinDate"]').value,
    joinPeriod: row.querySelector('[name="joinPeriod"]').value,
    joinNote: row.querySelector('[name="joinNote"]').value,
    note: row.querySelector('[name="note"]').value,
    status: row.querySelector('[name="status"]').value,
  });

  const validateRow = (row) => {
    for (const field of row.querySelectorAll("input, select, textarea")) {
      if (!field.reportValidity()) return false;
    }
    return true;
  };

  rowsEl.addEventListener("change", (event) => {
    const row = event.target.closest("tr");
    if (row && event.target.name === "attendance") syncJoinRequired(row);
  });

  rowsEl.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const row = button.closest("tr");
    const action = button.dataset.action;

    try {
      button.disabled = true;

      if (action === "save") {
        if (!validateRow(row)) return;
        const data = await requestJsonp(collectRowPayload(row));
        rows = data.rows || [];
        renderRows();
        setMessage("수정했습니다.", "success");
      }

      if (action === "delete") {
        const name = row.querySelector('[name="name"]').value;
        if (!window.confirm(`${name || "이 응답"}을 삭제할까요?`)) return;
        const data = await requestJsonp({ action: "delete", id: row.dataset.id });
        rows = data.rows || [];
        renderRows();
        setMessage("삭제했습니다.", "success");
      }
    } catch (error) {
      setMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  keyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await loadRows();
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  refreshButton.addEventListener("click", async () => {
    try {
      await loadRows();
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  searchInput.addEventListener("input", renderRows);

  const savedKey = sessionStorage.getItem("retreatAdminKey");
  if (savedKey) keyInput.value = savedKey;
})();
