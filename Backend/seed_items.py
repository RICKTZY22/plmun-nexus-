"""
Seed script: Populate inventory with school-related items.
Run with: python manage.py shell < seed_items.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.inventory.models import Item
from django.utils import timezone
from datetime import timedelta
import random

# Spread items across the last 6 months for realistic graph data
now = timezone.now()

def months_ago(m, day=None):
    """Return a datetime `m` months ago, with optional day offset."""
    dt = now - timedelta(days=m * 30 + (day or random.randint(0, 28)))
    return dt

items = [
    # ── ELECTRONICS (25 items) ──
    {"name": "Dell Latitude Laptop", "category": "ELECTRONICS", "quantity": 15, "location": "Computer Lab A", "description": "14-inch business laptop for student use", "access_level": "STUDENT", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 5},
    {"name": "HP ProBook Laptop", "category": "ELECTRONICS", "quantity": 10, "location": "Computer Lab B", "description": "15.6-inch laptop for faculty presentations", "access_level": "FACULTY", "borrow_duration": 1, "borrow_duration_unit": "DAYS", "months": 5},
    {"name": "Epson LCD Projector", "category": "ELECTRONICS", "quantity": 8, "location": "AV Room", "description": "3600 lumens projector for classrooms", "access_level": "FACULTY", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 5},
    {"name": "BenQ Short-Throw Projector", "category": "ELECTRONICS", "quantity": 4, "location": "Media Center", "description": "Ultra short-throw for small rooms", "access_level": "STAFF", "borrow_duration": 8, "borrow_duration_unit": "HOURS", "months": 4},
    {"name": "Logitech Webcam C920", "category": "ELECTRONICS", "quantity": 20, "location": "IT Storage", "description": "HD webcam for online classes", "access_level": "STUDENT", "borrow_duration": 2, "borrow_duration_unit": "DAYS", "months": 4},
    {"name": "Blue Yeti USB Microphone", "category": "ELECTRONICS", "quantity": 6, "location": "Podcast Room", "description": "Condenser mic for recording and streaming", "access_level": "FACULTY", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 4},
    {"name": "Canon DSLR Camera", "category": "ELECTRONICS", "quantity": 5, "location": "Media Center", "description": "EOS Rebel T7 for photography class", "access_level": "FACULTY", "borrow_duration": 1, "borrow_duration_unit": "DAYS", "months": 3},
    {"name": "Sony Camcorder", "category": "ELECTRONICS", "quantity": 3, "location": "Media Center", "description": "HD camcorder for video projects", "access_level": "FACULTY", "borrow_duration": 2, "borrow_duration_unit": "DAYS", "months": 3},
    {"name": "iPad Air (10th Gen)", "category": "ELECTRONICS", "quantity": 30, "location": "Tablet Cart - Bldg A", "description": "Tablets for digital learning activities", "access_level": "STUDENT", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 3},
    {"name": "Samsung Galaxy Tab S6", "category": "ELECTRONICS", "quantity": 12, "location": "Tablet Cart - Bldg B", "description": "Android tablets for research use", "access_level": "STUDENT", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 2},
    {"name": "JBL Portable Speaker", "category": "ELECTRONICS", "quantity": 10, "location": "Student Affairs", "description": "Bluetooth speaker for events", "access_level": "STAFF", "borrow_duration": 8, "borrow_duration_unit": "HOURS", "months": 2},
    {"name": "Wireless Presentation Clicker", "category": "ELECTRONICS", "quantity": 15, "location": "Faculty Lounge", "description": "Laser pointer with slide control", "access_level": "FACULTY", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 2},
    {"name": "HDMI Cable (3m)", "category": "ELECTRONICS", "quantity": 25, "location": "IT Storage", "description": "Standard HDMI for projector connections", "access_level": "STUDENT", "is_returnable": True, "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 1},
    {"name": "VGA to HDMI Adapter", "category": "ELECTRONICS", "quantity": 10, "location": "IT Storage", "description": "Adapter for older laptops", "access_level": "STUDENT", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 1},
    {"name": "USB-C Hub Multiport", "category": "ELECTRONICS", "quantity": 8, "location": "IT Storage", "description": "7-in-1 hub with HDMI, USB, SD card", "access_level": "STUDENT", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 1},
    {"name": "Scientific Calculator (Casio fx-991)", "category": "ELECTRONICS", "quantity": 50, "location": "Math Department", "description": "Advanced scientific calculator for exams", "access_level": "STUDENT", "borrow_duration": 3, "borrow_duration_unit": "HOURS", "months": 0},
    {"name": "Graphic Calculator TI-84", "category": "ELECTRONICS", "quantity": 20, "location": "Math Department", "description": "Graphing calculator for calculus", "access_level": "STUDENT", "borrow_duration": 3, "borrow_duration_unit": "HOURS", "months": 0},
    {"name": "Extension Cord (5m)", "category": "ELECTRONICS", "quantity": 15, "location": "Maintenance", "description": "Heavy-duty extension cord for events", "access_level": "STAFF", "borrow_duration": 1, "borrow_duration_unit": "DAYS", "months": 0},
    {"name": "Power Strip (6-outlet)", "category": "ELECTRONICS", "quantity": 20, "location": "Maintenance", "description": "Surge-protected power strip", "access_level": "STAFF", "borrow_duration": 1, "borrow_duration_unit": "DAYS", "months": 0},
    {"name": "Desktop PC (Lab Unit)", "category": "ELECTRONICS", "quantity": 40, "location": "Computer Lab A", "description": "Core i5 desktop for programming labs", "access_level": "STUDENT", "status": "IN_USE", "borrow_duration": None, "is_returnable": False, "months": 5},
    {"name": "Smart TV 55-inch", "category": "ELECTRONICS", "quantity": 4, "location": "Lecture Hall 1", "description": "Wall-mounted display for lectures", "access_level": "FACULTY", "status": "IN_USE", "is_returnable": False, "months": 4},
    {"name": "Network Switch 24-Port", "category": "ELECTRONICS", "quantity": 6, "location": "Server Room", "description": "Managed switch for campus LAN", "access_level": "ADMIN", "status": "IN_USE", "is_returnable": False, "months": 5},
    {"name": "Wi-Fi Access Point", "category": "ELECTRONICS", "quantity": 12, "location": "Various Buildings", "description": "Cisco Meraki for campus Wi-Fi", "access_level": "ADMIN", "status": "IN_USE", "is_returnable": False, "months": 5},
    {"name": "Document Scanner", "category": "ELECTRONICS", "quantity": 3, "location": "Library", "description": "Flatbed scanner for document digitization", "access_level": "STUDENT", "borrow_duration": 30, "borrow_duration_unit": "MINUTES", "months": 3},
    {"name": "Thermal Printer", "category": "ELECTRONICS", "quantity": 2, "location": "Registrar", "description": "Receipt printer for ID and forms", "access_level": "STAFF", "status": "IN_USE", "is_returnable": False, "months": 4},

    # ── FURNITURE (20 items) ──
    {"name": "Student Arm Chair", "category": "FURNITURE", "quantity": 200, "location": "Classroom Storage", "description": "Polypropylene chair with writing tablet", "access_level": "STUDENT", "is_returnable": True, "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 5},
    {"name": "Folding Table (6ft)", "category": "FURNITURE", "quantity": 30, "location": "Gymnasium Storage", "description": "Rectangular folding table for events", "access_level": "STAFF", "borrow_duration": 1, "borrow_duration_unit": "DAYS", "months": 5},
    {"name": "Round Table (5ft)", "category": "FURNITURE", "quantity": 15, "location": "Gymnasium Storage", "description": "Round banquet-style table", "access_level": "STAFF", "borrow_duration": 1, "borrow_duration_unit": "DAYS", "months": 4},
    {"name": "Plastic Monoblock Chair", "category": "FURNITURE", "quantity": 150, "location": "General Storage", "description": "White stackable chair for events", "access_level": "STUDENT", "borrow_duration": 8, "borrow_duration_unit": "HOURS", "months": 4},
    {"name": "Podium / Lectern", "category": "FURNITURE", "quantity": 5, "location": "Admin Building", "description": "Wooden lectern with mic holder", "access_level": "FACULTY", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 3},
    {"name": "Whiteboard (4x6 ft)", "category": "FURNITURE", "quantity": 10, "location": "Maintenance", "description": "Portable magnetic whiteboard on wheels", "access_level": "FACULTY", "borrow_duration": 1, "borrow_duration_unit": "DAYS", "months": 3},
    {"name": "Bulletin Board (Cork)", "category": "FURNITURE", "quantity": 8, "location": "Maintenance", "description": "3x4 ft cork board with aluminum frame", "access_level": "STAFF", "borrow_duration": 7, "borrow_duration_unit": "DAYS", "months": 2},
    {"name": "Teacher's Desk", "category": "FURNITURE", "quantity": 25, "location": "Various Classrooms", "description": "Steel frame office desk with drawers", "access_level": "FACULTY", "status": "IN_USE", "is_returnable": False, "months": 5},
    {"name": "Filing Cabinet (4-drawer)", "category": "FURNITURE", "quantity": 12, "location": "Admin Building", "description": "Steel filing cabinet for records", "access_level": "STAFF", "status": "IN_USE", "is_returnable": False, "months": 5},
    {"name": "Bookshelf (5-tier)", "category": "FURNITURE", "quantity": 20, "location": "Library", "description": "Wooden bookshelf for textbooks", "access_level": "STUDENT", "status": "IN_USE", "is_returnable": False, "months": 5},
    {"name": "Lab Stool (Adjustable)", "category": "FURNITURE", "quantity": 40, "location": "Science Lab", "description": "Height-adjustable lab stool", "access_level": "STUDENT", "borrow_duration": None, "is_returnable": False, "months": 4},
    {"name": "Storage Cabinet (Metal)", "category": "FURNITURE", "quantity": 8, "location": "Faculty Room", "description": "Lockable metal cabinet for department supplies", "access_level": "FACULTY", "status": "IN_USE", "is_returnable": False, "months": 3},
    {"name": "Collapsible Stage Platform", "category": "FURNITURE", "quantity": 6, "location": "Gymnasium Storage", "description": "4x8 ft modular stage platform", "access_level": "STAFF", "borrow_duration": 1, "borrow_duration_unit": "DAYS", "months": 2},
    {"name": "Office Swivel Chair", "category": "FURNITURE", "quantity": 30, "location": "Admin Building", "description": "Ergonomic mesh-back office chair", "access_level": "STAFF", "status": "IN_USE", "is_returnable": False, "months": 5},
    {"name": "Conference Table (12-seater)", "category": "FURNITURE", "quantity": 3, "location": "Conference Room", "description": "Large oval conference table", "access_level": "ADMIN", "status": "IN_USE", "is_returnable": False, "months": 5},

    # ── EQUIPMENT (20 items) ──
    {"name": "Laboratory Microscope", "category": "EQUIPMENT", "quantity": 25, "location": "Science Lab 1", "description": "Binocular compound microscope 40x-1000x", "access_level": "STUDENT", "borrow_duration": 2, "borrow_duration_unit": "HOURS", "months": 5},
    {"name": "Bunsen Burner Set", "category": "EQUIPMENT", "quantity": 20, "location": "Science Lab 1", "description": "Gas burner with tubing and stand", "access_level": "FACULTY", "borrow_duration": 2, "borrow_duration_unit": "HOURS", "months": 5},
    {"name": "Dissection Kit", "category": "EQUIPMENT", "quantity": 30, "location": "Biology Lab", "description": "Stainless steel 14-piece dissection set", "access_level": "STUDENT", "borrow_duration": 2, "borrow_duration_unit": "HOURS", "months": 4},
    {"name": "Digital Weighing Scale", "category": "EQUIPMENT", "quantity": 10, "location": "Science Lab 2", "description": "Precision scale 0.01g accuracy", "access_level": "STUDENT", "borrow_duration": 2, "borrow_duration_unit": "HOURS", "months": 4},
    {"name": "Globe (Political/Physical)", "category": "EQUIPMENT", "quantity": 6, "location": "Social Studies Room", "description": "12-inch illuminated world globe", "access_level": "STUDENT", "borrow_duration": 1, "borrow_duration_unit": "DAYS", "months": 3},
    {"name": "Skeleton Model (Full-size)", "category": "EQUIPMENT", "quantity": 3, "location": "Biology Lab", "description": "Life-size anatomical skeleton for study", "access_level": "FACULTY", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 3},
    {"name": "Gymnasium Sound System", "category": "EQUIPMENT", "quantity": 2, "location": "Gymnasium", "description": "PA system with 2 speakers and mixer", "access_level": "STAFF", "borrow_duration": 8, "borrow_duration_unit": "HOURS", "months": 2},
    {"name": "Portable PA System", "category": "EQUIPMENT", "quantity": 4, "location": "Student Affairs", "description": "Battery-powered PA with wireless mic", "access_level": "STAFF", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 2},
    {"name": "Wireless Microphone Set", "category": "EQUIPMENT", "quantity": 8, "location": "AV Room", "description": "Dual-channel UHF wireless mic system", "access_level": "FACULTY", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 1},
    {"name": "Basketball (Spalding)", "category": "EQUIPMENT", "quantity": 15, "location": "PE Storage", "description": "Official size 7 indoor/outdoor ball", "access_level": "STUDENT", "borrow_duration": 2, "borrow_duration_unit": "HOURS", "months": 5},
    {"name": "Volleyball (Mikasa)", "category": "EQUIPMENT", "quantity": 10, "location": "PE Storage", "description": "Official indoor volleyball", "access_level": "STUDENT", "borrow_duration": 2, "borrow_duration_unit": "HOURS", "months": 4},
    {"name": "Badminton Racket Set", "category": "EQUIPMENT", "quantity": 12, "location": "PE Storage", "description": "Set of 2 rackets with shuttlecocks", "access_level": "STUDENT", "borrow_duration": 2, "borrow_duration_unit": "HOURS", "months": 3},
    {"name": "Chess Set (Tournament)", "category": "EQUIPMENT", "quantity": 10, "location": "Student Center", "description": "Vinyl board with weighted pieces and clock", "access_level": "STUDENT", "borrow_duration": 2, "borrow_duration_unit": "HOURS", "months": 1},
    {"name": "First Aid Kit", "category": "EQUIPMENT", "quantity": 10, "location": "Clinic", "description": "Complete 100-piece emergency first aid kit", "access_level": "STAFF", "status": "IN_USE", "is_returnable": False, "months": 5},
    {"name": "Fire Extinguisher (ABC)", "category": "EQUIPMENT", "quantity": 20, "location": "Various Buildings", "description": "10 lb multi-purpose dry chemical", "access_level": "ADMIN", "status": "IN_USE", "is_returnable": False, "months": 5},
    {"name": "Megaphone", "category": "EQUIPMENT", "quantity": 4, "location": "Security Office", "description": "50W bullhorn with siren", "access_level": "STAFF", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 2},
    {"name": "Stopwatch Set (10 pcs)", "category": "EQUIPMENT", "quantity": 5, "location": "PE Storage", "description": "Digital stopwatch for PE activities", "access_level": "FACULTY", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 1},
    {"name": "Measuring Tape (50m)", "category": "EQUIPMENT", "quantity": 6, "location": "PE Storage", "description": "Fiberglass measuring tape for fields", "access_level": "FACULTY", "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 0},
    {"name": "Laminating Machine", "category": "EQUIPMENT", "quantity": 2, "location": "Admin Building", "description": "A3 thermal laminator for IDs and posters", "access_level": "STAFF", "borrow_duration": 30, "borrow_duration_unit": "MINUTES", "months": 3},
    {"name": "Paper Cutter (Guillotine)", "category": "EQUIPMENT", "quantity": 3, "location": "Print Room", "description": "A3 heavy-duty paper trimmer", "access_level": "STAFF", "borrow_duration": 30, "borrow_duration_unit": "MINUTES", "months": 2},

    # ── SUPPLIES (20 items) ──
    {"name": "Whiteboard Marker Set", "category": "SUPPLIES", "quantity": 100, "location": "Faculty Room", "description": "Pack of 4 colors (black, blue, red, green)", "access_level": "FACULTY", "is_returnable": False, "months": 5},
    {"name": "Chalk Box (White)", "category": "SUPPLIES", "quantity": 50, "location": "Faculty Room", "description": "Box of 100 pcs dustless chalk", "access_level": "FACULTY", "is_returnable": False, "months": 5},
    {"name": "Bond Paper (A4 Ream)", "category": "SUPPLIES", "quantity": 80, "location": "Supply Room", "description": "Substance 20, 500 sheets per ream", "access_level": "STAFF", "is_returnable": False, "months": 4},
    {"name": "Bond Paper (Legal Ream)", "category": "SUPPLIES", "quantity": 40, "location": "Supply Room", "description": "Long/legal size, 500 sheets per ream", "access_level": "STAFF", "is_returnable": False, "months": 4},
    {"name": "Printer Ink (Black)", "category": "SUPPLIES", "quantity": 15, "location": "IT Storage", "description": "Compatible ink cartridge for Epson L-series", "access_level": "STAFF", "is_returnable": False, "months": 3},
    {"name": "Printer Ink (Colored Set)", "category": "SUPPLIES", "quantity": 10, "location": "IT Storage", "description": "Cyan, Magenta, Yellow set for Epson", "access_level": "STAFF", "is_returnable": False, "months": 3},
    {"name": "Stapler (Heavy Duty)", "category": "SUPPLIES", "quantity": 12, "location": "Supply Room", "description": "Can staple up to 100 sheets", "access_level": "STAFF", "borrow_duration": 1, "borrow_duration_unit": "DAYS", "months": 2},
    {"name": "Staple Wire (Box)", "category": "SUPPLIES", "quantity": 30, "location": "Supply Room", "description": "Standard 26/6 staple wire, 5000 pcs/box", "access_level": "STAFF", "is_returnable": False, "months": 2},
    {"name": "Scotch Tape (Roll)", "category": "SUPPLIES", "quantity": 50, "location": "Supply Room", "description": "3/4 inch transparent tape", "access_level": "STUDENT", "is_returnable": False, "months": 1},
    {"name": "Masking Tape (Roll)", "category": "SUPPLIES", "quantity": 30, "location": "Supply Room", "description": "1 inch painters tape", "access_level": "STUDENT", "is_returnable": False, "months": 1},
    {"name": "Manila Paper (Pack)", "category": "SUPPLIES", "quantity": 25, "location": "Supply Room", "description": "20x30 inch, 10 sheets per pack", "access_level": "STUDENT", "is_returnable": False, "months": 0},
    {"name": "Cartolina (Assorted)", "category": "SUPPLIES", "quantity": 40, "location": "Supply Room", "description": "Assorted colors, 20x30 inch", "access_level": "STUDENT", "is_returnable": False, "months": 0},
    {"name": "Folder (Brown, Legal)", "category": "SUPPLIES", "quantity": 100, "location": "Supply Room", "description": "Kraft brown folder for filing", "access_level": "STAFF", "is_returnable": False, "months": 4},
    {"name": "Envelope (Long, Brown)", "category": "SUPPLIES", "quantity": 200, "location": "Supply Room", "description": "Standard mailing envelope", "access_level": "STAFF", "is_returnable": False, "months": 3},
    {"name": "Ballpen (Box of 50)", "category": "SUPPLIES", "quantity": 10, "location": "Supply Room", "description": "Blue ballpoint pen, 0.7mm", "access_level": "STAFF", "is_returnable": False, "months": 2},
    {"name": "Whiteboard Eraser", "category": "SUPPLIES", "quantity": 20, "location": "Faculty Room", "description": "Magnetic whiteboard eraser", "access_level": "FACULTY", "is_returnable": True, "borrow_duration": 4, "borrow_duration_unit": "HOURS", "months": 1},
    {"name": "Glue Stick (Pack of 12)", "category": "SUPPLIES", "quantity": 15, "location": "Supply Room", "description": "Non-toxic washable glue stick", "access_level": "STUDENT", "is_returnable": False, "months": 0},
    {"name": "Scissors (Pair)", "category": "SUPPLIES", "quantity": 20, "location": "Supply Room", "description": "8-inch stainless steel scissors", "access_level": "STUDENT", "borrow_duration": 2, "borrow_duration_unit": "HOURS", "months": 1},
    {"name": "Correction Tape (Box)", "category": "SUPPLIES", "quantity": 24, "location": "Supply Room", "description": "5mm x 6m correction tape, 12 pcs/box", "access_level": "STUDENT", "is_returnable": False, "months": 0},
    {"name": "ID Lace (Nylon, PLMun)", "category": "SUPPLIES", "quantity": 500, "location": "Registrar", "description": "Official PLMun branded lanyard", "access_level": "STUDENT", "is_returnable": False, "months": 5},
]

created = 0
for data in items:
    m = data.pop('months')
    data.setdefault('status', 'AVAILABLE')
    data.setdefault('is_returnable', True)
    data.setdefault('borrow_duration_unit', 'DAYS')
    bd = data.get('borrow_duration')
    
    item = Item.objects.create(**data)
    # Backdate created_at for graph spread
    Item.objects.filter(pk=item.pk).update(created_at=months_ago(m))
    created += 1

print(f"\n✅ Done! Created {created} school inventory items across 6 months.")
print(f"   Electronics: {sum(1 for i in items if i.get('category','') == 'ELECTRONICS')}")  
print(f"   Furniture:    {sum(1 for i in items if i.get('category','') == 'FURNITURE')}")
print(f"   Equipment:    {sum(1 for i in items if i.get('category','') == 'EQUIPMENT')}")
print(f"   Supplies:     {sum(1 for i in items if i.get('category','') == 'SUPPLIES')}")
print(f"   Total items in DB: {Item.objects.count()}")
