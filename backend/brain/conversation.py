def start_conversation(a,b,topic="general"):
    a["conversation"]={"partner":b["id"],"awaiting":None,"turn":0,"topic":topic,"scores":[]}
    b["conversation"]={"partner":a["id"],"awaiting":a["id"],"turn":0,"topic":topic,"scores":[]}
def can_speak(c):
    conv=c.get("conversation"); return not conv or conv.get("awaiting") in [None,c["id"]]
def after_speech(speaker, listener, score=50, topic=None):
    if not speaker.get("conversation"): start_conversation(speaker,listener,topic or "general")
    if not listener.get("conversation"): start_conversation(listener,speaker,topic or speaker["conversation"].get("topic","general"))
    speaker["conversation"]["awaiting"]=listener["id"]; listener["conversation"]["awaiting"]=listener["id"]
    speaker["conversation"]["turn"]+=1; listener["conversation"]["turn"]=speaker["conversation"]["turn"]
    if topic: speaker["conversation"]["topic"]=topic; listener["conversation"]["topic"]=topic
    speaker["conversation"].setdefault("scores",[]).append(score); listener["conversation"].setdefault("scores",[]).append(score)
def maybe_end(c, world):
    conv=c.get("conversation")
    if not conv: return
    scores=conv.get("scores",[])[-4:]; avg=sum(scores)/len(scores) if scores else 50
    if conv.get("turn",0)>=8 or avg<c.get("social_patience",40):
        pid=conv.get("partner"); c["conversation"]=None
        if pid in world["characters"]: world["characters"][pid]["conversation"]=None
