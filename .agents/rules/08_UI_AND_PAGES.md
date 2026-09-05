# UI and Page Structure

## Visual direction

The app should feel like a calm personal coaching dashboard, not a gamified children's language app.

Use:

* clean whitespace
* strong typography
* restrained color palette
* clear progress visualization
* obvious primary actions
* mobile-friendly recording controls

## Routes

```text
/
/login
/onboarding
/dashboard
/practice
/practice/[sessionId]
/session/[sessionId]
/progress
/mistakes
/settings
```

## Login

Simple:

* email
* password
* sign in
* sign up
* validation

## Dashboard

Desktop layout:

```text
+------------------------------------------------+
| Good morning, Piyum              Profile       |
+------------------------------------------------+
| Overall         Speaking       Sessions        |
| 68 ↑            42 min         8              |
+------------------------------------------------+
| Progress trend                                  |
|                                               |
|        chart                                  |
|                                               |
+-----------------------+------------------------+
| Current focus         | Recommended challenge |
| Filler control        | Explain a tech issue  |
+-----------------------+------------------------+
| Recurring weaknesses                          |
| Actually x12  | Prepositions x7 | Structure  |
+------------------------------------------------+
```

## Practice page

Show:

* mode tabs
* category
* difficulty
* scenario
* target skill
* time suggestion
* recording control

Primary control:

`Start recording`

After recording:

`Submit for analysis`

## Recording state

Show:

* elapsed time
* microphone indicator
* waveform or simple activity indicator
* pause/resume
* stop

Do not build a complex waveform visualizer in MVP.

## Processing state

Show explicit stages:

```text
Uploading ✓
Transcribing …
Analyzing …
Saving results …
```

## Session result page

Top section:

```text
Overall
72 / 100

Good progress. Your answer was clear, but hesitation and filler words reduced fluency.
```

Then category cards.

Then:

### What you did well

### What to improve

### Better wording

### Recurring mistakes

### Try again

## Progress page

Charts:

1. Overall score trend
2. Category comparison
3. Practice minutes
4. Session volume

Allow 7d/30d/90d/all-time.

## Mistakes page

Searchable list.

Each row:

```text
Preposition
"worked in this project"
→ "worked on this project"
7 occurrences
Last seen yesterday
```

Add `Practice this` button.

## Settings

* Profile
* Goals
* AI provider status
* Data export
* Delete audio
* Delete account
* Privacy notice

## Mobile

The recording experience should be designed mobile-first even if the dashboard is desktop-oriented.

Buttons must be large enough to tap comfortably.
