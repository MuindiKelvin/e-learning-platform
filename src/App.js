// src/components/App.js
import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import 'bootstrap/dist/css/bootstrap.min.css';
import Dashboard from './components/Dashboard';
import CourseManager from './components/CourseManager';
import StudentPortal from './components/StudentPortal';
import Analytics from './components/Analytics';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ 
    email: '', 
    password: '', 
    role: 'student', 
    name: '', 
    studentId: '' 
  });
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: registerData.email,
        role: registerData.role,
        name: registerData.name,
        studentId: registerData.studentId,
        createdAt: new Date(),
        approved: registerData.role === 'admin' ? true : false
      });
      setShowRegister(false);
    } catch (error) {
      alert('Registration failed: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView('dashboard');
    } catch (error) {
      alert('Logout failed: ' + error.message);
    }
  };

  const getNavigation = () => {
    const navItems = [];
    
    if (userRole === 'admin') {
      navItems.push(
        { key: 'dashboard', label: '📊 Dashboard', icon: '🏠' },
        { key: 'courses', label: '📚 Course Management', icon: '📖' },
        { key: 'analytics', label: '📈 Analytics', icon: '📊' },
        { key: 'students', label: '👥 Student Portal', icon: '🎓' }
      );
    } else if (userRole === 'teacher') {
      navItems.push(
        { key: 'dashboard', label: '📊 Dashboard', icon: '🏠' },
        { key: 'courses', label: '📚 Course Management', icon: '📖' },
        { key: 'analytics', label: '📈 Analytics', icon: '📊' }
      );
    } else if (userRole === 'student') {
      navItems.push(
        { key: 'dashboard', label: '📊 Dashboard', icon: '🏠' },
        { key: 'students', label: '🎓 My Learning', icon: '📚' }
      );
    }

    return navItems;
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'courses':
        return <CourseManager user={user} userRole={userRole} />;
      case 'students':
        return <StudentPortal user={user} userRole={userRole} />;
      case 'analytics':
        return <Analytics user={user} userRole={userRole} />;
      default:
        return <Dashboard user={user} userRole={userRole} setCurrentView={setCurrentView} />;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-vh-100 bg-light d-flex justify-content-center align-items-center">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="card shadow">
                <div className="card-body p-5">
                  <div className="text-center mb-4">
                    <h1 className="h3 mb-3">🎓 E-Learning Platform</h1>
                    <p className="text-muted">Welcome to our comprehensive learning management system</p>
                  </div>

                  {!showRegister ? (
                    <form onSubmit={handleLogin}>
                      <h4 className="mb-4 text-center">Sign In</h4>
                      <div className="mb-3">
                        <label className="form-label">📧 Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={loginData.email}
                          onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-4">
                        <label className="form-label">🔒 Password</label>
                        <input
                          type="password"
                          className="form-control"
                          value={loginData.password}
                          onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-primary w-100 mb-3">
                        🚀 Sign In
                      </button>
                      <div className="text-center">
                        <button
                          type="button"
                          className="btn btn-link"
                          onClick={() => setShowRegister(true)}
                        >
                          Don't have an account? Register here
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleRegister}>
                      <h4 className="mb-4 text-center">Create Account</h4>
                      <div className="mb-3">
                        <label className="form-label">👤 Full Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={registerData.name}
                          onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">📧 Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">🔒 Password</label>
                        <input
                          type="password"
                          className="form-control"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">🎭 Role</label>
                        <select
                          className="form-select"
                          value={registerData.role}
                          onChange={(e) => setRegisterData({...registerData, role: e.target.value})}
                        >
                          <option value="student">🎓 Student</option>
                          <option value="teacher">👨‍🏫 Teacher</option>
                          <option value="admin">👨‍💼 Admin</option>
                        </select>
                      </div>
                      {registerData.role === 'student' && (
                        <div className="mb-3">
                          <label className="form-label">🆔 Student ID</label>
                          <input
                            type="text"
                            className="form-control"
                            value={registerData.studentId}
                            onChange={(e) => setRegisterData({...registerData, studentId: e.target.value})}
                            required
                          />
                        </div>
                      )}
                      <button type="submit" className="btn btn-success w-100 mb-3">
                        ✨ Create Account
                      </button>
                      <div className="text-center">
                        <button
                          type="button"
                          className="btn btn-link"
                          onClick={() => setShowRegister(false)}
                        >
                          Already have an account? Sign in here
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow">
        <div className="container-fluid">
          <a className="navbar-brand" href="#!">
            🎓 E-Learning Platform
          </a>
          <div className="navbar-nav ms-auto">
            <span className="navbar-text me-3">
              Welcome, {user.displayName || user.email} ({userRole})
            </span>
            <button className="btn btn-outline-light" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container-fluid">
        <div className="row">
          {/* Sidebar */}
          <div className="col-md-3 col-lg-2 p-0">
            <div className="bg-white shadow-sm min-vh-100">
              <div className="p-3">
                <h6 className="text-muted text-uppercase mb-3">Navigation</h6>
                <div className="list-group list-group-flush">
                  {getNavigation().map((item) => (
                    <button
                      key={item.key}
                      className={`list-group-item list-group-item-action border-0 ${
                        currentView === item.key ? 'active' : ''
                      }`}
                      onClick={() => setCurrentView(item.key)}
                    >
                      <span className="me-2">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-md-9 col-lg-10">
            <div className="p-4">
              {renderCurrentView()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;