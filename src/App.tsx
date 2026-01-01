import { FormEvent, useState } from 'react';
import './App.css';

function App() {
  const [username, setUsername] = useState('פנחס');
  const [password, setPassword] = useState('613613');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="page">
      <div className="card">
        <h1 className="title">התחברות</h1>
        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>שם משתמש</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="הקלד שם משתמש"
              required
            />
          </label>
          <label className="field">
            <span>סיסמה</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="הקלד סיסמה"
              required
            />
          </label>
          <button type="submit" className="submit-button">התחבר</button>
        </form>
      </div>
    </div>
  );
}

export default App;
