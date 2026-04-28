import json, os
from llm.llm_client import call_llm,call_llm_safe
from llm.llm_queue import enqueue
ACTIONS=["wait","move","speak","yell","leave","go_work","go_interview","go_shopping","go_leisure","call_911","call_phone","end_call","evaluate_subjective"]
EMOTIONS=["calm","playful","warm","awkward","annoyed","angry","furious","fearful","sad","smug","curious","suspicious"]
SPEECH=["question","statement","request","insult","threat","greeting","farewell","flirt","tease","compliment"]
async def decide(c, world, perception=None, memories=None):
    if os.getenv("LLM_ENABLED","true").lower()!="true":
        return {"thought":"LLM disabled","emotion":"calm","speech_act":"statement","conversation_score":50,"view_keywords":[],"action":{"name":"wait","utterance":""}}
    ctx={"tick":world["tick"],"calendar":world["calendar"],"environment":world["environment"],"market":world["market"],"news":world["news"][-4:],"public_figures":sorted(world["public_figures"], key=lambda f:f["importance"], reverse=True)[:4],"nearby":[{"id":o["id"],"name":o["name"],"mood":o.get("mood"),"appearance":o.get("appearance"),"relationship":c.get("relationships",{}).get(o["id"])} for o in (perception or {}).get("nearby",[])],"memories":memories or [],"faction":world.get("factions",{}).get(c.get("faction_id")),"election":world.get("election"),"crises":world.get("active_crises",[])}
    prompt=f"""
Return STRICT JSON only. Choose exactly one action.

You are a simulated person. Use yes-and conversation style. Avoid repeated greetings. Do not return empty speech if speaking.
You may discuss memories, news, public figures, jobs, money, health, law, factions, appearance, crises, taxes, crime, and relationships.
Use call_911 for serious police/fire/medical emergencies.

Self:
{json.dumps({k:c.get(k) for k in ['id','name','traits','appearance','interests','needs','profession','degree','employed','ses','class_tier','mood','emotion','emotional_temperature','stress','relationships','attraction','chemistry','beliefs','political_alignment','conversation','goals','plan','health','legal','insurance','neighborhood','internal_thought']}, ensure_ascii=False)}

Context:
{json.dumps(ctx, ensure_ascii=False)}

Schema:
{{"thought":"brief private intent summary","emotion":"{'|'.join(EMOTIONS)}","speech_act":"{'|'.join(SPEECH)}","conversation_score":0,"topic":"","view_keywords":[],"action":{{"name":"{'|'.join(ACTIONS)}","target_character_id":"","target_tile":{{"x":0,"y":0}},"utterance":"","emergency_type":"police|fire|medical|","subject_type":"character|concept|object|","subject_ref":""}}}}
"""
    async def job():
        return await call_llm_safe([{"role":"system","content":"Return valid JSON only. No markdown. No commentary."},{"role":"user","content":prompt}])
    result=await enqueue(job)
    world.setdefault("llm_logs",[]).append({"prompt":prompt,"provider_result":result}); world["llm_logs"]=world["llm_logs"][-200:]
    try: data=json.loads(result.get("text") or "{}")
    except Exception: data={}
    action=data.get("action") or {}
    if action.get("name") not in ACTIONS: action={"name":"wait","utterance":""}
    if action.get("name") in ["speak","yell"] and not str(action.get("utterance","")).strip(): action={"name":"wait","utterance":""}
    data.setdefault("emotion","calm"); data.setdefault("speech_act","statement"); data.setdefault("conversation_score",50); data.setdefault("view_keywords",[])
    if data["emotion"] not in EMOTIONS: data["emotion"]="calm"
    data["action"]=action
    return data
