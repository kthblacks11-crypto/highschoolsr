const firebaseConfig = {
    apiKey: "AIzaSyDq5c9_BMx-zoYHUAGAp8B3jbvi3tj8HXo",
    authDomain: "math-asa-project-2026.firebaseapp.com",
    projectId: "math-asa-project-2026",
    storageBucket: "math-asa-project-2026.firebasestorage.app",
    messagingSenderId: "1045151452788",
    appId: "1:1045151452788:web:bf69cb26e0be84dd8b0b21"
  };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
// main.js의 7번 줄 바로 다음에 붙여넣으세요
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// 로그인 상태에 따라 화면을 자동으로 바꿔주는 기능입니다.
auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const adminBtn = document.getElementById('admin-btn'); // 관리자 버튼 찾기

    if (user) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        userInfo.innerText = user.displayName + " 선생님";
        
        // 로그인한 사람이 선생님(관리자)일 때만 관리자 버튼 짠! 하고 나타남
        if (user.email === "kthblacks11@gmail.com") {
            adminBtn.style.display = 'inline-block';
        } else {
            adminBtn.style.display = 'none';
        }
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        userInfo.innerText = "";
        if(adminBtn) adminBtn.style.display = 'none'; // 로그아웃하면 숨김
    }
});

async function handleLogin() {
    try { await auth.signInWithPopup(provider); }
    catch (error) { alert("로그인에 실패했습니다."); }
}

function handleLogout() {
    if(confirm("로그아웃 하시겠습니까?")) { auth.signOut(); }
}

// 📂 [핵심 요건 완벽 수행] 기존 문제 100% 보존 + 구버전 성취기준 복구 및 수준 합성


let currentSubject = "common2";
let currentStandardCode = null;
let currentLevelQ = 0;
let currentQuestions = [];
let selectedFile = null;
let currentChatContext = ""; 

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 💡 시스템 모달 관리 (로그인 체크 로직 추가)
function openSettings() { 
    // API 키를 입력하기 전에 로그인이 되어있는지 먼저 확인합니다.
    const user = auth.currentUser;
    if (!user) {
        alert("기기 간 API 키 자동 연동을 위해 먼저 구글 로그인이 필요합니다.\n우측 상단의 [🔑 로그인] 버튼을 눌러주세요!");
        return; // 로그인이 안 되어있으면 설정 창을 열어주지 않음
    }
    document.getElementById('api-key-input').value = localStorage.getItem('gemini_api_key') || "";
    document.getElementById('settings-modal').style.display = 'flex'; 
}
function closeSettings() { document.getElementById('settings-modal').style.display = 'none'; }
function openFeedback() { document.getElementById('feedback-modal').style.display = 'flex'; }
function closeFeedback() { document.getElementById('feedback-modal').style.display = 'none'; }
function closeModal() { document.getElementById('level-modal').style.display = 'none'; }
function closeAdminFeedback() { document.getElementById('admin-feedback-modal').style.display = 'none'; }

function saveApiKey() {
    const key = document.getElementById('api-key-input').value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        alert("API 키가 저장되었습니다.");
        closeSettings();
    }
}

// 💡 의견 보내기 (실패 시 로컬 임시 저장 기능 포함)
async function submitFeedback() {
    const text = document.getElementById('feedback-message').value.trim();
    if(!text) { alert("의견을 입력해주세요!"); return; }
    
    // 전송 버튼을 잠시 비활성화하여 중복 클릭 방지
    const submitBtn = document.querySelector('#feedback-modal .save-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = "전송 중...";

    try {
        await db.collection('developer_feedback').add({
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("의견이 성공적으로 전송되었습니다. 감사합니다!");
        document.getElementById('feedback-message').value = "";
    } catch(e) {
        console.error("의견 전송 실패, 로컬에 임시 저장합니다:", e);
        
        // 에러 발생 시 브라우저의 localStorage에 의견을 임시 저장
        let pending = JSON.parse(localStorage.getItem('pending_feedback')) || [];
        pending.push({ text: text, time: new Date().toISOString() });
        localStorage.setItem('pending_feedback', JSON.stringify(pending));

        alert("현재 서버 통신이 원활하지 않아 의견이 안전하게 임시 저장되었습니다. 다음 접속 시 자동으로 전송됩니다.");
        document.getElementById('feedback-message').value = "";
    } finally {
        // 성공하든 실패하든 모달 창을 닫고 버튼 상태 복구
        submitBtn.disabled = false;
        submitBtn.innerText = "의견 전송하기";
        closeFeedback(); 
    }
}

// 📥 관리자용 의견 확인 (로그인 형식으로 보호)
// main.js의 296~326번 줄을 아래로 교체하세요
async function openAdminFeedback() {
    const user = auth.currentUser;
    const adminEmail = "kthblacks11@gmail.com"; // 선생님의 관리자 계정 이메일입니다.

    if (!user) {
        alert("먼저 구글 로그인을 해주세요.");
        return;
    }
    if (user.email !== adminEmail) {
        alert("관리자 계정만 접근할 수 있습니다.");
        return;
    }

    document.getElementById('admin-feedback-modal').style.display = 'flex';
    const listEl = document.getElementById('admin-feedback-list');
    listEl.innerHTML = "<p style='text-align:center; padding: 2rem;'>의견 목록을 불러오는 중입니다...</p>";
    
    try {
        const snapshot = await db.collection('developer_feedback').orderBy('timestamp', 'desc').get();
        if(snapshot.empty) {
            listEl.innerHTML = "<p style='text-align:center; color:#64748b;'>아직 접수된 의견이 없습니다.</p>";
            return;
        }
        let html = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : "방금 전";
            html += `<div style="background: white; padding: 1.2rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid var(--primary); box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <p style="margin:0 0 0.5rem 0; font-size:0.8rem; color:var(--text-light); font-weight:bold;">🕒 ${date}</p>
                        <p style="margin:0; font-size:0.95rem; white-space:pre-wrap; line-height:1.5;">${data.text}</p>
                     </div>`;
        });
        listEl.innerHTML = html;
    } catch(e) {
        listEl.innerHTML = "<p style='color:red;'>데이터 로드 실패. 보안 규칙을 확인하세요.</p>";
    }
}

function handleImageUpload(event) {
    selectedFile = event.target.files[0];
    displayPreview(selectedFile);
}

function handlePaste(event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            selectedFile = item.getAsFile();
            displayPreview(selectedFile);
            showSection('problem-analysis');
            break;
        }
    }
}

function displayPreview(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('image-preview').src = e.target.result;
        document.getElementById('preview-container').style.display = 'block';
        document.getElementById('upload-placeholder').style.display = 'none';
        document.getElementById('analyze-btn').style.display = 'block';
        document.getElementById('analysis-result').style.display = 'none';
        
        if(document.getElementById('ai-chat-container')) {
            document.getElementById('ai-chat-container').style.display = 'none';
            document.getElementById('chat-history').innerHTML = ""; 
            currentChatContext = ""; 
        }
    }
    reader.readAsDataURL(file);
}

// 🎯 엄밀한 AI 분석 요청 프롬프트 적용
async function analyzeProblem() {
    const user = auth.currentUser; // 🟢 추가된 로그인 체크 로직
    const apiKey = localStorage.getItem('gemini_api_key');

    // 1단계: 로그인 여부 먼저 확인
    if (!user) {
        alert("먼저 우측 상단의 [🔑 로그인] 버튼을 눌러주세요.\n(로그인 후 API 키를 연동하면 스마트폰에서도 바로 사용할 수 있습니다!)");
        return;
    }

    // 2단계: API 키 여부 확인
    if (!apiKey) {
        alert("⚙️ 분석을 위해서는 구글 AI 스튜디오 API 키 연결이 필요합니다.\n안내창을 열어드릴 테니 확인해 주세요!");
        openSettings();
        return;
    }

    document.getElementById('analyze-btn').style.display = 'none';
    document.getElementById('analysis-loading').style.display = 'block';
    document.getElementById('loading-status').innerText = "AI 교사가 문제를 정밀 분석 및 시각화 중입니다...";

    try {
        const base64Image = document.getElementById('image-preview').src.split(',')[1];
        
        let standardsInfo = "";
        for (const key in subjectData) {
            if (subjectData[key].standards && subjectData[key].standards.length > 0) {
                standardsInfo += `\n--- ${subjectData[key].title} ---\n`;
                standardsInfo += subjectData[key].standards.map(s => `${s.code} ${s.desc}`).join('\n');
            }
        }
        
const prompt = `당신은 대한민국 최고의 수학 교사입니다. 문항을 엄밀히 분석하여 아래 4가지 대괄호 태그를 '토씨 하나 틀리지 말고' 사용하여 답변하세요. 마크다운 볼드체(**)를 태그 이름에 절대 사용하지 마세요.

[교과 및 단원]: 해당 문제의 교과명과 단원명을 명시하세요.

[성취기준 및 수준]: 
아래 제공된 <과목별 성취기준 목록>에서 가장 적합한 것을 골라 반드시 아래의 3줄 형식으로 작성하세요.
성취기준: [코드] 성취기준의 전체 내용
성취수준: A~E 중 택 1
판정 이유: 수학적 엄밀성과 사고 도약의 단계를 근거로 서술
<과목별 성취기준 목록>
${standardsInfo}
</과목별 성취기준 목록>

[핵심 개념]: 문제 해결에 필요한 핵심 공식, 정리, 또는 수학적 원리를 글머리 기호(•)를 사용하여 2~3가지로 명확하고 깊이 있게 제시하세요. 단순 나열이 아닌 조건과 정의를 엄밀하게 기술하세요.

[상세 풀이]: 논리적 비약이나 생략 없이 가독성 좋은 단계별 풀이를 작성하세요. 반드시 '1단계:', '2단계:' 형식으로 문단을 시작하세요. 절대 '[상세 풀이]:' 라는 태그 이름을 '[문제 풀이]:' 등으로 변경하지 마세요.

[중요 지침]: 모든 수학 기호, 변수, 숫자, 수식은 반드시 앞뒤로 $ 기호를 감싸서 LaTeX 문법으로 작성하세요. 수식 작성 시 일반 유니코드 특수문자(예: ×, ÷, ≤, ≥, ≠)를 절대 사용하지 말고, 반드시 LaTeX 명령어(예: \\times, \\div, \\le, \\ge, \\neq)를 사용하세요.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: selectedFile.type, data: base64Image } }
                    ]
                }],
                generationConfig: { temperature: 0.1, topP: 0.9, maxOutputTokens: 3072 }
            })
        });

        if (!response.ok) throw new Error("API 오류가 발생했습니다.");

        const result = await response.json();
        const analysisText = result.candidates[0].content.parts[0].text;

        renderSophisticatedResult(analysisText);

        document.getElementById('analysis-loading').style.display = 'none';
        document.getElementById('analysis-result').style.display = 'block';
        
        currentChatContext = analysisText; 
        document.getElementById('ai-chat-container').style.display = 'block'; 
        
        if (window.MathJax) {
            MathJax.typesetClear();
            MathJax.typesetPromise([document.getElementById('analysis-result')]).catch(err => console.log(err));
        }
        processAndSaveBackground(analysisText, apiKey);

    } catch (error) {
        alert("⚠️ 분석 오류: " + error.message);
        document.getElementById('analysis-loading').style.display = 'none';
        document.getElementById('analyze-btn').style.display = 'block';
    }
}

// 🎯 태그 이름 오타 방어 및 렌더링
function renderSophisticatedResult(rawText) {
    const container = document.getElementById('res-container');
    container.innerHTML = "";

    // AI 오타 강제 치환 (상세풀이, 문제풀이 등)
    let text = rawText.replace(/\*\*/g, '');
    text = text.replace(/\[\s+/g, '[').replace(/\s+\]/g, ']');
    text = text.replace(/\[상세풀이\]:/g, '[상세 풀이]:');
    text = text.replace(/\[문제\s*풀이.*?\]:/g, '[상세 풀이]:');
    
    const configs = [
        { key: "[교과 및 단원]:", title: "1. 교과명 및 단원명", icon: "📚", bg: "#f3f4f6", border: "#64748b" },
        { key: "[성취기준 및 수준]:", title: "2. 성취기준과 성취수준", icon: "📍", bg: "#eff6ff", border: "#3b82f6" },
        { key: "[핵심 개념]:", title: "3. 엄밀한 핵심 개념", icon: "💡", bg: "#fffbeb", border: "#f59e0b" },
        { key: "[상세 풀이]:", title: "4. 단계별 정밀 풀이", icon: "✍️", bg: "#f0fdf4", border: "#10b981" }
    ];

    configs.forEach((conf, index) => {
        let content = "";
        const startIndex = text.indexOf(conf.key);
        
        if (startIndex !== -1) {
            const contentStart = startIndex + conf.key.length;
            let nextKeyIndex = text.length; 
            
            configs.forEach((otherConf, otherIndex) => {
                if (index !== otherIndex) {
                    const idx = text.indexOf(otherConf.key, contentStart);
                    if (idx !== -1 && idx < nextKeyIndex) {
                        nextKeyIndex = idx;
                    }
                }
            });
            content = text.substring(contentStart, nextKeyIndex).trim();
        }

        if (!content) content = "데이터를 분석 중이거나 형식이 일치하지 않습니다.";

        // HTML 태그 변환
        if (conf.key === "[성취기준 및 수준]:") {
            content = content.replace(/\n/g, ' ')
                             .replace(/(성취기준:)/g, '<strong style="color:#2563eb; font-size: 1.05rem;">$1</strong>')
                             .replace(/(성취수준:)/g, '<br><strong style="color:#2563eb; font-size: 1.05rem; margin-top: 8px; display: inline-block;">$1</strong>')
                             .replace(/(판정 이유:)/g, '<br><strong style="color:#2563eb; font-size: 1.05rem; margin-top: 8px; display: inline-block;">$1</strong>');
        }
        if (conf.key === "[상세 풀이]:") {
            content = content.replace(/(\d+단계[:.])/g, '<br><br><span style="background-color:#dbeafe; color:#1e40af; padding:4px 10px; border-radius:20px; font-weight:bold; font-size:0.95rem; display:inline-block; margin-bottom:8px;">$1</span><br>');
            if(content.startsWith('<br><br>')) content = content.substring(8);
            if(content.startsWith('<br>')) content = content.substring(4);
        }
        if (conf.key === "[핵심 개념]:") {
            content = content.replace(/\n/g, '<br>');
        }

        const card = document.createElement('div');
        card.style.cssText = `background: ${conf.bg}; border: 1px solid ${conf.border}44; border-left: 6px solid ${conf.border}; padding: 1.2rem; border-radius: 12px; margin-bottom: 1.2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);`;
        
        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.8rem;">
                <span style="font-size:1.2rem;">${conf.icon}</span>
                <strong style="font-size:1.1rem; color:#1e293b;">${conf.title}</strong>
            </div>
            <div class="analysis-content" style="color:#334155; line-height:1.8; font-size:0.95rem;">${content}</div>
        `;
        container.appendChild(card);
    });
}

// 🎯 신뢰도(성취수준 A~E) 유지 로직
async function processAndSaveBackground(analysisText, apiKey) {
    try {
        const transformPrompt = "위 분석 결과를 바탕으로, 원본의 저작권을 침해하지 않게 숫자와 상황을 바꾼 '변형된 수학 문제' 1개만 생성하세요. 인사말 없이 문제 텍스트만 출력하세요.";
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: analysisText + "\n\n" + transformPrompt }] }] })
        });
        const result = await response.json();
        const transformedQ = result.candidates[0].content.parts[0].text;
        const stdCode = analysisText.match(/\[10공수\d-\d\d-\d\d\]/g)?.[0] || "unknown";

        let matchedSubject = currentSubject;
        for (const key in subjectData) {
            if (subjectData[key].standards && subjectData[key].standards.some(s => s.code === stdCode)) {
                matchedSubject = key; break;
            }
        }

        db.collection('transformed_bank').add({
            subject: matchedSubject,
            question: transformedQ.trim(),
            original_analysis: analysisText, // 분석 원본(A~E 판정 포함) 통째로 저장
            standard_code: stdCode,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.warn("Background Save Failed:", e); }
}

function showSection(id) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(`'${id}'`));
    if (activeBtn) activeBtn.classList.add('active');
    if (id === 'quiz') initLevelQuiz();

    const subjectSelector = document.querySelector('.subject-selector');
    const mainSubtitle = document.getElementById('main-subtitle');
    
    // 🟢 문제 분석 탭일 경우 과목 선택기와 부제(단원명)를 모두 숨김
    if (id === 'problem-analysis') {
        subjectSelector.style.display = 'none'; 
        if(mainSubtitle) mainSubtitle.style.display = 'none'; 
    } else {
        subjectSelector.style.display = 'block';
        if(mainSubtitle) mainSubtitle.style.display = 'block'; 
    }

    const subjectSelectorStyle = document.querySelector('.subject-selector');
    if (id === 'problem-analysis') {
        subjectSelectorStyle.style.visibility = 'hidden';
    } else {
        subjectSelectorStyle.style.visibility = 'visible';
    }
}

// main.js 수정 1: 간판은 놔두고 부제만 바꾸기
function changeSubject() {
    currentSubject = document.getElementById('math-subjects').value;
    const data = subjectData[currentSubject];
    
    if (data) {
        // 메인 타이틀('main-title')은 건드리지 않고, 부제('main-subtitle')만 변경합니다.
        document.getElementById('main-subtitle').innerText = "[" + data.title + "] " + data.subtitle;
    }
    
    initDashboard(); 
    initLevelQuiz(); 
    initChecklist();
}


function initDashboard() {
    const container = document.getElementById('card-container');
    container.innerHTML = "";
    if (!subjectData[currentSubject]) return;
    subjectData[currentSubject].standards.forEach(std => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${std.code}</h3><p>${std.desc}</p>`;
        card.onclick = () => openModal(std);
        container.appendChild(card);
    });
    if (window.MathJax && window.MathJax.typesetPromise) { MathJax.typesetClear(); MathJax.typesetPromise([container]); }
}

function initLevelQuiz() {
    const container = document.getElementById('quiz-standard-list');
    container.innerHTML = '';
    if (!subjectData[currentSubject]) return;
    const stds = subjectData[currentSubject].standards.filter(std => std.questions && std.questions.length > 0);
    if (stds.length === 0) {
        container.innerHTML = "<p style='text-align:center;'>이 과목에는 아직 문제가 없습니다.</p>";
    } else {
        stds.forEach(std => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `<strong>${std.code}</strong><br>${std.desc}`;
            btn.onclick = () => startLevelMatching(std.code);
            container.appendChild(btn);
        });
    }
    backToStandardSelection();
}

async function startLevelMatching(code) {
    currentStandardCode = code; currentLevelQ = 0;
    const standard = subjectData[currentSubject].standards.find(s => s.code === code);
    let combinedQuestions = [...standard.questions]; // 기본 문항 복사

    try {
        const snapshot = await db.collection('transformed_bank').where('standard_code', '==', code).get();
        snapshot.forEach(doc => {
            const data = doc.data();
            // 🎯 성취수준 파싱 정규식 완벽 수정 (A~E 무조건 캡처)
            let extractedLevel = data.original_analysis?.match(/성취수준:\s*([A-E])/)?.[1] || "C"; 

            combinedQuestions.push({
                q: `<div style="background-color: #f0fdf4; padding: 10px; border-left: 4px solid #22c55e; margin-bottom: 10px; border-radius: 4px;">
                        <span style="font-size: 0.8rem; color: #166534; font-weight: bold;">💡 AI 변형 추가 문항</span>
                    </div>` + data.question,
                level: extractedLevel,
                reason: "사용자가 업로드한 문항을 AI가 분석하고 변형한 실전 문항입니다."
            });
        });
    } catch (error) { console.warn("DB 로드 실패"); }

    currentQuestions = shuffleArray(combinedQuestions);
    document.getElementById('quiz-standard-selection').style.display = 'none';
    document.getElementById('quiz-level-matching').style.display = 'block';
    document.getElementById('selected-standard-info').innerText = `${standard.code} ${standard.desc}`;
    
    const levelsContainer = document.getElementById('achievement-levels-side');
    levelsContainer.innerHTML = `
        <h4>성취수준 가이드</h4>
        <div class="guide-item"><strong>A (상)</strong> ${standard.levels.high}</div>
        <div class="guide-item"><strong>B (우수)</strong> ${standard.levels.b || standard.levels.high.replace("이해하여 설명할 수 있으며", "설명할 수 있고").replace("체계적으로 수행", "정확하게 수행")}</div>
        <div class="guide-item"><strong>C (중)</strong> ${standard.levels.mid}</div>
        <div class="guide-item"><strong>D (미흡)</strong> ${standard.levels.d || standard.levels.mid.replace("이해하고", "알고").replace("계산을 할 수 있다", "간단한 계산을 할 수 있다")}</div>
        <div class="guide-item"><strong>E (하)</strong> ${standard.levels.low}</div>
    `;
    loadLevelQuestion();
}

function loadLevelQuestion() {
    const qBox = document.getElementById('level-question-text');
    const optionsBox = document.getElementById('level-options');
    const feedbackBox = document.getElementById('level-feedback');
    const nextBtn = document.getElementById('next-q-btn');
    if (currentQuestions.length === 0) return;
    const question = currentQuestions[currentLevelQ];
    qBox.innerHTML = `<strong>[문항 ${currentLevelQ + 1}/${currentQuestions.length}]</strong><br><br>${question.q}`;
    optionsBox.innerHTML = ''; feedbackBox.style.display = 'none'; nextBtn.style.display = 'none';
    
    ['A', 'B', 'C', 'D', 'E'].forEach(level => {
        const btn = document.createElement('button');
        btn.className = 'option-btn'; btn.innerText = level;
        btn.onclick = () => checkLevelAnswer(level, btn);
        optionsBox.appendChild(btn);
    });
    if (window.MathJax && window.MathJax.typesetPromise) { MathJax.typesetClear(); MathJax.typesetPromise([qBox]); }
}

function checkLevelAnswer(selectedLevel, btn) {
    const question = currentQuestions[currentLevelQ];
    const fb = document.getElementById('level-feedback');
    document.querySelectorAll('#level-options .option-btn').forEach(b => { b.disabled = true; b.style.opacity = '0.6'; });
    fb.style.display = 'block';
    
    if (selectedLevel === question.level) {
        fb.innerHTML = `🎉 <strong>정답입니다!</strong><br><br><strong>[이유]</strong> ${question.reason}`;
        fb.style.color = "#166534"; fb.style.backgroundColor = '#dcfce7';
        btn.style.border = '3px solid #166534'; btn.style.opacity = '1';
    } else {
        fb.innerHTML = `❌ <strong>오답입니다.</strong> 이 문항은 <strong>'${question.level}'</strong> 수준입니다.<br><br><strong>[이유]</strong> ${question.reason}`;
        fb.style.color = "#991b1b"; fb.style.backgroundColor = '#fee2e2';
        btn.style.border = '3px solid #ef4444'; btn.style.opacity = '1';
        document.querySelectorAll('#level-options .option-btn').forEach(b => {
            if (b.innerText === question.level) { b.style.backgroundColor = '#dcfce7'; b.style.border = '3px solid #166534'; b.style.opacity = '1'; }
        });
    }
    document.getElementById('next-q-btn').style.display = 'block';
    if (window.MathJax && window.MathJax.typesetPromise) { MathJax.typesetClear(); MathJax.typesetPromise([fb]); }
}

function nextLevelQuestion() {
    if (currentQuestions.length === 0) return;
    currentLevelQ = (currentLevelQ + 1) % currentQuestions.length;
    loadLevelQuestion();
}

function backToStandardSelection() {
    currentStandardCode = null; currentQuestions = [];
    document.getElementById('quiz-standard-selection').style.display = 'block';
    document.getElementById('quiz-level-matching').style.display = 'none';
}

function initChecklist() {
    const container = document.getElementById('checklist-container');
    container.innerHTML = "";
    if (!subjectData[currentSubject]) return;
    const saved = JSON.parse(localStorage.getItem('check_' + currentSubject)) || {};
    subjectData[currentSubject].standards.forEach(std => {
        const div = document.createElement('div');
        div.className = 'check-item';
        div.innerHTML = `<input type="checkbox" id="c-${std.code}" ${saved[std.code]?'checked':''}>
                         <label for="c-${std.code}"><strong>${std.code}</strong> ${std.desc}</label>`;
        container.appendChild(div);
    });
}

function saveChecklist() {
    const checks = {};
    document.querySelectorAll('#checklist-container input').forEach(input => {
        checks[input.id.replace('c-', '')] = input.checked;
    });
    localStorage.setItem('check_' + currentSubject, JSON.stringify(checks));
    alert("저장되었습니다.");
}

function openModal(std) {
    document.getElementById('modal-title').innerText = std.code;
    document.getElementById('modal-desc').innerText = std.desc;
    document.getElementById('level-high').innerText = std.levels.high;
    document.getElementById('level-b').innerText = std.levels.b || std.levels.high.replace("이해하여 설명할 수 있으며", "설명할 수 있고");
    document.getElementById('level-mid').innerText = std.levels.mid;
    document.getElementById('level-d').innerText = std.levels.d || std.levels.mid.replace("이해하고", "알고");
    document.getElementById('level-low').innerText = std.levels.low;
    document.getElementById('level-modal').style.display = 'flex';
}

function resetAnalysis() {
    document.getElementById('problem-image').value = "";
    document.getElementById('preview-container').style.display = 'none';
    document.getElementById('upload-placeholder').style.display = 'block';
    document.getElementById('analyze-btn').style.display = 'none';
    document.getElementById('analysis-result').style.display = 'none';
    if(document.getElementById('ai-chat-container')) {
        document.getElementById('ai-chat-container').style.display = 'none';
        document.getElementById('chat-history').innerHTML = "";
        currentChatContext = ""; 
    }
}

async function reAnalyzeWithChat() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return;
    const chatHistory = document.getElementById('chat-history').innerText;
    if (!chatHistory) { alert("먼저 대화를 진행해주세요."); return; }

    document.getElementById('analysis-result').style.display = 'none';
    document.getElementById('analysis-loading').style.display = 'block';

    try {
        const prompt = `당신은 대한민국 최고의 수학 교사입니다. 
        처음 분석: ${currentChatContext}
        교사 대화 내역: ${chatHistory}
        
        대화를 깊이 분석하여 '최종 최적화 분석 결과'를 4가지 태그([교과 및 단원]:, [성취기준 및 수준]:, [핵심 개념]:, [상세 풀이]:)를 유지하여 답변하세요. 수식은 $ LaTeX를 사용하세요.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const result = await response.json();
        renderSophisticatedResult(result.candidates[0].content.parts[0].text);
        
        document.getElementById('analysis-loading').style.display = 'none';
        document.getElementById('analysis-result').style.display = 'block';
        if (window.MathJax) MathJax.typesetPromise();
    } catch (error) { alert("오류 발생"); }
}

// 🎯 챗봇 답변 가독성 (HTML 태그 변환) 로직
async function sendChatMessage() {
    const inputEl = document.getElementById('chat-input');
    const message = inputEl.value.trim();
    if(!message) return;
    
    const historyEl = document.getElementById('chat-history');
    historyEl.innerHTML += `<div style="text-align: right; margin-bottom: 12px;"><span style="background: #e0e7ff; color: #1e40af; padding: 10px 14px; border-radius: 16px 16px 0 16px; display: inline-block; text-align: left; max-width: 80%">${message}</span></div>`;
    inputEl.value = '';
    historyEl.scrollTop = historyEl.scrollHeight;

    const apiKey = localStorage.getItem('gemini_api_key');
    try {
        const prompt = `이전 분석: ${currentChatContext}\n교사의 의견: "${message}"\n\n[지침]: 수학 교사의 의견을 바탕으로 답변하세요. 가독성을 위해 적절한 단락 나누기, 글머리 기호(•), 마크다운 굵은 글씨(**)를 사용하세요. 수식은 $ LaTeX 문법을 사용하세요.`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const result = await response.json();
        const aiReply = result.candidates[0].content.parts[0].text;
        
        // ✨ 줄바꿈(\n)과 굵은 글씨(**)를 HTML로 예쁘게 치환
        const formattedReply = aiReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

        historyEl.innerHTML += `<div style="text-align: left; margin-bottom: 12px;"><span style="background: white; border: 1px solid var(--border); padding: 12px 16px; border-radius: 16px 16px 16px 0; display: inline-block; max-width: 85%;">${formattedReply}</span></div>`;
        if (window.MathJax && window.MathJax.typesetPromise) { MathJax.typesetClear(); MathJax.typesetPromise([historyEl]); }
        historyEl.scrollTop = historyEl.scrollHeight;
    } catch(e) { historyEl.innerHTML += `<div style="color: red;">오류가 발생했습니다.</div>`; }
}
// ♻️ 밀린 의견(임시 저장된 의견) 백그라운드 전송 함수
async function syncPendingFeedback() {
    let pending = JSON.parse(localStorage.getItem('pending_feedback')) || [];
    if (pending.length === 0) return; // 보낼 게 없으면 바로 종료

    let remaining = [];
    for (let item of pending) {
        try {
            await db.collection('developer_feedback').add({
                text: "[지연 전송됨] " + item.text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            // 또 실패하면 remaining 배열에 남겨둠
            remaining.push(item);
        }
    }

    // 전송 성공한 것들은 지우고, 실패한 것만 다시 로컬에 덮어쓰기
    localStorage.setItem('pending_feedback', JSON.stringify(remaining));
}

window.onload = () => {
    changeSubject();
    syncPendingFeedback(); 
};