# Outventure AI — Build Log

## Project Overview

**Outventure AI** is an AI-powered outdoor activity generator designed to help users spend less time on screens and more time doing something meaningful in the real world.

The core idea is simple:

**Describe your situation → confirm the context → receive tailored real-world missions → go outside and do them.**

The product is being built around a lightweight interaction flow where AI handles the understanding and creative generation, while the actual experience happens away from the screen.

---

# Project Setup & Foundation

## Initial Project Creation

Outventure AI was initialized as a fresh **Next.js application** using a modern TypeScript stack.

### Core Stack

- Next.js
- App Router
- TypeScript
- Tailwind CSS
- ESLint
- `@google/genai`

The project was created with a clean application structure and prepared for server-side AI integration.

---

## Environment Configuration

A Google AI API key was configured using:

`GEMINI_API_KEY`

The key is stored securely inside:

`.env.local`

The API key is only accessed from server-side code and is not exposed directly to the browser.

---

## Google GenAI SDK Integration

The `@google/genai` package was installed to connect the application to Google's hosted AI models.

A basic server-side test flow was implemented before building any product-specific AI logic.

The purpose of this test was to confirm that:

- the API key was valid
- the Google GenAI SDK was configured correctly
- requests could be sent from the Next.js backend
- the selected model was accessible
- the frontend could communicate successfully with the backend API route

The initial AI integration succeeded.

This established the technical foundation required for the later MissionContext extraction workflow.

---

# Phase 1 — Text Context Extraction & Confirmation

**Status:** Completed

## Goal

The first functional AI phase focused on understanding a user's natural-language request and converting it into structured information.

The target flow was:

**User text → structured MissionContext → editable confirmation UI**

The purpose of this phase was to ensure that Outventure AI could understand what the user wants before generating any outdoor activity or mission.

No mission generation was included in this phase.

---

# MissionContext Design

A structured `MissionContext` schema was created to represent the important details needed later for mission generation.

The context currently includes:

- People count
- Duration
- Activity goal
- Intensity
- Age group

### Environment

- Environment type
- Indoor / outdoor
- Space size
- Surface
- Environment features
- Obstacles

### Equipment

- Available equipment

### Constraints

- No running
- Kid friendly
- Quiet activity

The schema is designed so that missing information is not silently invented.

### Missing Value Rules

- Unknown scalar values → `null`
- Unknown arrays → `[]`

This makes it possible for the application to clearly distinguish between information supplied by the user and information that has not yet been provided.

---

# Initial Context Extraction with Gemma

The first working MissionContext extraction implementation used:

`gemma-4-26b-a4b-it`

The model produced strong structured outputs and generally followed the MissionContext schema correctly.

Several manual tests were performed using different types of requests.

Examples included:

- complete activity descriptions
- partial requests
- environment descriptions
- equipment availability
- duration-only requests
- semantic descriptions such as "relaxing"

The extraction quality was strong.

However, a major issue appeared during real-world testing:

**latency was highly inconsistent and often too slow for an interactive web experience.**

Observed context extraction requests ranged from only a few seconds to more than 30 seconds.

---

# Latency Investigation

Temporary diagnostic logging was added to determine why some requests were taking significantly longer than others.

The diagnostics measured:

- total request latency
- number of attempts
- latency per attempt
- success or failure for each attempt
- upstream API status codes

The goal was to determine whether the long delays were caused by:

1. repeated failed requests and retries

or

2. individual successful model requests taking a long time

---

## Diagnostic Result

The tests showed that the long delays were primarily caused by:

**single slow successful Gemma inference requests**

rather than accumulated retries.

Multiple requests completed successfully on the first attempt but still required approximately 30–55 seconds.

This confirmed that retry behaviour was not the main performance bottleneck.

---

# Gemma Model Comparison

A controlled benchmark was performed to compare the two Gemma models available through the active Google GenAI API project.

The models tested were:

- `gemma-4-26b-a4b-it`
- `gemma-4-31b-it`

Both models used the same:

- MissionContext schema
- extraction instructions
- validation logic
- normalization logic
- fixed test inputs

Each model was tested with:

**5 context cases × 2 rounds = 10 requests per model**

All requests were executed sequentially.

---

## gemma-4-26b-a4b-it Results

Successful requests produced:

- Average latency: approximately **30.35 seconds**
- Median latency: approximately **28.77 seconds**
- Fastest successful request: approximately **15.41 seconds**
- Slowest successful request: approximately **43.18 seconds**
- Success rate: **90%**
- Average accuracy on completed responses: approximately **4.78 / 5**
- Meaningful hallucinations: **0**

The model demonstrated strong schema compliance and extraction quality.

---

## gemma-4-31b-it Results

Successful requests produced:

- Average latency: approximately **71.06 seconds**
- Median latency: approximately **71.52 seconds**
- Fastest successful request: approximately **40.56 seconds**
- Slowest successful request: approximately **133.26 seconds**
- Success rate: **90%**
- Average accuracy on completed responses: approximately **4.78 / 5**
- Meaningful hallucinations: **0**

The 31B model showed no meaningful accuracy advantage over the 26B model while taking significantly longer.

### Decision

`gemma-4-31b-it` was eliminated from the context extraction workflow.

---

# Smaller Gemma Availability Investigation

Because the 26B model was still too slow for interactive context extraction, smaller Gemma 4 variants were investigated.

Candidate families included:

- Gemma 4 E2B
- Gemma 4 E4B
- Gemma 4 12B
- Gemma 4 26B A4B

The active Google GenAI API registry was queried and candidate model IDs were tested directly.

The project currently exposes only:

- `models/gemma-4-26b-a4b-it`
- `models/gemma-4-31b-it`

The smaller Gemma variants were not callable through the current managed Google GenAI API endpoint.

Because of this, there was no smaller hosted Gemma model available through the same API that could be benchmarked as a faster context extraction alternative.

---

# Gemini 3.1 Flash Lite Evaluation

Since MissionContext extraction is a lightweight structured-data task, a faster Gemini model was evaluated for this specific stage.

The model tested was:

`gemini-3.1-flash-lite`

The existing API key successfully accessed the model.

A controlled benchmark was performed using the same:

- MissionContext schema
- extraction instructions
- validation logic
- normalization logic
- five fixed context tests
- two rounds per test

This resulted in:

**10 sequential requests**

---

## Gemini 3.1 Flash Lite Results

The benchmark produced:

- Average latency: approximately **2.88 seconds**
- Median latency: approximately **1.12 seconds**
- Fastest request: approximately **0.90 seconds**
- Slowest request: approximately **7.92 seconds**
- Success rate: **100%**
- Average accuracy: **5.00 / 5**
- Meaningful hallucinations: **0**

Most requests completed in approximately one second.

The model also correctly handled the hallucination test where the only user information provided was:

> "We have 10 minutes."

All unrelated fields remained empty instead of being invented.

---

# Model Decision for Context Extraction

Based on the controlled benchmark results:

`gemini-3.1-flash-lite`

was selected as the MissionContext extraction model.

Compared with `gemma-4-26b-a4b-it`, the Flash Lite model provided:

- dramatically lower latency
- higher benchmark reliability
- equally strong or better structured extraction accuracy
- zero hallucinations in the controlled tests

### Current AI Role Separation

The current architecture direction is:

**Gemini 3.1 Flash Lite**
→ fast MissionContext extraction

**Gemma 4 26B A4B**
→ planned core creative mission generation

This keeps Gemma responsible for the main creative AI functionality while using a faster model for the lightweight parsing stage.

---

# Context Extraction API

The application includes:

`POST /api/context/analyze`

The endpoint:

1. receives user text
2. validates the input
3. sends the request to the context extraction model
4. parses the structured response
5. validates and normalizes the result
6. returns a clean MissionContext object

The response also currently includes temporary development diagnostics for performance analysis.

---

# Context Confirmation UI

After MissionContext extraction, the user is shown an editable confirmation screen.

The original interface exposed the schema in a very technical form with many standard dropdowns.

A dedicated UI polish pass was completed to make the confirmation experience more natural and user-friendly.

---

## Confirmation Screen Improvements

The confirmation section now uses the heading:

**Check your details**

with helper text:

> Make any changes before we create your outdoor ideas.

The interface focuses on the information a normal user cares about instead of exposing the underlying data structure.

---

## Primary Fields

The most important information is displayed first.

### People

A compact number input is used with a human-readable people indicator.

### Time

A number input is shown with a minutes indicator.

### Activity Goal

Displayed as a normal editable text field.

### Intensity

The previous dropdown was replaced with selectable chip-style controls.

Options include:

- Gentle / Low
- Medium
- High Energy

### Age Group

Quick-select options are available for:

- Kids
- Teens
- Adults
- Mixed

A custom text value can still be used when needed.

### Indoor / Outdoor

A simple segmented control is used instead of a dropdown.

Options:

- Outdoor
- Indoor

### Environment Type

Displayed using the user-friendly label:

**Where are you?**

The value remains editable.

---

# More Details Section

Secondary information has been moved into a collapsible:

**More details**

section.

This prevents the confirmation screen from feeling overloaded while still allowing every extracted field to be reviewed and edited.

The section contains:

- Space size
- Ground / surface
- Environment features
- Obstacles
- Equipment
- Constraints

---

## Space Size

Chip-style controls are used for:

- Small
- Medium
- Large

---

## Features, Obstacles and Equipment

These values are displayed in a more visual tag/chip format.

Existing values can be removed individually.

The underlying data continues to use arrays without changing the MissionContext schema.

---

## Constraints

The original dropdowns were replaced with compact three-state controls.

The following constraints are supported:

- No Running
- Kid Friendly
- Quiet Activity

Each supports:

- Any / Not specified
- Yes
- No

This preserves the underlying:

- `null`
- `true`
- `false`

states without forcing missing information into a false value.

---

# Developer Details

Raw structured MissionContext JSON is still available during development.

It has been moved into a small collapsible:

**Developer details**

section so that it no longer dominates the normal user experience.

---

# Temporary Performance Diagnostics

Development diagnostics are intentionally still active.

The interface currently exposes information such as:

- total model latency
- attempt count
- per-attempt timing
- request status
- raw context JSON

These diagnostics are being retained temporarily because the next phase will introduce image-based context extraction.

They will help compare:

- text-only latency
- image-only latency
- text + image latency
- multimodal reliability
- upstream errors

The diagnostics will be removed or reduced once multimodal extraction is stable.

---

# Phase 1 Result

Phase 1 now provides a complete working text context pipeline:

**Next.js application**
→ **user text input**
→ **Gemini 3.1 Flash Lite**
→ **MissionContext extraction**
→ **validation and normalization**
→ **editable user-friendly confirmation screen**

The application can now reliably understand a user's outdoor activity context before generating any missions.

---

# Current Model Architecture

## Context Extraction

`gemini-3.1-flash-lite`

Used for:

- understanding user input
- extracting structured MissionContext
- fast interactive processing

## Planned Mission Generation

`gemma-4-26b-a4b-it`

Planned for:

- creating tailored outdoor mission options
- using confirmed user and environment context
- acting as the main creative AI component of Outventure AI

---

# Next Phase — Multimodal Context Extraction

The next development phase will add image support.

The intended flow is:

**User text + optional environment image**
→ **AI context understanding**
→ **unified MissionContext**
→ **confirmation / correction**

The system should support:

- text-only requests
- image-only context where appropriate
- text + image together

The environment image will be used to understand information such as:

- environment type
- available space
- surface
- visible features
- possible obstacles

The existing MissionContext confirmation flow will remain the central point where users can review and correct AI interpretation before mission generation begins.


# Phase 2 — Multimodal Context Extraction

**Status:** Completed

## Goal

Phase 2 extended Outventure AI from text-only context extraction to multimodal understanding.

The target flow became:

**Text only**
OR  
**Image only**
OR  
**Text + Image**
→ **Unified MissionContext**
→ **Editable confirmation screen**

The purpose of this phase was to allow the system to understand the user's physical surroundings in addition to their written activity requirements.

---

## Vision Model Validation

Before integrating image upload into the production flow, `gemini-3.1-flash-lite` was evaluated specifically for environment understanding.

The model was tested with several different environment types including:

- grassy public park
- residential backyard
- children's playground
- indoor recreation room
- sandy beach

The evaluation checked whether the model could identify:

- environment type
- indoor / outdoor
- broad usable space size
- surface
- visible environment features
- visible obstacles
- clearly visible activity equipment

The model was also tested with:

- image-only requests
- text + image requests
- deliberate text-image conflicts

---

## Vision Evaluation Results

### Image-Only

The model correctly identified environment information from all tested scenes.

Examples included:

- park → outdoor, large, grass, path, trees, bench
- backyard → outdoor, grass/patio, fence, visible soccer ball
- playground → outdoor, play structures, swings, woodchip surface
- indoor room → indoor, large room, wood floor
- beach → outdoor, large, sand, ocean, umbrellas, volleyball

User-intent fields such as:

- people count
- duration
- activity goal

remained empty when no text was provided.

This confirmed that the model was not inventing unrelated user context.

---

## Text + Image Context Merging

The model successfully merged text-based intent with image-based environment information into one `MissionContext`.

Example:

Text:

> We are 4 people and have 20 minutes. We want something fun.

Image:

> Grassy public park

Result:

- peopleCount = 4
- durationMinutes = 20
- activityGoal = fun
- environment.type = park
- indoorOutdoor = outdoor
- surface = grass
- visible environmental features extracted from the image

The application does not maintain separate text and image context objects.

Both sources are merged into a single structured MissionContext.

---

## Text / Image Conflict Handling

A deliberate conflict test was performed.

Text claimed that the user was outside in a public park while the supplied image clearly showed an indoor room.

The model correctly prioritized visible physical evidence for environment-specific fields.

The resulting context identified:

- indoor environment
- room/community space
- wood flooring

instead of incorrectly forcing the textual park description into the visual environment.

The confirmation screen remains the final user-controlled step where any incorrect AI interpretation can be corrected.

---

## Multimodal Performance

Observed benchmark performance:

### Text Only

- Average latency: approximately **2.88 seconds**
- Median latency: approximately **1.12 seconds**

### Image Only

- Average latency: approximately **6.21 seconds**
- Median latency: approximately **7.64 seconds**

### Text + Image

- Average latency: approximately **7.02 seconds**
- Median latency: approximately **7.48 seconds**

All tested multimodal requests completed successfully.

The additional image-processing latency remained acceptable for an interactive workflow.

---

# Production Image Input

The main Outventure AI interface was extended to support optional environment images.

Users can now use:

- text only
- image only
- text + image together

The existing endpoint remains:

`POST /api/context/analyze`

The client sends multimodal requests using `FormData`.

Supported values:

- `text` — optional
- `image` — optional

At least one must be present.

---

## Supported Image Types

The client currently accepts:

- JPEG
- PNG
- WebP

A client-side file-size limit is applied before submission.

The image is not permanently stored.

It exists only for the current analysis request and is passed to the Google GenAI API as image data.

No database, disk persistence, or cloud image storage is currently used.

---

# Desktop Image Experience

On desktop/laptop devices, the user sees:

**Choose Image**

This opens the normal system file picker.

A selected image displays:

- preview
- file name
- file size
- change option
- remove option

---

# Mobile Camera & Gallery Experience

Mobile/touch-capable devices provide:

- **Take Photo**
- **Choose Photo**

The camera input uses the standard browser capability:

`capture="environment"`

to prefer the rear/environment-facing camera.

No custom camera implementation or external camera package is used.

---

## Desktop / Mobile Detection Improvement

The initial responsive implementation displayed the camera action on desktop in some cases.

This was corrected before completing Phase 2.

The UI now uses lightweight browser capability checks based on:

- `navigator.maxTouchPoints`
- `matchMedia("(pointer: coarse)")`

Desktop/laptop environments show only:

**Choose Image**

Touch/mobile environments show:

- **Take Photo**
- **Choose Photo**

No third-party device detection package or large user-agent parsing logic is used.

---

# Stale Context Prevention

An important state-management fix was added before completing Phase 2.

Previously, a user could:

1. analyze an image
2. receive an extracted MissionContext
3. remove or replace the image
4. still see the context generated from the previous image

This could result in stale or misleading information.

The application now clears the previous analysis whenever an image is:

- removed
- replaced
- changed through Choose Image / Choose Photo
- replaced using Take Photo

The following generated state is reset:

- extracted MissionContext
- latency
- attempt diagnostics
- previous analysis error state
- feature draft values
- obstacle draft values
- equipment draft values

The confirmation card disappears immediately.

---

## Text Preservation During Image Changes

Changing or removing an image does **not** clear the user's written input.

Example:

User enters:

> We are 4 people and have 20 minutes.

The user uploads and analyzes Image A.

If Image A is later removed:

- the generated MissionContext is cleared
- old diagnostics are cleared
- the original text remains

The user can then re-analyze the text alone or select a different image.

---

# Manual Phase 2 Validation

The production multimodal flow was manually tested using several real sample images.

### Football Stadium

The model correctly extracted:

- soccer stadium
- outdoor
- large space
- natural grass
- stadium seating
- field markings
- soccer ball as available equipment

No user intent values were invented.

### Indoor Room

The model correctly extracted:

- indoor room
- medium space
- wood flooring
- brick walls
- ceiling lighting

Equipment remained empty.

### Open Grassy Area

The model correctly extracted:

- outdoor grassy field / hill
- large space
- grass
- open field

No equipment or unrelated activity details were invented.

### Playground / Play Structure

The model correctly recognized:

- outdoor grass environment
- large wooden pirate-ship play structure
- slide
- rope/ramp features
- swings
- surrounding hedgerow

These elements were correctly treated as environmental features rather than user-owned equipment.

---

# Phase 2 Result

Outventure AI now supports the complete multimodal context pipeline:

**Text only**
OR  
**Image only**
OR  
**Text + Image**

→ **Gemini 3.1 Flash Lite**
→ **Unified MissionContext**
→ **Validation / normalization**
→ **Editable confirmation UI**

The system can now understand both the user's intent and the physical environment around them before generating any missions.

---

# Next Phase — Voice Interaction

The next phase will introduce ElevenLabs.

The planned direction is to support voice as another natural input/output method.

Expected areas include:

- speech-to-text for spoken user context
- spoken mission instructions using text-to-speech
- mobile-friendly voice interaction

The existing text + image context pipeline will remain intact and voice will be added on top of it rather than replacing it.


# Phase 3A — Voice Input with ElevenLabs Speech-to-Text

**Status:** Completed

## Goal

Phase 3A added voice as another natural input method for Outventure AI.

The goal was to let users describe their situation by speaking instead of typing while keeping the existing text and image workflow unchanged.

The implemented flow is:

**User speaks**
→ **browser records audio**
→ **ElevenLabs Speech-to-Text**
→ **transcript inserted into existing text input**
→ **user reviews or edits transcript**
→ **existing Gemini context extraction flow continues**

Voice input does not replace the existing textarea.

It acts as another way of filling it.

---

## ElevenLabs Setup

A dedicated ElevenLabs API key was created for Outventure AI with access to:

- Speech-to-Text
- Text-to-Speech

The key is stored securely in:

`.env.local`

using:

`ELEVENLABS_API_KEY`

The key is only accessed from server-side code and is never exposed to the browser.

Text-to-Speech permission has been prepared for a later phase but is not currently used.

---

# Browser Voice Recording

Voice recording is implemented using the native browser:

`MediaRecorder`

API.

No external audio-recording library was required.

The recording flow is:

1. User clicks **Speak**
2. Browser requests microphone permission
3. Audio recording begins
4. User clicks **Stop**
5. Recorded chunks are combined into an audio Blob
6. Audio is sent to the backend for transcription
7. ElevenLabs returns the transcript
8. Transcript is inserted into the existing context textarea

A 60-second maximum recording duration is enforced for the MVP.

If the limit is reached, recording stops automatically and transcription begins.

---

# Microphone Permission Handling

Microphone access is requested using:

`navigator.mediaDevices.getUserMedia({ audio: true })`

Friendly fallback messages are displayed for common failure scenarios.

Examples include:

### Permission Blocked

> Microphone access was blocked. Please allow microphone access or type your request instead.

### No Microphone Available

> No microphone found on your device. Please type your request instead.

### Unsupported Browser

> Voice recording is not supported in this browser. Please type your request instead.

Raw browser errors are not displayed to users.

When recording ends or fails, all active MediaStream tracks are stopped immediately so the microphone is released.

---

# Speech-to-Text API

A new server-side endpoint was created:

`POST /api/transcribe`

The endpoint receives recorded audio using:

`multipart/form-data`

with the field:

`audio`

The server:

1. validates that an audio file exists
2. checks the MIME type
3. applies a 15MB file-size limit
4. sends the audio to ElevenLabs Speech-to-Text
5. receives the transcript
6. returns the transcript to the frontend

Example response:

```json
{
  "success": true,
  "text": "We are four people and have twenty minutes."
}


# Phase 4 — Mission Generation, Selection & Detail View

**Status:** Completed

## Goal

Phase 4 introduced the core mission-generation experience for Outventure AI.

The completed flow is:

**Confirmed MissionContext**
→ **Generate Missions**
→ **Gemini 3.1 Flash Lite generates exactly 3 complete missions**
→ **3 mission cards are displayed**
→ **user selects one**
→ **full mission detail view is shown**

The selected mission does not require another AI request.

All card summaries, detailed steps, safety notes, and supporting metadata are generated in one request and stored in client state.

---

## Production Model Decision

Mission generation uses:

`gemini-3.1-flash-lite`

This model was selected after controlled benchmarking against:

`gemma-4-26b-a4b-it`

Gemini Flash Lite provided substantially lower latency while maintaining equal or better practical mission quality, constraint adherence, and structured JSON reliability.

Gemma is not used in the production mission-generation flow.

---

## Mission Schema

A production `Mission` type was introduced:

```ts
export type MissionIntensity = "low" | "medium" | "high";

export type Mission = {
  id: string;
  title: string;
  shortDescription: string;
  durationMinutes: number;
  intensity: MissionIntensity;
  players: string;
  equipmentNeeded: string[];
  whyItFits: string;
  steps: string[];
  safetyNotes: string[];
};

export type MissionGenerationResponse = {
  missions: Mission[];
};


# Phase 5A — Mission Execution & Countdown Timer

**Status:** Completed

## Goal

Phase 5A added the mission execution experience after the user selects a generated mission.

The completed flow is:

**Mission Detail**
→ **Start Mission**
→ **Active Mission Countdown**
→ **View Steps & Gear while timer continues**
→ **Near-End Warning**
→ **Final Alarm**
→ **Mission Complete**

This phase intentionally does not include TTS, persistence to MongoDB, ratings, feedback, or notifications.

---

## Start Mission

The selected mission detail view now includes a primary:

**Start Mission**

action.

Starting a mission:

1. records the current timestamp
2. calculates the expected end timestamp from the mission duration
3. initializes execution state
4. stores the active mission in localStorage
5. opens the active mission execution view

Starting a mission makes:

- **0 Gemini calls**
- **0 ElevenLabs calls**

The selected mission object generated in Phase 4 is reused directly.

---

## Timestamp-Based Timer Architecture

The timer uses timestamps rather than decrementing a counter as the source of truth.

When a mission begins:

```ts
startedAt = Date.now();

expectedEndAt =
  startedAt + selectedMission.durationMinutes * 60 * 1000;