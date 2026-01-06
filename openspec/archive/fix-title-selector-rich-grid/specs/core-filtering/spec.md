## MODIFIED Requirements
### Requirement: Video Metadata Extraction
The system SHALL accurately extract video metadata (title, channel, view count, duration) from all supported YouTube layout types, including standard lists, grids, and `yt-lockup-view-model` components.

#### Scenario: Rich Grid Title Extraction
- **GIVEN** a video element with the class `yt-lockup-view-model`
- **WHEN** the title is contained in a `h3` element with a `title` attribute
- **THEN** the system MUST extract the full title from the `title` attribute.
