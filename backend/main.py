
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from services.rag_service import index_webpage, retrieve_context
from services.llm_service import generate_summary, answer_question


app = FastAPI(
    title="WebMind AI API",
    description="AI-powered browser webpage assistant",
    version="1.0.0"
)


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# REQUEST MODELS

class WebpageData(BaseModel):
    title: str
    url: HttpUrl
    description: str = ""
    siteName: str = ""
    byline: str = ""
    content: str


class SummaryRequest(BaseModel):
    content: str


class ChatRequest(BaseModel):
    url: HttpUrl
    question: str


# HEALTH CHECK

@app.get("/")
def home():

    return {
        "message": "Welcome to WebMind AI Backend",
        "status": "running"
    }


@app.get("/health")
def health_check():

    return {
        "status": "healthy"
    }


# INDEX WEBPAGE

@app.post("/api/page")
def receive_webpage(page: WebpageData):

    if not page.content.strip():
        raise HTTPException(
            status_code=400,
            detail="Webpage content cannot be empty."
        )

    try:

        index_info = index_webpage(
            url=str(page.url),
            title=page.title,
            content=page.content
        )

        return {
            "success": True,
            "message": "Webpage indexed successfully!",
            "data": {
                "title": page.title,
                "url": index_info["indexed_url"],
                "word_count": len(page.content.split()),
                "character_count": len(page.content),
                "total_chunks": index_info["total_chunks"]
            }
        }

    except Exception as error:

        print("INDEXING ERROR:", repr(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to index webpage."
        )


# WEBPAGE SUMMARY

@app.post("/api/summarize")
def summarize_webpage(request: SummaryRequest):

    if not request.content.strip():
        raise HTTPException(
            status_code=400,
            detail="Webpage content is empty."
        )

    try:

        summary = generate_summary(request.content)

        return {
            "success": True,
            "summary": summary
        }

    except Exception as error:

        print("SUMMARY ERROR:", repr(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to generate webpage summary."
        )


# CHAT WITH WEBPAGE USING RAG

@app.post("/api/chat")
def chat_with_webpage(request: ChatRequest):

    if not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    try:

        # Retrieve relevant chunks from FAISS
        context = retrieve_context(
            url=str(request.url),
            question=request.question,
            k=6
        )

        if not context:
            raise HTTPException(
                status_code=404,
                detail="No relevant webpage content found."
            )

        # Generate answer using Gemini
        answer = answer_question(
            retrieved_context=context,
            question=request.question
        )

        return {
            "success": True,
            "question": request.question,
            "answer": answer
        }

    except HTTPException:
        raise

    except ValueError as error:

        print("RETRIEVAL ERROR:", repr(error))

        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

    except Exception as error:

        print("CHAT ERROR:", repr(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to generate an answer."
        )
