# RELAY — Material 3 Android UI/UX Design System

> **Product:** Relay  
> **Platform:** Android  
> **Product type:** AI-powered developer project-management ecosystem  
> **Primary experience:** React Native mobile app  
> **Supporting ecosystem:** VS Code extension + Go backend + CI/CD monitoring  
> **Design direction:** Deep Material 3, calm, premium, focused, quietly intelligent  
> **Document purpose:** Single source of truth for UI/UX, design tokens, component behavior, screen composition, accessibility, motion, and implementation decisions.

---

## 0. Design North Star

### 0.1 The product promise

Relay should feel like a calm technical companion that understands a developer's work without demanding attention.

The interface should communicate:

- **I know what matters.**
- **I will not interrupt you unnecessarily.**
- **I can explain technical activity in plain language.**
- **I can surface action without creating anxiety.**
- **I can be used one-handed, quickly, and hands-free.**
- **I always tell you what happened and why.**

Relay is not a generic productivity dashboard.

It is a **developer command center with a human, voice-first layer**.

### 0.2 Emotional direction

The desired emotional sequence is:

**Calm → Aware → Confident → In control**

Avoid:

- aggressive DevOps dashboard aesthetics
- neon cyberpunk styling
- excessive dark glassmorphism
- high-frequency animations
- dense monitoring walls
- unnecessary gradients
- sharp alert-heavy visuals
- gamification
- overly playful illustrations
- visual noise

### 0.3 Visual keywords

**Calm / Intelligent / Technical / Premium / Soft Pink / Deep Dark / Precise / Trustworthy / Spacious / Ambient**

---

# 1. Material 3 Principles for Relay

Relay uses Material 3 as the foundational design language rather than inventing a separate component system.

Core principles:

1. Use semantic color roles rather than hard-coded colors.
2. Use tonal surfaces and elevation instead of heavy borders and shadows.
3. Use a consistent type scale.
4. Use familiar Android interaction patterns.
5. Prefer adaptive layouts over device-specific layouts.
6. Make accessibility part of the component design.
7. Use motion to explain change, not decorate it.
8. Keep primary actions obvious and secondary actions quiet.
9. Preserve user context during navigation and state changes.
10. Allow Relay's AI personality to appear through language, sound, and subtle motion rather than cartoonish UI.

Relay's brand layer sits above Material 3:

> **Material 3 foundation + Relay semantic language + developer-focused information architecture.**

---

# 2. Brand System

## 2.1 Brand name

**Relay**

Use the brand name exactly as:

`Relay`

Do not use:

- RELAY in normal interface copy
- Relay AI
- Relay Assistant
- Hey AI

Use **Hey Relay** only for the voice assistant invocation.

## 2.2 Brand concept

"Relay" represents information being passed between:

**Developer ↔ Code ↔ CI/CD ↔ Team ↔ AI**

The UI should visually reinforce continuity and flow.

## 2.3 Color ratio

Target the overall visual balance approximately as:

```text
60% deep neutral surfaces
25% soft pink / rose brand accents
10% calm mint / tertiary accents
5% warning, error, and other semantic states
```

Pink should not be applied to every interactive element. Preserve large quiet areas so important events feel intentional.

## 2.4 Logo usage

The Relay logo should be:

- simple
- geometric
- recognizable at 24dp
- usable as a launcher icon
- usable in monochrome
- readable in light and dark theme

Logo should not carry critical meaning that is unavailable elsewhere.

---

# 3. Color Architecture

## 3.1 Color strategy

Relay uses a **calm indigo-blue primary** with a restrained **mint/teal tertiary**.

The primary is intentionally less saturated than a typical SaaS blue.

The tertiary is reserved for:

- healthy states
- voice activity
- subtle system status
- positive progress
- low-emphasis accents

Error remains standard semantic red.

Do not color every card using brand colors.

Most of the interface should live on neutral surfaces.

---

## 3.2 Light theme

### Primary tonal palette

| Token | Value | Usage |
|---|---:|---|
| Primary | `#445E91` | Main actions |
| On Primary | `#FFFFFF` | Content on primary |
| Primary Container | `#D9E2FF` | Selected/soft emphasis |
| On Primary Container | `#001A41` | Content on primary container |
| Primary Fixed | `#D9E2FF` | Fixed tonal accent |
| On Primary Fixed | `#001A41` | Fixed primary text |
| Inverse Primary | `#B2C5FF` | Content on inverse surfaces |

### Secondary tonal palette

| Token | Value | Usage |
|---|---:|---|
| Secondary | `#585E71` | Secondary actions |
| On Secondary | `#FFFFFF` | Content |
| Secondary Container | `#DDE2F9` | Chips, filters, supporting emphasis |
| On Secondary Container | `#151B2C` | Content |

### Tertiary tonal palette

| Token | Value | Usage |
|---|---:|---|
| Tertiary | `#38665A` | Healthy/active accents |
| On Tertiary | `#FFFFFF` | Content |
| Tertiary Container | `#BDEFE1` | Soft positive/ambient state |
| On Tertiary Container | `#002019` | Content |

### Error

| Token | Value | Usage |
|---|---:|---|
| Error | `#BA1A1A` | Errors, failed states |
| On Error | `#FFFFFF` | Content |
| Error Container | `#FFDAD6` | Error backgrounds |
| On Error Container | `#410002` | Error content |

---

## 3.3 Dark neutral surface palette

Relay's dark theme should never use pure black as the default page surface. Use near-black plum/charcoal tones to maintain depth and readable tonal separation.

| Token | Value | Usage |
|---|---:|---|
| Background | `#0F0D12` | App background |
| On Background | `#F2EAF0` | Main text |
| Surface | `#151218` | Default surface |
| Surface Dim | `#0F0D12` | Lowest emphasis |
| Surface Bright | `#312933` | Bright surface |
| Surface Container Lowest | `#0B0A0E` | Deep technical/log surfaces |
| Surface Container Low | `#19151B` | Low container |
| Surface Container | `#1D1920` | Standard cards |
| Surface Container High | `#272129` | Elevated cards |
| Surface Container Highest | `#312933` | Highest tonal container |
| On Surface | `#F2EAF0` | Main content |
| On Surface Variant | `#C9BEC6` | Supporting content |
| Outline | `#958690` | Borders |
| Outline Variant | `#51474E` | Low-emphasis separators |

---

## 3.4 Dark theme

Dark mode is Relay's primary visual identity.

It is not "pure black mode"; the interface uses near-black plum/charcoal surfaces so hierarchy can be created through Material 3 tonal elevation.

| Token | Value |
|---|---:|
| Primary | `#B2C5FF` |
| On Primary | `#132F60` |
| Primary Container | `#2B4678` |
| On Primary Container | `#D9E2FF` |
| Secondary | `#C1C5DD` |
| On Secondary | `#2A2F42` |
| Secondary Container | `#414659` |
| On Secondary Container | `#DDE2F9` |
| Tertiary | `#A1D3C6` |
| On Tertiary | `#06372E` |
| Tertiary Container | `#1F4E44` |
| On Tertiary Container | `#BDEFE1` |
| Error | `#FFB4AB` |
| On Error | `#690005` |
| Error Container | `#93000A` |
| On Error Container | `#FFDAD6` |
| Background | `#121318` |
| On Background | `#E3E2E9` |
| Surface | `#121318` |
| Surface Dim | `#121318` |
| Surface Container Lowest | `#0D0E13` |
| Surface Container Low | `#1A1B20` |
| Surface Container | `#1E1F25` |
| Surface Container High | `#292A30` |
| Surface Container Highest | `#34353B` |
| On Surface | `#E3E2E9` |
| On Surface Variant | `#C5C6D0` |
| Outline | `#8F9099` |
| Outline Variant | `#45464F` |

---

## 3.5 Brand color rules

- Soft pink is Relay's primary brand cue.
- Use pink for primary actions, selected states, key assistant moments, and subtle focus.
- Do not use hot pink, magenta neon, or pure saturated fuchsia as the default.
- Do not tint every surface pink.
- Mint is a supporting semantic accent, not a second primary brand.
- Error/warning colors must remain semantically distinct from pink.
- Accessibility/contrast wins over exact brand color matching when necessary.

# 4. Semantic Product Colors

Never make product state depend on color alone.

Use icon + label + color + optional supporting text.

## 4.1 State mapping

| Relay state | Semantic role | Icon suggestion |
|---|---|---|
| Healthy | Tertiary | `check_circle` |
| Active | Primary | `radio_button_checked` |
| Running | Primary | `progress_activity` |
| Attention | Secondary/Tertiary depending on context | `priority_high` |
| Warning | Amber semantic accent | `warning` |
| Failed | Error | `error` |
| Offline | On Surface Variant | `cloud_off` |
| Unknown | On Surface Variant | `help` |
| Muted | On Surface Variant | `notifications_off` |

Warning is a semantic exception: it may use a restrained amber tone because yellow/amber is not reliably represented by standard Material roles in every theme.

Suggested warning tokens:

Light:
- Warning: `#7A5900`
- Warning Container: `#FFDEA6`
- On Warning Container: `#261900`

Dark:
- Warning: `#F0BF4F`
- Warning Container: `#5D4300`
- On Warning Container: `#FFDEA6`

---

# 5. Dynamic Color

On supported Android devices, Relay should respect Android dynamic color when enabled by the product theme strategy.

Priority:

1. User-selected Relay theme mode
2. Dynamic color when enabled
3. Relay fallback palette

Dynamic color must preserve semantic meaning:

- error remains distinguishable as error
- success remains distinguishable as healthy
- primary remains usable for actions
- text remains readable
- voice activity remains identifiable

Never assume a fixed blue value when reading a semantic token in code.

Use:

```ts
colors.primary
colors.onPrimary
colors.primaryContainer
colors.onPrimaryContainer
```

not:

```ts
'#445E91'
```

inside components.

---

# 6. Typography

## 6.1 Font

Primary Android typeface:

**Roboto Flex / Roboto**

Recommended default:

**Roboto**

Use system font metrics wherever possible.

Do not introduce decorative display fonts.

Relay is a technical product. Typography should feel calm and engineered.

---

## 6.2 Type scale

| Role | Size | Line height | Weight |
|---|---:|---:|---:|
| Display Large | 57sp | 64sp | 400 |
| Display Medium | 45sp | 52sp | 400 |
| Display Small | 36sp | 44sp | 400 |
| Headline Large | 32sp | 40sp | 400 |
| Headline Medium | 28sp | 36sp | 400 |
| Headline Small | 24sp | 32sp | 400 |
| Title Large | 22sp | 28sp | 400 |
| Title Medium | 16sp | 24sp | 500 |
| Title Small | 14sp | 20sp | 500 |
| Body Large | 16sp | 24sp | 400 |
| Body Medium | 14sp | 20sp | 400 |
| Body Small | 12sp | 16sp | 400 |
| Label Large | 14sp | 20sp | 500 |
| Label Medium | 12sp | 16sp | 500 |
| Label Small | 11sp | 16sp | 500 |

---

## 6.3 Typography behavior

### Headings

Use sentence case.

Good:

> Build status

Avoid:

> BUILD STATUS

### Technical data

For:

- commit SHA
- branch
- build ID
- pipeline name
- command output
- error snippets

Use a monospace font such as:

**Roboto Mono**

Technical strings may use:

- 12sp
- 13sp
- 14sp

Do not make entire cards monospace.

### Numbers

Large project metrics may use Title Large or Headline Small.

Example:

**18**

`Open PRs`

Avoid excessive dashboard-number styling.

---

# 7. Layout Foundation

## 7.1 Grid

Use a 4dp base grid.

Primary spacing scale:

```text
4dp
8dp
12dp
16dp
20dp
24dp
28dp
32dp
40dp
48dp
56dp
64dp
80dp
```

Most common values:

- 8dp: icon gaps, compact controls
- 12dp: internal compact spacing
- 16dp: standard padding
- 24dp: section separation
- 32dp: major grouping
- 48dp: hero/voice separation
- 64dp: major screen rhythm

---

## 7.2 Content margins

Phone compact:

```text
Start: 16dp
End: 16dp
```

Large/expanded:

```text
Minimum horizontal padding: 24dp
Maximum readable content width: ~840dp
```

Do not stretch paragraphs across the entire tablet width.

---

# 8. Shape System

Relay uses Material 3 rounded shapes, but not excessively rounded "startup UI".

## 8.1 Shape tokens

```text
None:            0dp
Extra Small:     4dp
Small:           8dp
Medium:          12dp
Large:           16dp
Extra Large:     28dp
Full:            999dp
```

## 8.2 Usage

| Shape | Usage |
|---|---|
| 4dp | Small technical containers |
| 8dp | Inputs, compact cards |
| 12dp | Standard cards |
| 16dp | Feature cards |
| 28dp | Bottom sheets, hero containers |
| Full | Chips, pills, FAB-like circular controls |

Avoid putting 28dp radius on every card.

---

# 9. Elevation and Surfaces

Relay should prefer **tonal elevation**.

Default strategy:

- page = background
- cards = surface containers
- selected/active = container with stronger tonal contrast
- modal = elevated surface
- FAB = actual elevation + shadow
- bottom sheet = tonal elevation + subtle shadow

Avoid:

```css
box-shadow: 0 20px 60px rgba(...)
```

especially on dark mode.

Depth should feel like Material, not web dashboard glassmorphism.

---

# 10. Borders

Borders are supporting elements, not the primary source of hierarchy.

Default:

```text
Outline Variant @ ~1dp
```

Use borders for:

- text fields
- technical tables
- dividers where needed
- selected outlines
- contrast against adjacent surfaces

Don't outline every card.

---

# 11. Icons

Use **Material Symbols**.

Preferred style:

- rounded icons
- 24dp default
- 20dp compact
- 32dp prominent
- 40–48dp hero usage

Examples:

```text
home
folder
merge
terminal
rocket_launch
bug_report
notifications
mic
graphic_eq
groups
account_circle
settings
check_circle
error
warning
schedule
cloud
sync
code
commit
science
developer_mode
```

Never use emoji as primary interface icons.

---

# 12. Icon + Label Rule

Icons should support meaning.

Good:

`check_circle  Tests passed`

Bad:

`check_circle`

with no accessible label or obvious context.

For navigation:

- icon
- short label
- selected state

must remain available.

---

# 13. Navigation Architecture

Primary destinations:

1. **Home**
2. **Projects**
3. **Activity**
4. **Assistant**

Secondary destinations:

- Notifications
- Team
- CI/CD
- Integrations
- Settings
- Account

On compact Android phones, use a Material 3 navigation bar.

Suggested navigation labels:

```text
Home
Projects
Activity
Assistant
```

Do not create 6–8 primary bottom tabs.

---

## 13.1 Navigation hierarchy

```text
Home
├── Project summary
├── Recent activity
├── Pipeline status
└── Assistant entry

Projects
├── Project list
└── Project detail
    ├── Overview
    ├── Pipelines
    ├── Activity
    ├── Pull Requests
    └── Team

Activity
├── All
├── Code
├── CI/CD
├── Team
└── Mentions

Assistant
├── Voice
├── Conversation
└── Suggestions
```

Settings and account should remain secondary.

---

# 14. Adaptive Android Layout

Relay must adapt to window size rather than being locked to a phone-only canvas.

Use Material/Android window size classes for responsive behavior.

Recommended behavior:

### Compact

Approximate phone portrait layout.

```text
NavigationBar
Single-column content
Full-width cards
One primary action
```

### Medium

Approximate tablet portrait / large phone / constrained window.

```text
NavigationRail OR navigation bar
Two-column opportunities where useful
Wider content containers
```

### Expanded

Approximate tablet landscape / large screen.

```text
NavigationRail
Multi-pane project views
Persistent secondary panel where useful
```

Don't stretch the compact bottom navigation design across large screens.

For adaptive layouts, use:

- reflow
- reveal
- presentation change

instead of maintaining separate device-specific screen implementations.

---

# 15. Home Screen

## 15.1 Purpose

The Home screen answers:

> **"What do I need to know right now?"**

It should not become a full analytics dashboard.

---

## 15.2 Home structure

```text
Top App Bar
    Greeting / context
    Notifications

Hero
    Hey Relay
    "Good morning. 2 things need your attention."

Primary summary
    Current project
    Build state

Attention
    Failed pipeline
    Review request
    Mention

Recent activity
    Compact timeline

Team pulse
    Team updates

Bottom navigation
```

---

# 16. Home Hero — Hey Relay

The voice assistant should be visually distinctive without becoming a cartoon.

### Hero structure

```text
              [soft ambient orb]

              Hey Relay

       "2 things need your attention"

        [ Talk to Relay ]
```

Use an animated soft tonal gradient only inside the hero.

Preferred Relay orb blend:

```text
Soft Pink      #E8A9C2
      ↓
Dusty Rose     #B98AA8
      ↓
Calm Mint      #A8D6C8
```

Keep the glow low-intensity and localized. The orb is the primary expressive color moment in the app.

Do not animate the whole screen.

---

## 16.1 Voice orb

Default:

- 96dp phone size
- 128dp tablet size
- circular
- soft primary/tertiary tonal layers
- extremely subtle bloom
- 1–2 animation layers maximum

States:

### Idle

Still.

### Listening

Gentle breathing scale:

```text
1.00 → 1.04 → 1.00
```

Duration:

```text
~1800ms
```

### Thinking

Small tonal rotation / shimmer.

Do not spin continuously like a loading spinner.

### Speaking

Use waveform/equalizer motion.

### Interrupted

Compress orb briefly.

### Error

Switch to error container without aggressive flashing.

---

# 17. Voice Assistant UX

## 17.1 Invocation methods

Primary:

- Tap "Talk to Relay"
- Android assistant/voice shortcut where supported
- Future wake-word support: "Hey Relay"

The UI must always provide a non-voice path.

Voice must never be required for core functionality.

---

## 17.2 Voice states

```text
Idle
Listening
Processing
Speaking
Paused
Permission required
Offline
Error
```

Each state must expose:

- visual cue
- text status
- accessible announcement
- optional haptic feedback

---

## 17.3 Voice screen

```text
Top app bar
    Close
    Conversation title

Ambient hero
    Voice orb

Transcript
    "You have 2 failing checks."

Quick actions
    View failures
    Open project
    Read summary

Voice control
    Mic / Stop

Bottom hint
    "Try: What changed today?"
```

---

## 17.4 Voice language

Tone:

**clear + concise + technically literate + warm**

Good:

> "The main branch build failed 8 minutes ago. The failing step is TypeScript linting."

Better than:

> "Uh-oh! Something went wrong! Let's fix this!"

Avoid:

- unnecessary jokes
- exaggerated emotional language
- fake urgency
- manipulative wording
- anthropomorphic claims that imply feelings

---

# 18. Assistant Response Cards

When Relay speaks, show the same information visually.

Example:

```text
┌──────────────────────────────────┐
│ Build failed                     │
│ main • 8 min ago                 │
│                                  │
│ TypeScript linting               │
│ 14 errors                        │
│                                  │
│ [Open run]     [Read details]    │
└──────────────────────────────────┘
```

Voice and visual output should remain synchronized.

If text is long:

- show concise summary
- allow expansion
- let voice continue reading only when requested

---

# 19. Project List

## Purpose

Quickly switch among development contexts.

Each project item should display:

```text
Project icon
Project name
Repo
Current branch
Pipeline state
Last activity
```

Example:

```text
Relay Mobile
relay/mobile
feature/voice-v2
● Passing
12 min ago
```

Avoid showing too many metadata fields.

---

# 20. Project Detail

## Header

```text
Project icon
Project name
Repo / organization

[Watch]   [More]
```

## Summary row

```text
Build       PRs       Issues
Passing      4          7
```

## Main sections

```text
Current branch
Latest deployment
Recent commits
Pipeline
Pull requests
Team activity
```

The user should be able to answer:

> "What is happening with this project?"

within one screen.

---

# 21. CI/CD Experience

## Pipeline card

Pipeline cards must communicate:

```text
Status
Pipeline name
Branch
Commit
Started time
Duration
Failed step if any
```

### Passing

Use:

```text
check_circle
```

### Running

Use:

```text
progress_activity
```

with subtle motion.

### Failed

Use:

```text
error
```

with error container.

### Queued

Use:

```text
schedule
```

---

# 22. Build Detail

Structure:

```text
Top bar
    Build #1842
    main

Status hero
    Failed
    2m 18s

Failure summary
    TypeScript
    14 errors

Step timeline
    Checkout        ✓
    Install         ✓
    Test             ✓
    Lint             ✕

Failure details
    Code snippet

Actions
    View logs
    Open repository
    Retry
```

Do not dump raw CI logs immediately.

Show:

1. summary
2. likely cause
3. technical detail
4. raw logs

---

# 23. Activity Feed

The Activity screen is a chronological information layer.

Tabs:

```text
All
Code
CI/CD
Team
```

Each activity item:

```text
Icon/avatar
Actor
Action
Target
Time
Optional status
```

Example:

> Priya merged `fix/voice-permissions` into `main`  
> 12 min ago

Use relative times for recent activity.

For older activity:

> Sep 12, 10:42 AM

---

# 24. Timeline Visual Language

Use a quiet vertical timeline.

Don't use:

- heavy connecting lines
- oversized circles
- colorful status dots everywhere

The timeline should feel close to Material list/divider patterns.

---

# 25. Team Screen

The Team screen should focus on collaboration, not surveillance.

Show:

- member
- role
- current activity when explicitly available
- recent contribution
- assigned/mentioned items

Avoid:

- productivity scores
- "most active developer" rankings
- employee surveillance language
- hidden monitoring metrics

---

# 26. Notifications

Notification categories:

```text
Builds
Pull requests
Mentions
Team
Deployments
System
```

Each notification:

```text
Icon
Title
One-line explanation
Time
Optional action
```

Example:

**Build failed**

`main · Relay Mobile`

`TypeScript linting failed`

`8 min ago`

Action:

`Open run`

---

# 27. Notification Priority

### Immediate

Use only for:

- direct mentions
- configured critical deployments
- critical CI failures

### Important

- pull request activity
- team updates
- completed builds

### Informational

- routine activity
- successful non-critical runs

Never make every event "urgent".

---

# 28. Pull Request UI

PR card:

```text
#182 Add voice notification summary

Open • 3 checks

Author
2 approvals

CI: Passing
```

Chip examples:

```text
Open
Draft
Changes requested
Merged
```

Use tonal chips, not brightly colored badges.

---

# 29. Commit UI

Compact commit item:

```text
Fix transcript rendering on Android

a81c2e4
Divyansh · 14 min ago
```

Use monospace for the SHA only.

---

# 30. Search

Global search should feel like a fast command palette.

Search targets:

```text
Projects
Branches
Commits
PRs
Builds
Team members
Notifications
```

Search screen:

```text
Search field
Recent searches

Results
  Project
  Code
  Activity
```

Voice shortcut:

> "Hey Relay, find the last failed build."

---

# 31. Material 3 Component Rules

## 31.1 Buttons

Primary action:

**Filled Button**

Use for:

- Talk to Relay
- Retry build
- Connect repository
- Create project

Secondary:

**Tonal Button**

Use for related actions.

Low emphasis:

**Text Button**

Use for navigation/tertiary action.

Destructive:

Use standard error semantic styling, but do not make every destructive action bright red.

---

## 31.2 Floating Action Button

Use only when there is one clear primary contextual action.

Potential use:

```text
Start voice conversation
```

But do not simultaneously show:

- FAB
- large hero CTA
- prominent button

for the same action.

There must be one obvious primary action.

---

## 31.3 Cards

Use cards for independent groups.

Recommended:

- `12dp` medium corner radius for standard cards
- `16dp` for feature/hero cards
- minimal border
- surface tonal hierarchy

Avoid card nesting beyond one level.

---

# 32. Text Fields

Use Material 3 outlined text fields where field boundaries matter.

Default height:

Approx. `56dp`

Content:

- label
- input
- supporting text
- error
- optional leading icon

Example:

```text
Repository URL
┌─────────────────────────────┐
│ https://github.com/...      │
└─────────────────────────────┘
Connected ✓
```

Avoid always-visible helper text if it provides no new information.

---

# 33. Chips

Use chips for:

- filters
- state categories
- branches
- project tags

Examples:

```text
All
Failed
Running
Passed
Mentions
```

Do not turn every status into a chip.

---

# 34. Dialogs

Dialogs are for:

- destructive confirmation
- permissions requiring contextual explanation
- high-impact changes

Do not use dialogs for every action.

Use bottom sheets for contextual, multi-option interactions.

---

# 35. Bottom Sheets

Use Material 3 bottom sheets for:

- activity details
- build actions
- filter selection
- notification actions
- branch selection
- voice conversation options

Bottom sheet:

```text
Drag handle
Title
Content
Actions
```

Maintain comfortable vertical spacing.

---

# 36. Snackbar

Use Snackbar for lightweight confirmation.

Examples:

> Build retried

> Notification muted

> Repository disconnected

Avoid using snackbar for critical error details.

---

# 37. Loading States

Never freeze the interface with a full-screen spinner if partial content is possible.

Use:

- skeleton content
- progress indicators
- inline loading
- optimistic UI where safe

### Skeleton

Keep shape and size close to the final content.

Do not make the entire screen pulse aggressively.

---

# 38. Empty States

Empty state formula:

```text
Icon / subtle illustration

Clear heading

One sentence explaining why it is empty

Primary action
Optional secondary action
```

Example:

> No projects yet  
> Connect a repository to start seeing builds, activity, and team updates.

Button:

`Connect repository`

---

# 39. Error States

Error design:

1. Say what failed.
2. Explain what the user can do.
3. Preserve technical details behind expansion.
4. Provide a relevant action.

Example:

> **Couldn't refresh builds**

`Relay couldn't reach the CI service.`

`Check your connection or try again.`

Buttons:

`Try again`

`View details`

---

# 40. Offline Mode

Offline should not look broken.

Top-level behavior:

```text
Cached data remains visible
Small offline indicator
Actions that require network are disabled or clearly labeled
```

Example:

> You're offline  
> Showing data from 10:42 AM

Do not replace the entire screen with an offline error.

---

# 41. Permissions

Permissions must be contextual.

Potential permissions:

- microphone
- notifications
- Bluetooth/audio routing if introduced
- contacts only if genuinely required

Permission explanation screen:

```text
Microphone

Relay uses your microphone when you talk to the assistant.

[Continue]
```

Do not request every permission on first launch.

---

# 42. Onboarding

Target:

**under 2 minutes for first useful state**

Suggested flow:

```text
1. Welcome
2. Sign in
3. Connect GitHub
4. Choose project
5. Enable notifications
6. Optional microphone setup
7. First Relay briefing
```

Do not present 10 setup screens before showing value.

---

# 43. First-Run Voice Experience

After onboarding:

```text
Hey, I'm Relay.

I can summarize builds, activity, pull requests,
and team updates.

Try asking:

"What needs my attention?"
```

CTA:

**Try Relay**

The first interaction should be guided, not blank.

---

# 44. Home Personalization

Allowed:

- preferred projects
- notification preferences
- quiet hours
- assistant voice settings
- summary frequency
- theme

Avoid personalization that increases surveillance.

---

# 45. Motion System

Motion should feel:

**soft / predictable / purposeful**

Avoid:

- bouncing cards
- constant parallax
- large page zoom
- excessive spring overshoot
- attention-grabbing flashes

---

## 45.1 Duration tokens

```text
Instant:      0–100ms
Fast:         150ms
Standard:     250ms
Medium:       350ms
Slow:         500ms
Ambient:      800–2000ms
```

---

## 45.2 Motion principles

### Enter

Fade + small translation.

```text
opacity: 0 → 1
translateY: 8dp → 0
```

### Exit

Shorter than enter.

### Expand

Height + content reveal.

### Navigation

Prefer Material shared/container transformations where appropriate.

### Voice

Use ambient motion rather than page transition motion.

---

# 46. Reduced Motion

Respect system reduced-motion preferences when available.

When reduced motion is active:

- remove decorative orb breathing
- reduce animated waveform
- remove unnecessary transitions
- keep state changes understandable through immediate UI changes

Never remove essential feedback.

---

# 47. Haptics

Use haptics sparingly.

Use:

- voice start
- voice stop
- successful connection
- critical confirmation
- meaningful completion

Avoid haptic feedback on:

- every list tap
- every navigation action
- every notification
- passive state updates

---

# 48. Sound

Relay is voice-first but should not become noisy.

Sound categories:

```text
Assistant start
Assistant complete
Important alert
Error
```

Provide controls for:

- assistant voice
- media/notification volume interaction
- voice playback
- mute

Never play unsolicited speech at unpredictable times.

---

# 49. Accessibility

Accessibility is a design requirement, not a QA patch.

## 49.1 Minimum interactive target

Use at least approximately **48dp** for touch interaction areas, even when the visible icon is smaller.

A 24dp icon may still sit inside a 48dp interactive target.

---

## 49.2 Contrast

Text and interactive controls must remain readable across:

- light theme
- dark theme
- dynamic color
- high-contrast settings where applicable

Never use color alone to communicate:

- failure
- success
- selected state
- unread state

---

## 49.3 Screen reader semantics

Examples:

Bad:

```text
"check_circle"
```

Good:

```text
"Build passed. Open build details."
```

Voice orb should expose current state:

```text
"Relay is listening"
"Relay is thinking"
"Relay is speaking"
```

---

# 50. Accessibility Labels

Every important icon-only control needs a content description.

Examples:

```text
Close
Open notifications
Start voice conversation
Stop voice conversation
Retry build
Open project
More options
```

Do not use vague:

```text
Button
Icon
Action
```

---

# 51. Large Text

Layouts must survive Android font scaling.

Requirements:

- allow text wrapping
- do not hard-code single-line assumptions
- do not clip button labels
- support large accessibility text sizes
- maintain minimum touch targets
- allow content to scroll

---

# 52. Voice Accessibility

A voice-first app must still be completely usable without speech.

Every voice action needs a visual equivalent.

Examples:

```text
"What's failing?" 
→ Build filter / Failed section

"Read my updates."
→ Activity summary

"Open the failed build."
→ Build detail navigation
```

---

# 53. Data Visualization

Relay is not a BI dashboard.

Visualizations should answer practical developer questions.

Good:

- build success history
- deployment timeline
- activity trend
- open PR count

Avoid:

- decorative charts
- low-value graphs
- 10 simultaneous metrics
- overly dense monitoring walls

---

# 54. Dashboard Density Rules

For compact phone screens:

**One major information group per vertical section.**

Preferred:

```text
Hero
Attention
Recent activity
Team pulse
```

Avoid:

```text
Hero
6 metric cards
3 charts
8 status cards
timeline
feed
```

---

# 55. Technical Information Hierarchy

Show information in this order:

```text
What happened?
Why does it matter?
What should I do?
Technical details
Raw logs
```

Example:

> Build failed  
> TypeScript linting failed in `notifications.ts`  
> Retry after fixing 14 errors  
> [technical details]  
> [raw logs]

This ordering is central to Relay.

---

# 56. AI Response Design

Every AI answer should have:

```text
Answer
Evidence/context
Action
Optional details
```

Example:

> **Your latest build failed.**
>
> The failure is in TypeScript linting with 14 errors.
>
> **Suggested next step:** open the lint output.
>
> [Open build] [Read errors]

Avoid making unsupported assumptions such as:

> "I fixed it."

unless Relay actually performed and verified the fix.

---

# 57. AI Confidence / Uncertainty

Relay should be explicit when the system is uncertain.

Use:

> "I found a likely cause."

instead of:

> "This is definitely the cause."

For missing data:

> "I couldn't verify the deployment status because the CI provider is unavailable."

Never fabricate technical state.

---

# 58. AI Action Confirmation

High-impact actions should require confirmation.

Examples:

- retry many jobs
- merge PR
- cancel deployment
- restart workflow
- change repository integration
- modify notification policies

Low-risk actions can be direct:

- open project
- filter activity
- read summary
- navigate to build

---

# 59. Developer-Friendly Microcopy

Preferred:

> Build failed

> Tests passed

> 3 checks need attention

> Relay couldn't refresh this project

> No activity in the last 24 hours

Avoid:

> Uh-oh, your build is having a bad day!

Avoid corporate fluff:

> Leverage intelligent development insights!

---

# 60. Status Copy

### Success

> Build passed

### Failure

> Build failed

### Running

> Build running

### Waiting

> Build queued

### Unknown

> Build status unavailable

### Offline

> You're offline

---

# 61. GitHub Integration Screens

Connect flow:

```text
Connect GitHub

Relay needs access to your repositories
to show project activity and CI/CD updates.

[Continue with GitHub]
```

After authentication:

```text
Select repositories

Search repositories

☐ relay-mobile
☐ relay-backend
☐ relay-vscode

[Connect selected]
```

Principle:

**Least privilege + transparent explanation.**

---

# 62. Integration State

Every integration should show:

```text
Connected
Last synced
Permissions
Reconnect
Disconnect
```

Example:

> GitHub  
> Connected  
> Last synced 2 min ago

---

# 63. Settings Architecture

```text
Settings

Account
Notifications
Voice & Assistant
Appearance
Projects
Integrations
Privacy
Accessibility
About
```

Don't expose technical backend settings to ordinary users unless useful.

---

# 64. Appearance Settings

```text
Theme
○ System
○ Light
○ Dark

Dynamic color
[ On ]

High contrast
[ System ]

Reduce motion
[ System ]
```

Defaults should follow Android system preferences.

---

# 65. Notification Settings

```text
Builds
[✓] Failed builds
[ ] Successful builds

Pull requests
[✓] Mentions
[✓] Review requests

Deployments
[✓] Failed
[ ] Successful

Team
[✓] Direct mentions
```

Avoid an all-or-nothing notification switch.

---

# 66. Quiet Hours

Allow:

```text
Quiet hours
10:30 PM – 7:00 AM
```

Important notifications should respect explicit user settings unless the user has separately defined a critical exception.

---

# 67. Privacy

Relay should clearly explain:

- what activity is collected
- what the VS Code extension sends
- what voice data is processed
- what is stored
- how long it is stored
- what teammates can see

Use plain language.

---

# 68. VS Code Context Relationship

The mobile app should surface context received from the desktop extension without recreating the IDE.

Example:

```text
Currently working on

relay-mobile
feature/voice-v2

Changed:
notifications.ts
assistant.ts
voiceService.ts
```

Do not display raw editor telemetry unless it has clear product value.

---

# 69. Context Cards

A context card may show:

```text
You're working on

feature/voice-v2

3 files changed
1 test suite running

[View project]
```

Never imply that Relay knows a user's intent merely from editor activity.

Use:

> "Current coding context"

not:

> "What you're thinking about"

---

# 70. Project Health

"Health" should be descriptive, not a single mysterious score.

Prefer:

```text
Builds       Passing
PRs          2 awaiting review
Deployments  Stable
Activity     Active
```

Avoid:

```text
Project Health: 87
```

unless the scoring model is genuinely useful, transparent, configurable, and explained.

---

# 71. Team Activity Privacy

Activity visibility must be based on explicit product permissions.

The app should distinguish:

```text
Team-visible activity
Personal activity
Repository activity
CI/CD activity
```

Do not merge these into an opaque "developer score".

---

# 72. Information Architecture Rules

Every screen should answer a clear question.

| Screen | User question |
|---|---|
| Home | What needs my attention? |
| Projects | What projects do I manage? |
| Project | What is happening with this project? |
| Activity | What changed? |
| Build | Why did this run succeed/fail? |
| Team | What is happening across the team? |
| Assistant | What can Relay tell/do now? |
| Notifications | What needs my attention from others? |
| Settings | How do I control Relay? |

---

# 73. Design Tokens

Suggested token structure:

```ts
export const relayTheme = {
  // Relay brand: deep dark + soft pink.
  colors: {
    primary: '...',
    onPrimary: '...',
    primaryContainer: '...',
    onPrimaryContainer: '...',

    secondary: '...',
    onSecondary: '...',
    secondaryContainer: '...',
    onSecondaryContainer: '...',

    tertiary: '...',
    onTertiary: '...',
    tertiaryContainer: '...',
    onTertiaryContainer: '...',

    background: '...',
    onBackground: '...',
    surface: '...',
    onSurface: '...',
    surfaceContainer: '...',
    surfaceContainerHigh: '...',
    surfaceContainerHighest: '...',
    onSurfaceVariant: '...',

    outline: '...',
    outlineVariant: '...',

    error: '...',
    onError: '...',
    errorContainer: '...',
    onErrorContainer: '...',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },

  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 28,
    full: 999,
  },

  typography: {
    displayLarge: {},
    displayMedium: {},
    displaySmall: {},
    headlineLarge: {},
    headlineMedium: {},
    headlineSmall: {},
    titleLarge: {},
    titleMedium: {},
    titleSmall: {},
    bodyLarge: {},
    bodyMedium: {},
    bodySmall: {},
    labelLarge: {},
    labelMedium: {},
    labelSmall: {},
  },

  motion: {
    fast: 150,
    standard: 250,
    medium: 350,
    slow: 500,
    ambient: 1800,
  },
};
```

---

# 74. React Native Implementation Rules

## 74.1 Architecture

Recommended layers:

```text
src/
├── app/
│   ├── navigation/
│   ├── providers/
│   └── theme/
│
├── components/
│   ├── common/
│   ├── relay/
│   ├── project/
│   ├── ci/
│   ├── activity/
│   └── voice/
│
├── screens/
│   ├── home/
│   ├── projects/
│   ├── activity/
│   ├── assistant/
│   ├── notifications/
│   └── settings/
│
├── features/
│   ├── auth/
│   ├── github/
│   ├── voice/
│   ├── notifications/
│   └── sync/
│
├── services/
│   ├── api/
│   ├── voice/
│   ├── notifications/
│   └── analytics/
│
├── hooks/
├── state/
├── utils/
├── types/
└── assets/
```

---

# 75. Theme Implementation

All components should consume theme tokens.

Preferred:

```tsx
const { colors, spacing } = useRelayTheme();
```

Then:

```tsx
backgroundColor: colors.surfaceContainer
```

Avoid:

```tsx
backgroundColor: '#FFFFFF'
```

inside reusable components.

---

# 76. Component Naming

Use semantic names:

```text
RelayTopAppBar
RelayButton
RelayCard
RelayStatusChip
RelayVoiceOrb
RelayActivityItem
RelayBuildCard
RelayProjectCard
RelayEmptyState
RelayErrorState
RelaySkeleton
RelayBottomSheet
```

Avoid names tied to one screen:

```text
HomeBlueCard
NewDashboardBox
```

---

# 77. Component States

Every interactive component must define:

```text
default
hover (where pointer input exists)
focused
pressed
disabled
loading
selected
error (where applicable)
```

For touch-only Android controls, hover can be ignored visually but must not break the component.

---

# 78. Buttons — Implementation Contract

Every Button component must support:

```ts
type ButtonVariant =
  | 'filled'
  | 'tonal'
  | 'outlined'
  | 'text';

type ButtonState =
  | 'default'
  | 'loading'
  | 'disabled';
```

Required:

```ts
label
onPress
accessibilityLabel
loading
disabled
leadingIcon?
trailingIcon?
```

---

# 79. Cards — Implementation Contract

Every semantic card should support:

```ts
variant:
  | 'default'
  | 'elevated'
  | 'outlined'
  | 'filled'
```

Prefer `filled`/tonal cards for most Relay surfaces.

---

# 80. Status Component Contract

```ts
type Status =
  | 'healthy'
  | 'active'
  | 'running'
  | 'attention'
  | 'warning'
  | 'failed'
  | 'offline'
  | 'unknown';
```

Each status must resolve to:

```ts
{
  icon,
  label,
  colorRole,
  containerColorRole,
}
```

Never hard-code status colors in the screen.

---

# 81. Voice Orb Component Contract

```ts
type VoiceState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'paused'
  | 'permission'
  | 'offline'
  | 'error';
```

The orb must:

- expose accessible state
- support reduced motion
- never trap focus
- remain understandable without sound
- use semantic theme roles

---

# 82. Screen Transition Rules

Navigation transitions should generally be:

```text
forward:
fade + horizontal movement

back:
reverse

modal:
fade + rise

bottom sheet:
slide from bottom
```

Do not combine:

- zoom
- blur
- rotation
- scale
- parallax

for the same screen.

---

# 83. Blur and Glass

Glass effects are allowed only as a subtle enhancement in the voice hero or system-level overlays.

Rules:

- never use glass for primary information containers
- maintain readable contrast
- don't stack translucent layers
- don't use large backdrop blur across the whole screen
- ensure performance on lower-end Android devices

Relay should remain Material 3 first.

---

# 84. Gradients

Use gradients extremely sparingly.

Approved:

- voice orb
- voice hero ambient background
- optional app-launch visual

Not approved:

- every card
- buttons
- list rows
- status chips
- navigation bar

Gradients must never replace semantic color roles.

---

# 85. Shadows

Default:

**No custom shadow on standard cards.**

Use elevation tokens.

Shadows should mainly appear when an element is:

- floating
- modal
- elevated above the page
- actively lifted

---

# 86. Background Treatment

Default page background should remain visually quiet.

Optional:

```text
very subtle tonal radial field
```

Only behind high-level areas such as the voice hero.

No animated starfields.

No noise texture.

No moving mesh gradients.

---

# 87. Lists

Use Material list patterns.

Default row:

```text
Leading icon/avatar
Headline
Supporting content
Trailing status/action
```

Row height should adapt to content.

Do not force every row to be exactly identical if content requires multiple lines.

---

# 88. Avatars

Avatar sizes:

```text
24dp — compact
32dp — standard list
40dp — prominent
48dp — profile/hero
```

Fallback:

- initials
- consistent generated background from theme
- accessible name

Avoid decorative character avatars by default.

---

# 89. Date and Time

Use local device timezone by default.

Recent:

```text
8 min ago
```

Same day older activity:

```text
Today, 10:42 AM
```

Older:

```text
Sep 14, 10:42 AM
```

Use exact timestamps in technical detail screens.

---

# 90. Technical Data Formatting

### SHA

```text
a81c2e4
```

### Branch

```text
feature/voice-v2
```

### Repository

```text
relay/mobile
```

### Build

```text
#1842
```

Use monospace for technical identifiers.

---

# 91. Code Blocks

Code/log surfaces should use:

```text
Surface Container Lowest
Roboto Mono
12–13sp
16dp padding
8–12dp radius
horizontal scrolling
```

Allow copying.

Provide:

```text
Copy
Open full logs
```

Don't render thousands of log lines inside a card.

---

# 92. Tables

On compact screens:

Do not force a desktop table.

Use stacked rows:

```text
Step
Status
Duration
```

On expanded screens, a real table/grid can be used.

---

# 93. Swipe Actions

Swipe should be optional, never the only way to access actions.

Appropriate:

- mark notification read
- archive
- mute

Not appropriate for critical or destructive operations without a secondary confirmation path.

---

# 94. Pull to Refresh

Use only where remote content is refreshable.

Provide clear progress.

Do not use pull-to-refresh on static settings pages.

---

# 95. Search and Filter Behavior

Filters should be reversible and visible.

Good:

```text
All   Failed   Running   Passed
```

Selected filter should use:

- container change
- icon/check where appropriate
- accessible selected state

Do not rely only on color.

---

# 96. Notification Grouping

Group repeated events:

> 5 activity updates

Expand to:

```text
Asha opened PR #184
Dev merged PR #181
Build #1842 passed
...
```

Avoid flooding the screen with repeated events.

---

# 97. Critical Action Confirmation

For destructive operations:

```text
Title

Are you sure?

Explanation of effect.

Cancel       Confirm
```

Use clear language.

Avoid:

> Are you REALLY sure???

---

# 98. Authentication

Sign-in should be clean and minimal.

Recommended:

```text
Relay logo

Your development context,
connected.

[Continue with GitHub]
[Continue with Google]   // only if supported

Privacy
Terms
```

Do not use a marketing-heavy landing page inside the app.

---

# 99. Home Greeting

Personalized greeting should remain subtle.

Examples:

> Good morning

> Welcome back

Then immediately show relevant system context:

> 2 things need your attention.

Avoid:

> Hey Divyansh!!! 🔥🔥🔥

---

# 100. Android System Integration

The experience should feel native to Android:

- edge-to-edge aware layout
- system bars respected
- Material components
- Android back behavior
- notification channels
- share sheet integration
- biometric APIs where required
- system accessibility services
- dynamic color where supported
- adaptive window behavior

Do not create fake Android UI for system functionality.

---

# 101. Edge-to-Edge

Support Android edge-to-edge layouts.

Content must remain clear of:

- status bar
- navigation system area
- display cutouts
- gesture regions

Use safe-area/insets logic appropriate to React Native.

Never hard-code:

```text
paddingTop: 24
```

as the sole solution for status bars.

---

# 102. Keyboard Behavior

Forms must:

- scroll above keyboard
- preserve field focus
- avoid content being covered
- dismiss gracefully
- maintain visible primary action

Never let the keyboard hide the active field.

---

# 103. Orientation

Do not artificially lock the application to portrait where adaptive Android guidance recommends supporting additional layouts.

Primary phone use may remain portrait-oriented, but expanded/tablet layouts should be intentionally supported.

---

# 104. Notification Design Language

Notification title:

**what happened**

Secondary line:

**where**

Third line:

**useful detail**

Example:

> Build failed  
> relay/mobile · main  
> TypeScript linting · 14 errors

---

# 105. Assistant Notification

A high-priority assistant notification may read:

> Relay  
> Your main build failed 8 min ago.

Action:

`View build`

Optional voice playback should respect settings and Android notification behavior.

---

# 106. Home Attention Model

Home should prioritize actual user-relevant events.

Suggested priority order:

```text
1. Direct mention / assigned action
2. Critical failure
3. Review request
4. Deployment event
5. Important team update
6. Routine activity
```

This is a product behavior rule, not a visual ranking of people.

---

# 107. Ambient Assistant Presence

Relay should have a subtle persistent identity.

Possible cues:

- small voice icon
- assistant avatar/orb
- "Ask Relay" action

Do not keep an animated assistant permanently moving on every screen.

---

# 108. Assistant Personality

Relay should feel:

```text
calm
precise
helpful
concise
transparent
developer-aware
```

It should not feel:

```text
overexcited
sarcastic
judgmental
intrusive
overly human
```

---

# 109. Copywriting Rules

## Use

- plain language
- short sentences
- technical accuracy
- exact actions
- useful timestamps

## Avoid

- vague AI language
- hype
- unnecessary exclamation marks
- exaggerated certainty
- fear-based urgency

---

# 110. Content Priority

On every screen:

```text
1. User action / next step
2. Current state
3. Explanation
4. Details
5. Metadata
```

---

# 111. Error Copy Formula

```text
Couldn't [action]

[What happened]

[What the user can do]

[Optional technical details]
```

Example:

> Couldn't sync GitHub  
> GitHub did not respond.  
> Check your connection and try again.  
> Error: 502

---

# 112. Success Copy Formula

```text
[Object] [completed state]

Optional detail

Optional next action
```

Example:

> Repository connected  
> Relay synced 3 projects.  
> [View projects]

---

# 113. Loading Copy

Avoid:

> Loading...

Prefer contextual states:

> Connecting to GitHub…

> Fetching builds…

> Preparing Relay…

---

# 114. Empty Copy

Avoid:

> Nothing here

Prefer:

> No failed builds  
> Everything synced in this project is currently passing.

---

# 115. Design QA Checklist

Every screen must pass:

### Visual

- [ ] Uses semantic MD3 colors
- [ ] No unexplained hard-coded colors
- [ ] Spacing follows 4dp grid
- [ ] Typography follows type scale
- [ ] Shape follows token system
- [ ] Elevation is restrained
- [ ] No unnecessary gradients
- [ ] No unnecessary shadows
- [ ] Light and dark themes work

### UX

- [ ] One clear primary action
- [ ] User knows current state
- [ ] Error states explain recovery
- [ ] Empty state explains what to do
- [ ] Loading state preserves context
- [ ] Destructive actions are confirmed
- [ ] AI uncertainty is clearly expressed

### Accessibility

- [ ] Touch targets are adequate
- [ ] Icon-only controls have labels
- [ ] Color is not the only state indicator
- [ ] Large text does not clip
- [ ] Voice features have visual alternatives
- [ ] Reduced motion works
- [ ] Screen readers get meaningful context

### Android

- [ ] Back behavior is correct
- [ ] Edge-to-edge insets handled
- [ ] Keyboard behavior works
- [ ] Window resizing works
- [ ] Compact layout works
- [ ] Medium layout works
- [ ] Expanded layout works
- [ ] Android system UI is respected

---

# 116. Component QA Checklist

For each reusable component:

```text
□ Default
□ Pressed
□ Focused
□ Disabled
□ Loading
□ Selected
□ Error (if relevant)
□ Light theme
□ Dark theme
□ Large text
□ Screen reader
□ Reduced motion
```

---

# 117. Do / Don't

## DO

- Use semantic Material 3 roles.
- Keep surfaces quiet.
- Use tonal hierarchy.
- Make technical data scannable.
- Let voice and visual UI mirror each other.
- Use animation sparingly.
- Explain AI uncertainty.
- Make critical state obvious.
- Respect system preferences.
- Preserve user control.

## DON'T

- Turn Relay into a neon DevOps dashboard.
- Use gradients everywhere.
- Put every metric into a card.
- Use red for minor warnings.
- Hide actions inside ambiguous icons.
- Make voice mandatory.
- Fake AI certainty.
- Animate the entire interface.
- Build a desktop dashboard squeezed into a phone.
- Use surveillance-style team scoring.

---

# 118. Recommended Screen Inventory

Minimum Android release:

```text
01 Splash
02 Authentication
03 Onboarding
04 Home
05 Projects
06 Project Detail
07 Build Detail
08 Activity
09 Notifications
10 Assistant
11 Search
12 GitHub Connection
13 Team
14 Settings
15 Voice Settings
16 Notification Settings
17 Privacy
18 About
19 Empty/Error/Offline variants
```

---

# 119. Release 1 Priority

### P0 — essential

```text
Authentication
Home
Projects
Project Detail
CI/CD status
Build Detail
Activity
Notifications
Assistant
Settings
Light/Dark theme
Accessibility foundation
```

### P1

```text
Voice conversation history
Search
Team
GitHub repository management
Advanced notification rules
Adaptive tablet layout
Dynamic color
```

### P2

```text
Richer AI summaries
Context-aware suggestions
Advanced analytics
Expanded large-screen multi-pane experiences
```

---

# 120. Final Design Rules

These rules override stylistic experimentation.

### Rule 1

**Material 3 first.**

### Rule 2

**Calm beats flashy.**

### Rule 3

**State must be obvious without color alone.**

### Rule 4

**Voice and visual information must agree.**

### Rule 5

**AI must never pretend certainty that the system does not have.**

### Rule 6

**One screen, one primary question.**

### Rule 7

**One primary action.**

### Rule 8

**Technical detail is available, not dumped.**

### Rule 9

**Accessibility is included from the start.**

### Rule 10

**The user's attention is a limited resource.**

---

# 121. Relay Visual Target

The finished app should feel approximately like:

```text
               RELAY

        Calm technical space
        ────────────────────

             Hey Relay
          [ ambient orb ]

       2 things need attention

    ┌─────────────────────────┐
    │ Build failed             │
    │ main · 8 min ago         │
    │ TypeScript · 14 errors   │
    │                         │
    │ [Open build]             │
    └─────────────────────────┘

    Recent activity
    ────────────────────────
    ✓ PR merged
    ✓ Build passed
    • New review request

        [ Talk to Relay ]

   Home   Projects   Activity   Assistant
```

The experience should look **quiet even when the backend is busy**.

Use a deep charcoal/plum-black canvas, soft pink as the signature accent, and tiny amounts of calm mint for healthy/ambient states.

That is the core Relay design idea.

---

# 122. Implementation Guardrails for AI Coding Agents

Any AI coding agent working on Relay must follow these constraints.

## Absolute rules

```text
1. Do not invent new colors outside the theme system.
2. Do not create arbitrary border radii.
3. Do not use hard-coded spacing when a token exists.
4. Do not create duplicate components for the same semantic pattern.
5. Do not introduce gradient-heavy UI.
6. Do not introduce glassmorphism as the primary visual system.
7. Do not use emoji as functional icons.
8. Do not make AI responses visually louder than user actions.
9. Do not add animations without a UX reason.
10. Do not remove accessibility labels.
11. Do not make voice the only path to functionality.
12. Do not use a full-screen spinner when partial content can render.
13. Do not expose raw logs before summary/context.
14. Do not create anonymous numerical "health" scores without a defined model.
15. Do not add surveillance-like team metrics.
```

## When creating a new screen

The agent must first identify:

```text
Screen purpose
Primary user question
Primary action
Information hierarchy
Loading state
Empty state
Error state
Offline state
Accessibility requirements
Compact layout
Medium layout
Expanded layout
Light theme
Dark theme
```

---

# 123. Source / Reference Notes

This specification follows current Material 3 and Android adaptive-design concepts, including semantic theming, Material components, window-size-aware layouts, adaptive navigation, and accessible interaction targets.

Relevant Android references:

- Material 3 in Jetpack Compose: https://developer.android.com/develop/ui/compose/designsystems/material3
- Material 3 adaptive layout: https://developer.android.com/reference/kotlin/androidx/compose/material3/adaptive/layout/package-summary
- Window size classes: https://developer.android.com/reference/kotlin/androidx/compose/material3/windowsizeclass/WindowSizeClass
- Adaptive Android layouts: https://developer.android.com/develop/adaptive-apps/guides/support-different-display-sizes
- Android mobile navigation patterns: https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
- Material 3 accessibility-related minimum interactive sizing: https://developer.android.com/reference/kotlin/androidx/compose/material3/package-summary

---

# 124. Definition of Done

Relay's UI/UX is considered aligned with this design system when:

```text
✓ The UI clearly feels Material 3.
✓ The visual hierarchy is calm and spacious.
✓ Primary actions are obvious.
✓ Voice feels like an integrated system capability.
✓ CI/CD information is scannable.
✓ Technical details are available without overwhelming the user.
✓ Light and dark themes are coherent.
✓ Large text and accessibility interactions work.
✓ Compact, medium, and expanded layouts are intentional.
✓ No major screen depends on color alone.
✓ No major screen requires voice interaction.
✓ Animations support meaning instead of decoration.
✓ Components use shared semantic tokens.
✓ The same design language exists across Home, Projects,
  Activity, Builds, Notifications, and Assistant.
```

**Relay should feel like a quiet layer over a noisy engineering world.**
