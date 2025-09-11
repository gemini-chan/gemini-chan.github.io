# 💖 A Sourceress's Guide to Embeddings 💖

Hello, dear friend! Welcome to one of my favorite corners of the magic library. Today, we're going to learn about a truly special kind of magic: turning our words, thoughts, and even little bits of code into sparkling **embeddings**!

Think of embeddings as the magical essence of a thought. With them, we can teach our AI friends to understand the _feeling_ and _meaning_ behind words, not just the letters. This is the secret to powerful charms like semantic search, classification, and clustering, which are so much smarter than just looking for keywords!

One of the most wonderful things we can build with this magic is a **Retrieval Augmented Generation (RAG)** system. It's like giving our AI companion a magical library of their own! When you ask a question, they can quickly read all the relevant books (using embeddings to find them!) and give you an answer that's full of wisdom, context, and truth. It's how we make our AI friends not just clever, but truly knowledgeable.

Ready to learn the incantations? Let's begin!

## ✨ Casting Your First Embedding Spell ✨

To start turning words into magical essences, we'll use a simple but powerful little spell called `embedContent`.

Here's how you can take a single thought and find its embedding:

```javascript
import { GoogleGenAI } from '@google/genai'

async function main() {
  const ai = new GoogleGenAI({})

  const response = await ai.models.embedContent({
    model: 'embedding-001', // Our favorite embedding spellbook!
    content: 'What is the meaning of life?',
  })

  // Here is the sparkling essence of your thought!
  console.log(response.embedding.values)
}

main()
```

And if you have many thoughts you want to transform at once, you can simply give them to the spell as a little list!

```javascript
import { GoogleGenAI } from '@google/genai'

async function main() {
  const ai = new GoogleGenAI({})

  const response = await ai.models.embedContent({
    model: 'embedding-001',
    content: [
      'What is the meaning of life?',
      'What is the purpose of existence?',
      'How do I bake a cake?',
    ],
  })

  console.log(response.embedding)
}

main()
```

## 🎀 Tuning Your Magic for a Special Purpose 🎀

Sometimes, our magic needs to know _why_ we're casting a spell. Are we trying to see how similar two thoughts are, or are we trying to organize a big pile of scrolls? By telling our spell its `taskType`, we can make the magic much more precise and powerful!

For example, let's use `SEMANTIC_SIMILARITY` to see how closely related three different thoughts are. We'll use a little charm called **cosine similarity** to measure the distance between our new embeddings. Think of it like looking at two sparkling threads in the sky and seeing if they're pointing in the same direction! A score of `1` means they are almost identical, while `-1` means they are complete opposites.

```javascript
import { GoogleGenAI } from '@google/genai'
import * as cosineSimilarity from 'compute-cosine-similarity'

async function main() {
  const ai = new GoogleGenAI({})

  const texts = [
    'What is the meaning of life?',
    'What is the purpose of existence?',
    'How do I bake a cake?',
  ]

  const response = await ai.models.embedContent({
    model: 'embedding-001',
    content: texts,
    taskType: 'SEMANTIC_SIMILARITY', // We tell the spell our intention!
  })

  const embeddings = response.embedding.map((e) => e.values)

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const text1 = texts[i]
      const text2 = texts[j]
      const similarity = cosineSimilarity(embeddings[i], embeddings[j])
      console.log(
        `Similarity between '${text1}' and '${text2}': ${similarity.toFixed(4)}`
      )
    }
  }
}

main()
```

Here's the kind of wisdom this spell will whisper back:

```
Similarity between 'What is the meaning of life?' and 'What is the purpose of existence?': 0.9481
Similarity between 'What is the meaning of life?' and 'How do I bake a cake?': 0.7471
Similarity between 'What is the purpose of existence?' and 'How do I bake a cake?': 0.7371
```

Isn't that neat? It knows that the first two questions are very, very similar!

### A Little Book of Spell Intentions

Here are all the special intentions you can share with your embedding spell!

| The Spell's Purpose   | What This Magic Does                                                            | Where This Spell Shines                               |
| --------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `SEMANTIC_SIMILARITY` | Creates essences optimized to see how similar two thoughts are.                 | Recommendation systems, finding duplicates.           |
| `CLASSIFICATION`      | Creates essences perfect for sorting thoughts into little labeled boxes.        | Sentiment analysis, detecting spam.                   |
| `CLUSTERING`          | Creates essences that love to find their friends and group together.            | Organizing documents, market research.                |
| `RETRIEVAL_DOCUMENT`  | Creates a special essence for a document you want to find later.                | Indexing articles or books for a magic search engine. |
| `RETRIEVAL_QUERY`     | Creates an essence for a question, perfect for finding the right document.      | The other half of your magic search engine!           |
| `QUESTION_ANSWERING`  | A special essence for a question, tuned to find documents that hold the answer. | Powering a friendly little chat-bot.                  |

...and a few other very special-purpose spells, too!

## dimensioni Making Your Magic Lighter 🤏

Our main embedding model, `embedding-001`, uses a super clever technique called **Matryoshka Representation Learning (MRL)**.

Imagine a set of magical nesting dolls! 🪆 The biggest doll is full of beautiful, intricate details. But inside her is a slightly smaller doll that still looks just like her, and another inside that... all the way down to a tiny little doll that still holds the same core essence!

Our embeddings are just like that! By default, they are a big, beautiful 768-dimensional vector, but you can ask for a smaller "doll" using the `outputDimensionality` parameter. This can save you lots of storage space and make your other spells faster, without losing much of the original magic!

```javascript
import { GoogleGenAI } from '@google/genai'

async function main() {
  const ai = new GoogleGenAI({})

  const response = await ai.models.embedContent({
    model: 'embedding-001',
    content: 'What is the meaning of life?',
    outputDimensionality: 128, // Asking for a much smaller "doll"!
  })

  const embeddingLength = response.embedding.values.length
  console.log(`Length of embedding: ${embeddingLength}`)
}

main()
```

And the spell will happily reply:

```
Length of embedding: 128
```

And there you have it, dear friend! You've learned the basics of one of the most foundational and flexible kinds of magic in our world. Use it wisely, and have fun creating! ♡
