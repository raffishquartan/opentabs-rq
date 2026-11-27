# plugin-tab-provisioning Specification

## Purpose
Defines when the platform opens a plugin's site tab automatically so plugin tools can run without the caller opening the first tab by hand.

## Requirements

### Requirement: Opt-in setting
Automatic tab opening SHALL be disabled by default and enabled only by a user setting. When disabled, a call with no matching tab SHALL fail with the existing "tab closed" error.

#### Scenario: Default configuration
- **WHEN** the setting has not been configured and a plugin tool is called with no matching tab
- **THEN** no tab opens and the call fails as it does today

### Requirement: Open site tab on demand
When the setting is enabled, the call has passed its permission check, the caller gave neither a tab id nor an instance, and the browser reports no matching tab for the plugin, the platform SHALL open the plugin's homepage in a background tab, wait for it to become ready, and run the tool once in that tab.

#### Scenario: No tab open
- **WHEN** a permitted plugin tool is called and no tab matches the plugin
- **THEN** the homepage opens in a background tab without taking focus, and after it becomes ready the tool runs in it and returns its result

#### Scenario: A matching tab exists
- **WHEN** at least one matching tab exists, ready or not
- **THEN** no new tab is opened

#### Scenario: Tab id or instance given
- **WHEN** the call specifies a tab id or an instance and that tab or instance has no open tab
- **THEN** no tab is opened and the existing error is returned unchanged

#### Scenario: Progress reported
- **WHEN** a tab is opened for a call whose client supplied a progress token
- **THEN** the caller receives a progress notification naming the URL being opened

### Requirement: No opening without permission
A tab SHALL NOT be opened for a call whose permission is `off`, whose approval was denied or timed out, or whose plugin is unreviewed.

#### Scenario: Denied call
- **WHEN** the user denies an `ask` call for a plugin with no tab
- **THEN** no tab is opened

#### Scenario: Approval timed out
- **WHEN** an `ask` call for a plugin with no tab times out awaiting approval
- **THEN** no tab is opened

### Requirement: Disabled when permissions are skipped
While permission checks are skipped (the dangerous skip-permissions mode), the platform SHALL NOT open tabs automatically, and a call with no matching tab SHALL fail with the existing "tab closed" error unchanged.

#### Scenario: Skip-permissions active
- **WHEN** the setting is enabled, permissions are skipped, and a plugin tool is called with no matching tab
- **THEN** no tab opens and the call fails exactly as it does today

### Requirement: Only a safe, declared homepage
The opened URL SHALL be the plugin's resolved homepage and nothing supplied by tool input. The platform SHALL open it only if its scheme is `https`, or `http` with host `localhost` or `127.0.0.1`, and it matches the plugin's URL patterns under the same rules used to match tabs, including the plugin's exclude patterns. Otherwise the call SHALL fail with the existing "tab closed" error followed by a sentence stating why no tab was opened. A plugin with no homepage SHALL fail with the existing "tab closed" error unchanged.

#### Scenario: Tool input contains a URL
- **WHEN** a tool call includes a URL-like parameter
- **THEN** the opened tab URL is still the plugin homepage

#### Scenario: Homepage outside the plugin's patterns
- **WHEN** the homepage does not match any of the plugin's URL patterns
- **THEN** no tab opens and the error says the homepage does not match

#### Scenario: Homepage hits an exclude pattern
- **WHEN** the homepage matches one of the plugin's URL patterns and also one of its exclude patterns
- **THEN** no tab opens and the error says the homepage does not match

#### Scenario: Insecure homepage
- **WHEN** the homepage uses `http` on a host other than localhost
- **THEN** no tab opens and the error says the homepage is not allowed

#### Scenario: No homepage declared
- **WHEN** a tool is called on a plugin with no homepage and no tab
- **THEN** the call fails exactly as it does today

### Requirement: Bounded readiness wait
The platform SHALL wait at most the configured bound (default 15 seconds) for the opened tab to become ready. On expiry it SHALL return an error stating that a tab was opened, naming it, and that the plugin is not ready, and the opened tab SHALL remain open.

#### Scenario: Sign-in required
- **WHEN** the homepage opens but the plugin does not become ready because the user is signed out
- **THEN** the call returns the not-ready error naming the tab so the caller can sign in and retry

#### Scenario: Tab closed during the wait
- **WHEN** the user closes the opened tab before it becomes ready
- **THEN** the call returns the existing "tab closed" error

### Requirement: At most one auto-opened tab per plugin
Within one browser profile, simultaneous calls for the same plugin SHALL open at most one tab. While a tab previously opened for a plugin in a profile still exists, the platform SHALL NOT open another for that plugin in that profile, and SHALL NOT open a new tab for a plugin in a profile within a cooldown period after the last one there.

#### Scenario: Two parallel calls
- **WHEN** two calls for the same plugin start while no tab exists
- **THEN** one tab opens and both calls run in it

#### Scenario: Homepage redirects away from the plugin's patterns
- **WHEN** an opened tab redirected to a sign-in page outside the plugin's URL patterns and the tool is called again
- **THEN** no second tab opens and the call returns the not-ready error naming the existing tab

#### Scenario: Within cooldown after the user closed the tab
- **WHEN** the user closes the auto-opened tab and the tool is called again within the cooldown
- **THEN** no tab opens and the call fails with the "tab closed" error

### Requirement: Browser profile choice
With one browser profile connected, the tab SHALL open in it. With several connected, the tab SHALL open in the configured default profile; if no default is configured, or it is not connected, the call SHALL fail with an error naming the setting and the connected profiles.

#### Scenario: Several profiles, default configured
- **WHEN** two profiles are connected, neither has a matching tab, and the default profile setting names one of them
- **THEN** the tab opens in that profile and the tool runs there

#### Scenario: Several profiles, no default
- **WHEN** two profiles are connected, neither has a matching tab, and no default profile is configured
- **THEN** no tab opens and the error names the setting and the connected profiles

### Requirement: Homepage visible in review
The plugin review output SHALL include the plugin's homepage and URL patterns.

#### Scenario: Inspecting a plugin
- **WHEN** a plugin is inspected for review
- **THEN** the output shows its homepage (or that it has none) and its URL patterns
