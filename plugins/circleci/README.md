# CircleCI

OpenTabs plugin for CircleCI — gives AI agents access to CircleCI through your authenticated browser session.

## Install

```bash
opentabs plugin install circleci
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-circleci
```

## Setup

1. Open [app.circleci.com](https://app.circleci.com) in Chrome and log in
2. Open the OpenTabs side panel — the CircleCI plugin should appear as **ready**

## Tools (33)

### Users (2)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get your CircleCI user profile | Read |
| `list_collaborations` | List your organizations | Read |

### Projects (1)

| Tool | Description | Type |
|---|---|---|
| `get_project` | Get project details by slug | Read |

### Pipelines (4)

| Tool | Description | Type |
|---|---|---|
| `list_pipelines` | List pipelines for a project | Read |
| `get_pipeline` | Get a pipeline by ID | Read |
| `get_pipeline_config` | Get pipeline configuration | Read |
| `trigger_pipeline` | Trigger a new pipeline | Write |

### Workflows (5)

| Tool | Description | Type |
|---|---|---|
| `get_pipeline_workflows` | List workflows for a pipeline | Read |
| `get_workflow` | Get a workflow by ID | Read |
| `get_workflow_jobs` | List jobs in a workflow | Read |
| `cancel_workflow` | Cancel a running workflow | Write |
| `rerun_workflow` | Rerun a workflow | Write |

### Jobs (5)

| Tool | Description | Type |
|---|---|---|
| `get_job` | Get job details | Read |
| `get_job_artifacts` | List job artifacts | Read |
| `get_job_tests` | Get job test results | Read |
| `cancel_job` | Cancel a running job | Write |
| `approve_job` | Approve a pending job | Write |

### Contexts (5)

| Tool | Description | Type |
|---|---|---|
| `list_contexts` | List organization contexts | Read |
| `get_context` | Get context details | Read |
| `create_context` | Create a context | Write |
| `delete_context` | Delete a context | Write |
| `list_context_env_vars` | List context env vars | Read |

### Environment (3)

| Tool | Description | Type |
|---|---|---|
| `list_env_vars` | List project env vars | Read |
| `create_env_var` | Create a project env var | Write |
| `delete_env_var` | Delete a project env var | Write |

### Insights (4)

| Tool | Description | Type |
|---|---|---|
| `get_project_workflow_metrics` | Get workflow metrics for a project | Read |
| `get_workflow_runs` | Get recent runs of a workflow | Read |
| `get_workflow_job_metrics` | Get job metrics for a workflow | Read |
| `get_flaky_tests` | Get flaky tests in a project | Read |

### Schedules (4)

| Tool | Description | Type |
|---|---|---|
| `list_schedules` | List scheduled triggers | Read |
| `create_schedule` | Create a scheduled trigger | Write |
| `update_schedule` | Update a scheduled trigger | Write |
| `delete_schedule` | Delete a scheduled trigger | Write |

## How It Works

This plugin runs inside your CircleCI tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
