import spacy
from bs4 import BeautifulSoup
import re

# Load small english model for sentence segmentation
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    nlp = None

def segment_text(html_content: str):
    if nlp is None:
        raise RuntimeError("SpaCy model 'en_core_web_sm' is not installed. Please run `python -m spacy download en_core_web_sm`.")
    """
    Step 1: Parse block elements
    Step 2: Spacy sentence segmentation
    Step 3: Inline tags mapping
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    segments = []

    # Simple block element extraction
    blocks = soup.find_all(['p', 'div', 'h1', 'h2', 'h3'])

    segment_index = 0
    for block in blocks:
        # Get raw text for spacy (without tags to let it parse sentences)
        raw_text = block.get_text()

        # In a real scenario, spacy needs raw text for accurate segmentation.
        # But inline tags must be protected. This is a complex step in CAT tools.
        # For simplicity in this demo, we'll map tags by extracting them and replacing with markers.

        # Regex to find inline tags like <b>, <i>, <span class="...">
        # A robust solution would walk the DOM tree, marking text nodes and tags.

        doc = nlp(raw_text)
        for sent in doc.sents:
            sentence = sent.text.strip()
            if not sentence:
                continue

            # Dummy inline tag extraction for the specific sentence
            # We assume no inline tags in this simplified parsing step,
            # but we return an empty dict to fit the schema.
            inline_tags = {}

            segments.append({
                "segment_index": segment_index,
                "source_text": sentence,
                "inline_tags": inline_tags
            })
            segment_index += 1

    return segments
