## MODIFIED Requirements
### Requirement: Keyword and Channel Blacklist

The system SHALL hide videos if their title or channel name matches user-defined keywords, supporting case-insensitive matching and cross-regional Chinese character normalization (Traditional/Simplified).

#### Scenario: Keyword match
- **WHEN** a video title contains a blacklisted keyword (e.g., "crypto")
- **THEN** the video is hidden

#### Scenario: Channel match
- **WHEN** a video is from a blacklisted channel (e.g., "@SpammyChannel")
- **THEN** the video is hidden

#### Scenario: Case-insensitive matching
- **WHEN** the blacklist contains "CRYPTO"
- **AND** a video title contains "Crypto Trading 101"
- **THEN** the video is hidden (case-insensitive)

#### Scenario: Traditional/Simplified Interoperability
- **Given** the user has added the keyword "预告" (Simplified) to their blocklist
- **And** the `ENABLE_REGION_CONVERT` setting is enabled
- **When** the homepage loads a video with the title "最新電影預告" (Traditional)
- **Then** the video MUST be hidden.

#### Scenario: Reverse Interoperability
- **Given** the user has added the keyword "預告" (Traditional) to their blocklist
- **And** the `ENABLE_REGION_CONVERT` setting is enabled
- **When** the homepage loads a video with the title "最新电影预告" (Simplified)
- **Then** the video MUST be hidden.

#### Scenario: Dictionary Coverage Support
- **Given** a video title containing characters like "預", "臺", "體"
- **When** converting to Simplified Chinese
- **Then** they MUST be correctly normalized to "预", "台", "体" for reliable matching.
