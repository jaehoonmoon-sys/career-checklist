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
export type Day1Data = {
  work: string           // 일/알바/직장 경험
  school: string         // 학교/학습 경험
  personal: string       // 개인 활동
  camp_projects: string  // 캠프에서 내가 한 것들
  energy_flow: string    // 몰입했던 순간
  good_at: string        // 잘한다고 느꼈던 순간
  dislike: string        // 하기 싫었던 것 + 이유
  today_discovery: string // 오늘의 발견
}

export const EMPTY_DAY1: Day1Data = {
  work: '', school: '', personal: '', camp_projects: '',
  energy_flow: '', good_at: '', dislike: '', today_discovery: '',
}

// ── DAY 2+3 | 나는 어떤 마케터인가 + 취업 방향 잡기 ─────────────────
export type Day23Data = {
  curriculum_notes: string  // 커리큘럼 중 흥미로웠던 것 (서술형)
  work_style: string        // 나의 업무 스타일
  strengths: string         // 강점 3가지 초안
  marketer_sentence: string // 나는 ___한 마케터가 되고 싶다
  target_job_1: string      // 1순위 직무 + 이유
  target_job_2: string      // 2순위 직무 + 이유
  industries: string        // 관심 산업 Top 3
  work_environment: string  // 대행사 vs 인하우스 + 선호 규모
  target_jd_url: string     // 목표 JD 링크
  target_jd_note: string    // JD 메모
  compass_draft: string     // 취업 나침반 초안
}

export const EMPTY_DAY23: Day23Data = {
  curriculum_notes: '', work_style: '', strengths: '', marketer_sentence: '',
  target_job_1: '', target_job_2: '', industries: '', work_environment: '',
  target_jd_url: '', target_jd_note: '', compass_draft: '',
}

// ── DAY 5 | 정리 + 세션 준비 ──────────────────────────────────────
export type Day5Data = {
  compass_who: string   // 나는 어떤 사람인가
  compass_where: string // 나는 어디로 가는가
  compass_why: string   // 나는 왜 이 방향인가
  pre_checklist: Record<string, boolean> // 세션 전 체크리스트 5개
  future_efforts: string // 앞으로 어떤 노력을 할 건가
}

export const EMPTY_DAY5: Day5Data = {
  compass_who: '', compass_where: '', compass_why: '',
  pre_checklist: {},
  future_efforts: '',
}
