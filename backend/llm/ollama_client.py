import os, httpx
async def call_ollama(messages, timeout=60.0):
    base=os.getenv("OLLAMA_BASE_URL","http://ollama:11434").rstrip("/")
    model=os.getenv("OLLAMA_MODEL","llama3")
    async with httpx.AsyncClient(timeout=timeout) as client:
        r=await client.post(f"{base}/api/chat", json={"model":model,"messages":messages,"stream":False})
        r.raise_for_status()
        return r.json().get("message",{}).get("content","")
