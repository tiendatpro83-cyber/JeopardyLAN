import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
import random
import os
import asyncio
import time

# 1. Cấu hình Socket.io và FastAPI
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()
socket_app = socketio.ASGIApp(sio, app)

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
        # Chọn ngẫu nhiên 6 lĩnh vực
        selected_cats = random.sample(all_categories, min(len(all_categories), 6))
        
        final_categories = []
        for cat in selected_cats:
            new_cat = {"name": cat["name"], "questions": []}
            pool = cat.get("question_pool", {})
            # Lấy 1 câu ngẫu nhiên cho mỗi mức điểm 100, 200, 300, 400, 500
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

# 3. Trạng thái Game (Global State)
game_state = {
    "players": {},       # {sid: {name, score}}
    "categories": load_random_questions(),
    "current_question": None,
    "buzzer_locked": True, # Mặc định khóa cho đến khi Host mở
    "winner": None,
    "press_queue": []
}

# 4. Socket.io Events
@sio.event
async def connect(sid, environ):
    print(f"Kết nối mới: {sid}")

@sio.event
async def disconnect(sid):
    if sid in game_state["players"]:
        print(f"Người chơi {game_state['players'][sid]['name']} thoát.")
        del game_state["players"][sid]
        await sio.emit('player_update', game_state["players"])

@sio.event
async def player_join(sid, data):
    game_state["players"][sid] = {"name": data["name"], "score": 0}
    print(f"Người chơi tham gia: {data['name']}")
    await sio.emit('player_update', game_state["players"])

@sio.event
async def request_init(sid):
    # Gửi dữ liệu khởi tạo cho client (bảng câu hỏi, câu hỏi hiện tại)
    await sio.emit('init_data', {
        "categories": game_state["categories"],
        "current_question": game_state["current_question"]
    }, to=sid)
    await sio.emit('player_update', game_state["players"], to=sid)

@sio.event
async def show_question(sid, data):
    # Data: {category, question, answer, points}
    game_state["current_question"] = data
    game_state["buzzer_locked"] = True
    game_state["winner"] = None
    game_state["press_queue"] = []
    
    # Đánh dấu câu hỏi đã được chọn trong bảng
    for cat in game_state["categories"]:
        if cat["name"] == data["category"]:
            for q in cat["questions"]:
                if q["points"] == data["points"] and q["question"] == data["question"]:
                    q["is_answered"] = True
                    break

    await sio.emit('show_question', data)
    # Cập nhật lại bảng cho Screen và Host
    await sio.emit('init_data', {"categories": game_state["categories"]})

@sio.event
async def enable_buzzer(sid):
    game_state["buzzer_locked"] = False
    game_state["press_queue"] = []
    await sio.emit('enable_buzzer')

@sio.event
async def press_buzzer(sid, data):
    # Data: {name, client_time}
    if not game_state["buzzer_locked"]:
        is_first = len(game_state["press_queue"]) == 0
        
        game_state["press_queue"].append({
            "name": data["name"],
            "client_time": data.get("client_time", time.time() * 1000)
        })

        if is_first:
            # Cửa sổ tranh chấp 50ms để đợi các gói tin đến cùng lúc
            await asyncio.sleep(0.05)
            game_state["buzzer_locked"] = True
            
            # Chọn người thực sự bấm sớm nhất dựa trên client_time
            winner_data = min(game_state["press_queue"], key=lambda x: x['client_time'])
            game_state["winner"] = winner_data["name"]
            
            await sio.emit('buzzer_locked', {"winner": game_state["winner"]})

@sio.event
async def update_score(sid, data):
    # Data: {player_name, points}
    for p_sid, info in game_state["players"].items():
        if info["name"] == data["player_name"]:
            info["score"] += data["points"]
            break
    await sio.emit('player_update', game_state["players"])

@sio.event
async def play_score_sound(sid, data):
    # Đồng bộ âm thanh đúng/sai cho toàn bộ client (đặc biệt là Screen)
    # Data: {points}
    await sio.emit('play_score_sound', data)

@sio.event
async def stop_timer_all(sid):
    # Dừng nhạc đếm ngược trên tất cả các máy
    await sio.emit('stop_timer_all')

@sio.event
async def close_question(sid):
    game_state["current_question"] = None
    game_state["winner"] = None
    game_state["buzzer_locked"] = True
    await sio.emit('close_question')

if __name__ == "__main__":
    # Chạy server tại port 8000
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)