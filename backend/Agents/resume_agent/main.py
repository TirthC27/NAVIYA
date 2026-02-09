"""
Resume AI Agent Parser — CLI entry point.

Usage:
    python main.py <path_to_resume>
    python main.py resume.pdf
    python main.py resume.docx --output result.json
"""

import argparse
import json
import sys
from pathlib import Path

from resume_reader import extract_text
from agent import call_gemma
from display_utils import pretty_print_analysis


BANNER = r"""
╔══════════════════════════════════════════════════════╗
║   RESUME  AI  AGENT  PARSER  (Domain-Agnostic)       ║
║        Powered by Gemini via OpenRouter              ║
╚══════════════════════════════════════════════════════╝
"""


def main():
    parser = argparse.ArgumentParser(
        description="Resume AI Agent Parser — Extract structured information from resumes using Gemma AI."
    )
    parser.add_argument(
        "resume",
        help="Path to the resume file (PDF, DOCX, or TXT)",
    )
    parser.add_argument(
        "--output", "-o",
        help="Save parsed JSON output to a file",
        default=None,
    )
    parser.add_argument(
        "--json-only",
        help="Print only raw JSON (no pretty-print)",
        action="store_true",
    )

    args = parser.parse_args()

    print(BANNER)

    # Step 1: Read the resume
    resume_path = args.resume
    print(f"[1/3] Reading resume: {resume_path}")
    try:
        resume_text = extract_text(resume_path)
    except (FileNotFoundError, ValueError) as e:
        print(f"\n  ERROR: {e}")
        sys.exit(1)

    print(f"  ✓ Extracted {len(resume_text)} characters of text.")

    # Step 2: Send to AI agent
    print(f"\n[2/3] Analyzing resume with AI agent …")
    try:
        parsed_data = call_gemma(resume_text)
    except (EnvironmentError, RuntimeError) as e:
        print(f"\n  ERROR: {e}")
        sys.exit(1)

    print("  ✓ AI analysis complete.")

    # Step 3: Output results
    print(f"\n[3/3] Results:\n")

    if args.json_only:
        print(json.dumps(parsed_data, indent=2, ensure_ascii=False))
    else:
        pretty_print_analysis(parsed_data)
        print(f"\n{'='*70}")
        print("  Full JSON output:")
        print(f"{'='*70}")
        print(json.dumps(parsed_data, indent=2, ensure_ascii=False))

    # Save to file if requested
    if args.output:
        output_path = Path(args.output)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(parsed_data, f, indent=2, ensure_ascii=False)
        print(f"\n  ✓ Saved parsed data to: {output_path}")

    print("\nDone!")


if __name__ == "__main__":
    main()
