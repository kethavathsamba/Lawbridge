"""Seed MongoDB with admin user and sample lawyers. Run: python seed.py"""
import os
import sys
from datetime import datetime

# run from backend dir
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from database import get_collection
from auth_utils import hash_password

def seed():
    users = get_collection("users")
    lawyers = get_collection("lawyers")

    # Admin user (if not exists)
    if not users.find_one({"email": "admin@lawbridge.com"}):
        from bson import ObjectId
        admin_id = users.insert_one({
            "email": "admin@lawbridge.com",
            "passwordHash": hash_password("admin123"),
            "name": "Admin",
            "phone": "",
            "role": "admin",
        }).inserted_id
        print("Created admin: admin@lawbridge.com / admin123")

    # Sample lawyers (users + lawyer profiles)
    samples = [
        {"name": "Adv. Rajesh Kumar", "email": "rajesh@lawbridge.com", "spec": "Criminal & Civil Law", "exp": "15 Years", "loc": "Delhi High Court", "fee": "Rs 2000", "rating": 4.9, "reviews": 124},
        {"name": "Adv. Priya Sharma", "email": "priya@lawbridge.com", "spec": "Family & Divorce Law", "exp": "8 Years", "loc": "Mumbai CBD", "fee": "Rs 1500", "rating": 4.8, "reviews": 89},
        {"name": "Adv. Ananya Patel", "email": "ananya@lawbridge.com", "spec": "Corporate & Startup", "exp": "12 Years", "loc": "Bangalore", "fee": "Rs 3000", "rating": 5.0, "reviews": 201},
        {"name": "Adv. Vikram Singh", "email": "vikram@lawbridge.com", "spec": "Property Disputes", "exp": "20 Years", "loc": "Pune District Court", "fee": "Rs 2500", "rating": 4.7, "reviews": 340},
        {"name": "Adv. Neha Gupta", "email": "neha@lawbridge.com", "spec": "Cyber Law", "exp": "5 Years", "loc": "Remote / Delhi", "fee": "Rs 1200", "rating": 4.6, "reviews": 45},
    ]
    for s in samples:
        if users.find_one({"email": s["email"]}):
            continue
        uid = users.insert_one({
            "email": s["email"],
            "passwordHash": hash_password("lawyer123"),
            "name": s["name"],
            "phone": "+91 9876543210",
            "role": "lawyer",
        }).inserted_id
        lawyers.insert_one({
            "userId": str(uid),
            "specialization": s["spec"],
            "experience": s["exp"],
            "location": s["loc"],
            "fee": s["fee"],
            "rating": s["rating"],
            "reviews": s["reviews"],
            "languages": ["English", "Hindi"],
            "verified": True,
            "available": True,
            "barCouncilId": "D/1234/2009",
            "bio": "Experienced advocate.",
            "availability": "Mon-Sat 10 AM - 6 PM",
            "imgColor": "#cbd5e1",
            "createdAt": datetime.utcnow().isoformat() + "Z",
        })
        print(f"Created lawyer: {s['email']} / lawyer123")
    print("Seed done.")


if __name__ == "__main__":
    seed()
