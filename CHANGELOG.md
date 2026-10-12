# Changelog

Trinity Teaching: chapter presentations for every classroom board, with AI study support.
Android and Windows apps update themselves through **Check for updates**; an APK is only reinstalled when noted.

## 1.6.0 (12 October 2026)
**Android: install the 1.6.0 APK once** (needed for the board's own annotation tools).
- Board annotation stays available: the board's own tools (such as the Hikvision annotation pen and side toolbar) are no longer hidden while the app is open. Full screen still hides every bar; **Board pen** brings the board's tools back.
- Built-in pen on every slide: four colours, highlighter, eraser, undo and clear. Ink is kept per slide and never saved into the file.
- Ask AI reads pictures: attach a photo, or send the current PDF slide.
- Ask AI answers study questions beyond the slides, marked as a general answer.
- Quizzes: about half logical and critical-thinking questions (assertion and reason, statements, predict, cause and effect, graph, compare, spot the error), all on the open chapter; the question type is shown on each card.
- Grade 12 chapters get Grade 12 questions only; Class 11 stays Grade 11 only.
- Tests for offline slide search, `npm test`, and CI on every push.

## 1.5.x (10 October 2026)
- 1.5.0: IOE and IOM question bank (252 questions), matched to the open chapter and the class grade.
- 1.5.1: Quizzes of 5 to 50 questions, toughest first, with exact arithmetic checks of every AI-written solution and answers spread evenly over A to D.
- 1.5.2: Absolute values in solutions are checked too; realistic quiz preparation time.

## 1.4.x (7 October 2026)
**Android: install the 1.4.0 APK once** (fixes in-app updates on Android).
- 1.4.0: Android updates are downloaded and saved byte for byte, so their integrity check passes.
- 1.4.1: Fast, bounded AI answers with automatic fall-back between free models; quiz keys re-checked.

## 1.3.0 (7 October 2026)
- Upload PowerPoint (.pptx) and text (.txt) chapters as well as PDF.

## 1.2.x (6 to 7 October 2026)
- 1.2.0: Ask AI, AI Quiz and slide navigation, grounded in the slides; Start button fits every board.
- AI server on free models only: Google Gemini free tier with Cloudflare Workers AI as the backup.
- 1.2.1: AI works out of the box; true full screen; entrance exams chosen by group.
- 1.2.2: Entrance exams are IOE and IOM.
- 1.2.3: AI solutions shown as bullet steps in textbook notation.
- Updates are published from a GitHub button (Actions, Publish update): no PowerShell on school machines.

## 1.1.0 (5 October 2026)
- Separate storage for every classroom: one section can never open another's files.
- In-app updates without reinstalling.

## 1.0.x (4 to 5 October 2026)
- 1.0: Class, shift, group, section, subject, portion and teacher flow to the chapter presentations, with the official logo.
- Native Android app (APK) for Hikvision boards, and a Windows desktop app with an installer.
- Wi-Fi download page for sharing the APK (`npm run share`).
- 1.0.1 and 1.0.2: Algebra portion, Morning and Day kept separate, section codes, Exit button fix.
