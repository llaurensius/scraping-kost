import os
import glob
import json
import base64
import re
from pathlib import Path

def inspect_har_files(har_dir="har"):
    har_files = sorted(glob.glob(os.path.join(har_dir, "mamikos*.har")))
    if not har_files:
        print(f"Tidak ada file .har ditemukan di folder: {har_dir}")
        return {}

    results = {
        "headers": {},
        "cookies": {},
        "api_keys": set(),
        "xsrf_tokens": set(),
        "user_agents": set(),
        "git_times": set(),
        "sendbird": {},
        "aes_cipher": {
            "key": "39c852d0d0bc42ef83f7d3d708f42368",
            "iv": "5df5a10ebb035097"
        },
        "endpoints": {
            "search_list": "https://mamikos.com/garuda/stories/list?v=2&with_thematic_badge=true",
            "user_check": "https://mamikos.com/web_api/v3/user/name-check",
            "tracker_active": "https://mamikos.com/web_api/v3/tracker-session/active",
            "chat_pretext": "https://mamikos.com/garuda/chat-pretext",
            "chat_reply": "https://mamikos.com/garuda/stories/{id}/chat/reply",
            "room_page": "https://mamikos.com/room/{slug}"
        }
    }

    for filepath in har_files:
        filename = os.path.basename(filepath)
        print(f"[*] Menganalisis file: {filename}...")
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                har_data = json.load(f)
        except Exception as e:
            print(f"[!] Gagal membaca {filename}: {e}")
            continue

        entries = har_data.get("log", {}).get("entries", [])
        print(f"    Total HTTP entries: {len(entries)}")

        for entry in entries:
            req = entry.get("request", {})
            url = req.get("url", "")
            if "mamikos.com" not in url and "sendbird.com" not in url:
                continue

            # Ekstraksi header
            for h in req.get("headers", []):
                name = h.get("name", "").lower()
                val = h.get("value", "")
                if name == "x-api-key" and val:
                    results["api_keys"].add(val)
                elif name == "x-xsrf-token" and val:
                    results["xsrf_tokens"].add(val)
                elif name == "user-agent" and val:
                    results["user_agents"].add(val)
                elif name == "x-git-time" and val:
                    results["git_times"].add(val)
                elif name == "session-key" and val:
                    results["sendbird"]["session_key"] = val
                elif name == "app-id" and val:
                    results["sendbird"]["app_id"] = val

            # Ekstraksi cookies
            for c in req.get("cookies", []):
                c_name = c.get("name")
                c_val = c.get("value")
                if c_name and c_val:
                    results["cookies"][c_name] = c_val

            # Cari AES keys di response bundle JS jika ada
            resp = entry.get("response", {})
            resp_text = resp.get("content", {}).get("text", "")
            if resp_text and "aes" in url:
                n_match = re.search(r'var\s+n\s*=\s*`([A-Za-z0-9+/=]+)`', resp_text)
                r_match = re.search(r'var\s+r\s*=\s*`([A-Za-z0-9+/=]+)`', resp_text)
                if n_match and r_match:
                    try:
                        k_str = base64.b64decode(n_match.group(1)).decode("utf-8")
                        iv_str = base64.b64decode(r_match.group(1)).decode("utf-8")
                        results["aes_cipher"]["key"] = k_str
                        results["aes_cipher"]["iv"] = iv_str
                    except Exception:
                        pass

    # Konversi set ke list
    results["api_keys"] = sorted(list(results["api_keys"]))
    results["xsrf_tokens"] = sorted(list(results["xsrf_tokens"]))
    results["user_agents"] = sorted(list(results["user_agents"]))
    results["git_times"] = sorted(list(results["git_times"]))

    return results

if __name__ == "__main__":
    summary = inspect_har_files()
    print("\n" + "=" * 60)
    print("HASIL ANALISIS HAR MAMIKOS:")
    print(f"API Keys Ditemukan      : {len(summary['api_keys'])}")
    for k in summary['api_keys']:
        print(f"  - {k}")
    print(f"XSRF Tokens Ditemukan   : {len(summary['xsrf_tokens'])}")
    print(f"User Agents Ditemukan   : {len(summary['user_agents'])}")
    for ua in summary['user_agents']:
        print(f"  - {ua}")
    print(f"AES Key & IV            : Key={summary['aes_cipher']['key']}, IV={summary['aes_cipher']['iv']}")
    print(f"SendBird Credentials   : {summary['sendbird']}")
    print("=" * 60)
    
    # Simpan ke config
    out_config = Path("backend/config/session_config.json")
    out_config.parent.mkdir(parents=True, exist_ok=True)
    with open(out_config, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"[*] Konfigurasi session disimpan ke: {out_config}")
