import React, { useState } from "react";

const QuizGenerator = () => {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(3);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateQuiz = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch("/api/ai-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic, count }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate quiz questions");
      }

      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.error("Error generating quiz:", err);
      setError("Failed to generate quiz questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quiz-generator">
      <h2>AI Quiz Generator</h2>
      <form onSubmit={generateQuiz}>
        <div className="form-group">
          <label htmlFor="topic">Topic:</label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Science, History, Movies"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="count">Number of Questions:</label>
          <select
            id="count"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          >
            <option value="1">1</option>
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="10">10</option>
          </select>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Generating..." : "Generate Quiz"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {questions.length > 0 && (
        <div className="quiz-questions">
          <h3>Your Quiz Questions:</h3>
          {questions.map((q, index) => (
            <div key={index} className="question-card">
              <h4>Question {index + 1}: {q.question}</h4>
              <ul>
                {q.options.map((option, i) => (
                  <li key={i} className={option === q.answer ? "correct-answer" : ""}>
                    {option}
                  </li>
                ))}
              </ul>
              <p className="answer">Answer: {q.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizGenerator; 