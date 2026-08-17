import time
import sys
from playwright.sync_api import sync_playwright, expect

def run_tests():
    console_errors = []

    def handle_console(msg):
        if msg.type == "error":
            console_errors.append(msg.text)

    with sync_playwright() as p:
        # Run headless so it runs smoothly in CI/background
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.on("console", handle_console)

        base_url = "https://intelligence-sys-for-talent.onrender.com"

        try:
            print(f"Starting UI Automation Tests against {base_url}...\n")
            
            # --- Test 1: Login ---
            print("Executing Test 1: Login...")
            page.goto(f"{base_url}/login", timeout=60000)
            time.sleep(2)
            
            page.fill("input[placeholder='you@example.com']", "admin@example.com")
            page.fill("input[placeholder='••••••••']", "admin")
            time.sleep(1)
            
            page.click("text=Sign In")
            time.sleep(1)
            
            try:
                page.wait_for_url("**/dashboard**", timeout=15000)
                print("Test 1: PASS")
            except Exception:
                print("Test 1: FAIL (Did not land on dashboard)")

            # --- Test 2: Navigate to Directory ---
            print("\nExecuting Test 2: Navigate to Directory...")
            page.click("text=Candidates")
            time.sleep(2)
            
            try:
                page.wait_for_selector(".candidate-card", timeout=10000)
                cards_count = page.locator(".candidate-card").count()
                if cards_count >= 1:
                    print("Test 2: PASS")
                else:
                    print("Test 2: FAIL (No candidate cards found)")
            except Exception:
                print("Test 2: FAIL (Timeout waiting for .candidate-card)")

            # --- Test 3: Open Dossier ---
            print("\nExecuting Test 3: Open Dossier...")
            try:
                page.locator(".candidate-card").first.click()
                time.sleep(2)
                
                skills_section = page.locator("text=Skills").locator("xpath=..")
                
                a_tags = skills_section.locator("a")
                if a_tags.count() > 0:
                    href = a_tags.first.get_attribute("href")
                    if href and ("github.com" in href or "arxiv.org" in href):
                        print("Test 3: PASS (CITATIONS VALID)")
                    else:
                        print(f"Test 3: FAIL (CITATIONS FAIL - Missing valid origin in {href})")
                else:
                    print("Test 3: FAIL (CITATIONS FAIL - No citation links found in Skills section)")
            except Exception as e:
                print("Test 3: FAIL (Could not parse skills section)")

            # --- Test 4: Rubrics ---
            print("\nExecuting Test 4: Rubrics...")
            try:
                page.click("text=Rubrics")
                time.sleep(2)
                
                page.click("text=Create")
                time.sleep(2)
                
                page.fill("input[name='name'], input[placeholder*='Name']", "QA Automation Rubric")
                page.click("text=Add Criterion")
                time.sleep(1)
                
                page.fill("input[name='criteria.0.name']", "Code Quality")
                page.fill("input[name='criteria.0.description']", "Ensure high test coverage")
                page.click("text=Save")
                time.sleep(2)
                
                try:
                    page.wait_for_selector("[role='alert'], .toast", timeout=5000)
                    print("Test 4: PASS")
                except Exception:
                    print("Test 4: FAIL (Success toast not found)")
            except Exception as e:
                print("Test 4: FAIL (Error interacting with Rubrics)")

            # --- Test 5: Console Errors ---
            print("\nExecuting Test 5: Console Errors...")
            if len(console_errors) > 0:
                print("Test 5: FAIL (CONSOLE ERRORS DETECTED)")
                for err in console_errors:
                    print(f"  [ERROR] {err}")
            else:
                print("Test 5: PASS (CONSOLE CLEAN)")

        except Exception as e:
            print(f"\n[!] An unexpected error occurred: {str(e)}")
        finally:
            print("\nTests complete.")
            browser.close()

if __name__ == "__main__":
    run_tests()
