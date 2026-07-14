"""Shared tester-system helpers (logs, checklists, payroll sessions)."""
import json
import os
import re
from collections import defaultdict
from datetime import datetime, timedelta
from io import StringIO
import csv

TESTER_LOG_DIR = '/root/bot'
STATUS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'tester_check_status.json')

TIMESTAMP_FORMATS = [
    '%Y-%m-%d %H:%M:%S,%f',
    '%Y-%m-%d %H:%M:%S',
    '%m/%d/%Y, %I:%M:%S %p',
]


def parse_log_timestamp(ts_str):
    for fmt in TIMESTAMP_FORMATS:
        try:
            return datetime.strptime(ts_str.strip(), fmt)
        except ValueError:
            continue
    return None


def tester_log_paths(log_type, base_dir):
    paths, seen = [], set()
    for directory in (TESTER_LOG_DIR, base_dir):
        path = os.path.join(directory, f'{log_type}.log')
        if os.path.exists(path) and path not in seen:
            paths.append(path)
            seen.add(path)
    return paths


def classify_log_content(content):
    c = (content or '').upper()
    if c.startswith('IN -') or c.startswith('OUT -') or ' CLOCK ' in c:
        return 'clock'
    if c.startswith('CHECK_NOTE'):
        return 'check_note'
    if c.startswith('NOTE -') or c.startswith('STATUS -') or c.startswith('NOTIFY -'):
        return 'manual'
    if 'EXECUTED' in c or c.startswith('INFO - TESTER') or c.startswith('INFO -'):
        return 'bot'
    return 'other'


def parse_tester_log_line(line, log_type):
    content = line.strip()
    if not content:
        return None
    timestamp = None
    if ' - ' in line:
        parts = line.split(' - ', 1)
        timestamp = parse_log_timestamp(parts[0].strip())
        content = parts[1].strip()
    if not timestamp:
        timestamp = datetime.min
    return {
        'timestamp': timestamp.isoformat(),
        'log_file': f'{log_type}.log',
        'content': content,
        'log_type': classify_log_content(content),
        '_sort': timestamp,
        '_raw': line.strip(),
    }


def load_all_logs(log_type, base_dir, search='', log_date=None, log_filter=None):
    logs, seen = [], set()
    for log_file in tester_log_paths(log_type, base_dir):
        with open(log_file, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                if search and search not in line.lower():
                    continue
                entry = parse_tester_log_line(line, log_type)
                if not entry or entry['_raw'] in seen:
                    continue
                if log_date:
                    try:
                        if entry['_sort'].date() != datetime.strptime(log_date, '%Y-%m-%d').date():
                            continue
                    except ValueError:
                        pass
                if log_filter and log_filter != 'all' and entry.get('log_type') != log_filter:
                    continue
                seen.add(entry['_raw'])
                logs.append(entry)
    logs.sort(key=lambda x: x['_sort'], reverse=True)
    return logs


def get_all_checklists():
    commands = [
        '/COM', '/MT', '/TOKEN', '/TOPHOLDERS', '/FUTURET3CH', '/CA', '/TG', '/WHITEPAPER', '/WEBSITE', '/X', '/UPDATES', '/HELP', '/DEV',
        '/CHAT (INNOBOT)', '/BALANCE', '/PROFILE', '/SETWALLET', '/REWARDS', '/MC', '/MESSAGECOUNTS', '/POLL', '/REFER', '/FEEDBACK', '/BUGREPORT',
        '/PET', '/PETMARKET', '/GENGINE', '/GAMES', '/SILK', '/NWC', '/TAP', '/PACMAN', '/TETRISMOB', '/RACER', '/TETRIS', '/FRUITNINJA', '/DASH',
        '/SOCCER', '/PUCK', '/CHICKEN', '/CLUBPOOL',
        '/myimages', '/Tally', '/Twitter', '/checkin', '/checkins'
    ]
    game_tests = [
        '/soccer', '/puck', '/chicken', '/clubpool', '/tap', '/pacman', '/tetrismob',
        '/racer', '/tetris', '/fruitninja', '/dash', '/games'
    ]
    hub_p2e = [
        'P2E HUB PAGE', 'METAVERSE INFO BANNER', 'MT STATS ON /COM', 'PLAY 2 EARN SUB-PAGE',
        '/pet customize', '/pet video', '/pet evolution', 'PET CREATIVE MENU'
    ]
    admin_commands = [
        '/GAD', '/PEAKSTATS', '/REFERRALREPORT', '/VIEWWALLET', '/VOICEALERT USER', '/VOICEALERT GROUP', '/TOGGLERESTRICTIONS',
        '/UPDATEPOINTS', '/ADDFILTER', '/REMOVEFILTER', '/LISTFILTERS', '/USAGE', '/TOGGLE_CHAT_OFF', '/RESTRICT',
        '/UNRESTRICT', '/RESTRICTEDREPORT', '/VIEWMESSAGES'
    ]
    gad_features = [
        'ACTIVE USERS', 'ACTIVITY', 'BOTS', 'DISTRIBUTION', 'FEEDBACK', 'HOURLY PEAKS', 'INACTIVE', 'JOINS', 'MONTHLY',
        'PROFILE BACK TO GAD BUTTON ON PROFILE LOOKUP', 'PROFILE LOOKUP', 'REWARDS', 'SPAM DETECTION', 'TOKEN HOLDERS',
        'TOP CONTRIBUTERS', 'TOTALS', 'TRENDS', 'VERIFIED', 'WALLETS'
    ]
    pet_commands = [
        '/pet adopt', '/pet battle', '/pet breed', '/pet breedname', '/pet buy', '/pet feed',
        '/pet guildjoin', '/pet play', '/pet quest', '/pet release', '/pet status', '/pet trade',
        '/pet train', '/pet use', '/pet leagueadd',
        '/pet customize', '/pet video', '/pet evolution', '/pet shop', '/pet inventory',
        '/pet guildcreate', '/pet guildleave', '/pet guildlist', '/pet guildmanage', '/pet guildinfo',
        '/pet leaguecreate', '/pet leaguejoin', '/pet leagueleave', '/pet leaguelist', '/pet leagueinfo',
        '/pet leaderboard',
        'BACK BUTTON', 'PROFILE', 'CREATIVE MENU', 'CUSTOMIZE PORTRAIT', 'CREATE VIDEO',
        'GUILD CREATE', 'GUILD INFO', 'GUILD LEAVE', 'GUILD LIST', 'GUILD MANAGE',
        'LEADERBOARD', 'LEADERBOARD - DISPLAY FULL LIST',
        'LEAGUE - CAN YOU VIEW EACH LEAGUE?', 'LEAGUE CREATE', 'LEAGUE INFO',
        'LEAGUE JOIN', 'LEAGUE LEAVE', 'LEAGUE LIST',
        '/pet trade browse_target_pets', '/pet trade refresh_pet_list', '/pet trade previous_pet',
        '/pet trade next_pet', '/pet trade request_specific_pet', '/pet trade open_offer',
        '/pet trade accept_trade', '/pet trade reject_trade'
    ]
    parity = [
        '/com — Telegram vs Discord', '/pet — Telegram vs Discord', '/games — Telegram vs Discord',
        '/tap — Telegram vs Discord', '/soccer — Telegram vs Discord', '/help — Telegram vs Discord',
        '/profile — Telegram vs Discord', '/rewards — Telegram vs Discord', '/petmarket — Telegram vs Discord',
        'Wallet connect — TG vs Discord', 'Game launch links — TG vs Discord'
    ]
    templates_meta = {
        'pet_regression': ['Pet Commands', 'List Pets', 'Petmarket Commands'],
        'games_smoke': ['Game Tests', 'Commands'],
        'hub_p2e': ['Play 2 Earn / Hub', 'Commands'],
        'admin_smoke': ['Admin Commands', 'GAD Features'],
        'full_smoke': None,
    }
    return {
        'Commands': commands,
        'Game Tests': game_tests,
        'Play 2 Earn / Hub': hub_p2e,
        'Admin Commands': admin_commands,
        'GAD Features': gad_features,
        'Pet Commands': pet_commands,
        'List Pets': ['/listpets', '/listpets trade', '/listpets battle'],
        'Petmarket Commands': ['/petmarket browse', '/petmarket buy', '/petmarket cancel', '/petmarket leaderboard', '/petmarket mylistings'],
        'AI Commands': ['/chat talk', '/chat tell me about', '/chat generate image', '/chat start trivia', '/chat drop a riddle', '/toggle_chat_off', '/myimages'],
        'View Wallets Features': ['Telegram Wallets', 'Discord Wallets'],
        'Telegram vs Discord Parity': parity,
        '_templates': templates_meta,
    }


def load_status_store():
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    if not os.path.exists(STATUS_FILE):
        return {}
    try:
        with open(STATUS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def save_status_store(data):
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    with open(STATUS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)


def status_key(tester, item, date_str=None):
    d = date_str or datetime.now().strftime('%Y-%m-%d')
    return f'{tester}:{item}:{d}'


def scan_executed_commands(log_type, base_dir, selected_date=None):
    executed = defaultdict(set)
    pattern = re.compile(r'(/\w+(?:\s+\w+)*)|(/\w+)', re.IGNORECASE)
    exec_pattern = re.compile(r'executed\s+(/\S+)', re.IGNORECASE)
    for log_path in tester_log_paths(log_type, base_dir):
        with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                try:
                    timestamp = parse_log_timestamp(line.split(' - ', 1)[0].strip()) if ' - ' in line else None
                    if selected_date and timestamp:
                        if timestamp.date() != datetime.strptime(selected_date, '%Y-%m-%d').date():
                            continue
                    for match in exec_pattern.findall(line):
                        executed[match.upper().strip()].add(log_path)
                    for match in pattern.findall(line.upper()):
                        cmd = (match[0] or match[1]).strip()
                        if cmd:
                            executed[cmd].add(log_path)
                    parts = [p.strip() for p in line.split(' - ')]
                    if len(parts) >= 3 and parts[1].upper() in ('NOTE', 'CHECK_NOTE', 'IN', 'OUT', 'STATUS'):
                        item = parts[2].upper()
                        if item:
                            executed[item].add(log_path)
                except Exception:
                    continue
    return executed


def build_check_response(log_type, base_dir, selected_date=None, template=None):
    all_checks = get_all_checklists()
    templates = all_checks.pop('_templates', {})
    if template and template in templates:
        cats = templates[template]
        if cats:
            all_checks = {k: v for k, v in all_checks.items() if k in cats}

    executed = scan_executed_commands(log_type, base_dir, selected_date)
    statuses = load_status_store()
    date_key = selected_date or datetime.now().strftime('%Y-%m-%d')

    checklist = {}
    done = 0
    total = 0
    item_statuses = {}

    for category, items in all_checks.items():
        checklist[category] = {}
        for item in items:
            total += 1
            upper_item = item.upper()
            base_cmd = upper_item.split()[0] if ' ' in upper_item else upper_item
            auto_pass = any(base_cmd in key for key in executed)
            sk = status_key(log_type, item, date_key)
            manual = statuses.get(sk, {})
            status = manual.get('status')
            if status == 'pass' or (not status and auto_pass):
                mark = '✅'
                done += 1
            elif status == 'blocked':
                mark = '⚠️'
            elif status == 'fail':
                mark = '❌'
            else:
                mark = '❌'
            checklist[category][item] = mark
            if manual:
                item_statuses[item] = manual

    return {
        'checklist': checklist,
        'progress': {
            'done': done,
            'total': total,
            'percent': round((done / total) * 100, 1) if total else 0,
            'date': date_key,
            'tester': log_type,
        },
        'statuses': item_statuses,
    }


def compute_sessions(log_type, base_dir, log_date=None):
    logs = load_all_logs(log_type, base_dir, log_filter='clock')
    if log_date:
        logs = [l for l in logs if l['_sort'].date() == datetime.strptime(log_date, '%Y-%m-%d').date()]
    logs.sort(key=lambda x: x['_sort'])
    sessions = []
    open_in = None
    total_seconds = 0
    for entry in logs:
        c = (entry.get('content') or '').upper()
        if c.startswith('IN'):
            open_in = entry['_sort']
        elif c.startswith('OUT') and open_in:
            delta = (entry['_sort'] - open_in).total_seconds()
            if delta > 0:
                sessions.append({
                    'clock_in': open_in.isoformat(),
                    'clock_out': entry['_sort'].isoformat(),
                    'duration_minutes': round(delta / 60, 1),
                    'duration_hours': round(delta / 3600, 2),
                })
                total_seconds += delta
            open_in = None
    return {
        'sessions': sessions,
        'total_hours': round(total_seconds / 3600, 2),
        'session_count': len(sessions),
        'open_session': open_in.isoformat() if open_in else None,
    }


def monthly_rollup(base_dir, year=None, month=None):
    now = datetime.now()
    year = int(year or now.year)
    month = int(month or now.month)
    testers = ['penna', 'chan', 'tam']
    rollup = {}
    for tester in testers:
        logs = load_all_logs(tester, base_dir)
        month_logs = [l for l in logs if l['_sort'].year == year and l['_sort'].month == month]
        sessions = compute_sessions(tester, base_dir)
        session_hours = 0
        for s in sessions['sessions']:
            dt_in = datetime.fromisoformat(s['clock_in'])
            if dt_in.year == year and dt_in.month == month:
                session_hours += s['duration_hours']
        check = build_check_response(tester, base_dir)
        rollup[tester] = {
            'log_entries': len(month_logs),
            'clock_hours': round(session_hours, 2),
            'checklist_percent': check['progress']['percent'],
            'notes': sum(1 for l in month_logs if l.get('log_type') in ('manual', 'check_note')),
            'bot_commands': sum(1 for l in month_logs if l.get('log_type') == 'bot'),
        }
    return {'year': year, 'month': month, 'testers': rollup}


def export_csv(log_type, base_dir, days=7):
    since = datetime.now() - timedelta(days=int(days))
    logs = [l for l in load_all_logs(log_type, base_dir) if l['_sort'] >= since]
    buf = StringIO()
    w = csv.writer(buf)
    w.writerow(['timestamp', 'tester', 'type', 'content'])
    for e in logs:
        w.writerow([e['timestamp'], log_type, e.get('log_type', ''), e['content']])
    return buf.getvalue()


def append_tester_log(tester, action, item='', notes=''):
    os.makedirs(TESTER_LOG_DIR, exist_ok=True)
    log_file = os.path.join(TESTER_LOG_DIR, f'{tester}.log')
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f"{timestamp} - {action.upper()} - {item} - {notes.strip()}\n"
    with open(log_file, 'a', encoding='utf-8') as f:
        f.write(line)
    return line