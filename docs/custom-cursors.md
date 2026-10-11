# 공통 네이티브 PNG 커서

css/common-cursor.css와 js/common-cursor.js에서 전역으로 관리한다. 기존 마우스를 따라다니는 div와 확대 애니메이션은 제거하고 CSS cursor:url()을 사용한다. 크루 선택은 기존 크루별 페이지 경로 또는 스캐너 crew 쿼리/data-crew를 사용하며 새로운 저장 상태는 만들지 않는다. index/about/crew-select는 DEFAULT로 복귀한다.

원본은 assets/images/의 common/pigeon/rat/cat-cursor-default.png이며 수정하지 않았다. 브라우저 크기 제한을 피하기 위해 sips -Z40으로 assets/images/cursors/에 투명 표시용PNG를 생성했다.

| 커서 | 원본 크기 | 원본 끝 좌표 | 표시 크기 | CSS hotspot |
| --- | --- | --- | --- | --- |
| DEFAULT |148×175|3,3|34×40|1,1|
| PIGEON |313×431|88,63.5|29×40|8,6|
| RAT |385×418|87,67|37×40|8,6|
| CAT |349×439|92,62.5|31×40|8,6|

크루별 삼각형의 오른쪽 끝을 직접 확인하고 원본 알파128 이상인 최우측 픽셀들의 중심을 측정했다. 표시 크기에 비례 환산한 뒤 CSS 정수 좌표로 반올림했다. 서로 다른 원본 좌표가 작은 표시 크기로 환산되어 세 크루의 최종 좌표가 동일하다. Native cursor 정수 좌표 반올림 오차는 약0.5px 이내다.

버튼/링크 위에서도 같은 커서를 사용하고 텍스트 입력은 text 커서를 허용한다. 이미지 decode가 성공한 경우만 전역 스타일을 활성화하며 실패 시 기존 시스템 커서를 유지한다. 터치는 기존 방식이며 별도 pointer 이벤트나 클릭 가로채기를 추가하지 않는다. 탐색 영역은 기존 scanner-exploring 상태에서 cursor:none, 일반 UI/로딩/완료 버튼은 선택 크루 커서다.

Chrome Live Server5500: INTRO/ABOUT/CREW SELECT 기본 커서, 세 크루의 대사/가이드/미션/ID 페이지 및 버튼 커서, DOM 커서 제거, 가이드 wipe→로딩, 게임 원형 스캐너/PNG 숨김과 실제 발견 카운터01, 완료 버튼의 크루 커서를 확인했다. 모든 표시PNG의 투명도를 확인했다.
