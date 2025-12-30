# Workspace

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is ready ✨.

[Learn more about this workspace setup and its capabilities](https://nx.dev/getting-started/intro#learn-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

## Run tasks

To run tasks with Nx use:

```sh
npx nx <target> <project-name>
```

For example:

```sh
npx nx build myproject
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

To install a new plugin you can use the `nx add` command. Here's an example of adding the React plugin:

```sh
npx nx add @nx/react
```

Use the plugin's generator to create new projects. For example, to create a new React app or library:

```sh
# Generate an app
npx nx g @nx/react:app demo

# Generate a library
npx nx g @nx/react:lib some-lib
```

You can use `npx nx list` to get a list of installed plugins. Then, run `npx nx list <plugin-name>` to learn about more specific capabilities of a particular plugin. Alternatively, [install Nx Console](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) to browse plugins and generators in your IDE.

[Learn more about Nx plugins &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [Browse the plugin registry &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Set up CI!

### Step 1

To connect to Nx Cloud, run the following command:

```sh
npx nx connect
```

Connecting to Nx Cloud ensures a [fast and scalable CI](https://nx.dev/ci/intro/why-nx-cloud?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) pipeline. It includes features such as:

- [Remote caching](https://nx.dev/ci/features/remote-cache?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task distribution across multiple machines](https://nx.dev/ci/features/distribute-task-execution?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Automated e2e test splitting](https://nx.dev/ci/features/split-e2e-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task flakiness detection and rerunning](https://nx.dev/ci/features/flaky-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Step 2

Use the following command to configure a CI workflow for your workspace:

```sh
npx nx g ci-workflow
```

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/getting-started/intro#learn-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:

- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Documentation

Comprehensive, bilingual (English & Korean) documentation is available in the [`docs/`](./docs) directory.

### Table of Contents

#### **Dashboard & Core Features**

- **Dashboard**: [Overview](./docs/doc_dashboard_overview_en.md) | [Stats](./docs/doc_dashboard_stats_widgets_en.md) | [Activity](./docs/doc_dashboard_recent_activity_en.md)
- **SQL Editor**: [Interface](./docs/doc_sql_editor_interface_en.md) | [Execution](./docs/doc_sql_editor_query_execution_en.md) | [Results](./docs/doc_sql_editor_results_grid_en.md) | [AI Assist](./docs/doc_sql_editor_ai_assist_en.md)
- **Schema**: [Browser](./docs/doc_schema_explore_browser_en.md) | [Details](./docs/doc_schema_explore_details_en.md)

#### **Data Management**

- **Connections**: [List](./docs/doc_connections_list_en.md) | [Create/Edit](./docs/doc_connections_create_edit_en.md)
- **API Gateway**: [Builder](./docs/doc_api_gateway_builder_en.md) | [Management](./docs/doc_api_gateway_management_en.md)

#### **Enterprise Admin**

- **Users**: [List](./docs/doc_admin_users_list_en.md) | [Invite](./docs/doc_admin_users_invite_en.md) | [Groups](./docs/doc_admin_groups_en.md) | [RBAC](./docs/doc_admin_rbac_roles_en.md)
- **System**: [Queries Policy](./docs/doc_admin_queries_policy_en.md) | [API Keys](./docs/doc_admin_api_keys_en.md) | [Audit Logs](./docs/doc_admin_audit_logs_en.md) | [Reports](./docs/doc_admin_reports_system_en.md) | [Settings](./docs/doc_admin_settings_general_en.md)

#### **AI Management**

- **AI**: [Providers](./docs/doc_admin_ai_providers_en.md) | [Models](./docs/doc_admin_ai_models_en.md) | [Prompts](./docs/doc_admin_prompts_en.md)

#### **Security & Monitoring**

- **Security**: [NL2SQL Policy](./docs/doc_admin_nl2sql_policies_en.md) | [IP](./docs/doc_admin_security_ip_en.md) | [SSO](./docs/doc_admin_security_sso_en.md)
- **Monitoring**: [Dashboard](./docs/doc_admin_ai_dashboard_en.md) | [Audit](./docs/doc_admin_ai_audit_en.md)

> Note: For Korean versions, look for files ending in `_kr.md` in the `docs/` folder.
