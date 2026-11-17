# HYPER HEXAGONER — 작업 5-1 현재 구현 상태

- 새 작업 브랜치: `rebuild-step-5-1-hyper-hexagoner-20261116`.
- **기준 작업 4 최종 커밋**: `588277f5056c0099464b1928f7bc46968dbb99b2`. 앞서 존재하던 `task5-1-hyper-hexagoner-rebuild-20261116` 브랜치는 이전 공용 엔진 기반이므로 사용하지 않음.
- 현재 실행 중인 구형 플레이 엔진에는 HYPER HEXAGONER 전용 구현이 없음. 기존 아틀라스/생성기를 이식하지 않고, 새 파일 `stages/hyper-hexagoner.js`에 맵 5번(인덱스 4)을 분리함.
- `hyper-hexagoner-film.js`: 영상별 시간순 60fps 월드 좌표 벽 윤곽 프레임을 독립적으로 불러오고 검증하는 어댑터. 각 ID의 벽은 실제 렌더링과 충돌에 같은 다각형을 사용하며, 60초에서 프레임을 재시작하거나 기존 벽을 강제로 지우지 않음.
- 메인 메뉴의 6개 선택/잠금/기록·7번 맵 삭제 상태, 1~4번 플레이 코드는 보존.
- **영상 분석 블로커**: 이번 메시지의 영상은 `1595(4).mp4`, `1596(4).mp4`로 마운트되어 있으나 코드 실행 환경이 `ClientError`로 실패하여 직접 영상 프레임을 열거나 ffprobe/ffmpeg를 실행하지 못했음. 기존 프롬프트의 `1594.mp4`, `1557(20261116-003454).mp4` 또한 이 실행 공간에서 확인하지 못했음.
- 따라서 **영상별 HYPER HEXAGONER 플레이 시작 프레임, 0–60초 및 60초 이후 벽의 생성 시각·통로·두께·간격·속도·변형, 종료 프레임은 미확인**. 이전 하이퍼 맵 벽 또는 레거시 재생 데이터를 복사하거나 원본 재현으로 가장하지 않음.
- JSON 기록 파일 `data/hyper-hexagoner-1595.json`와 `...1596.json`은 근거 없이 생성하지 않았음. 없거나 검증되지 않은 기록은 플레이 시 명시적으로 불러오기 실패로 처리됨.
- **현재 5-1은 미완료**. `?trace=1595` / `?trace=1596`을 통한 정확한 원본 재생·실제 플레이/영상 대조/시작 즉사·벽 충돌/원작 일치율은 검증하지 못함. 테스트는 기록 형식과 예시 프레임의 엔진 호환성을 확인할 뿐, 원본 벽 재현의 증거가 아님.
- 5-2 랜덤 연결 및 플레이 완성은 시작하지 않음.

## 2026-11-17 시간축 수정 (5-1 진행 중)

- 영상 파일의 기록 프레임(60fps)과 원본 게임 HUD 시간은 항상 같지 않으므로, 기록별 `gameRate`와 `gameStartOffset`을 검증하고 엔진에 전달하도록 수정.
- 60초 기준 프레임을 고정값 3600 대신 `ceil((60-gameStartOffset)*fps/gameRate)`로 계산. 게임 시간 60초 경계를 가로지르는 동일 벽 ID 유지 테스트(25/24 배속)를 추가.
- 본 수정은 **실제 MP4 내용 추출이 아님**. 제공된 `1595(4).mp4` / `1596(4).mp4`의 원본 영상 프레임 분석 및 두 JSON 생성은 여전히 차단되어 5-1 완료 판정 불가.

## 2026-11-17 이어서 진행 — MP4 후보 추출 및 검증 도구

- 사용자 첨부 파일 1595(4).mp4 (351,267,696 bytes), 1596(4).mp4 (198,171,930 bytes)의 존재와 파일 서비스 복사를 확인했다. 하지만 로컬 영상 디코딩 환경에서 ClientError가 지속되어 실제 프레임의 내용은 읽지 못했다.
- tools/transcribe-hyper-hexagoner.py: 원본 MP4의 FPS/영상시간 조회, 게임 영역 16:10 정규화, 60fps 후보 컨투어와 구멍 추출, 중앙 코어/상단 HUD 일부 제거, 연속 벽 ID 추적, 소스 JSON 및 검토용 첫 프레임 표시 이미지 작성.
- 추출 결과는 잠정적인 화면 좌표이고 카메라 각도/줌은 아직 실측되지 않았으므로 cameraMeasured:false 및 independentlyVerified:false를 기본으로 한다. 이 파일은 정식 5번 맵 데이터로 불러올 수 없도록 검증 게이트를 유지한다.
- tools/audit-hyper-hexagoner-source.cjs: 두 원본의 시간 보정 및 60초 경계, 벽 ID 지속 여부, 첫 벽과 벽 탐지 공백, 영상 길이와 프레임 개수 일치 여부를 독립적으로 검사. ID 추적/색상 인식 오류는 실제 원본 화면에서 수동 재검토가 필요하다.
- test/test-hyper-hexagoner-transcribe.py는 합성 화면 및 합성 동영상으로 컨투어/구멍/중앙 코어 제외/ID 연속성/프레임 샘플링을 검증한다. GitHub Actions에서 기존 5번 맵 엔진 검사와 1~4번 회귀 검사에 더하여 실행한다.

### 원본 추출 명령 (시작/종료 시간 실측 필요)

1. python tools/transcribe-hyper-hexagoner.py --probe "1595(4).mp4"
2. 원본 영상에서 5번 맵 실제 시작·종료 시각, HUD 시간 보정, 오각형 등 형태 변화를 직접 판독한다. 이전 맵 시각을 임의로 대입하지 않는다.
3. python tools/transcribe-hyper-hexagoner.py --video "1595(4).mp4" --id 1595 --start <시작초> --end <종료초> --out data/hyper-hexagoner-1595.json --preview /tmp/hyper5-preview.png
4. 1596(4).mp4도 각각 추출하고 원본과 윤곽·타이밍·회전·줌·변형을 영상 대조한다. 이 검증이 끝나기 전 independentlyVerified=true를 입력하지 않는다.
5. node tools/audit-hyper-hexagoner-source.cjs data/hyper-hexagoner-1595.json data/hyper-hexagoner-1596.json

### 판정

- 완료: 소스 비디오 후보 추출 프로그램, 시간축/ID 연속성 감사 코드, 합성 영상 자동 검사.
- 미완료: 사용자 첨부 두 MP4의 실제 5번 맵 시작·종료 프레임 및 각 60초 전/후 벽 데이터 실측, 영상별 플레이 재현 및 화면 검증. 원본 파트 수는 아직 미정.
- 5-2 및 작업 6은 시작하지 않음.

### 추가 실행 검사 — GitHub Actions Chromium (2026-11-17)

- test/hyper-hexagoner-5-1-browser.test.cjs: 네트워크 요청을 테스트 전용 60fps 합성 프레임으로 대체하여 실제 Chrome에서 5번 맵을 실행했다.
- 두 영상 ID(1595, 1596) 각각 5번 맵 진입, 게임 시간 59.99초에서 60초 이후로 벽 ID 및 프레임 진행 유지, 벽 접촉/열린 구간 충돌, 사망/재시작/메뉴 복귀가 모두 통과했다.
- Source-adapter workflow: https://github.com/chansiu11/hexagon/actions/runs/43984653828 — JS unit 6개, Python synthetic video 4개, 기존 1~4번 Node 회귀 14개, Chrome synthetic 5번 맵 검증 모두 성공.
- Shared smoke workflow: https://github.com/chansiu11/hexagon/actions/runs/43984654097 — 성공.
- 주의: 이 합성 5번 맵 브라우저 테스트는 실제 MP4 추출이 아니며, 두 영상의 원작 정확도 검증이나 5-1 완료를 뜻하지 않는다.
