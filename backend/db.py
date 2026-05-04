import psycopg2, json, os
from core.cache import get_world_cache, set_world_cache
from core.cache import get_char_cache, set_char_cache
from world.generate_world import generate_initial_world
import time
#conn = psycopg2.connect(
#    dbname=os.getenv("POSTGRES_DB","sim"),
#    user=os.getenv("POSTGRES_USER","postgres"),
#    password=os.getenv("POSTGRES_PASSWORD","postgres"),
#    host=os.getenv("POSTGRES_HOST","db")
#)

def connect_with_retry():
    for i in range(10):
        try:
            return psycopg2.connect(
                os.getenv("DATABASE_URL")
            )
        except Exception as e:
            print(f"DB not ready, retrying... ({i})")
            time.sleep(2)
    raise Exception("Could not connect to DB")

conn = connect_with_retry()

def init_db():
    with conn:
        with conn.cursor() as cur:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                simulation_id TEXT,
                updated_at TIMESTAMP DEFAULT NOW(),
                version INTEGER DEFAULT 0,
                data JSONB
            );
            """)

            cur.execute("""
            CREATE TABLE IF NOT EXISTS world (
                simulation_id TEXT PRIMARY KEY,
                data JSONB
            );
            """)

    world = generate_initial_world()
    save_world("default", world)

 
def load_world(sim_id):

    # 🔥 1. try cache
    cached = get_world_cache(sim_id)
    if cached:
        return cached

    # 🔥 2. fallback DB
    with conn.cursor() as cur:
        cur.execute("SELECT data FROM world WHERE simulation_id=%s", (sim_id,))
        row = cur.fetchone()
        world = row[0] if row else {"tick": 0, "characters": {}}

    # 🔥 3. cache it
    set_world_cache(sim_id, world)

    return world

def save_world(sim_id, world):
    with conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO world (simulation_id, data)
                VALUES (%s, %s)
                ON CONFLICT (simulation_id)
                DO UPDATE SET data=%s
            """, (sim_id, json.dumps(world), json.dumps(world)))

    # 🔥 update cache
    set_world_cache(sim_id, world)


def save_character_safe(c, sim_id="default"):

    with conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE characters
                SET data=%s, updated_at=NOW()
                WHERE id=%s AND simulation_id=%s
            """, (json.dumps(c), c["id"], sim_id))

    # 🔥 update cache immediately
    set_char_cache(sim_id, c["id"], c)

def load_character(cid, sim_id="default"):

    # 🔥 cache first
    cached = get_char_cache(sim_id, cid)
    if cached:
        return cached

    # DB fallback
    with conn.cursor() as cur:
        cur.execute("""
            SELECT data FROM characters
            WHERE id=%s AND simulation_id=%s
        """, (cid, sim_id))
        row = cur.fetchone()
        c = row[0] if row else None

    if c:
        set_char_cache(sim_id, cid, c)

    return c