CREATE TABLE IF NOT EXISTS users (
    telegram_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    avatar_emoji VARCHAR(10) DEFAULT '🎮',
    total_score INT DEFAULT 0,
    games_played INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    referral_code VARCHAR(50) UNIQUE,
    referred_by BIGINT,
    referral_bonus INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    room_id VARCHAR(50) PRIMARY KEY,
    creator_telegram_id BIGINT NOT NULL,
    room_name VARCHAR(255),
    is_private BOOLEAN DEFAULT FALSE,
    max_players INT DEFAULT 10,
    current_players INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'waiting',
    payment_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_players (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(50) NOT NULL,
    telegram_id BIGINT NOT NULL,
    score INT DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, telegram_id)
);

CREATE TABLE IF NOT EXISTS game_sessions (
    session_id SERIAL PRIMARY KEY,
    room_id VARCHAR(50) NOT NULL,
    telegram_id BIGINT NOT NULL,
    score INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_users_referral ON users(referral_code);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_room_players_room ON room_players(room_id);
CREATE INDEX idx_game_sessions_room ON game_sessions(room_id);
