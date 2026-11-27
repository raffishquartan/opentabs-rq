## ADDED Requirements

### Requirement: Screenshot returned as an MCP image content part
When `browser_screenshot_tab` is called without `filePath`, the tool result SHALL contain a single MCP image content part with the base64 PNG data and MIME type `image/png`, not a JSON text part holding base64. An empty or malformed image payload from the extension SHALL produce a tool error naming the payload type, without echoing the payload.

#### Scenario: Default screenshot
- **WHEN** `browser_screenshot_tab` is called with only `tabId`
- **THEN** the result content is one part of type `image` with MIME type `image/png` and the PNG data

#### Scenario: Malformed payload
- **WHEN** the extension returns no image string or an empty one
- **THEN** the call returns an error stating the expected and received payload types

### Requirement: Screenshot written to a file on request
When `browser_screenshot_tab` is called with an absolute `filePath`, the server SHALL write the PNG bytes to that path and the result SHALL be a single text part holding `{savedTo, bytes}`. A relative path or a write failure SHALL produce a tool error.

#### Scenario: Absolute file path
- **WHEN** `browser_screenshot_tab` is called with an absolute `filePath` in an existing writable directory
- **THEN** the PNG is written there and the result is a text part with `savedTo` equal to the path and `bytes` equal to the file size

#### Scenario: Non-writable path
- **WHEN** the parent directory of `filePath` is not writable
- **THEN** the call returns an error and no image part is returned

### Requirement: CLI renders image content parts
The `opentabs tool call` command SHALL print text parts verbatim, SHALL save each image part to a temporary file and print a line naming its MIME type, approximate size and saved path, and SHALL print a marker for any malformed or unknown part instead of dropping it.

#### Scenario: Image part in a CLI tool call
- **WHEN** `opentabs tool call browser_screenshot_tab` returns an image part
- **THEN** the image is saved to a temporary `.png` file and the output names that path

#### Scenario: Malformed part
- **WHEN** a tool result contains an image part without data
- **THEN** the output contains a malformed-part marker with the part's index
