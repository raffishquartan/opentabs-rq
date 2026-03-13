# Google Cloud

OpenTabs plugin for Google Cloud Console — gives AI agents access to Google Cloud through your authenticated browser session.

## Install

```bash
opentabs plugin install google-cloud
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-google-cloud
```

## Setup

1. Open [console.cloud.google.com](https://console.cloud.google.com) in Chrome and log in
2. Open the OpenTabs side panel — the Google Cloud plugin should appear as **ready**

## Tools (30)

### Projects (3)

| Tool | Description | Type |
|---|---|---|
| `get_current_project` | Get the active project from the console URL | Read |
| `list_projects` | List accessible GCP projects | Read |
| `get_project` | Get details about a GCP project | Read |

### Compute (7)

| Tool | Description | Type |
|---|---|---|
| `list_instances` | List Compute Engine VM instances | Read |
| `get_instance` | Get a Compute Engine VM instance | Read |
| `start_instance` | Start a stopped VM instance | Write |
| `stop_instance` | Stop a running VM instance | Write |
| `list_disks` | List persistent disks | Read |
| `list_networks` | List VPC networks | Read |
| `list_firewalls` | List firewall rules | Read |

### Storage (3)

| Tool | Description | Type |
|---|---|---|
| `list_buckets` | List Cloud Storage buckets | Read |
| `get_bucket` | Get a Cloud Storage bucket | Read |
| `list_objects` | List objects in a storage bucket | Read |

### IAM (3)

| Tool | Description | Type |
|---|---|---|
| `list_service_accounts` | List IAM service accounts | Read |
| `list_iam_roles` | List custom IAM roles | Read |
| `get_iam_policy` | Get the project IAM policy | Read |

### Services (3)

| Tool | Description | Type |
|---|---|---|
| `list_enabled_services` | List enabled API services | Read |
| `enable_service` | Enable a GCP API service | Write |
| `disable_service` | Disable a GCP API service | Write |

### Cloud Functions (2)

| Tool | Description | Type |
|---|---|---|
| `list_functions` | List Cloud Functions | Read |
| `get_function` | Get a Cloud Function | Read |

### Cloud Run (2)

| Tool | Description | Type |
|---|---|---|
| `list_cloud_run_services` | List Cloud Run services | Read |
| `get_cloud_run_service` | Get a Cloud Run service | Read |

### Logging (1)

| Tool | Description | Type |
|---|---|---|
| `list_log_entries` | List Cloud Logging entries | Read |

### Billing (2)

| Tool | Description | Type |
|---|---|---|
| `list_billing_accounts` | List billing accounts | Read |
| `get_billing_info` | Get project billing info | Read |

### Kubernetes (2)

| Tool | Description | Type |
|---|---|---|
| `list_clusters` | List GKE clusters | Read |
| `get_cluster` | Get a GKE cluster | Read |

### Cloud SQL (2)

| Tool | Description | Type |
|---|---|---|
| `list_sql_instances` | List Cloud SQL instances | Read |
| `get_sql_instance` | Get a Cloud SQL instance | Read |

## How It Works

This plugin runs inside your Google Cloud tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
