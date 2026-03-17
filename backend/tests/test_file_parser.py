import io
import pytest
from docx import Document
from app.file_parser import UnsupportedFileTypeError, detect_file_type, extract_text_from_file


def test_detect_file_types():
    assert detect_file_type("a.txt") == "txt"
    assert detect_file_type("a.md") == "md"
    assert detect_file_type("a.pdf") == "pdf"
    assert detect_file_type("a.docx") == "docx"


def test_extract_text_from_txt_success():
    text, file_type = extract_text_from_file(b"hello world", file_name="note.txt", mime_type="text/plain")
    assert file_type == "txt"
    assert text == "hello world"


def test_extract_text_from_docx_success():
    doc = Document()
    doc.add_paragraph("Mindmap from docx")
    buffer = io.BytesIO()
    doc.save(buffer)

    text, file_type = extract_text_from_file(buffer.getvalue(), file_name="report.docx")
    assert file_type == "docx"
    assert "Mindmap from docx" in text


def test_extract_text_rejects_unsupported_extension():
    with pytest.raises(UnsupportedFileTypeError):
        extract_text_from_file(b"content", file_name="archive.zip")


def test_extract_text_rejects_empty_content():
    with pytest.raises(ValueError):
        extract_text_from_file(b"   ", file_name="blank.txt")
