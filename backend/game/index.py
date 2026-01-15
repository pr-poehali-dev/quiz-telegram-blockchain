import json
import os
import psycopg2
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''API для управления игровыми сессиями и сохранения результатов'''
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
            action = body.get('action')
            
            if action == 'complete':
                telegram_id = body.get('telegram_id')
                room_id = body.get('room_id')
                score = body.get('score', 0)
                correct_answers = body.get('correct_answers', 0)
                
                if not telegram_id or not room_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'telegram_id and room_id required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute('''
                    INSERT INTO game_sessions (room_id, telegram_id, score, correct_answers, completed, completed_at)
                    VALUES (%s, %s, %s, %s, true, %s)
                    RETURNING session_id
                ''', (room_id, telegram_id, score, correct_answers, datetime.now()))
                
                session_id = cur.fetchone()[0]
                
                cur.execute('''
                    UPDATE room_players SET score = %s
                    WHERE room_id = %s AND telegram_id = %s
                ''', (score, room_id, telegram_id))
                
                cur.execute('''
                    UPDATE users SET
                        total_score = total_score + %s,
                        games_played = games_played + 1,
                        correct_answers = correct_answers + %s
                    WHERE telegram_id = %s
                ''', (score, correct_answers, telegram_id))
                
                conn.commit()
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'session_id': session_id,
                        'score': score,
                        'correct_answers': correct_answers
                    }),
                    'isBase64Encoded': False
                }
        
        elif method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            action = params.get('action', 'leaderboard')
            
            if action == 'leaderboard':
                limit = int(params.get('limit', 10))
                
                cur.execute('''
                    SELECT telegram_id, username, first_name, avatar_emoji, total_score, 
                           games_played, correct_answers
                    FROM users
                    ORDER BY total_score DESC
                    LIMIT %s
                ''', (limit,))
                
                players = cur.fetchall()
                
                response_data = {
                    'leaderboard': [
                        {
                            'rank': idx + 1,
                            'telegram_id': p[0],
                            'username': p[1],
                            'first_name': p[2],
                            'avatar_emoji': p[3],
                            'total_score': p[4],
                            'games_played': p[5],
                            'correct_answers': p[6]
                        } for idx, p in enumerate(players)
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
