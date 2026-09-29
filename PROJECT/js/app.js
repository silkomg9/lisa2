/* 빌드 도구 없이 실행되는 공통 동작입니다.
 * 데이터: localStorage / 작성 중 메모: sessionStorage
 * 페이지별 동작은 home, detail, newCustomer, review 함수에 있습니다.
 */
(() => {
  "use strict";
  const DATA_KEY = "customer-note-data-v1";
  const RECENT_KEY = "customer-note-recent-v1";
  const DRAFT_KEY = "customer-note-draft-v1";
  const $ = (selector) => document.querySelector(selector);
  const escape = (value = "") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const digits = value => value.replace(/\D/g, "");
  const date = value => value ? new Date(value).toLocaleDateString("ko-KR", {year:"numeric",month:"2-digit",day:"2-digit"}) : "방문 기록 없음";
  const id = () => "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const detailUrl = customer => "detail.html?id=" + encodeURIComponent(customer.id);
  const visibility = value => value === "admin" ? "관리자만" : "직원 공개";
  const avatar = (customer, tone = 0) => `<span class="avatar tone-${tone % 4}" aria-hidden="true">${escape(customer.name.slice(0, 1))}</span>`;
  let storageWarning = false;
  function warnStorage() {
    if (storageWarning) return;
    storageWarning = true;
    const warning = document.createElement("p");
    warning.className = "storage-warning";
    warning.setAttribute("role", "alert");
    warning.textContent = "브라우저 저장소를 사용할 수 없거나 저장 데이터가 손상되었습니다. 저장을 허용한 브라우저에서 다시 열어주세요.";
    $("main").prepend(warning);
  }
  function read(key, fallback, storageName = "localStorage") {
    try { const raw = globalThis[storageName].getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch { warnStorage(); return fallback; }
  }
  function write(key, value, storageName = "localStorage") {
    try { globalThis[storageName].setItem(key, JSON.stringify(value)); return true; }
    catch { warnStorage(); return false; }
  }
  const titles = {home:"고객 검색",detail:"고객 상세",new:"신규 고객 등록",review:"메모 정리 확인"};
  const page = document.body.dataset.page;
  $("#shell").innerHTML = `<aside class="sidebar"><a class="brand" href="index.html"><span class="brand-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4h11a2 2 0 0 1 2 2v14H7a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.6"/><path d="M8 4v16M11 9h5M11 13h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>고객노트</a><p class="brand-sub">기억을 잇는 작은 기록</p><nav aria-label="주요 메뉴"><p class="nav-caption">고객 관리</p><a class="nav-link ${page !== "new" ? "active" : ""}" href="index.html" ${page === "home" ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">⌕</span>고객 검색</a><a class="nav-link ${page === "new" ? "active" : ""}" href="new-customer.html" ${page === "new" ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">＋</span>신규 고객 등록</a></nav><div class="sidebar-note"><strong>우리 매장의 작은 기억장</strong>고객과 나눈 이야기를<br>다음 응대로 이어가세요.</div></aside><div class="topbar"><span>고객 관리 <span aria-hidden="true"> / </span> <strong>${titles[page]}</strong></span><span class="demo-badge">Mock Data · 체험 버전</span></div>`;
  let customers;
  try {
    customers = read(DATA_KEY, null);
    if (!customers) customers = JSON.parse(JSON.stringify(window.MOCK_CUSTOMERS));
    if (!Array.isArray(customers) || customers.some(c => !c.id || typeof c.name !== "string" || typeof c.phone !== "string" || !Array.isArray(c.history) || !Array.isArray(c.preferences) || !Array.isArray(c.interests))) throw new Error("Invalid data");
  } catch { warnStorage(); customers = JSON.parse(JSON.stringify(window.MOCK_CUSTOMERS)); }
  function saveCustomers(next) { if (!write(DATA_KEY, next)) return false; customers = next; return true; }
  function findCustomer() { return customers.find(c => c.id === new URLSearchParams(location.search).get("id")); }
  function missing(message = "고객을 찾을 수 없어요") { $("main").innerHTML = `<div class="panel empty"><h1>${message}</h1><p>고객 검색 화면에서 다시 시작해 주세요.</p><a href="index.html" class="button primary">고객 검색으로</a></div>`; }
  function getRecent() { const result = read(RECENT_KEY, []); return Array.isArray(result) ? result : []; }
  function home() {
    const form = $("#search-form");
    function search() {
      const name = $("#search-name").value.trim().toLowerCase();
      const rawPhone = $("#search-phone").value.trim();
      const phone = digits(rawPhone);
      const filtered = customers.filter(c => c.name.toLowerCase().includes(name) && (!rawPhone || (phone && digits(c.phone).includes(phone))));
      $("#results-title").innerHTML = `${name || rawPhone ? "검색 결과" : "전체 고객"} <span class="count">${filtered.length}</span>`;
      $("#search-status").textContent = name || rawPhone ? `${filtered.length}명의 고객을 찾았어요` : "이름을 선택하면 고객 상세로 이동합니다";
      $("#customer-list").innerHTML = filtered.map((c, i) => `<tr><td><div class="customer-cell">${avatar(c, i)}<a href="${detailUrl(c)}">${escape(c.name)}</a></div></td><td>${escape(c.phone)}</td><td>${date(c.lastVisit)}</td><td class="row-memo">${escape(c.nextMemo?.text || "아직 등록된 메모가 없어요")}${c.nextMemo?.visibility === "admin" ? ' <span class="visibility">· 관리자만</span>' : ""}</td><td><a class="detail-arrow" href="${detailUrl(c)}" aria-label="${escape(c.name)} 고객 상세보기">›</a></td></tr>`).join("");
      $("#search-empty").hidden = filtered.length !== 0;
      $("table").hidden = !filtered.length;
    }
    form.addEventListener("submit", event => { event.preventDefault(); search(); });
    form.addEventListener("input", search);
    search();
    const recent = getRecent().map(customerId => customers.find(c => c.id === customerId)).filter(Boolean).slice(0, 3);
    $("#recent-customers").innerHTML = recent.length ? recent.map((c, i) => `<a class="recent-card" href="${detailUrl(c)}">${avatar(c, i)}<div><strong>${escape(c.name)}</strong><p>${escape(c.phone)}</p></div><span aria-hidden="true">›</span></a>`).join("") : '<div class="panel empty small">아직 조회한 고객이 없어요. 고객을 선택하면 이곳에 표시됩니다.</div>';
  }
  function tags(values) { return values.length ? values.map(v => `<span class="tag">${escape(v)}</span>`).join("") : '<p class="muted small">아직 기록된 정보가 없어요.</p>'; }
  function detail() {
    const c = findCustomer();
    if (!c) return missing();
    document.title = `${c.name} · 고객노트`;
    write(RECENT_KEY, [c.id, ...getRecent().filter(value => value !== c.id)].slice(0, 6));
    const history = [...c.history].sort((a, b) => new Date(b.date) - new Date(a.date));
    const purchase = history.find(item => item.type === "purchase");
    const params = new URLSearchParams(location.search);
    const success = params.get("saved") === "1" ? "메모를 저장했어요. 다음 응대에 활용해 보세요." : params.get("created") === "1" ? "새로운 고객을 등록했어요." : "";
    $("#detail-content").innerHTML = `${success ? `<div class="success" role="status">${success}</div>` : ""}<header class="page-heading"><div class="profile">${avatar(c)}<div><h1>${escape(c.name)} <span class="muted small">고객님</span></h1><p>${escape(c.phone)}</p></div></div><span class="demo-badge">고객 한눈에 보기</span></header><section class="summary-grid" aria-label="고객 핵심 요약"><div class="panel summary-card"><div class="label">최근 구매</div><strong>${escape(purchase?.text || "아직 구매 기록이 없어요")}</strong><p>${purchase ? `${date(purchase.date)} · ${Number(purchase.amount).toLocaleString("ko-KR")}원` : "구매 이력은 샘플 데이터로 제공됩니다."}</p></div><div class="panel summary-card"><div class="label">마지막 방문일</div><strong>${date(c.lastVisit)}</strong><p>최근 응대 기록 기준</p></div><div class="panel summary-card highlight"><div class="label">↗ 다음 응대 메모</div><strong>${escape(c.nextMemo?.text || "다음 방문에 전할 메모를 남겨주세요.")}</strong>${c.nextMemo ? `<p>${visibility(c.nextMemo.visibility)}</p>` : ""}</div></section><div class="detail-grid"><div><section class="panel content-panel"><h2>고객 취향과 관심사</h2><div class="tag-group"><h3>취향</h3>${tags(c.preferences)}</div><div class="tag-group"><h3>관심 상품</h3>${tags(c.interests)}</div>${c.basicNote ? `<div class="tag-group"><h3>기본 메모</h3><p class="basic-note">${escape(c.basicNote)}</p></div>` : ""}</section><section class="panel content-panel"><h2>구매 · 상담 기록 <span class="count">${history.length}</span></h2>${history.length ? `<ol class="timeline">${history.map(item => `<li><time datetime="${escape(item.date)}">${date(item.date)}</time><span class="history-label">${item.type === "purchase" ? "구매" : "상담"}</span><p>${escape(item.text)}</p>${item.type === "purchase" ? `<span class="muted small">${Number(item.amount).toLocaleString("ko-KR")}원</span>` : `<span class="visibility">${visibility(item.visibility)}</span>${item.preference ? `<p class="muted small">취향 · ${escape(item.preference)}</p>` : ""}${item.interest ? `<p class="muted small">관심 상품 · ${escape(item.interest)}</p>` : ""}${item.task ? `<p class="muted small">다음 할 일 · ${escape(item.task)}</p>` : ""}`}</li>`).join("")}</ol>` : '<p class="muted small">첫 상담 메모로 고객의 이야기를 시작해 보세요.</p>'}</section></div><section class="panel content-panel"><form id="memo-form" class="memo-form"><h2>오늘의 응대, 한 줄로 남기기</h2><p>짧게 기록하면 취향, 관심 상품, 다음 할 일로 정리해 드려요.</p><label for="memo-text">상담 메모</label><textarea id="memo-text" rows="5" maxlength="1000" required placeholder="예: 베이지 색상을 좋아하심. 가디건에 관심 있고, 입고되면 연락드리기."></textarea><p class="field-help">Mock 분류 결과는 다음 화면에서 직접 수정할 수 있어요.</p><p id="memo-error" class="error" role="alert"></p><button class="button primary" type="submit">✧ 메모 정리하고 확인하기 →</button></form></section></div>`;
    if (success) historyReplace();
    const draft = read(DRAFT_KEY, null, "sessionStorage");
    if (draft?.customerId === c.id) $("#memo-text").value = draft.text;
    $("#memo-form").addEventListener("submit", event => {
      event.preventDefault();
      const text = $("#memo-text").value.trim();
      if (!text) { $("#memo-error").textContent = "상담 내용을 입력해 주세요."; return; }
      if (write(DRAFT_KEY, {id:id(), customerId:c.id, text}, "sessionStorage")) location.href = "memo-review.html?id=" + encodeURIComponent(c.id);
    });
  }
  function historyReplace() { history.replaceState(null, "", location.pathname + "?id=" + encodeURIComponent(findCustomer().id)); }
  function newCustomer() {
    $("#new-form").addEventListener("submit", event => {
      event.preventDefault();
      const name = $("#new-name").value.trim();
      const raw = $("#new-phone").value.trim();
      const phone = digits(raw);
      let error = "";
      if (!name) error = "고객 이름을 입력해 주세요.";
      else if (!/^[\d\s()-]+$/.test(raw) || !/^\d{9,11}$/.test(phone)) error = "전화번호는 숫자 9~11자리로 입력해 주세요.";
      else if (customers.some(c => digits(c.phone) === phone)) error = "이미 등록된 전화번호예요. 고객 검색에서 확인해 주세요.";
      $("#form-error").textContent = error;
      if (error) return;
      const formatted = phone.length === 11 ? phone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3") : phone;
      const c = {id:id(),name,phone:formatted,basicNote:$("#new-note").value.trim(),lastVisit:new Date().toISOString(),preferences:[],interests:[],nextMemo:null,history:[]};
      if (saveCustomers([...customers, c])) location.href = detailUrl(c) + "&created=1";
    });
  }
  // 간단한 키워드로 문장을 분류하는 Mock입니다. 실제 AI를 호출하지 않습니다.
  function classify(text) {
    const parts = text.split(/[.!?。\n]+|,\s*|\.\s*/).map(s => s.trim()).filter(Boolean);
    return {preference:parts.filter(s => /좋아|선호|취향|스타일/.test(s)).join(". "),interest:parts.filter(s => /관심|찾으|찾고|궁금/.test(s)).join(". "),task:parts.filter(s => /연락|안내|확인|입고|다음|예약/.test(s)).join(". ")};
  }
  function review() {
    const c = findCustomer();
    if (!c) return missing();
    const draft = read(DRAFT_KEY, null, "sessionStorage");
    if (!draft || draft.customerId !== c.id || !draft.text) {
      $("#review-content").innerHTML = `<div class="panel empty"><h1>정리할 메모가 없어요</h1><p>고객 상세 화면에서 상담 메모를 먼저 작성해 주세요.</p><a class="button primary" href="${detailUrl(c)}">고객 상세로</a></div>`;
      return;
    }
    const result = draft.review || {...classify(draft.text), nextText:"", pinned:false, visibility:"staff"};
    $("#review-content").className = "review-page";
    $("#review-content").innerHTML = `<a class="back" href="${detailUrl(c)}">← ${escape(c.name)} 고객 상세로</a><header class="page-heading"><div><p class="eyebrow">다음 응대를 위한 작은 정리</p><h1>메모 정리 확인</h1><p>${escape(c.name)} 고객님의 이야기를 확인하고 필요한 부분을 수정해 주세요.</p></div></header><form id="review-form" class="panel form-panel"><div class="section-heading"><h2>작성한 원문</h2><span class="mock-label">Mock 자동 분류</span></div><blockquote class="original-note">${escape(draft.text)}</blockquote><p class="field-help" style="margin-bottom:22px">키워드 기반 체험 결과입니다. 분류되지 않은 내용은 직접 입력해 주세요.</p><label>취향<textarea id="review-preference" maxlength="1000" rows="2" placeholder="좋아하는 색상, 소재, 스타일 등">${escape(result.preference)}</textarea></label><label>관심 상품<textarea id="review-interest" maxlength="1000" rows="2" placeholder="관심을 보인 상품을 입력하세요">${escape(result.interest)}</textarea></label><label>다음 할 일<textarea id="review-task" maxlength="1000" rows="2" placeholder="다음 응대에서 확인할 일을 입력하세요">${escape(result.task)}</textarea></label><div class="next-box"><label class="checkbox-label"><input id="pin-memo" type="checkbox" ${result.pinned ? "checked" : ""}>다음 응대 메모로 지정하기</label><p class="field-help">지정하면 고객 상세 상단의 기존 응대 메모를 교체합니다.</p><label id="next-label" ${result.pinned ? "" : "hidden"}><span class="field-help">다음 응대 메모</span><textarea id="next-text" rows="2" maxlength="1000">${escape(result.nextText)}</textarea></label></div><fieldset><legend>공개 범위</legend><div class="radio-options"><label class="radio-label"><input type="radio" name="visibility" value="staff" ${result.visibility !== "admin" ? "checked" : ""}>직원 공개</label><label class="radio-label"><input type="radio" name="visibility" value="admin" ${result.visibility === "admin" ? "checked" : ""}>관리자만</label></div><p class="field-help">이번 버전은 선택한 공개 범위만 저장하며, 실제 열람 권한을 제한하지 않습니다.</p></fieldset><p id="review-error" class="error" role="alert"></p><div class="form-actions"><a class="button secondary" href="${detailUrl(c)}">취소</a><button class="button primary" type="submit">메모 저장하기 →</button></div><p class="local-note">현재 브라우저에 임시 저장됩니다.</p></form>`;
    function values() { return {preference:$("#review-preference").value.trim(),interest:$("#review-interest").value.trim(),task:$("#review-task").value.trim(),pinned:$("#pin-memo").checked,nextText:$("#next-text").value.trim(),visibility:$("input[name=visibility]:checked").value}; }
    $("#pin-memo").addEventListener("change", () => {
      $("#next-label").hidden = !$("#pin-memo").checked;
      $("#next-text").required = $("#pin-memo").checked;
      if ($("#pin-memo").checked && !$("#next-text").value.trim()) $("#next-text").value = $("#review-task").value.trim() || draft.text;
    });
    $("#review-form").addEventListener("input", () => write(DRAFT_KEY, {...draft,review:values()}, "sessionStorage"));
    $("#review-form").addEventListener("submit", event => {
      event.preventDefault();
      const v = values();
      if (v.pinned && !v.nextText) { $("#review-error").textContent = "다음 응대 메모를 입력해 주세요."; return; }
      if (c.history.some(item => item.id === draft.id)) { location.href = detailUrl(c); return; }
      const now = new Date().toISOString();
      const updated = {...c,lastVisit:now,preferences:[...new Set([...c.preferences,...(v.preference ? [v.preference] : [])])],interests:[...new Set([...c.interests,...(v.interest ? [v.interest] : [])])],nextMemo:v.pinned ? {text:v.nextText,visibility:v.visibility} : c.nextMemo,history:[...c.history,{id:draft.id,type:"memo",date:now,text:draft.text,preference:v.preference,interest:v.interest,task:v.task,visibility:v.visibility}]};
      if (!saveCustomers(customers.map(customer => customer.id === c.id ? updated : customer))) return;
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* 저장 완료 데이터에는 영향이 없습니다. */ }
      location.href = detailUrl(c) + "&saved=1";
    });
  }
  ({home,detail,new:newCustomer,review}[page] || home)();
})();
