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