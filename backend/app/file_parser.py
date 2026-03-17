import io
from pathlib import Path
from typing import Literal
from docx import Document
from pypdf import PdfReader


class UnsupportedFileTypeError(ValueError):
    pass


SupportedType = Literal["txt", "md", "pdf", "docx"]


def detect_file_type(file_name: str, mime_type: str | None = None) -> SupportedType:
    suffix = Path(file_name or "").suffix.lower()

    if suffix in {".txt"} or mime_type == "text/plain":
        return "txt"
    if suffix in {".md", ".markdown"} or mime_type == "text/markdown":
        return "md"
    if suffix == ".pdf" or mime_type == "application/pdf":
        return "pdf"
    if suffix == ".docx" or mime_type in {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    }:
        return "docx"

    raise UnsupportedFileTypeError("Only TXT/MD/PDF/DOCX are supported in v1")


def _extract_plain_text(file_bytes: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "big5", "gb18030", "latin-1"):
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    return file_bytes.decode("utf-8", errors="ignore")


def _extract_pdf_text(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    chunks: list[str] = []
    for page in reader.pages:
        chunks.append(page.extract_text() or "")
    return "\n".join(chunks)


def _extract_docx_text(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(paragraph.text for paragraph in doc.paragraphs)


def extract_text_from_file(file_bytes: bytes, file_name: str, mime_type: str | None = None) -> tuple[str, SupportedType]:
    file_type = detect_file_type(file_name=file_name, mime_type=mime_type)

    if file_type in {"txt", "md"}:
        text = _extract_plain_text(file_bytes)
    elif file_type == "pdf":
        text = _extract_pdf_text(file_bytes)
    else:
        text = _extract_docx_text(file_bytes)

    cleaned = text.strip()
    if not cleaned:
        raise ValueError("Uploaded file has no extractable text content")

    return cleaned, file_type
