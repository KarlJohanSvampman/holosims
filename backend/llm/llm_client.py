import hashlib
import json
import redis
import os

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
r = redis.Redis(host=REDIS_HOST, port=6379, decode_responses=True)

def _hash_prompt(messages):
    return hashlib.sha256(json.dumps(messages, sort_keys=True).encode()).hexdigest()

def _cache_key(messages):
    return f"llm_cache:{_hash_prompt(messages)}"

async def _call_llm(messages, timeout=60.0):
    base=os.getenv("OLLAMA_BASE_URL","http://ollama:11434").rstrip("/")
    model=os.getenv("OLLAMA_MODEL","llama3")
    async with httpx.AsyncClient(timeout=timeout) as client:
        r=await client.post(f"{base}/api/chat", json={"model":model,"messages":messages,"stream":False})
        r.raise_for_status()
        return r.json().get("message",{}).get("content","")

async def call_llm_safe(prompt):
    try:
        return await asyncio.wait_for(call_llm(prompt), timeout=15)
    except Exception as e:
        return {"error": str(e)}

async def call_llm(messages, timeout=60.0, use_cache=True):

    key = _cache_key(messages)

    # ✅ 1. CACHE HIT
    if use_cache:
        cached = r.get(key)
        if cached:
            return json.loads(cached)

    # 🔥 2. REAL LLM CALL (your existing logic here)
    result = await _call_llm(messages, timeout)

    # ✅ 3. STORE CACHE
    if use_cache:
        r.set(key, json.dumps(result), ex=300)  # 5 min TTL

    return result