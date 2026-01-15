import json
import os
import psycopg2
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''API для чата в игровых комнатах'''
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
            room_id = body.get('room_id')
            telegram_id = body.get('telegram_id')
            message = body.get('message')
            
            if not all([room_id, telegram_id, message]):
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'room_id, telegram_id and message required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute('''
                SELECT first_name, username, avatar_emoji FROM users WHERE telegram_id = %s
            ''', (telegram_id,))
            user = cur.fetchone()
            
            if not user:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User not found'}),
                    'isBase64Encoded': False
                }
            
            cur.execute('''
                INSERT INTO chat_messages (room_id, telegram_id, message, created_at)
                VALUES (%s, %s, %s, %s)
                RETURNING id, created_at
            ''', (room_id, telegram_id, message, datetime.now()))
            
            msg_data = cur.fetchone()
            conn.commit()
            
            response_data = {
                'id': msg_data[0],
                'room_id': room_id,
                'telegram_id': telegram_id,
                'first_name': user[0],
                'username': user[1],
                'avatar_emoji': user[2],
                'message': message,
                'created_at': msg_data[1].isoformat()
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
            room_id = params.get('room_id')
            since_id = params.get('since_id', '0')
            
            if not room_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'room_id required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute('''
                SELECT cm.id, cm.telegram_id, cm.message, cm.created_at,
                       u.first_name, u.username, u.avatar_emoji
                FROM chat_messages cm
                JOIN users u ON cm.telegram_id = u.telegram_id
                WHERE cm.room_id = %s AND cm.id > %s
                ORDER BY cm.created_at ASC
                LIMIT 100
            ''', (room_id, int(since_id)))
            
            messages = cur.fetchall()
            
            response_data = {
                'messages': [
                    {
                        'id': msg[0],
                        'telegram_id': msg[1],
                        'message': msg[2],
                        'created_at': msg[3].isoformat(),
                        'first_name': msg[4],
                        'username': msg[5],
                        'avatar_emoji': msg[6]
                    } for msg in messages
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
