let currentEditingAssessmentIndex = -1;

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
let lastAnalyzedSingleImage = null; 

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

    const currentBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(`openAnalysisMode('${mode}')`));
    if (currentBtn) {
        currentBtn.classList.add('active');
    }

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
            const badgeRadius = 10;
            const badgeX = nb.x + nb.w; 
            const badgeY = nb.y;        
            
            ctx.fillStyle = '#ef4444'; 
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
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
    
    resultText.innerHTML = '<div style="text-align:center; padding: 3rem; color: #3b82f6; font-weight: bold; font-size: 1.1rem;">AI 교사가 국가 수준 평가 루브릭을 바탕으로 정밀 분석 중입니다... ⏳</div>';
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
            lastAnalyzedSingleImage = getCroppedBase64(box); 
            
            const prompt = `당신은 대한민국 최고의 수학 교사입니다. 문항을 엄밀히 분석하여 아래 대괄호 태그를 '토씨 하나 틀리지 말고' 사용하여 답변하세요. 마크다운 볼드체(**)를 태그 이름에 절대 사용하지 마세요.

[원본 문제 추출]: 이미지에 있는 문제의 전체 텍스트와 수식을 추출하세요. (그래프/도형이 있다면 '[그림 및 그래프]' 라고 표기)

[교과 및 단원]: 해당 문제의 교과명과 단원명을 명시하세요.

[성취기준 및 수준]: 
아래 제공된 <과목별 성취기준 목록>에서 가장 적합한 것을 고르세요. 
성취수준 판정은 반드시 아래 제공된 <국가 수준 평가 루브릭>을 엄격하게 적용하여 다음 **2단계 하이브리드 방식**을 따르세요:
- 1단계(1차 기준 적용): <국가 수준 평가 루브릭>의 교과 내용 요소별 특화 기준을 최우선 적용하고, 일반적 특성, 서술어, 수식어, MCP 판별 준거를 종합하여 1차 수준을 잡으세요.
- 2단계(AI 자체 보완): 1차 기준만으로 명확한 판정이 어렵거나, 계산의 복잡성/사고의 도약 등 부가적인 요소가 있다면 AI의 수학적 추론을 추가로 반영하여 최종 A~E 수준을 확정하세요.

반드시 아래의 3줄 형식으로 작성하세요.
성취기준: [코드] 성취기준의 전체 내용
성취수준: A~E 중 택 1
판정 이유: "<국가 수준 평가 루브릭>의 [어떤 세부 기준]에 부합하며, 추가로 [AI의 수학적 근거]를 고려하여 판단함" 형태로 구체적으로 서술
💡 중요: 만약 제공된 <과목별 성취기준 목록>에서 적절한 성취기준을 찾을 수 없다면(예: 미적분, 기하 등), [판정 이유]의 맨 마지막 줄에 반드시 "AI 판단 과목: [선수학습 또는 미적분 등 과목명]" 이라고 명시해주세요.

<과목별 성취기준 목록>
${standardsInfo}
</과목별 성취기준 목록>

<국가 수준 평가 루브릭>
${systemRubric}
</국가 수준 평가 루브릭>

[핵심 개념]: 문제 해결에 필요한 핵심 공식, 정리, 또는 수학적 원리를 글머리 기호(•)를 사용하여 2~3가지로 명확하고 깊이 있게 제시하세요.

[상세 풀이]: 논리적 비약이나 생략 없이 가독성 좋은 단계별 풀이를 작성하세요. 반드시 '1단계:', '2단계:' 형식으로 문단을 시작하세요. 절대 '[상세 풀이]:' 라는 태그 이름을 변경하지 마세요.

[중요 지침]: 모든 수식은 반드시 앞뒤로 $ 기호를 감싸서 LaTeX 문법으로 작성하세요.`;
            apiParts.push({ text: prompt });
            apiParts.push({ inlineData: { mimeType: "image/jpeg", data: lastAnalyzedSingleImage } });
        } else {
            const prompt = `당신은 대한민국 최고의 수학 교사입니다. 첨부된 ${cropBoxes.length}개의 이미지들은 각각 서로 다른 수학 문제입니다. 
각 문제별로 명확하게 구분선(---)을 긋고 [문항 1], [문항 2] 형식으로 제목을 달아주세요.
각 문항마다 풀이과정은 생략하고 아래 항목만 간결하게 요약 제시하세요. 수식은 반드시 $ 기호로 감싸서 LaTeX 문법으로 작성하세요.

[분석 항목]
0. 원본 문제 텍스트 (수식은 LaTeX 적용, 복잡한 그래프/도형은 '[그림 및 그래프]' 로 표기)
1. 문항 내용 요약
2. 과목 및 단원명 (2022 개정)
3. 관련 성취기준 (코드 포함)
4. 성취수준 (A/B/C/D/E) 및 판정 이유 (반드시 아래의 <국가 수준 평가 루브릭>을 먼저 대조한 후, 부족한 부분은 AI의 수학적 근거로 보완하여 서술하세요.)

<과목별 성취기준 목록>
${standardsInfo}
</과목별 성취기준 목록>

<국가 수준 평가 루브릭>
${systemRubric}
</국가 수준 평가 루브릭>`;
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
                generationConfig: { temperature: 0.1, topP: 0.9, maxOutputTokens: 8192 }
            })
        });

        await checkApiError(response);
        const data = await response.json();
        const analysisText = data.candidates[0].content.parts[0].text;
        
        currentChatContext = analysisText; 
        document.getElementById('ai-chat-container').style.display = 'block'; 

        if (isSingleMode) {
            renderSophisticatedResult(analysisText, lastAnalyzedSingleImage);
            processAndSaveBackground(analysisText, apiKey);
        } else {
            let rawText = analysisText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            
            rawText = rawText.replace(/\[문항\s*(\d+)\]/g, (match, p1) => {
                const idx = parseInt(p1) - 1; 
                const imgBase64 = cropBoxes[idx] ? getCroppedBase64(cropBoxes[idx]) : null;
                let imgHtml = '';
                
                if (imgBase64) {
                    imgHtml = `<div style="margin: 15px 0; text-align: center; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
                                   <img src="data:image/jpeg;base64,${imgBase64}" style="max-height: 180px; max-width: 100%; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                               </div>`;
                }
                
                const borderTop = idx === 0 ? '' : 'border-top: 2px dashed #cbd5e1; margin-top: 2.5rem; padding-top: 1.5rem;';
                return `<div style="${borderTop}"><strong style="font-size: 1.3rem; color: #ef4444; background: #fee2e2; padding: 4px 12px; border-radius: 20px;">${match}</strong></div>${imgHtml}`;
            });

            resultText.innerHTML = `<div style="background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border); line-height: 1.8;">${rawText}</div>`;
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

function renderSophisticatedResult(rawText, base64Image) {
    const container = document.getElementById('result-text');
    container.innerHTML = "";

    if (base64Image) {
        const imgDiv = document.createElement('div');
        imgDiv.style.textAlign = 'center';
        imgDiv.style.marginBottom = '1.5rem';
        imgDiv.innerHTML = `<img src="data:image/jpeg;base64,${base64Image}" style="max-height: 200px; max-width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`;
        container.appendChild(imgDiv);
    }

    let text = rawText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    text = text.replace(/(\*\*|#)/g, ''); 
    text = text.replace(/(?:\[)?\s*원본\s*문제\s*추출\s*(?:\])?\s*:?/g, '[원본 문제 추출]:'); 
    text = text.replace(/(?:\[)?\s*교과\s*및\s*단원\s*(?:\])?\s*:?/g, '[교과 및 단원]:');
    text = text.replace(/(?:\[)?\s*성취기준\s*및\s*수준\s*(?:\])?\s*:?/g, '[성취기준 및 수준]:');
    text = text.replace(/(?:\[)?\s*핵심\s*개념\s*(?:\])?\s*:?/g, '[핵심 개념]:');
    text = text.replace(/(?:\[)?\s*상세\s*풀이\s*(?:\])?\s*:?/g, '[상세 풀이]:');
    text = text.replace(/(?:\[)?\s*문제\s*풀이\s*(?:\])?\s*:?/g, '[상세 풀이]:'); 
    
    const configs = [
        { key: "[원본 문제 추출]:", title: "0. 추출된 원본 문제 텍스트", icon: "📝", bg: "#f8fafc", border: "#94a3b8" },
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

        if (!content) return;

        if (conf.key === "[원본 문제 추출]:") {
            content = content.replace(/\n/g, '<br>');
        }
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

    if (id === 'problem-analysis' || id === 'cut-score') {
        if (subjectSelector) subjectSelector.style.visibility = 'hidden';
        if (subTitle) subTitle.style.visibility = 'hidden';
    } else {
        if (subjectSelector) subjectSelector.style.visibility = 'visible';
        if (subTitle) subTitle.style.visibility = 'visible';
    }
    if (id === 'cut-score') loadProjects();
}

function changeSubject() {
    currentSubject = document.getElementById('math-subjects').value;
    const data = subjectData[currentSubject];
    if (data) { document.getElementById('main-subtitle').innerText = "[" + data.title + "] " + data.subtitle; }
    initDashboard(); 
    initChecklist();

    const bookmarkList = document.getElementById('bookmark-list');
    if (bookmarkList) {
        bookmarkList.innerHTML = "";
    }
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
    
    setTimeout(() => {
        if (window.MathJax && window.MathJax.typesetPromise) { 
            MathJax.typesetClear(); 
            MathJax.typesetPromise([container]).catch(err => console.error("수식 렌더링 에러:", err)); 
        }
    }, 300);
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
    
    if (std.levels) {
        document.getElementById('level-high').innerText = std.levels.high || "";
        document.getElementById('level-b').innerText = std.levels.b || (std.levels.high ? std.levels.high.replace("이해하여 설명할 수 있으며", "설명할 수 있고") : "");
        document.getElementById('level-mid').innerText = std.levels.mid || "";
        document.getElementById('level-d').innerText = std.levels.d || (std.levels.mid ? std.levels.mid.replace("이해하고", "알고") : "");
        document.getElementById('level-low').innerText = std.levels.low || "";
    } else {
        document.getElementById('level-high').innerText = "데이터 없음";
        document.getElementById('level-b').innerText = "데이터 없음";
        document.getElementById('level-mid').innerText = "데이터 없음";
        document.getElementById('level-d').innerText = "데이터 없음";
        document.getElementById('level-low').innerText = "데이터 없음";
    }
    
    document.getElementById('level-modal').style.display = 'flex';

    if (window.MathJax) {
        MathJax.typesetPromise([document.getElementById('level-modal')]).catch(err => console.error(err));
    }
}

async function reAnalyzeWithChat() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return;
    const chatHistory = document.getElementById('chat-history').innerText;
    if (!chatHistory) { alert("먼저 대화를 진행해주세요."); return; }

    const resultDiv = document.getElementById('analysis-result');
    const resultText = document.getElementById('result-text');
    
    const originalContent = resultText.innerHTML;
    resultText.innerHTML = '<div style="text-align:center; padding: 3rem; color: #3b82f6; font-weight: bold; font-size: 1.1rem;">AI 교사가 대화를 바탕으로 재분석 중입니다... ⏳</div>';

    try {
        let prompt = "";
        if (analysisMainMode === 'single') {
            prompt = `당신은 대한민국 최고의 수학 교사입니다. \n처음 분석: ${currentChatContext}\n교사 대화 내역: ${chatHistory}\n\n대화를 깊이 분석하여 '최종 최적화 분석 결과'를 4가지 태그([교과 및 단원]:, [성취기준 및 수준]:, [핵심 개념]:, [상세 풀이]:)를 유지하여 답변하세요. 수식은 $ LaTeX를 사용하세요.`;
        } else {
            prompt = `당신은 대한민국 최고의 수학 교사입니다. \n처음 분석: ${currentChatContext}\n교사 대화 내역: ${chatHistory}\n\n대화를 깊이 분석하여 '최종 최적화 분석 결과'를 수정하여 답변하세요. 각 문항별로 명확하게 구분선(---)을 긋고 [문항 1], [문항 2] 형식으로 제목을 달아주세요. 수식은 $ LaTeX를 사용하세요.`;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        await checkApiError(response); 

        const result = await response.json();
        const analysisText = result.candidates[0].content.parts[0].text;
        currentChatContext = analysisText;

        if (analysisMainMode === 'single') {
            renderSophisticatedResult(analysisText, lastAnalyzedSingleImage);
        } else {
            let rawText = analysisText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            let imagesHtml = '<div style="display: flex; gap: 15px; overflow-x: auto; margin-bottom: 1.5rem; padding-bottom: 10px; border-bottom: 2px dashed #cbd5e1;">';
            cropBoxes.forEach((box, i) => {
                imagesHtml += `
                    <div style="flex: 0 0 auto; text-align: center;">
                        <span style="display: block; font-size: 0.85rem; font-weight: bold; color: #ef4444; margin-bottom: 5px;">[문항 ${i+1}]</span>
                        <img src="data:image/jpeg;base64,${getCroppedBase64(box)}" style="height: 120px; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    </div>`;
            });
            imagesHtml += '</div>';

            resultText.innerHTML = `<div style="background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border); line-height: 1.8;">${imagesHtml}${rawText}</div>`;
        }

        if (window.MathJax) MathJax.typesetPromise();
    } catch (error) { 
        alert("⚠️ 재분석 오류:\n" + error.message); 
        resultText.innerHTML = originalContent; 
    }
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
    if (!apiKey) {
        historyEl.innerHTML += `<div style="text-align: left; margin-bottom: 12px;"><span style="color: #dc2626; background: #fee2e2; padding: 10px; border-radius: 8px; display: inline-block; font-size: 0.9rem;">⚠️ API 키가 설정되지 않았습니다.</span></div>`;
        return;
    }

    const loadingId = 'loading-' + Date.now();
    historyEl.innerHTML += `<div id="${loadingId}" style="text-align: left; margin-bottom: 12px;"><span style="background: #f3f4f6; color: #4b5563; padding: 10px 14px; border-radius: 16px 16px 16px 0; display: inline-block; font-size: 0.9rem;">판정 기준을 엄격하게 재검토 중입니다... ⏳</span></div>`;
    historyEl.scrollTop = historyEl.scrollHeight;

    try {
        const prompt = `당신은 대한민국 국가 수준 교육과정의 <평가 루브릭>을 엄격하게 수호하는 '수석 평가 위원'입니다.
현재 문항에 대한 당신의 분석 상태는 다음과 같습니다:
---
${currentChatContext}
---
평가 루브릭:
${systemRubric}
---

[절대 방어 규칙]
1. 사용자(교사)가 성취수준의 변경을 요청하거나 이의를 제기할 경우, 절대 무조건적으로 동의하지 마십시오. AI 특유의 '예스맨' 성향을 버리십시오.
2. 사용자의 주장이 앞서 제공된 <평가 루브릭>의 '교과 내용 요소별 특화 기준', '일반적 특성', '서술어/수식어 위계' 및 '수학적 논리'에 완벽히 부합하는지 비판적으로 검증하십시오.
3. ❌ [반려]: 사용자의 주장이 루브릭에 어긋나거나 논리적 비약이 있다면, 매우 정중하지만 단호하게 거절하십시오. 루브릭의 [어떤 세부 항목]에 위배되는지 명확한 근거를 들어 반박하고, "따라서 기존 판정을 유지합니다"라고 선언하십시오. 가독성을 위해 단락을 나누고 글머리 기호를 사용하세요.
4. ✅ [수용]: 사용자의 주장이 루브릭 기준에 정확히 부합하고 타당성을 갖췄다면, "선생님의 의견이 타당합니다."라고 인정하고, 선생님의 의견이 반영된 [새로운 전체 분석 결과(성취기준, 수준, 판정이유, 핵심개념, 상세풀이)]를 다시 작성하여 제공하십시오.

사용자의 메시지: "${message}"

[수식 지침]: 수식은 반드시 $ 기호로 감싸서 LaTeX 문법을 사용하세요.`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1, topP: 0.9 } 
            })
        });
        
        await checkApiError(response); 
        const result = await response.json();
        const aiReply = result.candidates[0].content.parts[0].text;
        
        if (aiReply.includes("성취수준:") && aiReply.includes("판정 이유:")) {
            currentChatContext = aiReply;
        }

        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();

        const formattedReply = aiReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

        historyEl.innerHTML += `<div style="text-align: left; margin-bottom: 12px;"><span style="background: white; border: 1px solid var(--border); padding: 12px 16px; border-radius: 16px 16px 16px 0; display: inline-block; max-width: 85%;">${formattedReply}</span></div>`;
        if (window.MathJax && window.MathJax.typesetPromise) { MathJax.typesetClear(); MathJax.typesetPromise([historyEl]); }
        historyEl.scrollTop = historyEl.scrollHeight;

    } catch(e) { 
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();

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

let subjectData = {}; 
let systemRubric = ""; 

async function loadStandardsFromDB() {
    try {
        console.log("⏳ DB에서 시스템 데이터를 불러옵니다...");

        const subjectSnapshot = await db.collection('subjects').get();
        subjectSnapshot.forEach(doc => {
            const data = doc.data();
            subjectData[doc.id] = {
                title: data.title,
                subtitle: data.subtitle,
                standards: [] 
            };
        });
        console.log("✅ 1/3: 과목 뼈대 로드 완료");

        const standardsSnapshot = await db.collection('standards_2022').get();
        standardsSnapshot.forEach(doc => {
            const data = doc.data();
            if(subjectData[data.subject]) {
                subjectData[data.subject].standards.push({
                    id: doc.id,
                    code: data.code,
                    desc: data.desc,
                    levels: data.levels,
                    questions: data.questions || []
                });
            }
        });

        for (let subj in subjectData) {
            if (subjectData[subj].standards.length > 0) {
                subjectData[subj].standards.sort((a, b) => a.code.localeCompare(b.code));
            }
        }
        console.log("✅ 2/3: 성취기준 및 문항 로드 완료");

        const rubricDoc = await db.collection('system_config').doc('evaluation_rubric').get();
        if (rubricDoc.exists) {
            const rData = rubricDoc.data();
            
            systemRubric = `
[1] 일반적 특성 및 인지적 복잡성
- A수준: ${rData.general_characteristics.A}
- B수준: ${rData.general_characteristics.B}
- C수준: ${rData.general_characteristics.C}
- D수준: ${rData.general_characteristics.D}
- E수준: ${rData.general_characteristics.E}

[2] 핵심 서술어 및 종결어미 패턴
- A수준: 동사(${rData.verbs_and_endings.A.verbs.join(', ')}), 어미(${rData.verbs_and_endings.A.ending})
- B수준: 동사(${rData.verbs_and_endings.B.verbs.join(', ')}), 어미(${rData.verbs_and_endings.B.ending})
- C수준: 동사(${rData.verbs_and_endings.C.verbs.join(', ')}), 어미(${rData.verbs_and_endings.C.ending})
- D수준: 동사(${rData.verbs_and_endings.D.verbs.join(', ')}), 어미(${rData.verbs_and_endings.D.ending})
- E수준: 동사(${rData.verbs_and_endings.E.verbs.join(', ')}), 어미(${rData.verbs_and_endings.E.ending})

[3] 수식어 및 부사어 결합 조건
- A수준: ${rData.modifiers.A.join(', ')}
- B수준: ${rData.modifiers.B.join(', ')}
- C수준: ${rData.modifiers.C.join(', ')}
- D수준: ${rData.modifiers.D.join(', ')}
- E수준: ${rData.modifiers.E.join(', ')}

[4] MCP(최소 능력자) 판별 준거
- A수준: ${rData.mcp_guidelines.A}
- B수준: ${rData.mcp_guidelines.B}
- C수준: ${rData.mcp_guidelines.C}
- D수준: ${rData.mcp_guidelines.D}
- E수준: ${rData.mcp_guidelines.E}

[5] 교과 내용 요소별 특화 기준
- 다항식: A(${rData.domain_specifics.polynomial.A}) / C(${rData.domain_specifics.polynomial.C}) / E(${rData.domain_specifics.polynomial.E})
- 방정식과 부등식: A,B(${rData.domain_specifics.equation_inequality.A_B}) / C(${rData.domain_specifics.equation_inequality.C}) / D,E(${rData.domain_specifics.equation_inequality.D_E})
- 행렬: A(${rData.domain_specifics.matrix.A}) / C(${rData.domain_specifics.matrix.C}) / E(${rData.domain_specifics.matrix.E})
- 경우의 수: A(${rData.domain_specifics.combinatorics.A}) / C(${rData.domain_specifics.combinatorics.C}) / E(${rData.domain_specifics.combinatorics.E})

[적용 지침]: ${rData.instructions}
`;
        }
        console.log("✅ 3/3: AI 평가 루브릭 셋업 완료!");
        
    } catch(error) {
        console.error("DB 로딩 에러:", error);
    }
}



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
    const qAnswer = document.getElementById('admin-q-answer').value.trim(); 
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
                answer: qAnswer || "정답 정보 없음", 
                level: qLevel,
                reason: qReason
            })
        });
        alert("✨ 문항이 성공적으로 추가되었습니다!");
        
        document.getElementById('admin-q-text').value = '';
        document.getElementById('admin-q-answer').value = ''; 
        document.getElementById('admin-q-reason').value = '';
        
    } catch (error) {
        console.error("문항 추가 실패:", error);
        alert("문항 추가 중 오류가 발생했습니다.");
    }
}

let currentBookmarkQuestions = [];

function resetBookmarkView() {
    document.getElementById('bookmark-list').innerHTML = "";
}

// 🟢 [수정됨] 미분류 탭을 완벽하게 지원하는 북마크 로직
async function loadBookmark(level) {
    // 선택된 과목이 없으면 기본값으로 uncategorized 설정
    const subject = currentSubject || "uncategorized"; 
    const listContainer = document.getElementById('bookmark-list');
    listContainer.innerHTML = "<p style='text-align:center; color:var(--primary); font-weight:bold;'>데이터베이스에서 문항을 불러오는 중입니다... ⏳</p>";

    currentBookmarkQuestions = [];

    // 🌟 [신규] '미분류 보관함'을 선택했을 때의 작동 방식
    if (subject === "uncategorized") {
        try {
            const snapshot = await db.collection('transformed_bank').get();
            snapshot.forEach(doc => {
                const d = doc.data();
                let extractedLevel = d.original_analysis?.match(/성취수준:\s*([A-E])/)?.[1];
                
                // 코드가 없거나 unknown인 문항만 쏙쏙 골라냅니다.
                if (extractedLevel === level && (d.standard_code === "unknown" || d.standard_code === "코드없음")) {
                    
                    // AI가 프롬프트에 따라 적어준 'AI 판단 과목' 추출 (없으면 분석 당시 탭 이름)
                    const aiSubjectMatch = d.original_analysis?.match(/AI 판단 과목:\s*([^\n]+)/);
                    const displaySubject = aiSubjectMatch ? aiSubjectMatch[1].trim() : d.subject;

                    currentBookmarkQuestions.push({
                        code: `📦 미분류 (${displaySubject})`,
                        q: d.question,
                        // 판정이유 부분만 잘라서 보여주기
                        reason: d.original_analysis?.match(/판정 이유:[\s\S]*?(?=\[|$)/)?.[0] || "AI가 미분류 문항으로 판정하였습니다.",
                        answer: d.answer,
                        source: "✨ AI 분석 문항"
                    });
                }
            });
            currentBookmarkQuestions.sort((a, b) => a.code.localeCompare(b.code));
            renderBookmarkList(level);
            return; // 미분류 처리가 끝났으므로 함수 종료
        } catch (err) {
            console.error("미분류 DB 로드 에러:", err);
            renderBookmarkList(level);
            return;
        }
    }

    // 🌟 [기존 로직] 일반 과목(공통수학1 등)을 선택했을 때
    const data = subjectData[subject];
    if (data && data.standards) {
        data.standards.forEach(std => {
            if (std.questions && std.questions.length > 0) {
                std.questions.forEach(q => {
                    if (q.level === level) {
                        currentBookmarkQuestions.push({
                            code: std.code, q: q.q, reason: q.reason,
                            answer: q.answer || "등록된 정답/풀이가 없습니다.",
                            source: "선생님 등록 문항"
                        });
                    }
                });
            }
        });
    }

    try {
        const snapshot = await db.collection('transformed_bank').where('subject', '==', subject).get();
        snapshot.forEach(doc => {
            const d = doc.data();
            let extractedLevel = d.original_analysis?.match(/성취수준:\s*([A-E])/)?.[1];
            // 코드가 정상적으로 있는 문항만 담습니다.
            if (extractedLevel === level && d.standard_code !== "unknown" && d.standard_code !== "코드없음") {
                currentBookmarkQuestions.push({
                    code: d.standard_code, q: d.question,
                    reason: "AI가 원본을 분석하고 변형하며 판정한 문항입니다.",
                    answer: d.answer, source: "✨ AI 추가 문항"
                });
            }
        });
        
        currentBookmarkQuestions.sort((a, b) => a.code.localeCompare(b.code));
        renderBookmarkList(level);
    } catch (err) {
        console.error("DB 로드 에러:", err);
        renderBookmarkList(level); 
    }
}

function renderBookmarkList(level) {
    const listContainer = document.getElementById('bookmark-list');
    if (currentBookmarkQuestions.length === 0) {
        listContainer.innerHTML = `<p style='text-align:center; color: #64748b; padding: 2rem; background:white; border-radius:8px;'>선택하신 '${level}' 수준에 등록된 문항이 없습니다.</p>`;
        return;
    }

    let html = `<p style="font-weight:bold; color:var(--primary); margin-bottom:10px;">🎉 총 ${currentBookmarkQuestions.length}개의 문항이 검색되었습니다.</p>`;
    
    currentBookmarkQuestions.forEach((item, index) => {
        html += `
            <div style="background: white; border: 1px solid var(--border); border-left: 4px solid var(--primary); padding: 1.2rem; border-radius: 8px; cursor: pointer; transition: 0.2s;" 
                 onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'"
                 onclick="openBookmarkModal(${index})">
                <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 0.85rem; font-weight: bold; color: #64748b;">${item.code}</span>
                    <span style="font-size: 0.8rem; background: #e2e8f0; padding: 2px 8px; border-radius: 12px; color: #475569;">${item.source}</span>
                </div>
                <div style="font-size: 0.95rem; line-height: 1.5; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    ${item.q}
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;

    if (window.MathJax) MathJax.typesetPromise([listContainer]);
}

function openBookmarkModal(index) {
    const item = currentBookmarkQuestions[index];
    document.getElementById('bm-modal-title').innerText = `[${item.code}] 문항 상세`;
    document.getElementById('bm-modal-q').innerHTML = item.q;
    document.getElementById('bm-modal-reason').innerHTML = item.reason;
    
    const ansDiv = document.getElementById('bm-modal-answer');
    if (item.answer && item.answer !== "등록된 정답/풀이가 없습니다.") {
        document.getElementById('bm-modal-answer-text').innerHTML = item.answer;
        ansDiv.style.display = 'block';
    } else {
        ansDiv.style.display = 'none';
    }

    document.getElementById('bookmark-modal').style.display = 'flex';
    if (window.MathJax) MathJax.typesetPromise([document.getElementById('bookmark-modal')]);
}

function closeBookmarkModal() {
    document.getElementById('bookmark-modal').style.display = 'none';
}

// ==========================================
// 📊 분할점수 산출 (AI 마법사) 전용 스크립트 (최신 통합본)
// ==========================================

let cutScoreMode = '';
let parsedScores = [];
let finalExamQuestions = [];
let examImages = [];

const levelMeanings = {
    'A': '성취기준을 포괄적으로 이해하고, 복잡한 문제 상황에서 수학적 개념을 융합하여 해결할 수 있는 수준',
    'B': '성취기준에 대한 이해를 바탕으로, 일반적인 문제 상황에서 수학적 개념을 적용하여 해결할 수 있는 수준',
    'C': '성취기준의 기본적인 개념, 원리, 법칙을 이해하고, 단순한 문제 상황에 적용할 수 있는 수준',
    'D': '성취기준의 기초적인 개념과 원리를 부분적으로 이해하고 있는 수준',
    'E': '성취기준에 대한 이해가 부족하여, 기초적인 수학적 지식에 대한 보충 학습이 필요한 수준'
};

// 🌟 [공통] 단계 이동 함수 (이전 단계, 다음 단계 통합 관리)
function goToStep(stepNum) {
    [1, 2, 3, 4].forEach(n => {
        const step = document.getElementById(`cut-score-step${n}`);
        if(step) step.style.display = 'none';
        const indicator = document.getElementById(`step${n}-indicator`);
        if(indicator) indicator.style.color = '#cbd5e1';
    });
    document.getElementById(`cut-score-step${stepNum}`).style.display = 'block';
    document.getElementById(`step${stepNum}-indicator`).style.color = 'var(--primary)';
}

// ------------------------------------------
// [1단계] 평가 세팅
// ------------------------------------------
function updateSubjectList() {
    const group = document.getElementById('cut-score-group').value;
    const subjectSelect = document.getElementById('cut-score-subject');
    subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
    
    const subjectsByGroup = {
        'math': [
            {id: 'common1', name: '공통수학1'}, {id: 'common2', name: '공통수학2'},
            {id: 'algebra', name: '대수'}, {id: 'calculus1', name: '미적분Ⅰ'}, {id: 'stats', name: '확률과 통계'}
        ],
        'korean': [{id: 'kor_common', name: '공통국어'}, {id: 'kor_reading', name: '독서'}, {id: 'kor_lit', name: '문학'}],
        'english': [{id: 'eng_common', name: '공통영어'}, {id: 'eng_reading', name: '영어 독해와 작문'}],
        'social': [{id: 'soc_common', name: '통합사회'}, {id: 'soc_history', name: '한국사'}],
        'science': [{id: 'sci_common', name: '통합과학'}, {id: 'sci_phy', name: '물리학'}]
    };

    if (group && subjectsByGroup[group]) {
        subjectsByGroup[group].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id;
            opt.innerText = sub.name;
            subjectSelect.appendChild(opt);
        });
    }
}

async function loadStandardsForCutScore() {
    const subject = document.getElementById('cut-score-subject').value;
    const listContainer = document.getElementById('cut-score-standards-list');
    if (!subject) return;

    listContainer.innerHTML = '<p style="text-align:center;">성취기준을 불러오는 중... ⏳</p>';

    try {
        const snapshot = await db.collection('standards_2022').where('subject', '==', subject).get();
        let standards = [];
        snapshot.forEach(doc => standards.push({id: doc.id, ...doc.data()}));
        standards.sort((a,b) => a.code.localeCompare(b.code));

        if (standards.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; color:red;">등록된 데이터가 없습니다.</p>';
            return;
        }

        let html = '';
        standards.forEach((std, index) => {
            html += `<div style="display:flex; align-items:center; padding: 8px; border-bottom: 1px solid #f1f5f9;">
                        <input type="checkbox" class="cut-score-std-cb" value="${std.code}" data-index="${index}" style="margin-right:10px; transform:scale(1.2);">
                        <label style="font-size:0.9rem; cursor:pointer;"><strong>${std.code}</strong> ${std.desc}</label>
                    </div>`;
        });
        listContainer.innerHTML = html;
        initShiftClick();
    } catch (error) {
        listContainer.innerHTML = '<p style="color:red;">데이터 로딩 실패</p>';
    }
}

function initShiftClick() {
    const checkboxes = document.querySelectorAll('.cut-score-std-cb');
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

// ==========================================
// 📊 분할점수 산출: 길 1/길 2 경로 제어
// ==========================================
function startPath1() {
    cutScoreMode = 'before';
    const subject = document.getElementById('cut-score-subject').value;
    if (!subject) { alert("먼저 과목을 선택해 주세요."); return; }

    const indicatorBar = document.getElementById('dynamic-indicator-bar');
    indicatorBar.style.display = 'flex';
    indicatorBar.innerHTML = `
        <div id="step1-indicator" style="color: #cbd5e1;">1. 과목 선택</div>
        <div id="step2-indicator" style="color: var(--primary);">2. 문항별 배점 입력 (엑셀)</div>
        <div id="step4-indicator" style="color: #cbd5e1;">3. 결과 산출 (자동 그룹화)</div>
    `;
    goToStep(2); 
    generateEmptyScoreTable(); // 길 1은 진입 시 자동으로 빈 표를 만들어줍니다.
}

function startPath2() {
    cutScoreMode = 'after';
    const subject = document.getElementById('cut-score-subject').value;
    if (!subject) { alert("먼저 과목을 선택해 주세요."); return; }

    loadStandardsForCutScore(); // 길 2를 선택했을 때만 성취기준 로딩

    const indicatorBar = document.getElementById('dynamic-indicator-bar');
    indicatorBar.style.display = 'flex';
    indicatorBar.innerHTML = `
        <div id="step1-indicator" style="color: #cbd5e1;">1. 과목 선택</div>
        <div id="step3-indicator" style="color: var(--primary);">2. 출제범위 및 시험지 분석</div>
        <div id="step4-indicator" style="color: #cbd5e1;">3. 결과 산출</div>
    `;
    goToStep(3); 
}

// ==========================================
// 📝 길 1 전용: 엑셀 처리 및 실시간 총점 계산
// ==========================================
function updateStep2Total() {
    let total = 0;
    document.querySelectorAll('.score-input').forEach(inp => {
        total += parseFloat(inp.value) || 0;
    });
    document.getElementById('step2-total-score').innerText = total.toFixed(1);
}

function generateEmptyScoreTable() {
    const choiceCount = parseInt(document.getElementById('choice-count').value) || 0;
    const shortCount = parseInt(document.getElementById('short-count').value) || 0;
    const container = document.getElementById('score-table-container');
    
    let html = `<table class="score-table">
                <thead style="position: sticky; top: 0; background: #f1f5f9; z-index: 1;">
                <tr><th>문항 번호</th><th>배점 (점)</th><th>예상 성취수준</th></tr></thead><tbody>`;
    
    let globalQNum = 1;
    for(let i=1; i<=choiceCount; i++) {
        html += `<tr>
            <td>${i}</td>
            <td><input type="number" step="0.1" class="score-input" data-num="${globalQNum}" placeholder="0.0" oninput="updateStep2Total()"></td>
            <td><select class="level-select" style="padding:4px;"><option value="A">A</option><option value="B">B</option><option value="C" selected>C</option><option value="D">D</option><option value="E">E</option></select></td>
        </tr>`;
        globalQNum++;
    }
    for(let i=1; i<=shortCount; i++) {
        html += `<tr style="background:#fff7ed;">
            <td>서${i}</td>
            <td><input type="number" step="0.1" class="score-input" data-num="${globalQNum}" placeholder="0.0" oninput="updateStep2Total()"></td>
            <td><select class="level-select" style="padding:4px;"><option value="A">A</option><option value="B">B</option><option value="C" selected>C</option><option value="D">D</option><option value="E">E</option></select></td>
        </tr>`;
        globalQNum++;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
    updateStep2Total();
    document.getElementById('btn-next-to-step3').style.display = 'inline-block';
}

function downloadScoreTemplate() {
    const choiceCount = parseInt(document.getElementById('choice-count').value) || 0;
    const shortCount = parseInt(document.getElementById('short-count').value) || 0;
    let csv = "문항 번호,배점,성취수준\n";
    for(let i=1; i<=choiceCount; i++) csv += `${i},0,C\n`;
    for(let i=1; i<=shortCount; i++) csv += `서${i},0,C\n`;
    
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "분할점수_배점양식.csv";
    link.click();
}

function handleExcelUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});

        let html = '<table class="score-table" style="width:100%;"><thead style="position: sticky; top: 0; background: #f1f5f9; z-index: 1;"><tr><th>문항 번호</th><th>배점</th><th>성취수준</th></tr></thead><tbody>';
        
        jsonData.forEach((row, index) => {
            if(index === 0 && isNaN(row[0])) return;
            if(row[0] && row[1]) {
                let level = (row[2] || 'C').toString().toUpperCase().trim();
                if(!['A','B','C','D','E'].includes(level)) level = 'C';
                
                let selectHtml = `<select class="level-select" style="padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <option value="A" ${level==='A'?'selected':''}>A</option><option value="B" ${level==='B'?'selected':''}>B</option><option value="C" ${level==='C'?'selected':''}>C</option><option value="D" ${level==='D'?'selected':''}>D</option><option value="E" ${level==='E'?'selected':''}>E</option>
                </select>`;

                html += `<tr><td>${row[0]}</td><td><input type="number" step="0.1" class="score-input" data-num="${row[0]}" value="${row[1]}" oninput="updateStep2Total()"></td><td>${selectHtml}</td></tr>`;
            }
        });
        html += '</tbody></table>';
        document.getElementById('score-table-container').innerHTML = html;
        updateStep2Total(); // 엑셀 업로드 직후 총점 계산
        document.getElementById('btn-next-to-step3').style.display = 'inline-block';
    };
    reader.readAsArrayBuffer(file);
}

function getBasePct(level, isShortAnswer) {
    // 요청하신 기준: 객관식 65%, 서답형 50%
    const baseC = isShortAnswer ? 50 : 65; 
    
    // C수준을 기준으로 다른 수준들의 간격을 유동적으로 조정합니다.
    let basePct = { 
        A: Math.min(100, baseC + 25), 
        B: Math.min(100, baseC + 15), 
        C: baseC, 
        D: Math.max(0, baseC - 15), 
        E: Math.max(0, baseC - 30) 
    };

    if(level === 'A') return { A: Math.min(100, baseC + 30), B: baseC + 20, C: baseC + 5, D: baseC - 10, E: baseC - 20 };
    else if(level === 'D') return { A: baseC + 20, B: baseC + 10, C: baseC - 5, D: baseC - 15, E: baseC - 25 };
    else if(level === 'E') return { A: baseC + 15, B: baseC + 5, C: baseC - 10, D: baseC - 20, E: baseC - 30 };
    
    return basePct;
}

// ==========================================
// 🚀 최종 산출: 데이터 통합 및 M자 묶어치기 (길1/길2 공통 활용)
// ==========================================

function handleNextToPath1Result() {
    parsedScores = [];
    const inputs = document.querySelectorAll('.score-input');
    const selects = document.querySelectorAll('.level-select');

    let totalScore = 0;
    inputs.forEach((input, idx) => {
        const s = parseFloat(input.value) || 0;
        totalScore += s;
        parsedScores.push({ 
            num: input.getAttribute('data-num') || (idx + 1), 
            score: s,
            level: selects[idx] ? selects[idx].value : 'C'
        });
    });

    if (totalScore === 0) { alert("입력된 배점이 없습니다. 점수를 확인해 주세요."); return; }

    const ind2 = document.getElementById('step2-indicator');
    const ind4 = document.getElementById('step4-indicator');
    if(ind2) ind2.style.color = '#cbd5e1';
    if(ind4) ind4.style.color = 'var(--primary)';

    goToStep(4);
    
    const mergedData = parsedScores.map(q => {
        // 문항 번호(num)에 '서'라는 글자가 포함되어 있으면 서답형으로 간주
        const isShortAnswer = String(q.num).includes('서');
        const pcts = getBasePct(q.level, isShortAnswer);
        return { num: q.num, score: q.score, level: q.level, pcts: pcts };
    });

    renderGroupedCutScoreTable(mergedData);
}

// 길 2에서 넘어온 AI 결과와 기존 데이터를 합치는 함수
function renderFinalCutScoreTable(aiResults) {
    const mergedData = finalExamQuestions.map(q => {
        const scoreObj = parsedScores.find(s => s.num === q.num) || { score: 0 };
        const ai = aiResults.find(a => a.num === q.num) || { level: 'C', pct_A: 90, pct_B: 70, pct_C: 50, pct_D: 30, pct_E: 10 };
        return {
            num: q.num, score: scoreObj.score, level: ai.level,
            pcts: { A: ai.pct_A, B: ai.pct_B, C: ai.pct_C, D: ai.pct_D, E: ai.pct_E }
        };
    });
    renderGroupedCutScoreTable(mergedData);
}

// 🟢 핵심! 배점과 성취수준으로 문항을 묶어주는 M자 출력 함수
function renderGroupedCutScoreTable(mergedData) {
    document.getElementById('final-result-container').style.display = 'block';
    document.getElementById('final-ai-loading').style.display = 'none';
    
    const tableHead = document.querySelector('#cut-score-result-table').previousElementSibling;
    if (tableHead) {
        tableHead.innerHTML = `<tr><th>해당 문항 (개수)</th><th>배점</th><th>판정 수준</th><th>A (%)</th><th>B (%)</th><th>C (%)</th><th>D (%)</th><th>E (%)</th></tr>`;
        tableHead.parentElement.style.display = 'block'; 
    }

    const tbody = document.getElementById('cut-score-result-table');
    const groups = {};
    
    // 배점(score) + 수준(level) 을 조합한 키로 그룹화
    mergedData.forEach(q => {
        const key = `${q.score}_${q.level}`;
        if (!groups[key]) {
            groups[key] = {
                score: q.score, level: q.level, count: 0, qNums: [], pcts: q.pcts
            };
        }
        groups[key].count++;
        groups[key].qNums.push(q.num);
    });

    let html = '';
    // 배점 내림차순, 성취수준 오름차순으로 예쁘게 정렬
    Object.values(groups).sort((a,b) => b.score - a.score || a.level.localeCompare(b.level)).forEach(g => {
        const levelColor = g.level === 'A' || g.level === 'B' ? '#ef4444' : g.level === 'C' ? '#eab308' : '#22c55e';
        html += `
        <tr style="border-bottom: 1px solid #e2e8f0;" class="cut-score-row" data-score="${g.score}" data-count="${g.count}">
            <td style="text-align: left;">
                <div style="font-size:0.8rem; color:#64748b; margin-bottom: 4px; word-break: keep-all;">${g.qNums.join(', ')}번</div>
                <strong style="color: var(--primary);">총 ${g.count}문항</strong>
            </td>
            <td style="color: #ea580c; font-weight: bold; font-size: 1.1rem;">${g.score}</td>
            <td>
                <span style="background:${levelColor}; color:white; padding: 4px 10px; border-radius: 4px; font-weight: bold;">${g.level}</span>
            </td>
            <td><input type="number" class="pct-A score-input" value="${g.pcts.A}" oninput="calculateTotalCutScores()"></td>
            <td><input type="number" class="pct-B score-input" value="${g.pcts.B}" oninput="calculateTotalCutScores()"></td>
            <td><input type="number" class="pct-C score-input" value="${g.pcts.C}" oninput="calculateTotalCutScores()"></td>
            <td><input type="number" class="pct-D score-input" value="${g.pcts.D}" oninput="calculateTotalCutScores()"></td>
            <td><input type="number" class="pct-E score-input" value="${g.pcts.E}" oninput="calculateTotalCutScores()"></td>
        </tr>
        `;
    });

    tbody.innerHTML = html;
    calculateTotalCutScores();
}

function calculateTotalCutScores() {
    let totalA = 0, totalB = 0, totalC = 0, totalD = 0, totalE = 0;
    let totalScore = 0;

    document.querySelectorAll('.cut-score-row').forEach(row => {
        const score = parseFloat(row.getAttribute('data-score')) || 0;
        const count = parseInt(row.getAttribute('data-count')) || 1;
        const groupTotalPoints = score * count; 
        totalScore += groupTotalPoints;
        
        const pctA = (parseFloat(row.querySelector('.pct-A').value) || 0) / 100;
        const pctB = (parseFloat(row.querySelector('.pct-B').value) || 0) / 100;
        const pctC = (parseFloat(row.querySelector('.pct-C').value) || 0) / 100;
        const pctD = (parseFloat(row.querySelector('.pct-D').value) || 0) / 100;
        const pctE = (parseFloat(row.querySelector('.pct-E').value) || 0) / 100;

        totalA += groupTotalPoints * pctA;
        totalB += groupTotalPoints * pctB;
        totalC += groupTotalPoints * pctC;
        totalD += groupTotalPoints * pctD;
        totalE += groupTotalPoints * pctE;
    });

    renderFinalScoreBoxes(totalA, totalB, totalC, totalD, totalE, totalScore);
}

function renderFinalScoreBoxes(A, B, C, D, E, totalScore) {
    const boxHtml = `
        <div style="width: 100%; text-align: center; margin-bottom: 10px; color: #64748b; font-weight: bold;">(최종 인식된 총 배점: ${totalScore.toFixed(1)}점)</div>
        <div style="flex:1; padding:15px; background:#fef2f2; border: 2px solid #ef4444; border-radius:8px;"><strong>A수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#ef4444;">${A.toFixed(2)}점</span></div>
        <div style="flex:1; padding:15px; background:#fffbeb; border: 2px solid #f59e0b; border-radius:8px;"><strong>B수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#f59e0b;">${B.toFixed(2)}점</span></div>
        <div style="flex:1; padding:15px; background:#f0fdf4; border: 2px solid #22c55e; border-radius:8px;"><strong>C수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#22c55e;">${C.toFixed(2)}점</span></div>
        <div style="flex:1; padding:15px; background:#eff6ff; border: 2px solid #3b82f6; border-radius:8px;"><strong>D수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#3b82f6;">${D.toFixed(2)}점</span></div>
        <div style="flex:1; padding:15px; background:#f8fafc; border: 2px solid #94a3b8; border-radius:8px;"><strong>E수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#64748b;">${E.toFixed(2)}점</span></div>
    `;
    document.getElementById('final-cut-score-boxes').innerHTML = boxHtml;
    document.getElementById('final-result-container').style.display = 'block';
    
    const aiLoading = document.getElementById('final-ai-loading');
    if(aiLoading) aiLoading.style.display = 'none';
}

// ==========================================
// 📊 분할점수 산출: 길 2 (출제 후 AI 정밀 분석 및 M자 묶어치기)
// ==========================================
function startPath2() {
    cutScoreMode = 'after';
    const selectedStds = Array.from(document.querySelectorAll('.cut-score-std-cb:checked'));
    if (selectedStds.length === 0) { alert("출제 범위(성취기준)를 반드시 하나 이상 선택해 주세요."); return; }

    const indicatorBar = document.getElementById('dynamic-indicator-bar');
    indicatorBar.style.display = 'flex';
    indicatorBar.innerHTML = `
        <div id="step1-indicator" style="color: #cbd5e1;">1. 평가 세팅</div>
        <div id="step3-indicator" style="color: var(--primary);">2. 시험지 AI 분석</div>
        <div id="step4-indicator" style="color: #cbd5e1;">3. 결과 산출</div>
    `;
    goToStep(3);
}

// 길 2 전용: AI 분석 데이터를 M자 방식(배점+수준)으로 묶어서 렌더링
function renderFinalCutScoreTable(aiResults) {
    document.getElementById('final-result-container').style.display = 'block';
    document.getElementById('final-ai-loading').style.display = 'none';
    
    // 테이블 헤더를 M자 방식에 맞게 동적 변경
    const tableHead = document.querySelector('#cut-score-result-table').previousElementSibling;
    if (tableHead) {
        tableHead.innerHTML = `<tr><th>해당 문항 (개수)</th><th>배점</th><th>AI 판정 수준</th><th>A (%)</th><th>B (%)</th><th>C (%)</th><th>D (%)</th><th>E (%)</th></tr>`;
        tableHead.parentElement.style.display = 'block'; // 길 1에서 숨겨졌을 수 있으므로 다시 표시
    }

    const tbody = document.getElementById('cut-score-result-table');
    
    // 배점(score)과 성취수준(level)을 기준으로 문항 그룹화 (M자 방식 핵심)
    const groups = {};
    
    finalExamQuestions.forEach(q => {
        const scoreObj = parsedScores.find(s => s.num === q.num) || { score: 0 };
        const ai = aiResults.find(a => a.num === q.num) || { level: 'C', pct_A: 90, pct_B: 70, pct_C: 50, pct_D: 30, pct_E: 10 };
        
        const key = `${scoreObj.score}_${ai.level}`;
        if (!groups[key]) {
            groups[key] = {
                score: scoreObj.score,
                level: ai.level,
                count: 0,
                qNums: [],
                basePct: { A: ai.pct_A, B: ai.pct_B, C: ai.pct_C, D: ai.pct_D, E: ai.pct_E }
            };
        }
        groups[key].count++;
        groups[key].qNums.push(q.num);
    });

    let html = '';
    // 배점 내림차순, 성취수준 오름차순으로 정렬하여 표시
    Object.values(groups).sort((a,b) => b.score - a.score || a.level.localeCompare(b.level)).forEach(g => {
        const levelColor = g.level === 'A' || g.level === 'B' ? '#ef4444' : g.level === 'C' ? '#eab308' : '#22c55e';
        html += `
        <tr style="border-bottom: 1px solid #e2e8f0;" class="cut-score-row" data-score="${g.score}" data-count="${g.count}">
            <td style="text-align: left;">
                <div style="font-size:0.8rem; color:#64748b; margin-bottom: 4px; word-break: keep-all;">${g.qNums.join(', ')}번</div>
                <strong style="color: var(--primary);">총 ${g.count}문항</strong>
            </td>
            <td style="color: #ea580c; font-weight: bold; font-size: 1.1rem;">${g.score}</td>
            <td>
                <span style="background:${levelColor}; color:white; padding: 4px 10px; border-radius: 4px; font-weight: bold;">${g.level}</span>
            </td>
            <td><input type="number" class="pct-A score-input" value="${g.basePct.A}" oninput="calculateTotalCutScores()"></td>
            <td><input type="number" class="pct-B score-input" value="${g.basePct.B}" oninput="calculateTotalCutScores()"></td>
            <td><input type="number" class="pct-C score-input" value="${g.basePct.C}" oninput="calculateTotalCutScores()"></td>
            <td><input type="number" class="pct-D score-input" value="${g.basePct.D}" oninput="calculateTotalCutScores()"></td>
            <td><input type="number" class="pct-E score-input" value="${g.basePct.E}" oninput="calculateTotalCutScores()"></td>
        </tr>
        `;
    });

    tbody.innerHTML = html;
    calculateTotalCutScores();
}

// 길 2 전용 합산 로직 (M자 묶어치기)
function calculateTotalCutScores() {
    let totalA = 0, totalB = 0, totalC = 0, totalD = 0, totalE = 0;
    let totalScore = 0;

    document.querySelectorAll('.cut-score-row').forEach(row => {
        const score = parseFloat(row.getAttribute('data-score')) || 0;
        const count = parseInt(row.getAttribute('data-count')) || 1;
        const groupTotalPoints = score * count; 
        totalScore += groupTotalPoints;
        
        const pctA = (parseFloat(row.querySelector('.pct-A').value) || 0) / 100;
        const pctB = (parseFloat(row.querySelector('.pct-B').value) || 0) / 100;
        const pctC = (parseFloat(row.querySelector('.pct-C').value) || 0) / 100;
        const pctD = (parseFloat(row.querySelector('.pct-D').value) || 0) / 100;
        const pctE = (parseFloat(row.querySelector('.pct-E').value) || 0) / 100;

        totalA += groupTotalPoints * pctA;
        totalB += groupTotalPoints * pctB;
        totalC += groupTotalPoints * pctC;
        totalD += groupTotalPoints * pctD;
        totalE += groupTotalPoints * pctE;
    });

    renderFinalScoreBoxes(totalA, totalB, totalC, totalD, totalE, totalScore);
}

// ==========================================
// 📊 공통 함수: 최종 점수 박스 렌더링
// ==========================================
function renderFinalScoreBoxes(A, B, C, D, E, totalScore) {
    const boxHtml = `
        <div style="width: 100%; text-align: center; margin-bottom: 10px; color: #64748b;">(입력된 총 배점: ${totalScore.toFixed(1)}점)</div>
        <div style="flex:1; padding:15px; background:#fef2f2; border: 2px solid #ef4444; border-radius:8px;"><strong>A수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#ef4444;">${A.toFixed(2)}점</span></div>
        <div style="flex:1; padding:15px; background:#fffbeb; border: 2px solid #f59e0b; border-radius:8px;"><strong>B수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#f59e0b;">${B.toFixed(2)}점</span></div>
        <div style="flex:1; padding:15px; background:#f0fdf4; border: 2px solid #22c55e; border-radius:8px;"><strong>C수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#22c55e;">${C.toFixed(2)}점</span></div>
        <div style="flex:1; padding:15px; background:#eff6ff; border: 2px solid #3b82f6; border-radius:8px;"><strong>D수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#3b82f6;">${D.toFixed(2)}점</span></div>
        <div style="flex:1; padding:15px; background:#f8fafc; border: 2px solid #94a3b8; border-radius:8px;"><strong>E수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#64748b;">${E.toFixed(2)}점</span></div>
    `;
    document.getElementById('final-cut-score-boxes').innerHTML = boxHtml;
    document.getElementById('final-result-container').style.display = 'block';
    const aiLoading = document.getElementById('final-ai-loading');
    if(aiLoading) aiLoading.style.display = 'none';
}

// 🌟 길 1, 2 공통: 뒤로 가기 흐름 제어 함수 (새로 추가)
function goBackStep(currentStep) {
    if (currentStep === 3) {
        goToStep(1); // 길 2: 3단계에서 뒤로 가면 1단계
    } else if (currentStep === 4) {
        if (cutScoreMode === 'before') goToStep(2); // 길 1: 4단계에서 뒤로 가면 2단계
        else goToStep(3); // 길 2: 4단계에서 뒤로 가면 3단계
    }
}

// ------------------------------------------
// [3단계] 시험지 업로드 및 문항 추출 (부분 캡처 포함)
// ------------------------------------------
function handleExamUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    document.getElementById('exam-upload-zone').style.display = 'none';
    document.getElementById('exam-loading').style.display = 'block';

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Img = e.target.result;
        examImages = [base64Img]; 
        startExamAiAnalysis(base64Img);
    };
    reader.readAsDataURL(file);
}

async function startExamAiAnalysis(base64Data) {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) { alert("⚙️ 설정에서 구글 AI API 키를 먼저 입력해주세요."); return; }

    try {
        // 🟢 [수정됨] 파일 형식(MIME Type) 동적 추출 (PDF, PNG 등 완벽 지원)
        const mimeTypeMatch = base64Data.match(/data:(.*?);base64/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
        const base64Clean = base64Data.split(',')[1];

        const prompt = `이 파일은 시험지입니다. 1번 문항부터 마지막 문항까지 번호를 인식하여 텍스트와 수식($ LaTeX 사용)을 추출해 주세요. 
        문항 사이에 그림이나 도표가 있다면 반드시 [🖼️ 그림/도표 영역] 이라고 표시해 주세요.
        결과는 반드시 각 문항별로 구분선(---)을 사용하여 출력해 주세요.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: base64Clean } }] }]
            })
        });

        // 🟢 [추가됨] 에러 통신 확인 로직 추가
        await checkApiError(response);

        const data = await response.json();
        const fullText = data.candidates[0].content.parts[0].text;
        renderExtractedQuestions(fullText);
    } catch (error) {
        alert("분석 중 오류가 발생했습니다.\n" + error.message);
        document.getElementById('exam-upload-zone').style.display = 'block';
    } finally {
        document.getElementById('exam-loading').style.display = 'none';
        document.getElementById('exam-inspector-wrapper').style.display = 'flex';
        document.getElementById('step3-actions').style.display = 'block';
        document.getElementById('exam-img-display').src = examImages[0];
    }
}

// 전역 변수로 관리하여 삭제/수정이 용이하게 합니다
let extractedQuestionsArray = [];

function renderExtractedQuestions(rawText) {
    const listContainer = document.getElementById('extracted-questions-list');
    listContainer.innerHTML = "";
    
    // 1. 문항 분리 및 데이터 구조화
    extractedQuestionsArray = rawText.split('---')
        .filter(q => q.trim().length > 5)
        .map((qText, idx) => {
            // [0.0점] 형태의 배점 추출 정규식
            const scoreMatch = qText.match(/\[(\d+\.?\d*)점\]/);
            const score = scoreMatch ? scoreMatch[1] : "";
            // 배점 텍스트는 본문에서 깔끔하게 제거 (선택 사항)
            const cleanText = qText.replace(/\[\d+\.?\d*점\]/, "").trim();
            
            return { id: idx, text: cleanText, score: score, image: null };
        });

    renderQuestionCards();
}

function renderQuestionCards() {
    const listContainer = document.getElementById('extracted-questions-list');
    listContainer.innerHTML = "";

    extractedQuestionsArray.forEach((q, idx) => {
        const qCard = document.createElement('div');
        qCard.className = "quiz-container"; // 기존 스타일 재활용
        qCard.style.marginBottom = "1rem";
        qCard.style.borderLeft = "4px solid #ea580c";

        qCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                <div style="font-weight: bold; color: #ea580c;">[문항 ${idx + 1}]</div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="font-size: 0.85rem;">배점:</label>
                    <input type="number" step="0.1" class="path2-score-input" value="${q.score}" 
                           onchange="extractedQuestionsArray[${idx}].score = this.value"
                           style="width: 55px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <button onclick="deleteQuestion(${idx})" style="background:#fee2e2; color:#ef4444; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem;">삭제</button>
                    ${idx > 0 ? `<button onclick="mergeWithPrevious(${idx})" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.8rem;">위와 합치기</button>` : ''}
                </div>
            </div>
            <textarea class="q-edit-area" onchange="extractedQuestionsArray[${idx}].text = this.value"
                      style="width: 100%; height: 100px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; font-family: inherit;">${q.text}</textarea>
            <div id="q-image-container-${idx}" style="margin-top: 10px;">${q.image ? `<img src="${q.image}" style="max-height:150px;">` : ''}</div>
            <div style="text-align: right; margin-top: 5px;">
                <button onclick="startPartialCapture(${idx})" style="font-size: 0.75rem; color: #64748b; background:none; border:none; cursor:pointer; text-decoration:underline;">✂️ 그림 캡처/교체</button>
            </div>
        `;
        listContainer.appendChild(qCard);
    });

    // 수학 수식 렌더링 다시 실행
    if (window.MathJax) MathJax.typesetPromise([listContainer]);
}

// 문항 삭제 및 자동 번호 당기기
function deleteQuestion(idx) {
    if(confirm(`${idx + 1}번 문항을 삭제하시겠습니까?`)) {
        extractedQuestionsArray.splice(idx, 1);
        renderQuestionCards();
    }
}

// 한 문항이 두 개로 쪼개졌을 때 빠르게 수정하는 팁
function mergeWithPrevious(idx) {
    extractedQuestionsArray[idx-1].text += "\n" + extractedQuestionsArray[idx].text;
    extractedQuestionsArray.splice(idx, 1);
    renderQuestionCards();
}

let isCapturing = false;
let capStartX = 0, capStartY = 0;
let currentCaptureQIdx = -1;

function startPartialCapture(idx) {
    currentCaptureQIdx = idx;
    const imgEl = document.getElementById('exam-img-display');
    const canvas = document.getElementById('exam-capture-canvas');
    canvas.width = imgEl.clientWidth;
    canvas.height = imgEl.clientHeight;
    canvas.style.display = 'block'; 
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    alert(`[문항 ${idx + 1}] 그림 추가 모드 ✂️\n좌측 원본 시험지에서 추가할 그림이나 표를 마우스로 쭉 드래그하세요!`);
    initCaptureEvents(canvas, imgEl);
}

function initCaptureEvents(canvas, imgEl) {
    const ctx = canvas.getContext('2d');
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    canvas.onmousedown = (e) => {
        if (currentCaptureQIdx === -1) return;
        isCapturing = true;
        const pos = getMousePos(e);
        capStartX = pos.x; capStartY = pos.y;
    };

    canvas.onmousemove = (e) => {
        if (!isCapturing) return;
        const pos = getMousePos(e);
        const width = pos.x - capStartX;
        const height = pos.y - capStartY;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.clearRect(capStartX, capStartY, width, height);
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2;
        ctx.strokeRect(capStartX, capStartY, width, height);
    };

    canvas.onmouseup = canvas.onmouseout = (e) => {
        if (!isCapturing) return;
        isCapturing = false;
        const pos = getMousePos(e);
        let width = pos.x - capStartX;
        let height = pos.y - capStartY;
        let x = capStartX;
        let y = capStartY;
        if (width < 0) { width = Math.abs(width); x = pos.x; }
        if (height < 0) { height = Math.abs(height); y = pos.y; }
        if (width > 15 && height > 15) {
            cropAndInsertImage(x, y, width, height, currentCaptureQIdx);
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
        currentCaptureQIdx = -1; 
    };
}

function cropAndInsertImage(x, y, w, h, qIdx) {
    const imgEl = document.getElementById('exam-img-display');
    const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
    const scaleY = imgEl.naturalHeight / imgEl.clientHeight;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w * scaleX;
    tempCanvas.height = h * scaleY;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(
        imgEl,
        x * scaleX, y * scaleY, w * scaleX, h * scaleY, 
        0, 0, tempCanvas.width, tempCanvas.height       
    );
    const base64Crop = tempCanvas.toDataURL('image/jpeg', 0.9);
    const container = document.getElementById(`q-image-container-${qIdx}`);
    const imgWrapper = document.createElement('div');
    imgWrapper.style.position = 'relative';
    imgWrapper.style.display = 'inline-block';
    imgWrapper.style.margin = '10px 5px';
    imgWrapper.innerHTML = `
        <img src="${base64Crop}" style="max-width: 100%; max-height: 180px; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
        <button onclick="this.parentElement.remove()" style="position: absolute; top: -10px; right: -10px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; font-weight: bold; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">X</button>
    `;
    container.appendChild(imgWrapper);
}

function goToCutScoreStep4() {
    finalExamQuestions = [];
    parsedScores = []; 

    const textAreas = document.querySelectorAll('.q-edit-area');
    const scoreInputs = document.querySelectorAll('.path2-score-input');
    const levelSelects = document.querySelectorAll('.path2-level-select');
    
    let hasError = false; 

    textAreas.forEach((ta, idx) => {
        let qText = ta.value.trim();
        const imgContainer = document.getElementById(`q-image-container-${idx}`);
        const imgEl = imgContainer.querySelector('img');
        let imgBase64 = imgEl ? imgEl.src : null;
        
        let score = 0;
        let level = 'C';

        if(cutScoreMode === 'after') {
            score = parseFloat(scoreInputs[idx].value);
            if (isNaN(score) || score <= 0) { hasError = true; }
            level = levelSelects[idx] ? levelSelects[idx].value : 'C';
            parsedScores.push({ num: idx + 1, score: score, level: level });
        }
        
        finalExamQuestions.push({ num: idx + 1, text: qText, image: imgBase64, level: level });
    });

    if (finalExamQuestions.length === 0) {
        alert("추출된 문항이 없습니다. 시험지 분석이 정상적으로 완료되었는지 확인해 주세요.");
        return;
    }

    if (cutScoreMode === 'after' && hasError) {
        alert("모든 문항의 배점을 정확히 입력해 주세요.");
        return;
    }

    // 🟢 [추가됨] 성취기준 하나 이상 선택했는지 검증 (길 2)
    if (cutScoreMode === 'after') {
        const selectedStds = Array.from(document.querySelectorAll('.cut-score-std-cb:checked'));
        if (selectedStds.length === 0) { 
            alert("평가에 반영된 출제 성취기준을 반드시 하나 이상 선택해 주세요!"); 
            return; 
        }
    }

    const ind3 = document.getElementById('step3-indicator');
    const ind4 = document.getElementById('step4-indicator');
    if(ind3) ind3.style.color = '#cbd5e1';
    if(ind4) ind4.style.color = 'var(--primary)';

    if(cutScoreMode === 'before') {
        // 길 1은 handleNextToPath1Result()에서 처리하므로 이쪽으로는 안 옴
    } else {
        startFinalAiAnalysis(); 
    }
}

async function startFinalAiAnalysis() {
    goToStep(4);
    
    document.getElementById('final-ai-loading').style.display = 'block';
    document.getElementById('final-result-container').style.display = 'none';

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) { alert("API 키가 없습니다."); return; }

    try {
        let questionsPrompt = finalExamQuestions.map(q => {
            let score = parsedScores.find(s => s.num === q.num)?.score || 0;
            return `[문항 ${q.num}] 배점: ${score}점\n내용: ${q.text}`;
        }).join('\n\n');

        const stdList = Array.from(document.querySelectorAll('.cut-score-std-cb:checked')).map(cb => cb.value).join(', ');

        const prompt = `당신은 대한민국 최고의 평가 위원입니다. 다음 문항들을 분석하여 각 문항의 성취수준(A~E)과 '수정된 Angoff 방식'에 따른 경계선 학생의 예상 정답 확률(%)을 추정하세요.
        제시된 성취기준 [${stdList}] 과 <국가 수준 평가 루브릭>을 바탕으로 분석하세요.
        A수준 경계선 학생은 가장 똑똑하므로 정답률이 높아야 하고, E수준으로 갈수록 정답률이 낮아져야 합니다. (확률은 0에서 100 사이의 정수)
        
        반드시 아래의 JSON 배열 형식으로만 응답하세요. 다른 설명은 일절 금지합니다.
        [
          { "num": 1, "level": "A", "pct_A": 85, "pct_B": 60, "pct_C": 40, "pct_D": 20, "pct_E": 10 },
          { "num": 2, "level": "C", "pct_A": 95, "pct_B": 80, "pct_C": 60, "pct_D": 40, "pct_E": 15 }
        ]

        [문항 데이터]
        ${questionsPrompt}
        
        [국가 수준 평가 루브릭]
        ${systemRubric}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1 } 
            })
        });

        const data = await response.json();
        let aiText = data.candidates[0].content.parts[0].text;
        
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiResults = JSON.parse(aiText);

        // 정상 처리되면 위쪽에 이미 만들어둔 M자 묶어치기 렌더링 함수로 결과 전송
        renderFinalCutScoreTable(aiResults);

    } catch (error) {
        console.error(error);
        alert("분석 중 오류가 발생했습니다. (네트워크 지연 또는 AI 응답 오류)\n" + error.message);
        goToStep(3); // 실패 시 다시 3단계로 복귀
    } finally {
        document.getElementById('final-ai-loading').style.display = 'none';
    }
}
// ==========================================
// 🤖 스마트 챗봇 창 크기 조절 (왼쪽은 얼음, 오른쪽 빈 공간으로만 확장)
// ==========================================
let isResizingChat = false;
let chatStartX = 0;
let chatStartWidth = 0;
let leftPanelStartWidth = 0;

function initChatResizer() {
    const resizer = document.getElementById('chat-resizer-right');
    const chatContainer = document.getElementById('ai-chat-container');
    const leftPanel = document.querySelector('#analysis-layout-wrapper .quiz-container');
    const mainContainer = document.querySelector('.container');

    if(!resizer || !chatContainer) return;

    resizer.addEventListener('mousedown', (e) => {
        isResizingChat = true;
        chatStartX = e.clientX;
        chatStartWidth = chatContainer.getBoundingClientRect().width;
        
        if (leftPanel) {
            leftPanelStartWidth = leftPanel.getBoundingClientRect().width;
            leftPanel.style.flex = 'none';
            leftPanel.style.width = leftPanelStartWidth + 'px';
            leftPanel.style.minWidth = leftPanelStartWidth + 'px';
        }

        if (mainContainer) {
            const rect = mainContainer.getBoundingClientRect();
            mainContainer.style.maxWidth = 'none'; 
            mainContainer.style.marginLeft = rect.left + 'px'; 
            mainContainer.style.marginRight = 'auto';
        }

        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizingChat) return;
        const newWidth = chatStartWidth + (e.clientX - chatStartX);
        if (newWidth > 300 && newWidth < 900) { 
            chatContainer.style.flex = 'none';
            chatContainer.style.width = newWidth + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if(isResizingChat) {
            isResizingChat = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        }
    });
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
    
    const chatContainer = document.getElementById('ai-chat-container');
    if(chatContainer) {
        chatContainer.style.display = 'none';
        chatContainer.style.flex = 'none';      
        chatContainer.style.width = '350px';  
        document.getElementById('chat-history').innerHTML = "";
        currentChatContext = ""; 
    }

    const leftPanel = document.querySelector('#analysis-layout-wrapper .quiz-container');
    if (leftPanel) {
        leftPanel.style.flex = '1';
        leftPanel.style.width = 'auto';
        leftPanel.style.minWidth = '300px';
    }
    
    const mainContainer = document.querySelector('.container');
    if (mainContainer) {
        mainContainer.style.maxWidth = '';
        mainContainer.style.marginLeft = '';
        mainContainer.style.marginRight = '';
    }
}

// 페이지 로드 시 크기 조절 기능 활성화
const originalOnload = window.onload;

// ==========================================
// 🛠️ 관리자 모드: 기존 성취기준 수정 및 삭제 로직
// ==========================================
async function loadStandardsForEdit() {
    const subject = document.getElementById('admin-edit-subject').value;
    const stdSelect = document.getElementById('admin-edit-standard');
    const editFields = document.getElementById('admin-edit-fields');
    
    stdSelect.innerHTML = '<option value="">데이터를 불러오는 중입니다...</option>';
    editFields.style.display = 'none'; // 다른 과목 선택 시 창 숨기기

    if (!subject) {
        stdSelect.innerHTML = '<option value="">앞에서 과목을 먼저 선택해 주세요</option>';
        return;
    }

    try {
        const snapshot = await db.collection('standards_2022').where('subject', '==', subject).get();
        let stds = [];
        snapshot.forEach(doc => stds.push({ id: doc.id, ...doc.data() }));
        stds.sort((a,b) => a.code.localeCompare(b.code));

        stdSelect.innerHTML = '<option value="">-- 수정할 성취기준을 선택하세요 --</option>';
        stds.forEach(std => {
            const option = document.createElement('option');
            option.value = std.id;
            option.text = `${std.code} ${std.desc.substring(0, 20)}...`;
            // 🌟 꿀팁: 선택 시 서버에 다시 요청하지 않도록 옵션 태그 안에 데이터를 숨겨둡니다.
            option.dataset.code = std.code || '';
            option.dataset.desc = std.desc || '';
            option.dataset.l_high = std.levels?.high || '';
            option.dataset.l_b = std.levels?.b || '';
            option.dataset.l_mid = std.levels?.mid || '';
            option.dataset.l_d = std.levels?.d || '';
            option.dataset.l_low = std.levels?.low || '';
            stdSelect.appendChild(option);
        });
    } catch (error) {
        stdSelect.innerHTML = '<option value="">불러오기 오류 발생</option>';
    }
}

function populateEditFields() {
    const select = document.getElementById('admin-edit-standard');
    const editFields = document.getElementById('admin-edit-fields');
    const option = select.options[select.selectedIndex];

    if (!option.value) {
        editFields.style.display = 'none';
        return;
    }

    // 숨겨둔 데이터를 꺼내어 입력칸(input)에 예쁘게 채워줍니다.
    document.getElementById('edit-code').value = option.dataset.code;
    document.getElementById('edit-desc').value = option.dataset.desc;
    document.getElementById('edit-level-high').value = option.dataset.l_high;
    document.getElementById('edit-level-b').value = option.dataset.l_b;
    document.getElementById('edit-level-mid').value = option.dataset.l_mid;
    document.getElementById('edit-level-d').value = option.dataset.l_d;
    document.getElementById('edit-level-low').value = option.dataset.l_low;

    editFields.style.display = 'block'; // 입력창 짠! 나타나기
}

async function updateStandardInDB() {
    const docId = document.getElementById('admin-edit-standard').value;
    if (!docId) return;

    const updatedData = {
        code: document.getElementById('edit-code').value.trim(),
        desc: document.getElementById('edit-desc').value.trim(),
        levels: {
            high: document.getElementById('edit-level-high').value.trim(),
            b: document.getElementById('edit-level-b').value.trim(),
            mid: document.getElementById('edit-level-mid').value.trim(),
            d: document.getElementById('edit-level-d').value.trim(),
            low: document.getElementById('edit-level-low').value.trim()
        }
    };

    if (!updatedData.code || !updatedData.desc) {
        alert("성취기준 코드와 내용은 필수입니다!");
        return;
    }

    if(confirm("이대로 덮어쓰시겠습니까? (기존 내용은 사라집니다)")) {
        try {
            await db.collection('standards_2022').doc(docId).update(updatedData);
            alert("✅ 성공적으로 수정되었습니다!");
            location.reload(); // 새로고침해서 최신 데이터 반영
        } catch(e) { alert("수정 실패: " + e.message); }
    }
}

async function deleteStandardFromDB() {
    const docId = document.getElementById('admin-edit-standard').value;
    if (!docId) return;

    if(confirm("🚨 정말로 이 성취기준을 삭제하시겠습니까?\n한 번 삭제하면 되돌릴 수 없습니다!")) {
        try {
            await db.collection('standards_2022').doc(docId).delete();
            alert("🗑️ 성취기준이 삭제되었습니다.");
            location.reload();
        } catch(e) { alert("삭제 실패: " + e.message); }
    }
}
// ==========================================
// 🛠️ 관리자 모드: 기존 문항(Question) 수정 및 삭제 로직
// ==========================================
let currentEditingAllQuestions = []; // 현재 선택된 성취기준의 모든 문항 임시 저장

async function loadStandardsForManage() {
    const subject = document.getElementById('admin-manage-q-subject').value;
    const stdSelect = document.getElementById('admin-manage-q-standard');
    stdSelect.innerHTML = '<option value="">로딩 중...</option>';
    if (!subject) return;

    const snapshot = await db.collection('standards_2022').where('subject', '==', subject).get();
    let stds = [];
    snapshot.forEach(doc => stds.push({ id: doc.id, code: doc.data().code, desc: doc.data().desc }));
    stds.sort((a,b) => a.code.localeCompare(b.code));

    stdSelect.innerHTML = '<option value="">-- 성취기준 선택 --</option>';
    stds.forEach(std => {
        stdSelect.innerHTML += `<option value="${std.id}">${std.code} ${std.desc.substring(0, 20)}...</option>`;
    });
}

async function loadQuestionsForEdit() {
    const docId = document.getElementById('admin-manage-q-standard').value;
    const qSelect = document.getElementById('admin-manage-q-list');
    const fields = document.getElementById('question-edit-fields');
    fields.style.display = 'none';

    if (!docId) return;

    const doc = await db.collection('standards_2022').doc(docId).get();
    currentEditingAllQuestions = doc.data().questions || [];

    if (currentEditingAllQuestions.length === 0) {
        qSelect.innerHTML = '<option value="">등록된 문항이 없습니다.</option>';
        return;
    }

    qSelect.innerHTML = '<option value="">-- 수정할 문항 선택 --</option>';
    currentEditingAllQuestions.forEach((q, idx) => {
        qSelect.innerHTML += `<option value="${idx}">[${q.level}] ${q.q.substring(0, 30)}...</option>`;
    });
}

function populateQuestionEditFields() {
    const idx = document.getElementById('admin-manage-q-list').value;
    const fields = document.getElementById('question-edit-fields');
    if (idx === "") { fields.style.display = 'none'; return; }

    const q = currentEditingAllQuestions[idx];
    document.getElementById('manage-q-text').value = q.q;
    document.getElementById('manage-q-answer').value = q.answer || "";
    document.getElementById('manage-q-level').value = q.level;
    document.getElementById('manage-q-reason').value = q.reason;
    fields.style.display = 'block';
}

async function updateQuestionInDB() {
    const docId = document.getElementById('admin-manage-q-standard').value;
    const qIdx = document.getElementById('admin-manage-q-list').value;
    if (!docId || qIdx === "") return;

    // 현재 배열 복사 후 해당 인덱스 내용 수정
    let updatedQuestions = [...currentEditingAllQuestions];
    updatedQuestions[qIdx] = {
        q: document.getElementById('manage-q-text').value.trim(),
        answer: document.getElementById('manage-q-answer').value.trim(),
        level: document.getElementById('manage-q-level').value,
        reason: document.getElementById('manage-q-reason').value.trim()
    };

    if (confirm("문항 내용을 수정하시겠습니까?")) {
        await db.collection('standards_2022').doc(docId).update({ questions: updatedQuestions });
        alert("✅ 문항이 수정되었습니다!");
        location.reload();
    }
}

async function deleteQuestionFromDB() {
    const docId = document.getElementById('admin-manage-q-standard').value;
    const qIdx = document.getElementById('admin-manage-q-list').value;
    if (!docId || qIdx === "") return;

    if (confirm("🚨 정말로 이 문항을 삭제하시겠습니까?")) {
        let updatedQuestions = [...currentEditingAllQuestions];
        updatedQuestions.splice(qIdx, 1); // 해당 인덱스 문항 제거

        await db.collection('standards_2022').doc(docId).update({ questions: updatedQuestions });
        alert("🗑️ 문항이 삭제되었습니다.");
        location.reload();
    }
}
// ==========================================
// 📂 사용자 폴더(프로젝트) 관리 시스템 (분할점수 산출용)
// ==========================================
let currentProjectId = null;

// ==========================================
// 📂 사용자 폴더(프로젝트) 관리 시스템 (삭제 기능 포함)
// ==========================================
async function loadProjects() {
    const user = auth.currentUser;
    const listEl = document.getElementById('project-folder-list');
    
    if(!user) {
        listEl.innerHTML = '<p style="color:#ef4444; grid-column: 1 / -1; text-align: center;">⚠️ 폴더를 관리하려면 구글 로그인이 필요합니다.</p>';
        return;
    }

    listEl.innerHTML = '<p style="color: #64748b; grid-column: 1 / -1; text-align: center;">폴더를 불러오는 중...</p>';

    try {
        const snapshot = await db.collection('user_projects')
            .where('uid', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();

            if(snapshot.empty) {
                listEl.innerHTML = '<p style="color:#64748b; grid-column: 1 / -1; text-align: center;">생성된 폴더가 없습니다. 우측 상단의 [+ 새 폴더 만들기]를 눌러보세요!</p>';
                return;
            }
    
            let html = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : "방금 전";
                let badges = '';
                
                if(data.assessments && data.assessments.length > 0) {
                    badges = data.assessments.map(a => `<span style="display:inline-block; background:#e2e8f0; color:#475569; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-right:4px; margin-top:4px;">${a.name}</span>`).join('');
                } else {
                    badges = '<span style="font-size: 0.75rem; color: #94a3b8;">평가 내역 없음</span>';
                }
    
                html += `
                <div style="position: relative; border: 1px solid #cbd5e1; border-radius: 8px; padding: 1.5rem; background: white; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05);" 
                     onmouseover="this.style.borderColor='#3b82f6'; this.style.transform='translateY(-3px)';" 
                     onmouseout="this.style.borderColor='#cbd5e1'; this.style.transform='none';">
                     
                    <button onclick="deleteProject('${doc.id}', event)" style="position: absolute; top: 10px; right: 10px; background: #fee2e2; color: #ef4444; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8rem; z-index: 10;">삭제</button>
                    
                    <div onclick="openProject('${doc.id}', '${data.name}')">
                        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📁</div>
                        <h4 style="margin: 0 0 0.5rem 0; color: #1e293b; font-size: 1.1rem;">${data.name}</h4>
                        <p style="margin: 0 0 0.5rem 0; font-size: 0.8rem; color: #64748b;">생성일: ${dateStr}</p>
                        <div style="border-top: 1px dashed #cbd5e1; padding-top: 0.5rem;">${badges}</div>
                    </div>
                </div>`;
            });
            listEl.innerHTML = html;
    } catch(e) {
        console.error(e);
        listEl.innerHTML = '<p style="color:red; grid-column: 1 / -1;">폴더를 불러오는데 실패했습니다.</p>';
    }
}

// 🟢 [추가됨] 폴더(프로젝트) 삭제 로직
async function deleteProject(projectId, event) {
    event.stopPropagation(); // 삭제 버튼 클릭 시 폴더 안으로 들어가는 것을 막음
    if(!confirm("⚠️ 정말로 이 폴더를 삭제하시겠습니까?\n내부에 저장된 모든 평가 내역이 영구 삭제됩니다!")) return;
    
    try {
        await db.collection('user_projects').doc(projectId).delete();
        alert("🗑️ 폴더가 성공적으로 삭제되었습니다.");
        loadProjects(); // 목록 새로고침
    } catch(e) {
        alert("삭제 중 오류가 발생했습니다: " + e.message);
    }
}

// 2. 새 폴더 만들기 (DB에 저장)
async function createNewProject() {
    const user = auth.currentUser;
    if(!user) { alert("로그인이 필요합니다."); return; }

    const projectName = prompt("새로운 폴더 이름을 입력하세요.\n(예: 2026학년도 1학기 A고등학교)");
    if(!projectName || projectName.trim() === "") return;

    try {
        await db.collection('user_projects').add({
            uid: user.uid,
            name: projectName.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            assessments: [] // 나중에 1회고사, 수행평가 데이터가 들어갈 빈 바구니
        });
        alert("✨ 새 폴더가 생성되었습니다!");
        loadProjects(); // 화면 새로고침
    } catch(e) {
        alert("폴더 생성 실패: " + e.message);
    }
}

// 🟢 [수정됨] 공통 단계 이동 함수 (프로젝트 뷰 끄기 기능 추가)
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

// 🟢 [수정됨] 폴더 클릭 시 열기 (상세 화면으로 이동)
async function openProject(projectId, projectName) {
    currentProjectId = projectId;
    
    // 대시보드와 기존 단계별 화면 숨기기
    document.getElementById('cut-score-dashboard').style.display = 'none';
    [1, 2, 3, 4].forEach(n => {
        const step = document.getElementById(`cut-score-step${n}`);
        if(step) step.style.display = 'none';
    });
    document.getElementById('dynamic-indicator-bar').style.display = 'none';

    // 프로젝트 상세 화면 띄우기
    document.getElementById('project-detail-title').innerText = `📂 ${projectName}`;
    document.getElementById('project-detail-view').style.display = 'block';

    await loadProjectDetails();
}

function backToProjectList() {
    currentProjectId = null;
    document.getElementById('project-detail-view').style.display = 'none';
    document.getElementById('cut-score-dashboard').style.display = 'block';
    loadProjects();
}

// 🟢 [신규] 프로젝트 내역(1회고사, 수행 등) 불러오기 및 렌더링
async function loadProjectDetails() {
    const listEl = document.getElementById('project-assessment-list');
    listEl.innerHTML = '<p style="text-align:center; padding: 1rem;">데이터를 계산 중입니다... ⏳</p>';
    
    try {
        const doc = await db.collection('user_projects').doc(currentProjectId).get();
        if(doc.exists) {
            renderProjectAssessments(doc.data().assessments || []);
        }
    } catch(e) {
        listEl.innerHTML = '<p style="color:red; text-align:center;">데이터를 불러오는 데 실패했습니다.</p>';
    }
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

    let html = `<table class="score-table">
        <thead style="background: #f1f5f9;">
            <tr><th>평가명</th><th>반영 비율</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>관리</th></tr>
        </thead>
        <tbody>`;
    
    let totalWeight = 0;
    let totals = { A: 0, B: 0, C: 0, D: 0, E: 0 };

    assessments.forEach((asm, idx) => {
        totalWeight += asm.weight;
        totals.A += (asm.scores?.A || 0);
        totals.B += (asm.scores?.B || 0);
        totals.C += (asm.scores?.C || 0);
        totals.D += (asm.scores?.D || 0);
        totals.E += (asm.scores?.E || 0);

        // type이 'written'이면 산출/수정 버튼 표시
        const editBtn = asm.type === 'written' 
            ? `<button onclick="startEditAssessment(${idx})" style="background:#3b82f6; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; margin-right:5px;">산출/수정</button>` 
            : '';

        html += `<tr>
            <td><strong>${asm.name}</strong></td>
            <td style="color: #ea580c; font-weight: bold;">${asm.weight}%</td>
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
                <td>${totals.A.toFixed(2)}</td>
                <td>${totals.B.toFixed(2)}</td>
                <td>${totals.C.toFixed(2)}</td>
                <td>${totals.D.toFixed(2)}</td>
                <td>${totals.E.toFixed(2)}</td>
                <td></td>
            </tr>
        </tfoot>
    </table>`;

    listEl.innerHTML = html;

    // 최종 산출 박스 업데이트
    finalBoxes.innerHTML = `
        <div style="flex:1; min-width: 100px; padding:15px; background:white; border: 2px solid #ef4444; border-radius:8px;"><strong>A 컷오프</strong><br><span style="font-size:1.6rem; font-weight:bold; color:#ef4444;">${totals.A.toFixed(2)}</span></div>
        <div style="flex:1; min-width: 100px; padding:15px; background:white; border: 2px solid #f59e0b; border-radius:8px;"><strong>B 컷오프</strong><br><span style="font-size:1.6rem; font-weight:bold; color:#f59e0b;">${totals.B.toFixed(2)}</span></div>
        <div style="flex:1; min-width: 100px; padding:15px; background:white; border: 2px solid #22c55e; border-radius:8px;"><strong>C 컷오프</strong><br><span style="font-size:1.6rem; font-weight:bold; color:#22c55e;">${totals.C.toFixed(2)}</span></div>
        <div style="flex:1; min-width: 100px; padding:15px; background:white; border: 2px solid #3b82f6; border-radius:8px;"><strong>D 컷오프</strong><br><span style="font-size:1.6rem; font-weight:bold; color:#3b82f6;">${totals.D.toFixed(2)}</span></div>
        <div style="flex:1; min-width: 100px; padding:15px; background:white; border: 2px solid #94a3b8; border-radius:8px;"><strong>E 컷오프</strong><br><span style="font-size:1.6rem; font-weight:bold; color:#64748b;">${totals.E.toFixed(2)}</span></div>
    `;

    // 100%가 아닐 경우 경고창
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

// 🟢 [신규] 수행평가 수동 입력 로직
function openManualAssessmentModal() { document.getElementById('manual-assessment-modal').style.display = 'flex'; }
function closeManualAssessmentModal() { document.getElementById('manual-assessment-modal').style.display = 'none'; }

async function saveManualAssessment() {
    const name = document.getElementById('manual-assess-name').value.trim();
    const weight = parseFloat(document.getElementById('manual-assess-weight').value) || 0;
    
    // 100점 만점 기준 입력값을 비율(%)에 맞게 환산
    const a = (parseFloat(document.getElementById('manual-a').value) || 0) * (weight / 100);
    const b = (parseFloat(document.getElementById('manual-b').value) || 0) * (weight / 100);
    const c = (parseFloat(document.getElementById('manual-c').value) || 0) * (weight / 100);
    const d = (parseFloat(document.getElementById('manual-d').value) || 0) * (weight / 100);
    const e = (parseFloat(document.getElementById('manual-e').value) || 0) * (weight / 100);
    if(!name || weight <= 0) {
        alert("평가명과 반영 비율을 정확히 입력하세요.");
        return;
    }

    try {
        await db.collection('user_projects').doc(currentProjectId).update({
            assessments: firebase.firestore.FieldValue.arrayUnion({
                name: name, weight: weight,
                scores: { A: a, B: b, C: c, D: d, E: e },
                savedAt: new Date()
            })
        });
        alert("✅ 수행평가가 성공적으로 추가되었습니다!");
        
        // 필드 초기화
        document.querySelectorAll('#manual-assessment-modal input').forEach(input => input.value = '');
        closeManualAssessmentModal();
        loadProjectDetails(); // 합산표 재계산
    } catch(err) { alert("저장 실패: " + err.message); }
}

// 🟢 [수정됨] 4단계 지필평가 저장 완료 시 프로젝트 뷰로 복귀
async function saveAssessmentToProject() {
    if (!currentProjectId || currentEditingAssessmentIndex === -1) { alert("오류: 편집 중인 평가를 찾을 수 없습니다."); return; }

    const boxes = document.getElementById('final-cut-score-boxes').querySelectorAll('span');
    if (boxes.length < 5) { alert("점수 산출이 먼저 완료되어야 합니다."); return; }

    const cutOffs = {
        A: parseFloat(boxes[0].innerText.replace('점','')),
        B: parseFloat(boxes[1].innerText.replace('점','')),
        C: parseFloat(boxes[2].innerText.replace('점','')),
        D: parseFloat(boxes[3].innerText.replace('점','')),
        E: parseFloat(boxes[4].innerText.replace('점',''))
    };

    try {
        const docRef = db.collection('user_projects').doc(currentProjectId);
        const doc = await docRef.get();
        if(doc.exists) {
            let assessments = doc.data().assessments || [];
            // 해당 인덱스의 점수만 업데이트
            assessments[currentEditingAssessmentIndex].scores = cutOffs;
            assessments[currentEditingAssessmentIndex].savedAt = new Date();
            
            await docRef.update({ assessments: assessments });
            alert(`✅ 분할점수가 성공적으로 업데이트되었습니다!`);
            
            goToStep(-1); 
            document.getElementById('project-detail-view').style.display = 'block';
            loadProjectDetails();
            currentEditingAssessmentIndex = -1; // 초기화
        }
    } catch(e) { alert("업데이트 실패: " + e.message); }
}

window.onload = async () => {
    await loadStandardsFromDB(); 
    changeSubject();             
    syncPendingFeedback();       
    initChatResizer(); // 챗봇 리사이저 추가
};
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

function startEditAssessment(index) {
    currentEditingAssessmentIndex = index;
    goToStep(1); // 길1, 길2 선택 화면(1단계)으로 이동시켜 자유롭게 진입 가능하게 함
}    