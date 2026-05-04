import time
from brain.relationships import apply_interaction
from systems.messaging import queue_message


def can_call(c, other):

    rel = c.get("relationships", {}).get(other["id"], {})
    contact = c.get("contacts", {}).get(other["id"], {})

    return contact.get("has_number") or rel.get("standing", 0) > 4


def make_call(c, other, world):

    if not can_call(c, other):
        return False

    # if other is busy → missed call
    if other.get("activity"):

        other.setdefault("phone", {}).setdefault("missed_calls", []).append({
            "from": c["id"],
            "time": time.time()
        })

        return False

    # otherwise simulate conversation

    apply_interaction(c, other, "statement")
    apply_interaction(other, c, "statement")

    return True


def send_sms(c, other, world, text):

    contact = c.get("contacts", {}).get(other["id"], {})

    if not contact.get("has_number"):
        return False

    queue_message(world, c["id"], other["id"], text)

    c.setdefault("phone", {}).setdefault("outbox", []).append({
        "to": other["id"],
        "text": text,
        "time": time.time()
    })

    return True

def choose_call_target(c, world):

    contacts = c.get("contacts", {})

    if not contacts:
        return None

    # prefer frequent contacts
    best = max(
        contacts.items(),
        key=lambda kv: kv[1].get("interaction_count", 0)
    )

    return world["characters"].get(best[0])

def update_contact_time(a, b):
    a.setdefault("contacts", {}).setdefault(b["id"], {})["last_contact"] = time.time()