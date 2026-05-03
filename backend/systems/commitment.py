import time

def is_committed(c):
    com = c.get("commitment")
    if not com:
        return False
    return time.time() < com.get("end_time", 0)


def start_commitment(c, goal, duration_sec):
    c["commitment"] = {
        "goal": goal,
        "end_time": time.time() + duration_sec
    }


def clear_commitment(c):
    c["commitment"] = None