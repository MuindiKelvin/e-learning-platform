import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  getDoc,
  doc
} from 'firebase/firestore';

import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function Analytics({ user, userRole }) {
  const [analyticsData, setAnalyticsData] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    completionRate: 0,
    assessmentResults: [],
    coursePerformance: [],
    studentEngagement: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [dateRange, setDateRange] = useState('week');

  useEffect(() => {
    loadAnalyticsData();
  }, [user, dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load basic statistics - only if user has proper role
      if (userRole === 'admin' || userRole === 'teacher') {
        const [
          studentsSnapshot,
          coursesSnapshot,
          enrollmentsSnapshot,
          assessmentResultsSnapshot
        ] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
          getDocs(collection(db, 'courses')),
          getDocs(collection(db, 'enrollments')),
          getDocs(collection(db, 'assessmentResults'))
        ]);

        const totalStudents = studentsSnapshot.size;
        const totalCourses = coursesSnapshot.size;
        const totalEnrollments = enrollmentsSnapshot.size;
        
        // Calculate completion rate
        const completedEnrollments = enrollmentsSnapshot.docs.filter(
          doc => doc.data().progress >= 100
        ).length;
        const completionRate = totalEnrollments > 0 ? 
          (completedEnrollments / totalEnrollments) * 100 : 0;

        // Process assessment results
        const assessmentResults = assessmentResultsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate course performance
        const coursePerformance = await calculateCoursePerformance(
          coursesSnapshot.docs,
          enrollmentsSnapshot.docs,
          assessmentResults
        );

        // Calculate student engagement
        const studentEngagement = await calculateStudentEngagement(
          enrollmentsSnapshot.docs,
          assessmentResults
        );

        // Get recent activity
        const recentActivity = await getRecentActivity();

        setAnalyticsData({
          totalStudents,
          totalCourses,
          totalEnrollments,
          completionRate,
          assessmentResults,
          coursePerformance,
          studentEngagement,
          recentActivity
        });
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
      // Show user-friendly error message
      alert('Unable to load analytics data. Please check your permissions or try again later.');
    } finally {
      setLoading(false);
    }
  };

  const calculateCoursePerformance = async (courses, enrollments, assessmentResults) => {
    const performance = [];
    
    for (const courseDoc of courses) {
      const course = { id: courseDoc.id, ...courseDoc.data() };
      
      // Filter enrollments for this course
      const courseEnrollments = enrollments.filter(
        doc => doc.data().courseId === course.id
      );
      
      // Filter assessment results for this course
      const courseAssessments = assessmentResults.filter(
        result => result.courseId === course.id
      );
      
      const avgScore = courseAssessments.length > 0 ?
        courseAssessments.reduce((sum, result) => sum + (result.percentage || 0), 0) / courseAssessments.length : 0;
      
      const avgProgress = courseEnrollments.length > 0 ?
        courseEnrollments.reduce((sum, enrollment) => sum + (enrollment.data().progress || 0), 0) / courseEnrollments.length : 0;

      performance.push({
        courseId: course.id,
        courseName: course.title || 'Untitled Course',
        enrollments: courseEnrollments.length,
        avgScore: Math.round(avgScore),
        avgProgress: Math.round(avgProgress),
        difficulty: course.difficulty || 'beginner'
      });
    }
    
    return performance.sort((a, b) => b.enrollments - a.enrollments);
  };

  const calculateStudentEngagement = async (enrollments, assessmentResults) => {
    const engagement = {};
    
    // Process enrollments
    for (const enrollmentDoc of enrollments) {
      const enrollment = enrollmentDoc.data();
      const studentId = enrollment.studentId;
      
      if (!engagement[studentId]) {
        // Try to get student name from users collection or use a default
        let studentName = enrollment.studentName || 'Unknown Student';
        
        try {
          // Attempt to get student info from users collection
          const userDoc = await getDoc(doc(db, 'users', studentId));
          if (userDoc.exists()) {
            studentName = userDoc.data().displayName || userDoc.data().email || studentName;
          }
        } catch (error) {
          console.warn('Could not fetch student details:', error);
        }
        
        engagement[studentId] = {
          studentId: studentId,
          studentName: studentName,
          courses: 0,
          totalProgress: 0,
          totalAssessments: 0,
          averageScore: 0,
          lastActivity: enrollment.enrolledAt || new Date()
        };
      }
      
      engagement[studentId].courses += 1;
      engagement[studentId].totalProgress += enrollment.progress || 0;
      
      // Update last activity if this enrollment is more recent
      const enrollmentDate = enrollment.lastActivity || enrollment.enrolledAt;
      if (enrollmentDate && enrollmentDate > engagement[studentId].lastActivity) {
        engagement[studentId].lastActivity = enrollmentDate;
      }
    }

    // Process assessment results
    for (const result of assessmentResults) {
      if (engagement[result.studentId]) {
        engagement[result.studentId].totalAssessments += 1;
        engagement[result.studentId].averageScore += result.percentage || 0;
        
        // Update last activity if this assessment is more recent
        if (result.completedAt && result.completedAt > engagement[result.studentId].lastActivity) {
          engagement[result.studentId].lastActivity = result.completedAt;
        }
      }
    }

    return Object.values(engagement).map(student => ({
      ...student,
      averageProgress: student.courses > 0 ? Math.round(student.totalProgress / student.courses) : 0,
      averageScore: student.totalAssessments > 0 ? Math.round(student.averageScore / student.totalAssessments) : 0
    })).sort((a, b) => b.averageProgress - a.averageProgress);
  };

  const getRecentActivity = async () => {
    try {
      const activityQuery = query(
        collection(db, 'assessmentResults'),
        orderBy('completedAt', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(activityQuery);
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'assessment',
        timestamp: doc.data().completedAt
      }));
      
      // Fetch course and assessment titles with error handling
      const enrichedActivities = await Promise.all(
        activities.map(async activity => {
          let assessmentTitle = 'Unknown Assessment';
          let courseTitle = 'Unknown Course';
          
          try {
            if (activity.assessmentId) {
              const assessmentDoc = await getDoc(doc(db, 'assessments', activity.assessmentId));
              if (assessmentDoc.exists()) {
                assessmentTitle = assessmentDoc.data().title || assessmentTitle;
              }
            }
            
            if (activity.courseId) {
              const courseDoc = await getDoc(doc(db, 'courses', activity.courseId));
              if (courseDoc.exists()) {
                courseTitle = courseDoc.data().title || courseTitle;
              }
            }
          } catch (error) {
            console.warn('Error fetching activity details:', error);
          }
          
          return {
            ...activity,
            assessmentTitle,
            courseTitle
          };
        })
      );
      
      return enrichedActivities;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  };

  const getCoursePerformanceChartData = () => {
    return {
      labels: analyticsData.coursePerformance.map(p => p.courseName),
      datasets: [
        {
          label: 'Enrollments',
          data: analyticsData.coursePerformance.map(p => p.enrollments),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          yAxisID: 'y1'
        },
        {
          label: 'Average Score',
          data: analyticsData.coursePerformance.map(p => p.avgScore),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          yAxisID: 'y2'
        }
      ]
    };
  };

  const getEngagementChartData = () => {
    return {
      labels: analyticsData.studentEngagement.slice(0, 10).map(s => s.studentName),
      datasets: [
        {
          label: 'Average Progress',
          data: analyticsData.studentEngagement.slice(0, 10).map(s => s.averageProgress),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }
      ]
    };
  };

  const getCompletionRateChartData = () => {
    return {
      labels: ['Completed', 'In Progress'],
      datasets: [{
        data: [
          analyticsData.completionRate,
          100 - analyticsData.completionRate
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)',
          'rgba(255, 99, 132, 0.5)'
        ]
      }]
    };
  };

  // Check if user has permission to view analytics
  if (userRole !== 'admin' && userRole !== 'teacher') {
    return (
      <div className="text-center py-5">
        <div className="mb-3" style={{ fontSize: '3rem' }}>🔒</div>
        <h5>Access Restricted</h5>
        <p className="text-muted">You need admin or teacher privileges to view analytics.</p>
      </div>
    );
  }

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
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>📈 Analytics Dashboard</h2>
          <p className="text-muted mb-0">Monitor and analyze learning performance</p>
        </div>
        <div className="btn-group">
          <select
            className="form-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${selectedMetric === 'overview' ? 'active' : ''}`}
            onClick={() => setSelectedMetric('overview')}
          >
            📊 Overview
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${selectedMetric === 'courses' ? 'active' : ''}`}
            onClick={() => setSelectedMetric('courses')}
          >
            📚 Courses
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${selectedMetric === 'students' ? 'active' : ''}`}
            onClick={() => setSelectedMetric('students')}
          >
            👥 Students
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${selectedMetric === 'activity' ? 'active' : ''}`}
            onClick={() => setSelectedMetric('activity')}
          >
            🕒 Activity
          </button>
        </li>
      </ul>

      {/* Overview Tab */}
      {selectedMetric === 'overview' && (
        <div className="row">
          <div className="col-md-3 mb-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="display-4 text-primary mb-2">👥</div>
                <h5 className="card-title">{analyticsData.totalStudents}</h5>
                <p className="card-text text-muted">Total Students</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="display-4 text-success mb-2">📚</div>
                <h5 className="card-title">{analyticsData.totalCourses}</h5>
                <p className="card-text text-muted">Total Courses</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="display-4 text-info mb-2">🎓</div>
                <h5 className="card-title">{analyticsData.totalEnrollments}</h5>
                <p className="card-text text-muted">Total Enrollments</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="display-4 text-warning mb-2">✅</div>
                <h5 className="card-title">{analyticsData.completionRate.toFixed(1)}%</h5>
                <p className="card-text text-muted">Completion Rate</p>
              </div>
            </div>
          </div>
          <div className="col-md-6 mb-4">
            <div className="card shadow-sm">
              <div className="card-header">
                <h5 className="card-title mb-0">Completion Rate</h5>
              </div>
              <div className="card-body">
                <Pie
                  data={getCompletionRateChartData()}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: true, text: 'Course Completion Status' }
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div className="col-md-6 mb-4">
            <div className="card shadow-sm">
              <div className="card-header">
                <h5 className="card-title mb-0">Recent Activity</h5>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {analyticsData.recentActivity.length > 0 ? (
                    analyticsData.recentActivity.map((activity, index) => (
                      <div key={index} className="list-group-item border-0 px-0">
                        <div className="d-flex align-items-center">
                          <div className="me-3">
                            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                              <span className="text-white small">📝</span>
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <p className="mb-1 small">
                              Assessment <strong>{activity.assessmentTitle}</strong> completed for <strong>{activity.courseTitle}</strong> with {(activity.percentage || 0).toFixed(1)}%
                            </p>
                            <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>
                              {activity.completedAt?.toDate ? activity.completedAt.toDate().toLocaleString() : 'Unknown date'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted py-3">
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courses Tab */}
      {selectedMetric === 'courses' && (
        <div className="row">
          <div className="col-12 mb-4">
            <div className="card shadow-sm">
              <div className="card-header">
                <h5 className="card-title mb-0">Course Performance</h5>
              </div>
              <div className="card-body">
                {analyticsData.coursePerformance.length > 0 ? (
                  <Bar
                    data={getCoursePerformanceChartData()}
                    options={{
                      responsive: true,
                      scales: {
                        y1: {
                          type: 'linear',
                          position: 'left',
                          title: { display: true, text: 'Number of Enrollments' }
                        },
                        y2: {
                          type: 'linear',
                          position: 'right',
                          title: { display: true, text: 'Average Score (%)' },
                          grid: { drawOnChartArea: false }
                        }
                      },
                      plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: 'Course Performance Metrics' }
                      }
                    }}
                  />
                ) : (
                  <div className="text-center text-muted py-4">
                    <p>No course performance data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header">
                <h5 className="card-title mb-0">Course Details</h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Course Name</th>
                        <th>Enrollments</th>
                        <th>Avg Score</th>
                        <th>Avg Progress</th>
                        <th>Difficulty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.coursePerformance.map(course => (
                        <tr key={course.courseId}>
                          <td>{course.courseName}</td>
                          <td>{course.enrollments}</td>
                          <td>{course.avgScore}%</td>
                          <td>{course.avgProgress}%</td>
                          <td>
                            <span className={`badge ${
                              course.difficulty === 'beginner' ? 'bg-success' :
                              course.difficulty === 'intermediate' ? 'bg-warning' : 'bg-danger'
                            }`}>
                              {course.difficulty}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {selectedMetric === 'students' && (
        <div className="row">
          <div className="col-12 mb-4">
            <div className="card shadow-sm">
              <div className="card-header">
                <h5 className="card-title mb-0">Student Engagement</h5>
              </div>
              <div className="card-body">
                {analyticsData.studentEngagement.length > 0 ? (
                  <Line
                    data={getEngagementChartData()}
                    options={{
                      responsive: true,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: { display: true, text: 'Progress (%)' }
                        }
                      },
                      plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: 'Top 10 Student Progress' }
                      }
                    }}
                  />
                ) : (
                  <div className="text-center text-muted py-4">
                    <p>No student engagement data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header">
                <h5 className="card-title mb-0">Student Performance</h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Courses</th>
                        <th>Avg Progress</th>
                        <th>Assessments</th>
                        <th>Avg Score</th>
                        <th>Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.studentEngagement.map(student => (
                        <tr key={student.studentId}>
                          <td>{student.studentName}</td>
                          <td>{student.courses}</td>
                          <td>{student.averageProgress}%</td>
                          <td>{student.totalAssessments}</td>
                          <td>{student.averageScore}%</td>
                          <td>
                            {student.lastActivity?.toDate ? 
                              student.lastActivity.toDate().toLocaleDateString() : 
                              'Unknown'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {selectedMetric === 'activity' && (
        <div className="row">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header">
                <h5 className="card-title mb-0">Recent Activity Log</h5>
              </div>
              <div className="card-body">
                <div className="list-group">
                  {analyticsData.recentActivity.length > 0 ? (
                    analyticsData.recentActivity.map((activity, index) => (
                      <div key={index} className="list-group-item border-0">
                        <div className="d-flex align-items-center">
                          <div className="me-3">
                            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                              <span className="text-white">📝</span>
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1">Assessment Completed</h6>
                            <p className="mb-1 text-muted">
                              <strong>{activity.assessmentTitle}</strong> for <strong>{activity.courseTitle}</strong> - Score: {(activity.percentage || 0).toFixed(1)}%
                            </p>
                            <small className="text-muted">
                              {activity.completedAt?.toDate ? 
                                activity.completedAt.toDate().toLocaleString() : 
                                'Unknown date'
                              }
                            </small>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted py-3">
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;