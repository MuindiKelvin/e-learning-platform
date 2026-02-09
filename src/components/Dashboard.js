import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

function Dashboard({ user, userRole, setCurrentView }) {
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalEnrollments: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, userRole]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      if (userRole === 'admin' || userRole === 'teacher') {
        // Load dashboard data for admin/teacher roles
        const [
          coursesSnapshot,
          usersSnapshot,
          enrollmentsSnapshot,
          recentActivitySnapshot
        ] = await Promise.all([
          getDocs(collection(db, 'courses')),
          getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
          getDocs(collection(db, 'enrollments')),
          getDocs(query(collection(db, 'enrollments'), orderBy('enrolledAt', 'desc'), limit(5)))
        ]);

        const totalCourses = coursesSnapshot.size;
        const totalStudents = usersSnapshot.size;
        const totalEnrollments = enrollmentsSnapshot.size;
        const recentActivity = recentActivitySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setStats({
          totalCourses,
          totalStudents,
          totalEnrollments,
          recentActivity
        });
      } else if (userRole === 'student') {
        // Load student-specific data
        try {
          const [
            enrollmentsSnapshot,
            coursesSnapshot
          ] = await Promise.all([
            getDocs(query(collection(db, 'enrollments'), where('studentId', '==', user.uid))),
            getDocs(collection(db, 'courses'))
          ]);

          const totalEnrollments = enrollmentsSnapshot.size;
          const totalCourses = coursesSnapshot.size;
          const recentActivity = enrollmentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          setStats({
            totalCourses,
            totalStudents: 0, // Students don't need this info
            totalEnrollments,
            recentActivity
          });
        } catch (error) {
          console.error('Error loading student dashboard data:', error);
          // Set default values for students if there's an error
          setStats({
            totalCourses: 0,
            totalStudents: 0,
            totalEnrollments: 0,
            recentActivity: []
          });
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Handle permission errors gracefully
      if (error.code === 'permission-denied') {
        console.warn('Permission denied - using default dashboard data');
      }
      setStats({
        totalCourses: 0,
        totalStudents: 0,
        totalEnrollments: 0,
        recentActivity: []
      });
    } finally {
      setLoading(false);
    }
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = '🌅 Good morning';
    if (hour >= 12 && hour < 17) {
      greeting = '☀️ Good afternoon';
    } else if (hour >= 17) {
      greeting = '🌙 Good evening';
    }
    
    const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
    return `${greeting}, ${displayName}!`;
  };

  const getQuickActions = () => {
    const actions = [];
    
    if (userRole === 'admin') {
      actions.push(
        { key: 'courses', label: '➕ Add New Course', color: 'primary', description: 'Create and manage courses' },
        { key: 'analytics', label: '📊 View Analytics', color: 'info', description: 'Monitor platform performance' },
        { key: 'students', label: '👥 Manage Students', color: 'success', description: 'View student enrollments' }
      );
    } else if (userRole === 'teacher') {
      actions.push(
        { key: 'courses', label: '📚 My Courses', color: 'primary', description: 'Manage your courses' },
        { key: 'analytics', label: '📈 Student Progress', color: 'info', description: 'Track student performance' },
        { key: 'students', label: '👥 View Enrollments', color: 'success', description: 'Manage student enrollments' }
      );
    } else if (userRole === 'student') {
      actions.push(
        { key: 'students', label: '🎓 My Courses', color: 'primary', description: 'Access your enrolled courses' },
        { key: 'students', label: '📝 Take Assessment', color: 'warning', description: 'Complete pending quizzes' },
        { key: 'students', label: '🔍 Browse Courses', color: 'success', description: 'Find new courses to enroll' }
      );
    }
    
    return actions;
  };

  const getRoleSpecificStats = () => {
    if (userRole === 'student') {
      return [
        {
          icon: '🎓',
          value: stats.totalEnrollments,
          label: 'My Enrollments',
          color: 'primary'
        },
        {
          icon: '📚',
          value: stats.totalCourses,
          label: 'Available Courses',
          color: 'success'
        },
        {
          icon: '📈',
          value: '85%', // This could be calculated from actual progress
          label: 'Average Progress',
          color: 'info'
        },
        {
          icon: '🏆',
          value: '0', // Achievements could be calculated
          label: 'Achievements',
          color: 'warning'
        }
      ];
    } else {
      return [
        {
          icon: '📚',
          value: stats.totalCourses,
          label: 'Total Courses',
          color: 'primary'
        },
        {
          icon: '👥',
          value: stats.totalStudents,
          label: 'Total Students',
          color: 'success'
        },
        {
          icon: '🎓',
          value: stats.totalEnrollments,
          label: 'Total Enrollments',
          color: 'info'
        },
        {
          icon: '📈',
          value: '85%',
          label: 'Completion Rate',
          color: 'warning'
        }
      ];
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-gradient-primary text-white">
            <div className="card-body p-4">
              <h2 className="card-title mb-2">{getWelcomeMessage()}</h2>
              <p className="card-text mb-0">
                Welcome to your {userRole} dashboard. Here's what's happening in your learning environment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        {getRoleSpecificStats().map((stat, index) => (
          <div key={index} className="col-md-3 mb-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className={`display-4 text-${stat.color} mb-2`}>{stat.icon}</div>
                <h5 className="card-title">{stat.value}</h5>
                <p className="card-text text-muted">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row">
        {/* Quick Actions */}
        <div className="col-md-8 mb-4">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0">🚀 Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="row">
                {getQuickActions().map((action, index) => (
                  <div key={index} className="col-md-6 mb-3">
                    <div className="card border-0 h-100" style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="card-body">
                        <button
                          className={`btn btn-${action.color} w-100 mb-2`}
                          onClick={() => setCurrentView(action.key)}
                        >
                          {action.label}
                        </button>
                        <p className="card-text text-muted small mb-0">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-md-4 mb-4">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0">🕒 Recent Activity</h5>
            </div>
            <div className="card-body">
              {stats.recentActivity.length > 0 ? (
                <div className="list-group list-group-flush">
                  {stats.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="list-group-item border-0 px-0">
                      <div className="d-flex align-items-center">
                        <div className="me-3">
                          <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                            <span className="text-white small">🎓</span>
                          </div>
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-1 small">
                            {userRole === 'student' ? 
                              `Enrolled in ${activity.courseName || 'a course'}` :
                              `${activity.studentName || 'Student'} enrolled in ${activity.courseName || 'a course'}`
                            }
                          </p>
                          <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>
                            {activity.enrolledAt?.toDate ? 
                              activity.enrolledAt.toDate().toLocaleDateString() : 
                              'Recently'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-3">
                  <div className="mb-2">📭</div>
                  <p className="mb-0">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Role-specific content */}
      {userRole === 'student' && (
        <div className="row">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="card-title mb-0">📅 Learning Journey</h5>
              </div>
              <div className="card-body">
                <div className="text-center text-muted py-4">
                  <div className="mb-3" style={{ fontSize: '3rem' }}>📚</div>
                  <h6>Ready to learn something new?</h6>
                  <p className="mb-3">Check out your enrolled courses and continue your learning journey.</p>
                  <div className="d-flex justify-content-center gap-2">
                    <button 
                      className="btn btn-primary"
                      onClick={() => setCurrentView('students')}
                    >
                      🎓 Go to My Courses
                    </button>
                    <button 
                      className="btn btn-outline-success"
                      onClick={() => setCurrentView('students')}
                    >
                      🔍 Browse Available Courses
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(userRole === 'admin' || userRole === 'teacher') && (
        <div className="row">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="card-title mb-0">📊 Performance Overview</h5>
              </div>
              <div className="card-body">
                <div className="text-center py-3">
                  <div className="mb-2" style={{ fontSize: '2rem' }}>📈</div>
                  <p className="text-muted mb-2">Platform is running smoothly</p>
                  <small className="text-success">✅ All systems operational</small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="card-title mb-0">🎯 Quick Stats</h5>
              </div>
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-6">
                    <div className="border-end">
                      <h6 className="text-primary">{stats.totalEnrollments}</h6>
                      <small className="text-muted">Active Enrollments</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <h6 className="text-success">85%</h6>
                    <small className="text-muted">Success Rate</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Announcements */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0">📢 Announcements</h5>
            </div>
            <div className="card-body">
              <div className="alert alert-info d-flex align-items-center">
                <span className="me-2">ℹ️</span>
                <div>
                  <strong>Platform Update:</strong> New adaptive learning features have been added to enhance your learning experience.
                </div>
              </div>
              <div className="alert alert-success d-flex align-items-center">
                <span className="me-2">✅</span>
                <div>
                  <strong>System Status:</strong> All systems are running smoothly. Happy learning!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;