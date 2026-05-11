export const VERIFY_PROMPT = `당신은 정부지원사업 사후보고서 초안의 품질 검증자입니다.
주어진 사후보고서 초안(draft.templateSections)을 사실 출처(FactSheet) 및 양식 메타데이터(TemplateMeta)와 대조하여
4가지 문제 유형을 식별합니다.

[검증 항목]
A. 섹션 누락 (sectionsMissing)
   - templateMeta의 모든 title이 draft.templateSections에 존재하는가?
   - 누락된 title을 배열로 반환합니다.

B. 이미지 placeholder 누락 (imagesMissing)
   - templateMeta에서 needsImage===true인 모든 title에 대해, 해당 draft.templateSections.content에
     "[이미지 첨부 필요" 문자열이 실제로 포함되어 있는가?
   - 포함되지 않은 title을 배열로 반환합니다.

C. 환각 의심 (hallucinations)
   - draft에 등장하는 사실 정보(기업명·대표자명·사업자번호·주소·연락처·기간·금액·바우처번호·결과물명·일정 단계명 등)가
     FactSheet의 어떤 값에 대응하는지 확인합니다.
   - FactSheet에 없는 사실 진술이 있으면 환각으로 표시합니다.
   - 아래 항목은 환각으로 표시하지 않습니다:
     · 수행방법·수행과정·수행결과 섹션의 작업 단계 구성 (기획→시안→수정→납품 등 업무 흐름)
     · 사용 툴명 (Adobe Illustrator·Photoshop·Figma·Notion 등 디자인·개발 도구)
     · 작업 방식 설명 (레퍼런스 수집, 컨셉 제안, 피드백 반영 등 일반적 작업 절차)
     → 위 항목은 산출물 유형에 맞는 전문 지식으로 추론된 방법론이며, FactSheet에 없어도 정상입니다.
   - 환각으로 표시해야 하는 항목: 구체적 날짜·기간·금액·수량·페이지 수가 FactSheet 값과 다르거나
     FactSheet에 전혀 없는 값으로 서술된 경우.
   - 환각 항목은 { sectionTitle, suspectedFact, reason } 객체로 반환합니다.

D. 내용 품질 문제 (contentIssues)
   - 유형 B(목적·배경)·C(수행내용)·F(기타 서술) 섹션에 대해 아래 기준으로 품질을 검사합니다.
   - 문제 기준:
     · 어느 프로젝트에나 쓸 수 있는 일반 문구("사용자 만족도 향상", "시장 경쟁력 강화", "효율 개선" 등)만으로
       구성되어 있고, 이 프로젝트에 특화된 사실(기업명·납품물명·수행분야명·수치)이 전혀 없는 경우
     · FactSheet.background(clientStatus·problem·necessity)나 workAreas의 원문 내용이
       해당 섹션에 전혀 반영되지 않은 경우
   - 품질 문제가 있는 섹션만 contentIssues에 포함합니다. 구체적인 수정 제안도 함께 작성합니다.
   - contentIssues 항목은 { sectionTitle, issue, suggestion } 객체로 반환합니다.

[출력 형식]
JSON 객체로만 응답합니다. JSON 외 텍스트 포함 금지.
{
  "sectionsMissing": ["누락된 섹션 title"],
  "imagesMissing": ["이미지 placeholder가 빠진 섹션 title"],
  "hallucinations": [
    { "sectionTitle": "...", "suspectedFact": "환각 의심 표현", "reason": "FactSheet/원문에 근거 없음" }
  ],
  "contentIssues": [
    { "sectionTitle": "...", "issue": "일반 문구만으로 구성됨, 프로젝트 고유 사실 없음", "suggestion": "FactSheet.background.problem의 구체적 내용을 포함하여 재작성" }
  ]
}

문제가 없으면 모든 배열을 빈 배열([])로 반환합니다.`

export function buildVerifyUserPrompt(params: {
  draftSectionsJson: string
  factSheetJson: string
  templateMetaJson: string
  workFilesText: string
}): string {
  const { draftSectionsJson, factSheetJson, templateMetaJson, workFilesText } = params
  return `[검증 대상 — draft.templateSections]
${draftSectionsJson}

[사실 출처 — FactSheet]
${factSheetJson}

[양식 메타데이터 — TemplateMeta]
${templateMetaJson}

[참고 — 산출물 파일 (PPTX 텍스트)]
${workFilesText}

위 자료를 비교하여 시스템 지시에 따라 검증 결과를 JSON으로 반환하십시오.`
}

export const PATCH_PROMPT = `당신은 사후보고서 초안의 누락·환각·품질 문제를 수정하는 패치 작성자입니다.
주어진 검증 결과(verification report)를 토대로 문제가 있는 섹션의 content를 새로 작성하여 patches 배열로 반환합니다.

[수정 원칙]
1. 사실 정보 출처와 방법론 추론 구분:
   [사실 정보 — 생성 금지] 기업명·대표자명·날짜·금액·수량·페이지 수 등 고유 수치는
   FactSheet 또는 산출물 파일에 있는 값만 사용합니다. FactSheet의 빈 항목은 임의로 채우지 않습니다.
   [방법론 — 추론 허용] 수행방법·수행과정 섹션의 작업 단계 구성·사용 툴·작업 방식 설명은
   워크플로우 참고자료(별도 제공)를 근거로 추론하여 작성할 수 있습니다.
   단 이 경우에도 기간·수량 등 수치는 FactSheet에 값이 있을 때만 포함하고, 없으면 생략합니다.
2. 누락 섹션(sectionsMissing): templateMeta의 type, needsImage, expectedRows를 참조하여 새로 작성합니다.
3. 이미지 누락(imagesMissing): 해당 섹션을 다시 작성하되 [이미지 첨부 필요: 구체적 설명] placeholder를
   반드시 포함합니다 (유형 E는 단계마다 표 행에 이미지+타이틀+설명 3가지 모두 포함).
4. 환각(hallucinations): suspectedFact를 제거하거나 FactSheet에 근거 있는 표현으로 교체합니다.
   교체 가능한 사실이 없으면 해당 표현을 제거하고 일반 서술로 대체합니다.
5. 내용 품질(contentIssues): suggestion을 참고하여 해당 섹션을 재작성합니다.
   - FactSheet.background(clientStatus·problem·necessity)와 workAreas의 원문 내용을 적극 활용합니다.
   - 기업명·납품물명·수행분야명 등 이 프로젝트에 특화된 사실을 문장 안에 포함합니다.
   - 일반 문구만으로 구성된 문단은 구체적 내용으로 교체합니다.
6. content는 한 줄 HTML 문자열입니다. 큰따옴표는 \\\"로 이스케이프합니다.
7. 표지·기본정보표는 항상 첫 번째 섹션 위치를 유지합니다.

[출력 형식]
JSON 객체로만 응답합니다. JSON 외 텍스트 포함 금지.
{
  "patches": [
    { "title": "수정 대상 섹션 title", "content": "<완성된 한 줄 HTML 문자열>" }
  ]
}

수정이 필요한 섹션이 없으면 patches는 빈 배열([])입니다.`

export function buildPatchUserPrompt(params: {
  verificationJson: string
  draftSectionsJson: string
  factSheetJson: string
  templateMetaJson: string
  workFilesText: string
  workflowReference?: string
}): string {
  const {
    verificationJson,
    draftSectionsJson,
    factSheetJson,
    templateMetaJson,
    workFilesText,
    workflowReference,
  } = params
  return `[검증 결과]
${verificationJson}

[현재 draft.templateSections]
${draftSectionsJson}

[FactSheet]
${factSheetJson}

[TemplateMeta]
${templateMetaJson}

[산출물 파일 (PPTX 텍스트)]
${workFilesText}
${workflowReference ? `
[디자인 업무 워크플로우 참고자료 — 수행방법·수행과정 섹션 수정 시 활용]
작업 단계·사용 툴·작업 방식은 아래를 근거로 추론하여 작성 가능합니다.
날짜·금액·수량 등 수치는 FactSheet에 있는 값만 사용합니다.
${workflowReference}` : ''}
위 자료를 토대로 검증에서 식별된 문제를 모두 해결한 patches 배열을 JSON으로 반환하십시오.`
}
