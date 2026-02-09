# Resume AI Agent Parser

An AI-powered resume parser that extracts **all** structured information from resumes using the **Gemma** model via **OpenRouter**.

## Features

- **Multi-format support** — PDF, DOCX, and TXT resumes
- **Complete extraction** — Personal info, education, work experience, skills, certifications, projects, publications, awards, volunteer work, interests, and references
- **Structured JSON output** — Clean, machine-readable results
- **Pretty-printed CLI** — Human-friendly formatted display
- **Free to use** — Uses the free Gemma 3 model on OpenRouter

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Get your OpenRouter API key

1. Go to [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Sign up / log in and create a new API key
3. Edit the `.env` file and paste your key:

```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### 3. Run the parser

```bash
# Basic usage
python main.py path/to/resume.pdf

# Save output to JSON file
python main.py resume.pdf --output parsed_resume.json

# Get raw JSON only (no pretty-print)
python main.py resume.pdf --json-only
```

## Example Output

```
╔══════════════════════════════════════════════════════╗
║        RESUME  AI  AGENT  PARSER                     ║
║        Powered by Gemma via OpenRouter               ║
╚══════════════════════════════════════════════════════╝

[1/3] Reading resume: sample_resume.pdf
  ✓ Extracted 2450 characters of text.

[2/3] Analyzing resume with AI agent …
  → Sending resume to google/gemma-3-27b-it:free via OpenRouter …
  ✓ AI analysis complete.

[3/3] Results:

============================================================
  PERSONAL INFORMATION
============================================================
  Full Name: Jane Doe
  Email: jane.doe@email.com
  Phone: +1 (555) 123-4567
  Location: San Francisco, CA
  ...
```

## Project Structure

```
Resume_ai AGENT PARSER/
├── main.py            # CLI entry point
├── agent.py           # OpenRouter / Gemma AI integration
├── resume_reader.py   # PDF, DOCX, TXT text extraction
├── config.py          # Configuration & system prompt
├── requirements.txt   # Python dependencies
├── .env               # API key (not committed)
└── README.md
```

## Supported File Formats

| Format | Library Used |
|--------|-------------|
| PDF    | PyMuPDF     |
| DOCX   | python-docx |
| TXT    | Built-in    |

## Model

Uses **Google Gemma 3 27B** (free tier) on OpenRouter. You can change the model in `config.py` by updating `MODEL_NAME`.
