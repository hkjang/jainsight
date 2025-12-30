# SSO 보안 (SSO Security)

엔터프라이즈 계정 관리를 위한 SSO(Single Sign-On) 통합을 구성합니다.

## 지원되는 프로토콜

- **SAML 2.0**: Okta, Azure AD, OneLogin 등과 호환됩니다.
- **OIDC (OpenID Connect)**: Google Workspace, Auth0 등을 위한 최신 표준입니다.

## 구성 (Configuration)

- **IdP 메타데이터 URL**: ID 공급자(Identity Provider)로부터 설정을 자동으로 가져옵니다.
- **속성 매핑**: IdP 속성(이메일, 부서, 역할)을 Jainsight 사용자 프로필에 매핑합니다.
- **도메인 강제**: 특정 이메일 도메인(예: `@company.com`)에 대해 비밀번호 로그인을 비활성화하고 SSO 로그인을 강제합니다.

## JIT 프로비저닝 (Just-in-Time Provisioning)

- **JIT 생성**: 사용자가 처음 성공적으로 SSO 로그인할 때 Jainsight에 사용자 계정을 자동으로 생성합니다.
- **기본 그룹**: 신규 사용자를 기본적으로 특정 권한 그룹(예: "Viewers")에 할당합니다.
