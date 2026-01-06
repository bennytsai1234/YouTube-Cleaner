## MODIFIED Requirements
### Requirement: Keyword and Channel Blacklist
The system SHALL hide videos if their title or channel name matches user-defined keywords, supporting case-insensitive matching and cross-regional Chinese character normalization (Traditional/Simplified).

#### Scenario: Performance Optimization
- **WHEN** processing a batch of video titles
- **THEN** the character conversion MUST use an optimized lookup method (e.g., Hash Map) to minimize CPU impact.
- **AND** the conversion dictionary initialization SHALL be lazy-loaded.

#### Scenario: Traditional/Simplified Interoperability
- **Given** the user has added the keyword "预告" (Simplified) to their blocklist
- **And** the `ENABLE_REGION_CONVERT` setting is enabled
- **When** the homepage loads a video with the title "最新電影預告" (Traditional)
- **Then** the video MUST be hidden.
