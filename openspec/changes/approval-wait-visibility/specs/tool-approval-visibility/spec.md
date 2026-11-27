## Purpose
Defines what a caller observes while a plugin tool call waits for `ask` approval, the optional approval timeout, and withdrawal of settled prompts, so agents can distinguish a pending approval from a slow or hung tool.

## ADDED Requirements

### Requirement: Approval wait heartbeat
While a plugin tool call awaits `ask` approval and the client supplied a progress token, the server SHALL send a progress notification immediately and then periodically (every 10 seconds) until the approval settles. Each notification SHALL state that approval is awaited in the OpenTabs side panel and the time elapsed, and SHALL include the time remaining when an approval timeout is configured. Every progress notification sent for the call, including the tool's own progress after approval, SHALL carry a progress value strictly greater than the previous one for that progress token.

#### Scenario: Long wait without timeout
- **WHEN** a plugin tool with permission `ask` is called with a progress token, no timeout is configured, and the user responds after 35 seconds
- **THEN** the caller receives an immediate notification and further notifications at about 10, 20 and 30 seconds stating approval is still awaited and the time elapsed, and the tool then runs

#### Scenario: Wait with timeout configured
- **WHEN** the approval timeout is 120 seconds and 30 seconds have elapsed
- **THEN** the heartbeat message states about 90 seconds remain

#### Scenario: Tool reports progress after a long approval wait
- **WHEN** three heartbeats were sent and the approved tool then reports progress 1 of 5
- **THEN** the forwarded notification's progress value is greater than the last heartbeat's

#### Scenario: No progress token
- **WHEN** the client supplied no progress token
- **THEN** no progress notifications are sent and the approval flow is otherwise unchanged

### Requirement: Optional approval timeout
A plugin tool call awaiting `ask` approval SHALL fail once the configured approval timeout elapses without a decision. The timeout SHALL default to 0, meaning no timeout. An invalid configured value SHALL be treated as 0. A changed value SHALL apply to calls started after the config is reloaded.

#### Scenario: Default configuration
- **WHEN** no timeout is configured and the user responds after several minutes
- **THEN** the decision is honoured and no timeout error is returned

#### Scenario: No decision before timeout
- **WHEN** a timeout is configured and the user does not respond within it
- **THEN** the call returns the timeout error and the tool does not execute

#### Scenario: Decision before timeout
- **WHEN** a timeout is configured and the user approves within it
- **THEN** the tool executes normally and no timeout error follows later

#### Scenario: Invalid configured value
- **WHEN** the configured timeout is negative, fractional or not a number
- **THEN** no timeout applies

### Requirement: Distinguishable timeout result
The timeout error SHALL state that approval was not given in time, that the tool did not run, and that the caller may retry, in text distinguishable from denial, extension disconnection and tool errors. Other approval failures SHALL keep their existing results.

#### Scenario: Agent reads the timeout error
- **WHEN** a call times out awaiting approval
- **THEN** the error text identifies an approval timeout, not a denial, a disconnection or a tool failure

#### Scenario: Extension disconnects while waiting
- **WHEN** the last extension connection drops while approval is pending
- **THEN** the call returns the existing "extension is not connected" result, not the timeout error

### Requirement: Settled prompts withdrawn
When a pending approval settles by allow, deny or timeout, the prompt SHALL be removed from the side panel and badge of every connected browser profile, SHALL NOT reappear when the side panel is reopened, and a decision submitted afterwards for that prompt SHALL NOT execute anything or change any permission.

#### Scenario: Answered in one of two profiles
- **WHEN** two browser profiles show the same prompt and the user allows it in one
- **THEN** the prompt and its badge disappear from the other profile

#### Scenario: Timed-out prompt
- **WHEN** a prompt times out
- **THEN** it disappears from every side panel and does not return when the side panel is reopened

#### Scenario: Late approval click
- **WHEN** the user clicks Allow or "always allow" on a prompt whose call already settled
- **THEN** nothing executes and the tool's permission is unchanged

### Requirement: Browser tools unchanged
Approval for browser tools SHALL behave as before this change: a single initial progress notification, no heartbeat and no timeout.

#### Scenario: Browser tool awaiting approval with timeout configured
- **WHEN** a browser tool with permission `ask` is called, a timeout is configured, and the user responds after the timeout has elapsed
- **THEN** the decision is honoured and only the initial progress notification was sent
