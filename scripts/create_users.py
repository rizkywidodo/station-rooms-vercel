import time

SUPABASE_URL = "https://qqozhagtvzzehsyxdeey.supabase.co"
SUPABASE_SERVICE_KEY = input("Masukkan Service Role Key: ")

from supabase import create_client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

USERS = [
    # ── PLANNER REGION 1 ──
    {"name": "Aldi Nuary", "email": "naldi@jakartamrt.co.id", "role": "planner", "region": 1},
    {"name": "Arbiyanto Tri Widagdo", "email": "warbiyanto@jakartamrt.co.id", "role": "planner", "region": 1},
    {"name": "Muhammad Fikhri Ramadhan", "email": "rfikhri@jakartamrt.co.id", "role": "planner", "region": 1},
    {"name": "Elsa Aryati", "email": "aelsa@jakartamrt.co.id", "role": "planner", "region": 1},

    # ── PLANNER REGION 2 ──
    {"name": "Dyah Astika Ayu Hapsari", "email": "adyah@jakartamrt.co.id", "role": "planner", "region": 2},
    {"name": "Jinanjar Pamungkas", "email": "pjinanjar@jakartamrt.co.id", "role": "planner", "region": 2},
    {"name": "Ratna Dwi Adhawiyah", "email": "aratna@jakartamrt.co.id", "role": "planner", "region": 2},
    {"name": "Khotama Dantria Ritonga", "email": "rkhotama@jakartamrt.co.id", "role": "planner", "region": 2},

    # ── PLANNER REGION 3 ──
    {"name": "Luqman Hakim S", "email": "sluqman@jakartamrt.co.id", "role": "planner", "region": 3},
    {"name": "Nadya Maharani", "email": "mnadya@jakartamrt.co.id", "role": "planner", "region": 3},
    {"name": "Fauzy Syahrizal", "email": "sfauzy@jakartamrt.co.id", "role": "planner", "region": 3},
    {"name": "Lina Nur Fadilah", "email": "flina@jakartamrt.co.id", "role": "planner", "region": 3},

    # ── AREA AUTHORITY REGION 1 (Jan 2026) ──
    # LBB
    {"name": "Agung Yoga Pradita", "email": "yagung@jakartamrt.co.id", "role": "area_authority", "station_id": "lebak-bulus"},
    {"name": "Dwi Masruri", "email": "mdwi@jakartamrt.co.id", "role": "area_authority", "station_id": "lebak-bulus"},
    {"name": "Yanni Surya", "email": "syanni@jakartamrt.co.id", "role": "area_authority", "station_id": "lebak-bulus"},
    {"name": "Sugiarso Amin", "email": "asugiarso@jakartamrt.co.id", "role": "area_authority", "station_id": "lebak-bulus"},
    {"name": "Agus Heriyanto", "email": "hagus@jakartamrt.co.id", "role": "area_authority", "station_id": "lebak-bulus"},
    {"name": "Helly Setiawan", "email": "shelly@jakartamrt.co.id", "role": "area_authority", "station_id": "lebak-bulus"},
    # FTM
    {"name": "Ellena Kosasih", "email": "kellena@jakartamrt.co.id", "role": "area_authority", "station_id": "fatmawati"},
    {"name": "Yandri Firmansyah", "email": "yfirmansyah@jakartamrt.co.id", "role": "area_authority", "station_id": "fatmawati"},
    {"name": "Teguh Prasetyo S", "email": "tsugianto@jakartamrt.co.id", "role": "area_authority", "station_id": "fatmawati"},
    {"name": "Sigit Setiawan", "email": "ssigit@jakartamrt.co.id", "role": "area_authority", "station_id": "fatmawati"},
    {"name": "Mohammad Ridwan", "email": "ridwan@jakartamrt.co.id", "role": "area_authority", "station_id": "fatmawati"},
    {"name": "Hary Okky Prasetyo", "email": "phary@jakartamrt.co.id", "role": "area_authority", "station_id": "fatmawati"},
    # CPR
    {"name": "Setyo Wicaksono", "email": "wsetyo@jakartamrt.co.id", "role": "area_authority", "station_id": "cipete-raya"},
    {"name": "Ariestya Kurniawan", "email": "kariestya@jakartamrt.co.id", "role": "area_authority", "station_id": "cipete-raya"},
    {"name": "Nurul Halimah", "email": "hnurul@jakartamrt.co.id", "role": "area_authority", "station_id": "cipete-raya"},
    {"name": "Siti Amelia Saraswati", "email": "samelia@jakartamrt.co.id", "role": "area_authority", "station_id": "cipete-raya"},
    {"name": "Riska Dinda Mustika", "email": "mriska@jakartamrt.co.id", "role": "area_authority", "station_id": "cipete-raya"},
    {"name": "Irfan Adiwaskita", "email": "airfan@jakartamrt.co.id", "role": "area_authority", "station_id": "cipete-raya"},
    # HJN
    {"name": "Bagas Jatikawentar", "email": "jbagas@jakartamrt.co.id", "role": "area_authority", "station_id": "haji-nawi"},
    {"name": "Mega Silviani", "email": "smega@jakartamrt.co.id", "role": "area_authority", "station_id": "haji-nawi"},
    {"name": "Ira Utami Putri", "email": "pira@jakartamrt.co.id", "role": "area_authority", "station_id": "haji-nawi"},
    {"name": "Ilham Dwi Christanto", "email": "cdwi@jakartamrt.co.id", "role": "area_authority", "station_id": "haji-nawi"},
    {"name": "Hana Faizah", "email": "fhana@jakartamrt.co.id", "role": "area_authority", "station_id": "haji-nawi"},

    # ── AREA AUTHORITY REGION 2 (Jan 2026) ──
    # BLA
    {"name": "Andhini Kornela Sekar Putri", "email": "sandhini@jakartamrt.co.id", "role": "area_authority", "station_id": "blok-a"},
    {"name": "Arie Dewi Handayani", "email": "hdewi@jakartamrt.co.id", "role": "area_authority", "station_id": "blok-a"},
    {"name": "Aditya Nugraha Rahmadhani", "email": "additya@jakartamrt.co.id", "role": "area_authority", "station_id": "blok-a"},
    {"name": "Rifda Zulfia Rosyadi", "email": "rifdarosyadi@gmail.com", "role": "area_authority", "station_id": "blok-a"},
    {"name": "Rika Rukmanasari", "email": "rrika@jakartamrt.co.id", "role": "area_authority", "station_id": "blok-a"},
    {"name": "Dicky Eko Widyanto", "email": "wdicky@jakartamrt.co.id", "role": "area_authority", "station_id": "blok-a"},
    # BLM
    {"name": "Praginanto Poetranto", "email": "praginanto.poetranto@jakartamrt.co.id", "role": "area_authority", "station_id": "blok-m"},
    {"name": "M. Nasha Suprapto", "email": "snasha@jakartamrt.co.id", "role": "area_authority", "station_id": "blok-m"},
    {"name": "Sandy Ricky Kurniawan", "email": "ksandy@jakartamrt.co.id", "role": "area_authority", "station_id": "blok-m"},
    {"name": "Bagus Priambodo", "email": "pbagus@jakartamrt.co.id", "role": "area_authority", "station_id": "blok-m"},
    {"name": "Angelita Carolyn Mersindy", "email": "cangelita@jakartamrt.co.id", "role": "area_authority", "station_id": "blok-m"},
    {"name": "Bogy Wido Satrio", "email": "bsatrio@jakartamrt.co.id", "role": "area_authority", "station_id": "blok-m"},
    {"name": "Ega Indah Sari", "email": "sega@jakartamrt.co.id", "role": "area_authority", "station_id": "blok-m"},
    # ASN
    {"name": "Khairunnisa Revena", "email": "ckhairunnisa@jakartamrt.co.id", "role": "area_authority", "station_id": "asean"},
    {"name": "Abdul Latief Ramdhan", "email": "rabdul@jakartamrt.co.id", "role": "area_authority", "station_id": "asean"},
    {"name": "Alwy Aziz Farokhi", "email": "farokhialwy@gmail.com", "role": "area_authority", "station_id": "asean"},
    {"name": "Maiske Yunawati", "email": "ymaiske@jakartamrt.co.id", "role": "area_authority", "station_id": "asean"},
    {"name": "Dwi Samsu Al Musyafa", "email": "msamsu@jakartamrt.co.id", "role": "area_authority", "station_id": "asean"},
    {"name": "Indah Dama Yanti", "email": "yindah@jakartamrt.co.id", "role": "area_authority", "station_id": "asean"},
    # SNY
    {"name": "Henu Tri Prasetyo", "email": "phenu@jakartamrt.co.id", "role": "area_authority", "station_id": "senayan"},
    {"name": "Victor Harjono", "email": "hvictor@jakartamrt.co.id", "role": "area_authority", "station_id": "senayan"},
    {"name": "Dhenny Wardana", "email": "wdhenny@jakartamrt.co.id", "role": "area_authority", "station_id": "senayan"},
    {"name": "Andryansyah", "email": "andryans@jakartamrt.co.id", "role": "area_authority", "station_id": "senayan"},
    {"name": "Amanda Listyani", "email": "lamanda@jakartamrt.co.id", "role": "area_authority", "station_id": "senayan"},
    {"name": "Adityawati", "email": "sadityawati@jakartamrt.co.id", "role": "area_authority", "station_id": "senayan"},
    {"name": "Ahmad Zuhairi", "email": "azuhairi@jakartamrt.co.id", "role": "area_authority", "station_id": "senayan"},
    # IST
    {"name": "Aditya Nur Rachman", "email": "radhitya@jakartamrt.co.id", "role": "area_authority", "station_id": "istora"},
    {"name": "Suryani Anisa", "email": "asuryani@jakartamrt.co.id", "role": "area_authority", "station_id": "istora"},
    {"name": "Muhammad Yusuf I.", "email": "iyusuf@jakartamrt.co.id", "role": "area_authority", "station_id": "istora"},
    {"name": "Barru Danisworo", "email": "barru.danisworo@jakartamrt.co.id", "role": "area_authority", "station_id": "istora"},
    {"name": "Luffti Adi P.", "email": "pluffti@jakartamrt.co.id", "role": "area_authority", "station_id": "istora"},
    {"name": "Ariiq Dzakwan Basil", "email": "bariiq@jakartamrt.co.id", "role": "area_authority", "station_id": "istora"},
    {"name": "Prianto Daniel Sihombing", "email": "sprianto@jakartamrt.co.id", "role": "area_authority", "station_id": "istora"},

    # ── AREA AUTHORITY REGION 3 (Jan 2026) ──
    # BHI = bundaran-hi
    {"name": "Oscar Haris", "email": "hoscar@jakartamrt.co.id", "role": "area_authority", "station_id": "bundaran-hi"},
    {"name": "Rizki M. Novianto", "email": "rizki.novianto@jakartamrt.co.id", "role": "area_authority", "station_id": "bundaran-hi"},
    {"name": "Aryo Bimo Seno", "email": "saryo@jakartamrt.co.id", "role": "area_authority", "station_id": "bundaran-hi"},
    {"name": "Danan Ariadi N", "email": "ndanan@jakartamrt.co.id", "role": "area_authority", "station_id": "bundaran-hi"},
    {"name": "Andri Fitriansyah", "email": "fandri@jakartamrt.co.id", "role": "area_authority", "station_id": "bundaran-hi"},
    {"name": "Siti Widya Nazhrah", "email": "nsiti@jakartamrt.co.id", "role": "area_authority", "station_id": "bundaran-hi"},
    {"name": "Zaini Hidayat", "email": "hzaini@jakartamrt.co.id", "role": "area_authority", "station_id": "bundaran-hi"},
    # BNH = bendungan-hilir
    {"name": "Nungky Indra S", "email": "snungky@jakartamrt.co.id", "role": "area_authority", "station_id": "bendungan-hilir"},
    {"name": "Bayu Umbara", "email": "ubayu@jakartamrt.co.id", "role": "area_authority", "station_id": "bendungan-hilir"},
    {"name": "Arie Dharmansyah", "email": "darie@jakartamrt.co.id", "role": "area_authority", "station_id": "bendungan-hilir"},
    {"name": "Indriyanti", "email": "gindriyanti@jakartamrt.co.id", "role": "area_authority", "station_id": "bendungan-hilir"},
    {"name": "Bramantyo Ramadi", "email": "bramadi@jakartamrt.co.id", "role": "area_authority", "station_id": "bendungan-hilir"},
    {"name": "Ahmad Birbik Anwari", "email": "bahmad@jakartamrt.co.id", "role": "area_authority", "station_id": "bendungan-hilir"},
    {"name": "Windiani Imelda Putri", "email": "pwindiani@jakartamrt.co.id", "role": "area_authority", "station_id": "bendungan-hilir"},
    # STB = setiabudi
    {"name": "Kasih Ditaningtyas Sari Pratiwi", "email": "skasih@jakartamrt.co.id", "role": "area_authority", "station_id": "setiabudi"},
    {"name": "Intan Tirta Amalia", "email": "aintan@jakartamrt.co.id", "role": "area_authority", "station_id": "setiabudi"},
    {"name": "Rethadina Defisrian", "email": "drethadina@jakartamrt.co.id", "role": "area_authority", "station_id": "setiabudi"},
    {"name": "Ghinda Lianny Santang", "email": "slianny@jakartamrt.co.id", "role": "area_authority", "station_id": "setiabudi"},
    {"name": "Muhammad Habibie", "email": "habibie@jakartamrt.co.id", "role": "area_authority", "station_id": "setiabudi"},
    {"name": "M. Haqi Nurfadly", "email": "nhaqi@jakartamrt.co.id", "role": "area_authority", "station_id": "setiabudi"},
    # DKA = dukuh-atas
    {"name": "M. Darda Darus S", "email": "sdarda@jakartamrt.co.id", "role": "area_authority", "station_id": "dukuh-atas"},
    {"name": "Ravi Mirza Fitri", "email": "fravi@jakartamrt.co.id", "role": "area_authority", "station_id": "dukuh-atas"},
    {"name": "Teuku Billy", "email": "bteuku@jakartamrt.co.id", "role": "area_authority", "station_id": "dukuh-atas"},
    {"name": "R. Arie Tjahyono", "email": "tjarie@jakartamrt.co.id", "role": "area_authority", "station_id": "dukuh-atas"},
    {"name": "Zunaidi Maruf", "email": "mzunaidi@jakartamrt.co.id", "role": "area_authority", "station_id": "dukuh-atas"},
    {"name": "Chaula Sari Parmawaty", "email": "schaula@jakartamrt.co.id", "role": "area_authority", "station_id": "dukuh-atas"},
    {"name": "Ruli Oktabianto S", "email": "sruli@jakartamrt.co.id", "role": "area_authority", "station_id": "dukuh-atas"},
    {"name": "Rizki Setiawan", "email": "srizki@jakartamrt.co.id", "role": "area_authority", "station_id": "dukuh-atas"},
    {"name": "Dionisius Dimas Julies", "email": "jdionisius@jakartamrt.co.id", "role": "area_authority", "station_id": "dukuh-atas"},
]

def create_user(user):
    try:
        res = supabase.auth.admin.create_user({
            "email": user["email"],
            "password": "mrtj2026",
            "email_confirm": True,
        })
        uid = res.user.id

        profile = {
            "id": uid,
            "name": user["name"],
            "role": user["role"],
        }
        if user["role"] == "planner":
            profile["region"] = user["region"]
        else:
            profile["station_id"] = user["station_id"]

        supabase.table("user_profiles").insert(profile).execute()
        print(f"✓ {user['name']} ({user['email']}) — {user['role']}")
        time.sleep(0.3)
    except Exception as e:
        print(f"✗ {user['name']} ({user['email']}) — {e}")

print(f"Creating {len(USERS)} users...")
for user in USERS:
    create_user(user)
print("Done!")