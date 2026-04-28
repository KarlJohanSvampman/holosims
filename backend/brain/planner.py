import json, os
from llm.ollama_client import call_ollama
from brain.goals import heuristic_plan
async def generate_plan(c, goal):
    if os.getenv("LLM_ENABLED","true").lower()!="true": return heuristic_plan(goal)
    try:
        txt=await call_ollama([{"role":"user","content":f"Return JSON list of 2-5 short steps for this sim goal. Self={c.get('name')} Goal={goal}"}], timeout=40)
        out=json.loads(txt); return out if isinstance(out,list) else heuristic_plan(goal)
    except Exception: return heuristic_plan(goal)
