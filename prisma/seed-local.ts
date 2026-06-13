/**
 * 本地种子数据脚本 — 不依赖 GitHub API
 * 运行: npx tsx prisma/seed-local.ts
 */
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

const DEMO_PROJECTS = [
  {
    githubId: 1,
    name: "transformers",
    fullName: "huggingface/transformers",
    description:
      "State-of-the-art Natural Language Processing for PyTorch and TensorFlow 2.0. Transformers provides thousands of pretrained models to perform tasks on different modalities such as text, vision, and audio.",
    stars: 142000,
    forks: 28000,
    language: "Python",
    topics: JSON.stringify([
      "machine-learning",
      "nlp",
      "deep-learning",
      "pytorch",
      "transformer",
      "bert",
      "gpt",
    ]),
    license: "Apache-2.0",
    homepage: "https://huggingface.co/transformers",
    readme: `# 🤗 Transformers

State-of-the-art Machine Learning for PyTorch, TensorFlow, and JAX.

Transformers provides APIs and tools to easily download and train state-of-the-art pretrained models. Using pretrained models can reduce your compute costs, carbon footprint, and save you the time and resources required to train a model from scratch.

## Key Features
- Natural Language Processing: text classification, NER, QA, translation, summarization
- Computer Vision: image classification, object detection, segmentation
- Audio: automatic speech recognition, audio classification
- Multimodal: table QA, OCR, video classification
- Support for PyTorch, TensorFlow, and JAX

## Quick Start
\`\`\`python
from transformers import pipeline
classifier = pipeline("sentiment-analysis")
result = classifier("I love using Transformers!")
\`\`\`

## Model Hub
Access over 200,000+ pretrained models on the Hugging Face Hub.`,
    defaultBranch: "main",
    lastPushedAt: new Date("2026-06-10"),
  },
  {
    githubId: 2,
    name: "langchain",
    fullName: "langchain-ai/langchain",
    description:
      "🦜🔗 Build context-aware reasoning applications.",
    stars: 103000,
    forks: 17000,
    language: "Python",
    topics: JSON.stringify([
      "llm",
      "ai",
      "agent",
      "rag",
      "chatbot",
      "langchain",
    ]),
    license: "MIT",
    homepage: "https://langchain.com",
    readme: `# 🦜️🔗 LangChain

Build context-aware reasoning applications with LangChain.

LangChain is a framework for developing applications powered by language models. It enables applications that:
- Are context-aware: connect a language model to sources of context (prompt instructions, few shot examples, content to ground its response in, etc.)
- Reason: rely on a language model to reason about how to answer based on provided context, what actions to take, etc.

## Core Components
- **Chains**: Combine LLMs with other components
- **Agents**: Let LLMs choose which tools to use
- **Retrievers**: Fetch relevant documents for RAG
- **Memory**: Persist state between calls`,
    defaultBranch: "master",
    lastPushedAt: new Date("2026-06-12"),
  },
  {
    githubId: 3,
    name: "stable-diffusion-webui",
    fullName: "AUTOMATIC1111/stable-diffusion-webui",
    description:
      "A browser interface for Stable Diffusion, implemented with Gradio library.",
    stars: 150000,
    forks: 28000,
    language: "Python",
    topics: JSON.stringify([
      "stable-diffusion",
      "image-generation",
      "ai-art",
      "gradio",
    ]),
    license: "AGPL-3.0",
    homepage: null,
    readme: `# Stable Diffusion Web UI

A web interface for Stable Diffusion, implemented using Gradio library.

## Features
- Text to Image
- Image to Image
- Inpainting
- Outpainting
- Prompt Matrix
- Stable Diffusion Upscale
- Attention Control
- Loopback
- X/Y/Z plot
- Textual Inversion
- Extensions support

## Installation
\`\`\`bash
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui
cd stable-diffusion-webui
./webui.sh
\`\`\``,
    defaultBranch: "master",
    lastPushedAt: new Date("2026-06-08"),
  },
  {
    githubId: 4,
    name: "ollama",
    fullName: "ollama/ollama",
    description:
      "Get up and running with large language models locally.",
    stars: 110000,
    forks: 9000,
    language: "Go",
    topics: JSON.stringify(["llm", "llama", "gpt", "local-ai", "mistral"]),
    license: "MIT",
    homepage: "https://ollama.com",
    readme: `# Ollama

Get up and running with large language models.

## Quick Start
\`\`\`bash
ollama run llama3.2
\`\`\`

## Supported Models
- Llama 3.2
- Mistral
- Gemma
- Phi-3
- And many more...

## Features
- Run LLMs locally on CPU/GPU
- REST API for integration
- Multi-model support
- Quantization for efficient inference`,
    defaultBranch: "main",
    lastPushedAt: new Date("2026-06-11"),
  },
  {
    githubId: 5,
    name: "pytorch",
    fullName: "pytorch/pytorch",
    description:
      "Tensors and Dynamic neural networks in Python with strong GPU acceleration",
    stars: 86000,
    forks: 25000,
    language: "Python",
    topics: JSON.stringify([
      "deep-learning",
      "machine-learning",
      "neural-networks",
      "gpu",
      "python",
    ]),
    license: "BSD-3-Clause",
    homepage: "https://pytorch.org",
    readme: `# PyTorch

PyTorch is a Python package that provides two high-level features:
- Tensor computation (like NumPy) with strong GPU acceleration
- Deep neural networks built on a tape-based autograd system

## Key Features
- Dynamic computational graphs
- Python-first approach
- Strong GPU acceleration
- Rich ecosystem (TorchVision, TorchText, TorchAudio)
- Production-ready deployment with TorchServe`,
    defaultBranch: "main",
    lastPushedAt: new Date("2026-06-12"),
  },
  {
    githubId: 6,
    name: "llama",
    fullName: "meta-llama/llama",
    description:
      "Inference code for Llama models",
    stars: 60000,
    forks: 10000,
    language: "Python",
    topics: JSON.stringify(["llm", "llama", "meta", "transformer", "inference"]),
    license: "MIT",
    homepage: "https://llama.meta.com",
    readme: `# Llama

Meta's large language model.

## Llama 3
- State-of-the-art open source LLM
- Available in 8B and 70B parameter sizes
- Trained on over 15T tokens
- Competitive with closed-source models

## Architecture
- Optimized transformer architecture
- Grouped-query attention (GQA)
- Improved tokenizer
- Longer context window (8K tokens)`,
    defaultBranch: "main",
    lastPushedAt: new Date("2026-05-20"),
  },
  {
    githubId: 7,
    name: "whisper",
    fullName: "openai/whisper",
    description:
      "Robust Speech Recognition via Large-Scale Weak Supervision",
    stars: 75000,
    forks: 9000,
    language: "Python",
    topics: JSON.stringify([
      "speech-recognition",
      "asr",
      "audio",
      "transformer",
      "openai",
    ]),
    license: "MIT",
    homepage: null,
    readme: `# Whisper

Whisper is a general-purpose speech recognition model. It is trained on a large dataset of diverse audio and is also a multitasking model that can perform multilingual speech recognition, speech translation, and language identification.

## Features
- Multilingual speech recognition
- Speech translation
- Language identification
- Available in multiple sizes (tiny to large)

## Usage
\`\`\`python
import whisper
model = whisper.load_model("base")
result = model.transcribe("audio.mp3")
print(result["text"])
\`\`\``,
    defaultBranch: "main",
    lastPushedAt: new Date("2026-04-15"),
  },
  {
    githubId: 8,
    name: "gpt4all",
    fullName: "nomic-ai/gpt4all",
    description:
      "GPT4All: Run Local LLMs on Any Device. Open-source and available for commercial use.",
    stars: 72000,
    forks: 8000,
    language: "C++",
    topics: JSON.stringify(["llm", "local-ai", "gpt", "cpp"]),
    license: "MIT",
    homepage: "https://gpt4all.io",
    readme: `# GPT4All

GPT4All runs large language models (LLMs) privately on everyday desktops & laptops.

## Features
- Runs on CPU (no GPU required)
- Private and offline
- Open source
- Chat GUI and API
- Supports many model architectures (Llama, Mistral, Falcon, etc.)

## Quick Start
Download the desktop app from https://gpt4all.io`,
    defaultBranch: "main",
    lastPushedAt: new Date("2026-06-01"),
  },
]

async function main() {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  })
  const prisma = new PrismaClient({ adapter })

  console.log("📦 正在写入本地演示数据...\n")

  let added = 0
  for (const project of DEMO_PROJECTS) {
    const existing = await prisma.project.findUnique({
      where: { githubId: project.githubId },
    })
    if (existing) {
      console.log(`⏭️  跳过: ${project.fullName} (已存在)`)
      continue
    }
    await prisma.project.create({ data: project })
    added++
    console.log(`✅ 已添加: ${project.fullName} (⭐ ${project.stars.toLocaleString()})`)
  }

  console.log(`\n📊 完成! 新增 ${added} 个项目。`)
  console.log("💡 现在可以访问 /dashboard 查看项目列表。")

  // Also generate AI analysis for the projects
  if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== "your_deepseek_api_key") {
    console.log("\n🤖 正在用 DeepSeek 生成分析报告...")
    const { analyzeProject } = await import("../src/lib/analyzer")
    const allProjects = await prisma.project.findMany({
      where: { reports: { none: {} } },
      take: 3,
    })
    for (const p of allProjects) {
      try {
        console.log(`  分析 ${p.fullName}...`)
        await analyzeProject(p.id)
        console.log(`  ✅ ${p.fullName} 分析完成`)
        await new Promise((r) => setTimeout(r, 1000))
      } catch (e) {
        console.error(`  ❌ ${p.fullName} 分析失败:`, e)
      }
    }
  } else {
    console.log("\n💡 配置 DEEPSEEK_API_KEY 后，可自动生成 AI 分析报告。")
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("❌ 失败:", e)
  process.exit(1)
})
