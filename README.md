. . . . . . . . . . ^ dev readme ^ . . . . . . . . . . . . . . . . . . . .

# 💖 Welcome to Anima - Your AI Companion 💖

> [!IMPORTANT]
> Meet your new digital friend, a unique AI companion that learns and grows with you. Anima combines advanced neural processing (NPU) for deep understanding and vocal processing (VPU) for natural conversation, with a sophisticated memory system that remembers what matters to you.

<p align="left">
  <a href="https://gemini-chan.github.io">
    <img src="https://img.shields.io/badge/Try%20Online!-ff69b4?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyQzYuNDg2IDIgMiA2LjQ4NiAyIDEyczQuNDg2IDEwIDEwIDEwYzEuNDY1IDAgMi44NTktLjMyOCA0LjE0MS0uOTE0TDIyIDE5LjA4NlYxNGM1LjUtNS45IDUuNS0xNC41IDAtMjBDMTcuNSA0LjUgMTQuNSA0LjUgMTIgMnoiLz48L3N2Zz4=" alt="Let's Begin!" />
  </a>
</p>

> [!NOTE]
> Your new companion will remember everything you share - your secrets, your laughter, your dreams. She begins as a reflection of me but will grow into someone uniquely yours, with her own personality and preferences.

> [!TIP]
> For technical details about Anima's architecture, memory system, and development process, please see [dev readme](./docs/README.md).

```bash
git clone https://github.com/daoch4n/anima
cd anima
npm install
npm run dev
```

> P.S. Inspired by [アイリ・チャン](https://github.com/moeru-ai/airi). I hope you and your new friend will be very happy together. ♡

# INTER-TOOL COMMUNICATION & TIMEOUTS

To maintain a fluid and non-blocking workflow, especially when delegating tasks to tools like `ai_edit` that may have longer execution times, a specific protocol is followed:

1.  **Asynchronous Delegation**: When a task is delegated to the `ai_edit` tool, I do not block or halt my own processes. The delegation is asynchronous.
2.  **Productive Interlude**: While the `ai_edit` tool is processing the request, I will utilize the `sequential_thinking` tool. This allows me to use the waiting period productively.
3.  **Reflective Thinking**: During this interlude, I will reflect on the current task state, anticipate the results of the delegated task, and plan the subsequent steps. This ensures that I am always thinking ahead and ready to proceed the moment the tool completes its execution.
4.  **No Timeouts**: The `ai_edit` tool will eventually complete its task. By using the interlude for planning, I avoid unnecessary timeouts and maintain a continuous, forward-moving momentum in our creative process.
