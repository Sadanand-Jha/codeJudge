"""
Codeforces Solution Scraper for Contest 2227

Scrapes accepted submissions from Codeforces contest 2227
and saves them to the submissions table in the database.

Supports round-robin scraping with multiple accounts, IP rotation, 
stealth plugins, and human-like interactions.

Usage:
    python3 src/scraper/solutionScraper.py

Requirements:
    pip install requests beautifulsoup4 psycopg2-binary python-dotenv playwright playwright-stealth
    python3 -m playwright install chromium
"""

import requests
import psycopg2
import os
import time
import logging
import random
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
# Using the NEW v2.0+ import syntax for playwright-stealth
from playwright_stealth import Stealth

# Setup basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', '.env')
env_path = os.path.abspath(env_path)
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
    env_path = os.path.abspath(env_path)
load_dotenv(env_path)

CONTEST_ID = 2227
FAILED_SUBMISSIONS_FILE = "failed_submissions.txt"

# Round-robin account configuration
NUM_ACCOUNTS = 1
CURRENT_ACCOUNT_INDEX = 0

# ==========================================
# IP ROTATION / PROXY CONFIGURATION
# ==========================================
# Add your rotating proxies here. If left empty, it will use your local IP.
# Format: "http://username:password@ip:port" or "http://ip:port"
PROXIES = [
    # "http://user1:pass1@proxy1.example.com:8080",
    # "http://user2:pass2@proxy2.example.com:8080"
]

def get_db_config():
    required_vars = ["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD"]
    missing = [v for v in required_vars if not os.environ.get(v)]
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
    return {
        "host": os.environ["PGHOST"],
        "port": os.environ["PGPORT"],
        "dbname": os.environ["PGDATABASE"],
        "user": os.environ["PGUSER"],
        "password": os.environ["PGPASSWORD"],
    }

def init_db():
    conn = psycopg2.connect(**get_db_config())
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS submissions (
            id          BIGINT PRIMARY KEY,
            problem_id  TEXT,
            contest_id  INTEGER,
            problem_index TEXT,
            language    TEXT,
            verdict     TEXT,
            source_code TEXT,
            is_downloaded INTEGER DEFAULT 0,
            created_at  TIMESTAMP DEFAULT NOW()
        )
    ''')
    conn.commit()
    logging.info("Database initialized.")
    return conn

def fetch_contest_submissions(page_number, conn):
    url = f"https://codeforces.com/api/contest.status?contestId={CONTEST_ID}&from={(page_number-1)*100+1}&count=100"
    response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    if response.status_code != 200:
        return []
    data = response.json()
    if data['status'] != 'OK':
        return []
    return data['result']

def get_account_cookies(account_index):
    return {
        "JSESSIONID": os.environ.get(f"CF_JSESSIONID_{account_index}", os.environ.get("CF_JSESSIONID", "")),
        "39ce7": os.environ.get(f"CF_39CE7_{account_index}", os.environ.get("CF_39CE7", "")),
        "cf_clearance": os.environ.get(f"CF_CLEARANCE_{account_index}", os.environ.get("CF_CLEARANCE", "")),
    }

def simulate_human_behavior(page):
    """Simulates realistic mouse movements and scrolling."""
    logging.info("Simulating human interactions (mouse movement & scrolling)...")
    
    # 1. Random Mouse Movements
    for _ in range(random.randint(3, 6)):
        x = random.randint(100, 800)
        y = random.randint(100, 600)
        # Smoothly move mouse in random steps
        page.mouse.move(x, y, steps=random.randint(5, 15))
        time.sleep(random.uniform(0.1, 0.4))
        
    # 2. Random Scrolling
    for _ in range(random.randint(1, 3)):
        scroll_amount = random.randint(200, 600)
        # Scroll down
        page.mouse.wheel(0, scroll_amount)
        time.sleep(random.uniform(0.5, 1.2))
        
    # Scroll back up slightly
    page.mouse.wheel(0, -random.randint(100, 300))
    time.sleep(random.uniform(0.2, 0.5))

def fetch_source_codes(conn):
    global CURRENT_ACCOUNT_INDEX
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, problem_id FROM submissions WHERE (is_downloaded = 0 OR is_downloaded = -1) AND verdict = %s', ('OK',))
    pending = cursor.fetchall()
    logging.info(f"Pending downloads: {len(pending)}")
    
    if not pending:
        return
    
    failed_ids = []
    browser = None
    
    try:
        playwright = sync_playwright().start()
        # Launching browser
        browser = playwright.chromium.launch(headless=False, args=['--no-sandbox', '--disable-blink-features=AutomationControlled'])
        
        for row in pending:
            sub_id = row[0]
            problem_id = row[1]
            
            if problem_id.lower().endswith('a') or problem_id.lower().endswith('b'):
                continue
            
            url = f"https://codeforces.com/contest/{CONTEST_ID}/submission/{sub_id}"
            success = False
            account_attempts = 0
            
            while not success and account_attempts < NUM_ACCOUNTS:
                account_idx = (CURRENT_ACCOUNT_INDEX % NUM_ACCOUNTS) + 1
                
                # IP Rotation Selection
                proxy_config = None
                if PROXIES:
                    proxy_url = PROXIES[CURRENT_ACCOUNT_INDEX % len(PROXIES)]
                    proxy_config = {"server": proxy_url}
                
                # Create a completely isolated context for this attempt
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                    proxy=proxy_config,
                    viewport={"width": random.randint(1200, 1920), "height": random.randint(800, 1080)}
                )
                
                # APPLY STEALTH MODE
                Stealth().apply_stealth_sync(context)
                # time.sleep()
                # logging.info("my sleeping")
                
                try:
                    page = context.new_page()
                    
                    logging.info(f"Fetching {sub_id} - Account {account_idx} (Proxy: {'Enabled' if proxy_config else 'None'})")
                    
                    cookies = get_account_cookies(account_idx)
                    cookie_list = []
                    if cookies["JSESSIONID"]:
                        cookie_list.append({"name": "JSESSIONID", "value": cookies["JSESSIONID"], "domain": ".codeforces.com", "path": "/"})
                    if cookies["39ce7"]:
                        cookie_list.append({"name": "39ce7", "value": cookies["39ce7"], "domain": ".codeforces.com", "path": "/"})
                    if cookies["cf_clearance"]:
                        cookie_list.append({"name": "cf_clearance", "value": cookies["cf_clearance"], "domain": ".codeforces.com", "path": "/"})
                    
                    if cookie_list:
                        context.add_cookies(cookie_list)
                    
                    # Wait for DOM to load initially, not full load, to prevent hanging on CF redirects
                    page.goto(url, wait_until="domcontentloaded", timeout=60000)
                    time.sleep(2) # Brief pause to let CF initiate if needed
                    
                    # CRASH FIX: Wrap page.content() in a try/except to survive Cloudflare redirects
                    try:
                        page_content = page.content()
                        if "Codeforces is currently under heavy load" in page_content:
                            logging.warning(f"Rate limit hit. Rotating...")
                            CURRENT_ACCOUNT_INDEX += 1
                            account_attempts += 1
                            context.close()
                            time.sleep(5)
                            continue
                    except Exception as e:
                        # If we get here, it means the page is actively navigating/refreshing.
                        # This is completely normal during a Cloudflare challenge. We just ignore it and wait.
                        logging.info("Cloudflare redirect detected. Waiting for resolution...")
                    
                    try:
                        # Wait patiently for the challenge to finish and the code block to appear
                        page.wait_for_selector('#program-source-text', state='visible', timeout=45000)
                        
                        # SIMULATE HUMAN BEHAVIOR BEFORE EXTRACTION
                        simulate_human_behavior(page)
                        
                        source_code = page.evaluate('''() => {
                            let block = document.getElementById('program-source-text');
                            if (!block) return null;
                            let listItems = block.querySelectorAll('ol.linenums li');
                            if (listItems.length > 0) {
                                let lines = [];
                                listItems.forEach(li => lines.push(li.innerText));
                                return lines.join('\\n');
                            }
                            return block.innerText;
                        }''')
                        
                        if source_code and len(source_code.strip()) > 0:
                            # Check if source code length is 3 or less - DON'T save to DB
                            if len(source_code.strip()) <= 3:
                                logging.info(f"Short source code ({len(source_code)} chars) - NOT saved to DB.")
                            else:
                                cursor.execute(
                                    'UPDATE submissions SET source_code = %s, is_downloaded = 1 WHERE id = %s',
                                    (source_code.strip(), sub_id)
                                )
                                conn.commit()
                                logging.info(f"Success! Downloaded {len(source_code)} chars.")
                            
                            context.close()
                            success = True
                            CURRENT_ACCOUNT_INDEX += 1
                        else:
                            logging.warning("Block found but empty.")
                            context.close()
                            if sub_id not in failed_ids: failed_ids.append(sub_id)
                            CURRENT_ACCOUNT_INDEX += 1
                            account_attempts += 1
                            break
                            
                    except Exception:
                        logging.warning("Timeout waiting for code block (Cloudflare likely blocked it). Rotating...")
                        CURRENT_ACCOUNT_INDEX += 1
                        account_attempts += 1
                        context.close()
                        continue
                    
                except Exception as e:
                    logging.error(f"Error fetching {sub_id}: {e}")
                    CURRENT_ACCOUNT_INDEX += 1
                    account_attempts += 1
                    if context: context.close()
                    time.sleep(10)
            
            if not success:
                if sub_id not in failed_ids: failed_ids.append(sub_id)
                time.sleep(5)
            
            time.sleep(random.uniform(4.0, 6.0)) # Random sleep delay between pages
            
    except Exception as e:
        logging.error(f"Playwright error: {e}")
    finally:
        if browser: browser.close()
        if failed_ids:
            with open(FAILED_SUBMISSIONS_FILE, "w") as f:
                for sid in failed_ids: f.write(f"{sid}\n")

def show_summary(conn):
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM submissions')
    total = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM submissions WHERE verdict = 'OK'")
    accepted = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM submissions WHERE is_downloaded = 1')
    downloaded = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM submissions WHERE is_downloaded = -1')
    failed = cursor.fetchone()[0]
    cursor.execute('SELECT problem_id, COUNT(*) as cnt FROM submissions GROUP BY problem_id ORDER BY problem_id')
    per_problem = cursor.fetchall()
    
    print("\n" + "=" * 60)
    print("📊 SUBMISSIONS SUMMARY")
    print("=" * 60)
    print(f"  Total submissions:    {total}")
    print(f"  Accepted (OK):        {accepted}")
    print(f"  Source downloaded:    {downloaded}")
    print(f"  Failed to download:   {failed}")
    print("-" * 60)
    print("  Per problem:")
    for pid, count in per_problem:
        print(f"    {pid}: {count} accepted submissions")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    db_connection = init_db()
    cursor = db_connection.cursor()
    
    total_inserted = 0
    for page_num in range(3, 4):
        logging.info(f"\n=== Fetching page {page_num} ===")
        submissions = fetch_contest_submissions(page_num, db_connection)
        
        if not submissions: continue
            
        accepted = [s for s in submissions if s.get('verdict') == 'OK']
        for sub in accepted:
            problem_index = sub['problem']['index']
            problem_id = f"{CONTEST_ID}{problem_index}"
            
            cursor.execute('''
                INSERT INTO submissions (id, problem_id, contest_id, problem_index, language, verdict, source_code, is_downloaded)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            ''', (
                sub['id'], problem_id, CONTEST_ID, problem_index,
                sub.get('programmingLanguage', 'Unknown'), 'OK', None, 0
            ))
            if cursor.rowcount > 0: total_inserted += 1
        db_connection.commit()
    
    logging.info(f"\nInserted {total_inserted} new submissions total")
    show_summary(db_connection)
    
    print("\n📡 Run the source code downloader? [y/N]: ", end="")
    choice = input().strip().lower()
    
    if choice == 'y':
        fetch_source_codes(db_connection)
        show_summary(db_connection)
    
    db_connection.close()
    logging.info("Done!")