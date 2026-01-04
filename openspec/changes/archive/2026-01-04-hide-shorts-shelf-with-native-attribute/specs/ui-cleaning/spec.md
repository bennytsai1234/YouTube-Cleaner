## MODIFIED Requirements
### Requirement: Component Toggle
The system SHALL allow users to toggle visibility for specific UI components (Shorts shelf, Community posts, Breaking News).

#### Scenario: Hide Shorts shelf
- **WHEN** the "Shorts Section" rule is enabled
- **THEN** `ytd-rich-shelf-renderer` containers containing Shorts (detected by `is-shorts` attribute or text matching) are hidden via CSS `:has()` selector or JavaScript filtering

#### Scenario: Hide community posts
- **WHEN** the "Community Posts" rule is enabled
- **THEN** sections containing "貼文" or "Posts" are hidden

#### Scenario: Hide breaking news
- **WHEN** the "News Block" rule is enabled
- **THEN** sections containing "新聞快報" or "Breaking News" are hidden

#### Scenario: Rule independence
- **WHEN** user disables the "Shorts Section" rule
- **AND** enables the "Shorts Items" rule
- **THEN** Shorts are hidden only within video grids, not as section headers
