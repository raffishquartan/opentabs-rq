## Purpose
Defines the observable behaviour of the WhatsApp plugin's `whatsapp__list_messages` tool so agents can read recent chat history, including media captions, as a fallback when other message sources are incomplete.

## ADDED Requirements

### Requirement: List recent messages with history loading
The tool SHALL return the most recent `limit` messages (default 20, maximum 100) of the given chat in chronological order, oldest first. When fewer than `limit` messages are held locally it SHALL load earlier history repeatedly until `limit` is reached, a load adds no messages, or a fixed maximum number of loads has run.

#### Scenario: Chat has enough history
- **WHEN** the tool is called for a chat with at least 20 messages and no `limit`
- **THEN** exactly the 20 most recent messages are returned, oldest first

#### Scenario: Limit needs several history loads
- **WHEN** `limit` is 100 and each history load adds fewer than 100 messages
- **THEN** history is loaded repeatedly and the 100 most recent messages are returned, oldest first

#### Scenario: Chat has fewer messages than the limit
- **WHEN** the chat holds only 5 messages in total
- **THEN** 5 messages are returned and no error is raised

#### Scenario: Locally held messages out of order
- **WHEN** the locally held messages are not in time order
- **THEN** the returned messages are still ordered oldest first

#### Scenario: Unknown chat
- **WHEN** the chat id does not exist
- **THEN** the tool returns its existing chat-not-found error

### Requirement: Tolerate WhatsApp Web internal changes
The tool SHALL NOT fail with an internal-property error when the history-loading facility is absent or changed. If earlier history cannot be loaded, it SHALL return the messages already available with `history_complete` false and a `history_error` describing the failure. `history_complete` SHALL be true whenever no history-loading error occurred, including when no load was needed.

#### Scenario: History loader unavailable
- **WHEN** the history-loading facility is missing or throws
- **THEN** the tool returns the locally available messages, `history_complete` is false, `history_error` states the cause, and no error is returned

#### Scenario: Loader broken and nothing held locally
- **WHEN** the history-loading facility throws and no messages are held locally
- **THEN** the tool returns an empty list with `history_complete` false and `history_error` set

#### Scenario: No load needed
- **WHEN** at least `limit` messages are already held locally
- **THEN** `history_complete` is true and no `history_error` is present

#### Scenario: History loads normally
- **WHEN** history loading succeeds
- **THEN** `history_complete` is true and no `history_error` is present

### Requirement: Local timestamp
Each message SHALL include `timestamp_local`, an ISO 8601 string with seconds and the Europe/London offset in force at that instant, alongside the existing UTC `timestamp`.

#### Scenario: Summer-time message
- **WHEN** a message was sent at 2026-07-01T11:00:00Z
- **THEN** `timestamp_local` is `2026-07-01T12:00:00+01:00`

#### Scenario: Winter-time message
- **WHEN** a message was sent at 2026-12-01T11:00:00Z
- **THEN** `timestamp_local` is `2026-12-01T11:00:00+00:00`

#### Scenario: Spring clock change
- **WHEN** messages were sent at 2026-03-29T00:59:59Z and 2026-03-29T01:00:00Z
- **THEN** their `timestamp_local` values are `2026-03-29T00:59:59+00:00` and `2026-03-29T02:00:00+01:00`

#### Scenario: Autumn clock change
- **WHEN** messages were sent at 2026-10-25T00:59:59Z and 2026-10-25T01:00:00Z
- **THEN** their `timestamp_local` values are `2026-10-25T01:59:59+01:00` and `2026-10-25T01:00:00+00:00`

### Requirement: Text and media type
Each message SHALL include `text` and `media_type`. `text` SHALL be the body for text messages, the caption (empty if none) for image, video and document messages, and empty for every other media type. `text` SHALL never contain thumbnail or other binary-encoded data. `media_type` SHALL be null for text messages and otherwise be WhatsApp's raw message type (for example `image`, `ptt` for a voice note, `sticker`, `location`). The raw `body` field SHALL NOT be returned.

#### Scenario: Captioned image
- **WHEN** an image message has caption "Receipt - 12.40"
- **THEN** `text` is "Receipt - 12.40" and `media_type` is "image"

#### Scenario: Uncaptioned image
- **WHEN** an image message has no caption
- **THEN** `text` is empty and `media_type` is "image"

#### Scenario: Media type without captions
- **WHEN** a message is a voice note, sticker or location
- **THEN** `text` is empty and `media_type` is `ptt`, `sticker` or `location` respectively

#### Scenario: Plain text message
- **WHEN** a message is plain text
- **THEN** `text` is the message text and `media_type` is null

### Requirement: Sender attribution
Each message SHALL include `sender` (an id) and `sender_name`. In group chats the sender SHALL be the individual author; in 1:1 chats an incoming message's sender SHALL be the other party; a message sent by the user SHALL have the user as sender. `sender_name` SHALL be the contact's saved name, else their self-declared name, else their short name, else empty.

#### Scenario: Group message
- **WHEN** a message in a group chat was authored by a participant saved in contacts
- **THEN** `sender` identifies that participant, not the group, and `sender_name` is the saved name

#### Scenario: Incoming 1:1 message from an unsaved contact
- **WHEN** an incoming 1:1 message comes from a contact with no saved name but a self-declared name
- **THEN** `sender` identifies the other party and `sender_name` is the self-declared name

#### Scenario: Own message
- **WHEN** a message was sent by the user
- **THEN** `from_me` is true and `sender` identifies the user
