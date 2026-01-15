import json
import os
import psycopg2
import secrets
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''API для управления игровыми комнатами'''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
            action = body.get('action')
            
            if action == 'create':
                telegram_id = body.get('telegram_id')
                room_name = body.get('room_name', 'Игровая комната')
                payment_type = body.get('payment_type')
                is_private = body.get('is_private', False)
                
                if not telegram_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'telegram_id required'}),
                        'isBase64Encoded': False
                    }
                
                room_id = secrets.token_urlsafe(8)
                
                cur.execute('''
                    INSERT INTO rooms (room_id, creator_telegram_id, room_name, is_private, payment_type)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING room_id, creator_telegram_id, room_name, is_private, status, created_at
                ''', (room_id, telegram_id, room_name, is_private, payment_type))
                
                room = cur.fetchone()
                
                cur.execute('''
                    INSERT INTO room_players (room_id, telegram_id)
                    VALUES (%s, %s)
                ''', (room_id, telegram_id))
                
                cur.execute('''
                    UPDATE rooms SET current_players = 1 WHERE room_id = %s
                ''', (room_id,))
                
                conn.commit()
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'room_id': room[0],
                        'creator_telegram_id': room[1],
                        'room_name': room[2],
                        'is_private': room[3],
                        'status': room[4],
                        'created_at': room[5].isoformat() if room[5] else None
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'join':
                telegram_id = body.get('telegram_id')
                room_id = body.get('room_id')
                
                if not telegram_id or not room_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'telegram_id and room_id required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute('SELECT current_players, max_players, status FROM rooms WHERE room_id = %s', (room_id,))
                room = cur.fetchone()
                
                if not room:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Room not found'}),
                        'isBase64Encoded': False
                    }
                
                if room[0] >= room[1]:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Room is full'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute('''
                    INSERT INTO room_players (room_id, telegram_id)
                    VALUES (%s, %s)
                    ON CONFLICT (room_id, telegram_id) DO NOTHING
                ''', (room_id, telegram_id))
                
                cur.execute('''
                    UPDATE rooms SET current_players = current_players + 1
                    WHERE room_id = %s
                ''', (room_id,))
                
                conn.commit()
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'room_id': room_id}),
                    'isBase64Encoded': False
                }
        
        elif method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            room_id = params.get('room_id')
            
            if room_id:
                cur.execute('''
                    SELECT r.room_id, r.creator_telegram_id, r.room_name, r.is_private, 
                           r.max_players, r.current_players, r.status, r.payment_type,
                           u.username, u.first_name
                    FROM rooms r
                    JOIN users u ON r.creator_telegram_id = u.telegram_id
                    WHERE r.room_id = %s
                ''', (room_id,))
                
                room = cur.fetchone()
                
                if not room:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Room not found'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute('''
                    SELECT rp.telegram_id, u.username, u.first_name, u.avatar_emoji, rp.score
                    FROM room_players rp
                    JOIN users u ON rp.telegram_id = u.telegram_id
                    WHERE rp.room_id = %s
                    ORDER BY rp.score DESC
                ''', (room_id,))
                
                players = cur.fetchall()
                
                response_data = {
                    'room_id': room[0],
                    'creator_telegram_id': room[1],
                    'room_name': room[2],
                    'is_private': room[3],
                    'max_players': room[4],
                    'current_players': room[5],
                    'status': room[6],
                    'payment_type': room[7],
                    'creator_username': room[8],
                    'creator_name': room[9],
                    'players': [
                        {
                            'telegram_id': p[0],
                            'username': p[1],
                            'first_name': p[2],
                            'avatar_emoji': p[3],
                            'score': p[4]
                        } for p in players
                    ]
                }
                
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(response_data),
                    'isBase64Encoded': False
                }
            else:
                cur.execute('''
                    SELECT r.room_id, r.creator_telegram_id, r.room_name, r.is_private,
                           r.max_players, r.current_players, r.status, u.username, u.first_name
                    FROM rooms r
                    JOIN users u ON r.creator_telegram_id = u.telegram_id
                    WHERE r.status = 'waiting' AND r.is_private = false
                    ORDER BY r.created_at DESC
                    LIMIT 20
                ''')
                
                rooms = cur.fetchall()
                
                response_data = {
                    'rooms': [
                        {
                            'room_id': r[0],
                            'creator_telegram_id': r[1],
                            'room_name': r[2],
                            'is_private': r[3],
                            'max_players': r[4],
                            'current_players': r[5],
                            'status': r[6],
                            'creator_username': r[7],
                            'creator_name': r[8]
                        } for r in rooms
                    ]
                }
                
                cur.close()
                conn.close()
                
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
