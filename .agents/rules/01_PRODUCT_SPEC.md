# Product Specification

## 1. Problem

Both users can communicate in English but become significantly less fluent when speaking under professional pressure. Existing chat-based practice is useful but does not provide a persistent training history, objective measurements, recurring mistake tracking, or a personalized practice plan.

## 2. Product goal

Build a private training dashboard where each user can repeatedly speak, receive structured feedback, and observe whether their communication is improving.

## 3. Primary training loop

```text
Choose practice
    ↓
See scenario/question
    ↓
Record answer
    ↓
Transcribe audio
    ↓
Analyze transcript + timing
    ↓
Show feedback
    ↓
Retry weak parts
    ↓
Save session
    ↓
Update recurring weaknesses
    ↓
Generate next targeted practice
```

## 4. User modes

### Interview mode

One question at a time. The system should prioritize answer quality, structure, confidence, and spontaneous speaking.

### Scenario mode

User responds to a realistic workplace situation.

Examples for Piyum:

* Explain a technical delay to a client.
* Explain why a chosen implementation is safer.
* Push back on an unrealistic deadline professionally.
* Describe a difficult bug and the solution.

Examples for wife:

* Explain a procedure to a nervous patient.
* Respond to a worried family member.
* Give a concise clinical handover using fictional practice data.
* Escalate a fictional patient concern to a senior nurse.

### Daily challenge mode

The system picks a short task based on the user's recent weaknesses.

### Free practice mode

User selects a topic and speaks without a fixed question.

## 5. Dashboard

Show:

* Current overall score
* Recent session count
* Speaking minutes
* Trend over time
* Top recurring weaknesses
* Recent improvements
* Current weekly focus
* Recommended next exercise

Do not present a single score as the truth. Scores are internal training metrics and should always be interpreted with trends and concrete examples.

## 6. Session result

Every processed session should show:

* Transcript
* Audio playback
* Overall score
* Category scores
* Key strengths
* Top 3 improvements
* Specific corrections
* Better natural alternatives
* Recurring mistakes detected
* One retry challenge

## 7. Progress model

Track at least:

* Fluency
* Grammar
* Vocabulary
* Clarity
* Professional communication
* Answer structure
* Filler-word control
* Speaking pace

Pronunciation should initially be descriptive rather than a hard score. The system can report issues only when supported by explicit evidence or later add a dedicated pronunciation model.

## 8. Personalization

The next exercise should be influenced by:

* Recent low scores
* Recurring error patterns
* Categories practiced recently
* Whether the user is over-practicing one area
* User's current professional profile

Avoid generating the exact same exercise repeatedly.

## 9. Longitudinal progress

Weekly summaries should answer:

* What improved?
* What stayed weak?
* What mistakes are becoming less frequent?
* What new issue appeared?
* How much did the user practice?
* What should the next week's focus be?

## 10. External ChatGPT support

The app should have a `Practice with ChatGPT` action that generates a copyable prompt using the user's profile, target category, current weaknesses, and desired conversation format.

MVP does not require direct OpenAI/ChatGPT API integration.

## 11. Privacy

The application should be private to the two users.

Audio files and transcripts must be user-scoped.

Users must be able to delete recordings and sessions.

For nursing practice, explicitly warn users not to enter real patient-identifying information.
