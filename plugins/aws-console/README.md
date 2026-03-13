# AWS Console

OpenTabs plugin for AWS Console — gives AI agents access to AWS Console through your authenticated browser session.

## Install

```bash
opentabs plugin install aws-console
```

Or install globally via npm:

```bash
npm install -g @opentabs-dev/opentabs-plugin-aws-console
```

## Setup

1. Open [console.aws.amazon.com](https://console.aws.amazon.com) in Chrome and log in
2. Open the OpenTabs side panel — the AWS Console plugin should appear as **ready**

## Tools (16)

### Account (2)

| Tool | Description | Type |
|---|---|---|
| `get_current_user` | Get the authenticated AWS user profile | Read |
| `list_regions` | List all available AWS regions | Read |

### EC2 (7)

| Tool | Description | Type |
|---|---|---|
| `list_instances` | List EC2 instances in the current region | Read |
| `describe_instance` | Get details of a specific EC2 instance | Write |
| `start_instance` | Start a stopped EC2 instance | Write |
| `stop_instance` | Stop a running EC2 instance | Write |
| `list_security_groups` | List EC2 security groups | Read |
| `list_vpcs` | List VPCs in the current region | Read |
| `list_subnets` | List VPC subnets in the current region | Read |

### Lambda (3)

| Tool | Description | Type |
|---|---|---|
| `list_functions` | List Lambda functions in the current region | Read |
| `get_function` | Get details of a specific Lambda function | Read |
| `invoke_function` | Invoke a Lambda function with a JSON payload | Write |

### IAM (2)

| Tool | Description | Type |
|---|---|---|
| `list_iam_users` | List IAM users in the account | Read |
| `list_iam_roles` | List IAM roles in the account | Read |

### CloudWatch (2)

| Tool | Description | Type |
|---|---|---|
| `list_alarms` | List CloudWatch alarms in the current region | Read |
| `list_log_groups` | List CloudWatch Logs log groups | Read |

## How It Works

This plugin runs inside your AWS Console tab through the [OpenTabs](https://opentabs.dev) Chrome extension. It uses your existing browser session — no API tokens or OAuth apps required. All operations happen as you, with your permissions.

## License

MIT
