"""
Seed the database with sample HCPs and one Rep for development.
Run with:  venv/Scripts/python.exe seed.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, init_db
from app import models


def seed():
    print("Initialising database schema...")
    init_db()

    db = SessionLocal()
    try:
        # ── Reps ────────────────────────────────────────────────────────
        if not db.query(models.Rep).first():
            reps = [
                models.Rep(
                    name="Alex Johnson",
                    email="alex.johnson@pharma.com",
                    territory="Northeast",
                    region="US East",
                ),
                models.Rep(
                    name="Maria Garcia",
                    email="maria.garcia@pharma.com",
                    territory="Southwest",
                    region="US West",
                ),
            ]
            db.add_all(reps)
            db.commit()
            print("✓ Seeded 2 reps.")
        else:
            print("  Reps already exist — skipped.")

        # ── HCPs ────────────────────────────────────────────────────────
        if not db.query(models.HCP).first():
            hcps = [
                models.HCP(
                    name="Dr. Sarah Chen",
                    specialty="Oncology",
                    institution="Mass General Hospital",
                    email="s.chen@mgh.edu",
                    phone="617-555-0101",
                    territory="Northeast",
                    npi_number="1234567890",
                    prescribing_potential="high",
                ),
                models.HCP(
                    name="Dr. James Patel",
                    specialty="Cardiology",
                    institution="Cleveland Clinic",
                    email="j.patel@ccf.org",
                    phone="216-555-0202",
                    territory="Midwest",
                    npi_number="0987654321",
                    prescribing_potential="medium",
                ),
                models.HCP(
                    name="Dr. Lisa Wong",
                    specialty="Rheumatology",
                    institution="UCSF Medical Center",
                    email="l.wong@ucsf.edu",
                    phone="415-555-0303",
                    territory="Southwest",
                    npi_number="1122334455",
                    prescribing_potential="high",
                ),
                models.HCP(
                    name="Dr. Michael Torres",
                    specialty="Neurology",
                    institution="Mayo Clinic",
                    email="m.torres@mayo.edu",
                    phone="507-555-0404",
                    territory="Midwest",
                    npi_number="5544332211",
                    prescribing_potential="low",
                ),
                models.HCP(
                    name="Dr. Emily Roberts",
                    specialty="Hematology",
                    institution="Johns Hopkins",
                    email="e.roberts@jhu.edu",
                    phone="410-555-0505",
                    territory="Northeast",
                    npi_number="6677889900",
                    prescribing_potential="high",
                ),
                models.HCP(
                    name="Dr. David Kim",
                    specialty="Oncology",
                    institution="MD Anderson Cancer Center",
                    email="d.kim@mdanderson.org",
                    phone="713-555-0606",
                    territory="Southwest",
                    npi_number="7788990011",
                    prescribing_potential="high",
                ),
                models.HCP(
                    name="Dr. Rachel Foster",
                    specialty="Cardiology",
                    institution="Stanford Medical Center",
                    email="r.foster@stanford.edu",
                    phone="650-555-0707",
                    territory="Southwest",
                    npi_number="8899001122",
                    prescribing_potential="medium",
                ),
            ]
            db.add_all(hcps)
            db.commit()
            print(f"✓ Seeded {len(hcps)} HCPs.")
        else:
            print("  HCPs already exist — skipped.")

        print("\nSeed complete. You can now run: run.bat")

    except Exception as e:
        db.rollback()
        print(f"\n✗ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
