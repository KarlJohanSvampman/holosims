from brain.memory import store_memory
from brain.conversation import after_speech, maybe_end
from brain.relationships import apply_interaction
from brain.emotion import apply_emotion_inertia
from systems.offgrid import send_offgrid
from systems.emergency import create_911_call
EMOTION_BLOCKS={"fearful":{"smash":"leave","yell":"leave","speak":"leave"},"sad":{"smash":"relax","yell":"relax"},"awkward":{"smash":"wait","yell":"wait"},"calm":{"smash":"speak","yell":"speak"},"annoyed":{"smash":"yell"},"curious":{"smash":"observe"}}
def _target(c, world, action):
    tid=action.get("target_character_id")
    if tid in world["characters"]: return world["characters"][tid]
    others=[o for o in world["characters"].values() if o["id"]!=c["id"] and not o.get("off_grid")]
    others.sort(key=lambda o: abs(o["x"]-c["x"])+abs(o["y"]-c["y"]))
    return others[0] if others else None
def execute(c, decision, world):
    if not decision: return
    emotion=decision.get("emotion",c.get("emotion","calm")); apply_emotion_inertia(c,emotion); c["emotion"]=emotion; c["mood"]=emotion
    action=decision.get("action",{}); name=EMOTION_BLOCKS.get(emotion,{}).get(action.get("name","wait"), action.get("name","wait"))
    utterance=(action.get("utterance") or "").strip()
    c["last_action"]=name; c["internal_thought"]=decision.get("thought",c.get("internal_thought",""))
    if name=="move":
        tgt=action.get("target_tile") or {}; tx=int(tgt.get("x",c["x"]+1)); ty=int(tgt.get("y",c["y"]))
        c["x"]=max(0,min(world["grid"]["width"]-1,c["x"]+(1 if tx>c["x"] else -1 if tx<c["x"] else 0)))
        c["y"]=max(0,min(world["grid"]["height"]-1,c["y"]+(1 if ty>c["y"] else -1 if ty<c["y"] else 0)))
    elif name in ["speak","yell"]:
        if not utterance: return
        target=_target(c,world,action)
        if not target: return
        c["last_utterance"]=utterance; c.setdefault("speech_bubbles",[]).append({"text":utterance,"tick":world["tick"]}); c["speech_bubbles"]=c["speech_bubbles"][-4:]
        speech_act=decision.get("speech_act","statement"); topic=decision.get("topic") or (c.get("conversation") or {}).get("topic") or "general"
        after_speech(c,target,float(decision.get("conversation_score",50)),topic)
        store_memory(c,utterance,.55,["conversation",topic,speech_act],"conversation",world["tick"],target=target["id"],speech_act=speech_act)
        store_memory(target,utterance,.60,["conversation",topic,speech_act],"conversation",world["tick"],target=c["id"],speech_act=speech_act)
        apply_interaction(c,target,speech_act)
        for kw in decision.get("view_keywords",[])[:8]: c.setdefault("views",[]).append({"subject_id":target["id"],"keywords":[kw],"sentiment":0})
    elif name=="leave": c["conversation"]=None; c["x"]=max(0,c["x"]-1)
    elif name=="go_work": send_offgrid(c,world,"work",40)
    elif name=="go_interview": send_offgrid(c,world,"interview",20)
    elif name=="go_shopping": send_offgrid(c,world,"shopping",18)
    elif name=="go_leisure": send_offgrid(c,world,"leisure",28)
    elif name=="call_911":
        report=utterance or "There is an emergency here."; create_911_call(world,c,action.get("emergency_type") or "police",report); c["last_utterance"]=report
    elif name=="call_phone": c["is_on_phone"]=True; c["last_utterance"]=utterance or "Calling..."
    elif name=="end_call": c["is_on_phone"]=False
    else: c["last_utterance"]="..." if c.get("conversation") and c["conversation"].get("awaiting") not in [None,c["id"]] else ""
    maybe_end(c,world)
