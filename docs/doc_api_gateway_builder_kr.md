# API 빌더 (API Builder)

**API 빌더**를 사용하면 백엔드 코드를 배포하지 않고도 SQL 쿼리를 보안이 적용된 REST API 엔드포인트로 즉시 변환할 수 있습니다.

## 빌더 인터페이스

### 1. 기본 정보 (Basic Info)

- **API 이름**: 엔드포인트를 고유하게 식별합니다 (예: `get-user-by-id`).
- **연결 (Connection)**: 쿼리가 실행될 데이터베이스를 선택합니다.

### 2. SQL 정의 (SQL Definition)

에디터에 SQL 로직을 작성합니다.

- **파라미터**: 콜론 문법(`:variableName`)을 사용하여 동적 파라미터를 정의합니다.
  - _예시_: `SELECT * FROM users WHERE id = :userId`
  - 시스템이 이러한 변수를 자동으로 파싱하여 파라미터 설정 섹션을 생성합니다.

### 3. 파라미터 구성 (Parameter Configuration)

감지된 각 파라미터(예: `userId`)에 대해 다음을 설정합니다:

- **타입**: 문자열(String), 숫자(Number), 불리언(Boolean).
- **필수 여부**: API 호출 시 이 파라미터가 필수인지 여부를 설정합니다.

### 4. 테스트

저장하기 전에 통합된 테스트 패널을 사용하여 샘플 파라미터 값으로 API를 실행해보고 예상대로 작동하는지 확인하세요.
