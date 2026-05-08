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
let lastAnalyzedSingleImage = null; // 챗봇용 이미지 보관

// 🟢 네모 박스 크롭 및 미세조정을 위한 상태 변수들
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

    // 🟢 [추가된 부분] 눌린 버튼을 찾아서 강제로 파란색(active)으로 만들어주는 코드
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

// 🟢 AI 통신 및 분석 (gemini-3-flash-preview 고정)
// 🟢 AI 통신 및 분석 (문항별 이미지 분리 배치 및 텍스트 추출 적용)
// 🟢 AI 통신 및 분석 (Step 3: DB 루브릭 완벽 적용 및 2단계 판정)
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
            
            // 🟢 [핵심] 프롬프트에 ${systemRubric} 변수를 투입하여 AI가 DB의 1차 기준을 숙지하게 만듭니다!
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
                generationConfig: { temperature: 0.1, topP: 0.9, maxOutputTokens: 3072 }
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

// 🎯 글씨 잘림 완벽 방어 및 렌더링 (단일 문제용 - 원본 텍스트 추출 추가)
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
    text = text.replace(/(?:\[)?\s*원본\s*문제\s*추출\s*(?:\])?\s*:?/g, '[원본 문제 추출]:'); // 🟢 새로 추가됨
    text = text.replace(/(?:\[)?\s*교과\s*및\s*단원\s*(?:\])?\s*:?/g, '[교과 및 단원]:');
    text = text.replace(/(?:\[)?\s*성취기준\s*및\s*수준\s*(?:\])?\s*:?/g, '[성취기준 및 수준]:');
    text = text.replace(/(?:\[)?\s*핵심\s*개념\s*(?:\])?\s*:?/g, '[핵심 개념]:');
    text = text.replace(/(?:\[)?\s*상세\s*풀이\s*(?:\])?\s*:?/g, '[상세 풀이]:');
    text = text.replace(/(?:\[)?\s*문제\s*풀이\s*(?:\])?\s*:?/g, '[상세 풀이]:'); 
    
    // 🟢 0번 항목(원본 문제 추출) 추가
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

        // 해당 항목이 없으면 그리지 않고 넘어감 (하위 호환성)
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

// 🟢 탭 전환 함수 (북마크 탭에서 상단 과목선택창 보이도록 수정)
function showSection(id) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(`'${id}'`));
    if (activeBtn) activeBtn.classList.add('active');
    
    const subjectSelector = document.querySelector('.subject-selector');
    const subTitle = document.getElementById('main-subtitle'); 

    // 🟢 'problem-analysis'(문제분석) 탭에서만 숨기고, 'bookmark'(북마크) 탭에서는 다시 보이게 설정!
    if (id === 'problem-analysis') {
        if (subjectSelector) subjectSelector.style.visibility = 'hidden';
        if (subTitle) subTitle.style.visibility = 'hidden';
    } else {
        if (subjectSelector) subjectSelector.style.visibility = 'visible';
        if (subTitle) subTitle.style.visibility = 'visible';
    }
}

// 🟢 글로벌 과목 변경 함수 (북마크 초기화 연동)
function changeSubject() {
    currentSubject = document.getElementById('math-subjects').value;
    const data = subjectData[currentSubject];
    if (data) { document.getElementById('main-subtitle').innerText = "[" + data.title + "] " + data.subtitle; }
    initDashboard(); 
    initChecklist();

    // 🟢 과목을 바꾸면 북마크 목록도 빈칸으로 리셋되도록 추가!
    const bookmarkList = document.getElementById('bookmark-list');
    if (bookmarkList) {
        bookmarkList.innerHTML = "";
    }
}

// 🟢 대시보드 성취기준 렌더링 - 수학 수식 깨짐 방지 타이밍 적용
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
    
    // 🟢 [추가됨] DB 데이터가 너무 빨리 불러와져서 수식 번역기(MathJax)가 고장나는 것을 막기 위해 0.3초 대기 후 렌더링 실행
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

// 🟢 모달창 오픈 및 수식 렌더링 추가
function openModal(std) {
    document.getElementById('modal-title').innerText = std.code;
    document.getElementById('modal-desc').innerText = std.desc;
    
    // std.levels가 없을 경우를 대비한 안전 장치 추가
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

    // 🟢 [핵심 추가] 팝업창이 열릴 때 내부의 텍스트를 수학 수식으로 변환!
    if (window.MathJax) {
        MathJax.typesetPromise([document.getElementById('level-modal')]).catch(err => console.error(err));
    }
}

// 🟢 챗봇 재분석 기능 (gemini-3-flash-preview 적용)
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
    
    // 1. 사용자(선생님) 메시지 말풍선 추가
    historyEl.innerHTML += `<div style="text-align: right; margin-bottom: 12px;"><span style="background: #e0e7ff; color: #1e40af; padding: 10px 14px; border-radius: 16px 16px 0 16px; display: inline-block; text-align: left; max-width: 80%">${message}</span></div>`;
    inputEl.value = '';
    historyEl.scrollTop = historyEl.scrollHeight;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        historyEl.innerHTML += `<div style="text-align: left; margin-bottom: 12px;"><span style="color: #dc2626; background: #fee2e2; padding: 10px; border-radius: 8px; display: inline-block; font-size: 0.9rem;">⚠️ API 키가 설정되지 않았습니다.</span></div>`;
        return;
    }

    // 2. 답변 대기 중 로딩 말풍선 표시
    const loadingId = 'loading-' + Date.now();
    historyEl.innerHTML += `<div id="${loadingId}" style="text-align: left; margin-bottom: 12px;"><span style="background: #f3f4f6; color: #4b5563; padding: 10px 14px; border-radius: 16px 16px 16px 0; display: inline-block; font-size: 0.9rem;">판정 기준을 엄격하게 재검토 중입니다... ⏳</span></div>`;
    historyEl.scrollTop = historyEl.scrollHeight;

    try {
        // 🟢 3. [핵심] 예스맨 방지 및 루브릭 절대 수호 프롬프트
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
                // 🟢 4. 창의성을 죽이고 원칙주의자로 만드는 온도(Temperature) 세팅 추가
                generationConfig: { temperature: 0.1, topP: 0.9 } 
            })
        });
        
        await checkApiError(response); 
        const result = await response.json();
        const aiReply = result.candidates[0].content.parts[0].text;
        
        // 🟢 5. AI가 타당하다고 인정하여 성취수준을 바꿨다면, 시스템 메모리(currentChatContext)도 업데이트!
        if (aiReply.includes("성취수준:") && aiReply.includes("판정 이유:")) {
            currentChatContext = aiReply;
        }

        // 로딩 말풍선 지우기
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();

        const formattedReply = aiReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

        // 6. AI 답변 말풍선 추가
        historyEl.innerHTML += `<div style="text-align: left; margin-bottom: 12px;"><span style="background: white; border: 1px solid var(--border); padding: 12px 16px; border-radius: 16px 16px 16px 0; display: inline-block; max-width: 85%;">${formattedReply}</span></div>`;
        if (window.MathJax && window.MathJax.typesetPromise) { MathJax.typesetClear(); MathJax.typesetPromise([historyEl]); }
        historyEl.scrollTop = historyEl.scrollHeight;

    } catch(e) { 
        // 에러 발생 시 로딩 지우고 에러 말풍선 띄우기
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

// 🟢 글로벌 변수 추가 (기존 코드 윗부분에 넣거나, 이대로 함수 위에 두셔도 됩니다)
let subjectData = {}; // DB에서 불러온 과목과 성취기준이 담길 빈 바구니
let systemRubric = ""; // DB에서 불러온 AI용 평가 루브릭(채점 기준표)

// 🟢 [Step 2] 완벽하게 업그레이드된 DB 호출 함수
async function loadStandardsFromDB() {
    try {
        console.log("⏳ DB에서 시스템 데이터를 불러옵니다...");

        // 1. 과목 기본 정보 불러오기 (Step 1에서 넣은 subjects 컬렉션)
        const subjectSnapshot = await db.collection('subjects').get();
        subjectSnapshot.forEach(doc => {
            const data = doc.data();
            subjectData[doc.id] = {
                title: data.title,
                subtitle: data.subtitle,
                standards: [] // 성취기준을 담을 빈 배열 준비
            };
        });
        console.log("✅ 1/3: 과목 뼈대 로드 완료");

        // 2. 성취기준 및 등록된 문항 불러오기 (기존 standards_2022 컬렉션)
        const standardsSnapshot = await db.collection('standards_2022').get();
        standardsSnapshot.forEach(doc => {
            const data = doc.data();
            // 해당 과목 바구니가 존재하면 그 안에 쏙 넣기
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

        // 단원 코드 순서대로 정렬 (01-01 다음 01-02가 오도록)
        for (let subj in subjectData) {
            if (subjectData[subj].standards.length > 0) {
                subjectData[subj].standards.sort((a, b) => a.code.localeCompare(b.code));
            }
        }
        console.log("✅ 2/3: 성취기준 및 문항 로드 완료");

        // 3. AI 1차 평가 루브릭 불러오기 (Step 1에서 넣은 영업비밀!)
        const rubricDoc = await db.collection('system_config').doc('evaluation_rubric').get();
        if (rubricDoc.exists) {
            const rData = rubricDoc.data();
            
            // 🟢 AI 프롬프트에 그대로 꽂아 넣을 수 있도록 깔끔한 텍스트로 조립합니다.
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

// 🟢 관리자 모드: 문항 저장 (정답 필드 추가됨)
async function saveQuestionToDB() {
    const docId = document.getElementById('admin-q-standard').value;
    const qText = document.getElementById('admin-q-text').value.trim();
    const qAnswer = document.getElementById('admin-q-answer').value.trim(); // 🟢 정답 가져오기
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
                answer: qAnswer || "정답 정보 없음", // 🟢 정답 저장
                level: qLevel,
                reason: qReason
            })
        });
        alert("✨ 문항이 성공적으로 추가되었습니다!");
        
        // 입력칸 비워주기
        document.getElementById('admin-q-text').value = '';
        document.getElementById('admin-q-answer').value = ''; 
        document.getElementById('admin-q-reason').value = '';
        
    } catch (error) {
        console.error("문항 추가 실패:", error);
        alert("문항 추가 중 오류가 발생했습니다.");
    }
}

// 🟢 북마크(수준별 문항 모아보기) 전용 스크립트
let currentBookmarkQuestions = [];

function resetBookmarkView() {
    document.getElementById('bookmark-list').innerHTML = "";
}

// 🟢 북마크(수준별 문항 모아보기) - 상단 글로벌 과목 선택과 연동
async function loadBookmark(level) {
    // 🟢 삭제한 북마크 전용 드롭다운 대신, 시스템 공통 과목 변수(currentSubject)를 사용합니다!
    const subject = currentSubject; 
    const listContainer = document.getElementById('bookmark-list');
    listContainer.innerHTML = "<p style='text-align:center; color:var(--primary); font-weight:bold;'>데이터베이스에서 문항을 불러오는 중입니다... ⏳</p>";

    const data = subjectData[subject];
    if (!data || !data.standards) {
        listContainer.innerHTML = "<p style='text-align:center;'>해당 과목의 데이터가 없습니다.</p>";
        return;
    }

    currentBookmarkQuestions = [];

    // 1. 관리자(선생님)가 직접 등록한 성취기준 문항들 가져오기
    data.standards.forEach(std => {
        if (std.questions && std.questions.length > 0) {
            std.questions.forEach(q => {
                if (q.level === level) {
                    currentBookmarkQuestions.push({
                        code: std.code,
                        q: q.q,
                        reason: q.reason,
                        answer: q.answer || "등록된 정답/풀이가 없습니다.",
                        source: "선생님 등록 문항"
                    });
                }
            });
        }
    });

    // 2. AI가 생성한 변형 문항들 (transformed_bank) 가져오기
    try {
        const snapshot = await db.collection('transformed_bank').where('subject', '==', subject).get();
        snapshot.forEach(doc => {
            const d = doc.data();
            let extractedLevel = d.original_analysis?.match(/성취수준:\s*([A-E])/)?.[1];
            if (extractedLevel === level) {
                currentBookmarkQuestions.push({
                    code: d.standard_code || "코드 없음",
                    q: d.question,
                    reason: "AI가 원본을 분석하고 변형하며 판정한 문항입니다.",
                    answer: d.answer,
                    source: "✨ AI 추가 문항"
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
// 📊 분할점수 산출 (AI 마법사) 전용 스크립트
// ==========================================

// [1] 교과군 선택 시 과목 드롭다운 업데이트 (사회 포함)
function updateSubjectList() {
    const group = document.getElementById('cut-score-group').value;
    const subjectSelect = document.getElementById('cut-score-subject');
    subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
    
    const subjectsByGroup = {
        'math': [
            {id: 'common1', name: '공통수학1'}, {id: 'common2', name: '공통수학2'},
            {id: 'algebra', name: '대수'}, {id: 'calculus1', name: '미적분Ⅰ'}, {id: 'stats', name: '확률과 통계'}
        ],
        'korean': [
            {id: 'kor_common', name: '공통국어'}, {id: 'kor_reading', name: '독서'}, {id: 'kor_lit', name: '문학'}
        ],
        'english': [
            {id: 'eng_common', name: '공통영어'}, {id: 'eng_reading', name: '영어 독해와 작문'}
        ],
        'social': [
            {id: 'soc_common', name: '통합사회'}, {id: 'soc_history', name: '한국사'},
            {id: 'soc_geo', name: '세계 지리'}, {id: 'soc_politics', name: '정치와 법'}
        ],
        'science': [
            {id: 'sci_common', name: '통합과학'}, {id: 'sci_phy', name: '물리학'}, {id: 'sci_chem', name: '화학'}
        ]
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

// [2] 과목 선택 시 DB에서 성취기준 불러오기
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
            listContainer.innerHTML = '<p style="text-align:center; color:red;">등록된 성취기준이 없습니다.</p>';
            return;
        }

        let html = '';
        standards.forEach((std, index) => {
            html += `
                <div class="std-check-item" style="display:flex; align-items:center; padding: 8px; border-bottom: 1px solid #f1f5f9;">
                    <input type="checkbox" class="cut-score-std-cb" value="${std.code}" data-index="${index}" style="margin-right:10px; transform:scale(1.2);">
                    <label style="font-size:0.9rem; cursor:pointer;"><strong>${std.code}</strong> ${std.desc}</label>
                </div>
            `;
        });
        listContainer.innerHTML = html;
        initShiftClick();
    } catch (error) {
        listContainer.innerHTML = '<p style="color:red;">데이터를 불러오지 못했습니다.</p>';
    }
}

// [3] Shift + 클릭 범위 선택 로직
let lastChecked = null;
function initShiftClick() {
    const checkboxes = document.querySelectorAll('.cut-score-std-cb');
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

// [4] 2단계로 이동하는 함수
function goToCutScoreStep2() {
    const selectedStds = Array.from(document.querySelectorAll('.cut-score-std-cb:checked')).map(cb => cb.value);
    if (selectedStds.length === 0) { alert("출제 범위(성취기준)를 최소 하나 이상 선택해 주세요!"); return; }
    document.getElementById('cut-score-step1').style.display = 'none';
    document.getElementById('cut-score-step2').style.display = 'block';
    document.getElementById('step1-indicator').style.color = '#10b981';
    document.getElementById('step2-indicator').style.color = 'var(--primary)';
}

// [5] 시험지 업로드 처리 및 AI 분석
let examImages = [];
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

// [6] AI 스캔 요청
async function startExamAiAnalysis(base64Data) {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) { alert("⚙️ 설정에서 구글 AI API 키를 먼저 입력해주세요."); return; }

    try {
        const prompt = `이 파일은 시험지입니다. 1번 문항부터 마지막 문항까지 번호를 인식하여 텍스트와 수식($ LaTeX 사용)을 추출해 주세요. 
        문항 사이에 그림이나 도표가 있다면 반드시 [🖼️ 그림/도표 영역] 이라고 표시해 주세요.
        결과는 반드시 각 문항별로 구분선(---)을 사용하여 출력해 주세요.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: base64Data.split(',')[1] } }] }]
            })
        });

        const data = await response.json();
        const fullText = data.candidates[0].content.parts[0].text;
        renderExtractedQuestions(fullText);
    } catch (error) {
        alert("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
        document.getElementById('exam-upload-zone').style.display = 'block';
    } finally {
        document.getElementById('exam-loading').style.display = 'none';
        document.getElementById('exam-inspector-wrapper').style.display = 'flex';
        document.getElementById('step2-actions').style.display = 'block';
        document.getElementById('exam-img-display').src = examImages[0];
    }
}

// [7] 추출된 텍스트 리스트 만들기
function renderExtractedQuestions(rawText) {
    const listContainer = document.getElementById('extracted-questions-list');
    listContainer.innerHTML = "";
    const questions = rawText.split('---').filter(q => q.trim().length > 5);

    questions.forEach((qText, idx) => {
        const qCard = document.createElement('div');
        qCard.className = 'quiz-container';
        qCard.style.padding = '1rem';
        qCard.style.borderLeft = '4px solid #ea580c';
        qCard.style.background = 'white';
        qCard.innerHTML = `
            <div style="font-weight: bold; color: #ea580c; margin-bottom: 0.5rem;">[문항 ${idx + 1}]</div>
            <textarea class="q-edit-area" style="width: 100%; height: 100px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px; font-family: inherit;">${qText.trim()}</textarea>
            <div style="margin-top: 0.5rem; text-align: right;">
                <button onclick="startPartialCapture(${idx})" style="font-size: 0.8rem; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 4px; cursor: pointer;">✂️ 그림 추가</button>
            </div>
            <div id="q-image-container-${idx}" style="margin-top: 10px; text-align: center;"></div>
        `;
        listContainer.appendChild(qCard);
    });
    if (window.MathJax) MathJax.typesetPromise([listContainer]);
}

// [8] 이전 1단계로 돌아가기
function backToStep1() {
    document.getElementById('cut-score-step2').style.display = 'none';
    document.getElementById('cut-score-step1').style.display = 'block';
    document.getElementById('step2-indicator').style.color = '#cbd5e1';
}

// ==========================================
// [9] 부분 캡처 (그림/도표 오려내기) 마법사
// ==========================================
let isCapturing = false;
let capStartX = 0, capStartY = 0;
let currentCaptureQIdx = -1;

// 1. 캡처 모드 시작
function startPartialCapture(idx) {
    currentCaptureQIdx = idx;
    const imgEl = document.getElementById('exam-img-display');
    const canvas = document.getElementById('exam-capture-canvas');
    
    // 캔버스 크기를 좌측 시험지 이미지와 완벽히 동일하게 맞춤
    canvas.width = imgEl.clientWidth;
    canvas.height = imgEl.clientHeight;
    canvas.style.display = 'block'; // 캔버스 활성화
    
    // 시각적 안내 (살짝 어둡게 처리)
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 선생님을 위한 안내창
    alert(`[문항 ${idx + 1}] 그림 추가 모드 ✂️\n좌측 원본 시험지에서 추가할 그림이나 표를 마우스로 쭉 드래그하세요!`);
    
    // 캔버스 마우스 이벤트 등록 (드래그 기능)
    initCaptureEvents(canvas, imgEl);
}

// 2. 드래그 앤 드롭 이벤트 처리
function initCaptureEvents(canvas, imgEl) {
    const ctx = canvas.getContext('2d');

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    // 마우스를 눌렀을 때 (캡처 시작)
    canvas.onmousedown = (e) => {
        if (currentCaptureQIdx === -1) return;
        isCapturing = true;
        const pos = getMousePos(e);
        capStartX = pos.x;
        capStartY = pos.y;
    };

    // 마우스를 드래그할 때 (네모 박스 그리기)
    canvas.onmousemove = (e) => {
        if (!isCapturing) return;
        const pos = getMousePos(e);
        const width = pos.x - capStartX;
        const height = pos.y - capStartY;

        // 전체 화면 다시 어둡게 칠하기
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 드래그한 영역만 밝게 뚫기 (투명하게)
        ctx.clearRect(capStartX, capStartY, width, height);
        // 드래그 테두리에 오렌지색 선 긋기
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2;
        ctx.strokeRect(capStartX, capStartY, width, height);
    };

    // 마우스에서 손을 뗐을 때 (캡처 완료)
    canvas.onmouseup = canvas.onmouseout = (e) => {
        if (!isCapturing) return;
        isCapturing = false;
        
        const pos = getMousePos(e);
        let width = pos.x - capStartX;
        let height = pos.y - capStartY;
        let x = capStartX;
        let y = capStartY;

        // 마우스를 반대 방향으로 드래그했을 경우 좌표 보정
        if (width < 0) { width = Math.abs(width); x = pos.x; }
        if (height < 0) { height = Math.abs(height); y = pos.y; }

        // 실수로 클릭만 한 경우(크기가 너무 작을 때)를 방지
        if (width > 15 && height > 15) {
            cropAndInsertImage(x, y, width, height, currentCaptureQIdx);
        }
        
        // 캡처 종료 후 캔버스 초기화 및 숨기기
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
        currentCaptureQIdx = -1; // 타겟 문항 번호 초기화
    };
}

// 3. 이미지를 잘라내서 우측 에디터에 쏙 넣기
function cropAndInsertImage(x, y, w, h, qIdx) {
    const imgEl = document.getElementById('exam-img-display');
    
    // 원본 이미지 크기와 웹 화면에 보이는 크기의 비율 계산 (핵심!)
    const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
    const scaleY = imgEl.naturalHeight / imgEl.clientHeight;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w * scaleX;
    tempCanvas.height = h * scaleY;
    
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(
        imgEl,
        x * scaleX, y * scaleY, w * scaleX, h * scaleY, // 원본에서 자를 위치/크기
        0, 0, tempCanvas.width, tempCanvas.height       // 새 캔버스에 그릴 위치/크기
    );
    
    const base64Crop = tempCanvas.toDataURL('image/jpeg', 0.9);
    
    // 우측 에디터의 해당 문항(qIdx) 이미지 컨테이너 찾기
    const container = document.getElementById(`q-image-container-${qIdx}`);
    
    // 이미지와 삭제(X) 버튼을 함께 감싸는 박스 생성
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
// ==========================================
// [10] 3단계: 배점 엑셀 데이터 결합 로직
// ==========================================

let finalExamQuestions = []; // 2단계에서 확정된 문항 텍스트와 이미지
let parsedScores = []; // 3단계에서 엑셀에서 뽑아낸 배점 정보

// [2단계 -> 3단계 이동]
function goToCutScoreStep3() {
    // 1. 2단계 우측 에디터에 있는 문항 내용들을 싹 긁어모읍니다.
    finalExamQuestions = [];
    const textAreas = document.querySelectorAll('.q-edit-area');
    
    textAreas.forEach((ta, idx) => {
        let qText = ta.value.trim();
        // 해당 문항에 그림이 추가되었는지 확인
        const imgContainer = document.getElementById(`q-image-container-${idx}`);
        const imgEl = imgContainer.querySelector('img');
        let imgBase64 = imgEl ? imgEl.src : null;
        
        finalExamQuestions.push({
            num: idx + 1,
            text: qText,
            image: imgBase64
        });
    });

    if (finalExamQuestions.length === 0) {
        alert("추출된 문항이 없습니다. 시험지 분석이 정상적으로 완료되었는지 확인해 주세요.");
        return;
    }

    // 화면 전환
    document.getElementById('cut-score-step2').style.display = 'none';
    document.getElementById('cut-score-step3').style.display = 'block';
    
    // 상태바 색상 변경
    document.getElementById('step2-indicator').style.color = '#10b981'; // 완료
    document.getElementById('step3-indicator').style.color = 'var(--primary)'; // 진행 중
    
    // 이전에 입력한 엑셀 데이터가 있다면 초기화
    document.getElementById('excel-paste-area').value = '';
    document.getElementById('excel-preview-container').style.display = 'none';
    document.getElementById('btn-start-final-ai').style.display = 'none';
}

// [3단계 -> 2단계 되돌아가기]
function backToStep2() {
    document.getElementById('cut-score-step3').style.display = 'none';
    document.getElementById('cut-score-step2').style.display = 'flex'; // 뷰어라서 flex 사용
    document.getElementById('step3-indicator').style.color = '#cbd5e1';
}

// [엑셀 데이터 파싱] 붙여넣은 텍스트를 분석하는 함수
function parseExcelData() {
    const rawText = document.getElementById('excel-paste-area').value.trim();
    const previewContainer = document.getElementById('excel-preview-container');
    const previewTable = document.getElementById('excel-preview-table');
    const btnStartAi = document.getElementById('btn-start-final-ai');
    const statusMsg = document.getElementById('match-status-msg');
    
    if (!rawText) {
        previewContainer.style.display = 'none';
        btnStartAi.style.display = 'none';
        return;
    }

    // 줄바꿈으로 행(Row)을 나누고, 탭(\t)이나 띄어쓰기로 열(Column)을 나눔
    const rows = rawText.split('\n');
    parsedScores = [];
    
    let html = `<table style="width: 100%; border-collapse: collapse; text-align: center;">
                    <tr style="background: #e2e8f0; border-bottom: 2px solid #cbd5e1;">
                        <th style="padding: 8px;">문항 번호</th>
                        <th style="padding: 8px;">배점</th>
                    </tr>`;

    rows.forEach(row => {
        // 탭 문자 또는 여러 개의 공백을 기준으로 나눔
        const cols = row.trim().split(/\t|\s{2,}/); 
        
        if (cols.length >= 2) {
            // 숫자만 추출 (예: "1번" -> 1, "4.5점" -> 4.5)
            const num = parseInt(cols[0].replace(/[^0-9]/g, ''));
            const score = parseFloat(cols[1].replace(/[^0-9.]/g, ''));
            
            if (!isNaN(num) && !isNaN(score)) {
                parsedScores.push({ num: num, score: score });
                html += `<tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 6px;">${num}</td>
                            <td style="padding: 6px; color: #ea580c; font-weight: bold;">${score}점</td>
                         </tr>`;
            }
        }
    });
    html += `</table>`;

    // 파싱된 데이터 보여주기
    document.getElementById('parsed-count-msg').innerText = `${parsedScores.length}개`;
    previewTable.innerHTML = html;
    previewContainer.style.display = 'block';

    // 2단계의 문항 개수와 엑셀의 배점 개수가 일치하는지 검증
    if (parsedScores.length === finalExamQuestions.length) {
        statusMsg.innerHTML = '✅ 문항 개수와 배점 개수가 완벽히 일치합니다!';
        statusMsg.style.color = '#10b981';
        btnStartAi.style.display = 'inline-block'; // 다음 버튼 활성화
    } else {
        statusMsg.innerHTML = `⚠️ 불일치! (시험지 문항: ${finalExamQuestions.length}개 / 엑셀 배점: ${parsedScores.length}개)`;
        statusMsg.style.color = '#ef4444';
        btnStartAi.style.display = 'none'; // 개수가 안 맞으면 버튼 숨김
    }
}

// [4단계로 넘어가는 가짜 함수 - 다음번에 실제 AI 로직으로 채울 예정입니다]
// ==========================================
// [11] 4단계: 최종 AI 분석 및 분할점수 자동 계산
// ==========================================

async function startFinalAiAnalysis() {
    // 화면 전환 및 로딩 표시
    document.getElementById('cut-score-step3').style.display = 'none';
    document.getElementById('cut-score-step4').style.display = 'block';
    document.getElementById('step3-indicator').style.color = '#10b981';
    document.getElementById('step4-indicator').style.color = 'var(--primary)';
    
    document.getElementById('final-ai-loading').style.display = 'block';
    document.getElementById('final-result-container').style.display = 'none';

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) { alert("API 키가 없습니다."); return; }

    try {
        // 문항 텍스트와 배점 합치기 (AI 프롬프트용)
        let questionsPrompt = finalExamQuestions.map(q => {
            let score = parsedScores.find(s => s.num === q.num)?.score || 0;
            return `[문항 ${q.num}] 배점: ${score}점\n내용: ${q.text}`;
        }).join('\n\n');

        // AI에게 JSON 형태로 응답하라고 강력하게 지시하는 프롬프트
        const prompt = `당신은 대한민국 최고의 평가 위원입니다. 다음 문항들을 분석하여 각 문항의 성취수준(A~E)과 '수정된 Angoff 방식'에 따른 경계선 학생의 예상 정답 확률(%)을 추정하세요.
        A수준 경계선 학생은 가장 똑똑하므로 정답률이 높아야 하고, E수준으로 갈수록 정답률이 낮아져야 합니다. (확률은 0에서 100 사이의 정수)
        
        반드시 아래의 JSON 배열 형식으로만 응답하세요. 다른 설명은 일절 금지합니다.
        [
          { "num": 1, "level": "A", "pct_A": 85, "pct_B": 60, "pct_C": 40, "pct_D": 20, "pct_E": 10 },
          { "num": 2, "level": "C", "pct_A": 95, "pct_B": 80, "pct_C": 60, "pct_D": 40, "pct_E": 15 }
        ]

        [문항 데이터]
        ${questionsPrompt}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1 } // 창의성 제거, 일관된 답변 유도
            })
        });

        const data = await response.json();
        let aiText = data.candidates[0].content.parts[0].text;
        
        // 마크다운 블록(```json)이 섞여올 경우를 대비한 텍스트 정제
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiResults = JSON.parse(aiText);

        // 결과 표 그리기 실행
        renderFinalCutScoreTable(aiResults);

    } catch (error) {
        console.error(error);
        alert("분석 중 오류가 발생했습니다. (AI가 JSON 형식을 어겼거나 네트워크 오류)\n" + error.message);
        document.getElementById('cut-score-step4').style.display = 'none';
        document.getElementById('cut-score-step3').style.display = 'block';
    } finally {
        document.getElementById('final-ai-loading').style.display = 'none';
    }
}

// [12] 결과 표 렌더링 및 입력창(Input) 만들기
function renderFinalCutScoreTable(aiResults) {
    document.getElementById('final-result-container').style.display = 'block';
    const tbody = document.getElementById('cut-score-result-table');
    let html = '';

    finalExamQuestions.forEach(q => {
        const scoreObj = parsedScores.find(s => s.num === q.num);
        const score = scoreObj ? scoreObj.score : 0;
        
        // AI 결과가 매칭 안 되면 기본값 세팅
        const ai = aiResults.find(a => a.num === q.num) || { level: 'C', pct_A: 90, pct_B: 70, pct_C: 50, pct_D: 30, pct_E: 10 };

        // 표 한 줄(행) 만들기 - 선생님이 %를 직접 수정할 수 있는 <input> 태그 사용
        html += `
        <tr style="border-bottom: 1px solid #e2e8f0;" class="cut-score-row" data-score="${score}">
            <td style="padding: 8px;"><strong>${q.num}</strong></td>
            <td style="padding: 8px; color: #ea580c; font-weight: bold;">${score}</td>
            <td style="padding: 8px;">
                <select class="level-select" style="padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;">
                    <option value="A" ${ai.level==='A'?'selected':''}>A</option>
                    <option value="B" ${ai.level==='B'?'selected':''}>B</option>
                    <option value="C" ${ai.level==='C'?'selected':''}>C</option>
                    <option value="D" ${ai.level==='D'?'selected':''}>D</option>
                    <option value="E" ${ai.level==='E'?'selected':''}>E</option>
                </select>
            </td>
            <td style="padding: 8px;"><input type="number" class="pct-A" value="${ai.pct_A}" style="width: 50px; text-align: center; border: 1px solid #fca5a5; border-radius: 4px;" oninput="calculateTotalCutScores()"></td>
            <td style="padding: 8px;"><input type="number" class="pct-B" value="${ai.pct_B}" style="width: 50px; text-align: center; border: 1px solid #fcd34d; border-radius: 4px;" oninput="calculateTotalCutScores()"></td>
            <td style="padding: 8px;"><input type="number" class="pct-C" value="${ai.pct_C}" style="width: 50px; text-align: center; border: 1px solid #86efac; border-radius: 4px;" oninput="calculateTotalCutScores()"></td>
            <td style="padding: 8px;"><input type="number" class="pct-D" value="${ai.pct_D}" style="width: 50px; text-align: center; border: 1px solid #93c5fd; border-radius: 4px;" oninput="calculateTotalCutScores()"></td>
            <td style="padding: 8px;"><input type="number" class="pct-E" value="${ai.pct_E}" style="width: 50px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;" oninput="calculateTotalCutScores()"></td>
        </tr>
        `;
    });

    tbody.innerHTML = html;
    calculateTotalCutScores(); // 처음 화면이 뜰 때 바로 최초 계산 실행
}

// [13] (핵심 수식) 분할점수 실시간 자동 계산기
function calculateTotalCutScores() {
    let totalA = 0, totalB = 0, totalC = 0, totalD = 0, totalE = 0;

    document.querySelectorAll('.cut-score-row').forEach(row => {
        const score = parseFloat(row.getAttribute('data-score'));
        
        // 입력된 % 값을 가져와서 100으로 나눔 (예: 85% -> 0.85)
        const pctA = (parseFloat(row.querySelector('.pct-A').value) || 0) / 100;
        const pctB = (parseFloat(row.querySelector('.pct-B').value) || 0) / 100;
        const pctC = (parseFloat(row.querySelector('.pct-C').value) || 0) / 100;
        const pctD = (parseFloat(row.querySelector('.pct-D').value) || 0) / 100;
        const pctE = (parseFloat(row.querySelector('.pct-E').value) || 0) / 100;

        // 분할점수 공식: 배점 × 예상 정답 확률
        totalA += score * pctA;
        totalB += score * pctB;
        totalC += score * pctC;
        totalD += score * pctD;
        totalE += score * pctE;
    });

    // 화면 하단의 박스에 계산 결과 업데이트 (소수점 둘째 자리까지 표시)
    const boxHtml = `
        <div style="flex:1; padding:15px; background:#fef2f2; border: 2px solid #ef4444; border-radius:8px;"><strong>A수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#ef4444;">${totalA.toFixed(2)}점</span></div>
        <div style="flex:1; padding:15px; background:#fffbeb; border: 2px solid #f59e0b; border-radius:8px;"><strong>B수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#f59e0b;">${totalB.toFixed(2)}점</span></div>
        <div style="flex:1; padding:15px; background:#f0fdf4; border: 2px solid #22c55e; border-radius:8px;"><strong>C수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#22c55e;">${totalC.toFixed(2)}점</span></div>
        <div style="flex:1; padding:15px; background:#eff6ff; border: 2px solid #3b82f6; border-radius:8px;"><strong>D수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#3b82f6;">${totalD.toFixed(2)}점</span></div>
        <div style="flex:1; padding:15px; background:#f8fafc; border: 2px solid #94a3b8; border-radius:8px;"><strong>E수준 컷오프</strong><br><span style="font-size:1.8rem; font-weight:bold; color:#64748b;">${totalE.toFixed(2)}점</span></div>
    `;
    document.getElementById('final-cut-score-boxes').innerHTML = boxHtml;
}
