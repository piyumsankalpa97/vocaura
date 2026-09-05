# AI Evaluation Framework

## Core rule

The AI evaluates communication performance from evidence. It must not invent mistakes or claim precise pronunciation ability from a text transcript alone.

The system must distinguish:

1. Objective measurements
2. LLM judgments
3. User-specific recurring patterns

## Objective metrics

Calculate in TypeScript from transcript/timestamps when available:

* word count
* duration
* words per minute
* filler occurrences
* sentence count
* average words per sentence
* repeated phrase count where deterministic matching is reliable
* pause durations from timestamps when available

## Suggested score scale

Use 0 to 100 internally.

Interpretation:

* 0 to 39: major training need
* 40 to 59: developing
* 60 to 74: functional
* 75 to 89: strong
* 90 to 100: excellent for this training task

These are application-specific training scores. They are not official IELTS, OET, CEFR, or employer ratings.

## Category definitions

### Fluency

Measures continuity and ease of expression.

Consider:

* excessive hesitation
* repeated restarting
* unnatural fragmentation
* ability to sustain an answer

Do not penalize every pause. Natural pauses are normal.

### Grammar

Evaluate meaningful grammatical errors that affect naturalness, correctness, or professional communication.

Prioritize repeated patterns over isolated slips.

### Vocabulary

Consider:

* precision
* range appropriate to the topic
* repetition
* ability to choose natural professional wording

Do not reward unnecessarily complex vocabulary.

### Clarity

Can a listener understand the intended meaning easily?

Consider:

* ambiguous wording
* overloaded sentences
* missing context
* confusing references

### Professional communication

Consider:

* tone
* directness
* politeness
* confidence
* suitability to workplace context

### Answer structure

Consider whether the answer has a logical flow.

For interviews, STAR-like structure can be useful when appropriate but should not be forced on every question.

### Filler control

Consider unnecessary repeated fillers such as "actually", "basically", "you know", "like", etc.

Do not mark normal discourse markers as errors unless they become excessive.

## Overall score

Do not simply average categories blindly.

Suggested weighting:

```text
Fluency              20%
Grammar              15%
Vocabulary           10%
Clarity              20%
Professionalism      15%
Structure             10%
Filler control        10%
```

Pace is a supporting metric, not a primary category score.

## Evaluation JSON schema

The model must return JSON matching this conceptual structure:

```json
{
  "overall_score": 72,
  "scores": {
    "fluency": 68,
    "grammar": 74,
    "vocabulary": 70,
    "clarity": 78,
    "professionalism": 69,
    "structure": 76,
    "filler_control": 64
  },
  "objective_metrics": {
    "word_count": 145,
    "duration_seconds": 92,
    "wpm": 94,
    "filler_count": 8,
    "long_pause_count": 4
  },
  "strengths": [
    "The answer stays focused on the question.",
    "Technical ideas are explained clearly."
  ],
  "improvements": [
    {
      "priority": "high",
      "issue": "Repeated filler usage",
      "evidence": "Actually appears frequently.",
      "recommendation": "Pause silently instead of filling the gap."
    }
  ],
  "corrections": [
    {
      "heard": "I have worked in this project",
      "better": "I have worked on this project",
      "why": "Use 'work on' for projects."
    }
  ],
  "recurring_mistakes": [
    {
      "canonical_key": "project_preposition_work_on",
      "type": "preposition",
      "severity": "medium",
      "example": "worked in this project"
    }
  ],
  "retry_task": {
    "instruction": "Answer the same question again in 60 to 90 seconds.",
    "focus": "prepositions + filler control"
  }
}
```

## Evidence discipline

The model must quote only short snippets from the user's transcript as examples.

If uncertain, say the issue is uncertain.

Never fabricate a correction to satisfy a target number of feedback items.

## Pronunciation

MVP should not produce a numerical pronunciation score from the transcript.

Possible future implementation:

* word-level confidence and phonetic analysis
* dedicated pronunciation APIs/models
* user-selected target accent for intelligibility practice

Until then, use a note such as:

> Pronunciation was not scored in this session. The current analysis focuses on language and communication.

## Hallucination prevention

Before saving AI output:

1. Validate schema with Zod.
2. Clamp scores to 0 to 100.
3. Reject empty required strings.
4. Ensure correction examples can be located in the transcript when practical.
5. Never save provider output directly into trusted numerical columns without validation.

## Retry comparison

When attempt 2 exists, return:

```json
{
  "comparison": {
    "overall_delta": 6,
    "improved": [
      "Reduced filler usage"
    ],
    "still_needs_work": [
      "Long pauses before examples"
    ]
  }
}
```

The comparison must use stored attempt 1 metrics and attempt 2 metrics.
