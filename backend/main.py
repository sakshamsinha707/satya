import os
import re
import json
import warnings
import urllib.request

import numpy as np
warnings.filterwarnings("ignore")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import cross_val_score
from sklearn.utils import shuffle
from sklearn.metrics.pairwise import cosine_similarity

import uvicorn

# ══════════════════════════════════════════════════════════════
# API KEYS
# ══════════════════════════════════════════════════════════════
API_KEYS = {
    "newsapi":  os.environ.get("NEWSAPI_KEY",  "63c32e3f4cb24df099e08956b22cdeb7"),
    "gnews":    os.environ.get("GNEWS_KEY",    "79073fa3fcaeddac726ee907dbca4bf3"),
    "guardian": os.environ.get("GUARDIAN_KEY", "3e0ad077-d7ba-48df-b606-70e04f888019"),
}

# ══════════════════════════════════════════════════════════════
# SOURCE RELIABILITY
# ══════════════════════════════════════════════════════════════
SOURCE_RELIABILITY = {
    "BBC": 90, "Reuters": 95, "AP": 92, "Guardian": 88,
    "NYT": 82, "NPR": 85, "CNN": 72, "Bloomberg": 84,
    "WSJ": 83, "TheGuardian": 88, "AssociatedPress": 92,
    "Fox": 58, "DailyMail": 42, "HuffPost": 60,
    "BuzzFeed": 50, "Vice": 55, "Vox": 65,
    "InfoWars": 8, "Breitbart": 22, "NaturalNews": 5,
    "Unknown": 38, "Blog": 28, "Blogspot": 25,
    "Twitter": 20, "Facebook": 18, "WhatsApp": 12,
    "Telegram": 15, "Instagram": 15, "TikTok": 10,
    "Forwarded": 10, "Anonymous": 10, "ChainMessage": 5,
}

LOW_CRED_SOURCES = {
    "whatsapp", "facebook", "twitter", "telegram", "tiktok",
    "instagram", "blog", "blogspot", "infowars", "unknown",
    "naturalnews", "breitbart", "forwarded", "anonymous",
    "chainmessage", "chain message",
}

# ══════════════════════════════════════════════════════════════
# HTTP HELPER
# ══════════════════════════════════════════════════════════════
HEADERS = {"User-Agent": "FakeNewsDetector/3.0 (educational)", "Accept": "application/json"}

def _get(url, timeout=10):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception:
        return None

def _combine(title, desc):
    if not title or len(title) < 15:
        return None
    if "[Removed]" in title or "null" in title.lower():
        return None
    combined = title.strip()
    if desc:
        first = desc.strip().split(".")[0].strip()
        if len(first) > 15:
            combined = combined + ". " + first
    return combined

# ══════════════════════════════════════════════════════════════
# NEWS FETCHERS
# ══════════════════════════════════════════════════════════════
def fetch_newsapi(key, n=80):
    results = []
    for cat in ["general", "science", "health", "technology", "business"]:
        url = (f"https://newsapi.org/v2/top-headlines"
               f"?language=en&category={cat}&pageSize=20&apiKey={key}")
        data = _get(url)
        if data and data.get("status") == "ok":
            for a in data.get("articles", []):
                text = _combine(a.get("title", ""), a.get("description", ""))
                if text:
                    results.append(text)
        if len(results) >= n:
            break
    return results[:n]

def fetch_gnews(key, n=80):
    results = []
    for topic in ["world", "science", "health", "technology", "business"]:
        url = (f"https://gnews.io/api/v4/top-headlines"
               f"?topic={topic}&lang=en&max=10&token={key}")
        data = _get(url)
        if data and "articles" in data:
            for a in data["articles"]:
                text = _combine(a.get("title", ""), a.get("description", ""))
                if text:
                    results.append(text)
        if len(results) >= n:
            break
    return results[:n]

def fetch_guardian(key, n=80):
    results = []
    for sec in ["world", "science", "technology", "business", "environment"]:
        url = (f"https://content.guardianapis.com/search"
               f"?section={sec}&show-fields=headline,trailText"
               f"&page-size=20&api-key={key}")
        data = _get(url)
        if data and data.get("response", {}).get("status") == "ok":
            for item in data["response"].get("results", []):
                fields = item.get("fields", {})
                title = fields.get("headline", item.get("webTitle", "")).strip()
                trail = re.sub(r'<[^>]+>', '', fields.get("trailText", "") or "")
                text = _combine(title, trail)
                if text:
                    results.append(text)
        if len(results) >= n:
            break
    return results[:n]

def fetch_live_real_news():
    providers = [
        ("NewsAPI", API_KEYS["newsapi"], fetch_newsapi),
        ("GNews",   API_KEYS["gnews"],   fetch_gnews),
        ("Guardian",API_KEYS["guardian"],fetch_guardian),
    ]
    for name, key, fetcher in providers:
        if not key:
            continue
        try:
            headlines = fetcher(key, n=80)
            if headlines and len(headlines) >= 10:
                return headlines, name, len(headlines)
        except Exception:
            pass
    return [], "BuiltIn", 0

def fetch_related_news(query):
    q = query[:100].replace(" ", "%20")
    url = (f"https://newsapi.org/v2/everything?q={q}"
           f"&language=en&pageSize=5&apiKey={API_KEYS['newsapi']}")
    data = _get(url)
    if not data or data.get("status") != "ok":
        return []
    texts = []
    for a in data.get("articles", []):
        combined = (a.get("title", "") + ". " + (a.get("description") or "")).strip()
        if combined:
            texts.append(combined)
    return texts

# ══════════════════════════════════════════════════════════════
# FALLBACK DATASET
# ══════════════════════════════════════════════════════════════
FALLBACK_REAL = [
    "NTA announces JEE Main 2026 exam dates for January and April sessions.",
    "Government increases LPG cylinder prices by 50 rupees starting next month.",
    "CBSE releases updated syllabus for Class 12 board exams this year.",
    "Indian Railways introduces new Vande Bharat train route between cities.",
    "Reserve Bank of India keeps repo rate unchanged in latest policy meeting.",
    "Supreme Court schedules hearing on new education policy next week.",
    "Ministry of Education launches scholarship scheme for engineering students.",
    "Fuel prices remain stable after minor fluctuations this week.",
    "State government announces new digital education initiative for schools.",
    "Election Commission releases updated voter list ahead of elections.",
    "New traffic rules implemented in major cities from next month.",
    "ISRO successfully conducts test of reusable launch vehicle prototype.",
    "India reports moderate increase in GDP growth this quarter.",
    "Health ministry issues advisory on seasonal flu precautions.",
    "Scientists confirm COVID variant is 30 percent more transmissible according to peer-reviewed study in The Lancet.",
    "The Federal Reserve raised interest rates by 0.25 percent amid inflation concerns.",
    "NASA successfully launched Artemis II carrying four astronauts toward the Moon.",
    "WHO reports global measles cases rose 18 percent last year due to reduced vaccination coverage.",
    "Parliament passed a new climate bill requiring 40 percent reduction in emissions by 2035.",
    "The unemployment rate dropped to 3.8 percent according to the latest government report.",
    "A new study published in Nature links air pollution to increased risk of dementia.",
    "Apple reported quarterly revenue of 94.8 billion dollars beating analyst expectations.",
    "The Supreme Court ruled 6 to 3 in favour of expanded voting rights protections.",
    "Researchers at MIT developed a biodegradable plastic alternative from seaweed.",
    "Global average temperature in 2024 was 1.45 degrees above pre-industrial levels say scientists.",
    "The European Central Bank held interest rates steady at 4 percent for the second consecutive month.",
    "UN peacekeepers deployed to conflict zone following international ceasefire agreement.",
    "New electric vehicle battery achieves 500 mile range confirmed in independent laboratory tests.",
    "Hospital infection rates fell 22 percent after adopting new hygiene protocols according to study.",
    "The government released official data showing GDP growth of 2.1 percent in the third quarter.",
    "A peer reviewed study in The Lancet found that regular exercise reduces heart disease risk by 30 percent.",
    "The World Bank approved a 2 billion dollar loan to support infrastructure development.",
    "Researchers at Stanford University published findings on a new antibiotic resistant to superbugs.",
    "Scientists at CERN confirmed detection of a new subatomic particle after years of research.",
    "A clinical trial involving 10000 participants confirmed the drug is safe and effective.",
    "International trade agreement signed between 12 countries after 3 years of negotiations.",
    "A new report by the IPCC warns of accelerating ice sheet loss in Antarctica.",
    "Health officials confirmed the outbreak has been contained after 200 people were treated.",
    "Engineers successfully tested a new hydrogen fuel cell that doubles energy efficiency.",
    "Astronomers detected gravitational waves from a neutron star merger 130 million light years away.",
    "Pharmaceutical company announced results of phase 3 trial showing 78 percent efficacy.",
    "The transportation department released data on road fatalities showing a 15 percent decline.",
    "The WHO published updated guidelines on antibiotic use to combat resistance.",
    "Marine biologists documented a 20 percent recovery in coral reef coverage over five years.",
    "Scientists published evidence that a Mediterranean diet reduces the risk of Alzheimer disease.",
    "Government data confirms that violent crime rates declined for the fifth consecutive year.",
    "A new study in JAMA found that statins reduce the risk of a second heart attack by 35 percent.",
    "University hospital announced successful outcome in first gene therapy trial for inherited blindness.",
    "Scientists used carbon dating to confirm the artifact is approximately 3200 years old.",
    "The national statistics office released data confirming the inflation rate fell to 2.1 percent.",
    "Researchers at Oxford University identified a gene variant linked to increased longevity.",
    "The energy regulator fined three companies a combined 50 million dollars for price fixing.",
    "New satellite data confirms deforestation in the Amazon declined 30 percent this year.",
    "The supreme court upheld the environmental regulation in a unanimous ruling.",
    "The trade ministry confirmed that exports grew by 8.6 percent compared to the previous quarter.",
    "The central bank published its quarterly inflation report showing prices rising at 3.2 percent annually.",
    "A longitudinal study tracked 5000 patients over 10 years confirming the treatment reduces relapse rates.",
    "The government confirmed a budget surplus of 3.4 billion dollars for the fiscal year.",
    "Economists forecast moderate growth of 2.5 percent based on leading indicators and trade data.",
    "A government audit found that tax collection improved by 12 percent over the previous year.",
    "The census bureau reported population growth of 1.2 percent over the past year.",
    "The stock market closed 1.4 percent higher following positive economic data released by the government.",
    "The education ministry announced increased funding for public schools totaling 5 billion dollars.",
    "A new study from Johns Hopkins confirms the treatment reduces mortality by 28 percent.",
    "The environment agency published annual data showing air quality improved in 12 major cities.",
    "Scientists at NASA confirmed discovery of water ice deposits near the lunar south pole.",
    "The reserve bank raised benchmark rates citing sustained inflationary pressure in consumer prices.",
    "According to official government figures the budget deficit narrowed to 2.3 percent of GDP.",
]

FALLBACK_FAKE = [
    "NTA declares no JEE Main exam will be conducted from next year.",
    "Government cancels all board exams permanently across the country.",
    "Supreme Court bans all competitive exams starting immediately.",
    "Election Commission suspends elections indefinitely due to system failure.",
    "India removes all entrance exams for colleges starting this year.",
    "Ministry announces that degrees will be awarded without exams.",
    "Government orders closure of all schools permanently nationwide.",
    "RBI abolishes all bank loans effective immediately.",
    "New law passed to eliminate all taxes for citizens starting tomorrow.",
    "ISRO confirms moon mission failed completely after secret report leak.",
    "Government secretly removes reservation policy without public notice.",
    "All universities instructed to shut down indefinitely by central authority.",
    "India bans use of internet in educational institutions permanently.",
    "SHOCKING Government secretly puts microchips in drinking water to control the population!",
    "BREAKING Celebrities admit to running underground lizard-people cult fully exposed!",
    "You will not BELIEVE what they are hiding vaccines cause 5G activation in your body!",
    "URGENT Eat this one weird fruit to CURE cancer in 3 days doctors HATE this man!",
    "EXPOSED The moon landing was entirely filmed in a Hollywood studio whistleblower reveals!",
    "Scientists BANNED from telling you the truth about the flat Earth conspiracy cover-up!",
    "ALERT Drinking bleach kills coronavirus share this before they DELETE the post!",
    "MIRACLE cure discovered Big Pharma is suppressing it to keep you sick and dependent forever!",
    "BOMBSHELL Secret memo proves the election was rigged by reptilian globalist elites!",
    "TERRIFYING truth WiFi signals are slowly melting your brain share this warning NOW!",
    "They do NOT want you to know chemtrails are poisoning us all every single day!",
    "INSANE Man grows third arm after eating GMO corn photo proof inside share widely!",
    "EXCLUSIVE leak World leaders secretly planning global population reduction next month!",
    "WOW Raw garlic injected into veins cures diabetes instantly doctors are FURIOUS!",
    "MASSIVE cover-up Sunscreen causes skin cancer the deep state is hiding the truth!",
    "WAKE UP the government is spraying mind control chemicals from airplanes every night!",
    "UNBELIEVABLE secret documents prove that COVID was created in a lab to destroy us!",
    "They are putting cancer causing chips inside your smartphone to spy on you 24 hours!",
    "EXPOSED Bill Gates admits to planning mass depopulation through vaccines share ASAP!",
    "BOMBSHELL NASA faked all moon missions Hollywood director confesses on deathbed!",
    "MIRACLE this banned fruit destroys cancer cells overnight doctors do not want you to know!",
    "URGENT warning 5G towers are secretly transmitting signals that alter human DNA!",
    "SHOCKING truth the cure for all diseases has been suppressed by pharmaceutical companies!",
    "They are adding fluoride to water to make people stupid and easy to control wake up!",
    "BREAKING whistleblower reveals the global elite is poisoning food supply right now!",
    "INSANE proof that the earth is flat and NASA has been lying for 60 years exposed!",
    "ALERT doctors secretly know that sugar cures cancer but they suppress the truth!",
    "EXPOSED the deep state is using weather machines to cause hurricanes as punishment!",
    "WOW man cures his stage 4 cancer using only lemon juice doctors hate this secret!",
    "TERRIFYING they are replacing world leaders with clones do not believe mainstream media!",
    "SHOCKING the sun is not what you think the government has been hiding this for decades!",
    "BOMBSHELL leaked files show that vaccines contain living parasites designed to infect you!",
    "UNBELIEVABLE secret society controls all world governments through hidden banking elite!",
    "WAKE UP birds are actually government drones used to spy on civilians everywhere!",
    "BREAKING scientists who discovered the cure for aging were all mysteriously silenced!",
    "EXPOSED shadow government plans to implant all humans with microchips by next year!",
    "MIRACLE man reverses blindness by staring at the sun doctors are absolutely FURIOUS!",
    "URGENT the moon is actually a hollow alien spacecraft share this truth widely!",
    "SHOCKING they put estrogen in plastics to feminize men as part of population control!",
    "BOMBSHELL government insider reveals that chemotherapy is designed to kill not cure!",
    "ALERT this common spice destroys all viruses big pharma does not want you to know!",
    "INSANE proof that time travel exists and is being used secretly by world powers!",
    "EXPOSED Hollywood elites drink children blood to stay young source says!",
    "BREAKING the deep state released a virus to justify taking away your freedoms forever!",
    "SHOCKING truth eating raw onions every day will completely cure high blood pressure!",
    "WAKE UP they are hiding giant skeletons that prove the Bible is literally true!",
    "BOMBSHELL leaked Pentagon documents confirm aliens are living among us right now!",
    "URGENT share before deleted scientist proves the Earth is only 6000 years old!",
    "EXPOSED the Illuminati controls everything your vote does not count wake up sheeple!",
    "MIRACLE woman cures terminal cancer by refusing chemotherapy and eating only berries!",
    "SHOCKING secret memo reveals plot to microchip all children through school vaccines!",
    "BREAKING they are hiding the truth about dinosaurs they never actually existed!",
    "INSANE man achieves telekinesis after consuming this banned supplement exposed!",
    "ALERT the government is monitoring your thoughts through smart TV microphones 24 7!",
    "BOMBSHELL declassified files prove JFK was killed because he was about to expose reptilians!",
    "URGENT warning WiFi routers emit radiation that causes cancer in children share now!",
    "EXPOSED deep state plan to replace all humans with AI robots by 2030 leaked!",
    "SHOCKING the real reason they banned raw milk is because it cures all disease!",
    "WAKE UP scientists have proven meditation gives humans supernatural powers suppressed!",
    "BREAKING global elite meeting reveals plan to shut down internet and seize control!",
    "MIRACLE man regrows lost limb using secret ancient herb doctors are shocked and furious!",
]

# ══════════════════════════════════════════════════════════════
# DATASET BUILDER
# ══════════════════════════════════════════════════════════════
def build_dataset(live_headlines):
    fake_texts = list(FALLBACK_FAKE)
    if live_headlines:
        real_texts = list(live_headlines) + FALLBACK_REAL
    else:
        real_texts = list(FALLBACK_REAL)

    real_texts = list(dict.fromkeys(real_texts))
    fake_texts = list(dict.fromkeys(fake_texts))

    texts = real_texts + fake_texts
    labels = [1]*len(real_texts) + [0]*len(fake_texts)
    texts, labels = shuffle(texts, labels, random_state=42)

    real_data = [(t, l) for t, l in zip(texts, labels) if l == 1]
    fake_data = [(t, l) for t, l in zip(texts, labels) if l == 0]
    n = min(len(real_data), len(fake_data))
    balanced = real_data[:n] + fake_data[:n]
    balanced = shuffle(balanced, random_state=42)
    texts, labels = zip(*balanced)
    return list(texts), list(labels)

# ══════════════════════════════════════════════════════════════
# MODEL TRAINING
# ══════════════════════════════════════════════════════════════
def train_models(texts, labels):
    y = np.array(labels)
    vectorizer = TfidfVectorizer(
        max_features=3000, ngram_range=(1, 3),
        stop_words=None, sublinear_tf=True,
        min_df=1, lowercase=True,
    )
    X = vectorizer.fit_transform(texts)

    lr_model = LogisticRegression(
        max_iter=2000, C=5.0, solver="lbfgs",
        class_weight="balanced", random_state=42
    )
    ann_model = MLPClassifier(
        hidden_layer_sizes=(128, 64, 32), activation="relu",
        solver="adam", alpha=0.001, learning_rate="adaptive",
        max_iter=1000, random_state=42, early_stopping=False,
    )

    n_splits = max(2, min(5, min(sum(y == 0), sum(y == 1))))
    if len(texts) >= 20:
        lr_acc  = cross_val_score(lr_model,  X, y, cv=n_splits).mean()
        ann_acc = cross_val_score(ann_model, X, y, cv=n_splits).mean()
    else:
        lr_acc = ann_acc = 0.0

    lr_model.fit(X, y)
    ann_model.fit(X, y)
    return vectorizer, lr_model, ann_model, lr_acc, ann_acc

# ══════════════════════════════════════════════════════════════
# RULE ENGINE
# ══════════════════════════════════════════════════════════════
HIGH_STAKES_PATTERNS = [
    (r'\b(died|dead|killed|assassinated|murdered|passed away)\b',              "death claim"),
    (r'\b(arrested|jailed|imprisoned|sentenced|detained)\b',                   "arrest claim"),
    (r'\bcures?\b.{0,40}\b(cancer|diabetes|hiv|aids|disease|virus)\b',        "medical cure claim"),
    (r'\bcauses?\b.{0,40}\b(cancer|death|disease|autism|blindness)\b',        "health harm claim"),
    (r'\b(secret|hidden|suppressed|they don.?t want you to know)\b',           "conspiracy language"),
    (r'\b(exposed|leaked?|whistleblower|insider reveals)\b',                   "unverified leak"),
    (r'\b(microchip|5g|chemtrail|reptilian|illuminati|deep state)\b',          "conspiracy theory keyword"),
    (r'\b(share|forward).{0,25}(before|deleted|removed|banned)\b',             "viral urgency manipulation"),
    (r'\bdoctors?\s+(hate|furious|don.?t want|shocked|angry)\b',               "anti-expert framing"),
    (r'\b(miracle|magic|instant|overnight)\s+(cure|fix|solution|remedy)\b',    "miracle claim"),
    (r'\bwake up\b',                                                            "conspiracy call-to-action"),
    (r'\b(banned|suppressed|outlawed)\b.{0,30}\b(cure|truth|knowledge)\b',    "suppression claim"),
]

REPORTING_PATTERNS = [
    r'\baccording to\b', r'\breported by\b', r'\bconfirmed by\b',
    r'\bsaid in a statement\b', r'\bper cent\b', r'\bpercent\b', r'\d+%',
    r'\bpublished in\b', r'\bjournal\b', r'\btrial\b', r'\bstudy\b',
    r'\bofficial\b', r'\bauthorit', r'\bspokesperson\b', r'\bministry\b',
    r'\bdepartment\b', r'\bdata shows?\b', r'\bstatistics?\b',
    r'\bevidence\b', r'\banalysis\b', r'\bresearch\b', r'\buniversity\b',
]

def rule_based_check(text, source):
    tl = text.lower().strip()
    words = tl.split()
    wc = len(words)
    src = source.lower().strip()
    reasons = []

    is_low_cred = src in LOW_CRED_SOURCES
    has_reporter = any(re.search(p, tl) for p in REPORTING_PATTERNS)
    matched = [(label, m.group(0))
               for pat, label in HIGH_STAKES_PATTERNS
               for m in [re.search(pat, tl)] if m]
    flags = {"word_count": wc, "is_low_cred": is_low_cred,
             "has_reporting": has_reporter, "patterns": matched}

    if wc <= 8 and is_low_cred:
        reasons.append(f"R1: Very short claim ({wc} words) from low-credibility source '{source}'.")
        return "FAKE", 0.88, reasons, flags
    if wc <= 15 and is_low_cred and not has_reporter:
        reasons.append(f"R2: Brief claim ({wc} words) with no attribution from low-credibility source '{source}'.")
        return "FAKE", 0.82, reasons, flags
    if matched and is_low_cred:
        labels = ", ".join(f"'{l}'" for l, _ in matched[:3])
        reasons.append(f"R3: High-stakes pattern(s) ({labels}) from low-credibility source '{source}'.")
        return "FAKE", 0.84, reasons, flags
    if matched and not has_reporter:
        labels = ", ".join(f"'{l}'" for l, _ in matched[:3])
        reasons.append(f"R4: Unsubstantiated high-stakes claim ({labels}) with no sourcing or attribution.")
        return "FAKE", 0.76, reasons, flags
    if len(matched) >= 3:
        labels = ", ".join(f"'{l}'" for l, _ in matched[:4])
        reasons.append(f"R5: {len(matched)} fake-news patterns detected: {labels}.")
        return "FAKE", 0.82, reasons, flags
    VERY_LOW = {"whatsapp", "infowars", "naturalnews", "chainmessage", "chain message", "forwarded", "anonymous"}
    if src in VERY_LOW and wc <= 20:
        reasons.append(f"R6: Source '{source}' has very low credibility.")
        return "FAKE", 0.78, reasons, flags

    return "UNCERTAIN", 0.50, [], flags

# ══════════════════════════════════════════════════════════════
# CREDIBILITY SCORER
# ══════════════════════════════════════════════════════════════
SENSATIONAL_WORDS = [
    "shocking", "breaking", "urgent", "exposed", "bombshell", "insane",
    "massive", "terrifying", "miracle", "banned", "secret", "conspiracy",
    "exclusive", "alert", "wow", "unbelievable", "furious", "delete",
    "share", "suppressed", "proof", "leaked", "wake up", "sheeple",
    "deep state", "illuminati", "reptilian", "chemtrail", "cover-up",
]
CREDIBILITY_WORDS = [
    "study", "research", "report", "published", "according", "percent",
    "data", "scientists", "university", "journal", "confirmed", "evidence",
    "analysis", "statistics", "official", "government", "survey", "trial",
    "clinical", "peer-reviewed", "found", "measured", "recorded",
    "investigation", "spokesperson", "ministry", "authority",
    "lancet", "jama", "nature", "nejm", "who", "cdc", "nasa", "reuters",
]

def compute_credibility_score(text):
    tl = text.lower()
    words = tl.split()
    score = 50
    sens_c = sum(1 for w in SENSATIONAL_WORDS if w in tl)
    score -= min(sens_c * 5, 35)
    cred_c = sum(1 for w in CREDIBILITY_WORDS if w in tl)
    score += min(cred_c * 4, 25)
    num_c = len(re.findall(r'\b\d+\.?\d*\s*%?\b', text))
    score += min(num_c * 4, 16)
    wc = len(words)
    if wc > 25:   score += 6
    elif wc > 12: score += 3
    elif wc < 6:  score -= 10
    caps_r = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    if caps_r > 0.3:   score -= 18
    elif caps_r > 0.15: score -= 8
    score -= min(text.count("!") * 5, 15)
    return max(0, min(100, score)), sens_c, cred_c, num_c

def adjust_for_source(base_score, source):
    src_score = next(
        (v for k, v in SOURCE_RELIABILITY.items() if k.lower() == source.lower()),
        SOURCE_RELIABILITY["Unknown"]
    )
    return int(0.70 * base_score + 0.30 * src_score), src_score

# ══════════════════════════════════════════════════════════════
# EXPLAINABILITY
# ══════════════════════════════════════════════════════════════
def get_top_words(text, vectorizer, lr_model, top_n=10):
    vec = vectorizer.transform([text])
    names = np.array(vectorizer.get_feature_names_out())
    tfidf = vec.toarray()[0]
    nonzero = np.where(tfidf > 0)[0]
    if len(nonzero) == 0:
        return []
    coefs = lr_model.coef_[0]
    words = sorted(
        [{"word": names[i], "tfidf": round(float(tfidf[i]), 4),
          "lr_coef": round(float(coefs[i]), 4),
          "influence": round(float(tfidf[i] * coefs[i]), 4)} for i in nonzero],
        key=lambda x: abs(x["influence"]), reverse=True
    )
    return words[:top_n]

def check_similarity(input_text, news_list, vectorizer):
    if not news_list:
        return 0.0
    corpus = [input_text] + news_list
    vectors = vectorizer.transform(corpus)
    sims = cosine_similarity(vectors[0:1], vectors[1:]).flatten()
    return float(max(sims)) if len(sims) > 0 else 0.0

# ══════════════════════════════════════════════════════════════
# TREND PREDICTION
# ══════════════════════════════════════════════════════════════
def predict_trends(text, fake_prob):
    tl = text.lower()
    trends = {}
    if fake_prob > 0.70:
        r, rc = "Negative / Panic", int(50 + fake_prob * 40)
    elif fake_prob > 0.45:
        r, rc = "Mixed / Skeptical", 55
    else:
        r, rc = "Neutral / Positive", int(50 + (1 - fake_prob) * 35)
    trends["Public Reaction"] = (r, min(rc, 95))

    vkw = ["share", "spread", "urgent", "now", "breaking", "alert", "forward"]
    vc = sum(1 for w in vkw if w in tl)
    vconf = min(30 + vc * 12 + int(fake_prob * 30), 95)
    trends["Viral Spread Risk"] = (
        "High" if vconf > 70 else "Medium" if vconf > 45 else "Low", vconf)

    ekw = ["market", "economy", "stock", "price", "inflation", "rate", "gdp", "trade", "bank"]
    ec = sum(1 for w in ekw if w in tl)
    econf = min(60 + ec * 5, 90) if ec >= 2 else (55 if ec else 35)
    trends["Economic Impact"] = (
        "High" if econf > 65 else "Medium" if econf > 45 else "Low", econf)

    pkw = ["government", "election", "president", "parliament", "law",
           "vote", "policy", "minister", "court", "prime minister"]
    pc = sum(1 for w in pkw if w in tl)
    pconf = min(25 + pc * 10 + int(fake_prob * 20), 90)
    trends["Political Sensitivity"] = (
        "High" if pconf > 65 else "Medium" if pconf > 40 else "Low", pconf)
    return trends

# ══════════════════════════════════════════════════════════════
# GLOBAL MODEL STATE — trained once at startup
# ══════════════════════════════════════════════════════════════
print("[Satya] Initialising — fetching live headlines...")
_live_headlines, _api_name, _live_count = fetch_live_real_news()
print(f"[Satya] Building dataset from {_live_count} live + built-in samples...")
_texts, _labels = build_dataset(_live_headlines)
print("[Satya] Training models...")
_vectorizer, _lr_model, _ann_model, _lr_acc, _ann_acc = train_models(_texts, _labels)
_data_label = (f"{_api_name} ({_live_count} live + built-in)"
               if _live_count else "built-in offline dataset")
print(f"[Satya] Ready. LR={_lr_acc*100:.1f}%  ANN={_ann_acc*100:.1f}%")

# ══════════════════════════════════════════════════════════════
# FASTAPI APP
# ══════════════════════════════════════════════════════════════
app = FastAPI(
    title="Satya API",
    description="AI-powered misinformation detection (ML Ensemble + Rule Engine + Live Training)",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VerifyRequest(BaseModel):
    input: str
    source: str = "Unknown"
    language: str = "en"

class KeywordItem(BaseModel):
    word: str
    tfidf: float
    lr_coef: float
    influence: float
    direction: str

class TrendItem(BaseModel):
    level: str
    confidence: int

class MLModels(BaseModel):
    lr_label: str
    lr_real: float
    lr_fake: float
    lr_conf: float
    ann_label: str
    ann_real: float
    ann_fake: float
    ann_conf: float
    top_model: str
    models_agree: bool

class VerifyResponse(BaseModel):
    verdict: str                  # "REAL" | "FAKE"
    trust_score: int              # 0-100
    credibility_grade: str
    fake_probability: float
    real_probability: float
    decision_method: str
    rule_fired: bool
    rule_reasons: list[str]
    cross_check_similarity: float
    explanation: str
    simplified_explanation: str
    keywords: list[KeywordItem]
    trends: dict[str, TrendItem]
    ml_models: MLModels
    source_reliability: int
    source_tier: str
    data_label: str
    evidence: list[dict]

@app.get("/")
def root():
    return {
        "message": "Satya API v3.0 — ML Ensemble + Rule Engine + Live Training",
        "models": {
            "lr_accuracy": round(_lr_acc * 100, 1),
            "ann_accuracy": round(_ann_acc * 100, 1),
            "data_label": _data_label,
        }
    }

@app.post("/verify", response_model=VerifyResponse)
def verify(request: VerifyRequest):
    text = request.input.strip()
    source = request.source.strip() or "Unknown"
    if not text:
        raise HTTPException(status_code=400, detail="Input text cannot be empty.")

    vec = _vectorizer.transform([text])

    # ML predictions
    lrp  = _lr_model.predict_proba(vec)[0]
    annp = _ann_model.predict_proba(vec)[0]
    lr_fake, lr_real   = float(lrp[0]), float(lrp[1])
    ann_fake, ann_real = float(annp[0]), float(annp[1])
    lr_lbl  = "REAL" if lr_real  >= 0.5 else "FAKE"
    ann_lbl = "REAL" if ann_real >= 0.5 else "FAKE"
    ml_fake = (lr_fake + ann_fake) / 2
    ml_real = (lr_real + ann_real) / 2
    lr_conf  = float(max(lrp))
    ann_conf = float(max(annp))
    top_model = "Logistic Regression" if lr_conf >= ann_conf else "ANN (MLP)"

    # Cross-check
    related = fetch_related_news(text)
    sim = check_similarity(text, related, _vectorizer)
    if sim < 0.2:
        ml_fake = min(ml_fake + 0.25, 1.0)
    elif sim > 0.5:
        ml_real = min(ml_real + 0.25, 1.0)
    # re-normalise
    total = ml_fake + ml_real
    ml_fake /= total
    ml_real /= total

    # Rule engine
    rl, rfp, reasons, flags = rule_based_check(text, source)
    rule_fired = rl != "UNCERTAIN"

    if rule_fired:
        avg_fake = 0.80 * rfp + 0.20 * ml_fake
        avg_real = 1.0 - avg_fake
        method = "Rule Override + ML Ensemble"
    else:
        avg_fake, avg_real = ml_fake, ml_real
        method = "ML Ensemble (LR + ANN)"

    final = "REAL" if avg_real >= 0.5 else "FAKE"

    # Credibility
    base_s, sens_c, cred_c, num_c = compute_credibility_score(text)
    final_s, src_s = adjust_for_source(base_s, source)
    if rule_fired and rl == "FAKE":
        final_s = min(final_s, 35)
        base_s = min(base_s, 35)

    grade = ("A — Highly Credible"   if final_s >= 75 else
             "B — Somewhat Credible" if final_s >= 55 else
             "C — Questionable"      if final_s >= 35 else
             "D — Very Low Credibility")

    src_tier = ("Tier 1 — Highly Trusted" if src_s >= 80 else
                "Tier 2 — Moderate Trust" if src_s >= 55 else
                "Tier 3 — Low Trust"      if src_s >= 30 else
                "Tier 4 — Very Low / Social Media")

    # Keywords
    top_words_raw = get_top_words(text, _vectorizer, _lr_model)
    keywords = [KeywordItem(
        word=w["word"], tfidf=w["tfidf"], lr_coef=w["lr_coef"],
        influence=w["influence"],
        direction="REAL" if w["lr_coef"] > 0 else "FAKE"
    ) for w in top_words_raw]

    # Trends
    raw_trends = predict_trends(text, avg_fake)
    trends = {k: TrendItem(level=v[0], confidence=v[1]) for k, v in raw_trends.items()}

    # Explanations
    if final == "REAL":
        explanation = (
            f"This content appears credible. The ML ensemble (Logistic Regression + ANN) "
            f"assigns a {avg_real*100:.1f}% probability of being real news. "
            f"{'The cross-check found similar verified news articles online. ' if sim > 0.5 else ''}"
            f"The credibility score is {final_s}/100 ({grade}). "
            f"Source reliability: {src_s}/100 ({source})."
        )
        simplified = (
            "Our AI checked this against trusted news sources and it looks real. "
            "The language is clear, attributed, and matches what credible outlets report."
        )
    else:
        explanation = (
            f"This content is flagged as likely misinformation. "
            f"{'Rule engine triggered: ' + '; '.join(reasons) + '. ' if rule_fired else ''}"
            f"The ML ensemble assigns {avg_fake*100:.1f}% fake probability. "
            f"{'No similar verified news found online. ' if sim < 0.2 else ''}"
            f"Credibility score: {final_s}/100. Source reliability: {src_s}/100 ({source})."
        )
        simplified = (
            "Our AI flagged this as likely fake or misleading. "
            "It may use sensational language, lack credible sourcing, or come from an unreliable source. "
            "Please verify with trusted outlets before sharing."
        )

    # Dummy evidence with fact-check links
    evidence = [
        {
            "source": "Google Fact Check",
            "excerpt": "Search Google Fact Check Explorer for claims related to this topic.",
            "url": f"https://toolbox.google.com/factcheck/explorer/search/{text[:60].replace(' ', '%20')}",
            "credibilityRating": "high"
        },
        {
            "source": "Snopes",
            "excerpt": "Snopes is one of the oldest fact-checking websites. Search for this claim.",
            "url": f"https://www.snopes.com/search/{text[:50].replace(' ', '+')}",
            "credibilityRating": "high"
        },
        {
            "source": "Alt News (India)",
            "excerpt": "Alt News fact-checks viral claims in India. Search for related content.",
            "url": f"https://www.altnews.in/?s={text[:50].replace(' ', '+')}",
            "credibilityRating": "high"
        }
    ]

    return VerifyResponse(
        verdict=final,
        trust_score=final_s,
        credibility_grade=grade,
        fake_probability=round(avg_fake, 4),
        real_probability=round(avg_real, 4),
        decision_method=method,
        rule_fired=rule_fired,
        rule_reasons=reasons,
        cross_check_similarity=round(sim, 4),
        explanation=explanation,
        simplified_explanation=simplified,
        keywords=keywords,
        trends=trends,
        ml_models=MLModels(
            lr_label=lr_lbl, lr_real=round(lr_real, 4), lr_fake=round(lr_fake, 4), lr_conf=round(lr_conf, 4),
            ann_label=ann_lbl, ann_real=round(ann_real, 4), ann_fake=round(ann_fake, 4), ann_conf=round(ann_conf, 4),
            top_model=top_model, models_agree=(lr_lbl == ann_lbl)
        ),
        source_reliability=src_s,
        source_tier=src_tier,
        data_label=_data_label,
        evidence=evidence,
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
