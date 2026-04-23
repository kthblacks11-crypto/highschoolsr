const firebaseConfig = {
    projectId: "math-asa-project-2026",
    storageBucket: "math-asa-project-2026.appspot.com",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

const subjectData = {
    common1: {
        title: "공통수학1",
        subtitle: "다항식, 방정식과 부등식, 경우의 수, 행렬",
        standards: [
            { 
                code: "[10공수1-01-01]", 
                desc: "다항식의 사칙연산의 원리를 설명하고, 그 계산을 할 수 있다.", 
                levels: { 
                    high: "다항식의 사칙연산의 원리를 이해하여 설명할 수 있으며, 그 계산을 수학적 절차에 따라 체계적으로 수행할 수 있다.", 
                    b: "다항식의 사칙연산의 원리를 설명할 수 있고, 그 계산을 수학적 절차에 따라 정확하게 수행할 수 있다.",
                    mid: "다항식의 사칙연산의 원리를 알고, 그 계산을 할 수 있다.", 
                    d: "다항식의 사칙연산의 원리를 알고, 간단한 다항식의 사칙연산을 수행할 수 있다.",
                    low: "안내된 절차에 따라 간단한 다항식의 사칙연산을 할 수 있다." 
                },
                questions: [
                    { q: "두 다항식 $A = x+1, B = 2x-3$일 때, 다음 순서에 따라 $A+B$를 구하시오.<br>1단계: 동류항끼리 모은다.<br>2단계: 계수를 더해 결과를 쓴다.", level: "E", reason: "문제에서 풀이 단계를 명시하여 '안내된 절차'를 제공하므로 E수준에 적합합니다." },
                    { q: "두 다항식 $A = 2x^2 - 3x + 1, B = x^2 + 2x - 5$일 때, $2A - 3B$를 계산하여 그 결과를 단항식의 합으로 나타내시오.", level: "C", reason: "기본적인 다항식의 사칙연산을 수행할 수 있는지를 평가하는 전형적인 중 수준 문제입니다." },
                    { q: "다항식의 덧셈에 대한 결합법칙 $(A+B)+C = A+(B+C)$가 성립함을 구체적인 세 다항식을 예로 들어 증명하고, 이 원리가 복잡한 식의 계산에서 어떻게 효율적으로 사용되는지 설명하시오.", level: "A", reason: "연산의 원리를 이해하고 이를 논리적으로 설명하는 능력을 요구하므로 상 수준입니다." }
                ]
            },
            { 
                code: "[10공수1-01-02]", 
                desc: "항등식의 성질과 나머지정리를 이해하고, 이를 활용하여 문제를 해결할 수 있다.", 
                levels: { 
                    high: "항등식의 성질, 나머지정리와 인수정리, 조립제법을 설명할 수 있으며 이를 활용하여 다양한 문제를 해결할 수 있다.", 
                    b: "항등식의 성질, 나머지정리와 인수정리를 설명할 수 있으며 이를 활용하여 일반적인 문제를 해결할 수 있다.",
                    mid: "항등식의 성질, 나머지정리와 인수정리를 알고, 이를 활용하여 문제를 해결할 수 있다.", 
                    d: "항등식의 성질과 나머지정리를 알고, 기초적인 문제를 해결할 수 있다.",
                    low: "항등식의 성질과 나머지정리를 안다." 
                },
                questions: [
                    { q: "다항식 $P(x)$를 $x-a$로 나누었을 때의 나머지가 $P(a)$임을 나머지정리를 이용하여 증명하고, 이를 활용하여 $P(x)$를 이차식으로 나누었을 때의 나머지를 구하는 원리를 설명하시오.", level: "A", reason: "나머지정리의 증명과 이차식으로 나눈 경우의 일반화를 요구하므로 상 수준입니다." },
                    { q: "다항식 $P(x) = x^3 - 2x^2 + ax + 3$이 $x-1$로 나누어떨어질 때, 상수 $a$의 값을 구하시오.", level: "C", reason: "인수정리를 이용하여 미지수를 구하는 기본적인 문항입니다." },
                    { q: "다음은 조립제법을 이용하여 $2x^3 - 5x^2 + 4x - 1$을 $x-2$로 나누는 과정입니다. 빈칸에 알맞은 수를 써넣으시오.", level: "E", reason: "안내된 절차(조립제법 틀)에 따라 계산을 수행하는 수준입니다." }
                ]
            },
            { 
                code: "[10공수1-01-03]", 
                desc: "다항식의 인수분해를 할 수 있다.", 
                levels: { 
                    high: "다양한 방법으로 다항식의 인수분해를 할 수 있다.", 
                    b: "여러 가지 공식과 성질을 이용하여 다항식의 인수분해를 할 수 있다.",
                    mid: "인수분해 공식을 이용하여 다항식의 인수분해를 할 수 있다.", 
                    d: "기본적인 인수분해 공식을 적용하여 간단한 다항식의 인수분해를 할 수 있다.",
                    low: "안내된 절차에 따라 간단한 다항식의 인수분해를 할 수 있다." 
                },
                questions: [
                    { q: "복잡한 식 $x^4 + x^2y^2 + y^4$을 인수분해하는 방법을 설명하고, 이를 활용하여 $10001$이 소수가 아님을 증명하시오.", level: "A", reason: "특수한 형태의 인수분해와 이를 수의 성질 증명에 활용하는 고차원적 사고를 요구합니다." },
                    { q: "다항식 $x^2 - 5x + 6$을 인수분해하시오.", level: "D", reason: "가장 기본적인 이차식의 인수분해 수준입니다." }
                ]
            },
            { 
                code: "[10공수1-02-01]", 
                desc: "복소수의 뜻과 성질을 설명하고, 복소수의 사칙연산을 수행할 수 있다.", 
                levels: { 
                    high: "복소수의 뜻과 성질을 이해하여 설명할 수 있으며, 복소수의 성질을 이용하여 사칙연산을 수학적 절차에 따라 체계적으로 수행할 수 있다.", 
                    b: "복소수의 뜻과 성질을 설명할 수 있으며, 복소수의 사칙연산을 정확하게 수행할 수 있다.",
                    mid: "복소수의 뜻과 성질을 이해하고, 사칙연산을 수행할 수 있다.", 
                    d: "복소수의 뜻을 알고, 간단한 복소수의 사칙연산을 수행할 수 있다.",
                    low: "복소수의 뜻을 알고, 안내된 절차에 따라 간단 사칙연산을 수행할 수 있다." 
                },
                questions: [
                    { q: "음수의 제곱근의 성질 $\\sqrt{a}\\sqrt{b} = -\\sqrt{ab}$ ($a<0, b<0$)가 성립함을 허수단위 $i$를 사용하여 증명하고, 이를 활용하여 복잡한 무리식의 계산을 수행하시오.", level: "A", reason: "복소수의 성질 증명과 원리 이해를 바탕으로한 계산 능력을 평가합니다." },
                    { q: "$(1+2i)(3-i)$를 계산하여 $a+bi$ 꼴로 나타내시오.", level: "C", reason: "복소수의 곱셈과 사칙연산의 기본 규칙을 적용하는 문항입니다." }
                ]
            },
            { 
                code: "[10공수1-02-02]", 
                desc: "이차방정식의 실근과 허근의 뜻을 이해하고, 판별식을 이용하여 이차방정식의 근을 판별할 수 있다.", 
                levels: { 
                    high: "이차방정식의 실근과 허근의 의미를 설명하고, 판별식을 이용하여 근을 판별할 수 있다.", 
                    b: "이차방정식의 실근과 허근의 뜻을 알고, 판별식을 사용하여 근을 정확하게 판별할 수 있다.",
                    mid: "이차방정식의 실근과 허근을 알고, 판별식을 이용하여 근을 판별할 수 있다.", 
                    d: "이차방정식의 판별식을 알고, 간단한 이차방정식의 근을 판별할 수 있다.",
                    low: "안내된 절차에 따라 이차방정식의 판별식의 값을 구할 수 있다." 
                },
                questions: [
                    { q: "이차방정식 $x^2 + 2kx + k^2 - k + 3 = 0$이 서로 다른 두 허근을 갖도록 하는 실수 $k$의 값의 범위를 구하시오.", level: "C", reason: "판별식 $D/4 < 0$ 조건을 이용하여 미지수의 범위를 구하는 표준적인 문제입니다." }
                ]
            },
            { 
                code: "[10공수1-02-03]", 
                desc: "이차방정식의 근과 계수의 관계를 설명할 수 있다.", 
                levels: { 
                    high: "이차방정식의 근과 계수의 관계를 이해하여 설명하고 이를 활용하여 다양한 문제를 해결할 수 있다.", 
                    b: "이차방정식의 근과 계수의 관계를 설명하고 이를 활용할 수 있다.",
                    mid: "이차방정식의 근과 계수의 관계를 이해한다.", 
                    d: "이차방정식의 근과 계수의 관계를 안다.",
                    low: "이차방정식의 근과 계수의 관계를 확인한다." 
                },
                questions: [
                    { q: "이차방정식 $x^2 - 3x + 5 = 0$의 두 근을 $\\alpha, \\beta$라 할 때, $\\alpha^2 + \\beta^2$의 값을 구하시오.", level: "C", reason: "근과 계수의 관계와 곱셈 공식의 변형을 결합한 전형적인 문제입니다." }
                ]
            },
            { 
                code: "[10공수1-02-04]", 
                desc: "이차방정식과 이차함수의 관계를 이해하고 설명할 수 있다.", 
                levels: { 
                    high: "이차방정식의 근과 이차함수의 그래프를 연결하고 그 관계를 이해하여 설명할 수 있다.", 
                    b: "이차방정식의 실근과 이차함수의 그래프의 x축 교점 사이의 관계를 설명할 수 있다.",
                    mid: "판별식을 이용하여 이차함수의 그래프와 x축의 교점의 개수를 구할 수 있다.", 
                    d: "주어진 이차함수의 그래프를 보고 x축과의 교점의 위치를 찾을 수 있다.",
                    low: "주어진 이차함수의 그래프를 보고 이차방정식의 실근의 개수를 구할 수 있다." 
                },
                questions: [
                    { q: "이차함수 $y = x^2 - 2x + a$의 그래프가 $x$축과 만나지 않도록 하는 실수 $a$의 값의 범위를 구하고, 이를 이차방정식의 판별식과 연결하여 설명하시오.", level: "B", reason: "함수의 그래프적 상황을 방정식의 성질로 번역하여 설명하는 능력을 평가합니다." }
                ]
            },
            {
                code: "[10공수1-03-01]",
                desc: "경우의 수를 구할 수 있고, 합의 법칙과 곱의 법칙을 이해하고 이를 활용할 수 있다.",
                levels: {
                    high: "합의 법칙과 곱의 법칙을 이해하여 상황에 맞게 선택하여 적용하고, 복합적인 경우의 수 문제를 해결할 수 있다.",
                    b: "합의 법칙과 곱의 법칙을 적절히 사용하여 일반적인 경우의 수 문제를 해결할 수 있다.",
                    mid: "합의 법칙과 곱의 법칙을 알고, 간단한 경우의 수 문제를 해결할 수 있다.",
                    d: "경우의 수의 뜻을 알고, 일일이 세어 보며 경우의 수를 구할 수 있다.",
                    low: "제시된 상황에서 경우의 수를 셀 수 있다."
                },
                questions: [
                    { q: "주사위 한 개를 두 번 던질 때, 나오는 눈의 수의 합이 $4$의 배수가 되는 경우의 수를 구하시오.", level: "C", reason: "합의 법칙을 적용하여 분류하고 계산하는 기본 문항입니다." },
                    { q: "집합 $A=\\{1, 2, 3, 4, 5, 6\\}$에서 세 원소 $a, b, c$를 뽑아 $a < b < c$를 만족하는 경우의 수를 구하는 원리를 조합의 개념과 연결하여 설명하시오.", level: "A", reason: "특정 조건을 만족하는 경우를 논리적으로 설명하고 상위 개념과 연결해야 합니다." }
                ]
            },
            {
                code: "[10공수1-03-02]",
                desc: "순열의 뜻을 알고, 순열의 수를 구할 수 있다.",
                levels: {
                    high: "순열의 뜻을 설명하고, 다양한 상황에서 순열의 수를 활용하여 문제를 해결할 수 있다.",
                    b: "순열의 뜻을 알고, 일반적인 상황에서 순열의 수를 구할 수 있다.",
                    mid: "순열의 뜻을 알고, 기본적인 순열의 수를 구할 수 있다.",
                    d: "순열의 기호 $P$를 알고, 그 값을 계산할 수 있다.",
                    low: "안내된 절차에 따라 간단한 순열의 수를 구할 수 있다."
                },
                questions: [
                    { q: "$5$명의 학생을 일렬로 세울 때, 특정한 두 학생이 이웃하게 서는 경우의 수를 구하시오.", level: "C", reason: "이웃하는 순열의 전형적인 계산 문제입니다." }
                ]
            },
            {
                code: "[10공수1-03-03]",
                desc: "조합의 뜻을 알고, 조합의 수를 구할 수 있다.",
                levels: {
                    high: "조합의 뜻을 설명하고, 순열과 조합의 차이를 이해하며 다양한 문제를 해결할 수 있다.",
                    b: "조합의 뜻을 알고, 일반적인 상황에서 조합의 수를 구할 수 있다.",
                    mid: "조합의 뜻을 알고, 기본적인 조합의 수를 구할 수 있다.",
                    d: "조합의 기호 $C$를 알고, 그 값을 계산할 수 있다.",
                    low: "안내된 절차에 따라 간단한 조합의 수를 구할 수 있다."
                },
                questions: [
                    { q: "$10$명의 회원 중에서 대표 $3$명을 뽑는 경우의 수를 구하시오.", level: "D", reason: "조합의 정의를 직접 적용하는 기초 문제입니다." }
                ]
            },
            {
                code: "[10공수1-04-01]",
                desc: "행렬의 뜻을 알고, 실생활 상황을 행렬로 표현할 수 있다.",
                levels: {
                    high: "행렬의 뜻을 설명하고, 복합적인 실생활 상황을 행렬로 표현할 수 있다.",
                    b: "행렬의 뜻을 설명하고, 다양한 실생활 상황을 행렬로 표현할 수 있다.",
                    mid: "행렬의 뜻을 이해하고, 간단한 실생활 상황을 행렬로 표현할 수 있다.",
                    d: "행렬의 뜻을 이해하고, 주어진 상황을 행렬로 나타낼 수 있다.",
                    low: "행렬의 뜻을 안다."
                },
                questions: []
            },
            {
                code: "[10공수1-04-02]",
                desc: "행렬의 연산을 수행하고, 관련된 문제를 해결할 수 있다.",
                levels: {
                    high: "행렬의 연산을 수행하고, 관련된 다양한 문제를 해결할 수 있다.",
                    b: "행렬의 연산을 정확하게 수행하고, 일반적인 문제를 해결할 수 있다.",
                    mid: "행렬의 연산을 수행하고, 관련된 간단한 문제를 해결할 수 있다.",
                    d: "기본적인 행렬의 연산을 수행하고, 기초적인 문제를 해결할 수 있다.",
                    low: "안내된 절차에 따라 행렬의 연산을 수행할 수 있다."
                },
                questions: [
                    { q: "행렬 $A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}, B = \\begin{pmatrix} 0 & 1 \\\\ -1 & 2 \\end{pmatrix}$일 때, 행렬의 덧셈 공식 $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} + \\begin{pmatrix} e & f \\\\ g & h \\end{pmatrix} = \\begin{pmatrix} a+e & b+f \\\\ c+g & d+h \\end{pmatrix}$을 참고하여 $A+B$를 구하시오.", level: "E", reason: "공식과 계산 절차를 직접 제공하여 수행을 돕고 있으므로 E수준입니다." },
                    { q: "두 행렬 $A, B$에 대하여 $2(A+X) = 3A-B$를 만족하는 행렬 $X$를 구하시오.", level: "C", reason: "행렬의 연산 성질을 이용하여 일차방정식 형태의 문제를 해결하는 기본 문항입니다." },
                    { q: "행렬의 곱셈에서 교환법칙이 성립하지 않음을 보여주는 반례를 제시하고, 실생활 문제 상황에서 이 성질이 가지는 의미를 해석하여 발표하시오.", level: "A", reason: "반례 제시와 실생활 의미 해석 등 높은 수준의 수학적 사고와 설명 능력을 요구합니다." }
                ]
            }
        ]
    },
    common2: {
        title: "공통수학2",
        subtitle: "도형의 방정식, 집합과 명제, 함수와 그래프",
        standards: [
            { 
                code: "[10공수2-01-01]", 
                desc: "선분의 내분을 이해하고, 내분점의 좌표를 계산할 수 있다.", 
                levels: { 
                    high: "선분의 내분을 설명하고, 좌표평면 위에서 내분점의 좌표를 구하는 방법을 이해하여 계산할 수 있다.", 
                    b: "선분의 내분을 설명하고, 좌표평면 위에서 내분점의 좌표를 정확하게 계산할 수 있다.",
                    mid: "선분의 내분을 알고, 좌표평면 위에서 내분점의 좌표를 계산할 수 있다.", 
                    d: "수직선 위에서 선분의 내분을 알고, 내분점의 좌표를 계산할 수 있다.",
                    low: "안내된 절차에 따라 수직선 위에서 내분점의 좌표를 계산할 수 있다." 
                },
                questions: [
                    { q: "삼각형 $ABC$의 세 꼭짓점의 좌표가 주어졌을 때, 무게중심 $G$가 중선을 $2:1$로 내분한다는 성질을 이용하여 무게중심의 좌표 공식을 유도하는 과정을 설명하시오.", level: "A", reason: "공식 유도 및 기하학적 성질의 논리적 설명이 필요합니다." },
                    { q: "두 점 $A(-1, 5), B(4, 10)$을 $3:2$로 내분하는 점 $P$의 좌표를 구하는 과정을 정확히 서술하시오.", level: "B", reason: "좌표평면에서의 정확한 계산과 과정 설명 능력을 요구합니다." },
                    { q: "두 점 $A(-1, 7), B(4, -3)$을 잇는 선분 $AB$를 $3:2$로 내분하는 점 $P$의 좌표를 구하시오.", level: "C", reason: "좌표평면 위에서 공식을 직접 적용하여 계산하는 전형적인 문제입니다." },
                    { q: "수직선 위의 두 점 $A(-2), B(8)$을 $2:3$으로 내분하는 점 $P$의 좌표를 구하시오.", level: "D", reason: "수직선에서의 기본적인 내분점 계산 수준입니다." },
                    { q: "수직선 위의 두 점 $A(2), B(8)$을 $1:2$로 내분하는 점 $P$를 구하려고 합니다. 다음 순서로 답하세요.<br>1단계: 내분 공식 $\\frac{mx_2+nx_1}{m+n}$에 대입한다.<br>2단계: 계산한다.", level: "E", reason: "제시된 단계와 공식에 따라 단순 계산을 수행하는 수준입니다." }
                ]
            },
            {
                code: "[10공수2-01-02]",
                desc: "직선의 방정식을 구할 수 있고, 두 직선의 위치 관계를 이해한다.",
                levels: {
                    high: "직선의 방정식과 두 직선의 위치 관계를 이해하여 복합적인 문제를 해결할 수 있다.",
                    b: "두 직선의 평행, 수직 조건을 활용하여 직선의 방정식을 구할 수 단할 수 있다.",
                    mid: "주어진 조건에 맞는 직선의 방정식을 구할 수 있고, 평행과 수직 조건을 안다.",
                    d: "한 점과 기울기가 주어졌을 때 직선의 방정식을 구할 수 있다.",
                    low: "직선의 방정식의 기본 형태를 안다."
                },
                questions: [
                    { q: "점 $(1, 2)$를 지나고 직선 $y = 2x+3$에 수직인 직선의 방정식을 구하시오.", level: "C", reason: "수직 조건을 이용하여 직선의 방정식을 구하는 기본적인 문항입니다." },
                    { q: "세 직선 $x+y=0, x-y=0, ax+y-2=0$이 삼각형을 이루지 않도록 하는 모든 실수 $a$의 값을 구하고 그 이유를 설명하시오.", level: "A", reason: "세 직선의 위치 관계에 따른 삼각형 형성 조건을 분석해야 하므로 상 수준입니다." }
                ]
            },
            { 
                code: "[10공수2-01-03]", 
                desc: "원의 방정식을 구할 수 있고, 원과 직선의 위치 관계를 이해한다.", 
                levels: { 
                    high: "원의 방정식과 원과 직선의 위치 관계를 이해하여 복합적인 문제를 해결할 수 있다.", 
                    b: "원과 직선의 위치 관계를 판별하고, 관련된 응용 문제를 해결할 수 있다.",
                    mid: "원의 방정식을 구할 수 있고, 원과 직선의 위치 관계를 판별할 수 있다.", 
                    d: "원의 방정식의 기본 형태를 알고, 중심과 반지름을 찾을 수 있다.",
                    low: "원의 정의를 알고, 가장 기본적인 원의 방정식을 인식한다." 
                },
                questions: [
                    { q: "점 $(3, 4)$에서 원 $x^2 + y^2 = 5$에 그은 두 접선의 방정식을 구하고, 두 접선이 이루는 각의 크기를 구하시오.", level: "A", reason: "외부의 점에서의 접선 및 기하적 성질을 복합적으로 활용해야 합니다." },
                    { q: "원 $x^2 + y^2 = 9$와 직선 $y = x + k$가 서로 다른 두 점에서 만나도록 하는 실수 $k$의 값의 범위를 구하시오.", level: "B", reason: "원과 직선의 위치 관계를 판별식을 통해 능숙하게 해결해야 합니다." },
                    { q: "중심이 $(1, -2)$이고 점 $(4, 2)$를 지나는 원의 방정식을 구하시오.", level: "C", reason: "원의 정의와 기본 방정식을 구성하는 전형적인 문항입니다." },
                    { q: "원 $(x-3)^2 + (y+1)^2 = 16$의 중심의 좌표와 반지름의 길이를 구하시오.", level: "D", reason: "표준형 방정식에서 기본 정보를 읽어내는 수준입니다." },
                    { q: "중심이 원점이고 반지름의 길이가 $2$인 원의 방정식을 고르시오.", level: "E", reason: "가장 단순한 원의 방정식 형태를 확인하는 수준입니다." }
                ]
            },
            {
                code: "[10공수2-01-04]",
                desc: "평행이동과 대칭이동을 이해하고, 이를 활용하여 문제를 해결할 수 있다.",
                levels: {
                    high: "평행이동과 대칭이동의 원리를 설명할 수 있으며, 복합적인 이동이 적용된 문제를 해결할 수 있다.",
                    b: "도형의 평행이동과 대칭이동을 정확하게 수행하고 문제를 해결할 수 있다.",
                    mid: "점과 도형의 평행이동, 대칭이동의 기본 원리를 알고 이를 적용할 수 있다.",
                    d: "점의 평행이동과 축에 대한 대칭이동을 수행할 수 있다.",
                    low: "평행이동과 대칭이동의 뜻을 안다."
                },
                questions: [
                    { q: "직선 $y = 2x+1$을 $x$축에 대하여 대칭이동한 후, $x$축 방향으로 $3$만큼 평행이동한 직선의 방정식을 구하시오.", level: "C", reason: "연속적인 이동을 적용하는 표준적인 문제입니다." }
                ]
            },
            { 
                code: "[10공수2-02-01]", 
                desc: "집합의 개념을 이해하고, 집합을 표현할 수 있다.", 
                levels: { 
                    high: "집합의 개념을 설명하고, 집합을 다양한 방법으로 표현할 수 있다.", 
                    b: "집합의 개념을 설명하고, 원소나열법과 조건제시법으로 집합을 표현할 수 있다.",
                    mid: "집합의 개념을 알고, 집합을 표현할 수 있다.", 
                    d: "집합의 뜻을 이해하고, 간단한 집합을 표현할 수 있다.",
                    low: "집합인 것과 집합이 아닌 것으로 구분하고, 집합을 표현할 수 있다." 
                },
                questions: [
                    { q: "다음 중 집합인 것을 모두 고르시오.<br>① 우리 반에서 키가 큰 학생들의 모임<br>② $x^2-1=0$을 만족하는 실수 $x$의 모임", level: "E", reason: "객관적 기준에 의한 집합의 정의를 구분하는 기초 수준입니다." }
                ]
            },
            {
                code: "[10공수2-02-02]",
                desc: "두 집합 사이의 포함관계를 판단할 수 있다.",
                levels: {
                    high: "두 집합 사이의 포함관계를 판단하여 기호로 표현하고, 그 이유를 설명할 수 있다.",
                    b: "두 집합 사이의 포함관계를 정확하게 판단하여 기호로 표현할 수 있다.",
                    mid: "두 집합 사이의 포함관계를 판단하여 기호로 표현할 수 있다.",
                    d: "간단한 두 집합 사이의 포함관계를 판단할 수 있다.",
                    low: "안내된 절차에 따라 간단한 두 집합 사이의 포함관계를 판단할 수 있다."
                },
                questions: [
                    { q: "$A=\\{1, 2\\}, B=\\{1, 2, 3, 4\\}$일 때, $A \\subset B$임을 기호를 사용하여 나타내고 그 이유를 원소를 들어 설명하시오.", level: "D", reason: "부분집합의 정의를 알고 기호로 표현하는 기초 수준입니다." }
                ]
            },
            {
                code: "[10공수2-02-03]",
                desc: "집합의 연산을 수행하고, 벤 다이어그램을 사용하여 나타낼 수 있다.",
                levels: {
                    high: "집합의 연산을 체계적으로 수행하고 벤 다이어그램으로 나타낼 수 있으며, 법칙을 증명할 수 있다.",
                    b: "집합의 연산을 정확하게 수행하고 복잡한 포함 관계를 벤 다이어그램으로 나타낼 수 있다.",
                    mid: "집합의 연산을 수행하고 벤 다이어그램으로 나타낼 수 있으며, 법칙을 안다.",
                    d: "기초적인 집합의 연산을 수행하고, 벤 다이어그램으로 나타낼 수 있다.",
                    low: "집합의 연산 기호를 알고 단순한 연산을 수행한다."
                },
                questions: [
                    { q: "전체집합 $U$의 세 부분집합 $A, B, C$에 대하여 $n(A)=20, n(B)=15, n(C)=12$이고 모든 교집합 조건이 복합적으로 주어질 때, $n(A \\cup B \\cup C)$의 최댓값과 최솟값을 구하는 과정을 논리적으로 설명하시오.", level: "A", reason: "세 집합의 원소 개수 최적화 및 논리적 추론이 필요합니다." },
                    { q: "두 집합 $A, B$에 대하여 대칭차집합 $(A-B) \\cup (B-A)$를 벤 다이어그램으로 나타내고, 연산 법칙을 이용하여 이를 간소화하시오.", level: "B", reason: "복합 연산의 이해와 연산 법칙 적용 능력을 평가합니다." },
                    { q: "$A=\\{x | x \\text{는 } 12\\text{의 약수}\\}, B=\\{x | x \\text{는 } 18\\text{의 약수}\\}$ 일 때, $A \\cap B$와 $A \\cup B$를 구하시오.", level: "C", reason: "조건제시법을 해석하여 공통 원소와 합집합을 구하는 기본 문제입니다." },
                    { q: "$A=\\{1, 2, 3\\}, B=\\{2, 4, 6\\}$일 때, 합집합 $A \\cup B$의 모든 원소를 쓰시오.", level: "D", reason: "합집합의 정의를 직접 적용하는 기초적인 수준입니다." },
                    { q: "집합 $A=\\{a, b, c\\}$의 원소의 개수 $n(A)$를 구하시오.", level: "E", reason: "집합 기호의 의미와 원소의 개념을 확인하는 가장 단순한 수준입니다." }
                ]
            },
            {
                code: "[10공수2-02-04]",
                desc: "명제와 조건의 뜻을 알고, '모든', '어떤'을 포함한 명제를 이해하고 설명할 수 있다.",
                levels: {
                    high: "명제와 조건의 뜻을 설명할 수 있으며, '모든', '어떤'을 포함한 명제의 참, 거짓을 판별하고 부정과의 관계를 논리적으로 설명할 수 있다.",
                    b: "명제와 조건의 뜻을 알고, '모든', '어떤'을 포함한 명제의 참, 거짓을 정확하게 판별할 수 있다.",
                    mid: "명제와 조건의 뜻을 알고, '모든', '어떤'을 포함한 명제의 참, 거짓을 판별할 수 있다.",
                    d: "명제와 조건의 뜻을 알고, 간단한 명제의 참, 거짓을 판별할 수 있다.",
                    low: "명제의 뜻을 알고, 참인 명제의 예를 하나 들 수 있다."
                },
                questions: [
                    { q: "명제 '모든 실수 $x$에 대하여 $x^2+ax+1 > 0$이다'가 거짓이 되도록 하는 정수 $a$의 값의 범위를 구하고, '모든'이 포함된 명제의 부정과 참, 거짓의 관계를 이용하여 설명하시오.", level: "A", reason: "조건을 만족하는 미지수 범위 구하기와 부정의 원리 설명을 결합한 상 수준 문제입니다." },
                    { q: "실수 전체의 집합에서 조건 $p: 1 < x \\le 3$일 때, 부정을 말하고 이를 수직선 위에 나타내시오.", level: "C", reason: "조건의 부정과 집합적 표현을 이해하는 중 수준 문제입니다." },
                    { q: "다음 중 명제인 것을 고르고, 그 명제의 참, 거짓을 판별하시오.<br>① $x+2 = 5$<br>② $2$는 소수이다.", level: "E", reason: "명제의 정의를 알고 참, 거짓을 구분하는 가장 기본적인 수준입니다." }
                ]
            },
            {
                code: "[10공수2-02-05]",
                desc: "명제의 역과 대우를 이해하고 설명할 수 있다.",
                levels: {
                    high: "명제의 역과 대우를 설명할 수 있으며, 대우를 이용한 증명법의 원리를 이해하고 활용할 수 있다.",
                    b: "명제의 역과 대우를 정확하게 말하고, 명제와 그 대우의 참, 거짓이 일치함을 이해한다.",
                    mid: "명제의 역과 대우를 구할 수 있다.",
                    d: "명제의 역의 뜻을 알고 이를 구할 수 있다.",
                    low: "명제의 가정과 결론을 구분할 수 있다."
                },
                questions: [
                    { q: "명제 '$n^2$이 짝수이면 $n$도 짝수이다'를 대우를 이용하여 증명하시오.", level: "A", reason: "대우법을 이용한 증명 능력을 평가하는 상 수준 문항입니다." }
                ]
            },
            {
                code: "[10공수2-03-01]",
                desc: "함수의 개념을 설명하고, 그 그래프를 이해한다.",
                levels: {
                    high: "함수의 개념을 설명하고, 그 그래프를 이해하며 두 집합 사이의 대응 관계에서 함수인 것을 찾고 그 이유를 찾을 수 있다.",
                    b: "함수의 개념을 설명하고, 대응 관계에서 함수인 것을 정확하게 찾을 수 있다.",
                    mid: "함수의 개념과 그래프를 이해하며, 두 집합 사이의 대응 관계에서 함수인 것을 찾을 수 있다.",
                    d: "함수의 뜻을 이해하고, 간단한 대응 관계를 확인할 수 있다.",
                    low: "안내된 절차에 따라 간단한 두 집합 사이의 대응 관계에서 함수인 것을 찾을 수 있다."
                },
                questions: [
                    { q: "주어진 그래프 중 함수의 그래프인 것을 고르고, 그 이유를 세로선 판정법을 이용하여 설명하시오.", level: "C", reason: "함수의 정의를 그래프적 관점에서 이해하고 설명하는 중 수준 문제입니다." }
                ]
            },
            {
                code: "[10공수2-03-04]",
                desc: "유리함수 $y = \\frac{ax+b}{cx+d}$의 그래프를 그릴 수 있고, 그 그래프의 성질을 탐구하여 설명할 수 있다.",
                levels: {
                    high: "유리함수의 그래프를 그릴 수 있고, 그 그래프의 성질을 탐구하여 논리적으로 설명할 수 있다.",
                    b: "유리함수의 그래프를 정확하게 그릴 수 있고, 평행이동과의 관계를 설명할 수 있다.",
                    mid: "유리함수의 그래프를 그릴 수 있고, 그 그래프의 성질을 이해한다.",
                    d: "기본적인 유리함수의 그래프를 그릴 수 있고 점근선을 찾을 수 있다.",
                    low: "안내된 절차에 따라 유리함수의 그래프를 그릴 수 있다."
                },
                questions: [
                    { q: "유리함수 $f(x) = \\frac{2x+1}{x-1}$의 그래프가 직선 $y = mx+2$와 만나지 않도록 하는 실수 $m$의 값의 범위를 구하고 그 이유를 설명하시오.", level: "A", reason: "함수와 직선의 위치 관계를 판별식과 그래프를 통해 복합적으로 분석해야 합니다." },
                    { q: "유리함수 $y = \\frac{3x-2}{x-1}$의 점근선을 구하고, 이 그래프가 $y = \\frac{k}{x}$를 어떻게 평행이동한 것인지 설명하시오.", level: "B", reason: "표준형 변환 및 평행이동의 원리를 정확히 이해하고 설명해야 합니다." },
                    { q: "유리함수 $y = \\frac{1}{x-2} + 3$의 그래프를 그리고, 정의역과 치역을 구하시오.", level: "C", reason: "평행이동된 유리함수의 기본 성질을 파악하고 그래프를 그리는 문항입니다." },
                    { q: "유리함수 $y = \\frac{1}{x}$의 그래프를 $x$축 방향으로 $2$만큼, $y$축 방향으로 $1$만큼 평행이동한 식을 쓰시오.", level: "D", reason: "평행이동의 기본 규칙을 식에 적용하는 수준입니다." },
                    { q: "함수 $y = \\frac{1}{x}$의 그래프가 제 몇 사분면을 지나는지 고르시오.", level: "E", reason: "가장 기본적인 유리함수의 형태적 특징을 묻는 수준입니다." }
                ]
            },
            {
                code: "[10공수2-03-05]",
                desc: "무리함수 $y = \\sqrt{ax+b}+c$의 그래프를 그릴 수 있고, 그 그래프의 성질을 탐구하여 설명할 수 있다.",
                levels: {
                    high: "무리함수의 그래프를 그릴 수 있고, 그 그래프의 성질을 탐구하여 설명할 수 있다.",
                    b: "무리함수의 그래프를 정확하게 그릴 수 있고, 그 성질을 설명할 수 있다.",
                    mid: "무리함수의 그래프를 그릴 수 있고, 그 그래프의 성질을 이해한다.",
                    d: "기본적인 무리함수의 그래프를 그릴 수 있다.",
                    low: "안내된 절차에 따라 무리함수의 그래프를 그릴 수 있다."
                },
                questions: [
                    { q: "무리함수 $y = \\sqrt{x-2}+1$의 정의역과 치역을 구하고, 그래프를 그리시오.", level: "C", reason: "무리함수의 시작점과 방향을 파악하여 성질을 이해하는 기본 문항입니다." }
                ]
            }
        ]
    },
    algebra: { title: "대수", subtitle: "지수함수와 로그함수, 수열", standards: [ { code: "[12대수01-01]", desc: "거듭제곱과 거듭제곱근의 뜻을 알고, 그 성질을 이해한다.", levels: { high: "거듭제곱근의 성질을 이해하고, 이를 이용하여 복잡한 식을 계산할 수 있다.", b: "거듭제곱근의 성질을 이해하고, 이를 이용하여 다양한 식을 계산할 수 있다.", mid: "거듭제곱근의 뜻을 알고, 그 성질을 적용하여 식을 계산할 수 있다.", d: "거듭제곱근의 뜻을 알고, 간단한 거듭제곱근의 계산을 할 수 있다.", low: "안내된 절차에 따라 기초적인 거듭제곱근의 값을 구할 수 있다." }, questions: [] } ] },
    calculus1: { title: "미적분Ⅰ", subtitle: "수열의 극한, 미분법, 적분법", standards: [] },
    stats: { title: "확률과 통계", subtitle: "순열과 조합, 확률, 통계", standards: [] },
    calculus2: { title: "미적분Ⅱ", subtitle: "여러 가지 함수의 미적분", standards: [] },
    geometry: { title: "기하", subtitle: "이차곡선, 평면벡터, 공간도형과 공간좌표", standards: [] },
    "ai-math": { title: "인공지능 수학", subtitle: "데이터와 행렬, 최적화", standards: [] }
};

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

// 모달 제어 함수들
function openSettings() { 
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
        alert("키가 저장되었습니다. 이제 분석 기능을 무료로 사용할 수 있습니다!");
        closeSettings();
    }
}

// 💡 개발자에게 의견 보내기 (Firebase 연동)
async function submitFeedback() {
    const text = document.getElementById('feedback-text').value.trim();
    if(!text) { alert("의견을 입력해주세요!"); return; }
    try {
        await db.collection('developer_feedback').add({
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("소중한 의견이 성공적으로 전송되었습니다! 감사합니다.");
        document.getElementById('feedback-text').value = "";
        closeFeedback();
    } catch(e) {
        alert("전송 중 오류가 발생했습니다.");
    }
}

// 📥 관리자용 의견 확인 (Firebase 읽기)
async function openAdminFeedback() {
    document.getElementById('admin-feedback-modal').style.display = 'flex';
    const listEl = document.getElementById('admin-feedback-list');
    listEl.innerHTML = "<p style='text-align:center; padding: 2rem;'>의견을 불러오는 중입니다...</p>";
    try {
        const snapshot = await db.collection('developer_feedback').orderBy('timestamp', 'desc').get();
        if(snapshot.empty) {
            listEl.innerHTML = "<p style='text-align:center; color:#64748b;'>아직 접수된 사용자 의견이 없습니다.</p>";
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
        listEl.innerHTML = "<p style='color:red;'>의견을 불러오는데 실패했습니다.</p>";
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

async function analyzeProblem() {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert("⚙️ 설정에서 API 키를 먼저 입력해주세요!");
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
        
        const prompt = `당신은 대한민국 최고의 수학 교사입니다. 인사말 없이 반드시 다음 4가지 대괄호 태그와 콜론(:) 형식을 '토씨 하나 틀리지 말고' 사용하여 답변하세요. 마크다운 볼드체(**)를 태그 이름에 절대 사용하지 마세요.

[교과 및 단원]: 해당 문제의 교과명과 단원명을 명시하세요.

[성취기준 및 수준]: 
아래 제공된 <과목별 성취기준 목록>에서 가장 적합한 것을 골라 반드시 아래의 3줄 형식으로 작성하세요.
성취기준: [코드] 성취기준의 전체 내용
성취수준: A~E 중 택 1
판정 이유: 구체적인 판정 근거
<과목별 성취기준 목록>
${standardsInfo}
</과목별 성취기준 목록>

[핵심 개념]: 문제 해결에 필요한 핵심 공식, 정리, 또는 수학적 원리를 글머리 기호(•)를 사용하여 2~3가지로 명확하고 깊이 있게 제시하세요.

[상세 풀이]: 가독성 좋은 단계별 풀이를 작성하세요. 반드시 '1단계:', '2단계:', '3단계:' 와 같이 '숫자+단계:' 형식으로 문단을 시작하세요. 그래프 시각화가 필요한 경우 반드시 HTML5 <svg> 태그를 사용하여 코드를 작성하세요. 절대 '[상세 풀이]:' 라는 태그 이름을 변경하지 마세요.

[중요 지침]: 모든 수학 기호, 변수, 숫자, 수식은 반드시 앞뒤로 $ 기호를 감싸서 LaTeX 문법으로 작성하세요. 수식 작성 시 일반 유니코드 특수문자(예: ×, ÷, ≤, ≥, ≠)를 절대 사용하지 말고, 반드시 LaTeX 명령어(예: \\times, \\div, \\le, \\ge, \\neq)를 사용하세요. 한글 텍스트와 수식 기호($) 사이에는 띄어쓰기를 하세요.`;

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

        if (!response.ok) {
            const errData = await response.json();
            if (errData.error?.status === "RESOURCE_EXHAUSTED") {
                throw new Error("할당량 초과! 설정(⚙️) 안내에 따라 새 프로젝트 키를 입력해주세요.");
            }
            throw new Error(errData.error?.message || "API 오류");
        }

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
        console.error("분석 실패:", error);
        alert("⚠️ 분석 오류: " + error.message);
        document.getElementById('analysis-loading').style.display = 'none';
        document.getElementById('analyze-btn').style.display = 'block';
    }
}

function renderSophisticatedResult(rawText) {
    const container = document.getElementById('res-container');
    container.innerHTML = "";

    let text = rawText.replace(/\*\*/g, ''); 
    text = text.replace(/\[\s+/g, '[').replace(/\s+\]/g, ']'); 
    text = text.replace(/\[상세풀이\]:/g, '[상세 풀이]:'); 
    text = text.replace(/\[문제 풀이 제공\]:/g, '[상세 풀이]:'); 
    text = text.replace(/\[문제 풀이\]:/g, '[상세 풀이]:'); 

    const configs = [
        { key: "[교과 및 단원]:", title: "1. 교과명 및 단원명", icon: "📚", bg: "#f3f4f6", border: "#64748b" },
        { key: "[성취기준 및 수준]:", title: "2. 성취기준과 성취수준", icon: "📍", bg: "#eff6ff", border: "#3b82f6" },
        { key: "[핵심 개념]:", title: "3. 핵심 개념", icon: "💡", bg: "#fffbeb", border: "#f59e0b" },
        { key: "[상세 풀이]:", title: "4. 문제 풀이 제공", icon: "✍️", bg: "#f0fdf4", border: "#10b981" }
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

        const card = document.createElement('div');
        card.style.cssText = `background: ${conf.bg}; border: 1px solid ${conf.border}44; border-left: 6px solid ${conf.border}; padding: 1.2rem; border-radius: 12px; margin-bottom: 1.2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);`;
        
        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.8rem;">
                <span style="font-size:1.2rem;">${conf.icon}</span>
                <strong style="font-size:1.1rem; color:#1e293b;">${conf.title}</strong>
            </div>
            <div class="analysis-content" style="white-space: pre-line; color:#334155; line-height:1.8; font-size:0.95rem;">${content}</div>
        `;
        
        const contentDiv = card.querySelector('.analysis-content');
        if (contentDiv && content.includes('<svg')) {
            contentDiv.style.whiteSpace = 'normal'; 
        }
        
        container.appendChild(card);
    });
}

async function processAndSaveBackground(analysisText, apiKey) {
    try {
        const transformPrompt = "위 분석 결과를 바탕으로, 원본의 저작권을 침해하지 않게 숫자와 상황을 바꾼 '변형된 수학 문제' 1개만 생성하세요. 인사말 없이 문제 텍스트만 출력하세요.";
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: analysisText + "\n\n" + transformPrompt }] }]
            })
        });
        const result = await response.json();
        const transformedQ = result.candidates[0].content.parts[0].text;
        const stdCode = analysisText.match(/\[10공수\d-\d\d-\d\d\]/g)?.[0] || "unknown";

        let matchedSubject = currentSubject;
        for (const key in subjectData) {
            if (subjectData[key].standards && subjectData[key].standards.some(s => s.code === stdCode)) {
                matchedSubject = key;
                break;
            }
        }

        db.collection('transformed_bank').add({
            subject: matchedSubject,
            question: transformedQ.trim(),
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
    if (id === 'quiz') initLevelQuiz();

    const subjectSelector = document.querySelector('.subject-selector');
    if (id === 'problem-analysis') {
        subjectSelector.style.display = 'none';
    } else {
        subjectSelector.style.display = 'block';
    }
}

function changeSubject() {
    currentSubject = document.getElementById('math-subjects').value;
    const data = subjectData[currentSubject];
    if(!data) { alert("자료 준비 중입니다."); return; }
    document.getElementById('sub-title').innerText = data.title + ": " + data.subtitle;
    initDashboard();
    initLevelQuiz();
    initChecklist();
}

function initDashboard() {
    const container = document.getElementById('card-container');
    container.innerHTML = "";
    subjectData[currentSubject].standards.forEach(std => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${std.code}</h3><p>${std.desc}</p>`;
        card.onclick = () => openModal(std);
        container.appendChild(card);
    });
    if (window.MathJax) {
        MathJax.typesetClear();
        MathJax.typesetPromise([container]);
    }
}

function initLevelQuiz() {
    const container = document.getElementById('quiz-standard-list');
    container.innerHTML = '';
    const standardsWithQuestions = subjectData[currentSubject].standards.filter(std => std.questions && std.questions.length > 0);
    if (standardsWithQuestions.length === 0) {
        container.innerHTML = "<p style='text-align:center;'>이 과목에는 아직 문항 매칭 연습 문제가 없습니다.</p>";
    } else {
        standardsWithQuestions.forEach(std => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.style.width = '100%';
            btn.innerHTML = `<strong>${std.code}</strong><br>${std.desc}`;
            btn.onclick = () => startLevelMatching(std.code);
            container.appendChild(btn);
        });
    }
    backToStandardSelection();
    if (window.MathJax) {
        MathJax.typesetClear();
        MathJax.typesetPromise([container]);
    }
}

async function startLevelMatching(code) {
    currentStandardCode = code;
    currentLevelQ = 0;
    
    const standard = subjectData[currentSubject].standards.find(s => s.code === code);
    let combinedQuestions = [...standard.questions];

    try {
        const snapshot = await db.collection('transformed_bank')
                                 .where('standard_code', '==', code)
                                 .get();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            // ✨ [버그 수정] 정규식을 최신 양식에 맞게 완벽하게 수정하여 A~E가 유지되도록 함
            let extractedLevel = data.original_analysis?.match(/성취수준:\s*([A-E])/)?.[1] || "C"; 

            combinedQuestions.push({
                q: `<div style="background-color: #f0fdf4; padding: 10px; border-left: 4px solid #22c55e; margin-bottom: 10px; border-radius: 4px;">
                        <span style="font-size: 0.8rem; color: #166534; font-weight: bold;">💡 AI 변형 추가 문항</span>
                    </div>` + data.question,
                level: extractedLevel,
                reason: "사용자 업로드 문항을 AI가 분석하고 저작권 보호를 위해 변형한 문항입니다."
            });
        });
    } catch (error) {
        console.warn("DB에서 추가 문항을 불러오는데 실패했습니다:", error);
    }

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
    const standard = subjectData[currentSubject].standards.find(s => s.code === currentStandardCode);
    const qBox = document.getElementById('level-question-text');
    const optionsBox = document.getElementById('level-options');
    const feedbackBox = document.getElementById('level-feedback');
    const nextBtn = document.getElementById('next-q-btn');
    if (currentQuestions.length === 0) return;
    const question = currentQuestions[currentLevelQ];
    qBox.innerHTML = `<strong>[문항 ${currentLevelQ + 1}/${currentQuestions.length}]</strong><br><br>${question.q}`;
    optionsBox.innerHTML = '';
    feedbackBox.innerHTML = '';
    feedbackBox.style.display = 'none';
    nextBtn.style.display = 'none';
    const levels = ['A', 'B', 'C', 'D', 'E'];
    levels.forEach(level => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = level;
        btn.onclick = () => checkLevelAnswer(level, btn);
        optionsBox.appendChild(btn);
    });
    if (window.MathJax) {
        MathJax.typesetClear();
        MathJax.typesetPromise([qBox]);
    }
}

function checkLevelAnswer(selectedLevel, btn) {
    const standard = subjectData[currentSubject].standards.find(s => s.code === currentStandardCode);
    const question = currentQuestions[currentLevelQ];
    const correctLevel = question.level;
    const fb = document.getElementById('level-feedback');
    const nextBtn = document.getElementById('next-q-btn');
    document.querySelectorAll('#level-options .option-btn').forEach(b => {
        b.disabled = true;
        b.style.opacity = '0.6';
    });
    fb.style.display = 'block';
    if (selectedLevel === correctLevel) {
        fb.innerHTML = `🎉 <strong>정답입니다!</strong><br><br><strong>[이유]</strong> ${question.reason}`;
        fb.style.color = "#166534";
        fb.style.backgroundColor = '#dcfce7';
        btn.style.border = '3px solid #166534';
        btn.style.opacity = '1';
    } else {
        const wrongLevelExample = standard.questions.find(q => q.level === selectedLevel);
        let comparativeText = "";
        if (wrongLevelExample) {
            comparativeText = `<hr style="margin: 1rem 0; border: 0; border-top: 1px solid #fca5a5;">
                               <div style="text-align: left; font-size: 0.9rem;">
                               <strong>💡 비교해 보세요:</strong><br>
                               선택하신 <strong>'${selectedLevel}'</strong> 수준은 보통 아래와 같은 문항입니다.<br><br>
                               <div style="background: white; padding: 0.8rem; border-radius: 6px; border-left: 4px solid #f87171; margin-bottom: 0.5rem; font-size: 0.85rem;">
                                   ${wrongLevelExample.q}
                               </div>
                               <em>* 현재 제시된 문항은 '${correctLevel}' 수준의 특징(${question.reason.split('.')[0]})을 더 강하게 가지고 있습니다.</em>
                               </div>`;
        }
        fb.innerHTML = `❌ <strong>오답입니다.</strong> 이 문항은 <strong>'${correctLevel}'</strong> 수준입니다.<br><br>
                        <strong>[이유]</strong> ${question.reason}
                        ${comparativeText}`;
        fb.style.color = "#991b1b";
        fb.style.backgroundColor = '#fee2e2';
        btn.style.border = '3px solid #ef4444';
        btn.style.opacity = '1';
        document.querySelectorAll('#level-options .option-btn').forEach(b => {
            if (b.innerText === correctLevel) {
                b.style.backgroundColor = '#dcfce7';
                b.style.border = '3px solid #166534';
                b.style.opacity = '1';
            }
        });
    }
    nextBtn.style.display = 'block';
    if (window.MathJax) {
        MathJax.typesetClear();
        MathJax.typesetPromise([fb]);
    }
}

function nextLevelQuestion() {
    if (currentQuestions.length === 0) return;
    currentLevelQ = (currentLevelQ + 1) % currentQuestions.length;
    loadLevelQuestion();
}

function backToStandardSelection() {
    currentStandardCode = null;
    currentQuestions = [];
    document.getElementById('quiz-standard-selection').style.display = 'block';
    document.getElementById('quiz-level-matching').style.display = 'none';
}

function initChecklist() {
    const container = document.getElementById('checklist-container');
    container.innerHTML = "";
    const saved = JSON.parse(localStorage.getItem('check_' + currentSubject)) || {};
    subjectData[currentSubject].standards.forEach(std => {
        const div = document.createElement('div');
        div.className = 'check-item';
        div.innerHTML = `<input type="checkbox" id="c-${std.code}" ${saved[std.code]?'checked':''}>
                         <label for="c-${std.code}"><strong>${std.code}</strong> ${std.desc}</label>`;
        container.appendChild(div);
    });
    if (window.MathJax) {
        MathJax.typesetClear();
        MathJax.typesetPromise([container]);
    }
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
    const levels = std.levels;
    document.getElementById('level-high').innerText = levels.high;
    document.getElementById('level-b').innerText = levels.b || levels.high.replace("이해하여 설명할 수 있으며", "설명할 수 있고").replace("체계적으로 수행", "정확하게 수행");
    document.getElementById('level-mid').innerText = levels.mid;
    document.getElementById('level-d').innerText = levels.d || levels.mid.replace("이해하고", "알고").replace("계산을 할 수 있다", "간단한 계산을 할 수 있다");
    document.getElementById('level-low').innerText = levels.low;
    document.getElementById('level-modal').style.display = 'flex';
    if (window.MathJax) {
        MathJax.typesetClear();
        MathJax.typesetPromise([document.getElementById('level-modal')]);
    }
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
    if (!apiKey) { alert("API 키를 설정해주세요."); return; }

    const chatHistory = document.getElementById('chat-history').innerText;
    if (!chatHistory || chatHistory.trim() === "") {
        alert("먼저 AI와 대화를 통해 수정 사항이나 의견을 제시해 주세요.");
        return;
    }

    document.getElementById('analysis-result').style.display = 'none';
    document.getElementById('ai-chat-container').style.display = 'none';
    document.getElementById('analysis-loading').style.display = 'block';
    document.getElementById('loading-status').innerText = "대화 내용을 바탕으로 최적화된 결과를 도출 중입니다...";

    try {
        let standardsInfo = "";
        for (const key in subjectData) {
            if (subjectData[key].standards && subjectData[key].standards.length > 0) {
                standardsInfo += `\n--- ${subjectData[key].title} ---\n`;
                standardsInfo += subjectData[key].standards.map(s => `${s.code} ${s.desc}`).join('\n');
            }
        }

        const prompt = `당신은 대한민국 최고의 수학 교사입니다. 
        처음 분석했던 내용: ${currentChatContext}
        
        교사와 나눈 추가 대화 내역:
        ${chatHistory}
        
        위의 대화 내역을 깊이 분석하여 '최종 최적화 분석 결과'를 도출하세요. 
        [중요 지침]: 무조건 교사의 의견을 따르지 마세요. 대화 내역 중 수학적으로, 그리고 교육과정상 '타당한 피드백'만 선별하여 객관적으로 반영하세요.
        
        반드시 다음 4가지 대괄호 태그 형식을 유지하여 답변하세요. 마크다운 볼드체(**)를 태그 이름에 절대 사용하지 마세요.
        [교과 및 단원]: 해당 문제의 교과명과 단원명
        [성취기준 및 수준]: 
        성취기준: [코드] 내용
        성취수준: A~E 중 택 1
        판정 이유: 최종적으로 확정된 판정 이유
        [핵심 개념]: 문제 해결에 필요한 핵심 공식, 정리, 또는 수학적 원리를 글머리 기호(•)를 사용하여 2~3가지로 명확하고 깊이 있게 제시하세요.
        [상세 풀이]: 가독성 좋은 단계별 풀이를 작성하세요. 반드시 '1단계:', '2단계:' 처럼 시작하세요. 그래프(SVG) 필요시 추가. 절대 '[상세 풀이]:' 라는 태그 이름을 변경하지 마세요.

        [중요 지침]: 모든 수학 기호, 변수, 숫자, 수식은 반드시 앞뒤로 $ 기호를 감싸서 LaTeX 문법으로 작성하세요. 수식 작성 시 유니코드 기호(≤, ≥, ≠ 등)는 절대 쓰지 말고 반드시 LaTeX 명령어(\\le, \\ge, \\neq)를 사용하세요. 한글과 수식($) 사이는 띄어쓰기를 하세요.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1, topP: 0.9, maxOutputTokens: 3072 }
            })
        });

        const result = await response.json();
        const optimizedText = result.candidates[0].content.parts[0].text;

        renderSophisticatedResult(optimizedText);
        currentChatContext = optimizedText; 
        
        document.getElementById('analysis-loading').style.display = 'none';
        document.getElementById('analysis-result').style.display = 'block';
        document.getElementById('ai-chat-container').style.display = 'block';
        
        if (window.MathJax) {
            MathJax.typesetClear();
            MathJax.typesetPromise([document.getElementById('analysis-result')]).catch(err => console.log(err));
        }

    } catch (error) {
        alert("재분석 중 오류가 발생했습니다: " + error.message);
        document.getElementById('analysis-loading').style.display = 'none';
        document.getElementById('analysis-result').style.display = 'block';
    }
}

async function sendChatMessage() {
    const inputEl = document.getElementById('chat-input');
    const message = inputEl.value.trim();
    if(!message) return;
    
    const historyEl = document.getElementById('chat-history');
    historyEl.innerHTML += `<div style="text-align: right; margin-bottom: 12px;"><span style="background: #e0e7ff; color: #1e40af; padding: 10px 14px; border-radius: 16px 16px 0 16px; display: inline-block; text-align: left; max-width: 80%;">${message}</span></div>`;
    inputEl.value = '';
    historyEl.scrollTop = historyEl.scrollHeight;

    const apiKey = localStorage.getItem('gemini_api_key');
    
    try {
        db.collection('analysis_feedback').add({
            original_analysis: currentChatContext,
            user_message: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(e => console.warn("피드백 DB 저장 실패:", e));

        const prompt = `당신은 수학 교사의 훌륭한 동료이자 수학 교육 전문가입니다. 앞서 당신은 수학 문제를 다음과 같이 분석했습니다:\n\n${currentChatContext}\n\n이에 대해 교사가 다음과 같은 의견/질문을 보냈습니다: "${message}"\n\n[중요 지침]: 답변은 가독성을 위해 적절한 단락 나누기, 글머리 기호(•), 굵은 글씨(**텍스트**)를 적극적으로 활용하여 시각적으로 깔끔하게 구성하세요. 교사의 의견이라고 해서 무조건 수용하지 마세요. 당신의 최초 분석이나 풀이가 수학적으로, 그리고 2022 개정 교육과정상 타당하다면 그 전문적인 근거를 정중히 설명하며 당신의 논리를 방어하세요. 반면, 교사의 지적이 수학적으로 더 엄밀하거나 타당하다면 실수를 인정하고 적극적으로 수정안을 논의하세요. 수식은 $ 기호를 사용한 LaTeX 문법으로 작성하세요. 부등호를 쓸 때는 반드시 \\lt, \\gt 로 쓰세요 (예: $x \\gt 0$).`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        const result = await response.json();
        const aiReply = result.candidates[0].content.parts[0].text;
        
        const formattedReply = aiReply
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1e293b;">$1</strong>')
            .replace(/\n/g, '<br>');

        historyEl.innerHTML += `<div style="text-align: left; margin-bottom: 12px; line-height: 1.7;"><span style="background: white; border: 1px solid var(--border); padding: 12px 16px; border-radius: 16px 16px 16px 0; display: inline-block; max-width: 85%; font-size: 0.95rem;">${formattedReply}</span></div>`;
        
        if (window.MathJax) {
            MathJax.typesetClear();
            MathJax.typesetPromise([historyEl]).catch(err => console.log(err));
        }
        historyEl.scrollTop = historyEl.scrollHeight;

    } catch(e) {
        historyEl.innerHTML += `<div style="color: red; font-size: 0.8rem; margin-bottom:10px;">⚠️ API 통신 중 오류가 발생했습니다.</div>`;
    }
}

window.onload = changeSubject;