## MODIFIED Requirements
### Requirement: Keyword and Channel Blacklist
The system SHALL hide videos if their title or channel name matches user-defined keywords, utilizing pre-compiled Regular Expressions for high-performance and cross-regional matching.

#### Scenario: Regex-based matching
- **WHEN** the user defines a keyword "预告"
- **THEN** the system MUST compile it into a pattern matching both "预" and "預".
- **AND** matching against a title "最新預告" MUST succeed without runtime string conversion.

#### Scenario: Mixed script support
- **WHEN** a title contains mixed variants (e.g. "预告片" where '预' is Simp and '告' is Trad - rare but possible)
- **THEN** the regex matcher `/[预預][告告]/` MUST still identify the keyword.

#### Scenario: Zero allocation
- **WHEN** scrolling through the feed
- **THEN** the filtering logic SHOULD NOT allocate new strings for title conversion, relying instead on `RegExp.test()` on the original string.
