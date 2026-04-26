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
    const adminFeedbackBtn = document.getElementById('admin-feedback-btn'); 
    const adminModeBtn = document.getElementById('admin-mode-btn'); 

    if (user) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        userInfo.innerText = user.displayName + " 선생님";
        initChecklist(); 
        
        if (user.email === "kthblacks11@gmail.com") {
            if(adminFeedbackBtn) adminFeedbackBtn.style.display = 'inline-block';
            if(adminModeBtn) adminModeBtn.style.display = 'inline-block';
        } else {
            if(adminFeedbackBtn) adminFeedbackBtn.style.display = 'none';
            if(adminModeBtn) adminModeBtn.style.display = 'none';
        }
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        userInfo.innerText = "";
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

// 🟢 네모 박스 크롭 및 미세조정을 위한 단일 상태 변수들
let analysisMainMode = 'single'; 
let singleCropMode = 'single'; 
let cropBoxes = []; 
let isInteracting = false; 
let interactionType = null; 
let activeBoxIndex = -1;
let dragStartX = 0, dragStartY = 0;
let initialBoxState = null;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function openSettings() { 
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
    listEl.innerHTML = "<p style='text-align:center; padding: 2rem;'>의견 목록을 불러오는 중...</p>";
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

function openAnalysisMode(mode) {
    showSection('problem-analysis');
    analysisMainMode = mode;
    resetAnalysis(); 

    const title = document.getElementById('analysis-title');
    const summary = document.getElementById('service-summary');

    if (mode === 'single') {
        title.innerHTML = "🔍 한 문제 상세 분석";
        summary.innerHTML = "<strong style='color: #2563eb;'>[상세 분석 제공 내용]</strong><br>과목, 단원명, 성취기준, 성취수준, 판정이유, 핵심개념, 단계별 문제풀이";
    } else {
        title.innerHTML = "📑 여러 문제 요약 분석";
        summary.innerHTML = "<strong style='color: #8b5cf6;'>[요약 분석 제공 내용]</strong><br>문항별 과목, 단원명, 성취기준, 성취수준, 판정이유";
    }
}

function displayPreview(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const imgEl = document.getElementById('image-preview');
        imgEl.src = e.target.result;
        imgEl.onload = function() {
            document.getElementById('preview-container').style.display = 'block';
            document.getElementById('upload-placeholder').style.display = 'none';
            
            if (analysisMainMode === 'single') {
                document.getElementById('single-mode-ui').style.display = 'block';
                document.getElementById('crop-canvas').style.display = 'none'; 
            } else {
                document.getElementById('multi-mode-ui').style.display = 'block';
                document.getElementById('crop-canvas').style.display = 'block'; 
                document.getElementById('crop-msg').style.display = 'block'; 
                initCropCanvas();
            }
        }
    }
    reader.readAsDataURL(file);
}

function setAnalysisMode(mode) {
    singleCropMode = mode;
    const canvas = document.getElementById('crop-canvas');
    const analyzeBtn = document.getElementById('analyze-single-btn');

    if (mode === 'single') {
        canvas.style.display = 'none';
        analyzeBtn.style.display = 'block';
        analyzeBtn.innerText = "✨ 사진 전체 분석 시작";
        cropBoxes = [];
    } else {
        canvas.style.display = 'block';
        analyzeBtn.style.display = 'none';
        initCropCanvas();
        if(document.getElementById('crop-msg')) document.getElementById('crop-msg').style.display = 'block';
    }
}

function normalizeBox(b) {
    return {
        x: b.w < 0 ? b.x + b.w : b.x,
        y: b.h < 0 ? b.y + b.h : b.y,
        w: Math.abs(b.w),
        h: Math.abs(b.h)
    };
}

function checkHit(x, y) {
    const TOLERANCE = 10; 
    for (let i = cropBoxes.length - 1; i >= 0; i--) {
        const b = normalizeBox(cropBoxes[i]);
        const nearL = Math.abs(x - b.x) < TOLERANCE;
        const nearR = Math.abs(x - (b.x + b.w)) < TOLERANCE;
        const nearT = Math.abs(y - b.y) < TOLERANCE;
        const nearB = Math.abs(y - (b.y + b.h)) < TOLERANCE;
        const insideX = x >= b.x && x <= b.x + b.w;
        const insideY = y >= b.y && y <= b.y + b.h;

        if (nearT && nearL) return { type: 'resize_nw', index: i };
        if (nearT && nearR) return { type: 'resize_ne', index: i };
        if (nearB && nearL) return { type: 'resize_sw', index: i };
        if (nearB && nearR) return { type: 'resize_se', index: i };
        if (nearT && insideX) return { type: 'resize_n', index: i };
        if (nearB && insideX) return { type: 'resize_s', index: i };
        if (nearL && insideY) return { type: 'resize_w', index: i };
        if (nearR && insideY) return { type: 'resize_e', index: i };
        if (insideX && insideY) return { type: 'move', index: i };
    }
    return null;
}

function initCropCanvas() {
    const imgEl = document.getElementById('image-preview');
    const canvas = document.getElementById('crop-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imgEl.clientWidth;
    canvas.height = imgEl.clientHeight;

    drawOverlay();

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    canvas.onmousedown = canvas.ontouchstart = (e) => {
        e.preventDefault();
        const pos = getPos(e);
        const hit = checkHit(pos.x, pos.y);
        if(document.getElementById('crop-msg')) document.getElementById('crop-msg').style.display = 'none';

        if (hit) { 
            isInteracting = true;
            interactionType = hit.type;
            activeBoxIndex = hit.index;
            dragStartX = pos.x; dragStartY = pos.y;
            initialBoxState = { ...cropBoxes[activeBoxIndex] };
        } else { 
            if (analysisMainMode === 'single') cropBoxes = []; 
            const newBox = { x: pos.x, y: pos.y, w: 0, h: 0 };
            cropBoxes.push(newBox);
            activeBoxIndex = cropBoxes.length - 1;
            isInteracting = true;
            interactionType = 'create';
            dragStartX = pos.x; dragStartY = pos.y;
        }
        drawOverlay();
    };

    canvas.onmousemove = canvas.ontouchmove = (e) => {
        e.preventDefault();
        const pos = getPos(e);

        if (!isInteracting) {
            const hit = checkHit(pos.x, pos.y);
            if (hit) {
                if (hit.type === 'move') canvas.style.cursor = 'move';
                else if (['resize_n', 'resize_s'].includes(hit.type)) canvas.style.cursor = 'ns-resize';
                else if (['resize_e', 'resize_w'].includes(hit.type)) canvas.style.cursor = 'ew-resize';
                else if (['resize_nw', 'resize_se'].includes(hit.type)) canvas.style.cursor = 'nwse-resize';
                else if (['resize_ne', 'resize_sw'].includes(hit.type)) canvas.style.cursor = 'nesw-resize';
            } else canvas.style.cursor = 'crosshair';
            return;
        }

        const dx = pos.x - dragStartX;
        const dy = pos.y - dragStartY;
        const box = cropBoxes[activeBoxIndex];

        if (interactionType === 'create') {
            box.w = pos.x - box.x; box.h = pos.y - box.y;
        } else if (interactionType === 'move') {
            box.x = initialBoxState.x + dx; box.y = initialBoxState.y + dy;
        } else {
            if (interactionType.includes('n')) { box.y = initialBoxState.y + dy; box.h = initialBoxState.h - dy; }
            if (interactionType.includes('s')) { box.h = initialBoxState.h + dy; }
            if (interactionType.includes('w')) { box.x = initialBoxState.x + dx; box.w = initialBoxState.w - dx; }
            if (interactionType.includes('e')) { box.w = initialBoxState.w + dx; }
        }
        drawOverlay();
    };

    canvas.onmouseup = canvas.onmouseout = canvas.ontouchend = (e) => {
        if (!isInteracting) return;
        isInteracting = false;
        
        cropBoxes = cropBoxes.map(normalizeBox).filter(b => b.w > 20 && b.h > 20);
        
        if (cropBoxes.length > 0) {
            if (analysisMainMode === 'single') {
                document.getElementById('analyze-single-btn').style.display = 'block';
                document.getElementById('analyze-single-btn').innerText = "🔍 선택 영역 분석 시작";
            } else {
                document.getElementById('analyze-multi-btn').style.display = 'block';
                if(document.getElementById('crop-count')) document.getElementById('crop-count').innerText = `${cropBoxes.length}개 영역 지정됨`;
            }
        } else {
            if(document.getElementById('crop-msg')) document.getElementById('crop-msg').style.display = 'block';
            if(analysisMainMode === 'single') document.getElementById('analyze-single-btn').style.display = 'none';
            else document.getElementById('analyze-multi-btn').style.display = 'none';
            if(document.getElementById('crop-count')) document.getElementById('crop-count').innerText = `0개 영역 지정됨`;
        }
        drawOverlay();
    };
}

function drawOverlay() {
    const canvas = document.getElementById('crop-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    cropBoxes.forEach((box, index) => {
        const nb = normalizeBox(box);
        
        ctx.clearRect(nb.x, nb.y, nb.w, nb.h);
        
        ctx.strokeStyle = '#3b82f6'; 
        ctx.lineWidth = 3;
        ctx.strokeRect(nb.x, nb.y, nb.w, nb.h);

        if (analysisMainMode === 'multi') {
            const badgeRadius = 14;
            const badgeX = nb.x + nb.w; 
            const badgeY = nb.y;        
            
            ctx.fillStyle = '#ef4444'; 
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((index + 1).toString(), badgeX, badgeY);
        }
    });
}

function getCroppedBase64(boxObj) {
    const imgEl = document.getElementById('image-preview');
    if (!boxObj) return imgEl.src.split(',')[1]; 
    
    const nb = normalizeBox(boxObj);
    const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
    const scaleY = imgEl.naturalHeight / imgEl.clientHeight;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = nb.w * scaleX; 
    tempCanvas.height = nb.h * scaleY;
    tempCanvas.getContext('2d').drawImage(
        imgEl, 
        nb.x * scaleX, nb.y * scaleY, nb.w * scaleX, nb.h * scaleY, 
        0, 0, tempCanvas.width, tempCanvas.height
    );
    return tempCanvas.toDataURL('image/jpeg', 0.9).split(',')[1];
}

function resetAnalysis() {
    document.getElementById('problem-image').value = "";
    document.getElementById('preview-container').style.display = 'none';
    document.getElementById('upload-placeholder').style.display = 'block';
    if(document.getElementById('single-mode-ui')) document.getElementById('single-mode-ui').style.display = 'none';
    if(document.getElementById('multi-mode-ui')) document.getElementById('multi-mode-ui').style.display = 'none';
    if(document.getElementById('analyze-single-btn')) document.getElementById('analyze-single-btn').style.display = 'none';
    if(document.getElementById('analyze-multi-btn')) document.getElementById('analyze-multi-btn').style.display = 'none';
    document.getElementById('analysis-result').style.display = 'none';
    document.getElementById('crop-canvas').style.display = 'none';
    
    cropBoxes = [];
    if(document.getElementById('crop-count')) document.getElementById('crop-count').innerText = "0개 영역 지정됨";
    
    if(document.getElementById('ai-chat-container')) {
        document.getElementById('ai-chat-container').style.display = 'none';
        document.getElementById('chat-history').innerHTML = "";
        currentChatContext = ""; 
    }
}

async function checkApiError(response) {
    if (!response.ok) {
        let errMsg = "";
        try {
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

async function executeAnalysis() {
    const isLoggedIn = await checkLogin();
    if (!isLoggedIn) return;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert("⚙️ 분석을 위해서는 구글 AI 스튜디오 API 키 연결이 필요합니다.");
        openSettings();
        return;
    }

    if(document.getElementById('single-mode-ui')) document.getElementById('single-mode-ui').style.display = 'none';
    if(document.getElementById('multi-mode-ui')) document.getElementById('multi-mode-ui').style.display = 'none';
    document.getElementById('crop-canvas').style.display = 'none';
    
    const resultDiv = document.getElementById('analysis-result');
    const resultText = document.getElementById('result-text');
    resultDiv.style.display = 'block';
    
    resultText.innerHTML = '<div style="text-align:center; padding: 3rem; color: #3b82f6; font-weight: bold; font-size: 1.1rem;">AI 교사가 문제를 정밀 분석 중입니다... ⏳</div>';
    resultDiv.scrollIntoView({ behavior: 'smooth' });

    try {
        let standardsInfo = "";
        for (const key in subjectData) {
            if (subjectData[key].standards && subjectData[key].standards.length > 0) {
                standardsInfo += `\n--- ${subjectData[key].title} ---\n`;
                standardsInfo += subjectData[key].standards.map(s => `${s.code} ${s.desc}`).join('\n');
            }
        }

        let apiParts = [];
        let isSingleMode = (analysisMainMode === 'single');

        if (isSingleMode) {
            const box = (singleCropMode === 'multi' && cropBoxes.length > 0) ? cropBoxes[0] : null;
            const base64Image = getCroppedBase64(box);
            
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
            apiParts.push({ text: prompt });
            apiParts.push({ inlineData: { mimeType: "image/jpeg", data: base64Image } });
        } else {
            const prompt = `당신은 대한민국 최고의 수학 교사입니다. 첨부된 ${cropBoxes.length}개의 이미지들은 각각 서로 다른 수학 문제입니다. 
각 문제별로 명확하게 구분선(---)을 긋고 [문항 1], [문항 2] 형식으로 제목을 달아주세요.
각 문항마다 풀이과정은 생략하고 아래 항목만 간결하게 요약 제시하세요. 수식은 반드시 $ 기호로 감싸서 LaTeX 문법으로 작성하세요.

[분석 항목]
1. 문항 내용 요약
2. 과목 및 단원명 (2022 개정)
3. 관련 성취기준 (코드 포함)
4. 성취수준 (A/B/C/D/E) 및 판정 이유

[참고할 2022 개정 성취기준 데이터]
${standardsInfo}`;
            apiParts.push({ text: prompt });
            
            cropBoxes.forEach(box => {
                apiParts.push({ inlineData: { mimeType: "image/jpeg", data: getCroppedBase64(box) } });
            });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: apiParts }],
                generationConfig: { temperature: 0.1, topP: 0.9, maxOutputTokens: 3072 }
            })
        });

        await checkApiError(response);
        const data = await response.json();
        const analysisText = data.candidates[0].content.parts[0].text;

        if (isSingleMode) {
            renderSophisticatedResult(analysisText);
            currentChatContext = analysisText; 
            document.getElementById('ai-chat-container').style.display = 'block'; 
            processAndSaveBackground(analysisText, apiKey);
        } else {
            let rawText = analysisText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            resultText.innerHTML = `<div style="background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border); line-height: 1.8;">${rawText}</div>`;
            document.getElementById('ai-chat-container').style.display = 'none'; 
        }

        if (window.MathJax) {
            MathJax.typesetClear();
            MathJax.typesetPromise([resultDiv]).catch(err => console.log(err));
        }

    } catch (error) {
        console.error('API Error:', error);
        let finalMsg = error.message;
        if (error.name === 'TypeError' && finalMsg.includes('Failed to fetch')) {
            finalMsg = "인터넷 연결이 불안정하거나 방화벽에 의해 차단되었습니다. 네트워크를 확인해주세요.";
        }
        
        resultText.innerHTML = `<div style="padding: 15px; background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;">
            <p style="color: #b91c1c; font-weight: bold; margin: 0 0 10px 0;">🚨 분석 실패</p>
            <p style="margin: 0; color: #7f1d1d;">${finalMsg}</p>
        </div>`;
        
        if (analysisMainMode === 'single') document.getElementById('single-mode-ui').style.display = 'block';
        else {
            document.getElementById('multi-mode-ui').style.display = 'block';
            document.getElementById('crop-canvas').style.display = 'block';
        }
    }
}

function renderSophisticatedResult(rawText) {
    const container = document.getElementById('result-text');
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

function showSection(id) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(`'${id}'`));
    if (activeBtn) activeBtn.classList.add('active');
    
    const subjectSelector = document.querySelector('.subject-selector');
    const subTitle = document.getElementById('main-subtitle'); 

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
    initChecklist();
}

function initDashboard() {
    const container = document.getElementById('card-container');
    container.innerHTML = "";
    if (!subjectData[currentSubject]) return;
    
    subjectData[currentSubject].standards.forEach(std => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.display = 'block';
        card.style.position = 'relative';

        const textArea = document.createElement('div');
        textArea.style.cursor = 'pointer';
        textArea.innerHTML = `<h3 style="margin: 0 0 0.5rem 0; color: var(--primary);">${std.code}</h3><p style="margin: 0; color: var(--text-main); line-height: 1.6;">${std.desc}</p>`;
        textArea.onclick = () => openModal(std);
        
        const btnArea = document.createElement('div');
        btnArea.style.textAlign = 'right';
        btnArea.style.marginTop = '15px'; 
        
        const quizBtn = document.createElement('button');
        quizBtn.className = 'save-btn'; 
        quizBtn.style.display = 'inline-block';
        quizBtn.style.width = 'auto'; 
        quizBtn.style.margin = '0';
        quizBtn.style.padding = '0.5rem 1.2rem'; 
        quizBtn.style.fontSize = '0.9rem';
        quizBtn.style.borderRadius = '8px'; 
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

async function startLevelMatching(code) {
    currentStandardCode = code; currentLevelQ = 0;
    const standard = subjectData[currentSubject].standards.find(s => s.code === code);
    
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
        const standard = subjectData[currentSubject].standards.find(s => s.code === currentStandardCode);
        const wrongLevelExample = standard.questions ? standard.questions.find(q => q.level === selectedLevel) : null;
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
    showSection('dashboard'); 
}

async function initChecklist() {
    const container = document.getElementById('checklist-container');
    container.innerHTML = "";
    if (!subjectData[currentSubject]) return;

    let saved = {};
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
    const isLoggedIn = await checkLogin();
    if (!isLoggedIn) return;

    const checks = {};
    document.querySelectorAll('#checklist-container input').forEach(input => {
        checks[input.id.replace('c-', '')] = input.checked;
    });

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

async function reAnalyzeWithChat() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return;
    const chatHistory = document.getElementById('chat-history').innerText;
    if (!chatHistory) { alert("먼저 대화를 진행해주세요."); return; }

    const resultDiv = document.getElementById('analysis-result');
    const resultText = document.getElementById('result-text');
    
    resultDiv.style.display = 'block';
    resultText.innerHTML = '<div style="text-align:center; padding: 3rem; color: #3b82f6; font-weight: bold; font-size: 1.1rem;">AI 교사가 대화를 바탕으로 재분석 중입니다... ⏳</div>';

    try {
        const prompt = `당신은 대한민국 최고의 수학 교사입니다. 
        처음 분석: ${currentChatContext}
        교사 대화 내역: ${chatHistory}
        
        대화를 깊이 분석하여 '최종 최적화 분석 결과'를 4가지 태그([교과 및 단원]:, [성취기준 및 수준]:, [핵심 개념]:, [상세 풀이]:)를 유지하여 답변하세요. 수식은 $ LaTeX를 사용하세요.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        await checkApiError(response); 

        const result = await response.json();
        renderSophisticatedResult(result.candidates[0].content.parts[0].text);
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
        
        await checkApiError(response); 
        
        const result = await response.json();
        const aiReply = result.candidates[0].content.parts[0].text;
        
        const formattedReply = aiReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

        historyEl.innerHTML += `<div style="text-align: left; margin-bottom: 12px;"><span style="background: white; border: 1px solid var(--border); padding: 12px 16px; border-radius: 16px 16px 16px 0; display: inline-block; max-width: 85%;">${formattedReply}</span></div>`;
        if (window.MathJax && window.MathJax.typesetPromise) { MathJax.typesetClear(); MathJax.typesetPromise([historyEl]); }
        historyEl.scrollTop = historyEl.scrollHeight;
    } catch(e) { 
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

async function loadStandardsFromDB() {
    try {
        const snapshot = await db.collection('standards_2022').get();
        if (snapshot.empty) return; 

        const dbStandards = { common1: [], common2: [], algebra: [], calculus1: [], stats: [], calculus2: [], geometry: [], 'ai-math': [] };

        snapshot.forEach(doc => {
            const data = doc.data();
            if(dbStandards[data.subject]) {
                dbStandards[data.subject].push({
                    id: doc.id, 
                    code: data.code,
                    desc: data.desc,
                    levels: data.levels,
                    questions: data.questions || []
                });
            }
        });

        for (let subj in dbStandards) {
            if (dbStandards[subj].length > 0) {
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

window.onload = async () => {
    await loadStandardsFromDB(); 
    changeSubject();             
    syncPendingFeedback();       
};

async function checkLogin() {
    if (!auth.currentUser) {
        alert("이 기능을 사용하려면 '구글 아이디로 시작' 로그인이 필요합니다.\n확인을 누르면 로그인 화면으로 이동합니다.");
        try {
            await auth.signInWithPopup(provider);
            return true; 
        } catch (error) {
            console.error("로그인 취소 또는 실패", error);
            return false; 
        }
    }
    return true; 
}

function openAdminMode() {
    const user = auth.currentUser;
    if (user && user.email === "kthblacks11@gmail.com") {
        showSection('admin-dashboard');
    } else {
        alert("관리자만 접근 가능한 페이지입니다.");
    }
}

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
            questions: [] 
        });
        alert("🎉 새로운 성취기준이 DB에 성공적으로 저장되었습니다!");
        location.reload(); 
    } catch (error) {
        console.error("저장 실패:", error);
        alert("저장 중 오류가 발생했습니다: " + error.message);
    }
}

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

async function saveQuestionToDB() {
    const docId = document.getElementById('admin-q-standard').value;
    const qText = document.getElementById('admin-q-text').value.trim();
    const qLevel = document.getElementById('admin-q-level').options[document.getElementById('admin-q-level').selectedIndex].text.charAt(0); 
    const qReason = document.getElementById('admin-q-reason').value.trim();

    if (!docId || !qText || !qReason) {
        alert("성취기준 선택, 문항 내용, 판정 이유는 필수입니다!");
        return;
    }

    try {
        await db.collection('standards_2022').doc(docId).update({
            questions: firebase.firestore.FieldValue.arrayUnion({
                q: qText,
                level: qLevel,
                reason: qReason
            })
        });
        alert("✨ 문항이 성공적으로 추가되었습니다!");
        
        document.getElementById('admin-q-text').value = '';
        document.getElementById('admin-q-reason').value = '';
        location.reload(); 
    } catch (error) {
        console.error("문항 추가 실패:", error);
        alert("문항 추가 중 오류가 발생했습니다.");
    }
}