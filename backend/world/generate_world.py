import time
from datetime import datetime

def generate_initial_world():

    now = datetime.now()

    world = {
        # =========================
        # CORE
        # =========================
        "tick": 0,
        "calendar": {
            "year": now.year,
            "month": now.month,
            "day": now.day,
            "hour": now.hour,
            "minute": now.minute,
            "second": now.second,
            "weekday": now.strftime("%A"),
            "timestamp": time.time()
        },

        # =========================
        # MAP
        # =========================
        "grid": {
            "width": 100,
            "height": 100
        },

        # =========================
        # ENTITIES
        # =========================
        "characters": {},
        "props": [],
        "items": [],

        # =========================
        # BUILDINGS / ROOMS
        # =========================
        "buildings": [
            {
                "id": "house_1",
                "rooms": [
                    {
                        "id": "r1",
                        "bounds": {"x1": 0, "y1": 0, "x2": 6, "y2": 6},
                        "zone": "bedroom"
                    },
                    {
                        "id": "r2",
                        "bounds": {"x1": 7, "y1": 0, "x2": 12, "y2": 6},
                        "zone": "kitchen"
                    },
                    {
                        "id": "r3",
                        "bounds": {"x1": 0, "y1": 7, "x2": 6, "y2": 12},
                        "zone": "bathroom"
                    }
                ],
                "doors": [
                    {"id": "d1", "x": 7, "y": 3, "connects": ["r1", "r2"], "is_open": True}
                ]
            }
        ],

        # =========================
        # TRANSPORT
        # =========================
        "bus_stops": [
            {"id": "stop_1", "x": 5, "y": 5, "neighborhood": "A"}
        ],

        # =========================
        # HOUSEHOLDS
        # =========================
        "households": {
            "h1": {
                "id": "h1",
                "members": [],
                "wealth": 500,
                "usage": {
                    "water": 0,
                    "electricity": 0,
                    "gas_trips": 0
                },
                "bills_due": []
            }
        },

        # =========================
        # JOB SYSTEM
        # =========================
        "job_listings": [],
        "jobs": {},

        # =========================
        # ECONOMY
        # =========================
        "environment": {
            "power_cost_index": 1.0,
            "food_cost_index": 1.0,
            "tax_rate": 0.1
        },

        # =========================
        # WORLD SYSTEMS
        # =========================
        "news": [],
        "events": [],
        "incidents": [],
        "mailboxes": [
            {
                "id": "mail_1",
                "x": 2,
                "y": 2,
                "household_id": "h1",
                "mail": []
            }
        ],

        # =========================
        # CONTENT BANKS (EDITOR USE)
        # =========================
        "content": {

            "prop_types": {
                "toilet": {
                    "model": "props/toilet.glb",
                    "interaction": {
                        "action": "use_toilet",
                        "spot_offset": [0, 1]
                    }
                },
                "bed": {
                    "model": "props/bed.glb",
                    "interaction": {
                        "action": "sleep"
                    }
                },
                "computer": {
                    "model": "props/computer.glb",
                    "interaction": {
                        "action": "apply_job"
                    }
                }
            },

            "traits": [
                "lazy",
                "ambitious",
                "efficient",
                "social",
                "introverted"
            ],

            "activities": {
                "sleep": {"avg_minutes": 480},
                "use_toilet": {"avg_minutes": 3},
                "apply_job": {"avg_minutes": 6}
            }
        }
    }

    return world