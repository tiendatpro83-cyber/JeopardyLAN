import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { Trophy, Monitor, Bell, Zap, User, Star, Check, X, Eye, EyeOff } from 'lucide-react';

const SOCKET_URL = "http://localhost:8000";

// --- STYLE CHUNG (REUSABLE COMPONENTS) ---
const Layout = ({ children, title, subtitle }) => (
  <div className="h-screen w-screen bg-[#000839] flex flex-col p-4 overflow-hidden font-sans text-white">
    <div className="flex justify-between items-end mb-4 px-4 h-[10vh]">
      <div>
        <h1 className="text-5xl md:text-6xl font-black italic text-[#ffcc00] tracking-tighter leading-none drop-shadow-lg">JEOPARDY!</h1>
        <p className="text-blue-400 font-bold tracking-[0.3em] uppercase text-xs mt-1 opacity-80">{subtitle || "HUST CHAMPIONSHIP 2026"}</p>
      </div>
      {title && (
        <div className="bg-[#060ce9] px-6 py-3 rounded-2xl border-4 border-[#ffcc00] shadow-xl transform -rotate-1 hidden md:flex items-center gap-3">
          <Trophy className="text-white" size={24} />
          <span className="text-xl font-black italic uppercase tracking-tighter">{title}</span>
        </div>
      )}
    </div>
    <div className="flex-grow flex flex-col gap-4 h-[85vh]">
      {children}
    </div>
  </div>
);

// --- MÀN HÌNH NGƯỜI CHƠI (PLAYER) ---
const PlayerApp = ({ socket }) => {
  const [name, setName] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [status, setStatus] = useState("idle"); 
  const nameRef = useRef("");

  useEffect(() => {
    const handleEnableBuzzer = () => setStatus("active");
    const handleBuzzerLocked = (data) => setStatus(data.winner === nameRef.current ? "winner" : "locked");
    const handleCloseQuestion = () => setStatus("idle");

    socket.on('enable_buzzer', handleEnableBuzzer);
    socket.on('buzzer_locked', handleBuzzerLocked);
    socket.on('close_question', handleCloseQuestion);
    return () => {
      socket.off('enable_buzzer'); socket.off('buzzer_locked'); socket.off('close_question');
    };
  }, [socket]);

  if (!isJoined) {
    return (
      <div className="h-screen w-screen bg-[#000839] flex items-center justify-center p-6">
        <div className="bg-[#001b6e] p-10 rounded-[3rem] border-8 border-[#ffcc00] shadow-2xl w-full max-w-md text-center">
          <h1 className="text-4xl font-black text-[#ffcc00] mb-8 italic">PLAYER JOIN</h1>
          <input 
            type="text" placeholder="TÊN THÍ SINH..." 
            className="w-full bg-[#000839] border-4 border-[#ffcc00] p-5 rounded-2xl text-white text-2xl font-bold mb-6 focus:outline-none uppercase text-center"
            value={name} onChange={(e) => setName(e.target.value)}
          />
          <button onClick={() => { nameRef.current = name; socket.emit('player_join', { name }); setIsJoined(true); }}
            className="w-full bg-[#ffcc00] text-[#000839] font-black py-5 rounded-2xl text-3xl hover:scale-105 transition-all">SẴN SÀNG</button>
        </div>
      </div>
    );
  }

  return (
    <Layout subtitle={`PLAYER: ${name}`}>
      <div className={`flex-grow rounded-[3rem] border-8 border-white/10 flex flex-col items-center justify-center transition-all duration-500 ${
        status === 'active' ? 'bg-green-600 shadow-[inset_0_0_100px_rgba(255,255,255,0.3)]' : 
        status === 'winner' ? 'bg-yellow-500' : 
        status === 'locked' ? 'bg-red-900' : 'bg-[#001b6e]'
      }`}>
        <button 
          onClick={() => status === "active" && socket.emit('press_buzzer', { name: nameRef.current })}
          className={`w-64 h-64 rounded-full border-[16px] flex items-center justify-center shadow-2xl transition-all ${
            status === 'active' ? 'bg-red-600 border-white animate-pulse scale-110' : 'bg-gray-800 border-gray-700 opacity-40'
          }`}
        >
          <Zap size={100} fill="white" />
        </button>
        <h2 className="mt-12 text-4xl font-black italic uppercase tracking-[0.2em]">
          {status === 'active' ? 'BẤM CHUÔNG!!' : status === 'winner' ? 'BẠN ĐƯỢC CHỌN!' : 'ĐỢI LỆNH...'}
        </h2>
      </div>
    </Layout>
  );
};

// --- MÀN HÌNH CHÍNH (SCREEN) ---
const ScreenApp = ({ socket, questions }) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [buzzerWinner, setBuzzerWinner] = useState(null);
  const [players, setPlayers] = useState({});
  const [openedQuestions, setOpenedQuestions] = useState(new Set());
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);

  useEffect(() => {
    socket.on('player_update', (data) => setPlayers(data));
    socket.on('show_question', (data) => { setCurrentQuestion(data); setIsAnswerVisible(false); setOpenedQuestions(prev => new Set([...prev, data.id])); });
    socket.on('buzzer_locked', (data) => setBuzzerWinner(data.winner));
    socket.on('show_answer', (visible) => setIsAnswerVisible(visible));
    socket.on('close_question', () => { setCurrentQuestion(null); setBuzzerWinner(null); });
    return () => ["player_update", "show_question", "buzzer_locked", "show_answer", "close_question"].forEach(e => socket.off(e));
  }, [socket]);

  return (
    <Layout title="BẢNG THI ĐẤU">
      {currentQuestion ? (
        <div className="flex-grow flex flex-col items-center justify-center bg-[#060ce9] rounded-[3rem] border-[10px] border-[#ffcc00] shadow-2xl p-10 relative overflow-hidden">
          <div className="absolute top-10 bg-[#ffcc00] text-[#000839] px-12 py-3 rounded-full text-5xl font-black shadow-xl border-4 border-white">{currentQuestion.points}</div>
          <h2 className="text-6xl font-black text-center uppercase italic drop-shadow-[5px_5px_0px_rgba(0,0,0,1)] leading-tight mt-10">"{currentQuestion.question}"</h2>
          {isAnswerVisible && <div className="mt-8 p-6 bg-green-600 border-4 border-white rounded-3xl animate-bounce text-5xl font-black text-white italic">{currentQuestion.answer}</div>}
          {buzzerWinner && !isAnswerVisible && <div className="mt-12 bg-yellow-400 text-blue-900 px-10 py-4 rounded-2xl text-4xl font-black animate-pulse border-4 border-white uppercase">{buzzerWinner} ĐANG TRẢ LỜI</div>}
        </div>
      ) : (
        <div className="flex-grow grid grid-cols-6 gap-2">
          {questions.categories?.map((cat, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="bg-[#001b6e] border-b-4 border-[#ffcc00] h-[15vh] flex items-center justify-center p-2 text-center rounded-t-lg shadow-lg border-x border-t border-white/10">
                <h3 className="text-white font-black text-sm md:text-base uppercase italic leading-none">{cat.name}</h3>
              </div>
              {[100, 200, 300, 400, 500].map(pts => {
                const q = cat.questions.find(item => item.points === pts);
                const isOpened = q ? openedQuestions.has(q.id) : false;
                return (
                  <div key={pts} className={`flex-grow flex items-center justify-center rounded-lg border-2 border-black transition-all ${isOpened ? 'bg-blue-950 opacity-20' : 'bg-[#060ce9] shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]'}`}>
                    {!isOpened && <span className="text-5xl font-black text-[#ffcc00] italic drop-shadow-md">{pts}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {/* Scoreboard Fill Width */}
      <div className="h-[18vh] flex justify-center gap-4">
        {Object.values(players).map((p, i) => (
          <div key={i} className="flex flex-col w-full max-w-[250px]">
            <div className="bg-yellow-400 text-[#000839] font-black text-center py-1 rounded-t-xl border-x-4 border-t-4 border-white text-lg uppercase truncate px-2">{p.name}</div>
            <div className="bg-[#001b6e] flex-grow rounded-b-xl border-4 border-white shadow-xl flex items-center justify-center">
              <span className="text-[#ffcc00] text-5xl font-black italic">${p.score.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};

// --- MÀN HÌNH ĐIỀU KHIỂN (HOST) ---
const HostApp = ({ socket, questions }) => {
  const [players, setPlayers] = useState({});
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [buzzerWinner, setBuzzerWinner] = useState(null);
  const [openedQuestions, setOpenedQuestions] = useState(new Set());
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);

  useEffect(() => {
    socket.on('player_update', (data) => setPlayers(data));
    socket.on('buzzer_locked', (data) => setBuzzerWinner(data.winner));
    return () => { socket.off('player_update'); socket.off('buzzer_locked'); };
  }, [socket]);

  return (
    <Layout title="HOST CONTROL">
      <div className="flex-grow flex gap-4 overflow-hidden">
        {/* Board Selection */}
        <div className="flex-[3] grid grid-cols-6 gap-2">
          {questions.categories?.map((cat, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="bg-slate-800 border-b-2 border-indigo-400 h-[8vh] flex items-center justify-center p-1 text-center rounded-t-md">
                <span className="text-[10px] font-black uppercase opacity-70 leading-none">{cat.name}</span>
              </div>
              {[100, 200, 300, 400, 500].map(pts => {
                const q = cat.questions.find(item => item.points === pts);
                const isOpened = q ? openedQuestions.has(q.id) : false;
                return (
                  <button key={pts} disabled={isOpened} onClick={() => { setActiveQuestion(q); setOpenedQuestions(prev => new Set([...prev, q.id])); socket.emit('show_question', q); }}
                    className={`flex-grow rounded-md font-black text-2xl transition-all ${isOpened ? 'bg-slate-900 text-slate-700 opacity-20' : 'bg-indigo-700 hover:bg-indigo-500 border-2 border-transparent hover:border-white'}`}>
                    {pts}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {/* Control Panel */}
        <div className="flex-1 bg-slate-900 rounded-3xl p-4 border border-white/10 flex flex-col gap-4">
          <div className="flex-grow overflow-y-auto space-y-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">BẢNG XẾP HẠNG</p>
            {Object.values(players).map((p, i) => (
              <div key={i} className="bg-slate-800 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="font-bold text-sm">{p.name}</span>
                <span className="text-xl font-black text-yellow-400">${p.score}</span>
              </div>
            ))}
          </div>
          {activeQuestion && (
            <div className="bg-indigo-600 p-4 rounded-2xl space-y-4 border border-white/20">
              <p className="font-bold text-sm leading-tight italic">"{activeQuestion.question}"</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => { const ns = !isAnswerVisible; setIsAnswerVisible(ns); socket.emit('show_answer', ns); }}
                  className="w-full py-2 bg-white text-indigo-900 rounded-lg font-black text-xs flex items-center justify-center gap-2">
                  {isAnswerVisible ? <EyeOff size={14}/> : <Eye size={14}/>} {isAnswerVisible ? "ẨN" : "HIỆN"} ĐÁP ÁN
                </button>
                {!buzzerWinner ? (
                  <button onClick={() => socket.emit('enable_buzzer')} className="w-full bg-yellow-400 text-blue-900 py-3 rounded-lg font-black text-xs">MỞ CHUÔNG</button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { socket.emit('update_score', { player_name: buzzerWinner, points: activeQuestion.points }); setActiveQuestion(null); setBuzzerWinner(null); socket.emit('close_question'); }} className="bg-green-500 py-3 rounded-lg font-black text-xs">ĐÚNG</button>
                    <button onClick={() => { socket.emit('update_score', { player_name: buzzerWinner, points: -activeQuestion.points }); setActiveQuestion(null); setBuzzerWinner(null); socket.emit('close_question'); }} className="bg-red-500 py-3 rounded-lg font-black text-xs">SAI</button>
                  </div>
                )}
                <button onClick={() => { setActiveQuestion(null); setBuzzerWinner(null); socket.emit('close_question'); }} className="text-[10px] opacity-50 font-bold uppercase underline">Đóng</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

// --- CHỌN VAI TRÒ ---
export default function App() {
  const [role, setRole] = useState(null);
  const [questions, setQuestions] = useState({ categories: [] });
  const socket = useMemo(() => io(SOCKET_URL, { transports: ['websocket'] }), []);

  useEffect(() => {
    fetch(`${SOCKET_URL}/questions`).then(res => res.json()).then(data => setQuestions(data)).catch(console.error);
  }, []);

  if (role === 'host') return <HostApp socket={socket} questions={questions} />;
  if (role === 'screen') return <ScreenApp socket={socket} questions={questions} />;
  if (role === 'player') return <PlayerApp socket={socket} />;

  return (
    <div className="h-screen w-screen bg-[#000839] flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden">
      <div className="text-center mb-16 animate-pulse">
        <h1 className="text-[8rem] font-black italic text-[#ffcc00] tracking-tighter leading-none drop-shadow-2xl">JEOPARDY!</h1>
        <p className="text-blue-400 font-bold tracking-[0.5em] text-xl">HUST EDITION 2026</p>
      </div>
      <div className="flex gap-8 w-full max-w-5xl">
        {[
          { id: 'host', label: 'HOST', icon: Star, color: 'bg-indigo-900 border-indigo-400' },
          { id: 'screen', label: 'SCREEN', icon: Monitor, color: 'bg-blue-900 border-blue-400' },
          { id: 'player', label: 'PLAYER', icon: User, color: 'bg-green-900 border-green-400' }
        ].map(item => (
          <button key={item.id} onClick={() => setRole(item.id)} className={`${item.color} flex-grow p-12 rounded-[3rem] border-4 hover:border-yellow-400 hover:scale-105 transition-all shadow-2xl flex flex-col items-center gap-6 group`}>
            <item.icon size={64} className="text-yellow-400 group-hover:rotate-12 transition-transform" />
            <span className="text-3xl font-black italic uppercase">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}