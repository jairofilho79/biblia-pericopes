/**
 * One-shot: gera logo-master.png via OpenRouter Gemini 3 Pro Image.
 * Uso: npx tsx scripts/generate-logo.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public/brand/logo-master.png')
const MODEL = 'google/gemini-3-pro-image-preview'

const PROMPT = `Create a single app icon / logo mark for a Progressive Web App called "Perícopes".

App context:
- Daily Bible study in Portuguese, reading by pericopes (narrative units), not random chapters.
- Offline-first PWA for young people and teens who already know a little of the Bible and want to go deeper.
- Goal: know God and Jesus through each pericope, with warm, clear, readable design — never preachy or cluttered.

Visual requirements (strict):
- Square 1:1 composition, designed as a mobile home-screen icon.
- SYMBOL ONLY — no letters, no words, no "Perícopes" text.
- Simple, bold shapes that stay readable at 32–48px.
- Flat / semi-flat modern mark (not photorealistic, not 3D glossy).
- Primary color: deep sage green #2f5d50; secondary: warm paper cream #f3efe6; optional soft highlight of light/warmth.
- Motif idea: an open book or a short reading block (pericope) with a gentle path of light or a soft dawn glow — suggesting focused reading and discovery, not a church building or ornate cross.
- Keep ~20% safe margin from the edges (maskable PWA icon).
- Solid background in sage green OR cream paper — no busy gradients, no photoreal texture, no watermark.
- Centered, balanced, professional mobile app icon.`

async function main() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY ausente')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: PROMPT }],
      modalities: ['image', 'text'],
      image_config: { aspect_ratio: '1:1', image_size: '2K' },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 500)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { images?: { image_url?: { url?: string } }[]; content?: string } }[]
  }
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!url) {
    console.error(JSON.stringify(data, null, 2).slice(0, 2000))
    throw new Error('Resposta sem imagem')
  }

  let buf: Buffer
  if (url.startsWith('data:')) {
    const b64 = url.replace(/^data:image\/\w+;base64,/, '')
    buf = Buffer.from(b64, 'base64')
  } else {
    const img = await fetch(url)
    if (!img.ok) throw new Error(`Download imagem falhou: ${img.status}`)
    buf = Buffer.from(await img.arrayBuffer())
  }

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, buf)
  console.log(`OK ${OUT} (${buf.length} bytes)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
