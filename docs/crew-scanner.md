# CREW SCANNER

## 흐름 및 디자인

프레임워크와 빌드 도구 없는 정적 HTML/CSS/JavaScript 프로젝트다. 크루 선택 상태는 기존 크루별 URL 경로(pigeon/rat/cat)로 전달된다.

TAGGY 가이드 → 버튼 중심 컬러 와이프(100+550+450ms) → 로딩(1800ms) → 페이드(300ms) → 스캐너 게임. 로딩은 와이프 수축이 끝난 뒤 시작한다. Figma 프레임 155:2 / 155:2978을 참조했다. 배경 원본/어두운 레이어는 같은 PNG를 사용하고 마스크는 사진에만 적용한다.

1920×1080 중앙 캔버스에 min(viewportWidth/1920, viewportHeight/1080) 스케일을 적용한다. 마우스 viewport 좌표는 캔버스 좌표로 역변환한다. 스캐너 시각 반경은 기존 137.5 디자인 px이다. 크루별 원본 도시 사진은 assets.background를 사용한다.

## 카테고리별 다중 핫스팟

js/crew-scanner-config.js의 crews.pigeon.categories를 수정한다. 각 카테고리에 id/name/debugColor/cropDiameter/hotspots 배열이 있다. 각 hotspot은 id/label/x/y/radius와 선택적인 cropDiameter를 가진다.

- x, y: 원본 사진 전체 기준 중심 좌표(%).
- radius: 1536×864 기준 사진 픽셀. 현재 그래피티 110px, 쓰레기/비둘기 100px.
- cropDiameter: 1536px 기준 정사각 사진 크롭 폭. 값을 줄이면 더 확대된다.
- hotspotReferenceSize: 반경과 크롭 크기의 기준 해상도.

사진을 직접 확인하고 DEBUG 중심점과 물체를 대조해 40개 영역을 설정했다:

| 카테고리 | 영역 수 | 대상으로 설정한 물체 |
| --- | --- | --- |
| HUMAN MARKS | 10 | 왼쪽 벽의 큰 그래피티 4곳, 중앙 벽 낙서 3곳, 오른쪽 벽/기둥 낙서 3곳 |
| DISCARDED WASTE | 13 | 왼쪽 봉투·용기·종이, 계단 옆 흰 쓰레기, 벤치 위 봉투/용기, 벤치 아래/쓰레기통 주변 쓰레기 |
| SHARED SPACE | 17 | 난간·벽·계단·구조물·벤치·바닥에서 확인되는 비둘기 |

우측 뒤편 그늘 속 미세한 점, 흐릿한 원거리 물체, 잎과 구분되지 않는 형체는 추가하지 않았다. 검정 인쇄나 스티커인지 확실하지 않은 작은 표시도 별도 그래피티 핫스팟으로 추정하지 않았다. 사진의 모든 미세한 쓰레기 조각을 개별 식별했다고 보장하지 않으며, 명확한 쓰레기 무더기는 넓은 원 여러 개로 포함한다.

클릭 원이 겹치면 포함된 원 중 실제 물체 중심이 가장 가까운 영역으로 판정한다. 이미 발견한 카테고리도 이 비교에 포함하므로, 같은 물체를 재클릭해 옆 카테고리가 수집되지 않는다. 같은 카테고리의 모든 영역은 동일한 발견 ID를 공유하고 발견은 최대 1회다.

photoGeometry/mapHotspot/toPhotoPoint가 동일한 object-fit:cover 중심 크롭 배율과 오프셋을 공유한다. 판정 반경과 DEBUG 원도 같은 함수를 사용한다. 캔버스 스케일이나 사진의 종횡비가 달라져도 좌표와 크롭이 같은 사진 위치를 참조한다.

그래피티 프레임·스캐너 PNG·DEBUG 레이어는 pointer-events:none이다. 캐릭터·말풍선·상단 UI·HOW TO SCAN은 기존 UI 영역을 유지하며 클릭 판정보다 우선한다.

실제 UI에서 다음 7개 중심점은 UI가 덮고 있어 직접 클릭을 막는 것을 확인했다:

- left-black-wall-middle: 캐릭터/말풍선.
- left-trash-bag, left-trash-bag-right: 캐릭터 또는 HOW TO SCAN.
- left-takeaway-box, left-paper-bag: HOW TO SCAN.
- step-pigeon: 말풍선.
- ground-front-left: HOW TO SCAN.

이 물체들의 사진 좌표는 정확한 위치에 남겨 두었다. UI 밖으로 노출된 클릭 원 부분은 판정 가능하지만, UI 자체는 클릭해도 발견되지 않는다. 같은 카테고리의 다른 위치를 클릭할 수도 있다.

## TRACE FOUND 수집

기존 패널과 점선 원형 슬롯 3개를 그대로 사용한다. 카운터 00→01→02→03, 숫자 팝 200ms, 물음표 페이드 100ms, 사진 scale(.8)→scale(1) 250ms. PNG 물음표가 있는 원 안쪽만 덮어 처리하며 테두리는 유지한다. 새 이미지 에셋은 없다.

대표 크롭 중심 좌표는 더 이상 사용하지 않는다. 발견 슬롯은 클릭 좌표를 원본 사진 %로 역변환해 그 지점이 원의 중심이 되도록 크롭한다. 넉넉한 영역의 가장자리를 클릭한 경우 해당 물체도 사진 안에 남도록 크롭 폭을 확대한다. 확대 정도는 카테고리/개별 영역의 cropDiameter로 조정한다.

상태는 canvas.scannerState에서 확인한다:

- foundIds: 발견 카테고리 ID Set.
- foundOrder: 발견 순서의 카테고리 ID 배열.
- discoveries: categoryId / hotspotId / position(x,y 원본 사진 %) / cropDiameter.
- isComplete: 카테고리 3개를 모두 수집하면 true.

scanner:trace-discovered 이벤트에 같은 정보와 isComplete를 전달한다. 발견 순서대로 왼쪽 슬롯부터 채워지며 같은 카테고리의 다른 영역을 클릭해도 기존 슬롯을 교체하거나 추가하지 않는다. 페이지 재입장은 초기화한다.

완료 화면, MISSION ACTION 이동은 구현하지 않았다. TAGGY 말풍선은 후속 등장/대사 기능에서 발견 개수에 따라 변경한다. 완료는 내부 상태에만 반영한다.

## DEBUG

localhost/file 환경에서 config.debug=true 또는 ?scannerDebug=1로 활성화한다. 기본 게임과 외부 호스트에서는 보이지 않는다.

- 그래피티: 노랑, 쓰레기: 분홍, 비둘기: 청록.
- 반투명 클릭 원, 중심점, 카테고리별 번호/개수, 좌표 %, 반경 표시.
- 좌상단에 카테고리별 전체 핫스팟 수 표시.
- 특정 카테고리만 보기: ?scannerDebug=1&scannerDebugCategory=shared-space (또는 human-marks / discarded-waste).
- 전체 위치와 물체 설명은 설정 파일의 hotspots 배열에서 확인한다.

## 에셋

assets/images/pigeon-crew-scanner/의 기존 PNG 11개와 기존 폰트 ATP Tobeloved / KMU80TTFHaeongSans를 사용한다. 요청에 적힌 JPEG는 없으므로 동일 장면의 원본 PNG를 사용했다. BEAT/DASH의 스캐너 에셋은 아직 없어 ready:false이며 가이드 시작 버튼을 비활성화한다. 다른 크루의 대체 이미지는 추가하지 않았다.

## 검증

Chrome에서 DEBUG를 카테고리별로 사진 위에 렌더링한 스크린샷을 확인해 실제 물체와 중심점을 대조했다. 40개 중심의 실제 마우스 클릭 검증: UI가 덮는 7개는 미판정, 나머지 33개는 해당 카테고리로 판정했다. 새 영역을 이용한 비둘기→그래피티→쓰레기 순서 수집, 실제 클릭 좌표 크롭, 카운터 03 및 isComplete=true, 동일 카테고리의 모든 다른 영역 재클릭 시 슬롯 3개 유지, 런타임 예외 0개를 확인했다.

추가 검증: 1280×720 / 2560×1440 / 1440×900에서 실제 클릭 위치 크롭과 3개 카테고리 수집, DEBUG 카테고리 필터를 확인했다. 4:3 사진을 가정한 중심 cover 크롭의 정방향·역방향 좌표 변환도 통과했다. 가이드 버튼 와이프 → 로딩 → 게임 진입과 DEBUG 기본 비활성화 회귀 테스트를 통과했다.

기존 전환/로딩과 스캐너 그래픽 크기는 변경하지 않았다. 이번 다중 핫스팟 수정 파일: js/crew-scanner-config.js, js/crew-scanner.js, css/crew-scanner.css(DEBUG 표시만), docs/crew-scanner.md. 다른 페이지 파일 및 이미지 에셋은 수정하지 않았다. 정적 프로젝트라 별도 npm/build 명령은 없다.

## TAGGY 등장 및 대사

PIGEON에만 Web Animations API로 등장 모션을 적용한다. 로딩 1800ms 완료 후 기존 게임 페이드가 시작되는 시점이 0초이며, 배경/HOW TO SCAN에는 별도의 등장 지연이 없다.

| 요소 | 시작 | 지속 | 모션 |
| --- | --- | --- | --- |
| 타이틀 PNG(텍스트+브러시) | 0.00s | 0.35s | Y -35px / scale 1.08 → 원위치, cubic-bezier(0.2,1.4,0.4,1) |
| 크루 라벨 | 0.20s | 0.25s | X -45px → 원위치, ease-out |
| TAGGY PNG | 0.30s | 0.45s | X -120px → 원위치, ease-out |
| 말풍선 PNG+텍스트 그룹 | 0.55s | 0.30s | scale .9 → 1, ease-out |
| 패널+카운터+슬롯 그룹 | 0.70s | 0.25s | Y -10px → 원위치, ease-out |

전부 opacity 0→1이며 0.95초에 종료된다. 최종 애니메이션 효과를 제거해 기존 Figma 위치/크기/비율을 복원한다. transform은 요소 내부 모션에만 적용하고 캔버스 위치/스케일은 유지한다. 캐릭터나 말풍선 배경은 발견 때 다시 등장하지 않는다. 등장 중에도 PIGEON 탐색/클릭을 활성화한다.

대사는 crews.pigeon.dialogue[foundOrder.length]를 사용한다. 카운터와 같은 발견 상태를 참조하며 별도 카운터는 없다. 최초 00 대사와 01/02/03 대사는 이 배열에서 수정한다. 작업 중 편집된 최신 01 대사 "오, 찾았네? 다들 맨날 지나치는 건데."를 유지했다.

대사 변경은 텍스트만 100ms 페이드아웃 → 교체 → 150ms 페이드인한다. 고정 179px 텍스트 박스와 기존 폰트/18px/24px 행간/중앙 정렬을 유지한다. 연속 발견 시 이전 애니메이션을 취소하고 전환 버전을 확인해 마지막 대사가 항상 최신 상태와 일치한다. 중복 카테고리 클릭은 전환을 실행하지 않는다. 모션 감소 설정에서는 새 등장/대사 모션을 생략하고 최종 상태를 바로 표시한다.

Chrome 검증: 지정된 5개 지연/지속/초기 transform, 등장 중 실제 첫 흔적 클릭, 최초/1/2/3 대사, 중복 카테고리 재클릭 시 대사 애니메이션 없음, 캐릭터·말풍선 배경 등장 각각 1회, 빠른 연속 발견 및 페이드인 도중 재발견에서도 최신 대사 유지, 기존 카운터/슬롯 3개, 최종 요소 좌표 및 transform:none, 1280×720 / 1440×900 캔버스 위치를 확인했다. 런타임 예외 0개. MISSION START 버튼 와이프 → 1800ms 로딩 → 게임 진입 및 DEBUG 기본 비활성화 회귀 테스트도 통과했다.

이번 수정 파일: js/crew-scanner.js, js/crew-scanner-config.js(PIGEON dialogue만), css/crew-scanner.css(PIGEON 텍스트 줄바꿈만), docs/crew-scanner.md. RAT/CAT의 대사·모션·캐릭터 및 다른 페이지는 수정하지 않았다. 현재 Figma 창이 닫혀 MCP 재확인은 불가능했으며, 앞선 작업에서 확인한 Figma 프레임과 기존 배치를 기준으로 좌표/크기/폰트/PNG를 유지했다.


## 발견 카드 및 TRACE FOUND 라벨

js/crew-scanner-feedback.js는 기존 scanner:trace-discovered 이벤트만 구독한다. 클릭 판정과 발견 상태는 기존 스캐너가 관리한다. 카테고리 feedback 설정에서 번호/제목/설명을 수정한다. 번호는 HUMAN MARKS=01, DISCARDED WASTE=02, SHARED SPACE=03으로 고정한다.

Figma 153:36의 최종 그룹 위치(98,567)를 유지한다. 그룹 등장 500ms → 제목/설명 순서 타이핑(글자당35ms) → 1000ms 유지 → 400ms 아래로 퇴장. 연속 발견은 FIFO로 표시한다. 사진은 기존 discoveries.position/cropDiameter를 재사용하며 사진 가장자리에서는 크롭을 이미지 안으로 제한한다. TRACE FOUND 라벨은 Figma 153:2의 크기와 스캐너 상대 위치를 유지하고 발견 순간 위치에 고정한다. 점멸400ms + 유지800ms + 페이드200ms. 중복 발견은 재생하지 않는다.

추가된 PNG 5개는 투명도가 없어 흰 배경이 사진과 라벨을 가리므로 원본은 수정하지 않고 Figma의 동일 레이어를 assets/images/pigeon-crew-scanner/figma/의 SVG 5개로 내보냈다. 기존 디자인을 재사용하며 새로운 그래픽은 만들지 않았다.

Chrome 실제 클릭 검증: 03→01→02 발견 순서의 카드 대기열, 카테고리 고정 번호와 승인된 문구, 제목 다음 설명 타이핑, 3500ms 유지/400ms 퇴장, 클릭 위치 크롭, 라벨 위치 고정과 1400ms 후 숨김, 동일 카테고리 중복 무시, 카운터03/슬롯3개 유지, 가이드 와이프에서 게임 진입 후 카드 동작, 1280×720 및 1440×900 스케일을 확인했다. 런타임 예외 0개.

후속 조정: 타이핑 완료 후 유지 시간을 2000ms로 변경했다. 등장/타이핑/퇴장 및 라벨 타이밍은 동일하다.

후속 순서 조정: 발견 즉시 말풍선을 바꾸는 호출을 제거했다. 실제 라벨 애니메이션의 점멸 구간이 지난 뒤 카드를 시작하고, 카드 퇴장 finished → 200ms 대기 → scanner:feedback-exited 이벤트로 TAGGY의 300ms 짧은 반응과 기존 텍스트 페이드100/150ms를 실행한다. 각 발견 시 기존 foundOrder.length를 저장해 연속 발견도 1→2→3 대사를 순서대로 표시한다. 반응 완료 후 다음 카드를 시작한다. 최신 요청에 따라 유지 시간은 다시3500ms로 적용한다.

최신 유지 시간: 타이핑 완료 후1000ms. 퇴장 완료 → 200ms 대기 → 캐릭터 반응/말풍선 변경 순서는 유지한다.


## Chrome / Live Server 전환 오류 수정

VS Code Live Server(5500)는 SVG 응답에 live-reload 스크립트를 삽입한다. trace-card.svg/trace-found.svg의 중첩 svg 때문에 응답이 잘못 구성되어 Chrome img.decode()가 EncodingError를 발생시켰고, 전환 준비가 실패했다. Python 서버(8765)에서는 원본 SVG를 제공하여 재현되지 않았다. SVG의 내부 viewport를 동일 좌표의 g/translate 그룹으로 정리했다. 이미지 준비 실패 로그에 실제 에셋 URL을 포함한다. wipe는 기존 Web Animations API finished를 기다리며 animationend/transitionend 리스너는 사용하지 않는다.

수정 후 실제 Live Server의 Chrome에서 준비 완료 → 확장550ms → 페이지 교체 → 축소450ms → overlay 제거 → 로딩1800ms → 게임 페이드300ms 전체 흐름을 확인했다. 기존 전환 애니메이션과 디자인, 로딩, 게임 기능은 유지한다.


## CREW SCANNER 완료 화면

Figma Desktop 최신159:31 및 텍스트/버튼 하위 레이어를 확인했다. ALL TRACES ATP Tobeloved100px, FOUND!177.08px, 한글 Haeong Sans29.73px, 버튼46.19px와 원본1920×1080 좌표를 유지한다. 배경/장식은 기존 것을 재사용한다. 기존 사진 밝기 .28 위에64.285714% 검정 레이어를 적용해 Figma의 원본 사진 대비90% 어둠(.10밝기)을 재현한다.

마지막 발견 카드만3500ms 유지하고 이전 카드는1000ms를 유지한다. scanner:feedback-complete는 실제 카드 퇴장과 캐릭터 반응/대사 Promise 완료 이후 발생한다. 기존 scannerState.isComplete와 이벤트의 isComplete를 모두 확인하여 완료를1회 시작하고 탐색을 중지한다. 게임 UI는 숨기며 배경을 교체하지 않는다.

완료 순서: 오버레이350ms → ALL TRACES400ms → FOUND!450ms(1.35/.92/1) → 첫 줄35ms/글자 → 150ms → 둘째 줄35ms/글자 → 버튼350ms. 모든 모션 finished를 await한다. 전체 문장 폭을 숨겨진 HTML 텍스트로 미리 확보하고 타이핑만 같은 고정 시작점에서 표시한다. 버튼은 종료 전 aria-disabled/tabindex=-1로 비활성화되며 활성화 후 호버1.04/200ms와 크루별 기존 mission-action.html 경로를 사용한다.

PNG는 실제 assets/images/pigeon-crew-scanner/pigeon-crew-scanner-complete-button.png만 사용한다. 에셋에 기존 오타 문구/화살표가 포함되어 텍스트 부분을 동일 노란색 CSS로 덮고 올바른 START YOUR MISSION HTML과 CSS 화살표를 표시한다. PNG 원본은 수정하지 않았다.

Chrome Live Server5500 검증: 서로 다른 카테고리3개 및 중복 클릭, 마지막3500ms유지/퇴장/마지막대사 이후 완료진입, 모든 순차 단계/한글 완성/버튼 활성화, 실제 pigeon-mission-action.html 이동, 1280×720/1440×900 스케일, 조기 버튼 클릭 방지 및 reduced-motion 경로를 확인했다. RAT/CAT의 색상 및 기존 action 경로는 완료 컴포넌트 단위로 확인했다. 해당 크루 게임 에셋은 여전히 미준비 상태이며 기존ready:false 설정을 변경하지 않았다. 런타임 예외0개. js/crew-scanner-complete.js 신규, 기존 HTML/CSS/config/core/feedback 연결만 수정했다.

버튼 표시 후속 변경: START YOUR MISSION 버튼은 기존 pigeon-crew-scanner-complete-button.png 전체 이미지만 표시한다. HTML 문구/CSS 화살표와 문구 덮개는 제거했다. 위치/크기/등장/호버/클릭 이동과 접근성 이름은 유지한다.

완료 진입 타이밍 후속 변경: 마지막 scanner:feedback-complete(말풍선 fade-in/반응 완료) 이후2000ms 대사를 유지하고 scanner-game 전체만500ms 페이드아웃한다. 실제 fade finished 후 기존 완료 시퀀스를 시작한다. 도시 사진/장식은 별도 레이어로 유지하며 첫 번째/두 번째 발견에는 이 대기/페이드를 적용하지 않는다.

최신 완료 진입 타이밍: 마지막 말풍선 전환 완료 후1000ms 유지 → 게임 UI500ms 페이드아웃 → 기존 완료 화면 시퀀스.

발견 결과 UI 최신 배치: Figma Desktop155:2978/153:36 재확인. 결과 그룹(1056,547), 정보 카드 로컬(29,215), TRACE 라벨(301,215), 제목/설명 우측정렬 기준 오른쪽474px과 y299.25/353.41px. 폴라로이드 내부 wrapper의350.5249×371.3297px과7.92도 회전을 분리하여 그룹 등장/퇴장 transform과 충돌하지 않는다. 사진/프레임/테이프는 기존 상대 좌표와 에셋을 유지하며 함께 회전한다. JS 및 발견/타이핑/유지/완료 타이밍은 변경하지 않았다. Chrome Live Server에서 실제 발견 스크린샷을 Figma와 대조하고 캐릭터 위치 유지/겹침 없음, 최종 transform:none, 퇴장 숨김 및1280×720/1440×900 스케일을 확인했다. 런타임 예외0개.

발견 정보 카드 타이핑 제거: 카드 등장 완료 후 제목/설명을 전체 문장으로 즉시 표시한다. 기존 등장/유지/퇴장, 캐릭터 반응 및 완료 화면 타이핑은 유지한다.
