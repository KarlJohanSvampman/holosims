import uuid
from brain.embeddings import add_memory_vector, search
def store_memory(c, text, importance=0.5, tags=None, kind="memory", tick=0, **extra):
    mem={"id":f"mem_{uuid.uuid4().hex[:8]}","kind":kind,"text":text,"importance":float(importance),"tags":tags or [],"tick":tick,**extra}
    c.setdefault("memories",[]).append(mem); c["memories"]=c["memories"][-150:]
    add_memory_vector(c["id"], mem["id"], text)
    return mem
def recall(c, query_or_tags, limit=6):
    query=" ".join(query_or_tags) if isinstance(query_or_tags,list) else str(query_or_tags)
    tags=set(query.split())
    sem_ids={r["memory_id"] for r in search(c["id"], query, limit)}
    scored=[]
    for m in c.get("memories",[]):
        score=m.get("importance",0.5)*10 + len(tags & set(m.get("tags",[])))*3 + (6 if m.get("id") in sem_ids else 0)
        scored.append((score,m))
    scored.sort(key=lambda x:x[0], reverse=True)
    return [m for _,m in scored[:limit]]
def decay_memories(c):
    kept=[]
    for m in c.get("memories",[]):
        m["importance"]=max(0,float(m.get("importance",0.5))*0.997)
        if m["importance"]>0.05: kept.append(m)
    c["memories"]=kept[-150:]
