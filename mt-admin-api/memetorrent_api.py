from flask import Flask, jsonify, request
import mysql.connector
from mysql.connector import pooling, Error
import logging
from datetime import datetime, timedelta
import os
import re
from collections import defaultdict
import time
import os
import tester_tools as tt

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TESTER_LOG_DIR = tt.TESTER_LOG_DIR

# Create a logs folder if it doesn't exist
LOG_DIR = os.path.join(BASE_DIR, 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

# Use relative log file in the logs subfolder
LOG_FILE = os.path.join(LOG_DIR, 'memetorrent_api.log')

# Flask app - use instance_path relative to script
app = Flask(__name__, instance_path=os.path.join(BASE_DIR, 'instance'))

# Logging setup - relative file
logging.basicConfig(
    level=logging.DEBUG,
    filename=LOG_FILE,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logger.debug("Flask app initialized on VPS")

# === SHARED DATABASE CONFIG (SAFE FOR 20+ BOTS) ===
SHARED_DB_CONFIG = {
    'host': '50.6.160.248',
    'user': 'tcvkxete_admin',
    'password': 'Shinhwa1@@',
    'port': 3306,
    'raise_on_warnings': True,
    'use_pure': True,
    'connection_timeout': 60,  # Longer timeout for SSL handshake
    'pool_name': 'shared_pool',
    'pool_size': 1,            # CRITICAL: Only 1 connection to avoid max_user_connections limit
    'pool_reset_session': True,
    # === SSL FIX: Force SSL + skip certificate validation ===
    'ssl_ca': None,
    'ssl_verify_cert': False,  # Skips bad/self-signed cert errors
    'ssl_disabled': False      # Explicitly enable SSL
}

# === INIT SHARED POOL ===
def init_shared_pool():
    attempts = 5  # More attempts to handle flaky connections
    for attempt in range(1, attempts + 1):
        try:
            pool = pooling.MySQLConnectionPool(**SHARED_DB_CONFIG)
            logger.info(f"SHARED POOL initialized (size=1 - safe for many bots)")
            return pool
        except Error as e:
            logger.error(f"Pool init attempt {attempt} failed: {e}")
            if attempt == attempts:
                raise
            time.sleep(3)

try:
    from uwsgidecorators import postfork
    @postfork
    def init_pool_postfork():
        global shared_pool
        shared_pool = init_shared_pool()
    init_pool_postfork()
except ImportError:
    shared_pool = init_shared_pool()

# === SAFE CONNECTION GETTER WITH RETRY ===
def get_connection():
    for _ in range(10):  # Very patient retries
        try:
            conn = shared_pool.get_connection()
            if conn.is_connected():
                logger.debug("Connection acquired successfully")
                return conn
        except Error as e:
            logger.warning(f"Connection failed, retrying: {e}")
            time.sleep(3)
    logger.error("Failed to get DB connection after retries")
    return None

# === ADMIN CHECK ===
def is_admin():
    key = request.args.get('key') or request.headers.get('X-Telegram-User-ID')
    return key == "Hiptonic1@@"

# === REUSABLE QUERY HELPER ===
def query_db(database, query, params=None, dict_cursor=True):
    conn = get_connection()
    if not conn:
        return None
    try:
        # Explicitly select database (fixes "No database selected")
        cursor = conn.cursor()
        cursor.execute(f"USE {database}")
        cursor.close()

        cursor = conn.cursor(dictionary=dict_cursor)
        cursor.execute(query, params or ())
        results = cursor.fetchall()
        conn.commit()
        logger.debug(f"Query success in {database} - {len(results or [])} rows")
        return results
    except Error as e:
        logger.error(f"Query error in {database}: {e} | Query: {query} | Params: {params}")
        return None
    finally:
        try:
            cursor.close()
        except:
            pass
        try:
            conn.close()
        except:
            pass

@app.route('/')
def index():
    return jsonify({'message': 'API Running'})

@app.route('/users', methods=['GET'])
def get_users():
    if not is_admin():
        return jsonify({'error': 'Unauthorized'}), 401
    results = query_db('tcvkxete_userdb', """
        SELECT ud.id, ud.username, mr.unrestricted_at
        FROM user_details ud
        LEFT JOIN manual_restrictions mr ON ud.id = mr.user_id AND mr.chat_id = %s
    """, (-1002403282101,), dict_cursor=False)
    if results is None:
        return jsonify({'error': 'DB Error'}), 500
    user_list = [{'id': row[0], 'username': row[1] or f'User_{row[0]}', 'is_restricted': row[2] is None} for row in results]
    return jsonify({'users': user_list})

@app.route('/api/discord_messages')
def get_discord_messages():
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    search = request.args.get('search', '').lower()
    page = int(request.args.get('page', 1))
    per_page = 100
    offset = (page - 1) * per_page
    where = ""
    params = []
    if search:
        where = "WHERE content LIKE %s OR author_username LIKE %s"
        params.extend([f'%{search}%', f'%{search}%'])
    query = f"""
        SELECT created_at AS timestamp, 'Discord' AS platform, content,
               COALESCE(author_username, 'Unknown') AS author_username,
               COALESCE(channel_name, 'N/A') AS channel_name
        FROM tcvkxete_discord_members.messages
        {where}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
    """
    params.extend([per_page, offset])
    results = query_db('tcvkxete_discord_members', query, params)
    if results is None:
        return jsonify({'error': 'DB Error'}), 500
    for r in results:
        if r['timestamp']:
            r['timestamp'] = r['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
    return jsonify(results)

@app.route('/api/discord_deleted_messages')
def get_discord_deleted_messages():
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    search = request.args.get('search', '').lower()
    page = int(request.args.get('page', 1))
    per_page = 100
    offset = (page - 1) * per_page
    where = ""
    params = []
    if search:
        where = "WHERE content LIKE %s OR author_username LIKE %s OR reason LIKE %s"
        params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
    query = f"""
        SELECT timestamp, 'Discord' AS platform, content,
               COALESCE(author_username, 'Unknown') AS author_username,
               COALESCE(channel_name, 'N/A') AS channel_name, reason
        FROM tcvkxete_discord_members.deleted_messages
        {where}
        ORDER BY timestamp DESC
        LIMIT %s OFFSET %s
    """
    params.extend([per_page, offset])
    results = query_db('tcvkxete_discord_members', query, params)
    if results is None:
        return jsonify({'error': 'DB Error'}), 500
    for r in results:
        if r['timestamp']:
            r['timestamp'] = r['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
    return jsonify(results)

@app.route('/api/discord_user_details')
def get_discord_user_details():
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    search = request.args.get('search', '').lower()
    field = request.args.get('field', 'username')
    page = int(request.args.get('page', 1))
    per_page = 100
    offset = (page - 1) * per_page
    valid_fields = ['discord_id', 'username', 'discriminator', 'wallet_address']
    if field not in valid_fields:
        return jsonify({"error": "Invalid search field"}), 400
    where = "WHERE du.discord_id IS NOT NULL"
    params = []
    if search:
        if field == 'discord_id':
            where += " AND du.discord_id = %s"
            params.append(search)
        else:
            where += f" AND LOWER(du.{field}) LIKE %s"
            params.append(f'%{search}%')
    query = f"""
        SELECT du.id, du.discord_id, du.username, du.discriminator, du.joined_at, du.verified, du.verified_at, du.wallet_address,
               COUNT(m.message_id) AS message_count
        FROM tcvkxete_discord_members.discord_users du
        LEFT JOIN tcvkxete_discord_members.messages m ON du.discord_id = m.author_id
        {where}
        GROUP BY du.id, du.discord_id, du.username, du.discriminator, du.joined_at, du.verified, du.verified_at, du.wallet_address
        ORDER BY du.joined_at DESC
        LIMIT %s OFFSET %s
    """
    params.extend([per_page, offset])
    results = query_db('tcvkxete_discord_members', query, params)
    if results is None:
        return jsonify({'error': 'DB Error'}), 500
    for r in results:
        if r.get('joined_at'):
            r['joined_at'] = r['joined_at'].strftime('%Y-%m-%d %H:%M:%S')
        if r.get('verified_at'):
            r['verified_at'] = r['verified_at'].strftime('%Y-%m-%d %H:%M:%S') if r['verified_at'] else None
    return jsonify(results)

@app.route('/api/telegram_messages')
def get_telegram_messages():
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    search = request.args.get('search', '').lower()
    page = int(request.args.get('page', 1))
    per_page = 100
    offset = (page - 1) * per_page
    where = ""
    params = []
    if search:
        where = "WHERE m.content LIKE %s OR ud.username LIKE %s"
        params.extend([f'%{search}%', f'%{search}%'])
    query = f"""
        SELECT m.created_at AS timestamp, 'Telegram' AS platform, m.content,
               COALESCE(ud.username, CONCAT('User_', m.user_id)) AS username
        FROM tcvkxete_message_tracking.messages m
        LEFT JOIN tcvkxete_userdb.user_details ud ON m.user_id = ud.id
        {where}
        ORDER BY m.created_at DESC
        LIMIT %s OFFSET %s
    """
    params.extend([per_page, offset])
    results = query_db('tcvkxete_message_tracking', query, params)
    if results is None:
        return jsonify({'error': 'DB Error'}), 500
    for r in results:
        if r['timestamp']:
            r['timestamp'] = r['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
    return jsonify(results)
    
    

@app.route('/api/telegram_deleted_messages')
def get_telegram_deleted_messages():
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    search = request.args.get('search', '').lower()
    page = int(request.args.get('page', 1))
    per_page = 100
    offset = (page - 1) * per_page
    where = "WHERE platform = 'telegram'"
    params = []
    if search:
        where += " AND (content LIKE %s OR username LIKE %s OR reason LIKE %s OR chat_name LIKE %s)"
        like = f'%{search}%'
        params.extend([like, like, like, like])
    query = f"""
        SELECT message_id, chat_id, chat_name, user_id, username, content, timestamp, reason
        FROM tcvkxete_message_tracking.deleted_messages
        {where}
        ORDER BY timestamp DESC
        LIMIT %s OFFSET %s
    """
    params.extend([per_page, offset])
    results = query_db('tcvkxete_message_tracking', query, params)
    if results is None:
        return jsonify({'error': 'DB Error'}), 500
    for r in results:
        if r['timestamp']:
            r['timestamp'] = r['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
    return jsonify(results)

@app.route('/api/tester_logs', methods=['GET', 'POST'])
def tester_logs():
    if not is_admin():
        return jsonify({"error": "Unauthorized"}), 401

    if request.method == 'POST':
        tester = request.form.get('tester') or request.args.get('tester')
        action = request.form.get('action') or request.args.get('action')  # in, out, note, check_note
        notes = request.form.get('notes') or request.args.get('notes') or request.form.get('note') or ''
        item = request.form.get('item') or request.args.get('item') or ''  # for per-command notes

        if not tester or not action:
            return jsonify({"error": "Missing tester or action"}), 400

        # Append to bot tester log (same files the telegram bot uses)
        try:
            tt.append_tester_log(tester, action, item, notes)
            return jsonify({"status": "logged"})
        except Exception as e:
            logger.error(f"Write error: {e}")
            return jsonify({"error": str(e)}), 500

    # ── YOUR EXISTING GET LOGIC (UNCHANGED) ──
    search = request.args.get('search', '').lower()
    page = max(1, int(request.args.get('page', 1)))
    per_page = min(max(10, int(request.args.get('per_page', 100))), 500)
    offset = (page - 1) * per_page
    log_type = request.args.get('log', 'penna')
    log_date = request.args.get('log_date') or request.args.get('date')
    log_filter = request.args.get('log_filter', 'all')

    if log_type not in ('penna', 'chan', 'tam'):
        return jsonify({'error': 'Invalid log type'}), 400

    try:
        logs = tt.load_all_logs(log_type, BASE_DIR, search=search, log_date=log_date, log_filter=log_filter if log_filter != 'all' else None)
        total = len(logs)
        page_logs = [{k: v for k, v in e.items() if not k.startswith('_')} for e in logs[offset:offset + per_page]]
        return jsonify({
            'logs': page_logs,
            'page': page,
            'per_page': per_page,
            'total': total,
            'has_next': offset + per_page < total,
        })
    except Exception as e:
        logger.error(f"Log error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/check_commands', methods=['GET'])
def check_commands():
    if not is_admin():
        logger.warning("Unauthorized access attempt to /api/check_commands")
        return jsonify({"error": "Unauthorized"}), 401
    log_type = request.args.get('log', 'penna')
    selected_date = request.args.get('date')
    result = tt.build_checklist(log_type, BASE_DIR, selected_date)
    logger.debug(f"Command check for {log_type} date={selected_date}")
    return jsonify(result)

@app.route('/api/user_details')
def get_user_details():
    if not is_admin(): return jsonify({"error": "Unauthorized"}), 401
    search = request.args.get('search', '').lower()
    field = request.args.get('field', 'username')
    page = int(request.args.get('page', 1))
    per_page = 100
    offset = (page - 1) * per_page
    valid_fields = ['id', 'first_name', 'last_name', 'username', 'phone', 'wallet_address']
    if field not in valid_fields:
        return jsonify({"error": "Invalid field"}), 400
    where = ""
    params = []
    if search:
        if field == 'id':
            try:
                params.append(int(search))
                where = "WHERE id = %s"
            except:
                return jsonify({"error": "Invalid ID"}), 400
        else:
            where = f"WHERE LOWER({field}) LIKE %s"
            params.append(f'%{search}%')
    query = f"SELECT id, first_name, last_name, username, phone, is_bot, message_count, verified, date, wallet_address FROM tcvkxete_userdb.user_details {where} ORDER BY date DESC LIMIT %s OFFSET %s"
    params.extend([per_page, offset])
    results = query_db('tcvkxete_userdb', query, params)
    if results is None:
        return jsonify({'error': 'DB Error'}), 500
    for r in results:
        if r.get('date'):
            r['date'] = r['date'].strftime('%Y-%m-%d %H:%M:%S')
    return jsonify(results)

# Paste your current /api/activity_stats here (or use the one from previous messages)
# Example minimal version that should work with the new SSL config:
@app.route('/api/activity_stats')
def activity_stats():
    if not is_admin():
        return jsonify({"error": "Unauthorized"}), 401

    platform = request.args.get('platform', 'discord').lower()
    hours = int(request.args.get('hours', 24))

    if platform == 'discord':
        db_name = 'tcvkxete_discord_members'
        query = f"""
            SELECT HOUR(created_at) AS hour,
                   COUNT(*) AS message_count
            FROM messages
            WHERE created_at >= NOW() - INTERVAL %s HOUR
            GROUP BY HOUR(created_at)
            ORDER BY HOUR(created_at)
        """
    else:
        db_name = 'tcvkxete_message_tracking'
        query = f"""
            SELECT hour,
                   SUM(message_count) AS message_count
            FROM hourly_message_counts
            WHERE date >= CURDATE() - INTERVAL %s DAY
            GROUP BY hour
            ORDER BY hour
        """
        hours = (hours // 24) + 1

    results = query_db(db_name, query, (hours,))
    if results is None:
        return jsonify({"error": "Database query failed"}), 500

    all_hours = {h: 0 for h in range(24)}
    for row in results or []:
        h = int(row['hour'])
        all_hours[h] = row['message_count']

    response = {
        "labels": [f"{h:02d}:00" for h in range(24)],
        "data": [all_hours[h] for h in range(24)],
        "platform": platform
    }
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=False)
