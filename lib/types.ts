export type ExperienceData = {
  // Day 1: 나의 경험
  work: string       // 일/알바/직장
  school: string     // 학교/학습
  personal: string   // 개인 활동
  // Day 1: 에너지 체크
  energy_flow: string  // 몰입했던 순간
  good_at: string      // 잘한다고 느꼈던 순간
  dislike: string      // 하기 싫었던 것 + 이유
  // Day 2: 강점
  strengths: string    // 강점 3가지 (자유 서술)
  // Day 3: 취업 방향
  target_job_1: string      // 1순위 직무 + 이유
  target_job_2: string      // 2순위 직무 + 이유 (선택)
  industries: string        // 관심 산업 + 일하고 싶은 환경
  target_jd_url: string     // 목표 JD 링크
  target_jd_note: string    // JD 관련 메모
}

export const EMPTY_EXPERIENCE: ExperienceData = {
  work: '', school: '', personal: '',
  energy_flow: '', good_at: '', dislike: '',
  strengths: '',
  target_job_1: '', target_job_2: '',
  industries: '',
  target_jd_url: '', target_jd_note: '',
}
