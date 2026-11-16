
import os

from dotenv import load_dotenv
from urllib.parse import urlsplit, urlunsplit

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document


# Load environment variables
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY is missing from .env")


# Initialize Gemini Embedding 1
embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    google_api_key=API_KEY
)


# Store indexes in memory
page_indexes = {}


# Configure text splitter
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1200,
    chunk_overlap=250,
    separators=[
        "\n\n",
        "\n",
        " | ",
        ". ",
        " ",
        ""
    ],
    length_function=len
)


# Normalize URLs to avoid indexing/retrieval mismatches
def normalize_url(url: str) -> str:

    parsed = urlsplit(str(url))

    scheme = parsed.scheme.lower()
    hostname = (parsed.hostname or "").lower()

    if not hostname:
        raise ValueError("Invalid webpage URL")

    # Preserve non-default ports
    port = parsed.port

    if port and not (
        (scheme == "http" and port == 80) or
        (scheme == "https" and port == 443)
    ):
        hostname = f"{hostname}:{port}"

    path = parsed.path.rstrip("/") or "/"

    # Ignore fragments, preserve query parameters
    normalized = urlunsplit((
        scheme,
        hostname,
        path,
        parsed.query,
        ""
    ))

    return normalized


# INDEX WEBPAGE
def index_webpage(url: str, title: str, content: str):

    if not content.strip():
        raise ValueError("Webpage content is empty")

    normalized_url = normalize_url(url)

    document = Document(
        page_content=content,
        metadata={
            "source": normalized_url,
            "title": title
        }
    )

    # Split webpage into chunks
    chunks = text_splitter.split_documents([document])

    if not chunks:
        raise ValueError("No text chunks generated")

    print(f"Generating embeddings for {len(chunks)} chunks...")

    # Create FAISS vector database
    vector_store = FAISS.from_documents(
        documents=chunks,
        embedding=embeddings
    )

    # Save index in memory
    page_indexes[normalized_url] = vector_store

    print("INDEX STORED:", normalized_url)
    print("TOTAL CHUNKS:", len(chunks))

    return {
        "total_chunks": len(chunks),
        "total_characters": len(content),
        "indexed_url": normalized_url
    }


# RETRIEVE RELEVANT CONTEXT
def retrieve_context(url: str, question: str, k: int = 4):

    normalized_url = normalize_url(url)

    print("CHAT REQUEST URL:", normalized_url)
    print("AVAILABLE INDEXES:", list(page_indexes.keys()))

    vector_store = page_indexes.get(normalized_url)

    if vector_store is None:
        raise ValueError(
            f"Page not indexed. Please reopen the webpage and retry. "
            f"Requested URL: {normalized_url}"
        )

    # Retrieve relevant webpage chunks
    relevant_chunks = vector_store.similarity_search(
        question,
        k=k
    )

    if not relevant_chunks:
        return ""

    context = "\n\n".join(
        chunk.page_content
        for chunk in relevant_chunks
    )

    print("RETRIEVED CHUNKS:", len(relevant_chunks))

    return context
