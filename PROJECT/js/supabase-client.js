// Supabase JavaScript v2 CDN을 먼저 불러온 뒤 실행합니다.
// 공개용 Publishable Key만 사용합니다. Secret Key를 이 파일에 넣지 마세요.
// 기존 고객 데이터는 아직 localStorage에 저장하며, 이 파일은 연결만 준비합니다.
(() => {
  "use strict";

  const projectUrl = "https://skymfxuylohepbglidrn.supabase.co";
  const publishableKey = "sb_publishable_jaGvLJhMO5bC0t-Vf6KpYQ__ck7BRXm";

  // CDN 전역 window.supabase는 라이브러리로 그대로 유지합니다.
  // 앱에서는 window.customerDb를 통해 클라이언트를 사용합니다.
  window.customerDb = null;
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.warn("Supabase CDN을 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.");
    return;
  }

  try {
    window.customerDb = window.supabase.createClient(projectUrl, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } catch {
    console.warn("Supabase 클라이언트를 초기화하지 못했습니다. 연결 설정을 확인해 주세요.");
  }
})();
