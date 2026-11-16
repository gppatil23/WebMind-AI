# WebMind AI -- AI-Powered Webpage Chatbot

WebMind AI is a Chrome browser extension that allows users to interact
with any webpage through an AI-powered chatbot. Instead of manually
searching through lengthy articles or product pages, users can simply
ask questions and receive answers based on the content of the current
webpage.

The project combines a Chrome Extension, Python FastAPI backend,
Retrieval-Augmented Generation (RAG), FAISS vector search, and Google's
Gemini AI models to make web browsing more interactive and productive.

## Features

-   **AI-Powered Webpage Chat:** Ask questions about the webpage
    currently open in your browser.
-   **Intelligent Content Extraction:** Extracts meaningful webpage
    content using Mozilla Readability and DOM-based extraction.
-   **Amazon Product Extraction:** Specialized extraction for Amazon
    product pages, including product specifications, descriptions,
    features, and technical details.
-   **Retrieval-Augmented Generation (RAG):** Retrieves relevant webpage
    information before generating an answer.
-   **Semantic Search:** Uses Google Gemini Embeddings and FAISS for
    similarity-based information retrieval.
-   **Context-Aware Responses:** Generates answers based on the
    extracted webpage content rather than relying only on general AI
    knowledge.
-   **Compact Chat Interface:** Provides a clean, minimal popup
    interface directly inside Chrome.
-   **Local Backend:** Runs locally using Python FastAPI without
    requiring paid cloud hosting.

## Tech Stack

  Technology                     Purpose
  ------------------------------ ----------------------------------------
  HTML, CSS, JavaScript          Chrome extension frontend
  Chrome Extension Manifest V3   Browser extension functionality
  Python                         Backend development
  FastAPI                        REST API and backend server
  Google Gemini API              AI-powered responses
  Gemini Embedding 001           Text embeddings
  LangChain                      Text splitting and document processing
  FAISS                          Vector storage and similarity search
  Mozilla Readability            Webpage content extraction

## How It Works

WebMind AI follows a Retrieval-Augmented Generation (RAG) architecture.

1.  **Webpage Extraction:** When a user opens the extension, it extracts
    the content of the active webpage.
2.  **Content Processing:** The extracted text is cleaned and divided
    into smaller chunks using LangChain's
    RecursiveCharacterTextSplitter.
3.  **Embedding Generation:** Each text chunk is converted into a vector
    embedding using Google's Gemini Embedding model.
4.  **Vector Storage:** The embeddings are stored in a FAISS vector
    index for efficient similarity searching.
5.  **Question Processing:** When the user asks a question, the backend
    converts the question into a semantic search query.
6.  **Context Retrieval:** FAISS retrieves the most relevant webpage
    content chunks.
7.  **AI Response:** The retrieved context is passed to the Gemini
    language model, which generates an answer based on the available
    webpage information.

## Project Architecture

``` text
WebMind-AI/
│
├── backend/
│   ├── main.py
│   ├── services/
│   │   ├── llm_service.py
│   │   └── rag_service.py
│   ├── .env
│   └── requirements.txt
│
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
│
├── scripts/
│   ├── content.js
│   └── Readability.js
│
├── manifest.json
│
└── README.md
```

## Installation and Setup

### 1. Clone the Repository

``` bash
git clone https://github.com/YOUR_USERNAME/WebMind-AI.git
cd WebMind-AI
```

Replace `YOUR_USERNAME` with your GitHub username and update the
repository URL if necessary.

### 2. Set Up the Python Backend

Navigate to the backend directory:

``` bash
cd backend
```

Create a virtual environment:

``` bash
python -m venv venv
```

Activate the virtual environment.

**Windows:**

``` bash
venv\Scripts\activate
```

**macOS / Linux:**

``` bash
source venv/bin/activate
```

### 3. Install Dependencies

``` bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file inside the `backend` directory and add your Gemini
API key:

``` env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Get your API key from Google AI Studio:

https://aistudio.google.com/

Keep your API key private. Do not upload your `.env` file to GitHub.

### 5. Start the Backend Server

From the backend directory, run:

``` bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be available at:

``` text
http://127.0.0.1:8000
```

You can also access the FastAPI interactive API documentation at:

``` text
http://127.0.0.1:8000/docs
```

### 6. Load the Chrome Extension

1.  Open Google Chrome.
2.  Navigate to `chrome://extensions/`.
3.  Enable **Developer mode**.
4.  Click **Load unpacked**.
5.  Select the WebMind AI project folder containing `manifest.json`.
6.  Pin the extension to your Chrome toolbar.

The extension is now ready to use.

**Important:** The local FastAPI backend must be running whenever you
use the extension. An active internet connection is also required for
requests to the Gemini API.

## API Endpoints

The FastAPI backend provides the following endpoints:

  -----------------------------------------------------------------------
  Method                  Endpoint                Description
  ----------------------- ----------------------- -----------------------
  GET                     `/`                     Backend welcome
                                                  endpoint

  GET                     `/health`               Checks backend health

  POST                    `/api/page`             Receives and indexes
                                                  webpage content

  POST                    `/api/summarize`        Generates a webpage
                                                  summary

  POST                    `/api/chat`             Answers user questions
                                                  using retrieved webpage
                                                  context
  -----------------------------------------------------------------------

## Key Technical Implementations

### 1. Retrieval-Augmented Generation (RAG)

Implemented a RAG pipeline to improve answer relevance by retrieving
information from the currently indexed webpage before generating
responses.

### 2. Semantic Search with FAISS

Used Google Gemini Embeddings to convert webpage content into vector
representations and FAISS to retrieve relevant information based on
semantic similarity.

### 3. Intelligent Webpage Extraction

Integrated Mozilla Readability for extracting article content and
implemented DOM-based extraction for product pages.

### 4. Amazon Product Information Extraction

Implemented specialized extraction logic for Amazon pages to capture
product titles, descriptions, feature bullets, and technical
specifications that conventional article extraction methods may miss.

### 5. Context-Aware AI Responses

Integrated the Gemini language model with retrieved webpage content to
generate relevant answers while reducing unsupported or unrelated
responses.

## Current Limitations

-   The Python backend runs locally and must remain active while using
    the extension.
-   An internet connection is required to communicate with Google's
    Gemini API.
-   FAISS indexes are stored in memory and are cleared when the backend
    restarts.
-   Webpage extraction depends on the structure and accessibility of the
    website.
-   The project currently focuses on the active webpage rather than
    searching across multiple websites.

## Future Enhancements

-   Persistent FAISS vector storage.
-   Chat history and conversation management.
-   Support for additional e-commerce websites.
-   YouTube video transcript extraction and summarization.
-   Automatic webpage summarization.
-   AI-generated quizzes based on webpage content.
-   Source references for retrieved information.
-   Support for additional browsers.

## Learning Outcomes

Through this project, I gained practical experience in:

-   Building browser extensions using Chrome Extension Manifest V3.
-   Developing REST APIs using Python and FastAPI.
-   Implementing Retrieval-Augmented Generation (RAG).
-   Working with Large Language Models and Gemini APIs.
-   Generating text embeddings and performing semantic search.
-   Using FAISS for vector similarity search.
-   Processing and extracting content from real-world webpages.
-   Integrating frontend browser applications with Python backends.

## Owner

**Gaurav Patil**

B.E. Information Technology

-   Portfolio: https://gauravpatil23.netlify.app
-   GitHub: https://github.com/gppatil23

------------------------------------------------------------------------

**WebMind AI -- Making Every Webpage Conversational.**
