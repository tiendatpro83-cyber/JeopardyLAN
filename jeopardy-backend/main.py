import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
import random
import os
import asyncio
import time
import uuid
import socket

# 1. Cấu hình Socket.io và FastAPI
sio = socketio.AsyncServer(
    async_mode='asgi', 
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)
app = FastAPI()
socket_app = socketio.ASGIApp(sio, app)

# CORS middleware cho phép tất cả origins trong development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Logic bốc thăm câu hỏi
def load_random_questions():
    file_path = os.path.join("data", "game_data.json")
    if not os.path.exists(file_path):
        print(f"Không tìm thấy file dữ liệu: {file_path}")
        return []

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            full_data = json.load(f)
        
        all_categories = full_data.get("categories", [])
        selected_cats = random.sample(all_categories, min(len(all_categories), 6))
        
        final_categories = []
        for cat in selected_cats:
            new_cat = {"name": cat["name"], "questions": []}
            pool = cat.get("question_pool", {})
            for points in ["100", "200", "300", "400", "500"]:
                questions_at_points = pool.get(points, [])
                if questions_at_points:
                    chosen = random.choice(questions_at_points)
                    new_cat["questions"].append({
                        "points": int(points),
                        "question": chosen["question"],
                        "answer": chosen["answer"],
                        "is_answered": False
                    })
            final_categories.append(new_cat)
        return final_categories
    except Exception as e:
        print(f"Lỗi load câu hỏi: {e}")
        return []

# 3. Khởi tạo 3 người chơi mặc định
def init_default_players():
    default_players = {}
    for i in range(1, 4):
        player_id = f"player_{i}_{uuid.uuid4().hex[:6]}"
        default_players[player_id] = {
            "name": f"Player{i}",
            "score": 0,
            "connected": False  # Chưa kết nối
        }
    return default_players

# 4. Trạng thái Game (Global State)
game_state = {
    "players": init_default_players(),  # Dictionary với key là player_id
    "player_sids": {},  # Mapping: player_id -> sid (khi người chơi kết nối)
    "categories": load_random_questions(),
    "current_question": None,
    "buzzer_locked": True,
    "winner": None,
    "press_queue": []
}

def reset_game():
    """Reset game về trạng thái ban đầu"""
    game_state["players"] = init_default_players()
    game_state["player_sids"] = {}
    game_state["categories"] = load_random_questions()
    game_state["current_question"] = None
    game_state["buzzer_locked"] = True
    game_state["winner"] = None
    game_state["press_queue"] = []

# 5. Socket.io Events
@sio.event
async def connect(sid, environ):
    print(f"Kết nối mới: {sid}")

@sio.event
async def disconnect(sid):
    # Tìm player_id từ sid và đánh dấu disconnected
    for player_id, player_sid in game_state["player_sids"].items():
        if player_sid == sid:
            if player_id in game_state["players"]:
                game_state["players"][player_id]["connected"] = False
                print(f"Người chơi {game_state['players'][player_id]['name']} ngắt kết nối.")
            del game_state["player_sids"][player_id]
            break
    
    await sio.emit('player_update', game_state["players"])

@sio.event
async def player_join(sid, data):
    """Người chơi tham gia với tên mới"""
    name = data.get("name", "Player")
    player_id = data.get("player_id")
    
    if player_id and player_id in game_state["players"]:
        # Cập nhật người chơi đã tồn tại
        game_state["players"][player_id]["name"] = name
        game_state["players"][player_id]["connected"] = True
        game_state["player_sids"][player_id] = sid
        print(f"Người chơi kết nối: {name} (ID: {player_id})")
    else:
        # Tạo người chơi mới nếu chưa có ID
        player_id = str(uuid.uuid4())
        game_state["players"][player_id] = {
            "name": name,
            "score": 0,
            "connected": True
        }
        game_state["player_sids"][player_id] = sid
        print(f"Người chơi mới: {name}")
    
    await sio.emit('player_update', game_state["players"])

@sio.event
async def player_join_with_id(sid, data):
    """Người chơi tham gia qua QR code với ID có sẵn"""
    player_id = data.get("player_id")
    name = data.get("name", f"Player{player_id[-1] if player_id else '1'}")
    
    if player_id and player_id in game_state["players"]:
        game_state["players"][player_id]["connected"] = True
        game_state["player_sids"][player_id] = sid
        print(f"Người chơi kết nối qua QR: {name} (ID: {player_id})")
    else:
        # Fallback: tạo mới nếu ID không hợp lệ
        player_id = str(uuid.uuid4())
        game_state["players"][player_id] = {
            "name": name,
            "score": 0,
            "connected": True
        }
        game_state["player_sids"][player_id] = sid
    
    await sio.emit('player_update', game_state["players"])

@sio.event
async def rename_player(sid, data):
    """Đổi tên người chơi"""
    player_id = data.get("player_id")
    new_name = data.get("new_name")
    
    if player_id and player_id in game_state["players"]:
        game_state["players"][player_id]["name"] = new_name
        print(f"Người chơi đổi tên: {player_id} -> {new_name}")
        await sio.emit('player_update', game_state["players"])

@sio.event
async def reset_game(sid):
    """Reset toàn bộ game"""
    reset_game()
    print("Game đã được reset")
    await sio.emit('init_data', {
        "categories": game_state["categories"],
        "current_question": game_state["current_question"]
    })
    await sio.emit('player_update', game_state["players"])

@sio.event
async def request_init(sid):
    """Gửi dữ liệu khởi tạo cho client"""
    await sio.emit('init_data', {
        "categories": game_state["categories"],
        "current_question": game_state["current_question"]
    }, to=sid)
    await sio.emit('player_update', game_state["players"], to=sid)

@sio.event
async def show_question(sid, data):
    """Hiển thị câu hỏi được chọn"""
    game_state["current_question"] = data
    game_state["buzzer_locked"] = True
    game_state["winner"] = None
    game_state["press_queue"] = []
    
    # Đánh dấu câu hỏi đã được chọn
    for cat in game_state["categories"]:
        if cat["name"] == data["category"]:
            for q in cat["questions"]:
                if q["points"] == data["points"] and q["question"] == data["question"]:
                    q["is_answered"] = True
                    break

    await sio.emit('show_question', data)
    await sio.emit('init_data', {"categories": game_state["categories"]})

@sio.event
async def enable_buzzer(sid):
    """Mở chuông cho người chơi bấm"""
    game_state["buzzer_locked"] = False
    game_state["press_queue"] = []
    await sio.emit('enable_buzzer')

@sio.event
async def press_buzzer(sid, data):
    """Xử lý khi người chơi bấm chuông"""
    if not game_state["buzzer_locked"]:
        # Tìm player_id từ sid
        player_name = data.get("name")
        
        is_first = len(game_state["press_queue"]) == 0
        
        game_state["press_queue"].append({
            "name": player_name,
            "client_time": data.get("client_time", time.time() * 1000)
        })

        if is_first:
            # Cửa sổ tranh chấp 50ms
            await asyncio.sleep(0.05)
            game_state["buzzer_locked"] = True
            
            # Chọn người bấm sớm nhất
            winner_data = min(game_state["press_queue"], key=lambda x: x['client_time'])
            game_state["winner"] = winner_data["name"]
            
            await sio.emit('buzzer_locked', {"winner": game_state["winner"]})

@sio.event
async def update_score(sid, data):
    """Cập nhật điểm số"""
    player_name = data.get("player_name")
    points = data.get("points", 0)
    
    for player_id, info in game_state["players"].items():
        if info["name"] == player_name:
            info["score"] += points
            break
    
    await sio.emit('player_update', game_state["players"])

@sio.event
async def play_score_sound(sid, data):
    """Phát âm thanh đúng/sai"""
    await sio.emit('play_score_sound', data)

@sio.event
async def stop_timer_all(sid):
    """Dừng timer trên tất cả client"""
    await sio.emit('stop_timer_all')

@sio.event
async def close_question(sid):
    """Đóng câu hỏi hiện tại"""
    game_state["current_question"] = None
    game_state["winner"] = None
    game_state["buzzer_locked"] = True
    await sio.emit('close_question')

if __name__ == "__main__":
    # Lấy IP local
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    print("=" * 60)
    print("🎮 JEOPARDY SERVER")
    print("=" * 60)
    print(f"📋 Đã tạo {len(game_state['players'])} người chơi mặc định:")
    for pid, pdata in game_state["players"].items():
        print(f"   • {pdata['name']} (ID: {pid})")
    print("=" * 60)
    print(f"🌐 Server URLs:")
    print(f"   • Local: http://localhost:8000")
    print(f"   • Network: http://{local_ip}:8000")
    print("=" * 60)
    print(f"📱 Truy cập từ điện thoại:")
    print(f"   1. Kết nối điện thoại vào cùng mạng WiFi với máy tính")
    print(f"   2. Mở trình duyệt điện thoại, truy cập:")
    print(f"      http://{local_ip}:5173")
    print("=" * 60)
    print("💡 Lưu ý:")
    print("   • Nếu dùng Create React App, port có thể là 3000")
    print("   • Đảm bảo tường lửa Windows/Mac cho phép port 8000 và 5173")
    print("=" * 60)
    
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)