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
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    
    // 🟢 기존 admin-btn 대신 우리가 새로 만든 2개의 버튼 가져오기
    const adminFeedbackBtn = document.getElementById('admin-feedback-btn'); 
    const adminModeBtn = document.getElementById('admin-mode-btn'); 

    if (user) {
        // 1. 일반 로그인 사용자 처리 (선생님 기존 코드 유지)
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        userInfo.innerText = user.displayName + " 선생님";
        initChecklist(); 
        
        // 2. 관리자(선생님 본인)일 경우에만 버튼 2개 다 보여주기
        if (user.email === "kthblacks11@gmail.com") {
            if(adminFeedbackBtn) adminFeedbackBtn.style.display = 'inline-block';
            if(adminModeBtn) adminModeBtn.style.display = 'inline-block';
        } else {
            if(adminFeedbackBtn) adminFeedbackBtn.style.display = 'none';
            if(adminModeBtn) adminModeBtn.style.display = 'none';
        }
    } else {
        // 3. 로그아웃 상태 처리 (선생님 기존 코드 유지)
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        userInfo.innerText = "";
        
        // 로그아웃 시 관리자 버튼도 당연히 숨기기
        if(adminFeedbackBtn) adminFeedbackBtn.style.display = 'none'; 
        if(adminModeBtn) adminModeBtn.style.display = 'none'; 
        
        initChecklist(); 
    }
});

async function handleLogin() {
    try { await auth.signInWithPopup(provider); }
    catch (error) { alert("로그인에 실패했습니다."); }
}
function handleLogout() {
    if(confirm("로그아웃 하시겠습니까?")) { auth.signOut(); }
}

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

// 모달 설정
async function openSettings() { 
    // API 키를 넣기 전에도 반드시 로그인이 되어있어야 함
    const isLoggedIn = await checkLogin();
    if (!isLoggedIn) return;
    
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
        alert("API 키가 기기에 안전하게 저장되었습니다.");
        closeSettings();
    }
}

async function submitFeedback() {
    const text = document.getElementById('feedback-message').value.trim();
    if(!text) { alert("의견을 입력해주세요!"); return; }
    const submitBtn = document.querySelector('#feedback-modal .save-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = "전송 중...";
    try {
        await db.collection('developer_feedback').add({
            text: text, timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("의견이 성공적으로 전송되었습니다. 감사합니다!");
        document.getElementById('feedback-message').value = "";
    } catch(e) {
        let pending = JSON.parse(localStorage.getItem('pending_feedback')) || [];
        pending.push({ text: text, time: new Date().toISOString() });
        localStorage.setItem('pending_feedback', JSON.stringify(pending));
        alert("현재 서버 통신이 원활하지 않아 의견이 임시 저장되었습니다.");
        document.getElementById('feedback-message').value = "";
    } finally {
        submitBtn.disabled = false; submitBtn.innerText = "의견 전송하기"; closeFeedback(); 
    }
}

async function openAdminFeedback() {
    const user = auth.currentUser;
    const adminEmail = "kthblacks11@gmail.com"; 
    if (!user) { alert("먼저 구글 로그인을 해주세요."); return; }
    if (user.email !== adminEmail) { alert("관리자 계정만 접근할 수 있습니다."); return; }

    document.getElementById('admin-feedback-modal').style.display = 'flex';
    const listEl = document.getElementById('admin-feedback-list');
    listEl.innerHTML = "<p style='text-align:center; padding: 2rem;'>의견 목록을 불러오는 중입니다...</p>";
    try {
        const snapshot = await db.collection('developer_feedback').orderBy('timestamp', 'desc').get();
        if(snapshot.empty) { listEl.innerHTML = "<p style='text-align:center; color:#64748b;'>아직 접수된 의견이 없습니다.</p>"; return; }
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
    } catch(e) { listEl.innerHTML = "<p style='color:red;'>데이터 로드 실패.</p>"; }
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

let cropRect = null;
let analysisMode = 'single';

function displayPreview(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const imgEl = document.getElementById('image-preview');
        imgEl.src = e.target.result;
        
        imgEl.onload = function() {
            document.getElementById('preview-container').style.display = 'block';
            document.getElementById('upload-placeholder').style.display = 'none';
            document.getElementById('mode-selector').style.display = 'flex'; 
            
            // 🟢 경고 문구 표시
            if(document.getElementById('analysis-warning')) {
                document.getElementById('analysis-warning').style.display = 'block'; 
            }
            
            document.getElementById('analyze-btn').style.display = 'none'; 
            document.getElementById('crop-canvas').style.display = 'none'; 
            cropRect = null;

            if(document.getElementById('ai-chat-container')) {
                document.getElementById('ai-chat-container').style.display = 'none';
                document.getElementById('chat-history').innerHTML = ""; 
                currentChatContext = ""; 
            }
        }
    }
    reader.readAsDataURL(file);
}

function setAnalysisMode(mode) {
    analysisMode = mode;
    const canvas = document.getElementById('crop-canvas');
    const analyzeBtn = document.getElementById('analyze-btn');
    const warningTxt = document.getElementById('analysis-warning'); 
    const cropMsg = document.getElementById('crop-msg'); // 🟢 안내 문구 가져오기

    if (mode === 'single') {
        canvas.style.display = 'none';
        analyzeBtn.style.display = 'block';
        analyzeBtn.innerText = "✨ 사진 전체 분석 시작";
        if(warningTxt) warningTxt.style.display = 'none'; 
        if(cropMsg) cropMsg.style.display = 'none'; // 한 문제 모드일 땐 문구 숨김
        freehandPoints = []; 
    } else {
        canvas.style.display = 'block';
        analyzeBtn.style.display = 'none';
        if(warningTxt) warningTxt.style.display = 'none'; 
        initCropCanvas();
        // 🟢 기존의 성가신 alert() 창 제거하고 화면 위에 글씨 띄우기
        if(cropMsg) cropMsg.style.display = 'block'; 
    }
}

function initCropCanvas() {
    const imgEl = document.getElementById('image-preview');
    const canvas = document.getElementById('crop-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = imgEl.clientWidth;
    canvas.height = imgEl.clientHeight;

    drawOverlay(ctx, canvas.width, canvas.height, null);

    let isDrawing = false;

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function startDraw(e) {
        e.preventDefault();
        isDrawing = true;
        
        // 🟢 그리기 시작하는 순간! 화면 중앙의 안내 문구 싹 지우기
        if(document.getElementById('crop-msg')) document.getElementById('crop-msg').style.display = 'none'; 
        
        freehandPoints = [getPos(e)]; 
        drawOverlay(ctx, canvas.width, canvas.height, freehandPoints);
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        freehandPoints.push(getPos(e)); 
        drawOverlay(ctx, canvas.width, canvas.height, freehandPoints);
    }

    function endDraw(e) {
        if (!isDrawing) return;
        isDrawing = false;
        
        // 너무 짧게 점만 찍은 경우(실수) 초기화
        if (freehandPoints.length < 10) {
            freehandPoints = [];
            drawOverlay(ctx, canvas.width, canvas.height, null);
            // 취소되었으니 다시 안내 문구 보여주기
            if(document.getElementById('crop-msg')) document.getElementById('crop-msg').style.display = 'block';
        } else {
            const analyzeBtn = document.getElementById('analyze-btn');
            analyzeBtn.style.display = 'block';
            analyzeBtn.innerText = "🔍 선택 영역 분석 시작";
        }
    }

    canvas.onmousedown = startDraw; canvas.onmousemove = draw; canvas.onmouseup = endDraw; canvas.onmouseout = endDraw;
    canvas.ontouchstart = startDraw; canvas.ontouchmove = draw; canvas.ontouchend = endDraw;
}

function drawOverlay(ctx, w, h, points) {
    ctx.clearRect(0, 0, w, h);
    // 🟢 핵심! 투명도를 0.6에서 0.3으로 낮춰서 뒤에 있는 다른 문제들이 잘 보이게 만듦
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; 
    ctx.fillRect(0, 0, w, h);

    if (points && points.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath(); 

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'black';
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round'; 
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
    }
}

function getCroppedBase64() {
    const imgEl = document.getElementById('image-preview');
    // 한 문항 전체 분석이거나 드래그를 안 했으면 원본 전송
    if (!cropRect || analysisMode === 'single') return imgEl.src.split(',')[1]; 

    const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
    const scaleY = imgEl.naturalHeight / imgEl.clientHeight;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropRect.w * scaleX;
    tempCanvas.height = cropRect.h * scaleY;
    const tCtx = tempCanvas.getContext('2d');

    // 선택 영역만 잘라내기
    tCtx.drawImage(
        imgEl,
        cropRect.x * scaleX, cropRect.y * scaleY, cropRect.w * scaleX, cropRect.h * scaleY, 
        0, 0, tempCanvas.width, tempCanvas.height 
    );

    return tempCanvas.toDataURL('image/jpeg', 0.9).split(',')[1];
}

// 🟢 1. 영어 에러를 친절한 한글로 바꿔주는 마법의 함수 (업그레이드)
async function checkApiError(response) {
    if (!response.ok) {
        let errMsg = "";
        try {
            // 에러 메시지 추출 시도
            const errData = await response.json();
            errMsg = errData.error?.message || "";
        } catch(e) {
            errMsg = response.statusText;
        }
        
        let koreanError = "서버와 통신 중 알 수 없는 문제가 발생했습니다.";
        
        if (response.status === 400) {
            if (errMsg.includes("API key not valid")) koreanError = "입력하신 API 키가 유효하지 않습니다. 키를 다시 확인해주세요.";
            else koreanError = "이미지나 요청 형식이 잘못되었습니다. 다시 업로드해주세요.";
        }
        else if (response.status === 401 || response.status === 403) koreanError = "입력하신 API 키가 잘못되었거나 권한이 없습니다. API 키를 다시 확인해주세요!";
        else if (response.status === 404) koreanError = "AI 모델 버전을 찾을 수 없습니다. (시스템 관리자에게 문의하세요)";
        else if (response.status === 429 || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) koreanError = "무료 사용량(할당량) 한도를 초과했습니다! ⚙️설정에서 새로운 API 키를 발급받아 입력해주세요.";
        else if (response.status === 500) koreanError = "구글 AI 서버 내부에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        else if (response.status === 503 || errMsg.includes("high demand") || errMsg.includes("overloaded")) koreanError = "현재 구글 서버에 접속자가 너무 많아 일시적으로 바쁩니다! 10초만 기다렸다가 다시 눌러주세요.";

        throw new Error(koreanError);
    }
}

// 🎯 분석 시작
async function analyzeProblem() {
    // 분석을 시작하기 전에 로그인 체크
    const isLoggedIn = await checkLogin();
    if (!isLoggedIn) return;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert("⚙️ 분석을 위해서는 구글 AI 스튜디오 API 키 연결이 필요합니다.");
        openSettings();
        return;
    }

    document.getElementById('analyze-btn').style.display = 'none';
    document.getElementById('analysis-loading').style.display = 'block';
    document.getElementById('loading-status').innerText = "AI 교사가 문제를 정밀 분석 및 시각화 중입니다...";

    try {
        const base64Image = getCroppedBase64();
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

[핵심 개념]: 문제 해결에 필요한 핵심 공식, 정리, 또는 수학적 원리를 글머리 기호(•)를 사용하여 2~3가지로 명확하고 깊이 있게 제시하세요.

[상세 풀이]: 논리적 비약이나 생략 없이 가독성 좋은 단계별 풀이를 작성하세요. 반드시 '1단계:', '2단계:' 형식으로 문단을 시작하세요. 절대 '[상세 풀이]:' 라는 태그 이름을 변경하지 마세요.

[중요 지침]: 모든 수식은 반드시 앞뒤로 $ 기호를 감싸서 LaTeX 문법으로 작성하세요.`;

        // 🟢 가장 안정적인 공식 모델명으로 완벽 복구
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: selectedFile.type, data: base64Image } }] }],
                generationConfig: { temperature: 0.1, topP: 0.9, maxOutputTokens: 3072 }
            })
        });

        await checkApiError(response); // 🟢 한글 에러 처리 함수 호출

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
        let finalMsg = error.message;
        if (error.name === 'TypeError' && finalMsg.includes('Failed to fetch')) {
            finalMsg = "인터넷 연결이 불안정하거나 방화벽에 의해 차단되었습니다. 네트워크를 확인해주세요.";
        }
        alert("⚠️ 분석 안내:\n" + finalMsg);
        document.getElementById('analysis-loading').style.display = 'none';
        document.getElementById('analyze-btn').style.display = 'block';
    }
} // 👈 이 중괄호가 analyzeProblem 함수 전체를 닫아주는 역할입니다. 실수로 지워지기 쉬우니 꼭 확인해 주세요!



// 🎯 글씨 잘림 완벽 방어 및 렌더링
function renderSophisticatedResult(rawText) {
    const container = document.getElementById('res-container');
    container.innerHTML = "";

    let text = rawText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    text = text.replace(/(\*\*|#)/g, ''); 
    text = text.replace(/(?:\[)?\s*교과\s*및\s*단원\s*(?:\])?\s*:?/g, '[교과 및 단원]:');
    text = text.replace(/(?:\[)?\s*성취기준\s*및\s*수준\s*(?:\])?\s*:?/g, '[성취기준 및 수준]:');
    text = text.replace(/(?:\[)?\s*핵심\s*개념\s*(?:\])?\s*:?/g, '[핵심 개념]:');
    text = text.replace(/(?:\[)?\s*상세\s*풀이\s*(?:\])?\s*:?/g, '[상세 풀이]:');
    text = text.replace(/(?:\[)?\s*문제\s*풀이\s*(?:\])?\s*:?/g, '[상세 풀이]:'); 
    
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
                    if (idx !== -1 && idx < nextKeyIndex) { nextKeyIndex = idx; }
                }
            });
            content = text.substring(contentStart, nextKeyIndex).trim();
        }

        if (!content) content = "데이터를 분석 중이거나 형식이 일치하지 않습니다.";

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
        if (conf.key === "[핵심 개념]:") { content = content.replace(/\n/g, '<br>'); }

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

// 🎯 배경 저장 로직 (DB 저장)
async function processAndSaveBackground(analysisText, apiKey) {
    try {
        const transformPrompt = "위 분석 결과를 바탕으로, 원본의 저작권을 침해하지 않게 숫자와 상황을 바꾼 '변형된 수학 문제' 1개를 생성하고 정답도 구하세요. \n\n반드시 아래 형식으로만 출력하세요:\n문제: [변형된 문제 내용]\n정답: [정답 내용]";
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: analysisText + "\n\n" + transformPrompt }] }] })
        });
        const result = await response.json();
        const aiResponse = result.candidates[0].content.parts[0].text;
        
        let finalQuestion = aiResponse;
        let finalAnswer = "정답 정보 없음";
        
        const qMatch = aiResponse.match(/문제:\s*([\s\S]*?)(?=정답:|$)/);
        const aMatch = aiResponse.match(/정답:\s*([\s\S]*)/);
        
        if (qMatch) finalQuestion = qMatch[1].trim();
        if (aMatch) finalAnswer = aMatch[1].trim();

        const stdCode = analysisText.match(/\[10공수\d-\d\d-\d\d\]/g)?.[0] || "unknown";

        let matchedSubject = currentSubject;
        for (const key in subjectData) {
            if (subjectData[key].standards && subjectData[key].standards.some(s => s.code === stdCode)) {
                matchedSubject = key; break;
            }
        }

        db.collection('transformed_bank').add({
            subject: matchedSubject,
            question: finalQuestion,
            answer: finalAnswer, 
            original_analysis: analysisText, 
            standard_code: stdCode,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.warn("Background Save Failed:", e); }
}

// 🟢 탭 이동 시 화면 덜컹거림(레이아웃 점프) 방지가 적용된 함수
function showSection(id) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(`'${id}'`));
    if (activeBtn) activeBtn.classList.add('active');
    
    // 💡 삭제된 부분: if (id === 'quiz') initLevelQuiz(); (이놈이 범인이었습니다!)

    // 과목 선택창과 부제목 요소를 가져옵니다.
    const subjectSelector = document.querySelector('.subject-selector');
    const subTitle = document.getElementById('sub-title'); 

    if (id === 'problem-analysis') {
        if (subjectSelector) subjectSelector.style.visibility = 'hidden';
        if (subTitle) subTitle.style.visibility = 'hidden';
    } else {
        if (subjectSelector) subjectSelector.style.visibility = 'visible';
        if (subTitle) subTitle.style.visibility = 'visible';
    }
}

function changeSubject() {
    currentSubject = document.getElementById('math-subjects').value;
    const data = subjectData[currentSubject];
    if (data) { document.getElementById('main-subtitle').innerText = "[" + data.title + "] " + data.subtitle; }
    initDashboard(); 
    
    // 💡 삭제된 부분: initLevelQuiz(); 
    
    initChecklist();
}

function initDashboard() {
    const container = document.getElementById('card-container');
    container.innerHTML = "";
    if (!subjectData[currentSubject]) return;
    
    subjectData[currentSubject].standards.forEach(std => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // Flexbox의 복잡한 속성들을 빼고, 가장 안정적인 기본 블록(Block) 형태로 배치합니다.
        card.style.display = 'block';
        card.style.position = 'relative';

        // 1. 텍스트 영역
        const textArea = document.createElement('div');
        textArea.style.cursor = 'pointer';
        textArea.innerHTML = `<h3 style="margin: 0 0 0.5rem 0; color: var(--primary);">${std.code}</h3><p style="margin: 0; color: var(--text-main); line-height: 1.6;">${std.desc}</p>`;
        textArea.onclick = () => openModal(std);
        
        // 2. 버튼 영역 (아래쪽 우측 정렬)
        const btnArea = document.createElement('div');
        btnArea.style.textAlign = 'right';
        btnArea.style.marginTop = '15px'; // 텍스트와 약간의 여백 띄우기
        
        const quizBtn = document.createElement('button');
        quizBtn.className = 'save-btn'; 
        
        // 💡 핵심: 버튼이 거대해지는 것을 막고 텍스트 길이에 맞춰 컴팩트하게 조절
        quizBtn.style.display = 'inline-block';
        quizBtn.style.width = 'auto'; // 화면을 100% 꽉 채우는 현상 방지!
        quizBtn.style.margin = '0';
        quizBtn.style.padding = '0.5rem 1.2rem'; // 상하는 슬림하게, 좌우는 적당히
        quizBtn.style.fontSize = '0.9rem';
        quizBtn.style.borderRadius = '8px'; // 모서리를 둥글게
        quizBtn.innerHTML = '📝 문항 매칭 연습';
        
        quizBtn.onclick = (e) => {
            e.stopPropagation(); 
            showSection('quiz'); 
            startLevelMatching(std.code); 
        };
        
        btnArea.appendChild(quizBtn);
        
        card.appendChild(textArea);
        card.appendChild(btnArea);

        container.appendChild(card);
    });
    
    if (window.MathJax && window.MathJax.typesetPromise) { 
        MathJax.typesetClear(); 
        MathJax.typesetPromise([container]); 
    }
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
    
    // 💡 에러 방지 핵심: 해당 성취기준에 문제가 없으면 빈 배열([])로 안전하게 시작
    let combinedQuestions = standard.questions ? [...standard.questions] : []; 

    try {
        const snapshot = await db.collection('transformed_bank').where('standard_code', '==', code).get();
        snapshot.forEach(doc => {
            const data = doc.data();
            let extractedLevel = data.original_analysis?.match(/성취수준:\s*([A-E])/)?.[1] || "C"; 

            combinedQuestions.push({
                q: `<div style="background-color: #f0fdf4; padding: 10px; border-left: 4px solid #22c55e; margin-bottom: 10px; border-radius: 4px;">
                        <span style="font-size: 0.8rem; color: #166534; font-weight: bold;">💡 AI 변형 추가 문항</span>
                    </div>` + data.question,
                level: extractedLevel,
                reason: "사용자가 업로드한 문항을 AI가 분석하고 변형한 실전 문항입니다.",
                answer: data.answer || "정답 정보 없음" 
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
    
    // 💡 변경점: 만약 데이터베이스에도, 기본 데이터에도 등록된 문제가 0개라면 안내 띄우기
    if (currentQuestions.length === 0) {
        document.getElementById('level-question-text').innerHTML = "<p style='text-align:center; margin-top:2rem;'>아직 이 성취기준에 등록된 문항이 없습니다.<br>문제 분석하기 기능을 통해 문항을 추가해 보세요!</p>";
        document.getElementById('level-options').innerHTML = '';
        document.getElementById('level-feedback').style.display = 'none';
        document.getElementById('next-q-btn').style.display = 'none';
    } else {
        loadLevelQuestion();
    }
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

// 🟢 2. 문항 매칭 연습 오답 시 예제 출력 로직 복구
function checkLevelAnswer(selectedLevel, btn) {
    const question = currentQuestions[currentLevelQ];
    const fb = document.getElementById('level-feedback');
    document.querySelectorAll('#level-options .option-btn').forEach(b => { b.disabled = true; b.style.opacity = '0.6'; });
    fb.style.display = 'block';
    
    const answerHTML = question.answer ? `<br><br><div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;"><strong style="color: #475569;">[정답]</strong> ${question.answer}</div>` : '';

    if (selectedLevel === question.level) {
        fb.innerHTML = `🎉 <strong>정답입니다!</strong><br><br><strong>[이유]</strong> ${question.reason} ${answerHTML}`;
        fb.style.color = "#166534"; fb.style.backgroundColor = '#dcfce7';
        btn.style.border = '3px solid #166534'; btn.style.opacity = '1';
    } else {
        // --- 복구된 오답 비교 로직 시작 ---
        const standard = subjectData[currentSubject].standards.find(s => s.code === currentStandardCode);
        const wrongLevelExample = standard.questions.find(q => q.level === selectedLevel);
        let comparativeText = "";
        
        if (wrongLevelExample) {
            comparativeText = `<hr style="margin: 1rem 0; border: 0; border-top: 1px solid #fca5a5;">
                               <div style="text-align: left; font-size: 0.9rem;">
                               <strong>💡 비교해 보세요:</strong><br>
                               선택하신 <strong>'${selectedLevel}'</strong> 수준은 보통 아래와 같은 문항입니다.<br><br>
                               <div style="background: white; padding: 0.8rem; border-radius: 6px; border-left: 4px solid #f87171; margin-bottom: 0.5rem; font-size: 0.85rem; color: #1e293b;">
                                   ${wrongLevelExample.q}
                               </div>
                               <em>* 현재 제시된 문항은 '${question.level}' 수준의 특징을 더 강하게 가지고 있습니다.</em>
                               </div>`;
        }
        // --- 복구된 오답 비교 로직 끝 ---

        fb.innerHTML = `❌ <strong>오답입니다.</strong> 이 문항은 <strong>'${question.level}'</strong> 수준입니다.<br><br><strong>[이유]</strong> ${question.reason} ${answerHTML} ${comparativeText}`;
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
    currentStandardCode = null; 
    currentQuestions = [];
    // 기존 퀴즈 목록 화면을 띄우는 대신, 첫 번째 대시보드 탭으로 돌아갑니다.
    showSection('dashboard'); 
}

async function initChecklist() {
    const container = document.getElementById('checklist-container');
    container.innerHTML = "";
    if (!subjectData[currentSubject]) return;

    let saved = {};
    // 로그인이 되어 있다면 파이어베이스에서 기존 데이터를 불러옴
    if (auth.currentUser) {
        try {
            const doc = await db.collection('user_checklists').doc(auth.currentUser.uid).get();
            if (doc.exists) { saved = doc.data()[currentSubject] || {}; }
        } catch (e) { console.warn("DB 로드 실패"); }
    } else {
        saved = JSON.parse(localStorage.getItem('check_' + currentSubject)) || {};
    }

    subjectData[currentSubject].standards.forEach(std => {
        const div = document.createElement('div');
        div.className = 'check-item';
        div.innerHTML = `<input type="checkbox" id="c-${std.code}" ${saved[std.code]?'checked':''}>
                         <label for="c-${std.code}"><strong>${std.code}</strong> ${std.desc}</label>`;
        container.appendChild(div);
    });
}

async function saveChecklist() {
    // 저장하기 전 로그인 체크 (로그인 안되어있으면 팝업 뜸)
    const isLoggedIn = await checkLogin();
    if (!isLoggedIn) return;

    const checks = {};
    document.querySelectorAll('#checklist-container input').forEach(input => {
        checks[input.id.replace('c-', '')] = input.checked;
    });

    // 파이어베이스(클라우드)에 영구 저장
    try {
        await db.collection('user_checklists').doc(auth.currentUser.uid).set({
            [currentSubject]: checks
        }, { merge: true });
        alert("✅ 진행 상황이 클라우드에 안전하게 저장되었습니다.\n(다음에 접속해도 유지됩니다.)");
    } catch (e) {
        console.error("저장 실패:", e);
        alert("⚠️ 저장 중 오류가 발생했습니다.");
    }
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
    
    if(document.getElementById('mode-selector')) {
        document.getElementById('mode-selector').style.display = 'none';
    }
    // 🟢 리셋할 때 경고 문구도 같이 숨김
    if(document.getElementById('analysis-warning')) {
        document.getElementById('analysis-warning').style.display = 'none';
    }
    if(document.getElementById('crop-canvas')) {
        document.getElementById('crop-canvas').style.display = 'none';
    }
    
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
        
        await checkApiError(response); // 🟢 한글 에러 확인 적용

        const result = await response.json();
        renderSophisticatedResult(result.candidates[0].content.parts[0].text);
        
        document.getElementById('analysis-loading').style.display = 'none';
        document.getElementById('analysis-result').style.display = 'block';
        if (window.MathJax) MathJax.typesetPromise();
    } catch (error) { alert("⚠️ 재분석 오류:\n" + error.message); }
}

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
        
        await checkApiError(response); // 🟢 한글 에러 확인 적용
        
        const result = await response.json();
        const aiReply = result.candidates[0].content.parts[0].text;
        
        const formattedReply = aiReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

        historyEl.innerHTML += `<div style="text-align: left; margin-bottom: 12px;"><span style="background: white; border: 1px solid var(--border); padding: 12px 16px; border-radius: 16px 16px 16px 0; display: inline-block; max-width: 85%;">${formattedReply}</span></div>`;
        if (window.MathJax && window.MathJax.typesetPromise) { MathJax.typesetClear(); MathJax.typesetPromise([historyEl]); }
        historyEl.scrollTop = historyEl.scrollHeight;
    } catch(e) { 
        // 🟢 채팅창 내부 에러도 한글로 예쁘게 출력
        historyEl.innerHTML += `<div style="text-align: left; margin-bottom: 12px;"><span style="color: #dc2626; background: #fee2e2; padding: 10px; border-radius: 8px; display: inline-block; font-size: 0.9rem;">⚠️ ${e.message}</span></div>`; 
        historyEl.scrollTop = historyEl.scrollHeight;
    }
}

async function syncPendingFeedback() {
    let pending = JSON.parse(localStorage.getItem('pending_feedback')) || [];
    if (pending.length === 0) return; 

    let remaining = [];
    for (let item of pending) {
        try {
            await db.collection('developer_feedback').add({
                text: "[지연 전송됨] " + item.text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            remaining.push(item);
        }
    }

    localStorage.setItem('pending_feedback', JSON.stringify(remaining));
}

// 🟢 파이어베이스 DB에서 성취기준 데이터를 싹 다 가져오는 함수
async function loadStandardsFromDB() {
    try {
        const snapshot = await db.collection('standards_2022').get();
        if (snapshot.empty) return; // 만약 DB가 비어있으면 기존 data.js 사용

        // 과목별로 담을 빈 바구니 준비
        const dbStandards = { common1: [], common2: [], algebra: [], calculus1: [], stats: [], calculus2: [], geometry: [], 'ai-math': [] };

        // DB에서 꺼내서 바구니에 쏙쏙 넣기
        snapshot.forEach(doc => {
            const data = doc.data();
            if(dbStandards[data.subject]) {
                dbStandards[data.subject].push({
                    id: doc.id, // 나중에 수정을 위해 문서 고유 ID도 보관
                    code: data.code,
                    desc: data.desc,
                    levels: data.levels,
                    questions: data.questions || []
                });
            }
        });

        // 기존 subjectData(data.js)에 덮어쓰기!
        for (let subj in dbStandards) {
            if (dbStandards[subj].length > 0) {
                // 단원 코드 순서대로 예쁘게 정렬 ([10공수2-01-01] 다음 02)
                dbStandards[subj].sort((a, b) => a.code.localeCompare(b.code));
                if(subjectData[subj]) {
                    subjectData[subj].standards = dbStandards[subj];
                }
            }
        }
        console.log("🔥 DB에서 성취기준 로드 완료!");
    } catch(error) {
        console.error("DB 로딩 에러:", error);
    }
}

// 🟢 사이트가 처음 켜질 때 실행되는 순서 변경
window.onload = async () => {
    await loadStandardsFromDB(); // 1. 화면 켜지자마자 DB에서 데이터부터 가져오기!
    changeSubject();             // 2. 가져온 데이터로 화면 그리기
    syncPendingFeedback();       // 3. 밀린 의견 보내기
};

// 🟢 기능을 실행하기 전 로그인이 되어있는지 확인하고, 안 되어있으면 팝업을 띄우는 함수
async function checkLogin() {
    if (!auth.currentUser) {
        alert("이 기능을 사용하려면 진행 상황 저장을 위해 '구글 아이디로 시작' 로그인이 필요합니다.\n확인을 누르면 로그인 화면으로 이동합니다.");
        try {
            await auth.signInWithPopup(provider);
            return true; // 로그인 성공
        } catch (error) {
            console.error("로그인 취소 또는 실패", error);
            return false; // 로그인 실패
        }
    }
    return true; // 이미 로그인 되어있음
}
// 관리자 페이지 열기 (권한 체크 포함)
function openAdminMode() {
    const user = auth.currentUser;
    if (user && user.email === "kthblacks11@gmail.com") {
        showSection('admin-dashboard');
    } else {
        alert("관리자만 접근 가능한 페이지입니다.");
    }
}

// 입력한 데이터를 Firestore에 저장하는 함수
async function saveStandardToDB() {
    const subject = document.getElementById('admin-subject').value;
    const code = document.getElementById('admin-code').value.trim();
    const desc = document.getElementById('admin-desc').value.trim();
    
    const levels = {
        high: document.getElementById('admin-level-high').value.trim(),
        b: document.getElementById('admin-level-b').value.trim(),
        mid: document.getElementById('admin-level-mid').value.trim(),
        d: document.getElementById('admin-level-d').value.trim(),
        low: document.getElementById('admin-level-low').value.trim()
    };

    if (!code || !desc || !levels.high) {
        alert("성취기준 코드와 내용은 필수 입력 사항입니다.");
        return;
    }

    try {
        await db.collection('standards_2022').add({
            subject: subject,
            code: code,
            desc: desc,
            levels: levels,
            questions: [] // 초기 문항은 빈 배열로 설정
        });
        alert("🎉 새로운 성취기준이 DB에 성공적으로 저장되었습니다!");
        location.reload(); // 새로고침하여 데이터 반영 확인
    } catch (error) {
        console.error("저장 실패:", error);
        alert("저장 중 오류가 발생했습니다: " + error.message);
    }
}
// 🟢 관리자 모드: 과목 선택 시 DB에서 해당 과목 성취기준 목록 불러오기
async function loadStandardsForQuestion() {
    const subject = document.getElementById('admin-q-subject').value;
    const stdSelect = document.getElementById('admin-q-standard');
    stdSelect.innerHTML = '<option value="">데이터를 불러오는 중입니다...</option>';

    if (!subject) {
        stdSelect.innerHTML = '<option value="">위에서 과목을 먼저 선택하세요</option>';
        return;
    }

    try {
        const snapshot = await db.collection('standards_2022').where('subject', '==', subject).get();
        let stds = [];
        snapshot.forEach(doc => stds.push({ id: doc.id, code: doc.data().code, desc: doc.data().desc }));
        
        // 코드 순서대로 정렬
        stds.sort((a,b) => a.code.localeCompare(b.code));

        stdSelect.innerHTML = '<option value="">-- 문항을 추가할 성취기준 선택 --</option>';
        stds.forEach(std => {
            stdSelect.innerHTML += `<option value="${std.id}">${std.code} ${std.desc.substring(0, 25)}...</option>`;
        });
    } catch (error) {
        console.error("목록 불러오기 실패:", error);
        stdSelect.innerHTML = '<option value="">불러오기 오류 발생</option>';
    }
}

// 🟢 관리자 모드: 선택한 성취기준(문서) 안의 questions 배열에 문항 밀어넣기
async function saveQuestionToDB() {
    const docId = document.getElementById('admin-q-standard').value;
    const qText = document.getElementById('admin-q-text').value.trim();
    const qLevel = document.getElementById('admin-q-level').options[document.getElementById('admin-q-level').selectedIndex].text.charAt(0); // A, B, C, D, E 추출
    const qReason = document.getElementById('admin-q-reason').value.trim();

    if (!docId || !qText || !qReason) {
        alert("성취기준 선택, 문항 내용, 판정 이유는 필수입니다!");
        return;
    }

    try {
        // 파이어베이스의 배열 추가 전용 명령어 사용
        await db.collection('standards_2022').doc(docId).update({
            questions: firebase.firestore.FieldValue.arrayUnion({
                q: qText,
                level: qLevel,
                reason: qReason
            })
        });
        alert("✨ 문항이 성공적으로 추가되었습니다!");
        
        // 입력창 비우기
        document.getElementById('admin-q-text').value = '';
        document.getElementById('admin-q-reason').value = '';
        location.reload(); // 데이터 갱신을 위해 새로고침
    } catch (error) {
        console.error("문항 추가 실패:", error);
        alert("문항 추가 중 오류가 발생했습니다.");
    }
}