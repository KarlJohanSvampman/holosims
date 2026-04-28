import redis, json, os

REDIS_HOST = os.getenv("REDIS_HOST", "redis")

r = redis.Redis(host=REDIS_HOST, port=6379, decode_responses=True)

# keys
def world_key(sim_id): return f"world:{sim_id}"
def char_key(sim_id, cid): return f"char:{sim_id}:{cid}"


# =========================
# WORLD CACHE
# =========================

def get_world_cache(sim_id):
    data = r.get(world_key(sim_id))
    return json.loads(data) if data else None


def set_world_cache(sim_id, world):
    r.set(world_key(sim_id), json.dumps(world), ex=5)  # short TTL


# =========================
# CHARACTER CACHE
# =========================

def get_char_cache(sim_id, cid):
    data = r.get(char_key(sim_id, cid))
    return json.loads(data) if data else None


def set_char_cache(sim_id, cid, c):
    r.set(char_key(sim_id, cid), json.dumps(c), ex=10)


def invalidate_char(sim_id, cid):
    r.delete(char_key(sim_id, cid))