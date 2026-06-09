export type JobType = 'performance' | 'content' | 'brand' | 'growth' | 'crm' | 'ae'

export const JOB_LABELS: Record<JobType, string> = {
  performance: '퍼포먼스\n마케터',
  content: '콘텐츠\n마케터',
  brand: '브랜드\n마케터',
  growth: '그로스\n마케터',
  crm: 'CRM\n마케터',
  ae: 'AE\n(대행사)',
}

export const ANSWER_OPTIONS = [
  { key: 1, label: '관심있다', desc: '배우고 싶어요' },
  { key: 2, label: '잘한다', desc: '자신 있어요' },
  { key: 3, label: '재미있다', desc: '시간 가는 줄 몰라요' },
  { key: 4, label: '경험있다', desc: '직접 해봤어요' },
] as const

export type Question = {
  id: string
  text: string
  category: string
  jobs: JobType[]
}

export const CATEGORIES = [
  { key: 'data',      label: '숫자 & 데이터',      emoji: '📊' },
  { key: 'writing',   label: '글쓰기 & 콘텐츠',    emoji: '✍️' },
  { key: 'ads',       label: '광고 & 채널',         emoji: '📢' },
  { key: 'strategy',  label: '전략 & 브랜드',       emoji: '🎯' },
  { key: 'growth',    label: '성장 & 실험',          emoji: '📈' },
  { key: 'people',    label: '고객 & 관계',          emoji: '👥' },
  { key: 'collab',    label: '협업 & 프로젝트',     emoji: '🤝' },
  { key: 'tools',     label: '툴 & 실무 감각',      emoji: '🛠️' },
]

// 직무 매핑은 수강생에게 보이지 않음
export const QUESTIONS: Question[] = [
  // 📊 숫자 & 데이터
  { id: 'c01', text: '광고 성과 지표(CTR, ROAS, CPA 등)가 무엇을 의미하는지 이해하고 싶다', category: 'data', jobs: ['performance', 'growth'] },
  { id: 'c02', text: '숫자나 표를 보면서 \'왜 이런 결과가 나왔을까?\' 분석하는 게 재미있다', category: 'data', jobs: ['performance', 'growth', 'crm'] },
  { id: 'c03', text: 'A/B 테스트처럼 두 가지를 비교해서 어떤 게 더 효과적인지 실험해보고 싶다', category: 'data', jobs: ['performance', 'growth'] },
  { id: 'c04', text: 'GA4, 네이버 애널리틱스 같은 분석 툴로 방문자 데이터를 들여다보고 싶다', category: 'data', jobs: ['growth', 'crm'] },
  { id: 'c05', text: '복잡한 내용을 표나 그래프로 깔끔하게 정리하는 편이다', category: 'data', jobs: ['crm', 'ae'] },

  // ✍️ 글쓰기 & 콘텐츠
  { id: 'c06', text: '사람의 감정을 건드리는 문장이나 카피를 쓰는 걸 잘한다', category: 'writing', jobs: ['content', 'brand', 'crm'] },
  { id: 'c07', text: '인스타그램, 블로그, 유튜브 등 SNS 콘텐츠를 기획하고 만드는 게 재미있다', category: 'writing', jobs: ['content', 'brand'] },
  { id: 'c08', text: '유행하는 밈, 트렌드를 빠르게 파악하고 콘텐츠에 녹여내는 편이다', category: 'writing', jobs: ['content', 'growth'] },
  { id: 'c09', text: '숏폼 영상(릴스, 쇼츠 등)을 직접 기획하거나 편집해본 적이 있다', category: 'writing', jobs: ['content'] },
  { id: 'c10', text: '어떤 브랜드나 제품의 좋은 점을 글로 설득력 있게 풀어쓰는 게 재미있다', category: 'writing', jobs: ['content', 'brand', 'ae'] },

  // 📢 광고 & 채널
  { id: 'c11', text: '메타(인스타·페북), 구글, 카카오 등 광고 매체를 직접 운영해보고 싶다', category: 'ads', jobs: ['performance', 'ae'] },
  { id: 'c12', text: '같은 광고비로 어떻게 하면 더 많은 사람에게 닿을 수 있을지 고민하는 게 재미있다', category: 'ads', jobs: ['performance', 'growth'] },
  { id: 'c13', text: '광고 소재(이미지, 영상, 카피)가 왜 어떤 건 잘 되고 어떤 건 안 되는지 궁금하다', category: 'ads', jobs: ['performance', 'content', 'ae'] },
  { id: 'c14', text: 'SNS 계정(인스타, 블로그, 유튜브 등)을 꾸준히 운영해본 적이 있다', category: 'ads', jobs: ['content', 'ae'] },

  // 🎯 전략 & 브랜드
  { id: 'c15', text: '브랜드가 어떤 이미지를 갖고 있는지, 왜 사람들이 그 브랜드를 좋아하는지 분석하는 게 재미있다', category: 'strategy', jobs: ['brand', 'ae'] },
  { id: 'c16', text: '어떤 제품이나 서비스가 \'누구에게\' \'어떤 메시지\'로 광고해야 할지 떠올리는 걸 잘한다', category: 'strategy', jobs: ['brand', 'ae', 'performance'] },
  { id: 'c17', text: '하나의 캠페인을 처음부터 끝까지(기획→실행→성과 측정→회고) 진행해보고 싶다', category: 'strategy', jobs: ['ae', 'growth'] },
  { id: 'c18', text: '여러 가지 아이디어 중 \'이게 더 맞다\'는 감각으로 방향을 잡는 편이다', category: 'strategy', jobs: ['brand', 'content'] },

  // 📈 성장 & 실험
  { id: 'c19', text: '사람들이 앱이나 웹사이트에서 어떤 경로로 구매까지 가는지 흐름을 파악하고 싶다', category: 'growth', jobs: ['growth', 'performance', 'crm'] },
  { id: 'c20', text: '\'왜 이 사람들은 결제를 안 하고 나갈까?\' 같은 문제를 구조적으로 파고드는 게 재미있다', category: 'growth', jobs: ['growth', 'crm'] },
  { id: 'c21', text: '한 번 구매한 고객이 다시 오게 만드는 전략(리텐션)에 관심이 있다', category: 'growth', jobs: ['growth', 'crm'] },

  // 👥 고객 & 관계
  { id: 'c22', text: '\'어떤 사람에게 어떤 말을 어떤 타이밍에 보낼까?\'를 고민하는 게 재미있다', category: 'people', jobs: ['crm', 'content'] },
  { id: 'c23', text: '고객을 특성별로 나눠서(세그먼트) 다르게 접근하는 전략을 배워보고 싶다', category: 'people', jobs: ['crm', 'growth'] },
  { id: 'c24', text: '상대방이 무엇을 필요로 하는지 파악하고 그에 맞게 대화하는 편이다', category: 'people', jobs: ['crm', 'ae'] },

  // 🤝 협업 & 프로젝트
  { id: 'c25', text: '여러 일을 동시에 관리하면서 마감을 맞추는 것을 잘한다', category: 'collab', jobs: ['ae', 'growth'] },
  { id: 'c26', text: '다양한 산업, 다양한 브랜드를 경험하면서 폭넓게 배우는 게 재미있다', category: 'collab', jobs: ['ae', 'brand'] },
  { id: 'c27', text: '기획한 내용을 발표하거나 글로 설득력 있게 전달하는 것을 잘한다', category: 'collab', jobs: ['ae', 'brand'] },
  { id: 'c28', text: '팀원들과 아이디어를 나누고 함께 결과물을 만들어 가는 과정이 즐겁다', category: 'collab', jobs: ['ae', 'content', 'growth'] },

  // 🛠️ 툴 & 실무 감각
  { id: 'c29', text: 'AI 툴(ChatGPT, 미드저니 등)을 마케팅이나 콘텐츠 제작에 활용해본 적이 있다', category: 'tools', jobs: ['content', 'growth'] },
  { id: 'c30', text: '피그마, 캔바, 포토샵 등 디자인 툴로 시각 자료를 직접 만들어본 적이 있다', category: 'tools', jobs: ['content', 'brand'] },
]

// 직무별 최대 점수 계산 (화면에 표시 안 함, 정규화용)
export function calcMaxScores(): Record<JobType, number> {
  const maxScores = { performance: 0, content: 0, brand: 0, growth: 0, crm: 0, ae: 0 }
  for (const q of QUESTIONS) {
    for (const job of q.jobs) {
      maxScores[job] += 4
    }
  }
  return maxScores
}

export function calcJobScores(answers: Record<string, number[]>): Record<JobType, number> {
  const scores = { performance: 0, content: 0, brand: 0, growth: 0, crm: 0, ae: 0 }
  for (const q of QUESTIONS) {
    const checked = answers[q.id]?.length ?? 0
    for (const job of q.jobs) {
      scores[job] += checked
    }
  }
  return scores
}
