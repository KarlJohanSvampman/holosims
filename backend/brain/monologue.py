import os
from llm.ollama_client import call_ollama
async def think(c, perception, memories):
    if os.getenv("LLM_ENABLED","true").lower()!="true": return "I should respond to my current needs and situation."
    try:
        return (await call_ollama([{"role":"user","content":f"You are {c.get('name')} thinking privately. Return one short intent sentence. Perception={perception} Memories={memories} Goals={c.get('goals')} Emotion={c.get('emotion')}"}], timeout=40)).strip()[:240]
    except Exception: return "I should keep going."
