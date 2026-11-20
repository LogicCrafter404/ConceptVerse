import json
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.analogy_generator import (
    generate_concept_response
)


def clean_ai_json(raw_string: str) -> str:
    # Remove markdown code blocks if the AI added them (e.g., ```json ... ```)
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw_string)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    
    # Escape unescaped backslashes (fixes "Invalid \escape")
    cleaned = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', cleaned)
    
    # Replace raw literal newlines with explicit \n (fixes "Invalid control character")
    cleaned = cleaned.replace('\n', '\\n').replace('\r', '')
    
    return cleaned


# Create the FastAPI application
app = FastAPI(
    title="ConceptVerse API",
    description=(
        "AI-powered concept explanation, "
        "analogy, and mnemonic generation API."
    ),
    version="1.0.0"
)


# Enable communication with the Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# Request model
class ConceptRequest(BaseModel):

    text: str = Field(
        ...,
        min_length=3,
        max_length=5000
    )

    analogy_style: str = Field(
        default="daily life"
    )

    difficulty: str = Field(
        default="beginner"
    )


# Response model
class ConceptResponse(BaseModel):

    concept: str
    simple_explanation: str
    analogy: str
    mnemonic: str
    example: str
    exam_answer: str


# Home endpoint
@app.get("/")
def home():

    return {
        "project": "ConceptVerse",
        "message": "ConceptVerse backend is running.",
        "status": "online"
    }


# Health-check endpoint
@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "service": "ConceptVerse API"
    }


# Main AI-generation endpoint
@app.post(
    "/api/generate",
    response_model=ConceptResponse
)
def generate_concept(
    request: ConceptRequest
):

    try:

        raw_ai_response = generate_concept_response(
            text=request.text,
            analogy_style=request.analogy_style,
            difficulty=request.difficulty
        )

        # If the AI service returns a raw string, clean and parse it
        if isinstance(raw_ai_response, str):
            sanitized_string = clean_ai_json(raw_ai_response)
            try:
                result = json.loads(sanitized_string)
            except json.JSONDecodeError as e:
                print(f"Failed to parse JSON. Error: {e}")
                print(f"Raw AI Output: {raw_ai_response}")
                raise HTTPException(
                    status_code=500,
                    detail="The AI generated invalid JSON format. Please try again."
                )
        else:
            # If it's already parsed into a dictionary by the service
            result = raw_ai_response

        return result

    except Exception as error:

        print("\n========== CONCEPTVERSE ERROR ==========")
        print("Error type:", type(error).__name__)
        print("Error message:", str(error))
        print("========================================\n")

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )