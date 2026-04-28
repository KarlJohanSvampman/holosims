import psycopg2, json, os

conn = psycopg2.connect(
    dbname=os.getenv("POSTGRES_DB","sim"),
    user=os.getenv("POSTGRES_USER","postgres"),
    password=os.getenv("POSTGRES_PASSWORD","postgres"),
    host=os.getenv("POSTGRES_HOST","db")
)

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

 
def load_world(sim_id):
    with conn.cursor() as cur:
        cur.execute("SELECT data FROM world WHERE simulation_id=%s", (sim_id,))
        row = cur.fetchone()
        if row:
            return row[0]

    # default world if none exists
    return {
        "tick": 0,
        "characters": {}
    }


def save_world(sim_id, world):
    with conn:
        with conn.cursor() as cur:
            cur.execute("""
            INSERT INTO world (simulation_id, data)
            VALUES (%s, %s)
            ON CONFLICT (simulation_id)
            DO UPDATE SET data=%s
            """, (sim_id, json.dumps(world), json.dumps(world)))


def save_character_safe(c, sim_id="default"):
    with conn:
        with conn.cursor() as cur:

            # 🔒 lock row
            cur.execute("""
                SELECT data FROM characters
                WHERE id=%s AND simulation_id=%s
                FOR UPDATE
            """, (c["id"], sim_id))

            # update safely
            cur.execute("""
                UPDATE characters
                SET data=%s,
                    updated_at=NOW()
                WHERE id=%s AND simulation_id=%s
            """, (json.dumps(c), c["id"], sim_id))

def load_character(cid, sim_id="default"):
    with conn.cursor() as cur:
        cur.execute("""
        SELECT data FROM characters
        WHERE id=%s AND simulation_id=%s
        """, (cid, sim_id))
        row = cur.fetchone()
        return row[0] if row else None