"""Static source data for the seed script.

Districts are deliberately engineered into three tiers so the M6 priority score
has a real signal to find instead of uniform noise:

  underserved -> high complaint volume, LOW infrastructure_index, LOW investment
  moderate    -> mid volume, mid index, mid investment
  well_served -> low volume, HIGH index, HIGH investment

If the scoring function is correct, the underserved tier must rise to the top.
That is what makes the M9 "why this area" explanation demonstrable.
"""

# (name, state, lat, lon, population, infrastructure_index, current_investment_cr, tier)
DISTRICTS = [
    ("Muzaffarpur", "Bihar",          26.1225, 85.3906, 4801062, 28.4,  95.0,  "underserved"),
    ("Balangir",    "Odisha",         20.7075, 83.4846, 1648997, 31.2,  78.0,  "underserved"),
    ("Chitrakoot",  "Uttar Pradesh",  25.2000, 80.9000,  991730, 34.6, 110.0,  "underserved"),
    ("Ranchi",      "Jharkhand",      23.3441, 85.3096, 2914253, 47.3, 210.0,  "moderate"),
    ("Guwahati",    "Assam",          26.1445, 91.7362, 1116267, 51.9, 265.0,  "moderate"),
    ("Jaipur",      "Rajasthan",      26.9124, 75.7873, 3073350, 58.1, 410.0,  "moderate"),
    ("Nagpur",      "Maharashtra",    21.1458, 79.0882, 2405665, 62.5, 340.0,  "moderate"),
    ("Surat",       "Gujarat",        21.1702, 72.8311, 4467797, 71.6, 580.0,  "well_served"),
    ("Coimbatore",  "Tamil Nadu",     11.0168, 76.9558, 3458045, 74.2, 540.0,  "well_served"),
    ("Pune",        "Maharashtra",    18.5204, 73.8567, 9429408, 78.9, 620.0,  "well_served"),
]

CATEGORIES = [
    "Roads", "Water Supply", "Sanitation", "Electricity",
    "Public Transport", "Healthcare", "Drainage", "Street Lighting",
]

# Raw citizen text in the language it was submitted in, paired with the ground
# truth the AI pass is expected to recover. severity/urgency are 1-5.
# (language, raw_text, english, category, severity, urgency, sentiment)
TEMPLATES = [
    ("hi", "Sadak par itne bade gaddhe hain ki roz accident ho rahe hain. Kai log gir chuke hain.",
     "The road has potholes so large that accidents happen daily. Several people have fallen.",
     "Roads", 5, 5, "angry"),
    ("hi", "Do hafte se nal me paani nahi aaya. Poora mohalla pareshan hai.",
     "No water in the taps for two weeks. The entire neighbourhood is suffering.",
     "Water Supply", 5, 5, "angry"),
    ("hi", "Naali ka gnda paani sadak par beh raha hai, bimari fail rahi hai.",
     "Sewage water is flowing onto the road and disease is spreading.",
     "Drainage", 5, 4, "angry"),
    ("hi", "Street light ek mahine se kharab hai, raat me nikalna khatarnak hai.",
     "The street light has been broken for a month; going out at night is dangerous.",
     "Street Lighting", 3, 3, "frustrated"),
    ("mr", "Rastyavar khadde padle aahet, durchakki chalavane ashakya jhale aahe.",
     "The road is full of potholes; riding a two-wheeler has become impossible.",
     "Roads", 4, 4, "frustrated"),
    ("mr", "Gel'ya aathvadyapasun vij purvatha khandit aahe, mulanna abhyas karta yet nahi.",
     "Power supply has been cut since last week; children cannot study.",
     "Electricity", 4, 4, "frustrated"),
    ("ta", "Engal palliekoodam arugil kuppai kuvial ullathu, nariya thurnatram varugirathu.",
     "There is a garbage pile near our school giving off a terrible smell.",
     "Sanitation", 4, 3, "frustrated"),
    ("ta", "Aatoo pergundu vasathi illai, mudiyavargal maruthuvamanai sella mudiyavillai.",
     "There is no bus facility, so elderly people cannot reach the hospital.",
     "Public Transport", 4, 4, "concerned"),
    ("bn", "Amader elakay pray protidin bidyut chole jay, jol o thake na.",
     "Electricity goes out almost daily in our area and there is no water either.",
     "Electricity", 4, 4, "frustrated"),
    ("bn", "Hospital e daktar nei, rogi der onek dur jete hocche.",
     "There is no doctor at the hospital; patients must travel far.",
     "Healthcare", 5, 5, "concerned"),
    ("en", "The primary health centre has had no functioning doctor for three months.",
     "The primary health centre has had no functioning doctor for three months.",
     "Healthcare", 5, 5, "concerned"),
    ("en", "Garbage has not been collected in our lane for over two weeks.",
     "Garbage has not been collected in our lane for over two weeks.",
     "Sanitation", 3, 3, "frustrated"),
    ("en", "Water supply comes only once every three days and is often muddy.",
     "Water supply comes only once every three days and is often muddy.",
     "Water Supply", 4, 4, "frustrated"),
    ("en", "The main road was repaired last month and is in good condition now.",
     "The main road was repaired last month and is in good condition now.",
     "Roads", 1, 1, "positive"),
    ("en", "Street light near the park flickers occasionally but mostly works.",
     "Street light near the park flickers occasionally but mostly works.",
     "Street Lighting", 2, 1, "neutral"),
    ("en", "Bus frequency on route 14 could be slightly better during peak hours.",
     "Bus frequency on route 14 could be slightly better during peak hours.",
     "Public Transport", 2, 2, "neutral"),
    ("hi", "Naye drainage kaam ke baad paani bharna kam ho gaya hai, lekin thoda kaam baaki hai.",
     "Waterlogging has reduced after the new drainage work, but some work remains.",
     "Drainage", 2, 2, "neutral"),
    ("mr", "Panyachi gunvatta sudharli aahe, pan vel patrak niyamit nahi.",
     "Water quality has improved but the timing schedule is not regular.",
     "Water Supply", 2, 2, "neutral"),
]

# Native-script complaints. The romanised entries above are how people type on
# phones; these are how the same complaints arrive from web forms and kiosks.
# Both paths must classify correctly, so both are represented in the corpus.
TEMPLATES += [
    ("hi", "सड़क पर बड़ा गड्ढा है, रोज़ दुर्घटना हो रही है।",
     "There is a large pothole on the road and accidents happen daily.",
     "Roads", 5, 5, "angry"),
    ("hi", "नाली का गंदा पानी सड़क पर बह रहा है, बीमारी फैल रही है।",
     "Dirty drain water is flowing onto the road and disease is spreading.",
     "Drainage", 5, 4, "angry"),
    ("hi", "स्ट्रीट लाइट एक महीने से खराब है, रात में निकलना खतरनाक है।",
     "The street light has been broken for a month; going out at night is dangerous.",
     "Street Lighting", 3, 3, "frustrated"),
    ("mr", "रस्त्यावर खड्डे पडले आहेत, दुचाकी चालवणे अशक्य झाले आहे.",
     "The road is full of potholes; riding a two-wheeler has become impossible.",
     "Roads", 4, 4, "frustrated"),
    ("bn", "হাসপাতালে ডাক্তার নেই, রোগীদের অনেক দূর যেতে হচ্ছে।",
     "There is no doctor at the hospital; patients must travel far.",
     "Healthcare", 5, 5, "concerned"),
    ("bn", "আমাদের এলাকায় প্রায় প্রতিদিন বিদ্যুৎ চলে যায়।",
     "Electricity goes out almost daily in our area.",
     "Electricity", 4, 4, "frustrated"),
    ("ta", "எங்கள் பள்ளிக்கூடம் அருகில் குப்பை குவியல் உள்ளது.",
     "There is a garbage pile near our school.",
     "Sanitation", 4, 3, "frustrated"),
]

LOCATIONS = [
    "Main Bazaar Road", "Station Road", "Ward 7", "Gandhi Nagar", "Old Town",
    "Bus Stand Area", "Civil Lines", "Industrial Colony", "Rail Colony",
    "Shivaji Chowk", "Market Square", "Block C", "Riverside Colony",
]

STATUSES = ["Received", "Under Review", "Funded", "Resolved"]
