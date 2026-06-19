// 폼 설정 타입 & 기본값 정의
// 관리자가 수정한 값은 cc_form_config 테이블에 저장되고, 없으면 이 기본값을 사용합니다.

// ── DAY1 전용 타입 (섹션/필드 배열) ─────────────────────────────

export type FieldType = 'textarea' | 'input' | 'subtitle'

export type FieldDef = {
  id: string
  type?: FieldType       // default 'textarea'
  label: string
  desc?: string
  example?: string
  callout?: string
  placeholder?: string
  fixed: boolean         // true = 삭제 불가 (기본 필드)
}

export type SectionDef = {
  id: string
  title: string
  time?: string
  fields: FieldDef[]
  fixed: boolean         // true = 삭제 불가 (기본 섹션)
}

// ── DAY2+3 전용 타입 (기존 FieldCfg 유지) ────────────────────────

export type FieldCfg = {
  label: string
  desc?: string
  example?: string
  hint?: string
  placeholder?: string
  callout?: string
}

// ── 전체 폼 설정 타입 ────────────────────────────────────────────

export type FormConfig = {
  day1: {
    intro_callout: string
    sections: SectionDef[]
  }
  day23: {
    // 섹션/카드 제목 (편집 가능)
    day2_title: string
    day3_title: string
    card_curriculum: string
    card_workstyle: string
    card_strengths: string
    card_target_job: string
    card_industries: string
    card_work_env: string
    card_target_jd: string
    card_compass: string
    // 테이블 데이터
    curriculum_areas: string[]
    work_style_items: { a: string; b: string }[]
    work_env_type_items: { label: string; desc: string }[]
    work_env_size_items: { label: string; desc: string }[]
    // 필드 설정
    strengths: FieldCfg
    marketer_sentence: FieldCfg
    target_job_1: FieldCfg
    target_job_2: FieldCfg
    industries: FieldCfg
    industry_connection: FieldCfg
    target_jd_url: FieldCfg
    target_jd_note: FieldCfg
    compass_draft: FieldCfg
  }
}

// ── 기본값 ────────────────────────────────────────────────────────

const DEFAULT_DAY1_SECTIONS: SectionDef[] = [
  {
    id: 'part1',
    title: '파트 1 | 캠프 전 나의 경험',
    time: '20분',
    fixed: true,
    fields: [
      {
        id: 'work', fixed: true,
        label: '1-1. 일 / 알바 / 직장 경험',
        desc: '어떤 일을 했나요? 마케팅과 관련 없어도 됩니다.',
        example: '카페 알바 → 고객 응대, 단골 파악 / 올리브영 → 제품 추천, 진열 / 콜센터 → 고객 불만 해결 / 식당 알바 → 주문 패턴 관찰, 메뉴 추천',
      },
      {
        id: 'school', fixed: true,
        label: '1-2. 학교 / 학습 경험',
        desc: '전공, 수업, 동아리, 학생회, 팀 프로젝트 등',
        example: '학보사 → 기사 작성, 인터뷰 / 축제 기획단 → 홍보물 제작, SNS 운영 / 경영 수업 → 마케팅 케이스 분석 / 조별 과제 → 기획, 발표 자료 제작',
      },
      {
        id: 'personal', fixed: true,
        label: '1-3. 개인 활동',
        desc: 'SNS, 블로그, 유튜브, 커뮤니티, 취미, 여행 등 뭐든',
        example: '인스타그램 운영 → 콘텐츠 기획, 해시태그 전략 / 독서 블로그 → 꾸준한 글쓰기 / 좋아하는 브랜드 덕질 → 브랜드 분석 / 여행 → 현지 마케팅 관찰',
      },
    ],
  },
  {
    id: 'part2',
    title: '파트 2 | 캠프에서 내가 한 것들',
    time: '15분',
    fixed: true,
    fields: [
      { id: 'camp_basic_header', type: 'subtitle', label: '🏕️ 기초 프로젝트 (AI 광고 콘텐츠)', fixed: true },
      { id: 'camp_basic_role',   fixed: true, label: '2-1. 내가 맡은 역할', desc: '팀에서 어떤 역할을 담당했나요?' },
      { id: 'camp_basic_made',   fixed: true, label: '2-2. 실제로 만든 것',  desc: '결과물로 무엇을 만들었나요?' },
      { id: 'camp_basic_memory', fixed: true, label: '2-3. 기억에 남는 것',  desc: '이 프로젝트에서 가장 기억에 남는 순간이나 배운 점' },
      { id: 'camp_adv_header',   type: 'subtitle', label: '🏕️ 심화 프로젝트 (광고 콘텐츠 제작)', fixed: true },
      { id: 'camp_adv_role',     fixed: true, label: '2-4. 내가 맡은 역할', desc: '팀에서 어떤 역할을 담당했나요?' },
      { id: 'camp_adv_made',     fixed: true, label: '2-5. 실제로 만든 것',  desc: '결과물로 무엇을 만들었나요?' },
      { id: 'camp_adv_memory',   fixed: true, label: '2-6. 기억에 남는 것',  desc: '이 프로젝트에서 가장 기억에 남는 순간이나 배운 점' },
    ],
  },
  {
    id: 'part3',
    title: '파트 3 | 에너지 체크',
    time: '15분',
    fixed: true,
    fields: [
      { id: 'energy_flow', fixed: true, label: '몰입했던 순간',        desc: '언제 시간 가는 줄 몰랐나요? (캠프 안팎 모두)' },
      { id: 'good_at',     fixed: true, label: '잘한다고 느꼈던 순간', desc: '칭찬받았거나, 스스로 뿌듯했던 경험' },
      {
        id: 'dislike', fixed: true,
        label: '하기 싫었던 것',
        desc: '어떤 작업이 유독 힘들거나 피하고 싶었나요?',
        callout: '→ 왜 그랬을 것 같나요? "싫다"는 감정의 이유를 쓰는 게 핵심입니다.\n"적성에 안 맞아서"보다 "숫자를 다루는 게 막막해서", "혼자 오래 앉아있는 게 힘들어서"처럼 구체적으로.',
      },
    ],
  },
  {
    id: 'discovery',
    title: '✅ 오늘의 발견',
    time: '5분',
    fixed: true,
    fields: [
      {
        id: 'today_discovery', fixed: true,
        label: '오늘의 발견',
        placeholder: '오늘 적으면서 새롭게 발견한 나의 경험:\n\n「경험이라고 생각 못 했는데, 쓸 수 있겠다」 싶은 것:',
      },
    ],
  },
]

export const DEFAULT_FORM_CONFIG: FormConfig = {
  day1: {
    intro_callout:
      '여기서부터가 진짜 취업 준비예요.\n\n방금 한 체크리스트는 가볍게 재미로 해보는 직무 탐색이었어요. 진짜 취업 준비는 나의 경험을 꺼내고 정리하는 것에서 시작합니다.\n\n"마케팅 경험이 없는데..."라고 생각할 수 있지만, 마케팅은 생활에 녹아있습니다. 올리브영 알바에서 고객에게 제품을 추천했다면 → 세일즈와 고객 이해입니다. 인스타에 올린 사진 한 장도, 친구에게 맛집 추천도 → 모두 커뮤니케이션입니다.\n\n일단 다 꺼내놓는 게 오늘의 목표입니다. 선별은 나중에 합니다.',
    sections: DEFAULT_DAY1_SECTIONS,
  },
  day23: {
    day2_title: 'DAY 2 | 나는 어떤 마케터인가',
    day3_title: 'DAY 3 | 나의 취업 방향 잡기',
    card_curriculum: '파트 1 | 커리큘럼 체크',
    card_workstyle:  '파트 2 | 업무 스타일 체크',
    card_strengths:  '파트 3 | 강점 & 한 문장 정리',
    card_target_job: '파트 1 | 목표 직무 방향',
    card_industries: '파트 2 | 관심 산업',
    card_work_env:   '파트 3 | 일하고 싶은 환경',
    card_target_jd:  '파트 4 | 목표 JD',
    card_compass:    '파트 5 | 취업 나침반 초안',
    curriculum_areas: [
      '광고 기획 (콘셉트, 타겟 설정)',
      'AI 활용 콘텐츠 제작',
      '비주얼 전략 (디자인, 숏폼)',
      '퍼포먼스 마케팅 (광고 집행, 수치 분석)',
      '데이터 분석 & 성과 해석',
      '그로스 마케팅 (퍼널, 실험 설계)',
      '글쓰기 / 카피라이팅',
      '캠페인 기획 및 설계',
    ],
    work_style_items: [
      { a: '숫자·분석', b: '기획·크리에이티브' },
      { a: '빠른 실행', b: '깊이 있는 사고' },
      { a: '혼자 집중', b: '협업·소통' },
      { a: '즉각 성과', b: '장기 전략' },
    ],
    work_env_type_items: [
      { label: '대행사',   desc: '다양한 클라이언트·업종 경험, 빠른 실무 학습, 역할 다양' },
      { label: '인하우스', desc: '한 브랜드를 깊이, 오너십 높음, 성과가 직접 보임' },
    ],
    work_env_size_items: [
      { label: '스타트업',    desc: '빠른 성장, 높은 오너십, 다양한 역할 경험 가능' },
      { label: '중소기업',    desc: '실무를 폭넓게 경험, 회사별 편차 있음' },
      { label: '중견·대기업', desc: '체계적인 프로세스, 역할 명확, 브랜드 파워' },
    ],
    strengths: {
      label: '💪 나의 강점 3가지',
      hint: '「나는 __을 잘한다, 왜냐하면 __한 경험이 있기 때문이다」 형식으로 써보세요.',
      callout: '예: 「나는 감정을 건드리는 글을 잘 쓴다, 왜냐하면 콘텐츠 프로젝트에서 내 카피를 팀원들이 가장 많이 선택했기 때문이다」',
      placeholder: '강점 1: 나는 __ 을 잘한다, 왜냐하면...\n\n강점 2: 나는 __ 을 잘한다, 왜냐하면...\n\n강점 3: 나는 __ 을 잘한다, 왜냐하면...',
    },
    marketer_sentence: {
      label: '✍️ 한 문장 완성',
      hint: '아직 완벽하지 않아도 됩니다. 지금 이 순간의 나를 써보세요.',
      placeholder: '나는 ___한 마케터가 되고 싶다. 왜냐하면 나는 ___할 때 가장 살아있다고 느끼기 때문이다.',
    },
    target_job_1: {
      label: '🥇 1순위 목표 직무 & 이유',
      hint: '퍼포먼스 / 콘텐츠 / 브랜드 / 그로스 / CRM / AE 중 하나. DAY 2 강점과 연결해서 이유를 써주세요.',
      placeholder: '직무명: ___\n이유: 나는 ___ 때문에 이 직무가 맞다고 생각합니다',
    },
    target_job_2: {
      label: '🥈 2순위 목표 직무 & 이유 (선택)',
      placeholder: '직무명 + 한 줄 이유 (없으면 비워도 됩니다)',
    },
    industries: {
      label: '🏭 관심 산업 Top 3',
      hint: 'IT/SaaS · 이커머스 · 뷰티 · 식음료 · 패션 · 교육 · 헬스케어 · 게임 · 콘텐츠 · 금융 등',
      placeholder: '1순위: (산업명) / 이유:\n2순위: (산업명) / 이유:\n3순위: (산업명) / 이유:',
    },
    industry_connection: {
      label: '🔗 DAY 1 경험과 연결하기',
      hint: '내 경험 중 관심 산업과 연결될 수 있는 것이 있나요?',
      placeholder: '예: 이커머스에 관심 있는데, DAY 1에서 썼던 __한 경험이 연결될 것 같습니다.',
    },
    target_jd_url: {
      label: '📄 목표 JD 링크',
      hint: '원티드·사람인에서 「이런 곳에서 일하고 싶다」는 느낌의 공고 하나를 찾아보세요.',
    },
    target_jd_note: {
      label: '목표 JD 메모',
      placeholder: '이 JD를 고른 이유:\n할 수 있을 것 같은 부분:\n아직 부족한 부분:',
    },
    compass_draft: {
      label: '🧭 지금까지 내용을 압축해보세요',
      hint: '아직 완벽하지 않아도 됩니다. 초안이에요.',
      placeholder: '나는 (직무) 마케터로서\n(산업 / 회사 유형)에 지원하겠다.\n나의 강점은 (강점)이고,\n그 근거가 되는 경험은 (경험)이다.',
    },
  },
}

// ── 병합 헬퍼 ──────────────────────────────────────────────────────

export function getEffectiveConfig(saved: Record<string, unknown>): FormConfig {
  const base = DEFAULT_FORM_CONFIG
  const savedDay1  = (saved.day1  as Record<string, unknown> | undefined) ?? {}
  const savedDay23 = (saved.day23 as Record<string, unknown> | undefined) ?? {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shallowMerge = (def: any, over: any): any => {
    if (!over || typeof over !== 'object' || Array.isArray(def)) {
      return Array.isArray(def) && Array.isArray(over) ? over : (over ?? def)
    }
    const result = { ...def }
    for (const key of Object.keys(def)) {
      if (key in over) result[key] = shallowMerge(def[key], over[key])
    }
    return result
  }

  return {
    day1: {
      intro_callout: (savedDay1.intro_callout as string) ?? base.day1.intro_callout,
      sections: Array.isArray(savedDay1.sections)
        ? (savedDay1.sections as SectionDef[])
        : base.day1.sections,
    },
    day23: shallowMerge(base.day23, savedDay23),
  }
}

// ── 유틸: 고정 필드 ID 목록 ────────────────────────────────────────

export const FIXED_DAY1_IDS = new Set([
  'work', 'school', 'personal',
  'camp_basic_role', 'camp_basic_made', 'camp_basic_memory',
  'camp_adv_role',   'camp_adv_made',   'camp_adv_memory',
  'energy_flow', 'good_at', 'dislike', 'today_discovery',
])
