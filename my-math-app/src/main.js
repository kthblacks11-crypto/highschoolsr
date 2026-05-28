let currentEditingAssessmentIndex = -1;

const firebaseConfig = {
    apiKey: "AIzaSyDq5c9_BMx-zoYHUAGAp8B3jbvi3tj8HXo",
    authDomain: "math-asa-project-2026.firebaseapp.com",
    projectId: "math-asa-project-2026",
    storageBucket: "math-asa-project-2026.firebasestorage.app",
    messagingSenderId: "1045151452788",
    appId: "1:1045151452788:web:bf69cb26e0be84dd8b0b21"
};


// ==========================================

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.enablePersistence()
  .catch((err) => {
      console.warn("오프라인 캐시 활성화 실패:", err.code);
  });
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
const storage = firebase.storage();
let currentUploadedImageUrl = null;

auth.onAuthStateChanged(async (user) => {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn'); // 🟢 탈퇴 버튼 불러오기
    const userInfo = document.getElementById('user-info');
    const adminFeedbackBtn = document.getElementById('admin-feedback-btn'); 
    const adminModeBtn = document.getElementById('admin-mode-btn'); 
    
    if (user) {
        if(loginBtn) loginBtn.style.display = 'none';
        if(logoutBtn) logoutBtn.style.display = 'inline-block';
        if(deleteAccountBtn) deleteAccountBtn.style.display = 'inline-block'; // 🟢 로그인시 활성화
        if(userInfo) {
            userInfo.style.display = 'inline-block';
            userInfo.innerText = `${user.email.split('@')[0]}님 환영합니다`;
        }
        
        // 🚨 [관리자 권한 체크] 특정 이메일만 관리자 피드백 버튼 노출
        const adminEmails = ["math-asa@gmail.com", "admin@lee-sunsin.hs.kr", "principal@lee-sunsin.hs.kr", "pkb9270@gmail.com", "pkb9270@naver.com"];
        if (adminEmails.includes(user.email)) {
            if(adminFeedbackBtn) adminFeedbackBtn.style.display = 'inline-block';
            if(adminModeBtn) adminModeBtn.style.display = 'inline-block';
        } else {
            if(adminFeedbackBtn) adminFeedbackBtn.style.display = 'none';
            if(adminModeBtn) adminModeBtn.style.display = 'none';
        }

        initDashboard();
        loadProjects(); // 📂 구글 로그인 연동 성공 시, 사용자의 프로젝트 폴더를 서버에서 실시간 호출합니다.
    } else {
        if(loginBtn) loginBtn.style.display = 'inline-block';
        if(logoutBtn) logoutBtn.style.display = 'none';
        if(deleteAccountBtn) deleteAccountBtn.style.display = 'none'; // 🔴 로그아웃시 숨김
        if(userInfo) userInfo.style.display = 'none';
        if(adminFeedbackBtn) adminFeedbackBtn.style.display = 'none';
        if(adminModeBtn) adminModeBtn.style.display = 'none';
        
        // 비로그인 상태 UI 대응
        const listEl = document.getElementById('project-folder-list');
        if(listEl) listEl.innerHTML = '<p style="color:#64748b; grid-column: 1 / -1; text-align: center;">🔒 구글 로그인을 하시면 교사 공동체 협업 폴더 시스템을 이용할 수 있습니다.</p>';
    }
});

function handleLogin() {
    auth.signInWithPopup(provider).catch((error) => {
        alert("로그인 실패: " + error.message);
    });
}

function handleLogout() {
    if(unsubscribeProject) { unsubscribeProject(); unsubscribeProject = null; } // 실시간 리스너 해제 추가
    auth.signOut().then(() => {
        alert("로그아웃 되었습니다.");
        location.reload(); 
    });
}

// 🟢 [신규 기능] 회원 탈퇴 함수 추가
function handleDeleteAccount() {
    const user = auth.currentUser;
    if (!user) { alert("로그인 상태가 아닙니다."); return; }

    const confirmFirst = confirm("🚨 정말로 회원 탈퇴를 진행하시겠습니까?\n이 작업은 되돌릴 수 없으며 모든 개인 데이터 연결이 끊어집니다.");
    if (!confirmFirst) return;

    const confirmSecond = prompt("보안을 위해 계정 삭제를 확정하려면 본인의 구글 이메일 주소를 입력해 주세요:\n" + user.email);
    if (confirmSecond !== user.email) { alert("이메일 주소가 일치하지 않습니다. 탈퇴 처리가 취소되었습니다."); return; }

    // 재인증 처리가 필요한 경우가 많으므로 신중하게 진행
    user.delete().then(() => {
        alert("🔒 회원 탈퇴가 성공적으로 완료되었습니다. 그동안 이용해 주셔서 감사합니다.");
        location.reload();
    }).catch((error) => {
        if (error.code === 'auth/requires-recent-login') {
            alert("⏰ 보안을 위해 최근 로그인 기록이 필요합니다. 로그아웃 후 다시 로그인하여 즉시 탈퇴를 시도해 주세요.");
            auth.signOut().then(() => { location.reload(); });
        } else {
            alert("탈퇴 처리 중 오류 발생: " + error.message);
        }
    });
}

function openFeedback() { document.getElementById('feedback-modal').style.display = 'flex'; }
function closeFeedback() { document.getElementById('feedback-modal').style.display = 'none'; }
function closeModal() { document.getElementById('admin-modal').style.display = 'none'; }
function closeAdminFeedback() { document.getElementById('admin-feedback-modal').style.display = 'none'; }

function openSettings() { document.getElementById('settings-modal').style.display = 'flex'; }
function closeSettings() { document.getElementById('settings-modal').style.display = 'none'; }

function saveApiKey() {
    const key = document.getElementById('api-key-input').value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        alert("Gemini API Key가 성공적으로 브라우저에 저장되었습니다!");
        closeSettings();
    } else {
        alert("올바른 Key를 입력하세요.");
    }
}

async function submitFeedback() {
    const text = document.getElementById('feedback-text').value.trim();
    if (!text) { alert("내용을 입력해 주세요."); return; }
    
    try {
        await db.collection('developer_feedback').add({
            uid: auth.currentUser ? auth.currentUser.uid : "anonymous",
            email: auth.currentUser ? auth.currentUser.email : "anonymous",
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("선생님의 소중한 의견이 개발자에게 전송되었습니다. 감사합니다!");
        document.getElementById('feedback-text').value = "";
        closeFeedback();
    } catch (e) {
        alert("전송 실패: " + e.message);
    }
}

async function openAdminFeedback() {
    document.getElementById('admin-feedback-modal').style.display = 'flex';
    const list = document.getElementById('admin-feedback-list');
    list.innerHTML = "불러오는 중... ⏳";

    try {
        const snapshot = await db.collection('developer_feedback').orderBy('timestamp', 'desc').get();
        if (snapshot.empty) { list.innerHTML = "접수된 피드백이나 이의 제기가 없습니다."; return; }

        let html = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : "방금 전";
            
            if (data.type === "문항 매칭 이의 제기") {
                // 💡 이의제기 전용 정밀 처리 카드 설계
                html += `
                <div style="border: 2px solid #8b5cf6; padding: 15px; margin-bottom: 15px; border-radius: 8px; background: #fbf7ff; text-align: left;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e9d5ff; padding-bottom:8px; margin-bottom:10px;">
                        <span style="background:#8b5cf6; color:white; font-size:0.75rem; padding:3px 8px; border-radius:4px; font-weight:bold;">⚖️ 문항 매칭 이의 제기</span>
                        <span style="font-size:0.8rem; color:#64748b;">${date} (${data.email.split('@')[0]})</span>
                    </div>
                    <div style="margin-bottom:8px; font-size:0.95rem;"><strong>[원본 문항 텍스트]</strong><br><pre style="background:white; padding:8px; border:1px solid #e2e8f0; border-radius:4px; white-space:pre-wrap;">${data.question}</pre></div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px; background:#f1f5f9; padding:8px; border-radius:4px; font-size:0.85rem;">
                        <div>❌ <strong>기존 판정:</strong> 코드(${data.original_standard}) | 수준(${data.original_level})</div>
                        <div>🟢 <strong>교사 제안:</strong> 코드(${data.proposed_standard}) | 수준(${data.proposed_level})</div>
                    </div>
                    <div style="margin-bottom:10px; font-size:0.9rem; color:#b45309;"><strong>💡 교사 제안 사유:</strong> "${data.teacher_reason}"</div>
                    
                    <div style="background:white; border:1px solid #cbd5e1; padding:10px; border-radius:6px; margin-top:10px;">
                        <strong style="color:#7c3aed; font-size:0.85rem; display:block; margin-bottom:5px;">🤖 AI 수석위원 교차 검토서 (구분자 분해 분석 전용)</strong>
                        <div style="font-size:0.85rem; line-height:1.5; color:#334155; white-space:pre-wrap;">${data.ai_review}</div>
                    </div>

                    <div style="margin-top:15px; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #cbd5e1; display:flex; flex-direction:column; gap:8px;">
                        <strong style="font-size:0.8rem; color:#475569;">⚙️ 어드민 마스터 퀵 데이터베이스 조작 제어판</strong>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                            <input type="text" id="admin-prop-std-${doc.id}" placeholder="확정 성취기준 코드" value="${data.proposed_standard}" style="padding:4px; font-size:0.8rem;">
                            <input type="text" id="admin-prop-lvl-${doc.id}" placeholder="확정 성취수준" value="${data.proposed_level}" style="padding:4px; font-size:0.8rem;">
                        </div>
                        <input type="text" id="admin-prop-ans-${doc.id}" placeholder="확정 정답 (리뷰서 참고)" value="" style="padding:4px; font-size:0.8rem;">
                        <textarea id="admin-prop-reason-${doc.id}" placeholder="최종 확정 판정 사유 한 문단" style="padding:4px; font-size:0.8rem; height:40px; font-family:inherit;"></textarea>
                        <div style="text-align:right; display:flex; gap:5px; justify-content:flex-end;">
                            <button onclick="acceptFeedback('${doc.id}')" style="background:#10b981; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.75rem; font-weight:bold;">✅ DB 즉시 승인/수정</button>
                            <button onclick="rejectFeedback('${doc.id}')" style="background:#ef4444; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.75rem;">반려</button>
                        </div>
                    </div>
                </div>`;
            } else {
                html += `
                <div style="border-bottom: 1px solid #cbd5e1; padding: 10px 0; text-align: left;">
                    <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 5px;">📅 ${date} | 👤 작성자: ${data.email}</div>
                    <div style="font-size: 0.95rem; color: #1e293b; white-space: pre-wrap;">${data.text}</div>
                </div>`;
            }
        });
        list.innerHTML = html;
    } catch(e) { list.innerHTML = "로드 실패: " + e.message; }
}

function openAdminMode() { document.getElementById('admin-modal').style.display = 'flex'; }

function showSection(sectionId) {
    document.querySelectorAll('.app-section').forEach(sec => {
        sec.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
    
    // 메뉴 하이라이트 제어
    document.querySelectorAll('.nav-menu-btn').forEach(btn => btn.classList.remove('active'));
    const targetMenuBtn = document.querySelector(`button[onclick="showSection('${sectionId}')"]`);
    if(targetMenuBtn) targetMenuBtn.classList.add('active');

    if (sectionId === 'cut-score-dashboard') {
        loadProjects(); // 📂 분할점수 대시보드 진입할 때마다 최신 폴더를 무조건 새로고침 동기화시킵니다.
    }
}

// ==========================================

const curriculumMap = {
    math: {
        "공통 과목": [{ id: "common1", name: "공통수학1" }, { id: "common2", name: "공통수학2" }],
        "선택 과목": [{ id: "algebra", name: "대수" }, { id: "calculus1", name: "미적분Ⅰ" }, { id: "probStat", name: "확률과 통계" }]
    },
    korean: { "공통/선택": [{ id: "korean-common", name: "공통국어 (준비중)" }] },
    english: { "공통/선택": [{ id: "english-common", name: "공통영어 (준비중)" }] },
    social: { "공통/선택": [{ id: "social-common", name: "공통사회 (준비중)" }] },
    science: { "공통/선택": [{ id: "science-common", name: "공통과학 (준비중)" }] }
};

let currentSubject = 'common1'; 
let currentStandardCode = ''; 
let currentQuestions = []; 
let currentLevelQ = 0; 

function changeGroup(groupId) {
    document.querySelectorAll('.group-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const subjectSelect = document.getElementById('subject-select');
    subjectSelect.innerHTML = '';
    
    const map = curriculumMap[groupId];
    for (const category in map) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;
        map[category].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id;
            opt.innerText = sub.name;
            optgroup.appendChild(opt);
        });
        subjectSelect.appendChild(optgroup);
    }
    changeSubject();
}

function changeSubject() {
    currentSubject = document.getElementById('subject-select').value;
    initStandardSelector();
}

function initStandardSelector() {
    const standardSelect = document.getElementById('standard-select');
    standardSelect.innerHTML = '<option value="">-- 성취기준을 선택해 주세요 --</option>';
    
    const data = subjectData[currentSubject];
    if (data && data.standards) {
        data.standards.forEach(std => {
            const opt = document.createElement('option');
            opt.value = std.code;
            opt.innerText = `${std.code} - ${std.desc.substring(0, 35)}...`;
            standardSelect.appendChild(opt);
        });
    }
}

function openAnalysisMode() {
    currentStandardCode = document.getElementById('standard-select').value;
    if (!currentStandardCode) { alert("성취기준을 선택하세요."); return; }
    
    document.getElementById('setup-zone').style.display = 'none';
    document.getElementById('analysis-zone').style.display = 'block';
    
    const std = subjectData[currentSubject].standards.find(s => s.code === currentStandardCode);
    document.getElementById('target-standard-display').innerHTML = `🎯 <strong>선택된 성취기준:</strong> [${std.code}] ${std.desc}`;
}

function backToStandardSelection() {
    document.getElementById('analysis-zone').style.display = 'none';
    document.getElementById('setup-zone').style.display = 'block';
    document.getElementById('result-panel').style.display = 'none';
}

function requireApiKey() {
    const key = localStorage.getItem('gemini_api_key');
    if (!key) {
        alert("⚠️ 상단의 우측 [톱니바퀴 환경설정] 메뉴를 클릭하여 'Gemini API Key'를 먼저 입력해 주세요!");
        openSettings();
        return false;
    }
    return true;
}

let currentAnalysisMode = 'single'; // 'single' 또는 'multi'

function setAnalysisMode(mode) {
    currentAnalysisMode = mode;
    document.querySelectorAll('.mode-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // UI 레이아웃 리셋
    document.getElementById('single-mode-ui').style.display = mode === 'single' ? 'block' : 'none';
    document.getElementById('multi-mode-ui').style.display = mode === 'multi' ? 'block' : 'none';
    document.getElementById('analyze-single-btn').style.display = mode === 'single' ? 'inline-block' : 'none';
    document.getElementById('analyze-multi-btn').style.display = mode === 'multi' ? 'inline-block' : 'none';
}

async function executeAnalysis() {
    if (!requireApiKey()) return;
    
    const btn = currentAnalysisMode === 'single' ? document.getElementById('analyze-single-btn') : document.getElementById('analyze-multi-btn');
    const originalText = btn.innerText;
    btn.innerText = "⏳ 인공지능이 교육과정 루브릭을 분석 중입니다...";
    btn.disabled = true;

    try {
        const userApiKey = localStorage.getItem('gemini_api_key');
        const workerUrl = "https://script.google.com/macros/s/AKfycbwgx4RgF8FQxxL3jBgEQ5l369llADjhZ1NepulIdF4DdX18kBrB8oRQ4Ft0d5WdKtEF/exec";
        
        let standardsInfo = "";
        const data = subjectData[currentSubject];
        if (data && data.standards) {
            standardsInfo = data.standards.map(s => `${s.code} ${s.desc}`).join('\n');
        }

        let payload = {
            action: currentAnalysisMode === 'single' ? "analyze_single" : "analyze_multi",
            subject: currentSubject,
            standardsInfo: standardsInfo,
            apiKey: userApiKey
        };

        if (currentAnalysisMode === 'single') {
            const textInput = document.getElementById('problem-textarea').value.trim();
            const fileInput = document.getElementById('problem-image');
            
            if (!textInput && fileInput.files.length === 0) {
                alert("문제 텍스트를 입력하거나 시험지 이미지를 업로드하세요.");
                btn.innerText = originalText; btn.disabled = false; return;
            }

            payload.questionText = textInput;
            
            if (fileInput.files.length > 0) {
                const base64 = await fileToBase64(fileInput.files[0]);
                payload.imageBase64 = base64;
            }
        } else {
            const multiFiles = document.getElementById('multi-problem-images').files;
            if (multiFiles.length === 0) {
                alert("분석할 문항 이미지 파일들을 선택하세요.");
                btn.innerText = originalText; btn.disabled = false; return;
            }
            
            let base64Array = [];
            for (let i = 0; i < multiFiles.length; i++) {
                const b64 = await fileToBase64(multiFiles[i]);
                base64Array.push(b64);
            }
            payload.images = base64Array;
        }

        // 💡 [핵심 기능] 공통지문 보관함 연동 모듈 가동
        if (commonPassages && commonPassages.length > 0) {
            payload.commonImages = commonPassages; 
        }

        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        await checkApiError(response);
        const resData = await response.json();
        const aiResult = resData.candidates[0].content.parts[0].text;
        
        displayAnalysisResult(aiResult);
    } catch (e) {
        alert("분석 중 오류 발생: " + e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function checkApiError(response) {
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`서버 응답 에러 (${response.status}): ${errText}`);
    }
}

function displayAnalysisResult(text) {
    currentChatContext = text; // 대화 컨텍스트 누적
    
    const wrapper = document.getElementById('analysis-layout-wrapper');
    const mainContainer = document.querySelector('.container');
    
    // 💡 화면 레이아웃 와이드 스크린 대전환
    if (wrapper) {
        wrapper.style.display = 'flex';
        wrapper.style.gap = '20px';
        wrapper.style.position = 'relative';
    }
    if (mainContainer) {
        mainContainer.style.maxWidth = '98%'; 
    }

    const output = document.getElementById('analysis-output');
    output.innerHTML = formatAiResult(text);
    document.getElementById('analysis-result').style.display = 'block';

    // 💬 대화형 우측 피드백 패널 즉시 사출 및 대화 내역 초기화
    const chatContainer = document.getElementById('ai-chat-container');
    if(chatContainer) {
        chatContainer.style.display = 'flex';
        chatContainer.style.flexDirection = 'column';
    }
    const chatHistory = document.getElementById('chat-history');
    if(chatHistory) chatHistory.innerHTML = ""; 

    // MathJax 수식 포맷 변환 루틴 가동
    if (window.MathJax) MathJax.typesetPromise([output]);
}

function formatAiResult(text) {
    let formatted = text
        .replace(/\[원본 문제 추출\]:/g, '<h3 class="res-title">📋 문항 원본 텍스트 추출</h3>')
        .replace(/\[교과 및 단원\]:/g, '<h3 class="res-title">📚 교육과정 연계 단원</h3>')
        .replace(/\[성취기준 및 수준\]:/g, '<h3 class="res-title">🎯 2022 개정 교육과정 성취수준 판정</h3>')
        .replace(/\[핵심 개념\]:/g, '<h3 class="res-title">💡 문항 해결 핵심 개념 원리</h3>')
        .replace(/\[상세 풀이\]:/g, '<h3 class="res-title">✏️ 단계별 교육과정 정밀 상세 풀이</h3>')
        .replace(/\n/g, '<br>');
    return `<div class="ai-parsed-card">${formatted}</div>`;
}

// 💬 대화형 비판적 검증 챗봇 엔진 모듈
let currentChatContext = ""; 

async function sendChatMessage() {
    const inputEl = document.getElementById('chat-input');
    const msg = inputEl.value.trim();
    if (!msg || !requireApiKey()) return;

    inputEl.value = ""; // 전송 즉시 비우기
    appendChatMessage("teacher", msg);

    const loader = document.getElementById('chat-loader');
    if(loader) loader.style.display = 'block';

    try {
        const userApiKey = localStorage.getItem('gemini_api_key');
        const workerUrl = "https://script.google.com/macros/s/AKfycbwgx4RgF8FQxxL3jBgEQ5l369llADjhZ1NepulIdF4DdX18kBrB8oRQ4Ft0d5WdKtEF/exec";
        
        const backendSystemRubric = getSystemRubric();
        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: "chat_message",
                message: msg,
                currentChatContext: currentChatContext,
                backendEnhancedSystemRubric: backendSystemRubric,
                apiKey: userApiKey
            })
        });

        await checkApiError(response);
        const resData = await response.json();
        const aiResponse = resData.candidates[0].content.parts[0].text;

        appendChatMessage("ai", aiResponse);
        
        // 💬 성취수준 변경 합의 도달 시, 실시간 좌측 결과창 동기화 엔진 가동
        if (msg.includes("변경") || msg.includes("수정") || msg.includes("다시") || msg.includes("반영")) {
             reanalyzeAndSyncLayout(aiResponse);
        }

    } catch(e) {
        appendChatMessage("ai", "❌ 응답 오류가 발생했습니다: " + e.message);
    } finally {
        if(loader) loader.style.display = 'none';
    }
}

function appendChatMessage(sender, text) {
    const history = document.getElementById('chat-history');
    const msgEl = document.createElement('div');
    msgEl.style.marginBottom = '12px';
    msgEl.style.padding = '8px 12px';
    msgEl.style.borderRadius = '8px';
    msgEl.style.fontSize = '0.9rem';
    msgEl.style.lineHeight = '1.5';
    msgEl.style.wordBreak = 'break-all';

    if (sender === 'teacher') {
        msgEl.style.background = '#e0f2fe';
        msgEl.style.color = '#0369a1';
        msgEl.style.marginLeft = '20px';
        msgEl.style.textAlign = 'right';
        msgEl.innerHTML = `<strong>선생님:</strong><br>${text.replace(/\n/g, '<br>')}`;
    } else {
        msgEl.style.background = '#f1f5f9';
        msgEl.style.color = '#334155';
        msgEl.style.marginRight = '20px';
        msgEl.innerHTML = `<strong>🤖 AI 위원:</strong><br>${text.replace(/\n/g, '<br>')}`;
    }

    history.appendChild(msgEl);
    history.scrollTop = history.scrollHeight;
    
    if (window.MathJax) MathJax.typesetPromise([msgEl]);
}

// 💬 대화 이력을 기반으로 좌측 정밀 패널을 동적 재작성 및 수식 싱크하는 커스텀 인젝터
async function reanalyzeAndSyncLayout(lastAiMsg) {
    const historyBox = document.getElementById('chat-history');
    if (!historyBox || !requireApiKey()) return;

    try {
        const userApiKey = localStorage.getItem('gemini_api_key');
        const workerUrl = "https://script.google.com/macros/s/AKfycbwgx4RgF8FQxxL3jBgEQ5l369llADjhZ1NepulIdF4DdX18kBrB8oRQ4Ft0d5WdKtEF/exec";
        
        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: "reanalyze_chat",
                analysisMainMode: currentAnalysisMode,
                currentChatContext: currentChatContext,
                chatHistory: historyBox.innerText,
                apiKey: userApiKey
            })
        });

        await checkApiError(response);
        const resData = await response.json();
        const finalOptimizedOutput = resData.candidates[0].content.parts[0].text;

        const output = document.getElementById('analysis-output');
        if(output) {
            output.innerHTML = formatAiResult(finalOptimizedOutput);
            currentChatContext = finalOptimizedOutput; // 업데이트된 결과를 기준으로 컨텍스트 교체
            if (window.MathJax) MathJax.typesetPromise([output]);
        }
    } catch (err) {
        console.warn("대화 기반 동적 레이아웃 싱크 실패:", err);
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const preview = document.getElementById('image-preview');
    const container = document.getElementById('preview-container');
    const placeholder = document.getElementById('upload-placeholder');
    
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
        container.style.display = 'block';
        placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.target.result);
        reader.onerror = error => reject(error);
    });
}

// 💾 백그라운드 무중단 변형 알고리즘 트랜잭션 코어
function processAndSaveBackground(analysisText, apiKey) {
    return new Promise(async (resolve, reject) => {
        try {
            const workerUrl = "https://script.google.com/macros/s/AKfycbwgx4RgF8FQxxL3jBgEQ5l369llADjhZ1NepulIdF4DdX18kBrB8oRQ4Ft0d5WdKtEF/exec";
            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: "save_variant",
                    analysisText: analysisText,
                    apiKey: apiKey
                })
            });

            if(!response.ok) throw new Error("서버 다운스트림 거부");
            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text;

            // 정규식 매칭 분해법
            const qMatch = aiText.match(/문제:\s*([\s\S]*?)(?=정답:|$)/);
            const aMatch = aiText.match(/정답:\s*([\s\S]*)/);

            const finalQuestion = qMatch ? qMatch[1].trim() : "변형 문항 생성 실패";
            const finalAnswer = aMatch ? aMatch[1].trim() : "정답 산출 실패";

            let subject = currentSubject; 
            let standardCode = currentStandardCode;
            
            // 만약 한문제 분석이 아니고 시험지 일괄분석 모드 내부라면 서브 셀렉터 값을 추적
            const examSubjectEl = document.getElementById('admin-q-subject');
            if(examSubjectEl && examSubjectEl.value && examSubjectEl.value !== 'uncategorized') {
                subject = examSubjectEl.value;
            }

            await db.collection('transformed_bank').add({
                subject: subject,
                standard_code: standardCode || "unknown",
                question: finalQuestion,
                answer: finalAnswer,
                source: "🤖 AI 수석위원 교과협의 변형본",
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            resolve();
        } catch (err) {
            reject(err);
        }
    });
}

function resetAnalysis(keepPassages = false) {
    const probImg = document.getElementById('problem-image');
    if(probImg) probImg.value = "";
    
    const prevContainer = document.getElementById('preview-container');
    if(prevContainer) prevContainer.style.display = 'none';
    
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    if(uploadPlaceholder) uploadPlaceholder.style.display = 'block';
    
    if(document.getElementById('single-mode-ui')) document.getElementById('single-mode-ui').style.display = 'none';
    if(document.getElementById('multi-mode-ui')) document.getElementById('multi-mode-ui').style.display = 'none';
    if(document.getElementById('analyze-single-btn')) document.getElementById('analyze-single-btn').style.display = 'none';
    if(document.getElementById('analyze-multi-btn')) document.getElementById('analyze-multi-btn').style.display = 'none';
    
    const analysisResult = document.getElementById('analysis-result');
    if(analysisResult) analysisResult.style.display = 'none';
    
    const cropCanvas = document.getElementById('crop-canvas');
    if(cropCanvas) cropCanvas.style.display = 'none';

    cropBoxes = [];
    const cropCount = document.getElementById('crop-count');
    if(cropCount) cropCount.innerText = "0개 영역 지정됨";
    
    const chatContainer = document.getElementById('ai-chat-container');
    if(chatContainer) {
        chatContainer.style.display = 'none';
        chatContainer.style.position = 'relative'; 
        chatContainer.style.width = '280px';
        
        const chatHistory = document.getElementById('chat-history');
        if(chatHistory) chatHistory.innerHTML = "";
        currentChatContext = ""; 
    }

    // 고정되었던 문제 패널 해제
    const wrapper = document.getElementById('analysis-layout-wrapper');
    if (wrapper) {
        wrapper.style.position = 'relative'; 
        wrapper.style.display = 'block'; 
    }

    const mainContainer = document.querySelector('.container');
    if (mainContainer) {
        mainContainer.style.maxWidth = ''; 
    }

    // 🟢 완전히 새로 시작할 때만(keepPassages가 false일 때만) 보관함을 닫고 데이터를 비웁니다.
    if (keepPassages !== true) {
        const tray = document.getElementById('common-passage-tray');
        const icon = document.getElementById('tray-icon');
        if (tray) tray.style.display = 'none';
        if (icon) icon.innerText = '📚';

        commonPassages = [];
        if(document.getElementById('passage-thumbnails')) document.getElementById('passage-thumbnails').innerHTML = '';
    }
}

// ==========================================

function updateMathPreview(idx, val) {
    const preview = document.getElementById(`math-preview-${idx}`);
    if (preview) {
        preview.innerHTML = val.replace(/\n/g, '<br>');
        if (window.MathJax) MathJax.typesetPromise([preview]);
    }
}

// ==========================================

let extractedQuestionsArray = []; 
let currentUploadedFileBase64 = null; 

async function handleExamUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const loadingZone = document.getElementById('exam-loading');
    if(loadingZone) loadingZone.style.display = 'flex';

    try {
        const base64 = await fileToBase64(file);
        currentUploadedFileBase64 = base64; 
        
        // 🚀 대용량 파일의 안정적인 렌더링을 위해 전송 모듈을 비동기 분리 사출 처리함
        setTimeout(() => {
            startExamAiAnalysis(base64);
        }, 300);

    } catch (err) {
        alert("파일 처리 실패: " + err.message);
        if(loadingZone) loadingZone.style.display = 'none';
    }
}

async function startExamAiAnalysis(base64Data) {
    if (!requireApiKey()) { document.getElementById('exam-loading').style.display = 'none'; return; }
    const loadingEl = document.getElementById('exam-loading');
    if (loadingEl) loadingEl.style.display = 'flex';

    // 🟢 화면에서 입력된 시작/끝 번호 가져오기
    const startNum = document.getElementById('exam-start-num')?.value || "1";
    const endNum = document.getElementById('exam-end-num')?.value || "10";

    try {
        const mimeTypeMatch = base64Data.match(/data:(.*?);base64/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
        const base64Clean = base64Data.split(',')[1];
        const referenceDBText = await fetchReferenceQuestions(currentSubject);

        const workerUrl = "https://script.google.com/macros/s/AKfycbwgx4RgF8FQxxL3jBgEQ5l369llADjhZ1NepulIdF4DdX18kBrB8oRQ4Ft0d5WdKtEF/exec";
        const userApiKey = localStorage.getItem('gemini_api_key');
        
        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: "exam_analysis",
                mimeType: mimeType,
                base64Clean: base64Clean,
                referenceDBText: referenceDBText,
                subject: currentSubject,
                startNum: startNum,  // 🟢 백엔드로 출발!
                endNum: endNum,      // 🟢 백엔드로 출발!
                apiKey: userApiKey
            })
        });

        await checkApiError(response);
        const resData = await response.json();
        const aiRawOutput = resData.candidates[0].content.parts[0].text;
        
        parseExamAiOutput(aiRawOutput);

    } catch (error) {
        alert("AI 시험지 스캔 연동 실패: " + error.message);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

function parseExamAiOutput(rawText) {
    // === 구분자를 기준으로 문항들을 조각조각 분해
    const blocks = rawText.split('---').map(b => b.trim()).filter(b => b.length > 0);
    extractedQuestionsArray = [];

    blocks.forEach(block => {
        // 정규식 토큰 분해 엔진 가동
        const numMatch = block.match(/\[번호\]\s*([^\s|]+)/);
        const scoreMatch = block.match(/\[배점\]\s*([^\s|]+)/);
        
        if (numMatch) {
            // [번호] 태그가 포함된 첫 줄 라인을 완전히 지워 순수한 문항 텍스트만 도려냄
            const cleanText = block.replace(/^\[번호\][\s\S]*?\n/, '').trim();
            
            extractedQuestionsArray.push({
                num: numMatch[1].replace(/번/g, '').trim(),
                score: scoreMatch ? scoreMatch[1].replace(/점/g, '').trim() : "4.5",
                text: cleanText,
                image: null 
            });
        }
    });

    renderQuestionCards();
    
    // 업로드 컨트롤 공간 뷰 변환
    document.getElementById('exam-upload-placeholder').style.display = 'none';
    document.getElementById('exam-editor-zone').style.display = 'block';
}

function renderQuestionCards() {
    const listContainer = document.getElementById('extracted-questions-list');
    listContainer.innerHTML = "";
    
    extractedQuestionsArray.forEach((q, idx) => {
        const qCard = document.createElement('div');
        qCard.className = "quiz-container";
        qCard.style.marginBottom = "1rem";
        qCard.style.borderLeft = "4px solid #ea580c";

        qCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                <div style="font-weight: bold; color: #ea580c; display: flex; align-items: center; gap: 5px;">
                    [문항 <input type="text" value="${q.num || (idx + 1)}" onchange="extractedQuestionsArray[${idx}].num = this.value" style="width: 45px; padding: 2px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center; font-weight: bold; color: #ea580c;">]
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <select id="ai-diff-${idx}" style="padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px; max-width: 200px;">
                        <option value="" disabled selected>난이도 선택</option>
                        <option value="상">상</option>
                        <option value="중">중</option>
                        <option value="하">하</option>
                    </select>
                    <label style="font-size: 0.85rem; margin-left: 5px;">배점:</label>
                    <input type="number" step="0.1" class="path2-score-input" value="${q.score || 0}" 
                           onchange="extractedQuestionsArray[${idx}].score = this.value"
                           style="width: 55px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <button onclick="deleteQuestion(${idx})" style="background:#fee2e2; color:#ef4444; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem;">삭제</button>
                    ${idx > 0 ? `<button onclick="mergeWithPrevious(${idx})" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem;">위와 합치기</button>` : ''}
                </div>
            </div>
            
            <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 3px; font-weight: bold;">✏️ 문항 텍스트 원본 수정 (수식이나 화학식은 $ 기호로 감싸주세요)</div>
            <textarea class="q-edit-area" oninput="updateMathPreview(${idx}, this.value)"
                      style="width: 100%; height: 100px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; font-family: inherit; margin-bottom: 10px; line-height: 1.5;">${q.text}</textarea>
            
            <div id="math-preview-section-${idx}">
                <div style="font-size: 0.85rem; font-weight: bold; color: #3b82f6; margin-bottom: 3px;">👀 최종 출력 미리보기 (수식 자동 변환)</div>
                <div id="math-preview-${idx}" style="padding: 10px; background: #f8fafc; border: 1px dashed #3b82f6; border-radius: 4px; font-size: 0.95rem; min-height: 40px; margin-bottom: 10px; line-height: 1.6;">
                    ${q.text.replace(/\n/g, '<br>')}
                </div>
            </div>

            <div id="q-image-container-${idx}" style="margin-top: 10px; text-align: center;">
                ${q.image ? `
                    <div style="position: relative; display: inline-block; max-width: 100%;">
                        <img src="${q.image}" style="max-width:100%; border:1px solid #e2e8f0; border-radius:4px;">
                        <button onclick="removeQuestionImage(${idx})" style="position: absolute; top: 5px; right: 5px; background: #ef4444; color: white; border: none; border-radius: 4px; padding: 3px 8px; font-size: 0.75rem; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">❌ 그림 지우기</button>
                    </div>
                ` : ''}
            </div>
            
            <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 10px; border-radius: 6px; margin-top: 10px; text-align: left;">
                <p style="margin: 0 0 5px 0; font-size: 0.8rem; font-weight: bold; color: #92400e;">🖼️ 그림/도표 넣는 방법</p>
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button onclick="startPartialCapture(${idx})" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem;">📸 자체 캡처 (이미지용)</button>
                    <button onclick="pasteImageToQuestion(${idx})" style="background:#fef3c7; border:1px solid #fde68a; color:#92400e; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:bold;">📋 복사한 그림 붙여넣기 (PDF용)</button>
                </div>
            </div>
        `;
        listContainer.appendChild(qCard);
    });

    let applyBtnContainer = document.getElementById('external-apply-btn-zone');
    if (!applyBtnContainer) {
        applyBtnContainer = document.createElement('div');
        applyBtnContainer.id = 'external-apply-btn-zone';
        applyBtnContainer.style.textAlign = 'right';
        applyBtnContainer.style.margin = '15px 0';
        
        const wrapper = document.getElementById('exam-inspector-wrapper');
        if (wrapper) wrapper.parentNode.insertBefore(applyBtnContainer, wrapper.nextSibling);
    }
    
    if (extractedQuestionsArray.length > 0) {
        applyBtnContainer.innerHTML = `
            <div style="background: #f0fdf4; padding: 1.5rem; border-radius: 8px; border: 1px solid #bbf7d0; text-align: center; margin-bottom: 1rem;">
                <h4 style="margin: 0 0 10px 0; color: #166534; font-size: 1.1rem;">💡 성취평가제 신뢰도 제고에 기여해 주세요!</h4>
                <p style="margin: 0 0 1.5rem 0; font-size: 0.9rem; color: #15803d; line-height: 1.6; text-align: center;">
                    분석된 시험지 문항들을 문제은행에 공유해 주시겠습니까?<br>
                    (저작권 보호를 위해 AI가 숫자와 상황을 변형하여 안전하게 저장합니다.)
                </p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button class="save-btn" onclick="saveBankAndApplyTable()" style="background: #10b981; display: inline-block; width: auto; margin: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.2); font-size: 1.05rem;">💾 문제은행에 저장하고 표에 반영</button>
                    <button class="save-btn" onclick="sendAiResultsToTable()" style="background: #64748b; display: inline-block; width: auto; margin: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.2); font-size: 1.05rem;">🗑️ 저장하지 않고 표에만 반영</button>
                </div>
            </div>
        `;
        applyBtnContainer.style.display = 'block';
    } else {
        applyBtnContainer.style.display = 'none';
    }

    if (window.MathJax) MathJax.typesetPromise([listContainer]);
}

// ==========================================

let cropBoxes = []; 
let currentTargetQuestionIndex = -1; 

function startPartialCapture(idx) {
    currentTargetQuestionIndex = idx; 
    
    const canvas = document.getElementById('crop-canvas');
    const ctx = canvas.getContext('2d');
    const img = document.getElementById('exam-img-display');
    
    if(!img || !img.src || img.style.display === 'none') {
        alert("캡처할 수 있는 원본 시험지 이미지 파일이 왼쪽에 로드되어 있지 않습니다."); return;
    }

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.style.display = 'block';
    
    ctx.drawImage(img, 0, 0);
    alert("📸 [마우스 드래그 가이드]\n왼쪽 원본 이미지 위에서 마우스를 드래그하여 문제 영역을 사각형으로 지정한 후, 키보드의 [Enter]를 누르면 완벽하게 캡처 영역이 주입됩니다.");
    
    initCropCanvasEvents(canvas, ctx);
}

function initCropCanvasEvents(canvas, ctx) {
    let isDrawing = false; let startX=0; let startY=0; let endX=0; let endY=0;
    
    canvas.onmousedown = (e) => {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
        startX = (e.clientX - rect.left) * scaleX; startY = (e.clientY - rect.top) * scaleY;
    };

    canvas.onmousemove = (e) => {
        if(!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
        endX = (e.clientX - rect.left) * scaleX; endY = (e.clientY - rect.top) * scaleY;
        
        // 실시간 가이드라인 잔상 삭제 및 재생성
        const img = document.getElementById('exam-img-display');
        ctx.drawImage(img, 0, 0);
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
    };

    canvas.onmouseup = () => { isDrawing = false; };
    
    // 엔터키 입력 감지 리스너
    window.onkeydown = (e) => {
        if (e.key === 'Enter' && canvas.style.display === 'block') {
            const w = endX - startX; const h = endY - startY;
            if(Math.abs(w) < 5 || Math.abs(h) < 5) return;

            const resCanvas = document.createElement('canvas');
            resCanvas.width = Math.abs(w); resCanvas.height = Math.abs(h);
            const resCtx = resCanvas.getContext('2d');
            
            const img = document.getElementById('exam-img-display');
            resCtx.drawImage(img, startX, startY, w, h, 0, 0, Math.abs(w), Math.abs(h));
            
            extractedQuestionsArray[currentTargetQuestionIndex].image = resCanvas.toDataURL('image/jpeg');
            canvas.style.display = 'none';
            window.onkeydown = null; // 리스너 자원 해제
            renderQuestionCards(); 
        }
    };
}

// ==========================================

let parsedScores = []; 
let lastBatchDiff = '중'; 

let unsubscribeProject = null; 

// ==========================================

function initDashboard() {
    db.collection('transformed_bank').get().then(snapshot => {
        let cnt = snapshot.size;
        const dashboardCnt = document.getElementById('dashboard-q-count');
        if(dashboardCnt) dashboardCnt.innerText = `${cnt}개 문항 축적됨`;
    }).catch(e => console.warn("대시보드 통계 로드 실패", e));
}

// ==========================================
// 🛠️ 지필평가 자동 레이아웃 생성 코어 엔진 
// ==========================================
async function generateEmptyScoreTable() {
    const countInput = document.getElementById('setup-q-count');
    const count = parseInt(countInput.value) || 0;
    if (count <= 0) { alert("올바른 문항 수를 입력하세요."); return; }

    if(!confirm(`총 ${count}문항 크기의 빈 협업 채점표 인프라를 클라우드에 새로 생성하시겠습니까?\n(기존에 분석 및 판정해둔 정보는 모두 초기화됩니다.)`)) return;

    let emptyScores = [];
    for(let i = 1; i <= count; i++) {
        emptyScores.push({
            num: String(i),
            score: 4.0,
            difficulty: "중",
            level: "판정필요",
            isShortAnswer: false,
            reason: "수동으로 생성된 빈 문항 인프라 베이스 공간입니다."
        });
    }

    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            let assessments = doc.data().assessments;
            assessments[currentEditingAssessmentIndex].parsedScores = emptyScores;
            transaction.update(docRef, { assessments: assessments });
        });
        alert(`🎯 총 ${count}문항 규모의 실시간 클라우드 채점 매트릭스가 완벽히 배포되었습니다!`);
    } catch(e) { alert("테이블 생성 실패: " + e.message); }
}

function downloadScoreTemplate() {
    let csvContent = "\uFEFF문항번호,배점(숫자만),난이도(상/중/하),isShortAnswer(true/false)\n";
    for(let i=1; i<=20; i++) {
        csvContent += `${i},4.5,중,false\n`;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "지필평가_문항배점_양식지.csv";
    link.click();
}

function handleExcelUpload(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            let uploadedScores = [];
            jsonData.forEach((row, idx) => {
                const num = row['문항번호'] ? row['문항번호'].toString().trim() : String(idx+1);
                const score = parseFloat(row['배점(숫자만)']) || 4.0;
                const diff = row['난이도(상/중/하)'] ? row['난이도(상/중/하)'].toString().trim() : "중";
                const isShort = row['isShortAnswer(true/false)'] ? row['isShortAnswer(true/false)'].toString().toLowerCase().trim() === 'true' : false;

                uploadedScores.push({
                    num: num, score: score, difficulty: diff,
                    level: "판정필요", isShortAnswer: isShort,
                    reason: "엑셀 데이터 일괄 업로드 방식으로 반영된 원본 배점 속성 파일입니다."
                });
            });

            const docRef = db.collection('user_projects').doc(currentProjectId);
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(docRef);
                let assessments = doc.data().assessments;
                assessments[currentEditingAssessmentIndex].parsedScores = uploadedScores;
                transaction.update(docRef, { assessments: assessments });
            });
            alert(`📈 성공! 총 ${uploadedScores.length}개 문항의 배점 속성 테이블이 일괄 동기화되었습니다.`);
            document.getElementById('excel-file-input').value = "";
        } catch(err) { alert("파일 파싱 에러: " + err.message); }
    };
    reader.readAsArrayBuffer(file);
}

function handleNextToPath1Result() {
    goToStep(3); 
    calculateTotalCutScores(); 
}

function goBackStep(currentStep) {
    if (currentStep === 2) {
        if (unsubscribeProject) { unsubscribeProject(); unsubscribeProject = null; }
        document.getElementById('cut-score-step2').style.display = 'none';
        document.getElementById('project-detail-view').style.display = 'block';
        document.getElementById('dynamic-indicator-bar').style.display = 'none';
        loadProjectDetails();
    } else {
        goToStep(currentStep - 1);
    }
}

function updateStep2Total() {
    let total = 0;
    document.querySelectorAll('.score-input').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    const currentPath2TotalSpan = document.getElementById('current-path2-total');
    if(currentPath2TotalSpan) currentPath2TotalSpan.innerText = total.toFixed(1);
}

// ==========================================
// 🔮 이원목적분류표 기반 대칭형 컷오프 연산 코어 
// ==========================================
function calculateTotalCutScores() {
    const listEl = document.getElementById('step3-summary-list');
    const finalBoxes = document.getElementById('final-cut-score-boxes');
    
    let html = `<table class="score-table"><thead><tr style="background:#f1f5f9;"><th>문항</th><th>배점</th><th>내 판정</th><th>동료 교사 최종 합의 수준</th></tr></thead><tbody>`;
    
    let scoreSum = 0;
    let totals = { A: 0, B: 0, C: 0, D: 0, E: 0 };

    db.collection('user_projects').doc(currentProjectId).get().then(doc => {
        if(!doc.exists) return;
        const asm = doc.data().assessments[currentEditingAssessmentIndex];
        const baseQuestions = asm.parsedScores || [];
        const teacherInputs = asm.teacherInputs || {};

        baseQuestions.forEach((q, qIdx) => {
            // 🔒 핵심 알고리즘: 다수결 합의 원칙 필터링 기법 탑재
            let votes = { 'A+':0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0 };
            
            // 모든 공동작업자의 데이터 투표 취합
            Object.keys(teacherInputs).forEach(email => {
                const lvl = teacherInputs[email]?.[qIdx]?.level;
                if (lvl && votes[lvl] !== undefined) votes[lvl]++;
            });

            // 과반수 혹은 최고득표 레벨 판정 (동점시 높은 수준 우선 방어막)
            let agreedLevel = q.level || 'C'; // 기본값은 AI 판정 결과로 디펜스 설정
            let maxVotes = 0;
            ['A+','A', 'B', 'C', 'D', 'E'].forEach(l => {
                if (votes[l] >= maxVotes && votes[l] > 0) {
                    maxVotes = votes[l]; agreedLevel = l;
                }
            });

            const score = q.score || 0;
            scoreSum += score;

            // 누적 컷오프 분할 스코어링 테이블 연산 가동
            if (agreedLevel === 'A+' || agreedLevel === 'A') {
                totals.A += score; totals.B += score; totals.C += score; totals.D += score; totals.E += score;
            } else if (agreedLevel === 'B') {
                totals.A += (score * 0.2); totals.B += score; totals.C += score; totals.D += score; totals.E += score;
            } else if (agreedLevel === 'C') {
                totals.B += (score * 0.15); totals.C += score; totals.D += score; totals.E += score;
            } else if (agreedLevel === 'D') {
                totals.C += (score * 0.1); totals.D += score; totals.E += score;
            } else if (agreedLevel === 'E') {
                totals.D += (score * 0.05); totals.E += score;
            }

            html += `<tr>
                <td><strong>${q.num}</strong></td>
                <td><span style="color:#2563eb; font-weight:bold;">${score}점</span></td>
                <td><span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:bold;">${teacherInputs[auth.currentUser.email]?.[qIdx]?.level || '미선택'}</span></td>
                <td><span style="background:#ea580c; color:white; padding:2px 8px; border-radius:4px; font-weight:bold;">${agreedLevel}</span></td>
            </tr>`;
        });

        // 분할점수 산출 알고리즘 수식 결과 최소 한계선 보정 필터링
        if (totals.A > scoreSum * 0.92) totals.A = scoreSum * 0.90;
        if (totals.B > totals.A) totals.B = totals.A - 4;
        if (totals.C > totals.B) totals.C = totals.B - 5;
        if (totals.D > totals.C) totals.D = totals.C - 5;

        // 고정 최소 방어막 스코어 라인 가동
        if (totals.A < 75) totals.A = 80.0;
        if (totals.B < 65) totals.B = 70.0;
        if (totals.C < 55) totals.C = 60.0;
        if (totals.D < 45) totals.D = 50.0;

        html += `</tbody>
            <tfoot style="background:#fffbeb; font-weight:bold;">
                <tr><td>총 배점 합계</td><td style="color:#ea580c; font-size:1.1rem;" colspan="3">${scoreSum.toFixed(1)} 점</td></tr>
            </tfoot></table>`;
        listEl.innerHTML = html;

        finalBoxes.innerHTML = `
            <div class="result-box-card" style="border-color:#ef4444;"><strong style="color:#ef4444;">A 기준선 (우수)</strong><br><span>${totals.A.toFixed(1)}점 이상</span></div>
            <div class="result-box-card" style="border-color:#f59e0b;"><strong style="color:#f59e0b;">B 기준선</strong><br><span>${totals.B.toFixed(1)}점 이상</span></div>
            <div class="result-box-card" style="border-color:#22c55e;"><strong style="color:#22c55e;">C 기준선 (보통)</strong><br><span>${totals.C.toFixed(1)}점 이상</span></div>
            <div class="result-box-card" style="border-color:#3b82f6;"><strong style="color:#3b82f6;">D 기준선</strong><br><span>${totals.D.toFixed(1)}점 이상</span></div>
            <div class="result-box-card" style="border-color:#64748b;"><strong style="color:#64748b;">E 기준선 (최소)</strong><br><span>${totals.E.toFixed(1)}점 미만</span></div>
        `;
    });
}

// ==========================================
// 🛠️ 국가 성취기준 관리자 모드: 서버 동기화 패키지 
// ==========================================
let currentEditingAllStandards = [];

async function loadStandardsForEdit() {
    const sub = document.getElementById('admin-edit-subject').value;
    const list = document.getElementById('admin-standards-edit-list');
    list.innerHTML = "<option value=''>로딩 중... ⏳</option>";

    if (!sub) return;

    try {
        const snapshot = await db.collection('standards_2022').where('subject', '==', sub).get();
        currentEditingAllStandards = [];
        list.innerHTML = "<option value=''>-- 수정할 성취기준 선택 --</option>";

        if (snapshot.empty) { list.innerHTML = "<option value=''>등록된 성취기준이 없습니다.</option>"; return; }

        snapshot.forEach(doc => {
            const data = doc.data();
            currentEditingAllStandards.push({ id: doc.id, ...data });
            list.innerHTML += `<option value="${doc.id}">[${data.code}] ${data.desc.substring(0,25)}...</option>`;
        });
    } catch(e) { list.innerHTML = "<option value=''>데이터 로드 실패</option>"; }
}

function populateEditFields() {
    const id = document.getElementById('admin-standards-edit-list').value;
    const box = document.getElementById('admin-edit-fields-box');
    
    if(!id) { box.style.display = 'none'; return; }
    
    const std = currentEditingAllStandards.find(item => item.id === id);
    if (!std) return;

    document.getElementById('edit-std-code').value = std.code || "";
    document.getElementById('edit-std-desc').value = std.desc || "";
    document.getElementById('edit-std-high').value = std.levels?.high || "";
    document.getElementById('edit-std-mid').value = std.levels?.mid || "";
    document.getElementById('edit-std-low').value = std.levels?.low || "";
    
    box.style.display = 'block';
}

async function saveStandardToDB() {
    const sub = document.getElementById('admin-edit-subject').value;
    const code = document.getElementById('edit-std-code').value.trim();
    const desc = document.getElementById('edit-std-desc').value.trim();
    if (!sub || !code || !desc) { alert("과목, 코드, 성취기준 내용은 필수입니다."); return; }

    const stdData = {
        subject: sub, code: code, desc: desc,
        levels: {
            high: document.getElementById('edit-std-high').value.trim(),
            mid: document.getElementById('edit-std-mid').value.trim(),
            low: document.getElementById('edit-std-low').value.trim()
        }
    };

    try {
        await db.collection('standards_2022').add(stdData);
        alert("✨ 새로운 국가 성취기준이 마스터 테이블에 업로드되었습니다!");
        loadStandardsForEdit();
    } catch(e) { alert("추가 실패: " + e.message); }
}

async function updateStandardInDB() {
    const id = document.getElementById('admin-standards-edit-list').value;
    if(!id) return;

    const stdData = {
        code: document.getElementById('edit-std-code').value.trim(),
        desc: document.getElementById('edit-std-desc').value.trim(),
        levels: {
            high: document.getElementById('edit-std-high').value.trim(),
            mid: document.getElementById('edit-std-mid').value.trim(),
            low: document.getElementById('edit-std-low').value.trim()
        }
    };

    if(confirm("수정 사항을 클라우드 마스터 서버에 반영하시겠습니까?")) {
        try {
            await db.collection('standards_2022').doc(id).update(stdData);
            alert("✅ 정상적으로 마스터 서버 데이터가 동기화되었습니다.");
            loadStandardsForEdit();
        } catch(e) { alert("수정 실패: " + e.message); }
    }
}

async function deleteStandardFromDB() {
    const id = document.getElementById('admin-standards-edit-list').value;
    if(!id) return;

    if(confirm("🚨 경고: 이 국가 성취기준을 데이터베이스에서 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
        try {
            await db.collection('standards_2022').doc(id).delete();
            alert("🗑️ 성취기준이 파쇄 삭제되었습니다.");
            document.getElementById('admin-edit-fields-box').style.display = 'none';
            loadStandardsForEdit();
        } catch(e) { alert("삭제 실패: " + e.message); }
    }
}

// ==========================================
// 🛠️ 문제은행 문항 수동 관리자 패널 확장 모듈
// ==========================================
let currentEditingAllQuestions = [];

async function loadStandardsForQuestion() {
    const sub = document.getElementById('admin-q-subject').value;
    const stdSelect = document.getElementById('admin-q-standard');
    const manageStdSelect = document.getElementById('admin-manage-q-standard'); 
    
    stdSelect.innerHTML = "<option value=''>로딩 중...</option>";
    if(manageStdSelect) manageStdSelect.innerHTML = "<option value=''>로딩 중...</option>";

    if (!sub) return;

    try {
        const snapshot = await db.collection('standards_2022').where('subject', '==', sub).get();
        let html = "<option value=''>-- 연계할 성취기준 선택 --</option>";
        
        snapshot.forEach(doc => {
            const data = doc.data();
            html += `<option value="${doc.id}">${data.code} ${data.desc.substring(0,25)}...</option>`;
        });
        
        stdSelect.innerHTML = html;
        if(manageStdSelect) manageStdSelect.innerHTML = html.replace("-- 연계할 성취기준 선택 --", "-- 관리할 성취기준 선택 --");
        
        await updateQuestionCount(); 
    } catch(e) { 
        stdSelect.innerHTML = "<option value=''>로드 실패</option>"; 
    }
}

async function saveQuestionToDB() {
    const sub = document.getElementById('admin-q-subject').value;
    const stdSelect = document.getElementById('admin-q-standard');
    const text = document.getElementById('admin-q-text').value.trim();
    const answer = document.getElementById('admin-q-answer').value.trim();
    
    if (!sub || !stdSelect.value || !text) { alert("과목, 성취기준, 문항 내용은 필수 항목입니다."); return; }
    
    const stdCode = stdSelect.options[stdSelect.selectedIndex].text.split(' ')[0];

    const qData = {
        subject: sub,
        standard_code: stdCode,
        question: text,
        answer: answer,
        level: document.getElementById('admin-q-level').value,
        reason: document.getElementById('admin-q-reason').value.trim(),
        source: "교사 직접 입력 서랍",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('transformed_bank').add(qData);
        alert("✨ 새로운 평가 문항이 문제은행 DB에 성공적으로 적재되었습니다!");
        document.getElementById('admin-q-text').value = "";
        document.getElementById('admin-q-answer').value = "";
        document.getElementById('admin-q-reason').value = "";
        
        await updateQuestionCount(); 
    } catch(e) { alert("문항 저장 실패: " + e.message); }
}

function loadStandardsForManage() {
    loadStandardsForQuestion(); 
}

// 🟢 [부활 및 교정 완료] 공통지문 보관함 변수 바인딩
let commonPassages = []; 

// ==========================================
// 🛠️ 관리자 모드: 기존 문항(Question) 로드 및 수정/삭제 정교화 엔진
// ==========================================
async function loadQuestionsForEdit() {
    const stdSelect = document.getElementById('admin-manage-q-standard');
    const docId = stdSelect.value;
    const fields = document.getElementById('question-edit-fields');
    fields.style.display = 'none';

    if (!docId) return;

    const stdCode = stdSelect.options[stdSelect.selectedIndex].text.split(' ')[0];
    const qSelect = document.getElementById('admin-manage-q-list');
    qSelect.innerHTML = '<option value="">문항을 불러오는 중... ⏳</option>';

    try {
        const snapshot = await db.collection('transformed_bank')
                                 .where('standard_code', '==', stdCode)
                                 .get();
        
        currentEditingAllQuestions = []; 
        qSelect.innerHTML = '<option value="">-- 수정할 문항 선택 --</option>';

        if (snapshot.empty) {
            qSelect.innerHTML = '<option value="">등록된 문항이 없습니다.</option>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            currentEditingAllQuestions.push({ id: doc.id, ...data }); 
            qSelect.innerHTML += `<option value="${doc.id}">[${data.level}] ${data.question.substring(0, 30)}...</option>`;
        });
    } catch (error) {
        qSelect.innerHTML = '<option value="">데이터 로드 실패</option>';
    }
}

// 🟢 [버그 수정 완료] 문자열 ID 매칭 검색 및 컬렉션 필드명 동기화 보완
function populateQuestionEditFields() {
    const idx = document.getElementById('admin-manage-q-list').value; // doc.id 문자열 값
    const fields = document.getElementById('question-edit-fields');
    if (idx === "") { fields.style.display = 'none'; return; }

    // 고유 ID 기반 조건부 탐색으로 변경하여 undefined 에러 원천 차단
    const q = currentEditingAllQuestions.find(item => item.id === idx);
    if (!q) return;

    // 변수명 동기화 교정 (q.q -> q.question)
    document.getElementById('manage-q-text').value = q.question || "";
    document.getElementById('manage-q-answer').value = q.answer || "";
    document.getElementById('manage-q-level').value = q.level || "C";
    document.getElementById('manage-q-reason').value = q.reason || "";
    fields.style.display = 'block';
}

async function updateQuestionInDB() {
    const qDocId = document.getElementById('admin-manage-q-list').value;
    if (!qDocId) return;

    const updatedData = {
        question: document.getElementById('manage-q-text').value.trim(),
        answer: document.getElementById('manage-q-answer').value.trim(),
        level: document.getElementById('manage-q-level').value,
        reason: document.getElementById('manage-q-reason').value.trim()
    };

    if (confirm("문항 내용을 수정하시겠습니까?")) {
        try {
            await db.collection('transformed_bank').doc(qDocId).update(updatedData);
            alert("✅ 문항이 성공적으로 수정되었습니다!");
            loadQuestionsForEdit(); 
        } catch(e) { alert("수정 실패: " + e.message); }
    }
}

async function deleteQuestionFromDB() {
    const qDocId = document.getElementById('admin-manage-q-list').value;
    if (!qDocId) return;

    if (confirm("🚨 이 문항을 영구 삭제하시겠습니까?")) {
        try {
            await db.collection('transformed_bank').doc(qDocId).delete();
            alert("🗑️ 문항이 삭제되었습니다.");
            loadQuestionsForEdit(); 
        } catch(e) { alert("삭제 실패: " + e.message); }
    }
}

// ==========================================
// 📂 사용자 폴더(프로젝트) 관리 및 공동체 협업 시스템
// ==========================================
let currentProjectId = null;

async function loadProjects() {
    const user = auth.currentUser;
    const listEl = document.getElementById('project-folder-list');
    
    if(!user) {
        listEl.innerHTML = '<p style="color:#ef4444; grid-column: 1 / -1; text-align: center;">⚠️ 폴더를 관리하려면 구글 로그인이 필요합니다.</p>';
        return;
    }

    listEl.innerHTML = '<p style="color: #64748b; grid-column: 1 / -1; text-align: center;">폴더를 불러오는 중...</p>';

    try {
        const myOwnSnapshot = await db.collection('user_projects').where('ownerEmail', '==', user.email).get();
        const sharedSnapshot = await db.collection('user_projects').where('collaborators', 'array-contains', user.email).get();
        
        let myProjects = [];
        myOwnSnapshot.forEach(doc => myProjects.push({ id: doc.id, ...doc.data() }));
        
        let sharedProjects = [];
        sharedSnapshot.forEach(doc => {
            if (doc.data().uid !== user.uid) sharedProjects.push({ id: doc.id, ...doc.data() }); 
        });
        
        const sortByDate = (a, b) => (b.createdAt ? b.createdAt.toMillis() : 0) - (a.createdAt ? a.createdAt.toMillis() : 0);
        myProjects.sort(sortByDate);
        sharedProjects.sort(sortByDate);

        if(myProjects.length === 0 && sharedProjects.length === 0) {
            listEl.innerHTML = '<p style="color:#64748b; grid-column: 1 / -1; text-align: center;">생성된 폴더가 없습니다. 우측 상단의 [+ 새 폴더 만들기]를 눌러보세요!</p>';
            return;
        }

        let html = '';

        const renderCards = (projects, isOwnerList) => {
            let cardHtml = '';
            projects.forEach(data => {
                const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : "방금 전";
                let badges = data.assessments && data.assessments.length > 0 
                    ? [...data.assessments].sort((a,b)=> (a.type==='written'&&b.type!=='written')?-1:1).map(a => `<span style="display:inline-block; background:${a.type === 'written' ? '#3b82f6' : '#10b981'}; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-right:4px; margin-top:4px;">${a.name}</span>`).join('') 
                    : '<span style="font-size: 0.75rem; color: #94a3b8;">평가 내역 없음</span>';
        
                const deleteBtn = isOwnerList ? `<button onclick="deleteProject('${data.id}', event)" style="position: absolute; top: 15px; right: 15px; background: #fee2e2; color: #ef4444; border: none; padding: 2px 5px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.65rem; z-index: 10;">폴더 삭제</button>` : '';
                
                const memberManagementBtns = isOwnerList ? `
                    <div style="position: absolute; top: 42px; right: 15px; display: flex; gap: 4px; z-index: 10;">
                        <button onclick="inviteCollaborator('${data.id}', event)" style="background: #dbeafe; color: #1e40af; border: none; padding: 2px 5px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.65rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">🤝 팀원 초대</button>
                        <button onclick="kickFromProject('${data.id}', event)" style="background: #ffedd5; color: #c2410c; border: none; padding: 2px 5px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.65rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">🚫 팀원 삭제</button>
                    </div>
                ` : '';
                
                const listTop = isOwnerList ? '68px' : '10px';
                
                let memberHtml = `<div style="position: absolute; top: ${listTop}; right: 15px; display: flex; flex-direction: column; gap: 3px; align-items: flex-end; z-index: 5;">`;
                memberHtml += '<span style="font-size: 0.6rem; color: #64748b; font-weight: bold; margin-bottom: 2px;">👥 참여 명단:</span>';
                const memberList = data.collaborators ? data.collaborators.map(e => e.split('@')[0]) : [user.email.split('@')[0]];
                
                memberList.forEach(member => {
                    memberHtml += `<span style="font-size: 0.6rem; color: #10b981; font-weight: bold; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); white-space: nowrap;">👤 ${member}</span>`;
                });
                memberHtml += '</div>';
        
                cardHtml += `
                <div style="position: relative; border: 1px solid #cbd5e1; border-radius: 8px; padding: 1.5rem; background: white; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); min-height: 120px;" 
                     onmouseover="this.style.borderColor='#3b82f6'; this.style.transform='translateY(-3px)';" 
                     onmouseout="this.style.borderColor='#cbd5e1'; this.style.transform='none';">
                     
                    ${deleteBtn}
                    ${memberManagementBtns}
                    ${memberHtml}
                    
                    <div onclick="openProject('${data.id}', '${data.name}')" style="padding-right: 110px;">
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📁</div>
                        <h4 style="margin: 0 0 0.5rem 0; color: #1e293b; font-size: 1.1rem; word-break: keep-all;">${data.name}</h4>
                        <p style="margin: 0 0 0.5rem 0; font-size: 0.8rem; color: #64748b;">생성일: ${dateStr}</p>
                        <div style="border-top: 1px dashed #cbd5e1; padding-top: 0.8rem; margin-top: 15px;">${badges}</div>
                    </div>
                </div>`;
            });
            return cardHtml;
        };

        if (myProjects.length > 0) {
            html += `<div style="grid-column: 1 / -1; margin-top: 1rem;"><h3 style="color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;">👤 내가 만든 프로젝트</h3></div>`;
            html += renderCards(myProjects, true);
        }
        if (sharedProjects.length > 0) {
            html += `<div style="grid-column: 1 / -1; margin-top: 2rem;"><h3 style="color: #10b981; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;">🤝 초대받은 협업 프로젝트</h3></div>`;
            html += renderCards(sharedProjects, false);
        }

        listEl.innerHTML = html;
    } catch(e) { listEl.innerHTML = '<p style="color:red; grid-column: 1 / -1;">폴더를 불러오는데 실패했습니다.</p>'; }
}

async function deleteProject(projectId, event) {
    event.stopPropagation(); 
    if(!confirm("⚠️ 정말로 이 폴더를 삭제하시겠습니까?\n내부에 저장된 모든 평가 내역이 영구 삭제됩니다!")) return;
    
    try {
        await db.collection('user_projects').doc(projectId).delete();
        alert("🗑️ 폴더가 성공적으로 삭제되었습니다.");
        loadProjects(); 
    } catch(e) { alert("삭제 중 오류가 발생했습니다: " + e.message); }
}

async function createNewProject() {
    const user = auth.currentUser;
    if(!user) { alert("로그인이 필요합니다."); return; }

    const projectName = prompt("새로운 폴더 이름을 입력하세요.\n(예: 2026학년도 1학기 A고등학교)");
    if(!projectName || projectName.trim() === "") return;

    try {
        await db.collection('user_projects').add({
            uid: user.uid,
            ownerEmail: user.email, 
            collaborators: [user.email], 
            name: projectName.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            assessments: [] 
        });
        alert("✨ 새 폴더가 생성되었습니다!");
        loadProjects(); 
    } catch(e) { alert("폴더 생성 실패: " + e.message); }
}

function goToStep(stepNum) {
    const projectDetail = document.getElementById('project-detail-view');
    if(projectDetail) projectDetail.style.display = 'none';

    [1, 2, 3, 4].forEach(n => {
        const step = document.getElementById(`cut-score-step${n}`);
        if(step) step.style.display = 'none';
        const indicator = document.getElementById(`step${n}-indicator`);
        if(indicator) indicator.style.color = '#cbd5e1';
    });
    
    document.getElementById(`cut-score-step${stepNum}`).style.display = 'block';
    const indicatorTarget = document.getElementById(`step${stepNum}-indicator`);
    if(indicatorTarget) indicatorTarget.style.color = 'var(--primary)';
}

async function openProject(projectId, projectName) {
    currentProjectId = projectId;
    
    document.getElementById('cut-score-dashboard').style.display = 'none';
    [1, 2, 3, 4].forEach(n => {
        const step = document.getElementById(`cut-score-step${n}`);
        if(step) step.style.display = 'none';
    });
    document.getElementById('dynamic-indicator-bar').style.display = 'none';

    document.getElementById('project-detail-title').innerHTML = `📂 ${projectName} <button class="save-btn" onclick="openMemoBoard()" style="width: auto; margin: 0 0 0 15px; padding: 0.4rem 0.8rem; font-size: 0.85rem; background: #f59e0b; display: inline-block;">💬 업무 메모 <span id="unread-memo-count" style="background: #ef4444; color: white; border-radius: 10px; padding: 2px 6px; font-size: 0.7 diagnosis; margin-left: 5px; display: none;">0</span></button>`;
    document.getElementById('project-detail-view').style.display = 'block';

    await loadProjectDetails();
}

function backToProjectList() {
    currentProjectId = null;
    document.getElementById('project-detail-view').style.display = 'none';
    document.getElementById('cut-score-dashboard').style.display = 'block';
    loadProjects();
}

async function loadProjectDetails() {
    const listEl = document.getElementById('project-assessment-list');
    listEl.innerHTML = '<p style="text-align:center; padding: 1rem;">데이터를 계산 중입니다... ⏳</p>';
    
    try {
        const doc = await db.collection('user_projects').doc(currentProjectId).get();
        if(doc.exists) {
            const data = doc.data();
            renderProjectAssessments(data.assessments || []);
            
            const memos = data.memos || [];
            const userEmail = auth.currentUser.email;
            const unreadCount = memos.filter(m => m.authorEmail !== userEmail && !(m.readBy || []).includes(userEmail)).length;
            
            const badge = document.getElementById('unread-memo-count');
            if (badge) {
                if (unreadCount > 0) {
                    badge.innerText = unreadCount;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch(e) { listEl.innerHTML = '<p style="color:red; text-align:center;">데이터를 불러오는 데 실패했습니다.</p>'; }
}

function renderProjectAssessments(assessments) {
    const listEl = document.getElementById('project-assessment-list');
    const finalBoxes = document.getElementById('project-final-cut-scores');
    const warning = document.getElementById('weight-warning');
    
    if(!assessments || assessments.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; background: #f8fafc; padding: 2rem; border-radius: 8px; border: 1px dashed #cbd5e1; color: #64748b;">아직 등록된 평가가 없습니다. 아래 버튼을 눌러 평가를 추가하세요.</div>';
        finalBoxes.innerHTML = '<p style="color: #64748b; font-size: 0.9rem;">평가를 추가하면 최종 점수가 이곳에 계산됩니다.</p>';
        warning.style.display = 'none';
        return;
    }

    let html = `
    <div style="text-align: right; margin-bottom: 10px;">
        <button id="global-edit-btn" onclick="toggleGlobalEditMode()" style="background:#f59e0b; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: 0.2s;">✏️ 평가명/비율 일괄 수정</button>
    </div>
    <table class="score-table">
        <thead style="background: #f1f5f9;">
            <tr><th>평가명</th><th>반영 비율</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>관리</th></tr>
        </thead>
        <tbody>`;
    
    let totalWeight = 0;
    let totals = { A: 0, B: 0, C: 0, D: 0, E: 0 };

    let sortedWithIndex = assessments.map((asm, idx) => ({ ...asm, originalIndex: idx }));
    sortedWithIndex.sort((a, b) => {
        if (a.type === 'written' && b.type !== 'written') return -1;
        if (a.type !== 'written' && b.type === 'written') return 1;
        return 0;
    });

    sortedWithIndex.forEach((asm) => {
        const idx = asm.originalIndex; 
        totalWeight += asm.weight;
        totals.A += (asm.scores?.A || 0);
        totals.B += (asm.scores?.B || 0);
        totals.C += (asm.scores?.C || 0);
        totals.D += (asm.scores?.D || 0);
        totals.E += (asm.scores?.E || 0);

        const nameColor = asm.type === 'written' ? '#1e40af' : '#166534';
        const typeBadge = asm.type === 'written' 
            ? `<span style="background:#3b82f6; color:white; padding:2px 4px; border-radius:4px; font-size:0.7rem; margin-right:5px;">지필</span>`
            : `<span style="background:#10b981; color:white; padding:2px 4px; border-radius:4px; font-size:0.7rem; margin-right:5px;">수행</span>`;

        const editBtn = asm.type === 'written' 
            ? `<button onclick="startEditAssessment(${idx})" style="background:#3b82f6; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; margin-right:5px;">산출/수정</button>` 
            : `<button onclick="editManualAssessment(${idx})" style="background:#8b5cf6; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; margin-right:5px;">수정</button>`;

        html += `<tr>
            <td style="text-align:left;">
                ${typeBadge}
                <strong class="display-name" style="color:${nameColor};">${asm.name}</strong>
                <input type="text" class="edit-name-input" data-idx="${idx}" value="${asm.name}" style="display:none; width:120px; padding:4px; border:1px solid #cbd5e1; border-radius:4px;">
            </td>
            <td>
                <span class="display-weight" style="color: #ea580c; font-weight: bold;">${asm.weight}%</span>
                <input type="number" class="edit-weight-input" data-idx="${idx}" value="${asm.weight}" style="display:none; width:60px; padding:4px; border:1px solid #cbd5e1; border-radius:4px; text-align:center;">
            </td>
            <td>${(asm.scores?.A || 0).toFixed(2)}</td>
            <td>${(asm.scores?.B || 0).toFixed(2)}</td>
            <td>${(asm.scores?.C || 0).toFixed(2)}</td>
            <td>${(asm.scores?.D || 0).toFixed(2)}</td>
            <td>${(asm.scores?.E || 0).toFixed(2)}</td>
            <td>
                ${editBtn}
                <button onclick="deleteAssessment(${idx})" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">삭제</button>
            </td>
        </tr>`;
    });
    html += `</tbody>
        <tfoot style="background:#fffbeb; font-weight:bold;">
            <tr>
                <td style="text-align:center;">합계</td>
                <td style="color:${totalWeight === 100 ? '#10b981' : '#ef4444'}">${totalWeight}%</td>
                <td colspan="6"></td>
            </tr>
        </tfoot>
    </table>`;

    listEl.innerHTML = html;

    finalBoxes.innerHTML = `
        <div style="flex:1; min-width: 100px; padding:15px; background:white; border: 2px solid #ef4444; border-radius:8px;"><strong>A 컷오프</strong><br><span style="font-size:1.6rem; font-weight:bold; color:#ef4444;">${totals.A.toFixed(2)}</span></div>
        <div style="flex:1; min-width: 100px; padding:15px; background:white; border: 2px solid #f59e0b; border-radius:8px;"><strong>B 컷오프</strong><br><span style="font-size:1.6rem; font-weight:bold; color:#f59e0b;">${totals.B.toFixed(2)}</span></div>
        <div style="flex:1; min-width: 100px; padding:15px; background:white; border: 2px solid #22c55e; border-radius:8px;"><strong>C 컷오프</strong><br><span style="font-size:1.6rem; font-weight:bold; color:#22c55e;">${totals.C.toFixed(2)}</span></div>
        <div style="flex:1; min-width: 100px; padding:15px; background:white; border: 2px solid #3b82f6; border-radius:8px;"><strong>D 컷오프</strong><br><span style="font-size:1.6rem; font-weight:bold; color:#3b82f6;">${totals.D.toFixed(2)}</span></div>
        <div style="flex:1; min-width: 100px; padding:15px; background:white; border: 2px solid #94a3b8; border-radius:8px;"><strong>E 컷오프</strong><br><span style="font-size:1.6rem; font-weight:bold; color:#64748b;">${totals.E.toFixed(2)}</span></div>
    `;

    warning.style.display = totalWeight !== 100 ? 'block' : 'none';
}

async function deleteAssessment(index) {
    if(!confirm("이 평가 내역을 삭제하시겠습니까? (삭제 후 합산 점수가 재계산됩니다)")) return;
    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        const doc = await docRef.get();
        if(doc.exists) {
            let assessments = doc.data().assessments || [];
            assessments.splice(index, 1); 
            await docRef.update({ assessments: assessments });
            loadProjectDetails();
        }
    } catch(e) { alert("삭제 실패: " + e.message); }
}

// 🟢 [통합 교정] 대기석 문항 삭제 기능 (재정렬 포함 일원화)
function deleteQuestion(idx) {
    if(!confirm("이 문항을 삭제하시겠습니까? 삭제 후 문항 번호가 자동으로 재조정됩니다.")) return;
    extractedQuestionsArray.splice(idx, 1);
    rearrangeQuestionNumbers();
    renderQuestionCards();
}

function mergeWithPrevious(idx) {
    if (idx <= 0) return;
    if(!confirm("이 문항의 텍스트를 위 문항과 합치시겠습니까?")) return;
    
    extractedQuestionsArray[idx - 1].text += "\n" + extractedQuestionsArray[idx].text;
    if (!extractedQuestionsArray[idx - 1].image && extractedQuestionsArray[idx].image) {
        extractedQuestionsArray[idx - 1].image = extractedQuestionsArray[idx].image;
    }
    
    extractedQuestionsArray.splice(idx, 1);
    rearrangeQuestionNumbers();
    renderQuestionCards();
}

function removeQuestionImage(idx) {
    if(confirm("이 문항에 첨부된 그림을 삭제하시겠습니까?")) {
        extractedQuestionsArray[idx].image = null;
        renderQuestionCards();
    }
}

function rearrangeQuestionNumbers() {
    let objIdx = 1;
    let subIdx = 1;
    extractedQuestionsArray.forEach((q) => {
        if (String(q.num).includes('서') || q.num.startsWith('서')) {
            q.num = '서' + subIdx;
            subIdx++;
        } else if (!isNaN(parseInt(q.num))) {
            q.num = String(objIdx);
            objIdx++;
        }
    });
}

function openManualAssessmentModal() { document.getElementById('manual-assessment-modal').style.display = 'flex'; }

let currentEditingManualIndex = -1;

function editManualAssessment(index) {
    db.collection('user_projects').doc(currentProjectId).get().then(doc => {
        if(doc.exists) {
            const asm = doc.data().assessments[index];
            document.getElementById('manual-assess-name').value = asm.name;
            document.getElementById('manual-assess-weight').value = asm.weight;
            
            const ratio = asm.weight / 100;
            document.getElementById('manual-a').value = Math.round((asm.scores.A || 0) / ratio);
            document.getElementById('manual-b').value = Math.round((asm.scores.B || 0) / ratio);
            document.getElementById('manual-c').value = Math.round((asm.scores.C || 0) / ratio);
            document.getElementById('manual-d').value = Math.round((asm.scores.D || 0) / ratio);
            document.getElementById('manual-e').value = Math.round((asm.scores.E || 0) / ratio);
            
            const subList = document.getElementById('sub-factors-list');
            subList.innerHTML = '';
            if (asm.subFactors && asm.subFactors.length > 0) {
                asm.subFactors.forEach(sf => {
                    addSubFactorRow(sf);
                });
            }
            
            currentEditingManualIndex = index;
            document.getElementById('manual-assessment-modal').style.display = 'flex';
        }
    });
}

function closeManualAssessmentModal() { 
    document.getElementById('manual-assessment-modal').style.display = 'none';
    currentEditingManualIndex = -1; 
    document.querySelectorAll('#manual-assessment-modal input').forEach(input => {
        input.value = '';
        input.readOnly = false;
        input.style.background = 'white';
    }); 
    document.getElementById('sub-factors-list').innerHTML = ''; 
}

async function saveManualAssessment() {
    const name = document.getElementById('manual-assess-name').value.trim();
    const weight = parseFloat(document.getElementById('manual-assess-weight').value) || 0;
    
    const a = (parseFloat(document.getElementById('manual-a').value) || 0) * (weight / 100);
    const b = (parseFloat(document.getElementById('manual-b').value) || 0) * (weight / 100);
    const c = (parseFloat(document.getElementById('manual-c').value) || 0) * (weight / 100);
    const d = (parseFloat(document.getElementById('manual-d').value) || 0) * (weight / 100);
    const e = (parseFloat(document.getElementById('manual-e').value) || 0) * (weight / 100);
    
    if(!name || weight <= 0) { alert("평가명과 반영 비율을 정확히 입력하세요."); return; }

    let subFactors = [];
    document.querySelectorAll('.sub-factor-row').forEach(row => {
        subFactors.push({
            name: row.querySelector('.sub-factor-name').value.trim(),
            max: parseFloat(row.querySelector('.sub-factor-max').value) || 0,
            a: parseFloat(row.querySelector('.sub-a').value) || 0,
            b: parseFloat(row.querySelector('.sub-b').value) || 0,
            c: parseFloat(row.querySelector('.sub-c').value) || 0,
            d: parseFloat(row.querySelector('.sub-d').value) || 0,
            e: parseFloat(row.querySelector('.sub-e').value) || 0
        });
    });

    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        const doc = await docRef.get();
        if(doc.exists) {
            let assessments = doc.data().assessments || [];
            
            const assessmentData = {
                name: name, weight: weight, type: 'manual',
                scores: { A: a, B: b, C: c, D: d, E: e },
                subFactors: subFactors, 
                savedAt: new Date()
            };

            if (currentEditingManualIndex !== -1) {
                assessments[currentEditingManualIndex] = assessmentData;
            } else {
                assessments.push(assessmentData);
            }
            
            await docRef.update({ assessments: assessments });
            alert("✅ 수행평가 구조와 분할점수가 안전하게 저장되었습니다!");
            
            closeManualAssessmentModal();
            loadProjectDetails(); 
        }
    } catch(err) { alert("저장 실패: " + err.message); }
}

async function saveAssessmentToProject() {
    if (!currentProjectId || currentEditingAssessmentIndex === -1) { alert("오류: 편집 중인 평가를 찾을 수 없습니다."); return; }

    const boxes = document.getElementById('final-cut-score-boxes').querySelectorAll('span');
    if (boxes.length < 5) { alert("점수 산출이 먼저 완료되어야 합니다."); return; }

    let latestScores = [];
    document.querySelectorAll('.score-input').forEach((input, idx) => {
        const selects = document.querySelectorAll('.level-select');
        const diffs = document.querySelectorAll('.diff-select');
        latestScores.push({
            num: input.getAttribute('data-num') || String(idx + 1),
            score: parseFloat(input.value) || 0,
            level: selects[idx] ? selects[idx].value : 'C',
            difficulty: diffs[idx] ? diffs[idx].value : '중',
            isShortAnswer: String(input.getAttribute('data-num')).includes('서')
        });
    });
    if(latestScores.length > 0) parsedScores = latestScores;

    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        const doc = await docRef.get();
        
        if(doc.exists) {
            let assessments = doc.data().assessments || [];
            const weight = assessments[currentEditingAssessmentIndex].weight || 0; 
            
            const weightedScores = {
                A: parseFloat(boxes[0].innerText.replace('점','')) * (weight / 100),
                B: parseFloat(boxes[1].innerText.replace('점','')) * (weight / 100),
                C: parseFloat(boxes[2].innerText.replace('점','')) * (weight / 100),
                D: parseFloat(boxes[3].innerText.replace('점','')) * (weight / 100),
                E: parseFloat(boxes[4].innerText.replace('점','')) * (weight / 100)
            };

            assessments[currentEditingAssessmentIndex].scores = weightedScores;
            assessments[currentEditingAssessmentIndex].savedAt = new Date();
            assessments[currentEditingAssessmentIndex].parsedScores = parsedScores;
            
            await docRef.update({ assessments: assessments });
            alert(`✅ 산출된 분할점수가 반영비율(${weight}%)에 맞게 환산되어 저장되었습니다!`);
            
            [1, 2, 3, 4].forEach(n => {
                const step = document.getElementById(`cut-score-step${n}`);
                if(step) step.style.display = 'none';
            });
            document.getElementById('cut-score-dashboard').style.display = 'block'; 
            loadProjectDetails();
            currentEditingAssessmentIndex = -1; 
        }
    } catch(e) { alert("업데이트 실패: " + e.message); }
}

async function saveWrittenAssessmentShell() {
    const name = document.getElementById('written-assess-name').value.trim();
    const weight = parseFloat(document.getElementById('written-assess-weight').value) || 0;

    if(!name || weight <= 0) { alert("평가명과 반영 비율을 정확히 입력하세요."); return; }

    try {
        await db.collection('user_projects').doc(currentProjectId).update({
            assessments: firebase.firestore.FieldValue.arrayUnion({
                name: name, weight: weight, type: 'written',
                scores: { A: 0, B: 0, C: 0, D: 0, E: 0 },
                savedAt: new Date()
            })
        });
        alert("✅ 지필평가 항목이 생성되었습니다. 목록에서 '산출/수정'을 눌러 분석을 시작하세요.");
        document.getElementById('written-assess-name').value = '';
        document.getElementById('written-assess-weight').value = '';
        document.getElementById('written-assessment-modal').style.display = 'none';
        loadProjectDetails(); 
    } catch(err) { alert("생성 실패: " + err.message); }
}

function restoreScoreTable(savedScores) {
    const container = document.getElementById('score-table-container');
    let html = `<table class="score-table">
                <thead style="position: sticky; top: 0; background: #f1f5f9; z-index: 1;">
                <tr><th>문항 번호</th><th>예상 난이도</th><th>배점 (점)</th><th>예상 성취수준</th></tr></thead><tbody>`;

    savedScores.forEach(q => {
        const isShort = String(q.num).includes('서');
        const diff = q.difficulty || '중';
        const level = q.level || 'C';

        html += `<tr ${isShort ? 'style="background:#fff7ed;"' : ''}>
            <td>${q.num}</td>
            <td>
                <select class="diff-select" style="padding:4px; border-radius:4px;">
                    <option value="상" ${diff==='상'?'selected':''}>상 (어려움)</option>
                    <option value="중" ${diff==='중'?'selected':''}>중 (보통)</option>
                    <option value="하" ${diff==='하'?'selected':''}>하 (쉬움)</option>
                </select>
            </td>
            <td><input type="number" step="0.1" class="score-input" data-num="${q.num}" value="${q.score}" oninput="updateStep2Total()"></td>
            <td><select class="level-select" style="padding:4px;">
                <option value="A" ${level==='A'?'selected':''}>A</option>
                <option value="B" ${level==='B'?'selected':''}>B</option>
                <option value="C" ${level==='C'?'selected':''}>C</option>
                <option value="D" ${level==='D'?'selected':''}>D</option>
                <option value="E" ${level==='E'?'selected':''}>E</option>
            </select></td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
    updateStep2Total();
    parsedScores = savedScores;
}

function openAiHelper() {
    const zone = document.getElementById('ai-helper-zone');
    zone.style.display = zone.style.display === 'none' ? 'block' : 'none';
}

// 🟢 [명칭 분리 교정 완료] 역사 기록용 단일 평가 아카이브 영구 삭제 함수 분해 신설
async function deleteSavedAssessment(docId) {
    if(!confirm("저장된 이 평가 기록을 문제은행 아카이브에서 영구 삭제하시겠습니까?")) return;
    try {
        await db.collection("assessments").doc(docId).delete();
        alert("🗑️ 평가 기록이 정상적으로 삭제되었습니다.");
        renderSavedAssessments(); 
    } catch(e) { alert("삭제 실패: " + e.message); }
}

// 🟢 [수정 완료] 아카이브 삭제 버튼이 신설된 전용 함수(deleteSavedAssessment)를 가리키도록 정렬
async function renderSavedAssessments() {
    const listContainer = document.getElementById('saved-assessment-list');
    if(!listContainer) return;

    listContainer.innerHTML = "<p style='padding:10px; color:#64748b;'>목록을 불러오는 중...</p>";
    if (!auth.currentUser) {
        listContainer.innerHTML = "<p style='padding:10px; color:#ef4444;'>로그인이 필요합니다.</p>";
        return;
    }

    try {
        const snapshot = await db.collection("assessments")
                                 .where("uid", "==", auth.currentUser.uid)
                                 .orderBy("createdAt", "desc")
                                 .get();

        if (snapshot.empty) {
            listContainer.innerHTML = "<p style='padding:10px;'>저장된 평가가 없습니다.</p>";
            return;
        }

        const docsArray = snapshot.docs.sort((a, b) => {
            const dataA = a.data(); const dataB = b.data();
            const titleA = dataA.title || ""; const titleB = dataB.title || "";
            const jipilKeywords = ["지필", "1회", "2회", "중간", "기말", "고사"];
            const isA_Jipil = jipilKeywords.some(k => titleA.includes(k));
            const isB_Jipil = jipilKeywords.some(k => titleB.includes(k));

            if (isA_Jipil && !isB_Jipil) return -1;
            if (!isA_Jipil && isB_Jipil) return 1;
            return (dataB.createdAt ? dataB.createdAt.toMillis() : 0) - (dataA.createdAt ? dataA.createdAt.toMillis() : 0); 
        });

        let html = `<ul style="list-style:none; padding:0; margin:0;">`;
        docsArray.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? new Date(data.createdAt.toMillis()).toLocaleString() : "날짜 없음";
            const isJipil = ["지필", "1회", "2회", "중간", "기말", "고사"].some(k => data.title.includes(k));
            const themeColor = isJipil ? "#3b82f6" : "#10b981";
            const tagText = isJipil ? "지필" : "수행";

            html += `
                <li style="margin-bottom: 10px; padding: 12px; border: 1px solid #e2e8f0; border-left: 6px solid ${themeColor}; border-radius: 6px; background: white; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="background:${themeColor}; color:white; font-size:0.7rem; padding:2px 6px; border-radius:4px; font-weight:bold;">${tagText}</span>
                            <div style="font-weight: bold; color: #0f172a; font-size: 1.05rem;">${data.title}</div>
                        </div>
                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px; padding-left: 45px;">${date}</div>
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button onclick="loadSingleAssessment('${doc.id}')" style="background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">열기</button>
                        <button onclick="deleteSavedAssessment('${doc.id}')" style="background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; padding:6px 12px; border-radius:4px; cursor:pointer;">삭제</button>
                    </div>
                </li>
            `;
        });
        html += `</ul>`;
        listContainer.innerHTML = html;
        
    } catch (error) {
        listContainer.innerHTML = "<p>목록 정렬 중 오류가 발생했습니다.</p>";
    }
}

async function pasteImageToQuestion(idx) {
    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const clipboardItem of clipboardItems) {
            const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
            if (imageTypes.length > 0) {
                const blob = await clipboardItem.getType(imageTypes[0]);
                const reader = new FileReader();
                reader.onload = (e) => {
                    extractedQuestionsArray[idx].image = e.target.result;
                    renderQuestionCards(); 
                    alert("✅ 그림이 성공적으로 첨부되었습니다!");
                };
                reader.readAsDataURL(blob);
                return; 
            }
        }
        alert("⚠️ 아직 복사된 그림이 없습니다.\n\n1. 왼쪽 화면에서 [윈도우키 + Shift + S]를 눌러 그림을 캡처하세요.\n2. 다시 이 [붙여넣기] 버튼을 눌러주세요!");
    } catch (err) {
        alert("🚨 그림을 가져올 수 없습니다.\n인터넷 주소창 왼쪽의 '자물쇠' 아이콘을 클릭하고 [클립보드] 권한을 '허용'으로 바꿔주세요.");
    }
}

async function inviteCollaborator(projectId, event) {
    event.stopPropagation(); 
    const email = prompt("🤝 함께 점수를 산출할 선생님의 구글 계정(이메일)을 정확히 입력하세요.");
    if (!email || email.trim() === "") return;
    
    try {
        await db.collection('user_projects').doc(projectId).update({
            collaborators: firebase.firestore.FieldValue.arrayUnion(email.trim())
        });
        alert(`✅ ${email} 선생님을 성공적으로 초대했습니다!`);
        loadProjects(); 
    } catch (e) { alert("초대 중 오류가 발생했습니다: " + e.message); }
}

async function kickFromProject(projectId, event) {
    event.stopPropagation(); 
    const doc = await db.collection('user_projects').doc(projectId).get();
    if (!doc.exists) return;
    
    const collabs = doc.data().collaborators || [];
    if (collabs.length === 0) { alert("현재 초대된 팀원이 없습니다."); return; }

    let msg = "👥 [현재 참여 중인 팀원 목록]\n";
    collabs.forEach((email, idx) => { msg += `${idx + 1}. ${email}\n`; });
    msg += "\n삭제하려는 선생님의 이메일을 정확히 입력해 주세요.";

    const targetEmail = prompt(msg);
    if (!targetEmail) return;

    try {
        await db.collection('user_projects').doc(projectId).update({
            collaborators: firebase.firestore.FieldValue.arrayRemove(targetEmail.trim())
        });
        alert(`🗑️ [${targetEmail}] 선생님이 프로젝트에서 제외되었습니다.`);
        loadProjects(); 
    } catch (error) { alert("삭제에 실패했습니다: " + error.message); }
}

async function saveMyInput(qIdx, levelValue) {
    if (!currentProjectId || currentEditingAssessmentIndex === -1) return;
    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            if(!doc.exists) return;

            let assessments = doc.data().assessments;
            let asm = assessments[currentEditingAssessmentIndex];

            if (!asm.teacherInputs) asm.teacherInputs = {};
            if (!asm.teacherInputs[auth.currentUser.email]) asm.teacherInputs[auth.currentUser.email] = [];

            while(asm.teacherInputs[auth.currentUser.email].length <= qIdx) { 
                asm.teacherInputs[auth.currentUser.email].push({}); 
            }
            asm.teacherInputs[auth.currentUser.email][qIdx] = { level: levelValue };

            if(asm.readyStatus && asm.readyStatus[auth.currentUser.email]) {
                asm.readyStatus[auth.currentUser.email] = '작성 중'; 
            }
            transaction.update(docRef, { assessments: assessments });
        });
    } catch(e) { console.error("입력 저장 실패", e); }
}

async function updateBaseScore(qIdx, scoreValue) {
    if (!currentProjectId || currentEditingAssessmentIndex === -1) return;
    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        const doc = await docRef.get();
        if(doc.exists) {
            let assessments = doc.data().assessments;
            assessments[currentEditingAssessmentIndex].parsedScores[qIdx].score = parseFloat(scoreValue) || 0;
            await docRef.update({ assessments: assessments });
        }
    } catch(e) { console.error("배점 갱신 실패", e); }
}

async function copyAiLevelsToMine() {
    if (!currentProjectId || currentEditingAssessmentIndex === -1) return;
    if (!confirm("💡 AI가 1차로 판정한 성취수준을 내 칸에 모두 복사하시겠습니까?")) return;

    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        const doc = await docRef.get();
        if(doc.exists) {
            let assessments = doc.data().assessments;
            let asm = assessments[currentEditingAssessmentIndex];
            let baseQuestions = asm.parsedScores || [];
            const userEmail = auth.currentUser.email;

            if (!asm.teacherInputs) asm.teacherInputs = {};
            if (!asm.teacherInputs[userEmail]) asm.teacherInputs[userEmail] = [];

            baseQuestions.forEach((q, idx) => {
                while(asm.teacherInputs[userEmail].length <= idx) asm.teacherInputs[userEmail].push({});
                asm.teacherInputs[userEmail][idx].level = q.level || 'C'; 
            });

            if(asm.readyStatus && asm.readyStatus[userEmail]) {
                asm.readyStatus[userEmail] = false;
            }
            await docRef.update({ assessments: assessments });
        }
    } catch(e) { alert("복사 중 오류 발생: " + e.message); }
}

async function updateBaseDifficulty(qIdx, diffValue) {
    if (!currentProjectId || currentEditingAssessmentIndex === -1) return;
    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        const doc = await docRef.get();
        if(doc.exists) {
            let assessments = doc.data().assessments;
            assessments[currentEditingAssessmentIndex].parsedScores[qIdx].difficulty = diffValue;
            await docRef.update({ assessments: assessments });
        }
    } catch(e) { console.error("난이도 갱신 실패", e); }
}

function toggleExamViewer() {
    const wrapper = document.getElementById('exam-inspector-wrapper');
    const controls = document.getElementById('table-external-controls');
    const toggleBtn = document.getElementById('exam-viewer-toggle-btn');
    const applyBtnContainer = document.getElementById('external-apply-btn-zone'); 
    
    if (!wrapper || !controls) return;

    if (wrapper.parentNode !== controls.parentNode || wrapper.previousSibling !== controls) {
        controls.parentNode.insertBefore(wrapper, controls.nextSibling);
        if(applyBtnContainer) { wrapper.parentNode.insertBefore(applyBtnContainer, wrapper); }
    }

    if (wrapper.style.display === 'none') {
        wrapper.style.display = 'flex';
        if(toggleBtn) toggleBtn.innerText = "📄 시험지 닫기 🔼";
        toggleBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        wrapper.style.display = 'none';
        if(toggleBtn) toggleBtn.innerText = "📄 시험지 파일 및 편집 확인 🔽";
    }
}

async function markAsReady() {
    if (!currentProjectId || currentEditingAssessmentIndex === -1) return;
    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        const docForCheck = await docRef.get();
        if(!docForCheck.exists) return;
        
        const asmCheck = docForCheck.data().assessments[currentEditingAssessmentIndex];
        const baseLen = asmCheck.parsedScores ? asmCheck.parsedScores.length : 0;
        const myInputs = asmCheck.teacherInputs?.[auth.currentUser.email] || [];
        const filledCount = myInputs.filter(i => i && i.level).length;

        let statusToSave = '완료';
        if(filledCount < baseLen) {
            if(!confirm("⚠️ 아직 성취수준을 판정하지 않은 빈칸이 있습니다.\n현재까지의 내용을 '임시 저장(작성 중)' 상태로 두시겠습니까?")) return;
            statusToSave = '작성 중'; 
        }

        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            if (!doc.exists) return;

            let assessments = doc.data().assessments;
            let asm = assessments[currentEditingAssessmentIndex];

            if (!asm.readyStatus) asm.readyStatus = {};
            asm.readyStatus[auth.currentUser.email] = statusToSave; 
            
            transaction.update(docRef, { assessments: assessments });
        });
        alert("✅ 내 판정 상황이 안전하게 저장되었습니다.");
    } catch(e) { alert("저장 실패: " + e.message); }
}

async function applyBatchDifficulty() {
    const val = document.getElementById('batch-diff-val').value;
    const cbs = document.querySelectorAll('.diff-batch-cb:checked');
    if(cbs.length === 0) { alert("선택된 문항이 없습니다. 왼쪽 체크박스를 선택해주세요."); return; }

    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        const doc = await docRef.get();
        if(doc.exists) {
            let assessments = doc.data().assessments;
            cbs.forEach(cb => {
                const idx = parseInt(cb.getAttribute('data-idx'));
                assessments[currentEditingAssessmentIndex].parsedScores[idx].difficulty = val;
            });
            await docRef.update({ assessments: assessments });
        }
    } catch(e) { alert("일괄 적용 실패: " + e.message); }
}

function initDiffShiftClick() {
    const checkboxes = document.querySelectorAll('.diff-batch-cb');
    let lastChecked = null;
    checkboxes.forEach(cb => {
        cb.addEventListener('click', function(e) {
            if (!lastChecked) { lastChecked = this; return; }
            if (e.shiftKey) {
                const start = Array.from(checkboxes).indexOf(this);
                const end = Array.from(checkboxes).indexOf(lastChecked);
                checkboxes.forEach((checkbox, i) => {
                    if (i >= Math.min(start, end) && i <= Math.max(start, end)) {
                        checkbox.checked = lastChecked.checked;
                    }
                });
            }
            lastChecked = this;
        });
    });
}

function compressCaptureImage(base64Str, callback) {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; 
        let width = img.width; let height = img.height;

        if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.5);
        callback(compressed);
    };
}

async function transformAndSaveExamToBank() {
    if(extractedQuestionsArray.length === 0) return;
    if(!confirm("추출된 문항들을 AI 변형 문항으로 재구성하여 '문제 서랍(DB)'에 저장하시겠습니까?")) return;
    if (!requireApiKey()) return;

    const btn = document.querySelector('button[onclick="saveBankAndApplyTable()"]') || document.querySelector('button[onclick="transformAndSaveExamToBank()"]');
    const originalBtnText = btn ? btn.innerText : "💾 문제은행에 저장하고 표에 반영";
    if(btn) {
        btn.innerText = "⏳ AI가 일괄 저작권 변형 및 백엔드 연동 처리 중...";
        btn.disabled = true;
    }

    try {
        let standardsInfo = "";
        for (const key in subjectData) {
            if (subjectData[key].standards && subjectData[key].standards.length > 0) {
                standardsInfo += `\n--- ${subjectData[key].title} ---\n`;
                standardsInfo += subjectData[key].standards.map(s => `${s.code} ${s.desc}`).join('\n');
            }
        }

        let targetSubject = document.getElementById('cut-score-subject')?.value || currentSubject || "uncategorized";
        let questionsPayload = extractedQuestionsArray.map(q => q.text);
        const workerUrl = "https://script.google.com/macros/s/AKfycbwgx4RgF8FQxxL3jBgEQ5l369llADjhZ1NepulIdF4DdX18kBrB8oRQ4Ft0d5WdKtEF/exec";
        const userApiKey = localStorage.getItem('gemini_api_key');
        
        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: "batch_transform",
                standardsInfo: standardsInfo,
                subject: targetSubject, 
                questionsPayload: questionsPayload,
                apiKey: userApiKey
            })
        });

        await checkApiError(response);
        const data = await response.json();
        const aiResult = data.candidates[0].content.parts[0].text;
        const blocks = aiResult.split('===').map(b => b.trim()).filter(b => b.length > 0);
        let savedCount = 0;
        let subject = document.getElementById('cut-score-subject')?.value || currentSubject || "uncategorized";

        for (let i = 0; i < Math.min(blocks.length, extractedQuestionsArray.length); i++) {
            const block = blocks[i]; const originalData = extractedQuestionsArray[i]; 

            const qMatch = block.match(/변형문제:\s*([\s\S]*?)(?=변형정답:|$)/);
            const aMatch = block.match(/변형정답:\s*([\s\S]*?)(?=성취기준코드:|$)/);
            const cMatch = block.match(/성취기준코드:\s*([\s\S]*?)(?=판정이유:|$)/);
            const rMatch = block.match(/판정이유:\s*([\s\S]*)/);

            let finalQ = qMatch ? qMatch[1].trim() : originalData.text;
            let finalA = aMatch ? aMatch[1].trim() : "정답 정보 없음";
            let finalCode = cMatch ? cMatch[1].replace(/[\[\]]/g, '').trim() : "코드없음"; 
            let finalReason = rMatch ? rMatch[1].trim() : "AI가 교육과정 루브릭을 바탕으로 분석한 문항입니다.";

            let levelMatch = originalData.text.match(/\[수준\]\s*(A\+|[A-E])/);
            let lvl = levelMatch ? levelMatch[1] : "C";
            if(lvl === "A+") lvl = "A";

            const saveData = {
                subject: subject, standard_code: finalCode, question: finalQ, answer: finalA,          
                level: lvl, reason: finalReason, source: "📄 시험지 일괄 변형 저장",
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (originalData.image) {
                await new Promise(resolve => {
                    compressCaptureImage(originalData.image, (compressed) => {
                        saveData.image = compressed; resolve();
                    });
                });
            }
            await db.collection('transformed_bank').add(saveData);
            savedCount++;
        }
        alert(`🎉 완벽합니다! 총 ${savedCount}개의 문항이 저작권 회피 변형 문항으로 데이터베이스 서랍에 입고되었습니다.`);
        await updateQuestionCount(); 
        initDashboard();
    } catch (error) { alert("변형 저장 중 오류 발생: " + error.message); } 
    finally { if(btn) { btn.innerText = originalBtnText; btn.disabled = false; } }
}

async function triggerSaveBackgroundAndReset() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey || !currentChatContext) { alert("분석된 데이터가 없습니다."); return; }

    const btn = document.getElementById('save-variant-btn');
    const originalText = btn ? btn.innerText : "";

    try {
        if (btn) { btn.disabled = true; btn.innerText = "⏳ AI가 문항을 변형하여 저장 중입니다..."; }
        processAndSaveBackground(currentChatContext, apiKey).then(() => {
            console.log("✅ 변형 문항 데이터베이스 저장 완료");
        }).catch(err => { console.error("❌ 저장 중 오류 발생:", err); });

        alert("✅ 문항 분석 결과가 문제은행에 기여되었습니다!\n(AI가 저작권 보호를 위해 문항을 변형하여 안전하게 보관합니다.)");
        resetAnalysis(true);
    } catch (e) { alert("저장 처리 중 오류가 발생했습니다: " + e.message); } 
    finally { if (btn) { btn.disabled = false; btn.innerText = originalText; } }
}

function escapeCSV(str) {
    if (str === undefined || str === null) return '""';
    return `"${str.toString().replace(/"/g, '""')}"`;
}

function updateUniversalFilter() {
    const drawerSelect = document.getElementById('universal-drawer-select').value;
    const drawerInput = document.getElementById('universal-drawer-input');
    const filterSelect = document.getElementById('universal-filter-select');
    
    if (drawerSelect === 'custom') {
        drawerInput.value = ''; drawerInput.readOnly = false; drawerInput.focus();
        filterSelect.innerHTML = '<option value="all">전체 다운로드 (필터 없음)</option>';
        filterSelect.style.background = '#f1f5f9';
    } else {
        drawerInput.value = drawerSelect; drawerInput.readOnly = true;
        if (drawerSelect === 'transformed_bank' || drawerSelect === 'standards_2022') {
            filterSelect.innerHTML = `
                <option value="all">🌐 전체 과목 한 번에 보기</option>
                <option value="common1">📘 공통수학1</option>
                <option value="common2">📘 공통수학2</option>
                <option value="algebra">📗 대수</option>
                <option value="calculus1">📙 미적분Ⅰ</option>
                <option value="probStat">📊 확률과 통계</option>
                <option value="uncategorized">📦 미분류 보관함</option>
            `;
            filterSelect.style.background = '#fffbeb';
        } else {
            filterSelect.innerHTML = '<option value="all">🌐 전체 다운로드 (세부 필터 미지원 서랍)</option>';
            filterSelect.style.background = '#f1f5f9';
        }
    }
}

async function downloadUniversalData() {
    const collectionName = document.getElementById('universal-drawer-input').value.trim();
    const filterVal = document.getElementById('universal-filter-select').value;
    if (!collectionName) { alert("서랍 이름을 확인해 주세요."); return; }

    const btn = document.querySelector('button[onclick="downloadUniversalData()"]');
    const originalText = btn.innerText; btn.innerText = "⏳ 데이터 구조 분석 및 필터링 중...";

    try {
        let query = db.collection(collectionName);
        if (filterVal !== 'all' && (collectionName === 'transformed_bank' || collectionName === 'standards_2022')) {
            query = query.where('subject', '==', filterVal);
        }

        const snapshot = await query.get();
        if (snapshot.empty) { alert(`해당 조건('${filterVal}')에 일치하는 데이터가 없습니다.`); return; }

        let allKeysSet = new Set();
        snapshot.forEach(doc => { Object.keys(doc.data()).forEach(key => allKeysSet.add(key)); });
        const headers = Array.from(allKeysSet); 

        let csvContent = "\uFEFF고유 ID(수정금지)," + headers.join(",") + "\n";
        snapshot.forEach(doc => {
            const data = doc.data(); let rowValues = [escapeCSV(doc.id)]; 
            headers.forEach(header => {
                let val = data[header];
                if (typeof val === 'object' && val !== null) {
                    if (val.toDate) val = val.toDate().toLocaleString(); 
                    else val = JSON.stringify(val); 
                }
                rowValues.push(escapeCSV(val));
            });
            csvContent += rowValues.join(",") + "\n";
        });

        const filterName = filterVal === 'all' ? '전체' : filterVal;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `만능백업_${collectionName}_${filterName}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    } catch (error) { alert("다운로드 실패: " + error.message); } 
    finally { btn.innerText = originalText; }
}

async function uploadUniversalData(event) {
    const file = event.target.files[0]; if(!file) return;
    const collectionName = document.getElementById('universal-drawer-input').value.trim();
    if (!collectionName) { alert("저장할 대상 서랍 이름이 비어있습니다."); event.target.value = ""; return; }

    if(!confirm(`[${collectionName}] 서랍에 엑셀 데이터를 밀어 넣습니다.`)) { event.target.value = ""; return; }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
            if (jsonData.length < 2) { alert("데이터가 없습니다."); return; }

            const headers = jsonData[0]; 
            if (headers[0] !== "고유 ID(수정금지)") { alert("경고: A열의 이름이 '고유 ID(수정금지)'가 아닙니다."); return; }

            let updateCount = 0; let insertCount = 0;
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i]; if (!row || row.length === 0) continue;
                const docId = row[0] ? row[0].toString().trim() : "";
                let rowData = {}; let hasData = false;

                for (let j = 1; j < headers.length; j++) {
                    const fieldName = headers[j]; if (!fieldName) continue;
                    let val = row[j]; if (val === undefined || val === "") continue; 
                    if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
                        try { val = JSON.parse(val.trim()); } catch (e) { }
                    }
                    rowData[fieldName] = val; hasData = true;
                }
                if (!hasData) continue; 

                if (collectionName === 'transformed_bank') {
                    const permitted = ['answer', 'level', 'question', 'reason', 'standard_code', 'subject', 'timestamp'];
                    let sanitizedData = {};
                    permitted.forEach(field => { if (rowData[field] !== undefined) sanitizedData[field] = rowData[field]; });
                    if (sanitizedData.level) sanitizedData.level = sanitizedData.level.toString().toUpperCase().trim();
                    sanitizedData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
                    rowData = sanitizedData;
                }

                if (docId) {
                    await db.collection(collectionName).doc(docId).set(rowData, { merge: true }); updateCount++;
                } else {
                    await db.collection(collectionName).add(rowData); insertCount++;
                }
            }
            alert(`🚀 만능 업로드 완료!\n- 덮어쓰기: ${updateCount}건\n- 신규 추가: ${insertCount}건`);
            document.getElementById('universal-bulk-upload-input').value = "";
        } catch(error) {
            alert("만능 업로드 에러: " + error.message);
            document.getElementById('universal-bulk-upload-input').value = "";
        }
    };
    reader.readAsArrayBuffer(file);
}

async function editAssessmentInfo(index) {
    const docRef = db.collection('user_projects').doc(currentProjectId);
    const doc = await docRef.get();
    let assessments = doc.data().assessments;
    let asm = assessments[index];

    const newName = prompt("새로운 평가명을 입력하세요:", asm.name);
    if(newName === null || newName.trim() === "") return;
    const newWeight = prompt("새로운 반영 비율(%)을 숫자로만 입력하세요:", asm.weight);
    if(newWeight === null || newWeight.trim() === "" || isNaN(newWeight)) return;

    asm.name = newName.trim(); asm.weight = parseFloat(newWeight);
    try {
        await docRef.update({ assessments: assessments });
        alert("✅ 정보가 수정되었습니다."); loadProjectDetails();
    } catch(e) { alert("수정 실패: " + e.message); }
}

let isGlobalEditMode = false;

function toggleGlobalEditMode() {
    isGlobalEditMode = !isGlobalEditMode;
    const btn = document.getElementById('global-edit-btn');
    const nameSpans = document.querySelectorAll('.display-name');
    const nameInputs = document.querySelectorAll('.edit-name-input');
    const weightSpans = document.querySelectorAll('.display-weight');
    const weightInputs = document.querySelectorAll('.edit-weight-input');

    if (isGlobalEditMode) {
        btn.innerHTML = "💾 변경사항 저장하기"; btn.style.background = "#10b981";
        nameSpans.forEach(el => el.style.display = 'none'); nameInputs.forEach(el => el.style.display = 'inline-block');
        weightSpans.forEach(el => el.style.display = 'none'); weightInputs.forEach(el => el.style.display = 'inline-block');
    } else {
        btn.innerHTML = "⏳ DB에 저장 중..."; btn.disabled = true;
        saveGlobalEdits(nameInputs, weightInputs);
    }
}

async function saveGlobalEdits(nameInputs, weightInputs) {
    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        const doc = await docRef.get();
        if (doc.exists) {
            let assessments = doc.data().assessments;
            nameInputs.forEach((input, i) => {
                const idx = parseInt(input.getAttribute('data-idx'));
                const newName = input.value.trim();
                const newWeight = parseFloat(weightInputs[i].value) || 0;
                if (newName) assessments[idx].name = newName;
                assessments[idx].weight = newWeight;
            });
            await docRef.update({ assessments: assessments });
            alert("✅ 일괄 수정 및 비율 동기화가 안전하게 완료되었습니다!");
        }
    } catch (e) { alert("수정 실패: " + e.message); } 
    finally { isGlobalEditMode = false; loadProjectDetails(); }
}

async function saveBankAndApplyTable() {
    await transformAndSaveExamToBank();
    await sendAiResultsToTable();
}

async function fetchReferenceQuestions(subjectCode) {
    try {
        const snapshot = await db.collection('transformed_bank').where('subject', '==', subjectCode).limit(50).get();
        if (snapshot.empty) return ""; 
        let refText = "\n<과거 AI 판정 참고 데이터베이스 (일관성 유지용)>\n";
        snapshot.forEach(doc => {
            const data = doc.data();
            refText += `[과거 문항] ${data.question}\n[과거 판정 수준] ${data.level}\n[과거 판정 이유] ${data.reason}\n---\n`;
        });
        refText += "</과거 AI 판정 참고 데이터베이스>\n";
        return refText;
    } catch (e) { return ""; }
}

function openSpecificFeedbackPanel() {
    const question = currentQuestions[currentLevelQ]; if (!question) return;
    const panel = document.getElementById('specific-feedback-panel'); panel.style.display = 'block';
    const tempDiv = document.createElement('div'); tempDiv.innerHTML = question.q;
    
    document.getElementById('fb-current-q').innerText = tempDiv.innerText;
    document.getElementById('fb-current-std').innerText = currentStandardCode;
    document.getElementById('fb-current-level').innerText = question.level;

    const stdSelect = document.getElementById('fb-proposed-std'); stdSelect.innerHTML = '';
    if (subjectData[currentSubject] && subjectData[currentSubject].standards) {
        subjectData[currentSubject].standards.forEach(std => {
            const opt = document.createElement('option'); opt.value = std.code;
            opt.innerText = `${std.code} ${std.desc.substring(0, 15)}...`;
            if (std.code === currentStandardCode) opt.selected = true;
            stdSelect.appendChild(opt);
        });
    }
    document.getElementById('fb-proposed-level').value = question.level;
    document.getElementById('fb-reason').value = '';
    document.getElementById('fb-submit-btn').style.display = 'block';
    document.getElementById('fb-loading-msg').style.display = 'none';
}

async function submitSpecificFeedback() {
    const proposedStd = document.getElementById('fb-proposed-std').value;
    const proposedLevel = document.getElementById('fb-proposed-level').value;
    const reason = document.getElementById('fb-reason').value.trim();
    const questionText = currentQuestions[currentLevelQ].q;
    if (!reason) { alert("이의 제기를 위한 판정 이유를 작성해주세요."); return; }

    document.getElementById('fb-submit-btn').style.display = 'none';
    document.getElementById('fb-loading-msg').style.display = 'block';

    try {
        const workerUrl = "https://script.google.com/macros/s/AKfycbwgx4RgF8FQxxL3jBgEQ5l369llADjhZ1NepulIdF4DdX18kBrB8oRQ4Ft0d5WdKtEF/exec"; 
        const userApiKey = localStorage.getItem('gemini_api_key');
        const response = await fetch(workerUrl, {
            method: 'POST', headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ 
                action: "review", questionText: questionText, currentStandardCode: currentStandardCode,
                currentLevel: currentQuestions[currentLevelQ].level, proposedStd: proposedStd,
                proposedLevel: proposedLevel, reason: reason, subject: currentSubject, apiKey: userApiKey
            })
        });

        if (!response.ok) throw new Error("백엔드 서버 통신 실패");
        const data = await response.json();
        const aiReviewText = data.candidates[0].content.parts[0].text;

        const feedbackData = {
            type: "문항 매칭 이의 제기", question: questionText, original_standard: currentStandardCode,
            original_level: currentQuestions[currentLevelQ].level, proposed_standard: proposedStd,
            proposed_level: proposedLevel, teacher_reason: reason, ai_review: aiReviewText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('developer_feedback').add(feedbackData);
        alert("✅ 선생님의 분석과 AI의 심층 검토 결과가 접수되었습니다!");
        document.getElementById('specific-feedback-panel').style.display = 'none';
    } catch (e) { alert("의견 전송 중 오류가 발생했습니다: " + e.message); } 
    finally {
        document.getElementById('fb-submit-btn').style.display = 'block';
        document.getElementById('fb-loading-msg').style.display = 'none';
    }
}

function addSubFactorRow(savedData = null) {
    const container = document.getElementById('sub-factors-list');
    const rowId = 'sub-factor-' + Date.now() + Math.random().toString(36).substr(2, 5);
    const row = document.createElement('div');
    row.id = rowId; row.className = 'sub-factor-row';
    row.style.cssText = "background: #fbf7ff; border: 1px solid #e9d5ff; padding: 12px; border-radius: 8px; display: flex; flex-direction: column; gap: 6px;";
    
    row.innerHTML = `
        <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" class="sub-factor-name" placeholder="요소명" value="${savedData ? savedData.name : ''}" style="flex: 2; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px;">
            <input type="number" class="sub-factor-max" placeholder="배점" value="${savedData ? savedData.max : ''}" style="flex: 1; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center;">
            <button type="button" onclick="removeSubFactorRow('${rowId}')" style="background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; padding: 4px 8px; border-radius: 4px; cursor: pointer;">삭제</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; text-align: center; font-size: 0.8rem; font-weight: bold;">
            <div>A<input type="number" class="sub-a" value="${savedData ? savedData.a : ''}" oninput="calculateSubFactorsTotal()" style="width:100%; text-align:center; border:1px solid #cbd5e1; border-radius:4px;"></div>
            <div>B<input type="number" class="sub-b" value="${savedData ? savedData.b : ''}" oninput="calculateSubFactorsTotal()" style="width:100%; text-align:center; border:1px solid #cbd5e1; border-radius:4px;"></div>
            <div>C<input type="number" class="sub-c" value="${savedData ? savedData.c : ''}" oninput="calculateSubFactorsTotal()" style="width:100%; text-align:center; border:1px solid #cbd5e1; border-radius:4px;"></div>
            <div>D<input type="number" class="sub-d" value="${savedData ? savedData.d : ''}" oninput="calculateSubFactorsTotal()" style="width:100%; text-align:center; border:1px solid #cbd5e1; border-radius:4px;"></div>
            <div>E<input type="number" class="sub-e" value="${savedData ? savedData.e : ''}" oninput="calculateSubFactorsTotal()" style="width:100%; text-align:center; border:1px solid #cbd5e1; border-radius:4px;"></div>
        </div>`;
    container.appendChild(row);
    calculateSubFactorsTotal();
}

function removeSubFactorRow(rowId) {
    const row = document.getElementById(rowId); if (row) row.remove();
    calculateSubFactorsTotal();
}

function calculateSubFactorsTotal() {
    const rows = document.querySelectorAll('.sub-factor-row');
    const mainInputs = document.querySelectorAll('#manual-assessment-modal .main-cut-input');
    if (rows.length === 0) { mainInputs.forEach(input => { input.readOnly = false; input.style.background = 'white'; }); return; }

    let totals = { a: 0, b: 0, c: 0, d: 0, e: 0 };
    rows.forEach(row => {
        totals.a += parseFloat(row.querySelector('.sub-a').value) || 0;
        totals.b += parseFloat(row.querySelector('.sub-b').value) || 0;
        totals.c += parseFloat(row.querySelector('.sub-c').value) || 0;
        totals.d += parseFloat(row.querySelector('.sub-d').value) || 0;
        totals.e += parseFloat(row.querySelector('.sub-e').value) || 0;
    });

    document.getElementById('manual-a').value = totals.a || '';
    document.getElementById('manual-b').value = totals.b || '';
    document.getElementById('manual-c').value = totals.c || '';
    document.getElementById('manual-d').value = totals.d || '';
    document.getElementById('manual-e').value = totals.e || '';

    mainInputs.forEach(input => { input.readOnly = true; input.style.background = '#f1f5f9'; });
}

async function acceptFeedback(feedbackId) {
    if(!confirm("현재 화면에 입력된 내용으로 문제은행(DB)을 즉시 수정하시겠습니까?")) return;
    try {
        const feedbackDoc = await db.collection('developer_feedback').doc(feedbackId).get();
        if (!feedbackDoc.exists) return;
        const fbData = feedbackDoc.data();
        
        const finalStd = document.getElementById(`admin-prop-std-${feedbackId}`).value.trim();
        const finalLvl = document.getElementById(`admin-prop-lvl-${feedbackId}`).value.trim();
        const finalAns = document.getElementById(`admin-prop-ans-${feedbackId}`).value.trim();
        const finalReason = document.getElementById(`admin-prop-reason-${feedbackId}`).value.trim();
        
        const snapshot = await db.collection('transformed_bank').where('question', '==', fbData.question).get();
        if (snapshot.empty) { alert("원본 문항을 찾을 수 없습니다."); return; }
        
        await db.collection('transformed_bank').doc(snapshot.docs[0].id).update({
            standard_code: finalStd, level: finalLvl, answer: finalAns, reason: finalReason
        });
        await db.collection('developer_feedback').doc(feedbackId).delete();
        alert("✅ 문항 데이터가 성공적으로 수정되었습니다!");
        openAdminFeedback(); 
    } catch (e) { alert("수락 처리 중 오류: " + e.message); }
}

async function rejectFeedback(feedbackId) {
    if(!confirm("이 의견을 반려(삭제)하시겠습니까?")) return;
    try {
        await db.collection('developer_feedback').doc(feedbackId).delete();
        alert("🗑️ 의견이 목록에서 삭제되었습니다.");
        openAdminFeedback(); 
    } catch (e) { alert("반려 처리 중 오류: " + e.message); }
}

function showAiReason(qIdx) {
    if (!parsedScores || !parsedScores[qIdx]) return;
    const q = parsedScores[qIdx];
    alert(`[문항 ${q.num} | AI 판정: ${q.level}]\n\n💡 판정 이유:\n${q.reason || "판정 이유가 없습니다."}`);
}

function toggleDictionaryPanel() {
    const panel = document.getElementById('floating-dictionary-panel');
    if (panel) {
        panel.classList.toggle('open');
        if (panel.classList.contains('open')) {
            const select = document.getElementById('dict-subject-select');
            if (select.options.length <= 1) changeDictGroup('math');
        }
    }
}

function changeDictGroup(groupId) {
    document.querySelectorAll('.dict-group-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.querySelector(`button[onclick="changeDictGroup('${groupId}')"]`);
    if(targetBtn) targetBtn.classList.add('active');
    
    const selectEl = document.getElementById('dict-subject-select'); selectEl.innerHTML = '';
    const map = curriculumMap[groupId]; let firstEnabledSubject = null;
    
    for (const category in map) {
        const optgroup = document.createElement('optgroup'); optgroup.label = category;
        map[category].forEach(sub => {
            const opt = document.createElement('option'); opt.value = sub.id;
            if (typeof subjectData !== 'undefined' && subjectData[sub.id] && subjectData[sub.id].standards && subjectData[sub.id].standards.length > 0) {
                opt.innerText = sub.name; if (!firstEnabledSubject) firstEnabledSubject = sub.id;
            } else {
                opt.innerText = sub.name + " (준비중)"; opt.disabled = true; opt.style.color = "#94a3b8";
            }
            optgroup.appendChild(opt);
        });
        selectEl.appendChild(optgroup);
    }
    if (firstEnabledSubject) { selectEl.value = firstEnabledSubject; loadDictionaryStandards(); } 
    else {
        selectEl.innerHTML = '<option value="">-- 등록된 과목이 없습니다 --</option>';
        document.getElementById('dict-accordion-container').innerHTML = '<p style="text-align:center; color:#ef4444; font-size:0.95rem; margin-top:2rem;">성취기준이 없습니다.</p>';
    }
}

function loadDictionaryStandards() {
    const subject = document.getElementById('dict-subject-select').value;
    const container = document.getElementById('dict-accordion-container');
    if (!subject) { container.innerHTML = '<p style="text-align:center;">과목을 선택하세요.</p>'; return; }

    const data = subjectData[subject]; if (!data || !data.standards) return;
    let html = '';
    data.standards.forEach((std, index) => {
        const lvlA = std.levels?.high || "데이터 없음";
        const lvlB = std.levels?.b || (std.levels?.high ? std.levels.high.replace("이해하여 설명할 수 있으며", "설명할 수 있고") : "데이터 없음");
        const lvlC = std.levels?.mid || "데이터 없음";
        const lvlD = std.levels?.d || (std.levels?.mid ? std.levels.mid.replace("이해하고", "알고") : "데이터 없음");
        const lvlE = std.levels?.low || "데이터 없음";

        html += `
        <div class="dict-accordion-item">
            <button class="dict-accordion-header" onclick="toggleAccordion(${index})">
                <span style="flex:1; padding-right:10px;">${std.code}</span>
                <span id="acc-icon-${index}">▼</span>
            </button>
            <div id="acc-body-${index}" class="dict-accordion-body">
                <strong style="color:#1e40af; display:block; margin-bottom:12px;">${std.desc}</strong>
                <div style="background:#fef2f2; padding:8px; border-radius:4px; margin-bottom:4px; border-left:3px solid #ef4444;"><strong>[A]</strong> ${lvlA}</div>
                <div style="background:#fffbeb; padding:8px; border-radius:4px; margin-bottom:4px; border-left:3px solid #f59e0b;"><strong>[B]</strong> ${lvlB}</div>
                <div style="background:#f0fdf4; padding:8px; border-radius:4px; margin-bottom:4px; border-left:3px solid #22c55e;"><strong>[C]</strong> ${lvlC}</div>
                <div style="background:#eff6ff; padding:8px; border-radius:4px; margin-bottom:4px; border-left:3px solid #3b82f6;"><strong>[D]</strong> ${lvlD}</div>
                <div style="background:#f8fafc; padding:8px; border-radius:4px; border-left:3px solid #94a3b8;"><strong>[E]</strong> ${lvlE}</div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function toggleAccordion(index) {
    const allHeaders = document.querySelectorAll('.dict-accordion-header');
    const allBodies = document.querySelectorAll('.dict-accordion-body');
    const allIcons = document.querySelectorAll('[id^="acc-icon-"]');
    const targetBody = document.getElementById(`acc-body-${index}`);
    const targetHeader = targetBody.previousElementSibling;
    const targetIcon = document.getElementById(`acc-icon-${index}`);
    const isCurrentlyOpen = targetBody.classList.contains('open');

    allBodies.forEach(body => body.classList.remove('open'));
    allHeaders.forEach(header => header.classList.remove('active'));
    allIcons.forEach(icon => icon.innerText = '▼');

    if (!isCurrentlyOpen) {
        targetBody.classList.add('open'); targetHeader.classList.add('active'); targetIcon.innerText = '▲';
        targetHeader.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function toggleCommonPassageTray() {
    const tray = document.getElementById('common-passage-tray');
    const icon = document.getElementById('tray-icon');
    if (tray.style.display === 'none') { tray.style.display = 'block'; icon.innerText = '📂'; } 
    else { tray.style.display = 'none'; icon.innerText = '📚'; }
}

function handlePassageFiles(event) {
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) { processPassageFile(files[i]); }
}

async function pastePassageFromClipboard() {
    try {
        const clipboardItems = await navigator.clipboard.read();
        let foundImage = false;
        for (const clipboardItem of clipboardItems) {
            for (const type of clipboardItem.types) {
                if (type.startsWith('image/')) {
                    const blob = await clipboardItem.getType(type);
                    processPassageFile(blob); foundImage = true;
                }
            }
        }
        if (!foundImage) alert("클립보드에 그림이 없습니다.");
    } catch (err) { alert("클립보드 권한을 허용해 주세요."); }
}

function processPassageFile(blob) {
    const reader = new FileReader();
    reader.onload = (e) => {
        compressCaptureImage(e.target.result, (compressed) => {
            commonPassages.push(compressed); renderPassageThumbnails();
        });
    };
    reader.readAsDataURL(blob);
}

function renderPassageThumbnails() {
    const container = document.getElementById('passage-thumbnails'); container.innerHTML = '';
    commonPassages.forEach((base64, idx) => {
        const wrap = document.createElement('div');
        wrap.style.cssText = "position: relative; width: 80px; height: 80px; border-radius: 6px; overflow: hidden; border: 1px solid #cbd5e1;";
        wrap.innerHTML = `
            <img src="${base64}" style="width: 100%; height: 100%; object-fit: cover;">
            <button onclick="removePassage(${idx})" style="position: absolute; top: 2px; right: 2px; background: rgba(239,68,68,0.9); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">&times;</button>
        `;
        container.appendChild(wrap);
    });
}

function removePassage(index) {
    commonPassages.splice(index, 1);
    renderPassageThumbnails();
}

async function updateQuestionCount() {
    currentSubjectQCount = {}; 
    const currentSubject = document.getElementById('admin-q-subject').value;

    if (currentSubject && currentSubject !== 'uncategorized') {
        try {
            const snapshot = await db.collection('transformed_bank').where('subject', '==', currentSubject).get();
            snapshot.forEach(doc => {
                const stdCode = doc.data().standard_code;
                if (stdCode && stdCode !== "unknown" && stdCode !== "코드없음") {
                    currentSubjectQCount[stdCode] = (currentSubjectQCount[stdCode] || 0) + 1;
                }
            });
            if (typeof renderStandardList === 'function') renderStandardList(); 
        } catch(e) { console.warn("문항 수 계산 실패", e); }
    }
}

// 💬 업무 메모장 연동용 실시간 모듈 함수 배치
let unsubscribeMemos = null;

function openMemoBoard() {
    document.getElementById('memo-modal').style.display = 'flex';
    if (unsubscribeMemos) unsubscribeMemos();
    unsubscribeMemos = db.collection('user_projects').doc(currentProjectId).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            const memos = data.memos || [];
            renderMemos(memos);
            markMemosAsRead(memos); 
        }
    });
}

function closeMemoBoard() {
    document.getElementById('memo-modal').style.display = 'none';
    if (unsubscribeMemos) { unsubscribeMemos(); unsubscribeMemos = null; }
    loadProjectDetails(); 
}

function renderMemos(memos) {
    const listEl = document.getElementById('memo-list');
    const currentUserEmail = auth.currentUser.email;
    if (memos.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#94a3b8; margin-top: 40%;">아직 등록된 메모가 없습니다.</div>'; return;
    }
    let html = '';
    memos.forEach(memo => {
        const isMe = memo.authorEmail === currentUserEmail;
        const align = isMe ? 'flex-end' : 'flex-start';
        const bgColor = isMe ? '#fef3c7' : '#f1f5f9';
        const nameStr = isMe ? '나' : memo.authorName;
        const readCount = (memo.readBy || []).filter(e => e !== memo.authorEmail).length;
        const readBadge = readCount > 0 ? `<span style="font-size:0.75rem; color:#f59e0b; font-weight:bold; margin: 0 4px;">읽음 ${readCount}</span>` : '';
        const timeStr = memo.timestamp ? new Date(memo.timestamp).toLocaleTimeString('ko-KR', {hour: '2-digit', minute:'2-digit'}) : '';

        html += `
        <div style="display: flex; flex-direction: column; align-items: ${align}; margin-bottom: 15px;">
            <span style="font-size: 0.8rem; color: #64748b; margin-bottom: 4px; font-weight: bold;">${nameStr}</span>
            <div style="display: flex; align-items: flex-end; flex-direction: ${isMe ? 'row-reverse' : 'row'};">
                <div style="background: ${bgColor}; padding: 10px 14px; border-radius: 12px; max-width: 250px; font-size: 0.95rem; word-break: break-all; white-space: pre-wrap; color: #1e293b;">${memo.text}</div>
                <div style="display: flex; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'}; margin: 0 6px;">
                    ${readBadge} <span style="font-size: 0.7rem; color: #94a3b8;">${timeStr}</span>
                </div>
            </div>
        </div>`;
    });
    listEl.innerHTML = html; listEl.scrollTop = listEl.scrollHeight;
}

async function submitMemo() {
    const inputEl = document.getElementById('memo-input');
    const text = inputEl.value.trim(); if (!text) return;
    const user = auth.currentUser;
    const newMemo = {
        id: 'memo_' + Date.now() + Math.random().toString(36).substr(2, 5), text: text,
        authorEmail: user.email, authorName: user.email.split('@')[0], timestamp: new Date().toISOString(), readBy: []
    };
    inputEl.value = '';
    try {
        await db.collection('user_projects').doc(currentProjectId).update({
            memos: firebase.firestore.FieldValue.arrayUnion(newMemo)
        });
    } catch(e) { alert("메모 전송 실패: " + e.message); }
}

async function markMemosAsRead(memos) {
    const userEmail = auth.currentUser.email; let needsUpdate = false;
    let updatedMemos = memos.map(memo => {
        if (memo.authorEmail !== userEmail && !(memo.readBy || []).includes(userEmail)) {
            needsUpdate = true; return { ...memo, readBy: [...(memo.readBy || []), userEmail] };
        }
        return memo;
    });
    if (needsUpdate) {
        try { await db.collection('user_projects').doc(currentProjectId).update({ memos: updatedMemos }); } catch(e) {}
    }
}

// 🟢 [신규 개발] 분할 분석 지원용 클라우드 안전 매칭 누적 엔진 탑재
async function sendAiResultsToTable() {
    if (extractedQuestionsArray.length === 0) { alert("분석된 문항이 없습니다."); return; }

    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            if(!doc.exists) throw new Error("문서를 찾을 수 없습니다.");
            
            let assessments = doc.data().assessments;
            let asm = assessments[currentEditingAssessmentIndex];
            let baseScores = asm.parsedScores || []; 

            extractedQuestionsArray.forEach((q) => {
                let levelMatch = q.text.match(/\[수준\]\s*(A\+|[A-E])/);
                let reasonMatch = q.text.match(/\[이유\]\s*([\s\S]*?)(?=\[|$)/); 
                
                let diffSelect = document.getElementById(`ai-diff-${extractedQuestionsArray.indexOf(q)}`);
                let diff = (diffSelect && diffSelect.value !== "") ? diffSelect.value : "";
                let isShort = String(q.num).includes('서') || String(q.num).startsWith('서');

                let finalLevel = levelMatch ? levelMatch[1] : "판정필요";
                let finalReason = reasonMatch ? reasonMatch[1].trim() : "AI 판정 이유가 분석되지 않았습니다.";

                // 🌟 순서(Index)가 아닌 문항 번호(q.num) 기반으로 조회 매칭
                let existingIdx = baseScores.findIndex(s => String(s.num).trim() === String(q.num).trim());

                if (existingIdx !== -1) {
                    baseScores[existingIdx].score = parseFloat(q.score) || 0;
                    if(diff !== "") baseScores[existingIdx].difficulty = diff;
                    baseScores[existingIdx].isShortAnswer = isShort; 
                    baseScores[existingIdx].level = finalLevel; 
                    baseScores[existingIdx].reason = finalReason; 
                } else {
                    baseScores.push({ 
                        num: String(q.num).trim(), score: parseFloat(q.score) || 0, difficulty: diff || "중", 
                        level: finalLevel, isShortAnswer: isShort, reason: finalReason
                    });
                }
            });

            // 문항 정렬 엔진 작동
            baseScores.sort((a, b) => {
                let aNum = parseInt(a.num.replace(/[^0-9]/g, '')) || 0;
                let bNum = parseInt(b.num.replace(/[^0-9]/g, '')) || 0;
                return aNum - bNum;
            });

            assessments[currentEditingAssessmentIndex].parsedScores = baseScores;
            if (currentUploadedImageUrl) assessments[currentEditingAssessmentIndex].imageUrl = currentUploadedImageUrl;
            transaction.update(docRef, { assessments: assessments });
        });
        
        const wrapper = document.getElementById('exam-inspector-wrapper');
        if (wrapper && wrapper.style.display !== 'none') toggleExamViewer();
        alert("✅ 분할 분석된 문항들이 기존 표의 번호 위치에 맞게 안전하게 병합되었습니다!");
    } catch(e) { alert("반영 실패: " + e.message); }
}

// 🟢 [신규 개발] AI 실시간 가리기/보이기 전역 플래그 제어 인터페이스 설계
let isAiHidden = false;
let cachedProjectData = null;
let cachedAsmData = null;

function toggleAiVisibility() {
    isAiHidden = !isAiHidden;
    if (cachedProjectData && cachedAsmData) {
        renderCollaborativeTable(cachedProjectData, cachedAsmData);
    }
}

// 🟢 실시간 교사간 협업 매트릭스 렌더링 코어 교체 완본
function renderCollaborativeTable(projectData, asm) {
    const container = document.getElementById('score-table-container');
    const currentUserEmail = auth.currentUser.email;
    
    let allMembers = projectData.collaborators || [];
    if (projectData.ownerEmail && !allMembers.includes(projectData.ownerEmail)) {
        allMembers.unshift(projectData.ownerEmail); 
    }
    if (!allMembers.includes(currentUserEmail)) {
        allMembers.push(currentUserEmail); 
    }
    const collaborators = [...new Set(allMembers)]; 

    const teacherInputs = asm.teacherInputs || {};
    const baseQuestions = asm.parsedScores || [];

    if (baseQuestions.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 2rem; color: #94a3b8;">[표 생성]을 누르거나 AI 분석을 시작하세요.</p>'; return;
    }

    let html = `<table class="score-table">
                <thead style="position: sticky; top: 0; background: #f1f5f9; z-index: 1;">
                <tr>
                    <th>문항</th>
                    <th style="min-width: 120px;">
                        난이도<br>
                        <div style="font-size:0.75rem; font-weight:normal; margin-top:4px; display:flex; gap:4px; justify-content:center;">
                            <select id="batch-diff-val" style="padding:2px; border-radius:4px;" onchange="lastBatchDiff = this.value">
                            <option value="상" ${lastBatchDiff === '상' ? 'selected' : ''}>상</option>
                            <option value="중" ${lastBatchDiff === '중' ? 'selected' : ''}>중</option>
                            <option value="하" ${lastBatchDiff === '하' ? 'selected' : ''}>하</option>
                        </select>
                            <button onclick="applyBatchDifficulty()" style="background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer;">일괄넣기</button>
                        </div>
                    </th> 
                    <th>배점</th>
                    
                    <th style="background: #f8fafc; min-width: 115px; text-align: center; vertical-align: middle;">
                        🤖 AI 판정<br>
                        <button onclick="toggleAiVisibility()" style="margin-top:5px; background:${isAiHidden ? '#10b981' : '#64748b'}; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: 0.2s;">
                            ${isAiHidden ? '👁️ 결과 보이기' : '🙈 결과 가리기'}
                        </button>
                    </th>
                    
                    <th style="background:#ecfdf5; border-bottom: 2px solid #10b981;">
                        내 판정<br>
                        <button onclick="copyAiLevelsToMine()" style="margin-top:5px; background:#10b981; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">🤖 일괄 복사</button>
                    </th>`;
                    
    collaborators.forEach(email => {
        if (email !== currentUserEmail) html += `<th>${email.split('@')[0]} 선생님</th>`;
    });
    html += `<th style="min-width:90px; text-align:center;">문항 관리</th></tr></thead><tbody>`;

    const levelToNum = { 'A+': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1 };

    baseQuestions.forEach((q, qIdx) => {
        const isShort = String(q.num).includes('서') || String(q.num).startsWith('서');
        const myInput = teacherInputs[currentUserEmail]?.[qIdx]?.level || '';
        
        let minNum = myInput ? levelToNum[myInput] : null;
        let maxNum = myInput ? levelToNum[myInput] : null;

        collaborators.forEach(email => {
            const theirInput = teacherInputs[email]?.[qIdx]?.level;
            if (theirInput) {
                const num = levelToNum[theirInput];
                if (minNum === null || num < minNum) minNum = num;
                if (maxNum === null || num > maxNum) maxNum = num;
            }
        });

        const isWarning = (minNum !== null && maxNum !== null && (maxNum - minNum >= 2));
        const trStyle = isWarning ? 'background:#fee2e2; border: 2px solid #ef4444;' : (isShort ? 'background:#fff7ed;' : '');
        const diff = q.difficulty || '선택하세요';

        let aiCellContentHtml = '';
        if (isAiHidden) {
            aiCellContentHtml = `
                <span style="background:#f1f5f9; color:#94a3b8; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:0.8rem; border:1px dashed #cbd5e1; display:inline-block; cursor:pointer;" onclick="alert('상단의 [👁️ 결과 보이기] 버튼을 누르시면 전체 AI 판정 내역이 공개됩니다!')">🔮 블라인드</span>
                <br>
                <button disabled style="margin-top: 6px; background: #f8fafc; color: #cbd5e1; border: 1px solid #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; cursor: not-allowed;">🔒 가려짐</button>`;
        } else {
            aiCellContentHtml = `
                <span style="background:${q.level === 'A+' ? '#ef4444' : '#8b5cf6'}; color:white; padding:2px 6px; border-radius:4px; font-weight:bold;">${q.level || 'C'}</span>
                <br>
                <button onclick="showAiReason(${qIdx})" style="margin-top: 6px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">🔍 판정이유</button>`;
        }

        html += `<tr style="${trStyle}">
            <td style="font-size: 0.9rem; font-weight:bold; text-align:center;">${q.num}${isWarning ? ' 🚨' : ''}</td>
            <td style="width: 120px; vertical-align: middle;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <input type="checkbox" class="diff-batch-cb" data-idx="${qIdx}" style="transform: scale(1.3); margin: 0;">
                    <select class="diff-select" onchange="updateBaseDifficulty(${qIdx}, this.value)" style="padding:4px; border-radius:4px; width: 75px; font-weight: 500;">
                        <option value=""   ${diff==='선택하세요' || diff===''?'selected':''}>선택</option>
                        <option value="상" ${diff==='상'?'selected':''}>상</option>
                        <option value="중" ${diff==='중'?'selected':''}>중</option>
                        <option value="하" ${diff==='하'?'selected':''}>하</option>
                    </select>
                </div>
            </td>
            <td><input type="number" step="0.1" class="score-input" data-num="${q.num}" value="${q.score}" onchange="updateBaseScore(${qIdx}, this.value)" style="width:50px;"></td>
            <td style="text-align: center; vertical-align: middle;">${aiCellContentHtml}</td>
            <td>
                <select class="level-select" style="padding:4px; font-weight:bold;" onchange="saveMyInput(${qIdx}, this.value)">
                    <option value="" ${!myInput ? 'selected' : ''}>선택</option>
                    <option value="A+" ${myInput==='A+'?'selected':''}>A+</option>
                    <option value="A" ${myInput==='A'?'selected':''}>A</option><option value="B" ${myInput==='B'?'selected':''}>B</option>
                    <option value="C" ${myInput==='C'?'selected':''}>C</option><option value="D" ${myInput==='D'?'selected':''}>D</option><option value="E" ${myInput==='E'?'selected':''}>E</option>
                </select>
            </td>`;

        collaborators.forEach(email => {
            if (email !== currentUserEmail) {
                const theirInput = teacherInputs[email]?.[qIdx]?.level;
                html += `<td>${theirInput ? "<span style='color:#10b981; font-weight:bold;'>입력완료🔒</span>" : "<span style='color:#cbd5e1;'>대기중</span>"}</td>`;
            }
        });
        html += `<td style="text-align:center; vertical-align: middle;"><button onclick="deleteTableQuestion(${qIdx})" style="background:#fee2e2; color:#ef4444; border:1px solid #fca5a5; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem;">🗑️ 삭제</button></td></tr>`;
    });
    html += `</tbody></table>`; container.innerHTML = html; 

    let externalHtml = `<div style="text-align: right; margin-bottom: 10px;">
    <button onclick="alert('더 안정적인 서비스 제공을 위해 현재 시스템을 점검 및 업데이트 중입니다. 핵심 기능인 점수 산출은 정상적으로 이용 가능합니다! 🛠️');" style="background: #94a3b8; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">📄 시험지 파일 및 편집 확인 (업데이트 예정) ⏳</button></div>`;

    const readyStatus = asm.readyStatus || {};
    let statusHtml = `<div style="padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">`;
    statusHtml += `<div><strong style="color:#334155; display:block; margin-bottom:5px;">👥 공동 작업 진행 상황:</strong>`;
    let allReady = true;
    
    collaborators.forEach(email => {
        const status = readyStatus[email] || '대기 중';
        if (status !== '완료') allReady = false; 
        const name = email.split('@')[0]; 
        const isReady = status === '완료'; const isWorking = status === '작성 중';
        const textColor = isReady ? '#166534' : (isWorking ? '#991b1b' : '#64748b');
        const bgColor = isReady ? '#dcfce7' : (isWorking ? '#fee2e2' : '#f1f5f9');
        const iconText = isReady ? '✅ 저장 완료' : (isWorking ? '✍️ 작성 중' : '⏳ 대기 중');

        statusHtml += `<span style="display:inline-block; margin-right: 8px; padding: 4px 8px; border-radius: 4px; background: ${bgColor}; color: ${textColor}; font-size: 0.85rem; font-weight: bold; border: 1px solid ${isReady ? '#86efac' : (isWorking ? '#fca5a5' : '#e2e8f0')};">
            ${name}: ${iconText}</span>`;
    });
    statusHtml += `</div>`;

    const myStatus = readyStatus[currentUserEmail] || '대기 중'; const amIReady = myStatus === '완료';
    statusHtml += `<div><button onclick="markAsReady()" style="background: ${amIReady ? '#10b981' : '#ea580c'}; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.95rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${amIReady ? '✅ 내 판정 저장 완료' : '💾 내 판정 최종 저장하기'}</button></div></div>`;

    externalHtml += statusHtml;
    const externalContainer = document.getElementById('table-external-controls');
    if(externalContainer) externalContainer.innerHTML = externalHtml;

    updateStep2Total();
    const nextBtn = document.getElementById('btn-next-to-step3');
    if (nextBtn) {
        nextBtn.style.display = 'inline-block';
        if (allReady) {
            nextBtn.style.opacity = '1'; nextBtn.style.cursor = 'pointer'; nextBtn.onclick = handleNextToPath1Result;
            nextBtn.innerHTML = "분할점수 산출하기 (M자 그룹화) ➡️"; nextBtn.style.background = "#ea580c";
        } else {
            nextBtn.style.opacity = '0.5'; nextBtn.style.cursor = 'not-allowed';
            nextBtn.innerHTML = "🔒 모두 '저장 완료' 시 산출 가능"; nextBtn.style.background = "#64748b";
        }
    }
    parsedScores = baseQuestions; setTimeout(initDiffShiftClick, 100); 
}

async function startEditAssessment(index) {
    currentEditingAssessmentIndex = index;
    history.pushState({ section: 'cut-score', sub: 'step2' }, "", "#cut-score/step2");
    document.getElementById('project-detail-view').style.display = 'none';
    document.getElementById('cut-score-step2').style.display = 'block';
    
    if (unsubscribeProject) unsubscribeProject();
    unsubscribeProject = db.collection('user_projects').doc(currentProjectId).onSnapshot(doc => {
        if(doc.exists) {
            const projectData = doc.data(); const asm = projectData.assessments[index];
            document.getElementById('current-assessment-info').innerText = `📌 ${asm.name} (반영 비율: ${asm.weight}%)`;
            
            cachedProjectData = projectData; cachedAsmData = asm;
            renderCollaborativeTable(projectData, asm);

            if (asm.imageUrl) {
                const imgEl = document.getElementById('exam-img-display');
                const pdfEl = document.getElementById('exam-pdf-display');
                const listContainer = document.getElementById('extracted-questions-list');

                if (asm.imageUrl.toLowerCase().includes("pdf")) {
                    if(imgEl) imgEl.style.display = 'none';
                    if(pdfEl) { pdfEl.src = asm.imageUrl; pdfEl.style.display = 'block'; }
                } else {
                    if(pdfEl) pdfEl.style.display = 'none';
                    if(imgEl) { imgEl.src = asm.imageUrl; imgEl.style.display = 'block'; }
                }
                currentUploadedImageUrl = asm.imageUrl;

                const wrapper = document.getElementById('exam-inspector-wrapper');
                const toggleBtn = document.getElementById('exam-viewer-toggle-btn');
                if (wrapper) { wrapper.style.display = 'flex'; if (toggleBtn) toggleBtn.innerText = "📄 시험지 닫기 🔼"; }

                if (extractedQuestionsArray.length === 0 && listContainer) {
                    listContainer.innerHTML = `
                        <div style="padding: 3rem 1rem; text-align: center; color: #475569; background: white; border-radius: 8px; border: 1px dashed #cbd5e1;">
                            <span style="font-size: 3rem;">📄</span>
                            <p style="font-weight: bold; font-size: 1.1rem; margin-top: 10px; color: #1e3a8a;">시험지가 로드되었습니다.</p>
                            <p style="font-size: 0.95rem; line-height: 1.6;">방장 선생님이 이미 문항을 표에 반영했습니다.<br>왼쪽 시험지를 보고 위의 <strong>[표]</strong>에서 채점을 진행해 주세요.</p>
                        </div>`;
                }
            }
        }
    });
}

// 🟢 협업 표 문항 영구 삭제 및 동적 정렬 함수 구현체 배치
async function deleteTableQuestion(qIdx) {
    if(!confirm("이 문항을 전체 협업 표에서 영구 삭제하시겠습니까?\n삭제 후 문항 번호 자동 조정 및 합계 점수가 실시간으로 동기화됩니다.")) return;
    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        const doc = await docRef.get(); if(!doc.exists) return;

        let assessments = doc.data().assessments;
        let asm = assessments[currentEditingAssessmentIndex];
        let baseScores = asm.parsedScores || [];
        
        baseScores.splice(qIdx, 1);
        let objIdx = 1; let subIdx = 1;
        
        baseScores.forEach(q => {
            if (String(q.num).includes('서') || String(q.num).startsWith('서')) {
                q.num = '서' + subIdx; subIdx++;
            } else if (!isNaN(parseInt(q.num))) {
                q.num = String(objIdx); objIdx++;
            }
        });
        asm.parsedScores = baseScores;
        if (asm.teacherInputs) {
            Object.keys(asm.teacherInputs).forEach(email => {
                if (asm.teacherInputs[email] && asm.teacherInputs[email].length > qIdx) {
                    asm.teacherInputs[email].splice(qIdx, 1);
                }
            });
        }
        await docRef.update({ assessments: assessments });
        alert("🗑️ 문항이 삭제되었으며 동료 교사들의 화면에 실시간 반영되었습니다.");
    } catch(e) { alert("문항 삭제 실패: " + e.message); }
}

// 🟢 [부활 및 통합 완료] 인지적 복잡성 평가 루브릭 텍스트 모듈
function getSystemRubric() {
    return `
[1] 일반적 특성 및 인지적 복잡성
- A수준: 학생들이 성취기준을 포괄적으로 이해하고 지식을 유기적으로 연결하여 복잡한 문제를 해결할 수 있음.
- B수준: 성취기준에 명시된 지식과 기능을 비교적 원활하게 수행하고 적용할 수 있음.
- C수준: 기본적인 개념과 원리를 이해하고 전형적이고 단순한 상황에 적용할 수 있음.
- D수준: 기초적인 지식과 기능을 부분적으로만 수행할 수 있음.
- E수준: 성취기준에 대한 이해가 매우 제한적이며 보충 학습이 필요함.

[2] 핵심 서술어 및 종결어미 패턴
- A수준: 동사(설명하다, 분석하다, 정당화하다, 평가하다), 어미(~수 있다, ~을 원활히 수행한다)
- B수준: 동사(수행하다, 비교하다, 적용하다), 어미(~할 수 있다)
- C수준: 동사(이해하다, 계산하다, 구하다), 어미(~한다)
- D수준: 동사(알다, 식별하다), 어미(~하는 수준이다)
- E수준: 동사(기억하다, 모방하다), 어미(~에 그친다)

[3] 수식어 및 부사어 결합 조건
- A수준: 체계적으로, 논리적으로, 엄밀하게, 다각도로
- B수준: 비교적 정확하게, 일반적인 상황에서
- C수준: 전형적인, 간단한, 안내된
- D수준: 일부, 제한된 상황에서
- E수준: 교사의 도움이 주어질 때, 최소한의

[4] MCP(최소 능력자) 판별 준거
- A수준: 단순 암기나 반복 숙달을 넘어서 추론과 정당화 역량을 보이는가?
- B수준: 복잡도가 중간 수준인 상황에서 개념을 결합할 수 있는가?
- C수준: 단일 교과 지식을 정형화된 공식에 대입할 수 있는가?
- D수준: 용어나 기호의 정의를 최소한으로 식별할 수 있는가?
- E수준: 기본 연산이나 사실 기억에 도달하지 못했는가?`;
}

// ==========================================
// 🌟 [최종 통합] Vite 모듈 환경용 전역 브릿지 허브 게이트웨이 (중복 제로 완본)
// ==========================================
const exposeToWindow = {
    handleLogin, handleLogout, handleDeleteAccount, openFeedback, openAdminFeedback,
    openAdminMode, openSettings, closeSettings, closeFeedback, closeModal,
    closeAdminFeedback, saveApiKey, submitFeedback, showSection,
    openAnalysisMode, startLevelMatching, checkLevelAnswer, nextLevelQuestion,
    backToStandardSelection, saveChecklist, openModal, loadBookmark, openBookmarkModal,
    closeBookmarkModal, createNewProject, backToProjectList, openManualAssessmentModal,
    closeManualAssessmentModal, saveManualAssessment, generateEmptyScoreTable,
    downloadScoreTemplate, handleExcelUpload, openAiHelper, handleExamUpload,
    handleNextToPath1Result, goBackStep, saveAssessmentToProject, saveWrittenAssessmentShell,
    addSubFactorRow, removeSubFactorRow, calculateSubFactorsTotal, saveStandardToDB,
    loadStandardsForEdit, populateEditFields, updateStandardInDB, deleteStandardFromDB,
    loadStandardsForQuestion, saveQuestionToDB, loadStandardsForManage, loadQuestionsForEdit,
    populateQuestionEditFields, updateQuestionInDB, deleteQuestionFromDB, updateUniversalFilter,
    downloadUniversalData, uploadUniversalData, handleImageUpload, setAnalysisMode,
    executeAnalysis, triggerSaveBackgroundAndReset, resetAnalysis, sendChatMessage,
    submitSpecificFeedback, acceptFeedback, rejectFeedback, updateMathPreview,
    startPartialCapture, pasteImageToQuestion, saveBankAndApplyTable, sendAiResultsToTable,
    deleteProject, inviteCollaborator, kickFromProject, openProject, toggleGlobalEditMode,
    startEditAssessment, editManualAssessment, deleteAssessment, updateBaseDifficulty,
    updateBaseScore, saveMyInput, copyAiLevelsToMine, applyBatchDifficulty,
    calculateTotalCutScores, openSpecificFeedbackPanel, updateStep2Total, markAsReady, goToStep, updateQuestionCount,
    
    deleteQuestion, mergeWithPrevious, removeQuestionImage, deleteTableQuestion, toggleAiVisibility,
    deleteSavedAssessment, 
   
    changeGroup, openMemoBoard, closeMemoBoard, submitMemo, changeSubject, showAiReason,
    toggleDictionaryPanel, changeDictGroup, loadDictionaryStandards, toggleAccordion,
    toggleCommonPassageTray, handlePassageFiles, pastePassageFromClipboard, removePassage
};

for (const [fnName, fn] of Object.entries(exposeToWindow)) {
    window[fnName] = fn;
}