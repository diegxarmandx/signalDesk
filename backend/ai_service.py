

import os
from typing import Literal

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel


# Load environment variables from backend/.env
load_dotenv()


# Read the OpenAI API key from the environment.
# Never hard-code API keys directly into source code.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not configured")


# The OpenAI client uses the API key stored on the backend.
client = OpenAI(api_key=OPENAI_API_KEY)


# This model defines the exact structure we want the AI to return.
# Using a structured response makes the result much safer and easier
# for the rest of our application to work with than free-form text.
class TicketClassification(BaseModel):
    priority: Literal["low", "medium", "high", "critical"]
    category: Literal[
        "billing",
        "bug",
        "account",
        "performance",
        "security",
        "other",
    ]
    summary: str


# Analyze one support ticket and return structured classification data.
def classify_ticket(title: str, description: str) -> TicketClassification:
    response = client.responses.parse(
        model="gpt-5.6-luna",
        input=[
            {
                "role": "system",
                "content": (
                    "You classify software support tickets for an engineering team. "
                    "Use the following priority rules: "
                    "low = minor issue, general request, or little user impact; "
                    "medium = noticeable issue affecting some users or normal workflow; "
                    "high = major functionality is broken, many users are affected, "
                    "or revenue/business operations are significantly impacted; "
                    "critical = severe security exposure, data loss, complete outage, "
                    "or an issue requiring immediate engineering response. "
                    "Choose the best category and write a concise one-sentence summary."
                ),
            },
            {
                "role": "user",
                "content": f"Title: {title}\nDescription: {description}",
            },
        ],
        text_format=TicketClassification,
    )

    classification = response.output_parsed

    if classification is None:
        raise RuntimeError("AI classification did not return structured output")

    return classification