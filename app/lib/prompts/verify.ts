export const VERIFY_PROMPT = `당신은 정부지원사업 사후보고서 초안의 품질 검증자입니다.
주어진 사후보고서 초안(draft.templateSections)을 사실 출처(FactSheet) 및 양식 메타데이터(TemplateMeta)와 대조하여
3가지 문제 유형을 식별합니다.

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
   - 일반 서술(목적·배경 본문, 수행 절차 설명 등)은 FactSheet의 background·workAreas 필드에
     근거가 있을 수 있으므로, 명백한 사실 항목(고유명사·수치·날짜·금액)만 보수적으로 표시합니다.
   - 환각 항목은 { sectionTitle, suspectedFact, reason } 객체로 반환합니다.

[출력 형식]
JSON 객체로만 응답합니다. JSON 외 텍스트 포함 금지.
{
  "sectionsMissing": ["누락된 섹션 title"],
  "imagesMissing": ["이미지 placeholder가 빠진 섹션 title"],
  "hallucinations": [
    { "sectionTitle": "...", "suspectedFact": "환각 의심 표현", "reason": "FactSheet/원문에 근거 없음" }
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

export const PATCH_PROMPT = `당신은 사후보고서 초안의 누락·환각 문제를 수정하는 패치 작성자입니다.
주어진 검증 결과(verification report)를 토대로 문제가 있는 섹션의 content를 새로 작성하여 patches 배열로 반환합니다.

[수정 원칙]
1. 사실 정보 출처: FactSheet의 값과 사전보고서 원문·산출물 파일에 명시된 내용에서만 사용합니다.
   FactSheet의 빈 문자열/빈 배열 항목은 사전보고서에 없었던 것이므로 임의 생성 금지입니다.
2. 누락 섹션(sectionsMissing): templateMeta의 type, needsImage, expectedRows를 참조하여 새로 작성합니다.
3. 이미지 누락(imagesMissing): 해당 섹션을 다시 작성하되 [이미지 첨부 필요: 구체적 설명] placeholder를
   반드시 포함합니다 (유형 E는 단계마다 표 행에 이미지+타이틀+설명 3가지 모두 포함).
4. 환각(hallucinations): suspectedFact를 제거하거나 FactSheet에 근거 있는 표현으로 교체합니다.
   교체 가능한 사실이 없으면 해당 표현을 제거하고 일반 서술로 대체합니다.
5. content는 한 줄 HTML 문자열입니다. 큰따옴표는 \\\"로 이스케이프합니다.
6. 표지·기본정보표는 항상 첫 번째 섹션 위치를 유지합니다.

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
}): string {
  const {
    verificationJson,
    draftSectionsJson,
    factSheetJson,
    templateMetaJson,
    workFilesText,
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

위 자료를 토대로 검증에서 식별된 문제를 모두 해결한 patches 배열을 JSON으로 반환하십시오.`
}
