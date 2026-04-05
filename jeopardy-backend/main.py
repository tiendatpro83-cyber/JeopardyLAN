import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
import random
import os

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

# 2. Logic bốc thăm câu hỏi dựa trên cấu trúc question_pool
def load_random_questions():
    file_path = os.path.join("data", "game_data.json")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            full_data = json.load(f)
        
        all_categories = full_data.get("categories", [])
        
        # Bước A: Lấy ngẫu nhiên 6 lĩnh vực từ danh sách (ví dụ từ 10 lĩnh vực)
        selected_cats = random.sample(all_categories, min(len(all_categories), 6))
        
        final_categories = []
        
        for cat in selected_cats:
            new_cat = {"name": cat["name"], "questions": []}
            pool = cat.get("question_pool", {})
            
            # Bước B: Duyệt qua từng mệnh giá điểm từ 100 đến 500
            for points_str in ["100", "200", "300", "400", "500"]:
                questions_in_level = pool.get(points_str, [])
                
                if questions_in_level:
                    # Bước C: Chọn ngẫu nhiên 1 câu trong số (thường là 3 câu) của mức điểm đó
                    chosen_q = random.choice(questions_in_level)
                    
                    # Đảm bảo field points là kiểu int để Frontend dễ xử lý
                    q_data = chosen_q.copy()
                    q_data["points"] = int(points_str)
                    
                    new_cat["questions"].append(q_data)
            
            final_categories.append(new_cat)
            
        return {"categories": final_categories}
    
    except Exception as e:
        print(f"Lỗi khi đọc hoặc xử lý JSON: {e}")
        return {"categories": []}

# Khởi tạo dữ liệu câu hỏi ngay khi chạy server (30 câu ngẫu nhiên)
QUESTIONS_DATA = load_random_questions()

# 3. Trạng thái Game
game_state = {
    "players": {},
    "buzzer_locked": False,
    "winner": None
}

@app.get("/questions")
async def get_questions():
    """Endpoint trả về bộ 30 câu hỏi đã được bốc thăm ngẫu nhiên"""
    return QUESTIONS_DATA

@app.get("/refresh-questions")
async def refresh_questions():
    """Endpoint để bốc lại bộ câu hỏi mới mà không cần restart server (tùy chọn)"""
    global QUESTIONS_DATA
    QUESTIONS_DATA = load_random_questions()
    return {"message": "Đã đổi bộ câu hỏi mới!", "data": QUESTIONS_DATA}

# 4. Các sự kiện Socket.io
@sio.event
async def connect(sid, environ):
    print(f"Connected: {sid}")

@sio.event
async def player_join(sid, data):
    name = data.get("name")
    game_state["players"][sid] = {"name": name, "score": 0}
    await sio.emit('player_update', game_state["players"])

@sio.event
async def show_question(sid, data):
    game_state["buzzer_locked"] = False
    game_state["winner"] = None
    await sio.emit('show_question', data)

@sio.event
async def enable_buzzer(sid):
    game_state["buzzer_locked"] = False
    await sio.emit('enable_buzzer')

@sio.event
async def press_buzzer(sid, data):
    if not game_state["buzzer_locked"]:
        game_state["buzzer_locked"] = True
        game_state["winner"] = data["name"]
        await sio.emit('buzzer_locked', {"winner": data["name"]})

@sio.event
async def update_score(sid, data):
    for p_sid, info in game_state["players"].items():
        if info["name"] == data["player_name"]:
            info["score"] += data["points"]
            break
    await sio.emit('player_update', game_state["players"])

@sio.event
async def close_question(sid):
    await sio.emit('close_question')

@sio.event
async def disconnect(sid):
    if sid in game_state["players"]:
        del game_state["players"][sid]
    await sio.emit('player_update', game_state["players"])

if __name__ == "__main__":
    print("HUST Jeopardy Server - Randomized 30 Questions Edition")
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)