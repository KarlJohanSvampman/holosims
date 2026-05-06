import time
from datetime import datetime

def generate_initial_world():

    now = datetime.now()

    world = {
        "tick": 0,

        "calendar": {
            "year": now.year,
            "month": now.month,
            "day": now.day,
            "hour": now.hour,
            "minute": now.minute,
            "second": now.second,
            "timestamp": time.time()
        },

        "grid": {
            "width": 100,
            "height": 100
        },

        "characters": {
            "c1": {
                "id": "c1",
                "name": "Alex",
                "x": 2,
                "y": 2,

                "needs": {
                    "energy": 0.8,
                    "hunger": 0.5
                },

                "goal": {"type": "rest"},
                "plan": None,

                "task_queue": [],
                "current_task": None
            }
        },

        "props": [
            {
                "id": "sofa_1",
                "type": "sofa",
                "class": "sofa_modern_a",

                "x": 5,
                "y": 5,
                "rotation": 0
            }
        ],

        "buildings": [
            {
                "id": "house_1",

                "rooms": [
                    {
                        "id": "r1",
                        "bounds": {"x1": 0, "y1": 0, "x2": 6, "y2": 6}
                    }
                ],

                "doors": [
                    {
                        "id": "door_1",
                        "x": 6,
                        "y": 3,

                        "state": "closed",
                        "locked": False,
                        "busy": False,

                        "connects": ["r1"]
                    }
                ]
            }
        ],

        "content": {
            "prop_types": {
                "sofa": {
                    "footprint": [
                        {"dx": 0, "dy": 0},
                        {"dx": 1, "dy": 0},
                        {"dx": 2, "dy": 0}
                    ],
                    "interactions": ["sit", "lie"]
                }
            },

            "prop_classes": {
                "sofa_modern_a": {
                    "type": "sofa",
                    "model": "/resources/props/sofa_modern_a.glb"
                }
            }
        }
    }

    return world