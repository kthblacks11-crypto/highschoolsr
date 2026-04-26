// 💡 과목의 뼈대(제목)만 남겨두고, 핵심 데이터(standards)는 모두 빈 배열([])로 비웁니다.
// 이제 모든 알맹이는 파이어베이스 DB에서 안전하게 가져옵니다!

const subjectData = {
    common1: {
        title: "공통수학1",
        subtitle: "다항식, 방정식과 부등식, 경우의 수, 행렬",
        standards: [] 
    },
    common2: {
        title: "공통수학2",
        subtitle: "도형의 방정식, 집합과 명제, 함수와 그래프",
        standards: [] 
    },
    algebra: {
        title: "대수",
        subtitle: "지수함수와 로그함수, 수열 단원 분석",
        standards: [] 
    },
    calculus1: { title: "미적분Ⅰ", subtitle: "미분과 적분의 기초", standards: [] },
    stats: { title: "확률과 통계", subtitle: "경우의 수, 확률과 통계", standards: [] },
    calculus2: { title: "미적분Ⅱ", subtitle: "심화 미적분", standards: [] },
    geometry: { title: "기하", subtitle: "이차곡선, 공간도형과 공간좌표", standards: [] },
    'ai-math': { title: "인공지능 수학", subtitle: "인공지능과 수학적 원리", standards: [] }
};