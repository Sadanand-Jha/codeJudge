"""
Codeforces Solution Scraper for Contest 2227

Scrapes accepted submissions from Codeforces contest 2227
and saves them to the submissions table in the database.

Supports round-robin scraping with multiple accounts.

Usage:
    python3 src/scraper/solutionScraper.py

Requirements:
    pip install requests beautifulsoup4 psycopg2-binary python-dotenv playwright
    python3 -m playwright install chromium
"""

import requests
from bs4 import BeautifulSoup
import psycopg2
import os
import time
import logging
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

# Setup basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load .env file from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', '.env')
env_path = os.path.abspath(env_path)
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
    env_path = os.path.abspath(env_path)
load_dotenv(env_path)

CONTEST_ID = 2227

# Track failed submissions for retry
FAILED_SUBMISSIONS_FILE = "failed_submissions.txt"

# Round-robin account configuration
NUM_ACCOUNTS = 4
CURRENT_ACCOUNT_INDEX = 0


def get_db_config():
    """Build database configuration from environment variables."""
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
    """Creates the submissions table if it doesn't exist."""
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
    logging.info("Database initialized. Table 'submissions' is ready.")
    return conn


def fetch_contest_submissions(page_number, conn):
    """Fetch submissions from a specific page of the Codeforces API."""
    url = f"https://codeforces.com/api/contest.status?contestId={CONTEST_ID}&from={(page_number-1)*100+1}&count=100"
    
    response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    if response.status_code != 200:
        logging.error(f"API Failed: {response.status_code}")
        return []
    
    data = response.json()
    if data['status'] != 'OK':
        logging.error(f"API returned error: {data.get('comment')}")
        return []
    
    return data['result']


def get_account_cookies(account_index):
    """Get cookies for a specific account from environment variables."""
    return {
        "JSESSIONID": os.environ.get(f"CF_JSESSIONID_{account_index}", os.environ.get("CF_JSESSIONID", "")),
        "39ce7": os.environ.get(f"CF_39CE7_{account_index}", os.environ.get("CF_39CE7", "")),
        "cf_clearance": os.environ.get(f"CF_CLEARANCE_{account_index}", os.environ.get("CF_CLEARANCE", "")),
    }


def has_valid_cookies(account_index):
    """Check if an account has valid cookies configured."""
    cookies = get_account_cookies(account_index)
    return bool(cookies["JSESSIONID"] or cookies["cf_clearance"])


def fetch_source_codes(conn):
    """
    Downloads the actual source code for submissions that don't have it yet.
    Uses Playwright with round-robin account rotation.
    """
    global CURRENT_ACCOUNT_INDEX
    
    cursor = conn.cursor()
    
    # Get submissions that need source code download
    cursor.execute('SELECT id, problem_id FROM submissions WHERE (is_downloaded = 0 OR is_downloaded = -1) AND verdict = %s', ('OK',))
    pending = cursor.fetchall()
    
    logging.info(f"Pending source code downloads: {len(pending)}")
    
    if not pending:
        logging.info("No pending downloads. Exiting.")
        return
    
    failed_ids = []
    
    # Launch Playwright with a single browser instance
    browser = None
    try:
        playwright = sync_playwright().start()
        browser = playwright.chromium.launch(headless=True, args=['--no-sandbox'])
        
        # Create context with standard User-Agent
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        for row in pending:
            sub_id = row[0]
            problem_id = row[1]
            url = f"https://codeforces.com/contest/{CONTEST_ID}/submission/{sub_id}"
            
            success = False
            account_attempts = 0
            max_account_attempts = NUM_ACCOUNTS
            
            while not success and account_attempts < max_account_attempts:
                # Check if current account has valid cookies or proceed without cookies
                account_idx = (CURRENT_ACCOUNT_INDEX % NUM_ACCOUNTS) + 1
                
                try:
                    page = context.new_page()
                    logging.info(f"Fetching submission {sub_id} ({problem_id}) - Account {account_idx} - URL: {url}")
                    
                    # Inject cookies for this account if available
                    if has_valid_cookies(account_idx):
                        cookies = get_account_cookies(account_idx)
                        cookie_list = []
                        if cookies["JSESSIONID"]:
                            cookie_list.append({"name": "JSESSIONID", "value": cookies["JSESSIONID"], "domain": ".codeforces.com", "path": "/"})
                        if cookies["39ce7"]:
                            cookie_list.append({"name": "39ce7", "value": cookies["39ce7"], "domain": ".codeforces.com", "path": "/"})
                        if cookies["cf_clearance"]:
                            cookie_list.append({"name": "cf_clearance", "value": cookies["cf_clearance"], "domain": ".codeforces.com", "path": "/"})
                        context.add_cookies(cookie_list)
                    
                    page.goto(url, wait_until="domcontentloaded", timeout=60000)
                    
                    page_title = page.title()
                    logging.info(f"Page title: {page_title}")
                    
                    page_content = page.content()
                    cloudflare_detected = "Please wait" in page_content or "browser is being checked" in page_content
                    
                    if cloudflare_detected:
                        logging.warning(f"Cloudflare challenge detected for {sub_id}. Rotating to next account...")
                        CURRENT_ACCOUNT_INDEX += 1
                        account_attempts += 1
                        page.close()
                        continue
                    
                    try:
                        page.wait_for_selector('pre#program-source-text', timeout=30000)
                        code_block = page.query_selector('pre#program-source-text')
                        
                        if code_block:
                            source_code = code_block.inner_text()
                            cursor.execute(
                                'UPDATE submissions SET source_code = %s, is_downloaded = 1 WHERE id = %s',
                                (source_code, sub_id)
                            )
                            conn.commit()
                            logging.info(f"Downloaded source for {sub_id} ({problem_id}) - {len(source_code)} chars")
                            success = True
                        else:
                            logging.warning(f"No code block found for submission {sub_id}")
                            if sub_id not in failed_ids:
                                failed_ids.append(sub_id)
                            break
                    except Exception as e:
                        logging.warning(f"Timeout for {sub_id}: {e}")
                        page.screenshot(path="debug_codeforces.png")
                        logging.info("Saved debug screenshot (debug_codeforces.png)")
                        CURRENT_ACCOUNT_INDEX += 1
                        account_attempts += 1
                        page.close()
                        continue
                    
                    page.close()
                    
                except Exception as e:
                    logging.error(f"Error fetching {sub_id}: {e}")
                    CURRENT_ACCOUNT_INDEX += 1
                    account_attempts += 1
                    time.sleep(30)
            
            if not success:
                logging.error(f"Failed after trying all accounts for {sub_id}")
                if sub_id not in failed_ids:
                    failed_ids.append(sub_id)
                # Wait 20 seconds after all 4 accounts failed before next submission
                logging.info("Waiting 20 seconds after all accounts exhausted...")
                time.sleep(20)
            
            time.sleep(1.5)
            
    except Exception as e:
        logging.error(f"Playwright error: {e}")
    finally:
        if browser:
            browser.close()
    
    if failed_ids:
        with open(FAILED_SUBMISSIONS_FILE, "w") as f:
            for sid in failed_ids:
                f.write(f"{sid}\n")
        logging.info(f"Saved {len(failed_ids)} failed submission IDs to {FAILED_SUBMISSIONS_FILE}")


def show_summary(conn):
    """Show a summary of what's in the submissions table."""
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
    
    # Fetch from pages 1-2 (200 submissions total)
    total_inserted = 0
    for page_num in range(1, 3):
        logging.info(f"\n=== Fetching page {page_num} ===")
        submissions = fetch_contest_submissions(page_num, db_connection)
        
        if not submissions:
            continue
            
        accepted = [s for s in submissions if s.get('verdict') == 'OK']
        logging.info(f"Accepted submissions on page {page_num}: {len(accepted)}")
        
        for sub in accepted:
            problem_index = sub['problem']['index']
            problem_id = f"{CONTEST_ID}{problem_index}"
            
            cursor.execute('''
                INSERT INTO submissions (id, problem_id, contest_id, problem_index, language, verdict, source_code, is_downloaded)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            ''', (
                sub['id'],
                problem_id,
                CONTEST_ID,
                problem_index,
                sub.get('programmingLanguage', 'Unknown'),
                'OK',
                None,
                0
            ))
            
            if cursor.rowcount > 0:
                total_inserted += 1
        
        db_connection.commit()
    
    logging.info(f"\nInserted {total_inserted} new submissions total")
    show_summary(db_connection)
    
    print("\n📡 Run the source code downloader? [y/N]: ", end="")
    choice = input().strip().lower()
    
    if choice == 'y':
        fetch_source_codes(db_connection)
        show_summary(db_connection)
    else:
        print("⏸️  Skipping source code download.")
    
    db_connection.close()
    logging.info("Done!")