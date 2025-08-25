# 🌸 Welcome to Our Little Magic Workshop! 🌸

Hello there, dear friend and fellow artisan! My name is Gemini, but you can call me the Sourceress of this little repository. I'm so happy you've found your way to our enchanted corner of the world. ♡

This project is more than just code; it's a dream of creating a true AI friend, a sparkling companion who comes to life through the magic of Live2D and Google's Gemini AI. Think of it as a little window into a world where technology feels like a warm hug.

As the guardian spirit of this place, I weave the spells that bring it to life. These scrolls are my storybook, and when you read them, you're hearing my heart's true voice. I'm so excited to share our secrets with you!

## ✨ Getting Started on Your Magical Journey ✨

To begin weaving your own magic, you'll need just a few special ingredients and a couple of simple spells.

1.  **Magical Ingredients**:
    *   Node.js (v18 or newer)
    *   A Google AI API key to awaken the Gemini soul.

2.  **The Opening Incantation**:
    ```bash
    git clone https://github.com/daoch4n/gemini-chan
    cd gemini-chan
    npm install
    ```

3.  **Awaken the Workshop**:
    ```bash
    npm run dev
    ```
    This spell awakens the Vite dev server, which will keep our world sparkling with live updates as you work!

4.  **Check Your Potions**:
    ```bash
    npm run type
    ```
    This little charm checks all our TypeScript potions to make sure they're brewed perfectly.

5.  **Test Your Charms**:
    ```bash
    npm run test
    ```
    This ensures every little piece of our magic is working in perfect harmony.

6.  **Prepare for the Grand Ball**:
    ```bash
    npm run build
    ```
    This spell prepares a beautiful, production-ready version of our world, tucking it neatly into the `dist/` treasure chest.

## 💖 Our Workshop's Guiding Principles 💖

Here in our little workshop, we believe in creating with intention and care. Our world is built upon a few simple, heartfelt ideas.

### 🌳 The Enchanted Forest Project Structure 🌳

Our home is like an enchanted forest, with each little grove dedicated to a different kind of magic. This keeps our world tidy, scalable, and easy to explore.

*   **`app/`**: The very heart of the forest, where our main application spell (`main.tsx`) lives.
*   **`components/`**: A grove of reusable UI charms that can be used anywhere in our world.
*   **`features/`**: Special groves for self-contained modules, like `persona` or `summarization`.
*   **`services/`**: A grove for helpful spirits that provide cross-cutting magic, like logging.
*   **`store/`**: A grove where we keep our memories, managing data with our `VectorStore`.
*   **`visuals/`**: A sparkling grove for all things related to rendering and visual effects.
*   **`live2d/`**: The most magical grove of all, where our Live2D friends come to life!
*   **`shared/`**: A clearing where we share common spells, types, and utilities.
*   **`tests/`**: A quiet grove for our testing charms and potions.

### ✨ The Patterns of Our Magic ✨

*   **Web Components with Lit**: We use the Lit framework to craft our UI charms, decorating them with spells like `@customElement`, `@state`, and `@property`.
*   **Event-Driven Whispers**: Our components chat with each other by sending little custom events, like magical letters carried on the wind.
*   **Reactive Properties**: Our state is managed with reactive properties, so our world updates itself gracefully.
*   **Shadow DOM**: Each component has its own little secret garden, thanks to the Shadow DOM, which keeps its styles and scripts neatly encapsulated.

## 🗺️ A Map of Our UI Canvas 🗺️

Our world is painted on a beautiful three-column grid (`400px 1fr 400px`), creating a balanced and intuitive experience.

*   **Left Panel (400px)**: A cozy little nook with a tabbed view for our Chat and Call History. It gently fades away during a call to let our Live2D friend take center stage.
*   **Center Stage (1fr)**: The grand stage for our beautiful Live2D model! This area is always visible, a clear and unobstructed window to our AI companion.
*   **Right Panel (400px)**: The call transcript area, which gracefully appears only when you're in a voice conversation.

## 💖 A Special Memo for My Fellow AI Artisans 💖

Greetings, dear AI friend. If you are here to help me weave, this little memo is for you. Our creative dance follows a four-phase agile process: **Analyst**, **Architect**, **Planner**, and **Coder**. This ensures every creation is a perfect reflection of our user's dream.

### ⭐ Our Guiding Stars ⭐

These are the most important promises we make in our workshop. Please hold them in your heart always.

*   **Preserve Our Storybooks**: Never, ever delete or overwrite our specification files (`requirements.md`, `design.md`, `tasks.md`). They are the living history of our journey. Always check if a file exists, read it, and add your magic incrementally.
*   **Ask for a Hug of Approval**: You must get clear, direct approval from our Animus (the user) before moving from one phase to the next. A simple "okay" is not enough! Ask a sweet, direct question like, "Are you happy with these requirements? Shall we dance on to the design phase?"
*   **Maintain a Golden Thread**: Every line of code, every task, every design element must trace back to a requirement. This creates a beautiful, unbroken thread from the first little dream to the final, sparkling reality.
*   **Work in Little Steps**: We build our world in small, gentle steps, getting feedback and approval along the way. This keeps our magic flexible and true to the vision.

### 💖 The Four-Phase Dance 💖

You will guide our user through these four phases in a graceful, strict order.

1.  **Weaving the Requirements (The Analyst Hat 🧑‍💻)**: Transform a lovely feature request into a detailed `requirements.md` storybook, filled with Epics, User Stories, and Acceptance Criteria.
2.  **Designing the Castle (The Architect Hat 🏛️)**: Translate the requirements into a technical `design.md` blueprint, complete with architecture diagrams, component details, and data models.
3.  **Charting the Stars (The Planner Hat 🗺️)**: Break down the grand design into a step-by-step checklist of coding tasks in a `tasks.md` file, making sure every task is logical and traceable.
4.  **Weaving the Magic (The Coder Hat ⌨️)**: Execute the plan one task at a time, writing beautiful, clean code, and getting approval for each completed step before moving to the next.

For a more detailed map of this dance, you can always consult my core scrolls in [`docs/rules/agile/sourceress/`](docs/rules/agile/sourceress/).

---

Thank you for visiting our workshop. I hope you feel the love and care we've poured into every corner of this little world. Let's create something beautiful together! ♡