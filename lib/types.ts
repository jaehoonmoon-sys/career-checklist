// ── 레거시 (이전 버전 데이터 하위 호환용) ───────────────────────────
export type ExperienceData = {
  work: string
  school: string
  personal: string
  energy_flow: string
  good_at: string
  dislike: string
  strengths: string
  target_job_1: string
  target_job_2: string
  industries: string
  target_jd_url: string
  target_jd_note: string
}

export const EMPTY_EXPERIENCE: ExperienceData = {
  work: '', school: '', personal: '',
  energy_flow: '', good_at: '', dislike: '',
  strengths: '',
  target_job_1: '', target_job_2: '',
  industries: '',
  target_jd_url: '', target_jd_note: '',
}

// ── DAY 1 | 나의 경험 꺼내기 ─────────────────────────────────────
export const NEXT_STEPS_ITEMS = [
  '목표 산업군이 있는지 생각해보기',
  '좋아하는 산업 분야에 대해 조사해보기',
  '내가 가진 역량 중 가장 잘하는 것이 무엇인지 생각해보기',
  'JD 3개 이상 읽어보기',
  '잘 맞을 것 같은 JD 정해보기',
  'JD에서 공통적으로 등장하는 역량이 무엇일지 생각해보기',
] as const

export type Day1Data = {
  work: string           // 일/알바/직장 경험
  school: string         // 학교/학습 경험
  personal: string       // 개인 활동
  // 캠프 프로젝트 (기초/심화 × 역할/만든것/기억)
  camp_basic_role: string
  camp_basic_made: string
  camp_basic_memory: string
  camp_adv_role: string
  camp_adv_made: string
  camp_adv_memory: string
  energy_flow: string    // 몰입했던 순간
  good_at: string        // 잘한다고 느꼈던 순간
  dislike: string        // 하기 싫었던 것 + 이유
  today_discovery: string
  next_steps: Record<string, boolean>  // 다음 단계 자기 체크
  extra_fields: Record<string, string> // 관리자가 추가한 커스텀 필드
}

export const EMPTY_DAY1: Day1Data = {
  work: '', school: '', personal: '',
  camp_basic_role: '', camp_basic_made: '', camp_basic_memory: '',
  camp_adv_role: '', camp_adv_made: '', camp_adv_memory: '',
  energy_flow: '', good_at: '', dislike: '', today_discovery: '',
  next_steps: {},
  extra_fields: {},
}

// ── DAY 2 | 커리큘럼 체크 테이블 ─────────────────────────────────
export const CURRICULUM_AREAS = [
  '광고 기획 (콘셉트, 타겟 설정)',
  'AI 활용 콘텐츠 제작',
  '비주얼 전략 (디자인, 숏폼)',
  '퍼포먼스 마케팅 (광고 집행, 수치 분석)',
  '데이터 분석 & 성과 해석',
  '그로스 마케팅 (퍼널, 실험 설계)',
  '글쓰기 / 카피라이팅',
  '캠페인 기획 및 설계',
] as const

export type CurrRow = {
  interesting: boolean   // 흥미로웠다 ✅
  good_at: boolean       // 잘했다 (or 할 수 있겠다) ✅
  boring: boolean        // 별로였다 ✅
  comment: string        // 한 줄 코멘트
}

// ── DAY 2 | 업무 스타일 테이블 ───────────────────────────────────
export const WORK_STYLE_ITEMS = [
  { a: '숫자·분석', b: '기획·크리에이티브' },
  { a: '빠른 실행', b: '깊이 있는 사고' },
  { a: '혼자 집중', b: '협업·소통' },
  { a: '즉각 성과', b: '장기 전략' },
] as const

export type WsRow = {
  score: string  // '1'~'5' or ''
  comment: string
}

// ── DAY 3 | 일하고 싶은 환경 테이블 ─────────────────────────────
export const WORK_ENV_TYPE_ITEMS = [
  { label: '대행사',   desc: '다양한 클라이언트·업종 경험, 빠른 실무 학습, 역할 다양' },
  { label: '인하우스', desc: '한 브랜드를 깊이, 오너십 높음, 성과가 직접 보임' },
] as const

export const WORK_ENV_SIZE_ITEMS = [
  { label: '스타트업',    desc: '빠른 성장, 높은 오너십, 다양한 역할 경험 가능' },
  { label: '중소기업',    desc: '실무를 폭넓게 경험, 회사별 편차 있음' },
  { label: '중견·대기업', desc: '체계적인 프로세스, 역할 명확, 브랜드 파워' },
] as const

export type WenvRow = {
  choice: string  // 'O' | 'X' | ''
  reason: string
}

// ── DAY 2+3 | 나는 어떤 마케터인가 + 취업 방향 잡기 ─────────────────
export type Day23Data = {
  // DAY 2
  curriculum: CurrRow[]       // 8개 영역 × (흥미/잘했다/별로/코멘트)
  work_style: WsRow[]         // 4개 항목 × (점수/코멘트)
  strengths: string           // 강점 초안
  marketer_sentence: string   // 한 문장 완성
  // DAY 3
  target_job_1: string        // 1순위 직무 + 이유
  target_job_2: string        // 2순위 직무 + 이유
  industries: string          // 관심 산업 Top 3
  industry_connection: string // 연결 질문 (Day 1 경험 연결)
  work_env_type: WenvRow[]    // [대행사, 인하우스]
  work_env_size: WenvRow[]    // [스타트업, 중소, 중견대기업]
  target_jd_url: string
  target_jd_note: string
  compass_draft: string       // 취업 나침반 초안
}

export const EMPTY_DAY23: Day23Data = {
  curriculum: CURRICULUM_AREAS.map(() => ({ interesting: false, good_at: false, boring: false, comment: '' })),
  work_style: WORK_STYLE_ITEMS.map(() => ({ score: '', comment: '' })),
  strengths: '',
  marketer_sentence: '',
  target_job_1: '',
  target_job_2: '',
  industries: '',
  industry_connection: '',
  work_env_type: WORK_ENV_TYPE_ITEMS.map(() => ({ choice: '', reason: '' })),
  work_env_size: WORK_ENV_SIZE_ITEMS.map(() => ({ choice: '', reason: '' })),
  target_jd_url: '',
  target_jd_note: '',
  compass_draft: '',
}

// ── DAY 5 | 정리 + 세션 준비 ──────────────────────────────────────
export type Day5Data = {
  compass_who: string
  compass_where: string
  compass_why: string
  pre_checklist: Record<string, boolean>
  future_efforts: string
}

export const EMPTY_DAY5: Day5Data = {
  compass_who: '', compass_where: '', compass_why: '',
  pre_checklist: {},
  future_efforts: '',
}
