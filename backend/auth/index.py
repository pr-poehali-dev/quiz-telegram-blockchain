import json
import os
import psycopg2
import hashlib
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''API для авторизации через Telegram Mini App и управления пользователями'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        db_url = os.environ.get('DATABASE_URL')
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            telegram_id = body.get('telegram_id')
            username = body.get('username', '')
            first_name = body.get('first_name', '')
            last_name = body.get('last_name', '')
            referral_code = body.get('referral_code')
            
            if not telegram_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'telegram_id required'}),
                    'isBase64Encoded': False
                }
            
            user_referral_code = hashlib.md5(str(telegram_id).encode()).hexdigest()[:8]
            avatar_emojis = ['🎮', '🎯', '🚀', '⚡', '🔥', '💎', '🌟', '🎨']
            avatar = avatar_emojis[int(telegram_id) % len(avatar_emojis)]
            
            cur.execute('''
                INSERT INTO users (telegram_id, username, first_name, last_name, avatar_emoji, referral_code, last_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (telegram_id) DO UPDATE SET
                    username = EXCLUDED.username,
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    last_active = EXCLUDED.last_active
                RETURNING telegram_id, username, first_name, last_name, avatar_emoji, total_score, 
                          games_played, correct_answers, referral_code, referral_bonus
            ''', (telegram_id, username, first_name, last_name, avatar, user_referral_code, datetime.now()))
            
            user = cur.fetchone()
            
            if referral_code and not user[9]:
                cur.execute('SELECT telegram_id FROM users WHERE referral_code = %s', (referral_code,))
                referrer = cur.fetchone()
                if referrer and referrer[0] != telegram_id:
                    cur.execute('''
                        UPDATE users SET referred_by = %s, referral_bonus = referral_bonus + 50
                        WHERE telegram_id = %s
                    ''', (referrer[0], telegram_id))
                    cur.execute('''
                        UPDATE users SET referral_bonus = referral_bonus + 50
                        WHERE telegram_id = %s
                    ''', (referrer[0],))
            
            conn.commit()
            
            response_data = {
                'telegram_id': user[0],
                'username': user[1],
                'first_name': user[2],
                'last_name': user[3],
                'avatar_emoji': user[4],
                'total_score': user[5],
                'games_played': user[6],
                'correct_answers': user[7],
                'referral_code': user[8],
                'referral_bonus': user[9] if len(user) > 9 else 0
            }
            
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(response_data),
                'isBase64Encoded': False
            }
        
        elif method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            telegram_id = params.get('telegram_id')
            
            if not telegram_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'telegram_id required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute('''
                SELECT telegram_id, username, first_name, last_name, avatar_emoji, total_score,
                       games_played, correct_answers, referral_code, referral_bonus
                FROM users WHERE telegram_id = %s
            ''', (telegram_id,))
            
            user = cur.fetchone()
            cur.close()
            conn.close()
            
            if not user:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User not found'}),
                    'isBase64Encoded': False
                }
            
            response_data = {
                'telegram_id': user[0],
                'username': user[1],
                'first_name': user[2],
                'last_name': user[3],
                'avatar_emoji': user[4],
                'total_score': user[5],
                'games_played': user[6],
                'correct_answers': user[7],
                'referral_code': user[8],
                'referral_bonus': user[9]
            }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(response_data),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
