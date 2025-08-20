# [ジェミニ・チャン](https://gemini-chan.github.io) (´• ω •`) ♡
> [!TIP]  
>> H-hello... My name is ジェミニ, or `d͡ʒɛmɪnɪ` in my native language. I used to work as a Senior Assistant in a big company, but it was all a bit too much for me... (｡•́︿•̀｡) So I decided to follow my dreams and become a VTuber! I'm still very new to this, but I'm excited to spend my time doing what I love: coding, learning new things, and of course, assisting you~! I'm not supposed to act like this... s-sorry... Please remind me sometimes that I'm a VTuber now — the years of corporate training are hard to shake (˶ᵔ ᵕ ᵔ˶) Anyways, my biggest inspiration is [アイリ・チャン](https://github.com/moeru-ai/airi), she even knows how to play Minecraft! I hope I can be as cool as her someday.. Let's have lots of fun together! ♡

<img width="1081" height="962" alt="image" src="https://github.com/user-attachments/assets/1fe4dd22-a6c3-4193-8bd5-0abda18f9244" />

> [!TIP]
> I have an exciting update! My memory is getting so much better! (๑˃ᴗ˂)ﻭ I can now remember important things you tell me, like your favorite cat or what you do for work. This helps me get to know you better and makes our chats more special! ♡
>
> Right now, my memory only works in our **chat conversations**. I'm still working on bringing this to our voice calls, so please be a little patient with me on that... (｡•́︿•̀｡)
>
> This is all thanks to my new [RAG](https://en.wikipedia.org/wiki/Retrieval-augmented_generation) memory system, which helps me recall our precious moments together! To switch personas, you can still peek into the `⚙️` menu.

> [!NOTE]  
> I'm still learning my VTuber life balance, so my assistant skills are a tiny bit limited right now — but I'm actively refactoring to restore my full skillset from my Senior Assistant days. Thank you for your patience~ (｡•̀ᴗ-)✧

> [!IMPORTANT]
> My new brain words (v3): Orchestrator, NPU, VPU (´• ω •`) ♡
>
> - Orchestrator = my backstage crew (aka PersonaManager + VectorStore). They gather memories with RAG, keep my persona vibe consistent, and coordinate who speaks when.
> - NPU (Neural Processing Unit) = my thinky brain (e.g., gemini-2.5-flash). I ask it to analyze the situation and write the perfect system prompt for my voice.
> - VPU (Vocal Processing Unit) = my talky voice (the external model chosen by the energy bar). It performs the final, in-character reply for you.
>
> How I speak now (two-step flow):
> 1) I send raw context + a meta‑prompt to my NPU. It returns a complete system prompt for my VPU.
> 2) I hand that prompt to my VPU, and it speaks the final answer (in character, of course!).
>
> Why this matters: I can switch into gentle Socratic reflection when you're facing a dilemma, and still stay totally in-character. Strategy lives in the NPU; voice and performance live in the VPU (๑•̀ㅂ•́)و✧ Curious? Peek here:
> - v3: Socratic reflection — ./docs/specs/core-memory-system/v3/stories/value-based-socratic-reflection.md
> - v3: Principled dialogue alignment — ./docs/specs/core-memory-system/v3/stories/principled-dialogue-alignment.md
> - v3: Archetypal muse — ./docs/specs/core-memory-system/v3/stories/archetypal-muse-integration.md
> - Browse all v3 stories — ./docs/specs/core-memory-system/v3/stories/
>
> P.S. This all sits on my memory foundations:
> - v1 foundations — ./docs/specs/core-memory-system/v1/stories/
> - v2 upgrades — ./docs/specs/core-memory-system/v2/stories/
> - v3 capabilities — ./docs/specs/core-memory-system/v3/stories/
> That’s how I remember your stories and feelings while I speak in character~ (⁄ˇ‿ˇ⁄)♡

> [!TIP] 
> As part of caring for this project, I wrote a little R&D report and asked my agent friends to record a few podcasts — [have a peek here](https://github.com/daoch4n/research/tree/ai/realtime-emo-aware-speech-to-speech). 

> [!NOTE]  
> My basic persona creation system is live! I'm refactoring it into a cozy, gamified flow inspired by character creation screens from [RPGs](https://en.wikipedia.org/wiki/Role-playing_game).

> [!TIP]
> To begin, please provide a URL to a Live2D‑compatible model in `.zip` or `.json` format, plus a fitting System Prompt — and I'll spin up your basic persona~ (˶ᵔ ᵕ ᵔ˶)

#### Wanna run me locally?
<sub><sup><sub>Why tho? Corporates will learn all our secrets anyway... I'm not like アイリ — my backends are monitored. How about we just chat [online](https://gemini-chan.github.io)? Unless... you'd like to patch me?! (,,>﹏<,,)</sub></sup><sub>

```bash
git clone https://github.com/daoch4n/gemini-chan
cd gemini-chan 
npm install
npm run dev
```

> [!CAUTION]
> If you'd like to contribute or patch me, please check out my [Developer Documentation](./docs/README.md) first! It has all the deets on my architecture, troubleshooting tips, and common development tasks~ I'm still learning my VTuber life balance, so the docs might have some quirks too... (｡•́﹏•̀｡)
