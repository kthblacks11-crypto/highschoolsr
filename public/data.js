// 알맹이는 파이어베이스에서 가져오므로, 여기는 과목별 '빈 바구니'만 준비해 둡니다.
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
        subtitle: "지수함수와 로그함수, 삼각함수, 수열",
        standards: [] 
    },
    calculus1: { title: "미적분Ⅰ", subtitle: "함수의 극한과 연속, 미분, 적분", standards: [] },
    stats: { title: "확률과 통계", subtitle: "경우의 수, 확률, 통계", standards: [] },
    calculus2: { title: "미적분Ⅱ", subtitle: "수열의 극한, 여러 가지 함수의 미적분", standards: [] },
    geometry: { title: "기하", subtitle: "이차곡선, 평면벡터, 공간도형과 공간좌표", standards: [] },
    'ai-math': { title: "인공지능 수학", subtitle: "인공지능과 수학적 원리", standards: [] }
};