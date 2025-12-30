# Workspace

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ 새롭고 멋진 [Nx 워크스페이스](https://nx.dev)가 준비되었습니다 ✨.

[이 워크스페이스 설정 및 기능에 대해 자세히 알아보기](https://nx.dev/getting-started/intro#learn-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) 또는 `npx nx graph`를 실행하여 생성된 내용을 시각적으로 살펴보세요. 이제 시작해 봅시다!

## 작업 실행 (Run tasks)

Nx로 작업을 실행하려면 다음을 사용합니다:

```sh
npx nx <target> <project-name>
```

예를 들어:

```sh
npx nx build myproject
```

이 타겟들은 [자동으로 추론](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)되거나 `project.json` 또는 `package.json` 파일에 정의됩니다.

[문서에서 작업 실행에 대해 더 알아보기 &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## 새 프로젝트 추가 (Add new projects)

워크스페이스에 새 프로젝트를 수동으로 추가할 수도 있지만, [Nx 플러그인](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)과 그 [코드 생성](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) 기능을 활용하는 것이 좋습니다.

새 플러그인을 설치하려면 `nx add` 명령을 사용할 수 있습니다. React 플러그인을 추가하는 예는 다음과 같습니다:

```sh
npx nx add @nx/react
```

플러그인의 생성기(generator)를 사용하여 새 프로젝트를 만듭니다. 예를 들어, 새 React 앱이나 라이브러리를 만들려면:

```sh
# 앱 생성
npx nx g @nx/react:app demo

# 라이브러리 생성
npx nx g @nx/react:lib some-lib
```

`npx nx list`를 사용하여 설치된 플러그인 목록을 확인할 수 있습니다. 그런 다음 `npx nx list <plugin-name>`을 실행하여 특정 플러그인의 구체적인 기능에 대해 알아볼 수 있습니다. 또는 [Nx Console을 설치](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)하여 IDE에서 플러그인과 생성기를 찾아볼 수 있습니다.

[Nx 플러그인에 대해 더 알아보기 &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [플러그인 레지스트리 찾아보기 &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## CI 설정 (Set up CI!)

### 1단계

Nx Cloud에 연결하려면 다음 명령을 실행합니다:

```sh
npx nx connect
```

Nx Cloud에 연결하면 [빠르고 확장 가능한 CI](https://nx.dev/ci/intro/why-nx-cloud?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) 파이프라인이 보장됩니다. 다음과 같은 기능이 포함됩니다:

- [원격 캐싱 (Remote caching)](https://nx.dev/ci/features/remote-cache?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [여러 머신에 작업 분산 (Task distribution)](https://nx.dev/ci/features/distribute-task-execution?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [자동 e2e 테스트 분할 (Automated e2e test splitting)](https://nx.dev/ci/features/split-e2e-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [작업 불안정성 감지 및 재실행 (Task flakiness detection)](https://nx.dev/ci/features/flaky-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### 2단계

워크스페이스에 대한 CI 워크플로우를 구성하려면 다음 명령을 사용합니다:

```sh
npx nx g ci-workflow
```

[Nx on CI에 대해 더 알아보기](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Nx Console 설치

Nx Console은 개발자 경험을 풍부하게 해주는 에디터 확장이입니다. IDE에서 작업을 실행하고, 코드를 생성하고, 코드 자동 완성을 개선할 수 있습니다. VSCode 및 IntelliJ에서 사용할 수 있습니다.

[Nx Console 설치 &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## 유용한 링크

더 알아보기:

- [이 워크스페이스 설정에 대해 더 알아보기](https://nx.dev/getting-started/intro#learn-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Nx on CI에 대해 알아보기](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Nx release로 패키지 배포하기](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Nx 플러그인이란?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

Nx 커뮤니티 참여:

- [Discord](https://go.nx.dev/community)
- [Twitter 팔로우](https://twitter.com/nxdevtools) 또는 [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Youtube 채널](https://www.youtube.com/@nxdevtools)
- [블로그](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## 문서 (Documentation)

포괄적인 이중 언어(영어 및 한국어) 문서는 [`docs/`](./docs) 디렉토리에서 확인할 수 있습니다.

### 목차

#### **대시보드 및 핵심 기능**

- **대시보드**: [개요](./docs/doc_dashboard_overview_kr.md) | [통계](./docs/doc_dashboard_stats_widgets_kr.md) | [활동](./docs/doc_dashboard_recent_activity_kr.md)
- **SQL 에디터**: [인터페이스](./docs/doc_sql_editor_interface_kr.md) | [실행](./docs/doc_sql_editor_query_execution_kr.md) | [결과](./docs/doc_sql_editor_results_grid_kr.md) | [AI 지원](./docs/doc_sql_editor_ai_assist_kr.md)
- **스키마**: [브라우저](./docs/doc_schema_explore_browser_kr.md) | [상세](./docs/doc_schema_explore_details_kr.md)

#### **데이터 관리**

- **연결**: [목록](./docs/doc_connections_list_kr.md) | [생성/편집](./docs/doc_connections_create_edit_kr.md)
- **API 게이트웨이**: [빌더](./docs/doc_api_gateway_builder_kr.md) | [관리](./docs/doc_api_gateway_management_kr.md)

#### **엔터프라이즈 관리**

- **사용자**: [목록](./docs/doc_admin_users_list_kr.md) | [초대](./docs/doc_admin_users_invite_kr.md) | [그룹](./docs/doc_admin_groups_kr.md) | [RBAC](./docs/doc_admin_rbac_roles_kr.md)
- **시스템**: [쿼리 정책](./docs/doc_admin_queries_policy_kr.md) | [API 키](./docs/doc_admin_api_keys_kr.md) | [감사 로그](./docs/doc_admin_audit_logs_kr.md) | [보고서](./docs/doc_admin_reports_system_kr.md) | [설정](./docs/doc_admin_settings_general_kr.md)

#### **AI 관리**

- **AI**: [공급자](./docs/doc_admin_ai_providers_kr.md) | [모델](./docs/doc_admin_ai_models_kr.md) | [프롬프트](./docs/doc_admin_prompts_kr.md)

#### **보안 및 모니터링**

- **보안**: [NL2SQL 정책](./docs/doc_admin_nl2sql_policies_kr.md) | [IP](./docs/doc_admin_security_ip_kr.md) | [SSO](./docs/doc_admin_security_sso_kr.md)
- **모니터링**: [대시보드](./docs/doc_admin_ai_dashboard_kr.md) | [감사](./docs/doc_admin_ai_audit_kr.md)

> 참고: 영어 버전 문서는 `docs/` 폴더 내의 `_en.md`로 끝나는 파일들을 확인하세요.
