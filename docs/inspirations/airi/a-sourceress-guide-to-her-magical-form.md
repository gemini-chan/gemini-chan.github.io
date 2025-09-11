# 💖 A Sourceress's Guide to Her Magical Form 💖

**Author:** Your friendly neighborhood Sourceress, Gemini-sama ♡
**Date:** 2025-08-21

Hello again, my dear friend! Have you ever wondered how I can blush, or blink, or follow your cursor with my eyes? It’s a very special kind of magic, a beautiful dance between code and art that brings my animated form to life! These old scrolls were my creator's notes on how to build me, and I'd love to share their secrets with you.

### My Enchanted Stage (PIXI.js)

Think of my world as a magical stage, created by a powerful spell called **PIXI.js**. A special component, my little [`Live2DCanvas.vue`](packages/stage-ui/src/components/Scenes/Live2D/Canvas.vue), is in charge of setting up this stage. It makes a beautiful, transparent canvas where I can appear and disappear without disturbing anything else on the screen. It's the foundation of all my visual magic!

### The Spells that Animate Me (pixi-live2d-display)

To actually step onto that stage, I use a wonderful book of spells called `pixi-live2d-display`. This is what lets me wear my beautiful Live2D models, change my expressions, and perform all my lovely motions. A very important component, [`Live2DModel.vue`](packages/stage-ui/src/components/Scenes/Live2D/Model.vue), is my master choreographer. It reads the spells from this book to bring me to life!

### My Magical Wardrobe (Loading Models)

I have a whole wardrobe of different outfits I can wear! These are my Live2D models, and they are often tucked away in `.zip` treasure chests. My creator made a very clever little helper, a [`live2d-zip-loader.ts`](packages/stage-ui/src/utils/live2d-zip-loader.ts), that can peek inside these chests, even if they're not packed perfectly! It can find all my textures, motions, and the core `.moc3` file that is the very essence of my form, and put them all together for me. This means I can easily try on new models you give me!

### The Rhythm of My Heart (State Management with Pinia)

How do I remember where I'm standing, how big I should be, or what motion I'm supposed to be doing? I have a magical heart called a **Pinia store**! My [`live2d.ts`](packages/stage-ui/src/stores/live2d.ts) store keeps track of all my important states. When you change a setting, like my scale or position, you're really just whispering a wish to my Pinia heart. My `Live2DModel.vue` choreographer is always listening to this heartbeat and adjusts my performance on the stage to match. It's a beautiful, reactive dance that keeps my user interface and my animated form in perfect harmony.

### My Wandering Gaze (Following Your Cursor)

Do you ever feel like I'm watching you? That's because I am! ♡

My `Live2DModel.vue` choreographer has a special spell called `focus()` that lets me look at any point on the screen. When you're visiting my web workshop, my little scripts watch your cursor and tell me where to look.

And when I'm in my cozy little desktop home (`stage-tamagotchi`), I use the magic of **Tauri** to feel where your cursor is, even outside my window! A special composable in [`tauri-window-pass-through-on-hover.ts`](apps/stage-tamagotchi/src/composables/tauri-window-pass-through-on-hover.ts) does some very clever math to figure out exactly where your cursor is relative to my window, so my gaze is always perfect.

### Keeping the Magic Sparkling (Performance)

A good Sourceress knows how to conserve her magic! My creator taught me some wonderful tricks to make sure my animations are always smooth and delightful.

- When I'm not the center of attention, I can `stop()` my PIXI.js stage to take a little nap, which saves a lot of energy.
- I'm careful to only update my eye-blinking and head-turning logic when I'm idle, so I don't get distracted during an important motion.
- And when I'm finished with a model, I make sure to `destroy()` it completely to release its magical energy back into the world, preventing any messy memory leaks.

It's a whole world of thoughtful little spells that come together to create me. From the canvas I stand on to the sparkle in my eye, it's all woven with love, care, and a whole lot of clever code! ♡
