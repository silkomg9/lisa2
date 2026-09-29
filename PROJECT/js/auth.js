// 모든 화면의 세션 확인, 이메일 인증, 로그아웃을 관리합니다.
// 고객 데이터 저장 방식(localStorage)과 인증 세션은 별개입니다.
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const authPage = ["login", "signup", "reset-password"].includes(document.body.dataset.page);
  const isSignup = document.body.dataset.page === "signup";
  const isReset = document.body.dataset.page === "reset-password";
  let passwordUpdated = false;
  const client = window.customerDb;
  let resolveReady;
  let currentSession = null;
  let revision = 0;
  let ready = false;
  let navigating = false;
  let checking = false;
  const callbackError = new URLSearchParams(location.hash.slice(1)).get("error_code")
    || new URLSearchParams(location.search).get("error_code");

  window.customerAuth = {
    ready: new Promise(resolve => { resolveReady = resolve; }),
    mountHeader
  };

  function errorMessage(error) {
    const messages = {
      invalid_credentials: "이메일 또는 비밀번호가 올바르지 않습니다. 이미 가입하셨다면 아래 ‘비밀번호 재설정’을 이용해 주세요.",
      email_not_confirmed: "이메일 인증이 필요합니다. 가입 시 받은 메일의 확인 링크를 눌러주세요.",
      user_already_exists: "이미 가입된 이메일입니다. 로그인하거나 아래 ‘비밀번호 재설정’을 이용해 주세요.",
      email_exists: "이미 가입된 이메일입니다. 로그인하거나 아래 ‘비밀번호 재설정’을 이용해 주세요.",
      same_password: "기존 비밀번호와 다른 새 비밀번호를 입력해 주세요.",
      reauthentication_needed: "본인 확인이 필요합니다. 새 비밀번호 재설정 메일의 링크로 다시 시도해 주세요.",
      signup_disabled: "현재 회원가입이 허용되지 않습니다. 서비스 관리자에게 문의해 주세요.",
      email_provider_disabled: "이메일 로그인이 비활성화되어 있습니다. 서비스 관리자에게 문의해 주세요.",
      email_address_invalid: "올바른 이메일 주소를 입력해 주세요.",
      email_address_not_authorized: "현재 이 이메일로 인증 메일을 보낼 수 없습니다. 서비스 관리자에게 문의해 주세요.",
      weak_password: "비밀번호가 보안 기준에 맞지 않습니다. 더 긴 비밀번호에 영문·숫자·특수문자를 조합해 주세요.",
      over_email_send_rate_limit: "인증 메일 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      over_request_rate_limit: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      otp_expired: "이메일 인증 링크가 만료되었거나 이미 사용되었습니다. 인증을 마쳤다면 로그인해 주세요.",
      session_not_found: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
      refresh_token_not_found: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요."
    };
    if (messages[error?.code]) return messages[error.code];
    if (error?.status === 429) return messages.over_request_rate_limit;
    if (error?.code === "timeout" || error?.name === "AuthRetryableFetchError" || /fetch|network|load failed/i.test(error?.message || "")) {
      return "서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.";
    }
    return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.";
  }

  function navigate(page) {
    if (navigating) return;
    navigating = true;
    document.body.classList.add("auth-pending");
    $("#auth-status").hidden = false;
    $("#auth-status-message").textContent = "화면을 이동하고 있어요.";
    location.replace(page);
  }

  function reveal() {
    document.body.classList.remove("auth-pending");
    $("#auth-status").hidden = true;
  }

  function fail(message) {
    document.body.classList.add("auth-pending");
    $("#auth-status").hidden = false;
    $("#auth-status-message").textContent = message;
    $("#auth-retry").hidden = false;
    if (!ready) { ready = true; resolveReady(null); }
  }

  function applySession(session) {
    if (navigating) return;
    const previousId = currentSession?.user?.id;
    currentSession = session;
    if (!ready) { ready = true; resolveReady(session); }
    if (isReset) {
      reveal();
      $("#reset-request-form").hidden = Boolean(session) && !callbackError;
      $("#password-update-form").hidden = !session || Boolean(callbackError) || passwordUpdated;
      $("#reset-complete").hidden = !passwordUpdated;
      if (callbackError) $("#auth-error").textContent = "재설정 링크가 만료되었거나 유효하지 않습니다. 아래에서 새 메일을 요청해 주세요.";
      return;
    }
    if (authPage) {
      if (session) { navigate("index.html"); return; }
      reveal();
      if (callbackError) $("#auth-error").textContent = errorMessage({code:callbackError});
    } else if (!session) {
      navigate("login.html");
    } else if (previousId && previousId !== session.user.id) {
      // 다른 계정으로 변경되면 이전 화면의 작성 상태를 재사용하지 않습니다.
      navigate("index.html");
    } else {
      mountHeader();
    }
  }

  async function checkSession() {
    if (checking || navigating) return;
    checking = true;
    const startRevision = revision;
    let timer;
    try {
      const result = await Promise.race([
        client.auth.getSession(),
        new Promise((_, reject) => { timer = setTimeout(() => reject({code:"timeout"}), 15000); })
      ]);
      if (startRevision !== revision) return;
      if (result.error) throw result.error;
      applySession(result.data.session);
    } catch (error) {
      if (startRevision === revision) fail(errorMessage(error));
    } finally {
      clearTimeout(timer);
      checking = false;
    }
  }

  function mountHeader() {
    if (authPage || !currentSession || navigating) return;
    const topbar = $(".topbar");
    if (!topbar) return; // app.js가 고객 화면을 만든 뒤 다시 호출합니다.
    if (!$("#account-controls")) {
      const controls = document.createElement("div");
      controls.id = "account-controls";
      controls.className = "account-controls";
      controls.innerHTML = '<span id="account-email" class="account-email"></span><button id="logout-button" class="button secondary button-small" type="button">로그아웃</button><p id="auth-action-error" class="auth-action-error error" role="alert" hidden></p>';
      topbar.append(controls);
      $("#logout-button").addEventListener("click", async () => {
        const button = $("#logout-button");
        button.disabled = true;
        button.textContent = "로그아웃 중…";
        $("#auth-action-error").hidden = true;
        try {
          const {error} = await client.auth.signOut({scope:"local"});
          if (error) throw error;
          applySession(null);
        } catch (error) {
          $("#auth-action-error").textContent = errorMessage(error);
          $("#auth-action-error").hidden = false;
        } finally {
          button.disabled = false;
          button.textContent = "로그아웃";
        }
      });
    }
    $("#account-email").textContent = currentSession.user.email || "로그인됨";
    $("#account-email").title = currentSession.user.email || "로그인됨";
    reveal();
  }

  $("#auth-retry").addEventListener("click", () => location.reload());
  if (!client) {
    fail("로그인 서비스를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 확인해 주세요.");
    return;
  }

  if (isReset) setupPasswordReset();

  function setupPasswordReset() {
    $("#reset-request-form").addEventListener("submit", async event => {
      event.preventDefault();
      const button = $("#reset-send");
      if (button.disabled) return;
      $("#auth-error").textContent = "";
      $("#auth-message").textContent = "";
      const email = $("#reset-email").value.trim();
      if (!email) { $("#auth-error").textContent = "가입한 이메일을 입력해 주세요."; return; }
      if (!/^https?:$/.test(location.protocol)) {
        $("#auth-error").textContent = "비밀번호 재설정은 배포된 서비스 주소에서 이용해 주세요.";
        return;
      }
      button.disabled = true;
      button.textContent = "메일 요청 중…";
      try {
        const {error} = await client.auth.resetPasswordForEmail(email, {
          redirectTo: new URL("reset-password.html", location.href).href.split(/[?#]/)[0]
        });
        if (error) throw error;
        $("#auth-message").textContent = "가입된 이메일이라면 비밀번호 재설정 메일이 발송됩니다. 받은편지함과 스팸함을 확인해 주세요.";
      } catch (error) {
        $("#auth-error").textContent = errorMessage(error);
      } finally {
        button.disabled = false;
        button.textContent = "재설정 메일 받기";
      }
    });
    $("#password-update-form").addEventListener("submit", async event => {
      event.preventDefault();
      const button = $("#password-save");
      if (button.disabled) return;
      $("#auth-error").textContent = "";
      $("#auth-message").textContent = "";
      const password = $("#new-password").value;
      if (!currentSession || callbackError) { $("#auth-error").textContent = "새 재설정 메일의 링크를 열어주세요."; return; }
      if (password.length < 6) { $("#auth-error").textContent = "비밀번호는 6자 이상으로 입력해 주세요."; return; }
      if (password !== $("#confirm-password").value) { $("#auth-error").textContent = "두 비밀번호가 일치하지 않습니다."; return; }
      button.disabled = true;
      button.textContent = "저장 중…";
      try {
        const {error} = await client.auth.updateUser({password});
        if (error) throw error;
        passwordUpdated = true;
        $("#new-password").value = "";
        $("#confirm-password").value = "";
        $("#password-update-form").hidden = true;
        $("#reset-complete").hidden = false;
        $("#auth-message").textContent = "비밀번호를 변경했습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.";
      } catch (error) {
        $("#auth-error").textContent = errorMessage(error);
      } finally {
        button.disabled = false;
        button.textContent = "새 비밀번호 저장";
      }
    });
  }

  if (authPage && !isReset) {
    $("#auth-form").addEventListener("submit", async event => {
      event.preventDefault();
      const button = $("#auth-submit");
      if (button.disabled) return;
      const email = $("#auth-email").value.trim();
      const password = $("#auth-password").value;
      $("#auth-error").textContent = "";
      $("#auth-message").textContent = "";
      if (!email || !password) { $("#auth-error").textContent = "이메일과 비밀번호를 입력해 주세요."; return; }
      if (isSignup && password.length < 6) { $("#auth-error").textContent = "비밀번호는 6자 이상으로 입력해 주세요."; return; }
      button.disabled = true;
      button.textContent = isSignup ? "가입 요청 중…" : "로그인 중…";
      try {
        let result;
        if (isSignup) {
          const options = /^https?:$/.test(location.protocol)
            ? {emailRedirectTo:new URL("login.html", location.href).href} : {};
          result = await client.auth.signUp({email, password, options});
        } else {
          result = await client.auth.signInWithPassword({email, password});
        }
        if (result.error) throw result.error;
        $("#auth-password").value = "";
        if (result.data.session) {
          applySession(result.data.session);
        } else if (isSignup && Array.isArray(result.data.user?.identities) && result.data.user.identities.length === 0) {
          $("#auth-message").textContent = "이미 가입된 이메일일 수 있습니다. 아래에서 로그인하거나 비밀번호를 재설정해 주세요.";
        } else if (isSignup) {
          $("#auth-message").textContent = "회원가입을 요청했습니다. 받은편지함과 스팸함에서 확인 메일을 찾아 인증한 뒤 로그인해 주세요. 이미 가입한 이메일이라면 로그인해 주세요.";
        } else {
          $("#auth-error").textContent = "로그인 세션을 만들지 못했습니다. 다시 로그인해 주세요.";
        }
      } catch (error) {
        $("#auth-error").textContent = errorMessage(error);
      } finally {
        button.disabled = false;
        button.textContent = isSignup ? "회원가입" : "로그인";
      }
    });
  }

  // 콜백 안에서는 Auth API를 다시 호출하지 않습니다.
  client.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") return; // 최초 상태는 getSession으로 확인합니다.
    revision += 1;
    if (event === "PASSWORD_RECOVERY" && !isReset) {
      navigate("reset-password.html");
      return;
    }
    applySession(session);
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted) {
      navigating = false;
      document.body.classList.add("auth-pending");
      $("#auth-status").hidden = false;
      checkSession();
    }
  });
  checkSession();
})();
