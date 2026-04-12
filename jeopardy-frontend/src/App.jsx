import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Trophy, Monitor, Bell, Zap, User, Star, 
  Check, X, Eye, EyeOff, Settings, Users, Play, Clock 
} from 'lucide-react';

const SOCKET_URL = "http://localhost:8000";

// --- 1. CẤU HÌNH & QUẢN LÝ ÂM THANH (Đưa lên đầu) ---
const SOUND_PATHS = {
  INTRO: "/sounds/intro.mp3",
  OPEN_QUESTION: "/sounds/open_question.mp3",
  BUZZER: "/sounds/buzzer.mp3",
  CORRECT: "/sounds/correct.mp3",
  WRONG: "/sounds/wrong.mp3",
  TIMER_15S: "/sounds/timer_15s.mp3",
};

const soundManager = {
  timerAudio: null,
  init: () => {
    if (!soundManager.timerAudio) {
      soundManager.timerAudio = new Audio(SOUND_PATHS.TIMER_15S);
      soundManager.timerAudio.preload = "auto";
    }
  },
  play: (path) => {
    const audio = new Audio(path);
    audio.play().catch(e => console.warn("Audio blocked:", e));
  },
  playTimer: () => {
    if (!soundManager.timerAudio) soundManager.init();
    soundManager.timerAudio.currentTime = 0;
    soundManager.timerAudio.play().catch(e => console.warn("Timer error:", e));
  },
  stopTimer: () => {
    if (soundManager.timerAudio) {
      soundManager.timerAudio.pause();
      soundManager.timerAudio.currentTime = 0;
    }
  }
};

// --- 2. CÁC COMPONENT NHỎ (REUSABLE) ---
const MiniScoreboard = ({ players, winnerName }) => (
  <div className="flex flex-wrap gap-2 justify-center py-2 bg-black/20 rounded-xl mb-4 w-full">
    {Object.values(players).map((p, i) => (
      <div key={i} className={`px-3 py-1 rounded-lg border-2 flex items-center gap-2 transition-all ${winnerName === p.name ? 'border-yellow-400 bg-yellow-400/20 scale-105 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'border-white/10 bg-white/5 opacity-80'}`}>
        <span className="text-[10px] font-bold uppercase truncate max-w-[60px]">{p.name}</span>
        <span className="font-black text-sm text-[#ffcc00]">${p.score}</span>
      </div>
    ))}
  </div>
);

const TimerDisplay = ({ seconds }) => (
  <div className={`flex items-center gap-2 px-4 py-2 rounded-full border-4 transition-colors ${seconds <= 5 && seconds > 0 ? 'bg-red-600 border-white animate-pulse' : 'bg-[#060ce9] border-[#ffcc00]'}`}>
    <Clock size={20} className="text-white" />
    <span className="text-2xl font-black">{seconds}s</span>
  </div>
);

// --- 3. MÀN HÌNH CHÍNH (SCREEN) ---
const ScreenApp = ({ socket }) => {
  const [categories, setCategories] = useState([]);
  const [players, setPlayers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [winner, setWinner] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef(null);

  useEffect(() => {
    soundManager.init();
    socket.emit('request_init');
    
    socket.on('init_data', (data) => {
      if (data.categories) setCategories(data.categories);
      if (data.current_question) setCurrentQuestion(data.current_question);
    });

    socket.on('player_update', (p) => setPlayers(p));
    
    socket.on('show_question', (q) => { 
      setCurrentQuestion(q); 
      setWinner(null); 
      soundManager.play(SOUND_PATHS.OPEN_QUESTION); 
    });
    
    socket.on('buzzer_locked', (data) => {
      setWinner(data.winner);
      soundManager.play(SOUND_PATHS.BUZZER);
      startTimer();
    });

    socket.on('play_score_sound', (data) => {
      soundManager.stopTimer();
      if (data.points > 0) soundManager.play(SOUND_PATHS.CORRECT);
      else soundManager.play(SOUND_PATHS.WRONG);
    });

    socket.on('stop_timer_all', () => {
      clearInterval(timerRef.current);
      setTimeLeft(15);
      soundManager.stopTimer();
    });

    socket.on('close_question', () => { 
      setCurrentQuestion(null); 
      setWinner(null); 
      clearInterval(timerRef.current);
      soundManager.stopTimer();
    });

    return () => clearInterval(timerRef.current);
  }, [socket]);

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimeLeft(15);
    soundManager.playTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="h-screen w-screen bg-[#000839] p-6 text-white flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-6xl font-black italic text-[#ffcc00] drop-shadow-2xl">JEOPARDY!</h1>
        {winner && <TimerDisplay seconds={timeLeft} />}
      </div>

      {currentQuestion ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-2xl text-blue-400 font-bold uppercase mb-4">{currentQuestion.category} - {currentQuestion.points}</div>
          <div className="bg-[#060ce9] p-12 rounded-[3rem] border-8 border-[#ffcc00] shadow-2xl max-w-5xl">
            <h2 className="text-5xl font-black italic leading-tight uppercase">"{currentQuestion.question}"</h2>
          </div>
          {winner && (
            <div className="mt-12 scale-150 flex flex-col items-center gap-2">
               <div className="bg-white text-[#000839] px-12 py-4 rounded-full text-5xl font-black border-8 border-[#ffcc00] animate-bounce">
                  {winner}
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-4 h-full pb-32">
          {categories.map((cat, i) => (
            <div key={i} className="flex flex-col gap-4">
              <div className="bg-[#060ce9] h-20 flex items-center justify-center p-2 text-center rounded-xl border-2 border-white/20">
                <span className="font-black uppercase text-xs leading-none">{cat.name}</span>
              </div>
              {cat.questions.map((q, j) => (
                <div key={j} className={`flex-1 flex items-center justify-center rounded-xl border-4 transition-all ${q.is_answered ? 'opacity-10 shadow-inner' : 'bg-[#060ce9] border-[#ffcc00]'}`}>
                   {!q.is_answered && <span className="text-4xl font-black text-[#ffcc00] italic">{q.points}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#000839] flex justify-center gap-4">
        {Object.values(players).map((p, i) => (
          <div key={i} className={`px-6 py-3 rounded-2xl border-4 min-w-[150px] text-center transition-all ${winner === p.name ? 'bg-yellow-500 border-white scale-110 shadow-lg' : 'bg-[#060ce9] border-[#ffcc00]/50'}`}>
            <div className="text-[10px] font-black uppercase opacity-60">{p.name}</div>
            <div className="text-3xl font-black italic">${p.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 4. MÀN HÌNH ĐIỀU KHIỂN (HOST) ---
const HostApp = ({ socket }) => {
  const [categories, setCategories] = useState([]);
  const [players, setPlayers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [winner, setWinner] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef(null);

  useEffect(() => {
    socket.emit('request_init');
    socket.on('init_data', (data) => { setCategories(data.categories || []); if(data.current_question) setCurrentQuestion(data.current_question); });
    socket.on('player_update', (p) => setPlayers(p));
    socket.on('show_question', (q) => { setCurrentQuestion(q); setWinner(null); });
    socket.on('buzzer_locked', (data) => { setWinner(data.winner); startTimer(); });
    socket.on('close_question', () => { setCurrentQuestion(null); setWinner(null); stopTimerLogic(); });
    socket.on('stop_timer_all', () => stopTimerLogic());

    return () => stopTimerLogic();
  }, [socket]);

  const startTimer = () => {
    stopTimerLogic();
    setTimeLeft(15);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimerLogic = () => {
    clearInterval(timerRef.current);
    setTimeLeft(15);
  };

  const handleScore = (isCorrect) => {
    if (!winner) return;
    const points = currentQuestion.points * (isCorrect ? 1 : -1);
    socket.emit('stop_timer_all');
    socket.emit('play_score_sound', { points }); 
    socket.emit('update_score', { player_name: winner, points });
    if (isCorrect) socket.emit('close_question');
    else setWinner(null);
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col p-4 gap-4 text-white">
      <div className="flex justify-between items-center">
        <h2 className="font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2">
            <Settings size={20}/> ĐIỀU KHIỂN
        </h2>
        {winner && <TimerDisplay seconds={timeLeft} />}
      </div>

      <MiniScoreboard players={players} winnerName={winner} />

      <div className="flex flex-1 gap-4 min-h-0">
        <div className="flex-[3] grid grid-cols-6 gap-2 overflow-y-auto pr-2">
          {categories.map((cat, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="bg-slate-800 p-2 rounded text-[9px] font-black text-center h-10 flex items-center justify-center uppercase leading-tight">{cat.name}</div>
              {cat.questions.map((q, j) => (
                <button key={j} disabled={q.is_answered || !!currentQuestion}
                  onClick={() => socket.emit('show_question', {...q, category: cat.name})}
                  className={`h-12 rounded font-black text-sm transition-all ${q.is_answered ? 'bg-black text-slate-800' : 'bg-indigo-900 text-yellow-400 border border-indigo-700 active:scale-95'}`}>
                  {q.points}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="flex-[2] bg-slate-900 rounded-3xl p-6 border border-white/10 flex flex-col gap-4 shadow-2xl">
          {currentQuestion ? (
            <>
              <div className="bg-black/40 p-4 rounded-xl flex-1 overflow-y-auto">
                <p className="text-xs text-blue-400 font-bold uppercase mb-2">{currentQuestion.category} - {currentQuestion.points}</p>
                <p className="font-bold italic text-lg leading-snug">"{currentQuestion.question}"</p>
                <div className="mt-4 pt-4 border-t border-white/5">
                   <p className="text-[10px] text-white/40 uppercase font-black">Đáp án:</p>
                   <p className="text-green-400 font-black">{currentQuestion.answer}</p>
                </div>
              </div>
              
              {!winner ? (
                 <button onClick={() => socket.emit('enable_buzzer')} className="bg-yellow-500 text-black font-black py-6 rounded-2xl text-2xl shadow-lg active:scale-95 transition-all">MỞ CHUÔNG</button>
              ) : (
                <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border-2 border-yellow-500 animate-pulse">
                  <p className="text-center font-black text-yellow-500 uppercase">{winner} ĐANG TRẢ LỜI...</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleScore(true)} className="bg-green-600 h-20 rounded-xl flex items-center justify-center hover:bg-green-500 active:scale-90 transition-all shadow-lg"><Check size={40}/></button>
                    <button onClick={() => handleScore(false)} className="bg-red-600 h-20 rounded-xl flex items-center justify-center hover:bg-red-500 active:scale-90 transition-all shadow-lg"><X size={40}/></button>
                  </div>
                </div>
              )}
              <button onClick={() => { socket.emit('stop_timer_all'); socket.emit('close_question'); }} className="text-red-500/50 uppercase text-[10px] font-black hover:text-red-500 mt-2 transition-colors">Đóng câu hỏi</button>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/10 italic text-center uppercase tracking-widest px-8">Chọn một ô điểm từ bảng bên trái</div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 5. MÀN HÌNH NGƯỜI CHƠI (PLAYER) ---
const PlayerApp = ({ socket }) => {
  const [name, setName] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [status, setStatus] = useState("idle");
  const [players, setPlayers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef(null);
  const nameRef = useRef("");

  useEffect(() => {
    socket.emit('request_init');
    socket.on('init_data', (data) => { if(data.current_question) setCurrentQuestion(data.current_question); });
    socket.on('player_update', (p) => setPlayers(p));
    socket.on('show_question', (q) => { setCurrentQuestion(q); setStatus("idle"); });
    socket.on('enable_buzzer', () => setStatus("active"));
    socket.on('buzzer_locked', (data) => {
      const isMe = data.winner === nameRef.current;
      setStatus(isMe ? "winner" : "locked");
      startTimer();
    });
    socket.on('stop_timer_all', () => stopTimerLogic());
    socket.on('close_question', () => { setStatus("idle"); setCurrentQuestion(null); stopTimerLogic(); });

    return () => stopTimerLogic();
  }, [socket]);

  const startTimer = () => {
    stopTimerLogic();
    setTimeLeft(15);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimerLogic = () => {
    clearInterval(timerRef.current);
    setTimeLeft(15);
  };

  if (!isJoined) {
    return (
      <div className="h-screen w-screen bg-[#000839] flex items-center justify-center p-6 text-white text-center">
        <div className="bg-[#001b6e] p-8 rounded-[2rem] border-4 border-[#ffcc00] w-full max-w-sm shadow-2xl">
          <h1 className="text-3xl font-black mb-8 italic uppercase text-[#ffcc00]">ĐĂNG KÝ TÊN</h1>
          <input type="text" placeholder="NHẬP TÊN..." value={name} onChange={(e) => setName(e.target.value.toUpperCase())} className="w-full bg-black/40 p-4 rounded-xl mb-6 border-2 border-white/10 text-center font-black text-2xl outline-none focus:border-[#ffcc00] uppercase"/>
          <button onClick={() => { if(name.trim()){ nameRef.current = name; socket.emit('player_join', {name}); setIsJoined(true); }}} className="w-full bg-[#ffcc00] text-black font-black py-5 rounded-2xl shadow-xl active:scale-95 text-xl">VÀO PHÒNG</button>
        </div>
      </div>
    );
  }

  const myData = Object.values(players).find(p => p.name === nameRef.current);

  return (
    <div className={`h-screen w-screen flex flex-col p-4 transition-all duration-500 ${status === 'active' ? 'bg-green-700' : status === 'winner' ? 'bg-yellow-600' : 'bg-[#000839]'}`}>
      <div className="flex justify-between items-start text-white mb-4">
        <div>
           <div className="text-[10px] font-black opacity-60 uppercase tracking-widest">Người chơi</div>
           <div className="text-xl font-black italic">{nameRef.current}</div>
           <div className="text-3xl font-black text-[#ffcc00] drop-shadow-md">${myData?.score || 0}</div>
        </div>
        {(status === 'winner' || status === 'locked') && <TimerDisplay seconds={timeLeft} />}
      </div>

      <div className="bg-black/30 p-5 rounded-2xl border border-white/10 mb-6 min-h-[120px] flex flex-col justify-center text-white">
        {currentQuestion ? (
          <>
            <p className="text-[10px] text-blue-400 font-black uppercase mb-1 tracking-widest">{currentQuestion.category} - {currentQuestion.points}đ</p>
            <p className="text-xl font-bold italic leading-tight">"{currentQuestion.question}"</p>
          </>
        ) : (
          <p className="text-center text-white/20 italic uppercase text-sm">Đang đợi câu hỏi...</p>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <button 
          onClick={() => status === "active" && socket.emit('press_buzzer', { name: nameRef.current, client_time: Date.now() })}
          className={`w-64 h-64 rounded-full border-[15px] shadow-2xl flex items-center justify-center active:scale-90 transition-all ${status === 'active' ? 'bg-red-600 border-white animate-pulse' : status === 'winner' ? 'bg-white border-yellow-400' : 'bg-gray-900 border-gray-800 opacity-40'}`}>
          <Zap size={90} fill={status === 'active' ? 'white' : status === 'winner' ? '#eab308' : 'transparent'} strokeWidth={status === 'active' ? 0 : 2} />
        </button>
        <div className="text-white font-black text-2xl uppercase italic text-center drop-shadow-lg px-4">
            {status === 'active' ? 'BẤM CHUÔNG!!!' : status === 'winner' ? 'BẠN ĐANG TRẢ LỜI!' : status === 'locked' ? 'HẾT LƯỢT' : 'CHỜ HIỆU LỆNH...'}
        </div>
      </div>
      
      <div className="mt-6">
         <MiniScoreboard players={players} winnerName={status === 'winner' ? nameRef.current : null} />
      </div>
    </div>
  );
};

// --- 6. COMPONENT APP (ENTRY POINT) ---
export default function App() {
  const [role, setRole] = useState(null);
  const socket = useMemo(() => io(SOCKET_URL), []);

  if (!role) {
    return (
      <div className="h-screen w-screen bg-[#000839] flex flex-col items-center justify-center text-white p-6">
        <div className="mb-16 text-center">
            <h1 className="text-7xl md:text-9xl font-black italic text-[#ffcc00] drop-shadow-2xl leading-none">JEOPARDY!</h1>
            <p className="text-blue-400 font-black tracking-[0.5em] mt-2 uppercase text-xs md:text-sm">Bách Khoa Championship</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          <button onClick={() => setRole('host')} className="group p-8 bg-white/5 border-2 border-white/10 rounded-[3rem] hover:bg-indigo-600 hover:border-[#ffcc00] hover:scale-105 transition-all flex flex-col items-center gap-4 shadow-xl">
            <Settings size={40} className="group-hover:rotate-90 transition-transform duration-500" />
            <span className="font-black text-xl italic uppercase">ĐIỀU KHIỂN</span>
          </button>
          <button onClick={() => setRole('screen')} className="group p-8 bg-white/5 border-2 border-white/10 rounded-[3rem] hover:bg-blue-600 hover:border-[#ffcc00] hover:scale-105 transition-all flex flex-col items-center gap-4 shadow-xl">
            <Monitor size={40} />
            <span className="font-black text-xl italic uppercase">MÀN HÌNH CHÍNH</span>
          </button>
          <button onClick={() => setRole('player')} className="group p-8 bg-white/5 border-2 border-white/10 rounded-[3rem] hover:bg-green-600 hover:border-[#ffcc00] hover:scale-105 transition-all flex flex-col items-center gap-4 shadow-xl">
            <Users size={40} />
            <span className="font-black text-xl italic uppercase">NGƯỜI CHƠI</span>
          </button>
        </div>
      </div>
    );
  }

  // Luôn đảm bảo ScreenApp, HostApp, PlayerApp đã được định nghĩa ở trên
  return (
    <div className="select-none overflow-hidden touch-none">
      {role === 'host' && <HostApp socket={socket} />}
      {role === 'screen' && <ScreenApp socket={socket} />}
      {role === 'player' && <PlayerApp socket={socket} />}
    </div>
  );
}