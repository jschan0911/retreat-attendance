(function () {
  const form = document.querySelector("#surveyForm");
  const joinSection = document.querySelector("#joinSection");
  const message = document.querySelector("#formMessage");
  const submitButton = form.querySelector("button[type='submit']");
  const birthYearInput = form.elements.birthYear;
  const scriptUrl = window.APP_CONFIG && window.APP_CONFIG.SCRIPT_URL;

  const setMessage = (text, type) => {
    message.textContent = text;
    message.className = "form-message";
    if (type) message.classList.add(`is-${type}`);
  };

  const getAttendance = () => {
    const checked = form.querySelector("input[name='attendance']:checked");
    return checked ? checked.value : "";
  };

  const updateJoinSection = () => {
    const needsJoinInfo = ["부분참", "미정"].includes(getAttendance());
    joinSection.hidden = !needsJoinInfo;
    form.elements.joinDate.required = needsJoinInfo;
    form.elements.joinPeriod.required = needsJoinInfo;
    syncLeavePair();
  };

  const buildJoinLabel = (data) => {
    const pieces = [data.joinDate, data.joinPeriod, data.joinNote].filter(Boolean);
    return pieces.join(" / ");
  };

  const buildLeaveLabel = (data) => {
    const pieces = [data.leaveDate, data.leavePeriod, data.leaveNote].filter(Boolean);
    return pieces.join(" / ");
  };

  const syncLeavePair = () => {
    const needsLeavePair = !joinSection.hidden && Boolean(form.elements.leaveDate.value || form.elements.leavePeriod.value);
    form.elements.leaveDate.required = needsLeavePair;
    form.elements.leavePeriod.required = needsLeavePair;
  };

  const collectPayload = () => {
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.action = "create";
    payload.submittedAt = new Date().toISOString();
    if (!["부분참", "미정"].includes(payload.attendance)) {
      payload.joinDate = "";
      payload.joinPeriod = "";
      payload.joinNote = "";
      payload.leaveDate = "";
      payload.leavePeriod = "";
      payload.leaveNote = "";
    }
    payload.joinLabel = buildJoinLabel(payload);
    payload.leaveLabel = buildLeaveLabel(payload);
    return payload;
  };

  const saveDraft = (payload) => {
    const drafts = JSON.parse(localStorage.getItem("retreatSurveyDrafts") || "[]");
    drafts.push({ ...payload, savedAt: new Date().toISOString() });
    localStorage.setItem("retreatSurveyDrafts", JSON.stringify(drafts.slice(-20)));
  };

  form.addEventListener("change", updateJoinSection);
  birthYearInput.max = String(new Date().getFullYear());
  updateJoinSection();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    updateJoinSection();

    if (!form.reportValidity()) {
      setMessage("필수 항목을 확인해주세요.", "error");
      return;
    }

    const payload = collectPayload();

    if (!scriptUrl) {
      saveDraft(payload);
      setMessage("아직 Apps Script URL이 없어 브라우저에 임시 저장했습니다.", "error");
      return;
    }

    submitButton.disabled = true;
    setMessage("제출 중입니다...", "");

    try {
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      form.reset();
      updateJoinSection();
      setMessage("제출했습니다. 시트에 반영되기까지 잠시 걸릴 수 있습니다.", "success");
    } catch (error) {
      saveDraft(payload);
      setMessage("전송이 불안정해 브라우저에 임시 저장했습니다.", "error");
    } finally {
      submitButton.disabled = false;
    }
  });
})();
