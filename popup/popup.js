let pageData = null;

let activeTabId = null;
let chatHistory = [];

const CHAT_STORAGE_PREFIX = "webmind_chat_";

document.addEventListener("DOMContentLoaded", () => {

    extractWebpage();

    document.getElementById("sendBtn")
        .addEventListener("click", sendMessage);

    document.getElementById("questionInput")
        .addEventListener("keydown", (event) => {

            if (event.key === "Enter") {
                sendMessage();
            }

        });

});


// STEP 1: EXTRACT WEBPAGE CONTENT

async function extractWebpage() {

    const statusText = document.getElementById("statusText");
    const status = document.querySelector(".status");

    try {

        statusText.textContent = "Analyzing webpage...";

        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!tab?.id || !tab.url?.startsWith("http")) {
            throw new Error("This page cannot be processed.");
        }

        activeTabId = tab.id;

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["scripts/Readability.js"]
        });

        const results = await chrome.scripting.executeScript({

            target: { tabId: tab.id },


            func: () => {

                // ---------------------------------
                // 1. EXTRACT AMAZON PRODUCT DETAILS
                // ---------------------------------

                function extractProductData() {

                    const selectors = [
                        "#productTitle",
                        "#feature-bullets",
                        "#productOverview_feature_div",
                        "#detailBullets_feature_div",
                        "#technicalSpecifications_feature_div",
                        "#productDetails_techSpec_section_1",
                        "#productDetails_detailBullets_sections1",
                        "#prodDetails",
                        "#productDescription",
                        "#importantInformation",
                        "#aplus"
                    ];

                    let extractedSections = [];

                    selectors.forEach(selector => {

                        const elements = document.querySelectorAll(selector);

                        elements.forEach(element => {

                            if (
                                element.getClientRects().length &&
                                element.innerText.trim()
                            ) {

                                extractedSections.push(
                                    element.innerText.trim()
                                );

                            }

                        });

                    });

                    // ---------------------------------
                    // 2. EXTRACT STRUCTURED PRODUCT DATA
                    // ---------------------------------

                    let structuredData = [];

                    const scripts = document.querySelectorAll(
                        'script[type="application/ld+json"]'
                    );

                    function findProducts(data) {

                        if (!data) return;

                        if (Array.isArray(data)) {
                            data.forEach(findProducts);
                            return;
                        }

                        if (typeof data !== "object") return;

                        const type = data["@type"];

                        if (
                            type === "Product" ||
                            (Array.isArray(type) && type.includes("Product"))
                        ) {

                            structuredData.push({
                                name: data.name,
                                description: data.description,
                                brand: data.brand,
                                weight: data.weight,
                                additionalProperty: data.additionalProperty
                            });

                        }

                        if (data["@graph"]) {
                            findProducts(data["@graph"]);
                        }

                    }

                    scripts.forEach(script => {

                        try {

                            const json = JSON.parse(script.textContent);

                            findProducts(json);

                        } catch (error) {

                            console.warn("JSON-LD parsing skipped:", error);

                        }

                    });

                    // ---------------------------------
                    // 3. COMBINE PRODUCT INFORMATION
                    // ---------------------------------

                    const productText = [
                        "PRODUCT INFORMATION",
                        ...extractedSections,
                        "STRUCTURED PRODUCT DATA",
                        JSON.stringify(structuredData, null, 2)
                    ].join("\n\n");

                    return productText;

                }


                // ---------------------------------
                // 4. NORMAL ARTICLE EXTRACTION
                // ---------------------------------

                const documentClone = document.cloneNode(true);

                const reader = new Readability(documentClone, {
                    charThreshold: 100
                });

                const article = reader.parse();

                const articleContent =
                    article?.textContent?.trim() || "";

                // ---------------------------------
                // 5. DETECT E-COMMERCE CONTENT
                // ---------------------------------

                const isAmazon =
                    location.hostname.includes("amazon.");

                let content;

                if (isAmazon) {

                    const productContent = extractProductData();

                    content = productContent.length > 100
                        ? productContent
                        : document.body.innerText.trim();

                } else {

                    content = articleContent ||
                        document.body.innerText.trim();

                }

                return {

                    title:
                        document.querySelector("#productTitle")?.innerText.trim()
                        || article?.title
                        || document.title,

                    url: window.location.href,

                    description: article?.excerpt || "",

                    siteName: article?.siteName || "",

                    byline: article?.byline || "",

                    content: content,

                    length: content.length,

                    extractionMethod: isAmazon
                        ? "Amazon Product Extraction"
                        : article
                            ? "Mozilla Readability"
                            : "DOM Fallback"

                };

            }


        });

        pageData = results[0]?.result;
        console.log("Extraction method:", pageData.extractionMethod);

        console.log("Extracted webpage length:", pageData.content.length);

        console.log(
            "Product information extracted:",
            pageData.content.includes("Weight") ||
            pageData.content.includes("Refresh Rate")
        );

        console.log(
            "Extracted content preview:",
            pageData.content.slice(0, 5000)
        );

        if (!pageData?.content) {
            throw new Error("No webpage content found.");
        }
        // Restore previous conversation for this webpage
        await restoreChatHistory(activeTabId, pageData.url);

        // UPDATE PAGE INFORMATION

        document.getElementById("pageTitle").textContent =
            pageData.title;

        document.getElementById("pageUrl").textContent =
            pageData.url;

        const wordCount = pageData.content
            .split(/\s+/)
            .filter(Boolean).length;

        document.getElementById("wordCount").textContent =
            `${wordCount} words`;

        document.getElementById("charCount").textContent =
            `${pageData.length} characters`;

        await chrome.storage.local.set({
            webpageData: pageData
        });

        // SEND PAGE DATA TO PYTHON BACKEND

        const response = await fetch(
            "http://127.0.0.1:8000/api/page",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(pageData)
            }
        );

        if (!response.ok) {
            throw new Error("Python backend connection failed.");
        }

        const result = await response.json();

        console.log("Backend connected:", result);

        statusText.textContent = "Webpage ready for AI chat";
        status.classList.add("success");

        // ENABLE CHAT INPUT

        document.getElementById("questionInput").disabled = false;
        document.getElementById("sendBtn").disabled = false;

    } catch (error) {

        console.error("Extraction error:", error);

        statusText.textContent = error.message;
        status.classList.add("error");

        document.getElementById("pageTitle").textContent =
            "Unable to load webpage";

    }

}


// STEP 2: DISPLAY CHAT MESSAGES


// STEP 2: DISPLAY CHAT MESSAGES

function addMessage(text, sender) {

    const chatMessages = document.getElementById("chatMessages");

    const message = document.createElement("div");

    message.className = `message ${sender}-message`;

    const label = document.createElement("div");
    label.className = "message-label";

    label.textContent =
        sender === "user" ? "You" : "WebMind AI";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    // Use textContent to avoid rendering untrusted HTML
    bubble.textContent = text;

    message.appendChild(label);
    message.appendChild(bubble);

    chatMessages.appendChild(message);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
}


// STEP 2.1: CHAT HISTORY MANAGEMENT

function getChatStorageKey(tabId) {
    return `${CHAT_STORAGE_PREFIX}${tabId}`;
}


// Save conversation for the active tab
async function saveChatHistory() {

    if (activeTabId === null || !pageData?.url) {
        return;
    }

    const key = getChatStorageKey(activeTabId);

    await chrome.storage.session.set({
        [key]: {
            url: pageData.url,
            messages: chatHistory
        }
    });
}


// Restore conversation when popup opens
async function restoreChatHistory(tabId, currentUrl) {

    const key = getChatStorageKey(tabId);

    const stored = await chrome.storage.session.get(key);

    const conversation = stored[key];

    chatHistory = [];

    // No previous conversation
    if (!conversation) {
        return;
    }

    // URL changed: discard old conversation
    if (
        conversation.url !== currentUrl ||
        !Array.isArray(conversation.messages)
    ) {
        await chrome.storage.session.remove(key);
        return;
    }

    chatHistory = conversation.messages;

    const chatContainer = document.getElementById("chatMessages");

    // Clear existing HTML messages
    chatContainer.innerHTML = "";

    // Restore welcome message
    addMessage(
        "Hello! I've analyzed this webpage. Ask me anything about its content.",
        "ai"
    );

    // Restore previous questions and answers
    chatHistory.forEach(message => {
        addMessage(message.text, message.sender);
    });

    console.log("Previous chat restored:", chatHistory.length);
}


// STEP 3: SEND USER QUESTION TO PYTHON

async function sendMessage() {

    const input = document.getElementById("questionInput");
    const sendBtn = document.getElementById("sendBtn");

    const question = input.value.trim();

    if (!question || !pageData) {
        return;
    }

    // DISPLAY USER QUESTION

    // DISPLAY AND STORE USER QUESTION

    addMessage(question, "user");

    chatHistory.push({
        sender: "user",
        text: question
    });

    input.value = "";

    input.disabled = true;
    sendBtn.disabled = true;

    const typingMessage = addMessage(
        "Thinking...",
        "ai"
    );

    typingMessage.querySelector(".message-bubble")
        .classList.add("typing");

    try {
        // Save user question before requesting AI response
        await saveChatHistory();
        // SEND QUESTION AND WEBPAGE CONTEXT TO FASTAPI

        const response = await fetch(
            "http://127.0.0.1:8000/api/chat",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    url: pageData.url,
                    question: question
                })
            }
        );

        if (!response.ok) {

            const errorData = await response.json();

            throw new Error(
                errorData.detail || "Unable to get AI response."
            );

        }

        const result = await response.json();

        typingMessage.remove();

        addMessage(result.answer, "ai");

        chatHistory.push({
            sender: "ai",
            text: result.answer
        });

        // Save completed conversation
        await saveChatHistory();


    } catch (error) {

        console.error("Chat error:", error);

        typingMessage.remove();

        const errorText =
            error.message || "Something went wrong. Please try again.";

        addMessage(errorText, "ai");

        chatHistory.push({
            sender: "ai",
            text: errorText
        });

        await saveChatHistory();

    } finally {

        input.disabled = false;
        sendBtn.disabled = false;

        input.focus();

    }

}
