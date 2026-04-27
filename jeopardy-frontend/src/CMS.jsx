import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Save, X, Database, BookOpen, 
  HelpCircle, Award, CheckCircle, BarChart3, RefreshCw 
} from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : `http://${window.location.hostname}:8000`;

const CMSApp = ({ onBack }) => {
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [newQuestion, setNewQuestion] = useState({
    category_id: null,
    points: 100,
    question: '',
    answer: ''
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/cms/categories`);
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchQuestions = async (categoryId) => {
    setLoading(true);
    try {
      const url = categoryId 
        ? `${API_URL}/cms/questions?category_id=${categoryId}`
        : `${API_URL}/cms/questions`;
      const res = await fetch(url);
      const data = await res.json();
      setQuestions(data);
      setSelectedCategory(categoryId);
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/cms/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await fetch(`${API_URL}/cms/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory })
      });
      setNewCategory('');
      fetchCategories();
      fetchStats();
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Xóa lĩnh vực này? Tất cả câu hỏi sẽ bị xóa!')) return;
    try {
      await fetch(`${API_URL}/cms/categories/${id}`, { method: 'DELETE' });
      fetchCategories();
      fetchStats();
      if (selectedCategory === id) {
        setSelectedCategory(null);
        setQuestions([]);
      }
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.question.trim() || !newQuestion.answer.trim() || !newQuestion.category_id) return;
    try {
      await fetch(`${API_URL}/cms/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuestion)
      });
      setNewQuestion({ ...newQuestion, question: '', answer: '' });
      fetchQuestions(newQuestion.category_id);
      fetchStats();
    } catch (err) {
      console.error('Error adding question:', err);
    }
  };

  const handleUpdateQuestion = async (id, updates) => {
    try {
      await fetch(`${API_URL}/cms/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      fetchQuestions(selectedCategory);
      fetchStats();
    } catch (err) {
      console.error('Error updating question:', err);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm('Xóa câu hỏi này?')) return;
    try {
      await fetch(`${API_URL}/cms/questions/${id}`, { method: 'DELETE' });
      fetchQuestions(selectedCategory);
      fetchStats();
    } catch (err) {
      console.error('Error deleting question:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Database size={32} className="text-blue-400" />
          <h1 className="text-3xl font-black">QUẢN LÝ CÂU HỎI</h1>
        </div>
        <button 
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-all"
        >
          ← QUAY LẠI GAME
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <BookOpen size={20} />
              <span className="text-sm font-bold uppercase">Lĩnh vực</span>
            </div>
            <p className="text-3xl font-black">{stats.total_categories}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <HelpCircle size={20} />
              <span className="text-sm font-bold uppercase">Câu hỏi</span>
            </div>
            <p className="text-3xl font-black">{stats.total_questions}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <CheckCircle size={20} />
              <span className="text-sm font-bold uppercase">Hoạt động</span>
            </div>
            <p className="text-3xl font-black">{stats.active_questions}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Award size={20} />
              <span className="text-sm font-bold uppercase">Điểm</span>
            </div>
            <div className="flex gap-1 text-xs flex-wrap">
              {Object.entries(stats.points_distribution || {}).map(([points, count]) => (
                <span key={points} className="bg-gray-700 px-2 py-1 rounded">
                  {points}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Categories Panel */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">
            <BookOpen size={20} /> LĨNH VỰC
          </h2>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="Tên lĩnh vực mới..."
              className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleAddCategory}
              className="bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-2"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {categories.map(cat => (
              <div
                key={cat.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  selectedCategory === cat.id 
                    ? 'bg-blue-600 border-blue-400' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                onClick={() => fetchQuestions(cat.id)}
              >
                <div>
                  <p className="font-bold text-sm">{cat.name}</p>
                  <p className="text-xs text-gray-400">{cat.question_count} câu hỏi</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(cat.id);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Questions Panel */}
        <div className="col-span-2 bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black flex items-center gap-2">
              <HelpCircle size={20} /> CÂU HỎI
              {selectedCategory && (
                <span className="text-sm text-gray-400">
                  - {categories.find(c => c.id === selectedCategory)?.name}
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  fetchQuestions(selectedCategory);
                  fetchStats();
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {/* Add Question Form */}
          {selectedCategory && (
            <div className="bg-gray-700/50 rounded-xl p-4 mb-4 border border-gray-600">
              <h3 className="font-bold text-sm mb-3">Thêm câu hỏi mới</h3>
              <div className="grid grid-cols-4 gap-3 mb-3">
                <select
                  value={newQuestion.points}
                  onChange={(e) => setNewQuestion({ 
                    ...newQuestion, 
                    points: parseInt(e.target.value),
                    category_id: selectedCategory 
                  })}
                  className="bg-gray-600 rounded-lg px-3 py-2 text-sm"
                >
                  <option value={100}>100 điểm</option>
                  <option value={200}>200 điểm</option>
                  <option value={300}>300 điểm</option>
                  <option value={400}>400 điểm</option>
                  <option value={500}>500 điểm</option>
                </select>
                <input
                  type="text"
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ 
                    ...newQuestion, 
                    question: e.target.value,
                    category_id: selectedCategory 
                  })}
                  placeholder="Câu hỏi..."
                  className="col-span-2 bg-gray-600 rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={newQuestion.answer}
                  onChange={(e) => setNewQuestion({ 
                    ...newQuestion, 
                    answer: e.target.value,
                    category_id: selectedCategory 
                  })}
                  placeholder="Đáp án..."
                  className="bg-gray-600 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleAddQuestion}
                className="w-full bg-green-600 hover:bg-green-700 rounded-lg py-2 font-bold text-sm"
              >
                + Thêm câu hỏi
              </button>
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-center text-gray-400 py-8">Đang tải...</p>
            ) : questions.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                {selectedCategory 
                  ? 'Chưa có câu hỏi nào trong lĩnh vực này'
                  : 'Chọn một lĩnh vực để xem câu hỏi'}
              </p>
            ) : (
              questions.map(q => (
                <div key={q.id} className="bg-gray-700/50 rounded-lg p-3 flex items-start gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    q.points === 500 ? 'bg-yellow-600' :
                    q.points === 400 ? 'bg-red-600' :
                    q.points === 300 ? 'bg-blue-600' :
                    q.points === 200 ? 'bg-green-600' :
                    'bg-purple-600'
                  }`}>
                    {q.points}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{q.question}</p>
                    <p className="text-xs text-green-400 mt-1">Đáp án: {q.answer}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleUpdateQuestion(q.id, { 
                        is_active: !q.is_active 
                      })}
                      className={`text-xs px-2 py-1 rounded ${
                        q.is_active 
                          ? 'bg-green-600/20 text-green-400' 
                          : 'bg-red-600/20 text-red-400'
                      }`}
                    >
                      {q.is_active ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CMSApp;