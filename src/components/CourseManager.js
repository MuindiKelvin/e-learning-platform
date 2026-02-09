import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

function CourseManager({ user, userRole }) {
  const [courses, setCourses] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'beginner',
    duration: '',
    materials: []
  });

  const [assessmentForm, setAssessmentForm] = useState({
    courseId: '',
    title: '',
    description: '',
    questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }],
    timeLimit: 30,
    totalPoints: 0
  });

  const [materialForm, setMaterialForm] = useState({
    title: '',
    type: 'document',
    url: '',
    description: ''
  });

  useEffect(() => {
    if (user && (userRole === 'admin' || userRole === 'teacher')) {
      loadCourses();
      loadAssessments();
    }
  }, [user, userRole]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      
      // Both admins and teachers can see all courses now
      const coursesQuery = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(coursesQuery);
      const coursesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading courses:', error);
      // Handle specific Firestore errors
      if (error.code === 'permission-denied') {
        alert('You do not have permission to view courses. Please check your role.');
      } else {
        alert('Failed to load courses. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAssessments = async () => {
    try {
      // Both admins and teachers can see all assessments now
      const assessmentsQuery = query(collection(db, 'assessments'), orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(assessmentsQuery);
      const assessmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAssessments(assessmentsData);
    } catch (error) {
      console.error('Error loading assessments:', error);
      if (error.code === 'permission-denied') {
        console.warn('Permission denied for assessments - this might be expected for some roles');
      } else {
        alert('Failed to load assessments. Please try again.');
      }
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!courseForm.title || !courseForm.description || !courseForm.category || !courseForm.duration) {
        alert('Please fill in all required fields.');
        return;
      }

      const courseData = {
        ...courseForm,
        createdBy: user.uid,
        createdAt: serverTimestamp(), // Use serverTimestamp for consistency
        enrolledStudents: 0,
        isActive: true,
        duration: parseInt(courseForm.duration) || 0
      };
      
      await addDoc(collection(db, 'courses'), courseData);
      
      setCourseForm({
        title: '',
        description: '',
        category: '',
        difficulty: 'beginner',
        duration: '',
        materials: []
      });
      setShowCourseForm(false);
      loadCourses();
      alert('Course created successfully! 🎉');
    } catch (error) {
      console.error('Error creating course:', error);
      if (error.code === 'permission-denied') {
        alert('You do not have permission to create courses. Please check your role.');
      } else {
        alert('Error creating course. Please try again.');
      }
    }
  };

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!assessmentForm.courseId || !assessmentForm.title || assessmentForm.questions.length === 0) {
        alert('Please fill in all required fields and add at least one question.');
        return;
      }

      // Validate that the selected course exists and user has permission
      const selectedCourse = courses.find(course => course.id === assessmentForm.courseId);
      if (!selectedCourse) {
        alert('Selected course not found or you do not have permission to create assessments for it.');
        return;
      }

      // Validate questions
      for (let i = 0; i < assessmentForm.questions.length; i++) {
        const question = assessmentForm.questions[i];
        if (!question.question.trim()) {
          alert(`Please enter text for question ${i + 1}.`);
          return;
        }
        if (question.options.some(option => !option.trim())) {
          alert(`Please fill in all options for question ${i + 1}.`);
          return;
        }
      }

      const totalPoints = assessmentForm.questions.reduce((sum, q) => sum + (parseInt(q.points) || 1), 0);
      const assessmentData = {
        ...assessmentForm,
        totalPoints,
        createdBy: user.uid,
        createdAt: serverTimestamp(), // Use serverTimestamp for consistency
        isActive: true,
        timeLimit: parseInt(assessmentForm.timeLimit) || 30
      };
      
      await addDoc(collection(db, 'assessments'), assessmentData);
      
      setAssessmentForm({
        courseId: '',
        title: '',
        description: '',
        questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }],
        timeLimit: 30,
        totalPoints: 0
      });
      setShowAssessmentForm(false);
      loadAssessments();
      alert('Assessment created successfully! 📝');
    } catch (error) {
      console.error('Error creating assessment:', error);
      if (error.code === 'permission-denied') {
        alert('You do not have permission to create assessments. Please check your role.');
      } else {
        alert('Error creating assessment. Please try again.');
      }
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'courses', courseId));
        loadCourses();
        alert('Course deleted successfully! 🗑️');
      } catch (error) {
        console.error('Error deleting course:', error);
        if (error.code === 'permission-denied') {
          alert('You do not have permission to delete this course.');
        } else {
          alert('Error deleting course. Please try again.');
        }
      }
    }
  };

  const addQuestion = () => {
    setAssessmentForm({
      ...assessmentForm,
      questions: [
        ...assessmentForm.questions,
        { question: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }
      ]
    });
  };

  const removeQuestion = (index) => {
    if (assessmentForm.questions.length > 1) {
      const updatedQuestions = assessmentForm.questions.filter((_, i) => i !== index);
      setAssessmentForm({ ...assessmentForm, questions: updatedQuestions });
    }
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...assessmentForm.questions];
    if (field === 'options') {
      updatedQuestions[index].options = value;
    } else {
      updatedQuestions[index][field] = value;
    }
    setAssessmentForm({ ...assessmentForm, questions: updatedQuestions });
  };

  const addMaterial = () => {
    if (materialForm.title && materialForm.url) {
      setCourseForm({
        ...courseForm,
        materials: [...courseForm.materials, { ...materialForm, id: Date.now() }]
      });
      setMaterialForm({ title: '', type: 'document', url: '', description: '' });
    } else {
      alert('Please enter both title and URL for the material.');
    }
  };

  const removeMaterial = (materialId) => {
    setCourseForm({
      ...courseForm,
      materials: courseForm.materials.filter(m => m.id !== materialId)
    });
  };

  // Check permissions
  if (userRole !== 'admin' && userRole !== 'teacher') {
    return (
      <div className="text-center py-5">
        <div className="mb-3" style={{ fontSize: '3rem' }}>🔒</div>
        <h5>Access Restricted</h5>
        <p className="text-muted">You need admin or teacher privileges to manage courses.</p>
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
    <>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>📚 Course Management</h2>
          <p className="text-muted mb-0">Create and manage courses and assessments</p>
        </div>
        <div>
          <button 
            className="btn btn-primary me-2"
            onClick={() => setShowCourseForm(true)}
          >
            ➕ Add Course
          </button>
          <button 
            className="btn btn-success"
            onClick={() => setShowAssessmentForm(true)}
            disabled={courses.length === 0}
            title={courses.length === 0 ? "Create a course first" : "Create Assessment"}
          >
            📝 Create Assessment
          </button>
        </div>
      </div>

      {/* Course Creation Form Modal */}
      {showCourseForm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📚 Create New Course</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowCourseForm(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateCourse}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">📖 Course Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={courseForm.title}
                        onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">🏷️ Category *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={courseForm.category}
                        onChange={(e) => setCourseForm({...courseForm, category: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">📝 Description *</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={courseForm.description}
                      onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                      required
                    ></textarea>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">📊 Difficulty Level</label>
                      <select
                        className="form-select"
                        value={courseForm.difficulty}
                        onChange={(e) => setCourseForm({...courseForm, difficulty: e.target.value})}
                      >
                        <option value="beginner">🟢 Beginner</option>
                        <option value="intermediate">🟡 Intermediate</option>
                        <option value="advanced">🔴 Advanced</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">⏱️ Duration (hours) *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={courseForm.duration}
                        onChange={(e) => setCourseForm({...courseForm, duration: e.target.value})}
                        required
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Learning Materials Section */}
                  <div className="mb-3">
                    <h6>📎 Learning Materials</h6>
                    <div className="border rounded p-3 mb-3">
                      <div className="row">
                        <div className="col-md-6 mb-2">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Material title"
                            value={materialForm.title}
                            onChange={(e) => setMaterialForm({...materialForm, title: e.target.value})}
                          />
                        </div>
                        <div className="col-md-3 mb-2">
                          <select
                            className="form-select"
                            value={materialForm.type}
                            onChange={(e) => setMaterialForm({...materialForm, type: e.target.value})}
                          >
                            <option value="document">📄 Document</option>
                            <option value="video">🎥 Video</option>
                            <option value="presentation">📊 Presentation</option>
                            <option value="audio">🎵 Audio</option>
                          </select>
                        </div>
                        <div className="col-md-3 mb-2">
                          <button type="button" className="btn btn-success w-100" onClick={addMaterial}>
                            ➕ Add
                          </button>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6 mb-2">
                          <input
                            type="url"
                            className="form-control"
                            placeholder="Material URL"
                            value={materialForm.url}
                            onChange={(e) => setMaterialForm({...materialForm, url: e.target.value})}
                          />
                        </div>
                        <div className="col-md-6 mb-2">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Description (optional)"
                            value={materialForm.description}
                            onChange={(e) => setMaterialForm({...materialForm, description: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {courseForm.materials.length > 0 && (
                      <div className="list-group">
                        {courseForm.materials.map((material, index) => (
                          <div key={material.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{material.title}</strong> 
                              <span className="badge bg-secondary ms-2">{material.type}</span>
                              {material.description && <div className="text-muted small">{material.description}</div>}
                            </div>
                            <button 
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => removeMaterial(material.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCourseForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    ✨ Create Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Creation Form Modal */}
      {showAssessmentForm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📝 Create Assessment</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowAssessmentForm(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateAssessment}>
                <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">📚 Select Course *</label>
                      <select
                        className="form-select"
                        value={assessmentForm.courseId}
                        onChange={(e) => setAssessmentForm({...assessmentForm, courseId: e.target.value})}
                        required
                      >
                        <option value="">Choose a course...</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">⏱️ Time Limit (minutes) *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={assessmentForm.timeLimit}
                        onChange={(e) => setAssessmentForm({...assessmentForm, timeLimit: parseInt(e.target.value) || 30})}
                        required
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">📖 Assessment Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={assessmentForm.title}
                      onChange={(e) => setAssessmentForm({...assessmentForm, title: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="form-label">📝 Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={assessmentForm.description}
                      onChange={(e) => setAssessmentForm({...assessmentForm, description: e.target.value})}
                    ></textarea>
                  </div>

                  {/* Questions Section */}
                  <h6>❓ Questions</h6>
                  {assessmentForm.questions.map((question, qIndex) => (
                    <div key={qIndex} className="card mb-3">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">Question {qIndex + 1}</h6>
                        {assessmentForm.questions.length > 1 && (
                          <button 
                            type="button" 
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removeQuestion(qIndex)}
                          >
                            🗑️ Remove
                          </button>
                        )}
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <label className="form-label">Question Text *</label>
                          <textarea
                            className="form-control"
                            rows="2"
                            value={question.question}
                            onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="row">
                          {question.options.map((option, oIndex) => (
                            <div key={oIndex} className="col-md-6 mb-2">
                              <div className="input-group">
                                <div className="input-group-text">
                                  <input
                                    type="radio"
                                    name={`correct-${qIndex}`}
                                    checked={question.correctAnswer === oIndex}
                                    onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                                    title="Mark as correct answer"
                                  />
                                </div>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder={`Option ${oIndex + 1}`}
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...question.options];
                                    newOptions[oIndex] = e.target.value;
                                    updateQuestion(qIndex, 'options', newOptions);
                                  }}
                                  required
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-2">
                          <label className="form-label">Points</label>
                          <input
                            type="number"
                            className="form-control"
                            style={{ width: '100px' }}
                            value={question.points}
                            onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                            min="1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button type="button" className="btn btn-success" onClick={addQuestion}>
                    ➕ Add Question
                  </button>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAssessmentForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    📝 Create Assessment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Courses List */}
      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0">📚 All Courses</h5>
            </div>
            <div className="card-body">
              {courses.length > 0 ? (
                <div className="row">
                  {courses.map(course => (
                    <div key={course.id} className="col-md-6 mb-3">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="card-title">{course.title}</h6>
                            <span className={`badge ${
                              course.difficulty === 'beginner' ? 'bg-success' :
                              course.difficulty === 'intermediate' ? 'bg-warning' : 'bg-danger'
                            }`}>
                              {course.difficulty}
                            </span>
                          </div>
                          <p className="card-text text-muted small">{course.description}</p>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                              📅 {course.duration}h • 🏷️ {course.category}
                            </small>
                            <div>
                              <button 
                                className="btn btn-outline-primary btn-sm me-1"
                                onClick={() => setSelectedCourse(course)}
                              >
                                👁️ View
                              </button>
                              <button 
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleDeleteCourse(course.id)}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5">
                  <div className="mb-3" style={{ fontSize: '3rem' }}>📚</div>
                  <h6>No courses yet</h6>
                  <p className="text-muted">Create your first course to get started!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assessments List */}
        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0">📝 Recent Assessments</h5>
            </div>
            <div className="card-body">
              {assessments.length > 0 ? (
                <div className="list-group list-group-flush">
                  {assessments.slice(0, 5).map(assessment => {
                    const course = courses.find(c => c.id === assessment.courseId);
                    return (
                      <div key={assessment.id} className="list-group-item border-0 px-0">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">{assessment.title}</h6>
                            <p className="mb-1 text-muted small">{assessment.description}</p>
                            <small className="text-muted">
                              📚 {course?.title || 'Unknown Course'}
                            </small>
                            <br />
                            <small className="text-muted">
                              ⏱️ {assessment.timeLimit}min • 📊 {assessment.totalPoints}pts
                            </small>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="mb-2" style={{ fontSize: '2rem' }}>📝</div>
                  <p className="text-muted mb-0">No assessments created yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Course Details Modal */}
      {selectedCourse && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📚 {selectedCourse.title}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setSelectedCourse(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>Description:</strong>
                  <p>{selectedCourse.description}</p>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Category:</strong> {selectedCourse.category}
                  </div>
                  <div className="col-md-6">
                    <strong>Duration:</strong> {selectedCourse.duration} hours
                  </div>
                </div>
                <div className="mb-3">
                  <strong>Difficulty:</strong> 
                  <span className={`badge ms-2 ${
                    selectedCourse.difficulty === 'beginner' ? 'bg-success' :
                    selectedCourse.difficulty === 'intermediate' ? 'bg-warning' : 'bg-danger'
                  }`}>
                    {selectedCourse.difficulty}
                  </span>
                </div>
                <div className="mb-3">
                  <strong>Created:</strong> {selectedCourse.createdAt?.toDate ? selectedCourse.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                </div>
                {selectedCourse.materials && selectedCourse.materials.length > 0 && (
                  <div>
                    <strong>Learning Materials:</strong>
                    <div className="list-group mt-2">
                      {selectedCourse.materials.map((material, index) => (
                        <div key={index} className="list-group-item">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{material.title}</strong>
                              <span className="badge bg-secondary ms-2">{material.type}</span>
                              {material.description && (
                                <div className="text-muted small">{material.description}</div>
                              )}
                            </div>
                            <a 
                              href={material.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-outline-primary btn-sm"
                            >
                              🔗 Open
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedCourse(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CourseManager;