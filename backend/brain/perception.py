def perceive(c, world):
    nearby=[]
    for other in world["characters"].values():
        if other["id"]==c["id"] or other.get("off_grid") or other.get("legal",{}).get("status")=="jailed": continue
        if abs(other["x"]-c["x"])+abs(other["y"]-c["y"])<=5: nearby.append(other)
    mailbox=next((m for m in world.get("mailboxes",[]) if abs(m["x"]-c["x"])+abs(m["y"]-c["y"])<=1), None)
    return {"nearby":nearby,"news":world.get("news",[])[-3:],"events":world.get("events",[])[-3:],"mailbox":mailbox,"incidents":world.get("incidents",[])[-3:]}
