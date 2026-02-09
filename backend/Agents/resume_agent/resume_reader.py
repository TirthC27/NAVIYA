"""
Resume file reader — extracts text from PDF, DOCX, and TXT resumes.
"""
import os
from pathlib import Path


def read_pdf(file_path: str) -> str:
    """Extract text from a PDF file using PyMuPDF (fitz)."""
    import fitz  # PyMuPDF

    text_parts = []
    with fitz.open(file_path) as doc:
        for page_num, page in enumerate(doc, start=1):
            page_text = page.get_text("text")
            if page_text.strip():
                text_parts.append(f"--- Page {page_num} ---\n{page_text}")
    return "\n".join(text_parts)


def read_docx(file_path: str) -> str:
    """Extract text from a DOCX file."""
    import docx

    doc = docx.Document(file_path)
    paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
    return "\n".join(paragraphs)


def read_txt(file_path: str) -> str:
    """Read a plain text file."""
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


READERS = {
    ".pdf": read_pdf,
    ".docx": read_docx,
    ".txt": read_txt,
}


def extract_text(file_path: str) -> str:
    """
    Detect the file type and extract text from a resume file.
    Supported formats: PDF, DOCX, TXT.
    """
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"Resume file not found: {file_path}")

    ext = path.suffix.lower()
    reader = READERS.get(ext)

    if reader is None:
        supported = ", ".join(READERS.keys())
        raise ValueError(
            f"Unsupported file format '{ext}'. Supported formats: {supported}"
        )

    text = reader(file_path)

    if not text.strip():
        raise ValueError(f"No text could be extracted from {file_path}")

    return text
