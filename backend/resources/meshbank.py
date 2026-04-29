from config import RESOURCES_ROOT

MESHBANK = {
    "character": {
        "model": "characters/base.glb",
        "animations": {
            "idle": "animations/idle.glb",
            "walk": "animations/walk.glb"
        }
    },
    "toilet": {
        "model": "props/toilet.glb"
    },
    "wall": {
        "model": "props/wall.glb"
    },
    "door": {
        "model": "props/door.glb",
        "open_model": "props/door_open.glb"
    },
    "mailbox": {
        "model": "props/mailbox.glb"
    }
}

def resolve(type_name):
    entry = MESHBANK.get(type_name, {})
    # prepend root
    def full(p): return f"{RESOURCES_ROOT}/{p}" if p else None

    out = {}
    for k, v in entry.items():
        if isinstance(v, dict):
            out[k] = {kk: full(vv) for kk, vv in v.items()}
        else:
            out[k] = full(v)
    return out