# localization Specification

## Purpose

The Localization capability handles language detection and preference management for the userscript's interface. It ensures users see UI text in their preferred language while providing sensible defaults.

---

## Requirements

### Requirement: Smart Language Detection with Chinese Fallback

The userscript SHALL detect supported languages (`en`, `ja`, `zh-CN`, `zh-TW`) and activate the appropriate localization.
The userscript SHALL default to Traditional Chinese (`zh-TW`) for any unknown or unsupported system languages.

#### Scenario: Detected English
- **WHEN** user's system language is English (`en-US`)
- **THEN** the interface language is set to English (`en`)

#### Scenario: Detected Japanese
- **WHEN** user's system language is Japanese (`ja-JP`)
- **THEN** the interface language is set to Japanese (`ja`)

#### Scenario: Detected Simplified Chinese
- **WHEN** user's system language is Simplified Chinese (`zh-CN`)
- **THEN** the interface language is set to Simplified Chinese (`zh-CN`)

#### Scenario: Unsupported Language (Fallback)
- **WHEN** user's system language is unsupported (e.g., `fr-FR`)
- **THEN** the interface language defaults to Traditional Chinese (`zh-TW`)
