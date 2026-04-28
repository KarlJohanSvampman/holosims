def update_relationship_state(c, other):
    oid=other["id"]; attraction=float(c.setdefault("attraction",{}).get(oid,0)); chemistry=float(c.setdefault("chemistry",{}).get(oid,0))
    rel="couple" if chemistry>10 and attraction>12 else "crush" if chemistry>5 and attraction>8 else "friend" if chemistry>6 else "acquaintance" if chemistry>2 else "neutral"
    c.setdefault("relationships",{})[oid]={"state":rel,"chemistry":chemistry,"attraction":attraction,"trust":c.get("relationships",{}).get(oid,{}).get("trust",0.5)}
def apply_interaction(c, other, speech_act):
    oid=other["id"]; c.setdefault("chemistry",{}).setdefault(oid,0); other.setdefault("chemistry",{}).setdefault(c["id"],0)
    if speech_act in ["compliment","flirt","question","statement"]:
        c["chemistry"][oid]+=1.0; other["chemistry"][c["id"]]+=0.8
    elif speech_act in ["insult","threat"]:
        c["chemistry"][oid]-=2.0; other["chemistry"][c["id"]]-=2.5; other["emotional_temperature"]=min(100,other.get("emotional_temperature",20)+12)
    update_relationship_state(c,other); update_relationship_state(other,c)
def first_impression(c, other):
    if any(v.get("subject_id")==other["id"] for v in c.get("views",[])): return
    app=other.get("appearance",{}); kws=[]; score=0
    if app.get("posture") in ["confident","straight"]: kws.append("confident"); score+=2
    if app.get("eyes")=="expressive": kws.append("engaging"); score+=2
    if app.get("eyes")=="lifeless": kws.append("creepy"); score-=2
    if app.get("posture") in ["slouched","hesitant"]: kws.append("insecure"); score-=1
    c.setdefault("views",[]).append({"subject_id":other["id"],"keywords":kws,"sentiment":score/5})
    c.setdefault("attraction",{})[other["id"]]=c.setdefault("attraction",{}).get(other["id"],0)+score
