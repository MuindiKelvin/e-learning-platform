import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  getDoc,
  orderBy 
} from 'firebase/firestore';

function StudentPortal({ user, userRole }) {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [assessmentResults, setAssessmentResults] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [currentAssessment, setCurrentAssessment] = useState(null);
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentTimer, setAssessmentTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const certificateRef = useRef(null);

  const [enrollmentForm, setEnrollmentForm] = useState({
    studentName: '',
    studentId: '',
    email: user?.email || '',
    phone: '',
    address: '',
    previousEducation: '',
    motivation: ''
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (showAssessment && currentAssessment && assessmentTimer > 0) {
      const interval = setInterval(() => {
        setAssessmentTimer(prev => {
          if (prev <= 1) {
            handleSubmitAssessment();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
      
      return () => clearInterval(interval);
    }
  }, [showAssessment, currentAssessment, assessmentTimer]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (userRole === 'student') {
        await Promise.all([
          loadCourses(),
          loadEnrollments(),
          loadAssessments(),
          loadAssessmentResults(),
          loadCertificates()
        ]);
      } else if (userRole === 'admin' || userRole === 'teacher') {
        await Promise.all([
          loadCourses(),
          loadAllEnrollments(),
          loadAssessments(),
          loadAllAssessmentResults()
        ]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      if (error.code === 'permission-denied') {
        alert('You do not have permission to access this data. Please check your role.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'courses'));
      const coursesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading courses:', error);
      if (error.code === 'permission-denied') {
        console.warn('Permission denied loading courses');
        setCourses([]);
      }
    }
  };

  const loadEnrollments = async () => {
    try {
      if (userRole === 'student') {
        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('studentId', '==', user.uid)
        );
        const snapshot = await getDocs(enrollmentsQuery);
        const enrollmentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEnrollments(enrollmentsData);
      }
    } catch (error) {
      console.error('Error loading enrollments:', error);
      if (error.code === 'permission-denied') {
        console.warn('Permission denied loading enrollments');
        setEnrollments([]);
      }
    }
  };

  const loadAllEnrollments = async () => {
    try {
      if (userRole === 'admin' || userRole === 'teacher') {
        const snapshot = await getDocs(collection(db, 'enrollments'));
        const enrollmentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEnrollments(enrollmentsData);
      }
    } catch (error) {
      console.error('Error loading all enrollments:', error);
      if (error.code === 'permission-denied') {
        console.warn('Permission denied loading all enrollments');
        setEnrollments([]);
      }
    }
  };

  const loadAssessmentResults = async () => {
    try {
      if (userRole === 'student') {
        const resultsQuery = query(
          collection(db, 'assessmentResults'),
          where('studentId', '==', user.uid)
        );
        const snapshot = await getDocs(resultsQuery);
        const resultsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAssessmentResults(resultsData);
      }
    } catch (error) {
      console.error('Error loading assessment results:', error);
      if (error.code === 'permission-denied') {
        console.warn('Permission denied loading assessment results');
        setAssessmentResults([]);
      }
    }
  };

  const loadAllAssessmentResults = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'assessmentResults'));
      const resultsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAssessmentResults(resultsData);
    } catch (error) {
      console.error('Error loading all assessment results:', error);
      if (error.code === 'permission-denied') {
        console.warn('Permission denied loading all assessment results');
        setAssessmentResults([]);
      }
    }
  };

  const loadCertificates = async () => {
    try {
      if (userRole === 'student') {
        const certificatesQuery = query(
          collection(db, 'certificates'),
          where('studentId', '==', user.uid)
        );
        const snapshot = await getDocs(certificatesQuery);
        const certificatesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCertificates(certificatesData);
      }
    } catch (error) {
      console.error('Error loading certificates:', error);
      if (error.code === 'permission-denied') {
        console.warn('Permission denied loading certificates');
        setCertificates([]);
      }
    }
  };

  const loadAssessments = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'assessments'));
      const assessmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAssessments(assessmentsData);
    } catch (error) {
      console.error('Error loading assessments:', error);
      if (error.code === 'permission-denied') {
        console.warn('Permission denied loading assessments');
        setAssessments([]);
      }
    }
  };

  const handleEnrollment = async (e) => {
    e.preventDefault();
    try {
      if (!enrollmentForm.studentName || !enrollmentForm.studentId || !enrollmentForm.email) {
        alert('Please fill in all required fields.');
        return;
      }

      const enrollmentData = {
        ...enrollmentForm,
        courseId: selectedCourse.id,
        courseName: selectedCourse.title,
        studentId: user.uid,
        enrolledAt: new Date(),
        status: 'pending',
        progress: 0
      };
      
      await addDoc(collection(db, 'enrollments'), enrollmentData);
      
      setEnrollmentForm({
        studentName: '',
        studentId: '',
        email: user?.email || '',
        phone: '',
        address: '',
        previousEducation: '',
        motivation: ''
      });
      setShowEnrollForm(false);
      setSelectedCourse(null);
      loadEnrollments();
      alert('🎉 Enrollment request submitted successfully! Please wait for approval.');
    } catch (error) {
      console.error('Error enrolling in course:', error);
      if (error.code === 'permission-denied') {
        alert('You do not have permission to enroll in courses. Please check your role.');
      } else {
        alert('Error submitting enrollment. Please try again.');
      }
    }
  };

  const startAssessment = (assessment) => {
    if (!assessment || !assessment.timeLimit) {
      alert('Invalid assessment data. Please try again.');
      return;
    }
    
    if (hasCompletedAssessment(assessment.id)) {
      alert('You have already completed this assessment. Each assessment can only be taken once.');
      return;
    }
    
    setCurrentAssessment(assessment);
    setAssessmentAnswers({});
    setAssessmentTimer(assessment.timeLimit * 60);
    setShowAssessment(true);
  };

  const handleSubmitAssessment = async () => {
    try {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      if (!currentAssessment || !currentAssessment.questions) {
        alert('Invalid assessment data. Cannot submit.');
        return;
      }

      let score = 0;
      const totalQuestions = currentAssessment.questions.length;
      
      currentAssessment.questions.forEach((question, index) => {
        if (assessmentAnswers[index] === question.correctAnswer) {
          score += question.points || 1;
        }
      });
      
      const percentage = currentAssessment.totalPoints > 0 ? 
        (score / currentAssessment.totalPoints) * 100 : 0;
      
      const resultData = {
        studentId: user.uid,
        assessmentId: currentAssessment.id,
        courseId: currentAssessment.courseId,
        answers: assessmentAnswers,
        score: score,
        totalPoints: currentAssessment.totalPoints || 0,
        percentage: percentage,
        completedAt: new Date(),
        timeSpent: (currentAssessment.timeLimit * 60) - assessmentTimer
      };
      
      await addDoc(collection(db, 'assessmentResults'), resultData);
      
      setShowAssessment(false);
      setCurrentAssessment(null);
      setAssessmentAnswers({});
      setAssessmentTimer(0);
      
      loadAssessmentResults();
      
      alert(`🎉 Assessment completed! Your score: ${score}/${currentAssessment.totalPoints || 0} (${percentage.toFixed(1)}%)`);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      if (error.code === 'permission-denied') {
        alert('You do not have permission to submit assessments. Please check your role.');
      } else {
        alert('Error submitting assessment. Please try again.');
      }
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getEnrolledCourses = () => {
    return enrollments
      .filter(enrollment => enrollment.status === 'approved')
      .map(enrollment => {
        const course = courses.find(c => c.id === enrollment.courseId);
        return course ? { 
          ...course, 
          enrollmentId: enrollment.id,
          enrollmentProgress: enrollment.progress || 0,
          completed: enrollment.completed || false,
          completedAt: enrollment.completedAt
        } : null;
      })
      .filter(course => course !== null);
  };

  const getAvailableCourses = () => {
    const enrolledCourseIds = enrollments.map(e => e.courseId);
    return courses.filter(course => !enrolledCourseIds.includes(course.id));
  };

  const getAvailableAssessments = () => {
    const approvedEnrollments = enrollments.filter(e => e.status === 'approved');
    const enrolledCourseIds = approvedEnrollments.map(e => e.courseId);
    const completedAssessmentIds = assessmentResults.map(result => result.assessmentId);
    
    return assessments.filter(assessment => 
      enrolledCourseIds.includes(assessment.courseId) &&
      !completedAssessmentIds.includes(assessment.id)
    );
  };

  const getCompletedAssessments = () => {
    return assessmentResults.map(result => {
      const assessment = assessments.find(a => a.id === result.assessmentId);
      const course = courses.find(c => c.id === result.courseId);
      return {
        ...result,
        assessmentTitle: assessment?.title || 'Unknown Assessment',
        courseTitle: course?.title || 'Unknown Course'
      };
    });
  };

  const hasCompletedAssessment = (assessmentId) => {
    return assessmentResults.some(result => result.assessmentId === assessmentId);
  };

  const handleApproveEnrollment = async (enrollmentId) => {
    try {
      await updateDoc(doc(db, 'enrollments', enrollmentId), {
        status: 'approved'
      });
      
      if (userRole === 'student') {
        loadEnrollments();
      } else {
        loadAllEnrollments();
      }
      alert('Enrollment approved! ✅');
    } catch (error) {
      console.error('Error approving enrollment:', error);
      if (error.code === 'permission-denied') {
        alert('You do not have permission to approve enrollments.');
      } else {
        alert('Error approving enrollment. Please try again.');
      }
    }
  };

  const handleRejectEnrollment = async (enrollmentId) => {
    if (window.confirm('Are you sure you want to reject this enrollment?')) {
      try {
        await updateDoc(doc(db, 'enrollments', enrollmentId), {
          status: 'rejected'
        });
        
        if (userRole === 'student') {
          loadEnrollments();
        } else {
          loadAllEnrollments();
        }
        alert('Enrollment rejected! ❌');
      } catch (error) {
        console.error('Error rejecting enrollment:', error);
        if (error.code === 'permission-denied') {
          alert('You do not have permission to reject enrollments.');
        } else {
          alert('Error rejecting enrollment. Please try again.');
        }
      }
    }
  };

  const handleContinueLearning = async (course) => {
    try {
      const newProgress = Math.min((course.enrollmentProgress || 0) + 10, 100);
      const updateData = {
        progress: newProgress,
        lastActivity: new Date()
      };
      
      if (newProgress === 100) {
        updateData.completed = true;
        updateData.completedAt = new Date();
      }
      
      await updateDoc(doc(db, 'enrollments', course.enrollmentId), updateData);
      loadEnrollments();
      
      if (newProgress === 100) {
        alert('🎉 Congratulations! You have completed this course! 🏆');
      } else {
        alert(`Progress updated to ${newProgress}%! 📈`);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      if (error.code === 'permission-denied') {
        alert('You do not have permission to update progress. Please check your role.');
      } else {
        alert('Error updating progress. Please try again.');
      }
    }
  };

  const handleReviewCourse = (courseId) => {
    alert('📚 Opening course materials for review...');
  };

  const handleGetCertificate = async (course, enrollment) => {
    try {
      // Check if certificate already requested
      const existingCertificate = certificates.find(cert => 
        cert.courseId === course.id && cert.studentId === user.uid
      );

      if (existingCertificate) {
        if (existingCertificate.status === 'verified') {
          // Show verified certificate
          setSelectedCertificate(existingCertificate);
          setShowCertificateModal(true);
        } else if (existingCertificate.status === 'pending') {
          alert('⏳ Your certificate request is pending admin verification. Please wait for approval.');
        } else if (existingCertificate.status === 'rejected') {
          alert(`❌ Your certificate request was rejected. Reason: ${existingCertificate.rejectionReason || 'No reason provided'}`);
        }
        return;
      }

      // Request new certificate
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      const certificateData = {
        studentId: user.uid,
        studentName: userData.name || user.email,
        studentEmail: user.email,
        courseId: course.id,
        courseName: course.title,
        completedAt: enrollment.completedAt || new Date(),
        requestedAt: new Date(),
        status: 'pending'
      };

      await addDoc(collection(db, 'certificates'), certificateData);
      await loadCertificates();

      alert('🎓 Certificate request submitted successfully! It will be available for download once verified by an administrator.');
    } catch (error) {
      console.error('Error requesting certificate:', error);
      if (error.code === 'permission-denied') {
        alert('You do not have permission to request certificates. Please check your role.');
      } else {
        alert('Error requesting certificate. Please try again.');
      }
    }
  };

  const handleDownloadCertificate = () => {
    // This would typically generate a PDF
    // For now, we'll use print functionality
    window.print();
  };

  const getMyCertificates = () => {
    return certificates.map(cert => {
      const course = courses.find(c => c.id === cert.courseId);
      return {
        ...cert,
        courseTitle: course?.title || cert.courseName
      };
    });
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

  if (showAssessment && currentAssessment) {
    return (
      <div className="container-fluid">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow">
              <div className="card-header bg-primary text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">📝 {currentAssessment.title}</h5>
                  <div className="d-flex align-items-center">
                    <span className="me-3">⏰ Time Remaining: {formatTime(assessmentTimer)}</span>
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={handleSubmitAssessment}
                    >
                      ✅ Submit
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <p className="text-muted mb-4">{currentAssessment.description}</p>
                
                {currentAssessment.questions && currentAssessment.questions.map((question, qIndex) => (
                  <div key={qIndex} className="mb-4">
                    <h6>Question {qIndex + 1} ({question.points || 1} points)</h6>
                    <p className="mb-3">{question.question}</p>
                    
                    <div className="row">
                      {question.options && question.options.map((option, oIndex) => (
                        <div key={oIndex} className="col-md-6 mb-2">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name={`question-${qIndex}`}
                              id={`q${qIndex}o${oIndex}`}
                              checked={assessmentAnswers[qIndex] === oIndex}
                              onChange={() => setAssessmentAnswers({
                                ...assessmentAnswers,
                                [qIndex]: oIndex
                              })}
                            />
                            <label className="form-check-label" htmlFor={`q${qIndex}o${oIndex}`}>
                              {option}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="text-center mt-4">
                  <button 
                    className="btn btn-success btn-lg"
                    onClick={handleSubmitAssessment}
                  >
                    ✅ Submit Assessment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>🎓 {userRole === 'student' ? 'My Learning Portal' : 'Student Management'}</h2>
          <p className="text-muted mb-0">
            {userRole === 'student' ? 'Access your courses and assessments' : 'Manage student enrollments and progress'}
          </p>
        </div>
      </div>

      {userRole === 'student' && (
        <>
          {/* Navigation Tabs */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'available' ? 'active' : ''}`}
                onClick={() => setActiveTab('available')}
              >
                🔍 Available Courses
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'enrolled' ? 'active' : ''}`}
                onClick={() => setActiveTab('enrolled')}
              >
                📚 My Courses
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'assessments' ? 'active' : ''}`}
                onClick={() => setActiveTab('assessments')}
              >
                📝 Available Assessments
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'results' ? 'active' : ''}`}
                onClick={() => setActiveTab('results')}
              >
                📊 Assessment Results
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'certificates' ? 'active' : ''}`}
                onClick={() => setActiveTab('certificates')}
              >
                🎓 My Certificates
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'progress' ? 'active' : ''}`}
                onClick={() => setActiveTab('progress')}
              >
                📊 My Progress
              </button>
            </li>
          </ul>

          {/* Available Courses Tab */}
          {activeTab === 'available' && (
            <div className="row">
              {getAvailableCourses().length > 0 ? (
                getAvailableCourses().map(course => (
                  <div key={course.id} className="col-md-6 col-lg-4 mb-4">
                    <div className="card h-100 shadow-sm border-0">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <h5 className="card-title">{course.title}</h5>
                          <span className={`badge ${
                            course.difficulty === 'beginner' ? 'bg-success' :
                            course.difficulty === 'intermediate' ? 'bg-warning' : 'bg-danger'
                          }`}>
                            {course.difficulty}
                          </span>
                        </div>
                        <p className="card-text text-muted">{course.description}</p>
                        <div className="mb-3">
                          <small className="text-muted">
                            📅 {course.duration}h • 🏷️ {course.category}
                          </small>
                        </div>
                        <button 
                          className="btn btn-primary w-100"
                          onClick={() => {
                            setSelectedCourse(course);
                            setShowEnrollForm(true);
                          }}
                        >
                          📝 Enroll Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-12">
                  <div className="text-center py-5">
                    <div className="mb-3" style={{ fontSize: '3rem' }}>🎓</div>
                    <h5>No available courses</h5>
                    <p className="text-muted">All courses are either enrolled or pending approval</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enrolled Courses Tab */}
          {activeTab === 'enrolled' && (
            <div className="row">
              {getEnrolledCourses().length > 0 ? (
                getEnrolledCourses().map(course => {
                  const isCompleted = course.enrollmentProgress === 100 || course.completed;
                  const enrollment = enrollments.find(e => e.courseId === course.id);
                  
                  return (
                    <div key={course.id} className="col-md-6 col-lg-4 mb-4">
                      <div className="card h-100 shadow-sm border-0">
                        <div className="card-body">
                          <h5 className="card-title">{course.title}</h5>
                          <p className="card-text text-muted">{course.description}</p>
                          
                          <div className="mb-3">
                            <small className="text-muted d-block">Progress</small>
                            <div className="progress mb-2">
                              <div 
                                className={`progress-bar ${isCompleted ? 'bg-primary' : 'bg-success'}`}
                                style={{ width: `${course.enrollmentProgress || 0}%` }}
                              >
                                {course.enrollmentProgress || 0}%
                              </div>
                            </div>
                          </div>
                          
                          {course.materials && course.materials.length > 0 && (
                            <div className="mb-3">
                              <small className="text-muted d-block mb-2">📎 Learning Materials</small>
                              {course.materials.map((material, index) => (
                                <div key={index} className="mb-1">
                                  <a 
                                    href={material.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn btn-outline-primary btn-sm w-100 text-start"
                                  >
                                    {material.type === 'video' ? '🎥' : 
                                     material.type === 'document' ? '📄' :
                                     material.type === 'presentation' ? '📊' : '🎵'} {material.title}
                                  </a>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {!isCompleted ? (
                            <button 
                              className="btn btn-success w-100"
                              onClick={() => handleContinueLearning(course)}
                            >
                              📚 Continue Learning
                            </button>
                          ) : (
                            <div>
                              <button 
                                className="btn btn-primary w-100 mb-2"
                                disabled
                                style={{ opacity: 0.9 }}
                              >
                                ✅ Course Completed
                              </button>
                              
                              <div className="d-flex gap-2 mb-2">
                                <button 
                                  className="btn btn-warning flex-fill"
                                  onClick={() => handleGetCertificate(course, enrollment)}
                                >
                                  🎓 Get Certificate
                                </button>
                                
                                <button 
                                  className="btn btn-outline-secondary flex-fill"
                                  onClick={() => handleReviewCourse(course.id)}
                                >
                                  🔄 Review
                                </button>
                              </div>
                              
                              {course.completedAt && (
                                <small className="text-muted d-block text-center fst-italic">
                                  Completed: {course.completedAt?.toDate ? 
                                    course.completedAt.toDate().toLocaleDateString() : 
                                    new Date(course.completedAt).toLocaleDateString()}
                                </small>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-12">
                  <div className="text-center py-5">
                    <div className="mb-3" style={{ fontSize: '3rem' }}>📚</div>
                    <h5>No enrolled courses</h5>
                    <p className="text-muted">Enroll in courses to start your learning journey</p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setActiveTab('available')}
                    >
                      🔍 Browse Courses
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assessments Tab */}
          {activeTab === 'assessments' && (
            <div className="row">
              {getAvailableAssessments().length > 0 ? (
                getAvailableAssessments().map(assessment => {
                  const course = courses.find(c => c.id === assessment.courseId);
                  return (
                    <div key={assessment.id} className="col-md-6 col-lg-4 mb-4">
                      <div className="card h-100 shadow-sm border-0">
                        <div className="card-body">
                          <h5 className="card-title">{assessment.title}</h5>
                          <p className="card-text text-muted">{assessment.description}</p>
                          <div className="mb-3">
                            <small className="text-muted d-block">
                              📚 Course: {course?.title || 'Unknown Course'}
                            </small>
                            <small className="text-muted d-block">
                              ⏱️ Time Limit: {assessment.timeLimit} minutes
                            </small>
                            <small className="text-muted d-block">
                              📊 Total Points: {assessment.totalPoints || 0}
                            </small>
                            <small className="text-muted d-block">
                              ❓ Questions: {assessment.questions?.length || 0}
                            </small>
                          </div>
                          <button 
                            className="btn btn-warning w-100"
                            onClick={() => startAssessment(assessment)}
                            disabled={hasCompletedAssessment(assessment.id)}
                          >
                            {hasCompletedAssessment(assessment.id) ? '✅ Completed' : '📝 Start Assessment'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-12">
                  <div className="text-center py-5">
                    <div className="mb-3" style={{ fontSize: '3rem' }}>📝</div>
                    <h5>No assessments available</h5>
                    <p className="text-muted">Complete course enrollments to access assessments</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assessment Results Tab */}
          {activeTab === 'results' && (
            <div className="row">
              {getCompletedAssessments().length > 0 ? (
                getCompletedAssessments().map(result => (
                  <div key={result.id} className="col-md-6 col-lg-4 mb-4">
                    <div className="card h-100 shadow-sm border-0">
                      <div className="card-body">
                        <h5 className="card-title">{result.assessmentTitle}</h5>
                        <p className="card-text text-muted">📚 {result.courseTitle}</p>
                        
                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-muted">Score:</span>
                            <span className="fw-bold">{result.score}/{result.totalPoints}</span>
                          </div>
                          <div className="progress mb-2">
                            <div 
                              className={`progress-bar ${
                                result.percentage >= 80 ? 'bg-success' :
                                result.percentage >= 60 ? 'bg-warning' : 'bg-danger'
                              }`}
                              style={{ width: `${result.percentage}%` }}
                            >
                              {result.percentage.toFixed(1)}%
                            </div>
                          </div>
                          <small className="text-muted">
                            Completed: {result.completedAt?.toDate ? 
                              result.completedAt.toDate().toLocaleDateString() : 
                              'Unknown date'
                            }
                          </small>
                          <br />
                          <small className="text-muted">
                            Time spent: {Math.floor((result.timeSpent || 0) / 60)}:{((result.timeSpent || 0) % 60).toString().padStart(2, '0')}
                          </small>
                        </div>
                        
                        <span className={`badge w-100 ${
                          result.percentage >= 80 ? 'bg-success' :
                          result.percentage >= 60 ? 'bg-warning' : 'bg-danger'
                        }`}>
                          {result.percentage >= 80 ? '🏆 Excellent' :
                           result.percentage >= 60 ? '👍 Good' : '📚 Needs Improvement'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-12">
                  <div className="text-center py-5">
                    <div className="mb-3" style={{ fontSize: '3rem' }}>📊</div>
                    <h5>No assessment results yet</h5>
                    <p className="text-muted">Complete assessments to see your results here</p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setActiveTab('assessments')}
                    >
                      📝 Take Assessments
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Certificates Tab */}
          {activeTab === 'certificates' && (
            <div className="row">
              {getMyCertificates().length > 0 ? (
                getMyCertificates().map(certificate => (
                  <div key={certificate.id} className="col-md-6 col-lg-4 mb-4">
                    <div className="card h-100 shadow-sm border-0">
                      <div className="card-body">
                        <div className="text-center mb-3">
                          <div style={{ fontSize: '3rem' }}>🎓</div>
                        </div>
                        <h5 className="card-title text-center">{certificate.courseTitle}</h5>
                        
                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-muted">Status:</span>
                            <span className={`badge ${
                              certificate.status === 'verified' ? 'bg-success' :
                              certificate.status === 'pending' ? 'bg-warning' : 'bg-danger'
                            }`}>
                              {certificate.status === 'verified' ? '✅ Verified' :
                               certificate.status === 'pending' ? '⏳ Pending' : '❌ Rejected'}
                            </span>
                          </div>
                          
                          {certificate.certificateNumber && (
                            <div className="text-center mb-2">
                              <small className="text-muted d-block">Certificate Number</small>
                              <code className="small">{certificate.certificateNumber}</code>
                            </div>
                          )}
                          
                          <small className="text-muted d-block">
                            Completed: {certificate.completedAt?.toDate ? 
                              certificate.completedAt.toDate().toLocaleDateString() : 
                              'N/A'
                            }
                          </small>
                          
                          <small className="text-muted d-block">
                            Requested: {certificate.requestedAt?.toDate ? 
                              certificate.requestedAt.toDate().toLocaleDateString() : 
                              'N/A'
                            }
                          </small>

                          {certificate.status === 'rejected' && certificate.rejectionReason && (
                            <div className="alert alert-danger mt-2 small">
                              <strong>Reason:</strong> {certificate.rejectionReason}
                            </div>
                          )}
                        </div>
                        
                        {certificate.status === 'verified' && (
                          <button 
                            className="btn btn-primary w-100"
                            onClick={() => {
                              setSelectedCertificate(certificate);
                              setShowCertificateModal(true);
                            }}
                          >
                            👁️ View & Download
                          </button>
                        )}

                        {certificate.status === 'pending' && (
                          <button className="btn btn-secondary w-100" disabled>
                            ⏳ Awaiting Verification
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-12">
                  <div className="text-center py-5">
                    <div className="mb-3" style={{ fontSize: '3rem' }}>🎓</div>
                    <h5>No certificates yet</h5>
                    <p className="text-muted">Complete courses to request certificates</p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setActiveTab('enrolled')}
                    >
                      📚 View My Courses
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div className="row">
              <div className="col-lg-8">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h5 className="card-title mb-0">📊 Learning Progress</h5>
                  </div>
                  <div className="card-body">
                    {getEnrolledCourses().length > 0 ? (
                      getEnrolledCourses().map(course => {
                        const enrollment = enrollments.find(e => e.courseId === course.id);
                        const isCompleted = course.enrollmentProgress === 100 || course.completed;
                        
                        return (
                          <div key={course.id} className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <h6 className="mb-0">{course.title}</h6>
                              <div className="d-flex align-items-center gap-2">
                                {isCompleted && <span className="badge bg-success">✅ Completed</span>}
                                <span className="badge bg-primary">{course.enrollmentProgress || 0}%</span>
                              </div>
                            </div>
                            <div className="progress mb-2">
                              <div 
                                className={`progress-bar ${isCompleted ? 'bg-primary' : 'bg-success'}`}
                                style={{ width: `${course.enrollmentProgress || 0}%` }}
                              ></div>
                            </div>
                            <small className="text-muted">
                              Enrolled: {enrollment?.enrolledAt?.toDate ? 
                                enrollment.enrolledAt.toDate().toLocaleDateString() : 
                                enrollment?.enrolledAt ? 
                                  new Date(enrollment.enrolledAt).toLocaleDateString() :
                                  'Unknown date'
                              }
                              {isCompleted && course.completedAt && (
                                <> • Completed: {course.completedAt?.toDate ? 
                                  course.completedAt.toDate().toLocaleDateString() : 
                                  new Date(course.completedAt).toLocaleDateString()}
                                </>
                              )}
                            </small>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4">
                        <div className="mb-2" style={{ fontSize: '2rem' }}>📊</div>
                        <p className="text-muted">No progress data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="col-lg-4">
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h5 className="card-title mb-0">🏆 Achievements</h5>
                  </div>
                  <div className="card-body">
                    {getEnrolledCourses().filter(c => c.completed || c.enrollmentProgress === 100).length > 0 ? (
                      <div>
                        <div className="text-center mb-3">
                          <div style={{ fontSize: '3rem' }}>🎓</div>
                          <h6>Courses Completed</h6>
                          <div className="display-4 text-primary">
                            {getEnrolledCourses().filter(c => c.completed || c.enrollmentProgress === 100).length}
                          </div>
                        </div>
                        <hr />
                        {getEnrolledCourses().filter(c => c.completed || c.enrollmentProgress === 100).map(course => (
                          <div key={course.id} className="mb-2">
                            <small className="text-success">✅ {course.title}</small>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="mb-2" style={{ fontSize: '2rem' }}>🏆</div>
                        <p className="text-muted">Complete courses to earn achievements</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Admin/Teacher View - Student Management */}
      {(userRole === 'admin' || userRole === 'teacher') && (
        <div className="row">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="card-title mb-0">👥 Student Enrollments</h5>
              </div>
              <div className="card-body">
                {enrollments.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Course</th>
                          <th>Status</th>
                          <th>Progress</th>
                          <th>Enrolled Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map(enrollment => {
                          const course = courses.find(c => c.id === enrollment.courseId);
                          const isCompleted = enrollment.progress === 100 || enrollment.completed;
                          
                          return (
                            <tr key={enrollment.id}>
                              <td>{enrollment.studentName || 'Unknown Student'}</td>
                              <td>{course?.title || 'Unknown Course'}</td>
                              <td>
                                <span className={`badge ${
                                  enrollment.status === 'approved' ? 'bg-success' :
                                  enrollment.status === 'pending' ? 'bg-warning' : 'bg-danger'
                                }`}>
                                  {enrollment.status}
                                </span>
                                {isCompleted && <span className="badge bg-primary ms-1">✅ Completed</span>}
                              </td>
                              <td>
                                <div className="progress" style={{ width: '100px' }}>
                                  <div 
                                    className={`progress-bar ${isCompleted ? 'bg-primary' : ''}`}
                                    style={{ width: `${enrollment.progress || 0}%` }}
                                  ></div>
                                </div>
                                <small>{enrollment.progress || 0}%</small>
                              </td>
                              <td>
                                {enrollment.enrolledAt?.toDate ? 
                                  enrollment.enrolledAt.toDate().toLocaleDateString() : 
                                  'Unknown date'
                                }
                              </td>
                              <td>
                                {enrollment.status === 'pending' && (
                                  <button 
                                    className="btn btn-success btn-sm me-2"
                                    onClick={() => handleApproveEnrollment(enrollment.id)}
                                  >
                                    ✅ Approve
                                  </button>
                                )}
                                <button 
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleRejectEnrollment(enrollment.id)}
                                >
                                  ❌ Reject
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="mb-3" style={{ fontSize: '3rem' }}>👥</div>
                    <h5>No student enrollments</h5>
                    <p className="text-muted">Student enrollment requests will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Form Modal */}
      {showEnrollForm && selectedCourse && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📝 Course Enrollment Form</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowEnrollForm(false)}
                ></button>
              </div>
              <form onSubmit={handleEnrollment}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <strong>📚 Course:</strong> {selectedCourse.title}
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">👤 Full Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={enrollmentForm.studentName}
                        onChange={(e) => setEnrollmentForm({...enrollmentForm, studentName: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">🆔 Student ID *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={enrollmentForm.studentId}
                        onChange={(e) => setEnrollmentForm({...enrollmentForm, studentId: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">📧 Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        value={enrollmentForm.email}
                        onChange={(e) => setEnrollmentForm({...enrollmentForm, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">📱 Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={enrollmentForm.phone}
                        onChange={(e) => setEnrollmentForm({...enrollmentForm, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">🏠 Address</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={enrollmentForm.address}
                      onChange={(e) => setEnrollmentForm({...enrollmentForm, address: e.target.value})}
                    ></textarea>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">🎓 Previous Education</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={enrollmentForm.previousEducation}
                      onChange={(e) => setEnrollmentForm({...enrollmentForm, previousEducation: e.target.value})}
                      placeholder="Describe your educational background..."
                    ></textarea>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">💡 Motivation for Taking This Course</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={enrollmentForm.motivation}
                      onChange={(e) => setEnrollmentForm({...enrollmentForm, motivation: e.target.value})}
                      placeholder="Why do you want to take this course?"
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEnrollForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    📝 Submit Enrollment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificateModal && selectedCertificate && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">🎓 Certificate of Completion</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowCertificateModal(false);
                    setSelectedCertificate(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div 
                  ref={certificateRef} 
                  className="certificate-content border rounded p-5" 
                  style={{ 
                    backgroundColor: '#ffffff',
                    minHeight: '600px',
                    position: 'relative',
                    backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                  }}
                >
                  <div className="text-center">
                    {/* Header */}
                    <div className="mb-4">
                      <h1 className="display-4 text-primary mb-3" style={{ fontFamily: 'serif' }}>
                        🎓 Certificate of Completion
                      </h1>
                      <div className="border-top border-bottom border-primary py-2">
                        <p className="text-muted mb-0">This is to certify that</p>
                      </div>
                    </div>

                    {/* Student Name */}
                    <h2 className="display-5 my-4" style={{ fontFamily: 'cursive', color: '#2c3e50' }}>
                      {selectedCertificate.studentName}
                    </h2>

                    {/* Course Info */}
                    <p className="text-muted mb-3">has successfully completed the course</p>
                    <h3 className="text-primary mb-4" style={{ fontFamily: 'serif' }}>
                      {selectedCertificate.courseTitle}
                    </h3>

                    {/* Completion Date */}
                    <div className="my-4">
                      <p className="mb-1"><strong>Date of Completion:</strong></p>
                      <p className="text-muted">
                        {selectedCertificate.completedAt?.toDate ? 
                          selectedCertificate.completedAt.toDate().toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          }) : 
                          'N/A'
                        }
                      </p>
                    </div>

                    {/* Certificate Number */}
                    <div className="mt-5">
                      <p className="mb-1"><small className="text-muted">Certificate Number:</small></p>
                      <p><code className="h6">{selectedCertificate.certificateNumber}</code></p>
                    </div>

                    {/* Signature Line */}
                    <div className="row justify-content-around mt-5 pt-4">
                      <div className="col-md-5">
                        <div className="border-top border-dark pt-2">
                          <p className="mb-0"><small>Authorized Signature</small></p>
                        </div>
                      </div>
                      <div className="col-md-5">
                        <div className="border-top border-dark pt-2">
                          <p className="mb-0"><small>Date Issued</small></p>
                          <p className="mb-0">
                            <small>
                              {selectedCertificate.verifiedAt?.toDate ? 
                                selectedCertificate.verifiedAt.toDate().toLocaleDateString() : 
                                'N/A'
                              }
                            </small>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowCertificateModal(false);
                    setSelectedCertificate(null);
                  }}
                >
                  Close
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleDownloadCertificate}
                >
                  🖨️ Print / Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentPortal;